/**
 * dashboard-decisions.ts
 *
 * Helpers สำหรับ home dashboard ที่ออกแบบรอบ "การตัดสินใจ" ไม่ใช่ "ข้อมูล"
 *
 * 3 คำถามที่ dashboard ต้องตอบใน 5 วินาที (สำหรับ admin/ทีมงาน):
 *   1. งบประมาณเร่งใช้แค่ไหน?  → computeBudgetUrgency
 *   2. KPI ไหนยังไม่ตอบ?         → computeKpiGap
 *   3. โครงการไหนเสี่ยง?         → computeRiskyProjects
 *
 * + insight sentence 1 ประโยค → composeInsightSentence
 */

import type { DBProject, DBActivity } from "./supabase-data";
import { computeBudgetReconciliation } from "./supabase-data";
import { EXCELLENCE_KPIS, classifyProject } from "./excellence-kpi";

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
// Q2: KPI ไหนยังไม่ตอบ?
//   - ใช้ classifyProject แทน manual mapping → ดู KPI ที่ count = 0
// ============================================================================
export interface KpiGap {
  totalKpis: number;
  coveredKpis: number;
  gapCount: number;
  gapPct: number;           // % ที่ยังไม่ตอบ
  uncoveredTop3: Array<{ code: string; name: string; unit: string; target: number }>;
  status: "good" | "warning" | "critical";
  label: string;
}

export function computeKpiGap(projects: DBProject[]): KpiGap {
  // นับโครงการต่อ KPI
  const countPerKpi: Record<string, number> = {};
  for (const p of projects) {
    const matched = classifyProject({
      project_name: p.project_name,
      organization: p.organization,
      responsible: p.responsible,
      main_program: p.main_program,
    });
    for (const code of matched) {
      countPerKpi[code] = (countPerKpi[code] || 0) + 1;
    }
  }

  const totalKpis = EXCELLENCE_KPIS.length;
  const uncovered = EXCELLENCE_KPIS.filter((k) => !countPerKpi[k.code]);
  const gapCount = uncovered.length;
  const coveredKpis = totalKpis - gapCount;
  const gapPct = totalKpis > 0 ? Math.round((gapCount / totalKpis) * 100) : 0;

  // เลือก 3 ตัวแรก (sorted by code · stable)
  const sorted = [...uncovered].sort((a, b) => a.code.localeCompare(b.code));
  const uncoveredTop3 = sorted.slice(0, 3).map((k) => ({
    code: k.code,
    name: k.name,
    unit: k.unit,
    target: k.target_team || k.target_university || 0,
  }));

  let status: KpiGap["status"];
  let label: string;
  if (gapCount === 0) {
    status = "good";
    label = `🟢 ตอบครบทุกตัว`;
  } else if (gapPct <= 25) {
    status = "warning";
    label = `🟡 ขาด ${gapCount} ตัว`;
  } else {
    status = "critical";
    label = `🔴 ขาด ${gapCount} ตัว`;
  }

  return { totalKpis, coveredKpis, gapCount, gapPct, uncoveredTop3, status, label };
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
  budgetUsedPct: number;
  expectedUsedPct: number;
  reasons: string[];          // เหตุผลที่ flag
  severity: "high" | "medium";
}

export interface RiskyProjectsSummary {
  totalProjects: number;
  riskyCount: number;
  top3: RiskyProject[];
  status: "good" | "warning" | "critical";
  label: string;
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
    const overdueActs = projActs.filter((a) => {
      if (a.status === "completed" || a.status === "cancelled") return false;
      if (a.status !== "not_started") return false;
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      // มี planned_month ที่ผ่านมาแล้ว 2+ เดือน
      return a.planned_months.some((pm) => {
        const diff =
          pm <= currentMonth ? currentMonth - pm : 12 - pm + currentMonth;
        return diff >= 2;
      });
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
        budgetUsedPct: usedPct,
        expectedUsedPct,
        reasons,
        severity: reasons.length >= 2 || gap >= 35 ? "high" : "medium",
      });
    }
  }

  // Sort: severity high first, then by gap size
  risky.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === "high" ? -1 : 1;
    return (b.expectedUsedPct - b.budgetUsedPct) - (a.expectedUsedPct - a.budgetUsedPct);
  });

  const riskyCount = risky.length;
  const totalProjects = active.length;
  const top3 = risky.slice(0, 3);

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

  return { totalProjects, riskyCount, top3, status, label };
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

  // Part 3: KPI gap
  if (kpiGap.gapCount > 0) {
    parts.push({
      text: `KPI ${kpiGap.gapCount} ตัวยังไม่ตอบ`,
      href: "/excellence",
      severity: kpiGap.status === "good" ? "warning" : kpiGap.status,
    });
  }

  const hasIssues = parts.length > 0;
  return {
    hasIssues,
    parts,
    fallback: hasIssues ? "" : "🟢 วันนี้ทุกอย่างเป็นไปตามแผน — ไม่มีรายการต้องเร่ง",
  };
}
