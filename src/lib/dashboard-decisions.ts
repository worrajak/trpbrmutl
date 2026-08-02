/**
 * dashboard-decisions.ts
 *
 * Helpers สำหรับ home dashboard ที่ออกแบบรอบ "การตัดสินใจ" ไม่ใช่ "ข้อมูล"
 *
 * 3 คำถามที่ dashboard ต้องตอบใน 5 วินาที (สำหรับ admin/ทีมงาน):
 *   1. งบประมาณเร่งใช้แค่ไหน?  → computeBudgetUrgency
 *   2. KPI ตอบเป้าแค่ไหน?        → computeKpiGap (KPI-39 ใต้ร่ม + coverage catalog)
 *   3. โครงการไหนเสี่ยง?         → computeRiskyProjects
 *
 * + insight sentence 1 ประโยค → composeInsightSentence
 */

import type {
  DBProject,
  DBActivity,
  DBKpiCatalog,
  DBKpiTarget,
} from "./supabase-data";
import { computeBudgetReconciliation } from "./supabase-data";

// ============================================================================
// Thai Fiscal Year — 1 ต.ค. (เดือน 10) ของปี (FY-1) → 30 ก.ย. (เดือน 9) ของ FY
// FY 2569 = 1 ต.ค. 2568 → 30 ก.ย. 2569
// ============================================================================
export function getThaiFiscalYearProgress(fy: number = 2569): {
  startMs: number;
  endMs: number;
  elapsedDays: number;
  totalDays: number;
  elapsedPct: number;
} {
  // FY 2569 → start = Oct 1, 2025 (ค.ศ. = 2568 - 543 = 2025)
  const startYear = fy - 543 - 1; // 2025
  const endYear = fy - 543;        // 2026
  const start = new Date(startYear, 9, 1).getTime();  // เดือน 10 (index 9)
  const end = new Date(endYear, 8, 30, 23, 59, 59).getTime(); // เดือน 9 = ก.ย.

  const now = Date.now();
  const totalMs = end - start;
  const elapsedMs = Math.max(0, Math.min(totalMs, now - start));
  const totalDays = Math.round(totalMs / 86400000);
  const elapsedDays = Math.round(elapsedMs / 86400000);
  const elapsedPct = totalMs > 0 ? Math.round((elapsedMs / totalMs) * 100) : 0;

  return { startMs: start, endMs: end, elapsedDays, totalDays, elapsedPct };
}

// ============================================================================
// Q1: งบประมาณเร่งใช้แค่ไหน?
// ============================================================================
export interface BudgetUrgency {
  totalBudget: number;
  usedAmount: number;
  usedPct: number;       // % เบิก
  elapsedPct: number;    // % เวลาผ่านไปใน FY
  gapPp: number;         // pp = percentage points (usedPct - elapsedPct)
  status: "ahead" | "on_track" | "behind" | "critical";
  label: string;         // เช่น "🔴 ช้า 42 pp"
}

export function computeBudgetUrgency(projects: DBProject[], fy: number = 2569): BudgetUrgency {
  let totalBudget = 0;
  let usedAmount = 0;
  for (const p of projects) {
    const r = computeBudgetReconciliation(p);
    totalBudget += Number(p.budget_total || 0);
    usedAmount += r.effectiveUsed;
  }
  const usedPct = totalBudget > 0 ? Math.round((usedAmount / totalBudget) * 100) : 0;
  const { elapsedPct } = getThaiFiscalYearProgress(fy);
  const gapPp = usedPct - elapsedPct;

  let status: BudgetUrgency["status"];
  let label: string;
  if (gapPp >= 5) {
    status = "ahead";
    label = `🟢 เร็วกว่าเวลา ${gapPp} pp`;
  } else if (gapPp >= -10) {
    status = "on_track";
    label = `🟢 ใกล้เคียงเวลา (${gapPp >= 0 ? "+" : ""}${gapPp} pp)`;
  } else if (gapPp >= -25) {
    status = "behind";
    label = `🟡 ช้ากว่าเวลา ${Math.abs(gapPp)} pp`;
  } else {
    status = "critical";
    label = `🔴 ช้ากว่าเวลา ${Math.abs(gapPp)} pp`;
  }

  return { totalBudget, usedAmount, usedPct, elapsedPct, gapPp, status, label };
}

// ============================================================================
// Q2: KPI ตอบเป้าแค่ไหน? — ข้อมูลจริงจาก rpf_kpi_catalog + kpi_targets (มี kpi_code)
//   - ตัวหลัก = KPI-39 (scope 'underroof' — เป้าของกลุ่มใต้ร่มโดยตรง):
//       commit รวม (sum target_value ของโครงการ) vs target_count ของ catalog
//       >=90% good · >=50% warning · <50% critical
//   - ตัวรอง = จำนวน KPI ทั้ง catalog (7 ตัว) ที่ commit ครอบคลุม >= 50% ของเป้า
// ============================================================================
export const PRIMARY_KPI_CODE = "KPI-39";

export interface KpiGap {
  // ตัวหลัก — KPI-39 ใต้ร่ม
  primaryCode: string;      // 'KPI-39'
  primaryName: string;      // ชื่อจาก catalog
  primaryUnit: string;      // เช่น 'องค์ความรู้'
  primaryCommit: number;    // ผลรวม target_value ที่โครงการ commit ไว้
  primaryTarget: number;    // target_count จาก catalog
  primaryPct: number;       // % commit vs เป้า
  primaryGap: number;       // เหลืออีกกี่หน่วยถึงเป้า (0 = ถึงเป้าแล้ว)
  // ตัวรอง — ความครอบคลุมทั้ง catalog
  totalKpis: number;        // จำนวน KPI ใน catalog (7)
  coveredKpis: number;      // KPI ที่ commit >= 50% ของเป้า
  gapCount: number;         // KPI ที่ commit < 50% ของเป้า
  lowCoverageTop3: Array<{
    code: string;
    name: string;
    unit: string;
    target: number;
    commit: number;
    pct: number;
  }>;
  status: "good" | "warning" | "critical";
  label: string;
}

export function computeKpiGap(
  projects: DBProject[],
  kpiCatalog: DBKpiCatalog[],
  kpiTargets: DBKpiTarget[]
): KpiGap {
  // รวม commit ต่อ KPI code — นับเฉพาะ kpi_targets ของโครงการที่ส่งเข้ามา
  // (page กรอง status='cancelled' ออกก่อนแล้ว)
  const activeIds = new Set(projects.map((p) => p.id));
  const commitPerKpi: Record<string, number> = {};
  for (const t of kpiTargets) {
    if (!t.kpi_code || !activeIds.has(t.project_id)) continue;
    commitPerKpi[t.kpi_code] =
      (commitPerKpi[t.kpi_code] || 0) + Number(t.target_value || 0);
  }

  // ตัวหลัก: KPI-39 · fallback = ตัวแรกที่ scope 'underroof'
  const primary =
    kpiCatalog.find((k) => k.code === PRIMARY_KPI_CODE) ??
    kpiCatalog.find((k) => k.scope === "underroof") ??
    null;
  const primaryCode = primary?.code ?? PRIMARY_KPI_CODE;
  const primaryName = primary?.name_th ?? "";
  const primaryUnit = primary?.target_unit ?? "";
  const primaryTarget = primary?.target_count ?? 0;
  const primaryCommit = commitPerKpi[primaryCode] || 0;
  const primaryPct =
    primaryTarget > 0 ? Math.round((primaryCommit / primaryTarget) * 100) : 0;
  const primaryGap = Math.max(0, primaryTarget - primaryCommit);

  // ตัวรอง: ความครอบคลุมทั้ง catalog (commit >= 50% ของเป้า = ครอบคลุม)
  const totalKpis = kpiCatalog.length;
  const perKpi = kpiCatalog.map((k) => {
    const commit = commitPerKpi[k.code] || 0;
    const target = k.target_count ?? 0;
    const pct = target > 0 ? Math.round((commit / target) * 100) : 0;
    return {
      code: k.code,
      name: k.name_th,
      unit: k.target_unit || "",
      target,
      commit,
      pct,
    };
  });
  const coveredKpis = perKpi.filter((k) => k.pct >= 50).length;
  const gapCount = totalKpis - coveredKpis;
  const lowCoverageTop3 = perKpi
    .filter((k) => k.pct < 50)
    .sort((a, b) => a.pct - b.pct || a.code.localeCompare(b.code))
    .slice(0, 3);

  let status: KpiGap["status"];
  let label: string;
  if (totalKpis === 0) {
    // ไม่มีข้อมูล catalog (เช่น no Supabase client) — อย่าโชว์แดงหลอก
    status = "warning";
    label = `🟡 ไม่มีข้อมูล KPI catalog`;
  } else if (primaryPct >= 90) {
    status = "good";
    label =
      primaryGap > 0
        ? `🟢 ${primaryCode} ใต้ร่ม ${primaryCommit}/${primaryTarget} (${primaryPct}%) — ขาดอีก ${primaryGap}`
        : `🟢 ${primaryCode} ใต้ร่ม ถึงเป้า ${primaryCommit}/${primaryTarget}`;
  } else if (primaryPct >= 50) {
    status = "warning";
    label = `🟡 ${primaryCode} ใต้ร่ม ${primaryCommit}/${primaryTarget} (${primaryPct}%)`;
  } else {
    status = "critical";
    label = `🔴 ${primaryCode} ใต้ร่ม ${primaryCommit}/${primaryTarget} (${primaryPct}%)`;
  }

  return {
    primaryCode,
    primaryName,
    primaryUnit,
    primaryCommit,
    primaryTarget,
    primaryPct,
    primaryGap,
    totalKpis,
    coveredKpis,
    gapCount,
    lowCoverageTop3,
    status,
    label,
  };
}

// ============================================================================
// Q3: โครงการไหนเสี่ยง?
//   composite score: เบิกต่ำกว่า expected 20%+ OR ไม่รายงาน > 30 วัน OR overdue activity
// ============================================================================
export interface RiskyProject {
  id: string;
  name: string;
  responsible: string | null;
  budgetTotal: number;
  budgetRemaining: number;    // เงินที่ยังไม่เบิก — ใช้จัดอันดับ "ควรเร่งตัวไหนก่อน"
  budgetUsedPct: number;
  expectedUsedPct: number;
  reasons: string[];          // เหตุผลที่ flag
  severity: "high" | "medium";
}

export interface RiskyProjectsSummary {
  totalProjects: number;
  riskyCount: number;
  riskyRemaining: number;     // เงินคงค้างรวมของโครงการเสี่ยงทั้งหมด
  zeroSpendCount: number;     // โครงการที่ยังไม่เบิกเลย (0%)
  zeroSpendRemaining: number; // เงินคงค้างของกลุ่ม 0%
  top3: RiskyProject[];
  all: RiskyProject[];        // เรียงแล้ว — ใช้เมื่ออยากโชว์เกิน 3
  status: "good" | "warning" | "critical";
  label: string;
}

/**
 * แปลงเลขเดือนปฏิทิน (1-12) เป็นลำดับเดือนในปีงบไทย
 * ต.ค.=1 · พ.ย.=2 · ธ.ค.=3 · ม.ค.=4 · … · ส.ค.=11 · ก.ย.=12
 *
 * จำเป็นเพราะการเทียบเลขเดือนปฏิทินตรง ๆ ทำให้เดือน "ในอนาคตของปีงบ" (ส.ค./ก.ย.)
 * ถูกคำนวณเป็นอดีตแบบ wrap-around เช่น ตอน ก.ค.(7) เทียบ ก.ย.(9) ได้ 12-9+7 = 10 เดือน
 * ทั้งที่ ก.ย. ยังไม่มาถึง → ทุกโครงการถูก flag ว่าเลยกำหนด
 */
export function toFiscalMonthIndex(calendarMonth: number): number {
  return calendarMonth >= 10 ? calendarMonth - 9 : calendarMonth + 3;
}

export function computeRiskyProjects(
  projects: DBProject[],
  activities: DBActivity[],
  fy: number = 2569
): RiskyProjectsSummary {
  const { elapsedPct } = getThaiFiscalYearProgress(fy);
  const expectedUsedPct = elapsedPct;
  const risky: RiskyProject[] = [];

  // กรองเฉพาะ in_progress / approved
  const active = projects.filter(
    (p) => p.status === "in_progress" || p.status === "approved"
  );

  for (const p of active) {
    const r = computeBudgetReconciliation(p);
    const total = Number(p.budget_total || 0);
    const usedPct = total > 0 ? Math.round((r.effectiveUsed / total) * 100) : 0;
    const reasons: string[] = [];

    // Risk 1: เบิกช้ากว่า expected 20+ pp
    const gap = expectedUsedPct - usedPct;
    if (gap >= 20) {
      reasons.push(`เบิกช้ากว่าเวลา ${gap} pp (${usedPct}% vs ${expectedUsedPct}%)`);
    }

    // Risk 2: มี activity ไม่รายงาน
    const projActs = activities.filter((a) => a.project_id === p.id);
    const nowFiscalIdx = toFiscalMonthIndex(new Date().getMonth() + 1);
    const overdueActs = projActs.filter((a) => {
      if (a.status === "completed" || a.status === "cancelled") return false;
      if (a.status !== "not_started") return false;
      // เทียบด้วยลำดับเดือนในปีงบ ไม่ใช่เลขเดือนปฏิทิน
      // (ไม่งั้นเดือนที่ยังไม่มาถึงในปีงบจะถูกนับเป็นอดีต — ดู toFiscalMonthIndex)
      return a.planned_months.some(
        (pm) => nowFiscalIdx - toFiscalMonthIndex(pm) >= 2
      );
    });
    if (overdueActs.length > 0) {
      reasons.push(`${overdueActs.length} กิจกรรมเลยกำหนด 2+ เดือน`);
    }

    if (reasons.length > 0) {
      risky.push({
        id: p.id,
        name: p.project_name,
        responsible: p.responsible,
        budgetTotal: total,
        budgetRemaining: Math.max(0, total - r.effectiveUsed),
        budgetUsedPct: usedPct,
        expectedUsedPct,
        reasons,
        severity: reasons.length >= 2 || gap >= 35 ? "high" : "medium",
      });
    }
  }

  // เรียงตาม "เงินที่ยังไม่เบิก" เป็นหลัก
  // เหตุผล: ช่วงปลายปีงบ เกือบทุกโครงการเบิกช้ากว่าเวลาเท่า ๆ กัน (gap pp ใกล้เคียงกันหมด)
  // การเรียงด้วย pp จึงไม่จัดลำดับอะไรจริง — เรียงด้วยจำนวนเงินบอกได้ว่าเร่งตัวไหนคุ้มสุด
  risky.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === "high" ? -1 : 1;
    return b.budgetRemaining - a.budgetRemaining;
  });

  const riskyCount = risky.length;
  const totalProjects = active.length;
  const top3 = risky.slice(0, 3);
  const riskyRemaining = risky.reduce((s, x) => s + x.budgetRemaining, 0);
  const zeroSpend = risky.filter((x) => x.budgetUsedPct === 0);
  const zeroSpendRemaining = zeroSpend.reduce((s, x) => s + x.budgetRemaining, 0);

  let status: RiskyProjectsSummary["status"];
  let label: string;
  if (riskyCount === 0) {
    status = "good";
    label = `🟢 ไม่มีเสี่ยง`;
  } else if (riskyCount <= 2) {
    status = "warning";
    label = `🟡 เสี่ยง ${riskyCount} โครงการ`;
  } else {
    status = "critical";
    label = `🔴 เสี่ยง ${riskyCount} โครงการ`;
  }

  return {
    totalProjects,
    riskyCount,
    riskyRemaining,
    zeroSpendCount: zeroSpend.length,
    zeroSpendRemaining,
    top3,
    all: risky,
    status,
    label,
  };
}

// ============================================================================
// Insight Sentence — 1 ประโยครวมที่ตอบ "วันนี้ดีไหม? ต้องเร่งอะไร?"
// ============================================================================
export type InsightSeverity = "good" | "warning" | "critical";

export interface InsightSentence {
  hasIssues: boolean;
  parts: Array<{ text: string; href?: string; severity: InsightSeverity }>;
  fallback: string;
}

function mapBudgetSeverity(s: BudgetUrgency["status"]): InsightSeverity {
  if (s === "critical") return "critical";
  if (s === "behind") return "warning";
  return "good";
}

export function composeInsightSentence(
  budget: BudgetUrgency,
  kpiGap: KpiGap,
  risky: RiskyProjectsSummary
): InsightSentence {
  const parts: InsightSentence["parts"] = [];

  // Part 1: budget — โชว์เฉพาะ behind/critical
  if (budget.status === "behind" || budget.status === "critical") {
    parts.push({
      text: `เบิกช้ากว่าเวลา ${Math.abs(budget.gapPp)} pp`,
      href: "/projects",
      severity: mapBudgetSeverity(budget.status),
    });
  }

  // Part 2: risky projects
  if (risky.riskyCount > 0) {
    parts.push({
      text: `เร่ง ${risky.riskyCount} โครงการ`,
      href: "/projects?filter=risky",
      severity: risky.status === "good" ? "warning" : risky.status,
    });
  }

  // Part 3: KPI — อิงตัวหลัก KPI-39 ใต้ร่ม (ข้อมูลจริงจาก catalog)
  // ข้าม insight ถ้าไม่มี catalog (ไม่มี Supabase/ยังไม่ seed) — กันโชว์ 0/0 (0%) หลอก
  if (kpiGap.totalKpis > 0 && kpiGap.status !== "good") {
    parts.push({
      text: `${kpiGap.primaryCode} ใต้ร่ม commit ${kpiGap.primaryCommit}/${kpiGap.primaryTarget} (${kpiGap.primaryPct}%)`,
      href: "/excellence",
      severity: kpiGap.status,
    });
  } else if (kpiGap.primaryGap > 0) {
    // ใกล้เป้าแล้ว — ประโยคเชิงบวก + ชวนเร่งเก็บ evidence
    parts.push({
      text: `${kpiGap.primaryCode} ขาดอีก ${kpiGap.primaryGap} ${kpiGap.primaryUnit || "หน่วย"} — เร่งเก็บ evidence`,
      href: "/excellence",
      severity: "good",
    });
  }

  const hasIssues = parts.length > 0;
  return {
    hasIssues,
    parts,
    fallback: hasIssues ? "" : "🟢 วันนี้ทุกอย่างเป็นไปตามแผน — ไม่มีรายการต้องเร่ง",
  };
}
