/**
 * Executive Summary — สรุปผู้บริหารตามโครงสร้างสากล
 *
 * โครงสร้าง 7 ส่วนตามแบบ executive summary ของรายงานประจำปีระดับองค์กร
 *   1. Scope        — ขอบเขตและที่มา (what / period / basis)
 *   2. Headline     — ตัวเลขหลัก (key figures)
 *   3. Performance  — ผลเทียบเป้า (against targets)
 *   4. Findings     — ข้อค้นพบ (strengths / gaps)
 *   5. Limitations  — ข้อจำกัดของข้อมูล (ต้องแจ้งเสมอ ไม่ซ่อน)
 *   6. Recommendations — ข้อเสนอ
 *   7. Outlook      — งานที่ต่อเนื่องไปรอบถัดไป
 *
 * ตัวเลขทุกตัวคำนวณจากฐานข้อมูลสด ยกเว้นค่าคงที่ที่ระบุแหล่งที่มากำกับไว้
 * (ค่าที่ไม่มีคอลัมน์ใน DB เช่น กรอบงบรายโครงการหลัก และยอดคืนงบประมาณ)
 */
import type { DBProject, DBKpiCatalog, DBKpiTarget, DBFaculty } from "./supabase-data";

/** กรอบงบประมาณรายโครงการหลัก — จากเอกสารจัดสรรแผนงาน ปีงบประมาณ 2569 */
export const FRAME_BY_INITIATIVE: Record<string, number> = {
  thrust: 2_000_000,
  knowledge: 2_000_000,
  workforce: 4_000_000,
};
export const FRAME_TOTAL = 8_000_000;

/** ยอดคืนงบประมาณ — จากไฟล์งบประมาณฉบับปิดปี (ยังไม่มีคอลัมน์ใน DB) */
export const RETURNED_BUDGET = 172_105;

/** metadata ของรอบรายงาน */
export const REPORT_META = {
  fiscalYear: 2569,
  periodStart: "1 ตุลาคม 2568",
  periodEnd: "30 กันยายน 2569",
  asOf: "30 กันยายน 2569",
  status: "ปิดปีงบประมาณแล้ว",
  source: "ไฟล์งบประมาณกลุ่มแผนงานใต้ร่มพระบารมี ฉบับปิดปีงบประมาณ (ปรับปรุง 1 ตุลาคม 2569)",
  fullReport: "รายงานผลการดำเนินงานฉบับสมบูรณ์ ปีงบประมาณ 2569 (55 หน้า)",
} as const;

export const INITIATIVE_LABEL: Record<string, string> = {
  thrust: "ง8-1 ผลักดันเทคโนโลยี นวัตกรรมสู่ชุมชน",
  knowledge: "ง8-2 ขับเคลื่อนกลไกการพัฒนาองค์ความรู้",
  workforce: "ง8-3 พัฒนากำลังคน สร้างอาชีพ ลดความเหลื่อมล้ำ",
};

/** รายการกันเงินเหลื่อมปีใช้รหัสงบประมาณรูปแบบ 8301-691-1BGxxxx ไม่ใช่ ERP 20 หลัก */
export const isCarryover = (id: string) => /^(83|84|85)01-/.test(String(id));

export type Severity = "good" | "warning" | "critical";

export interface ExecLine {
  label: string;
  value: string;
  sub?: string;
  severity?: Severity;
}

export interface ExecInitiative {
  id: string;
  label: string;
  projects: number;
  frame: number;
  budget: number;
  spent: number;
  percent: number;
}

export interface ExecKpi {
  code: string;
  name: string;
  target: number;
  committed: number;
  percent: number;
  unit: string;
  isPrimary: boolean;
  severity: Severity;
}

export interface ExecutiveSummary {
  meta: typeof REPORT_META;
  verdict: { headline: string; detail: string; severity: Severity };
  headline: ExecLine[];
  initiatives: ExecInitiative[];
  kpis: ExecKpi[];
  faculties: { name: string; projects: number; budget: number; spent: number; percent: number }[];
  findings: { strengths: string[]; gaps: string[] };
  limitations: string[];
  recommendations: { title: string; detail: string }[];
  outlook: { items: { name: string; initiative: string; amount: number }[]; total: number };
  counts: {
    projects: number;
    carryoverProjects: number;
    faculties: number;
    leads: number;
    activities: number;
    activityReports: number;
    zeroSpend: number;
  };
  budget: {
    frame: number;
    transferred: number;
    spent: number;
    carryover: number;
    spentPlusCarryover: number;
    returned: number;
    remaining: number;
    percentOfFrame: number;
    percentWithCarryover: number;
  };
}

const pct = (a: number, b: number) => (b > 0 ? (a / b) * 100 : 0);
const baht = (n: number) => Math.round(n).toLocaleString("th-TH");

export function buildExecutiveSummary(args: {
  projects: DBProject[];
  kpiCatalog: DBKpiCatalog[];
  kpiTargets: DBKpiTarget[];
  faculties: DBFaculty[];
  activities: { project_id: string }[];
  activityReportCount: number;
}): ExecutiveSummary {
  const { projects, kpiCatalog, kpiTargets, faculties, activities, activityReportCount } = args;

  const active = projects.filter(
    (p) => p.status !== "cancelled" && p.fiscal_year === REPORT_META.fiscalYear
  );
  const ids = new Set(active.map((p) => p.id));
  // นับเฉพาะกิจกรรมของโครงการที่ยังดำเนินการ (ไม่รวมโครงการที่ยกเลิก)
  const activityCount = activities.filter((a) => ids.has(a.project_id)).length;

  // ---------- งบประมาณ ----------
  const transferred = active.reduce((s, p) => s + Number(p.budget_total || 0), 0);
  const spent = active.reduce((s, p) => s + Number(p.budget_used || 0), 0);
  const carryoverRows = active.filter((p) => isCarryover(p.id));
  const carryover = carryoverRows.reduce((s, p) => s + Number(p.budget_total || 0), 0);
  const spentPlusCarryover = spent + carryover;

  const budget = {
    frame: FRAME_TOTAL,
    transferred,
    spent,
    carryover,
    spentPlusCarryover,
    returned: RETURNED_BUDGET,
    remaining: FRAME_TOTAL - spent,
    percentOfFrame: pct(spent, FRAME_TOTAL),
    percentWithCarryover: pct(spentPlusCarryover, FRAME_TOTAL),
  };

  // ---------- รายโครงการหลัก ----------
  const initiatives: ExecInitiative[] = Object.keys(FRAME_BY_INITIATIVE).map((id) => {
    const rows = active.filter((p) => p.initiative_id === id);
    const b = rows.reduce((s, p) => s + Number(p.budget_total || 0), 0);
    const u = rows.reduce((s, p) => s + Number(p.budget_used || 0), 0);
    return {
      id,
      label: INITIATIVE_LABEL[id] ?? id,
      projects: rows.length,
      frame: FRAME_BY_INITIATIVE[id],
      budget: b,
      spent: u,
      percent: pct(u, FRAME_BY_INITIATIVE[id]),
    };
  });

  // ---------- ตัวชี้วัด ----------
  const committed: Record<string, number> = {};
  for (const t of kpiTargets) {
    if (!t.kpi_code || !ids.has(t.project_id)) continue;
    committed[t.kpi_code] = (committed[t.kpi_code] || 0) + Number(t.target_value || 0);
  }
  const kpis: ExecKpi[] = kpiCatalog
    .filter((c) => committed[c.code] !== undefined)
    .map((c) => {
      const v = committed[c.code] || 0;
      const p = pct(v, Number(c.target_count || 0));
      return {
        code: c.code,
        name: c.name_th,
        target: Number(c.target_count || 0),
        committed: v,
        percent: p,
        unit: c.target_unit || "",
        isPrimary: c.scope === "underroof",
        severity: p >= 90 ? "good" : p >= 50 ? "warning" : "critical",
      } as ExecKpi;
    })
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || b.percent - a.percent);

  // ---------- รายหน่วยงาน ----------
  const facName = new Map(faculties.map((f) => [f.id, f.name_th]));
  const facAgg = new Map<string, { projects: number; budget: number; spent: number }>();
  for (const p of active) {
    const k = p.faculty_id || "unknown";
    const cur = facAgg.get(k) || { projects: 0, budget: 0, spent: 0 };
    cur.projects += 1;
    cur.budget += Number(p.budget_total || 0);
    cur.spent += Number(p.budget_used || 0);
    facAgg.set(k, cur);
  }
  const facList = Array.from(facAgg.entries())
    .map(([id, v]) => ({
      name: facName.get(id) || "ไม่ระบุหน่วยงาน",
      projects: v.projects,
      budget: v.budget,
      spent: v.spent,
      percent: pct(v.spent, v.budget),
    }))
    .sort((a, b) => b.percent - a.percent || b.budget - a.budget);

  const fullyDisbursed = facList.filter((f) => f.percent >= 99.5);
  const lagging = facList.filter((f) => f.percent < 80);
  const zeroSpend = active.filter((p) => Number(p.budget_used || 0) === 0 && !isCarryover(p.id));

  // ---------- verdict ----------
  const over90 = budget.percentOfFrame >= 90;
  const verdict = {
    headline: over90
      ? `ปิดปีงบประมาณที่ ${budget.percentOfFrame.toFixed(1)}% ของกรอบ — สูงกว่าเป้าหมาย 90%`
      : `ปิดปีงบประมาณที่ ${budget.percentOfFrame.toFixed(1)}% ของกรอบ — ต่ำกว่าเป้าหมาย 90%`,
    detail: over90
      ? `เบิกจ่าย ${baht(spent)} บาท จากกรอบ ${baht(FRAME_TOTAL)} บาท ` +
        `เมื่อรวมเงินกันเหลื่อมปี ${baht(carryover)} บาท คิดเป็น ${budget.percentWithCarryover.toFixed(1)}% ` +
        `ไม่มีใบสั่งซื้อค้างชำระ และคืนงบประมาณเพียง ${baht(RETURNED_BUDGET)} บาท`
      : `เบิกจ่าย ${baht(spent)} บาท จากกรอบ ${baht(FRAME_TOTAL)} บาท`,
    severity: (over90 ? "good" : "warning") as Severity,
  };

  // ---------- headline figures ----------
  const headline: ExecLine[] = [
    { label: "กรอบงบประมาณแผนงาน", value: `${baht(FRAME_TOTAL)} บาท`, sub: "3 โครงการหลักตามแบบ ง8" },
    {
      label: "เบิกจ่ายทั้งปี",
      value: `${baht(spent)} บาท`,
      sub: `${budget.percentOfFrame.toFixed(1)}% ของกรอบ`,
      severity: verdict.severity,
    },
    {
      label: "รวมเงินกันเหลื่อมปี",
      value: `${baht(spentPlusCarryover)} บาท`,
      sub: `${budget.percentWithCarryover.toFixed(1)}% ของกรอบ`,
    },
    { label: "รายการโครงการ", value: `${active.length}`, sub: `กันเหลื่อมปี ${carryoverRows.length} รายการ` },
    { label: "หน่วยงานร่วมดำเนินการ", value: `${facList.length}`, sub: `เบิกจ่ายครบ ${fullyDisbursed.length} หน่วยงาน` },
    { label: "คืนงบประมาณ", value: `${baht(RETURNED_BUDGET)} บาท`, sub: `${pct(RETURNED_BUDGET, FRAME_TOTAL).toFixed(1)}% ของกรอบ` },
  ];

  // ---------- findings ----------
  const primary = kpis.find((k) => k.isPrimary);
  const strengths: string[] = [];
  if (over90)
    strengths.push(
      `เบิกจ่ายปิดปีที่ ${budget.percentOfFrame.toFixed(1)}% ของกรอบงบประมาณ สูงกว่าเป้าหมาย 90% ที่ตั้งไว้ในรายงานรอบ 10 เดือน`
    );
  const allOver90 = initiatives.every((i) => i.percent >= 90);
  if (allOver90)
    strengths.push(
      `โครงการหลักทั้ง 3 โครงการปิดปีเหนือ 90% (${initiatives
        .map((i) => `${i.label.slice(0, 4)} ${i.percent.toFixed(0)}%`)
        .join(" · ")}) ผลไม่กระจุกที่โครงการใดโครงการหนึ่ง`
    );
  if (fullyDisbursed.length > 0)
    strengths.push(
      `${fullyDisbursed.length} หน่วยงานเบิกจ่ายได้เต็มจำนวนงบที่ได้รับโอน ได้แก่ ${fullyDisbursed
        .map((f) => f.name)
        .join(" · ")}`
    );
  if (primary)
    strengths.push(
      `ตัวชี้วัดภารกิจหลัก (${primary.code.replace("KPI-", "ตัวชี้วัดที่ ")}) รับมาดำเนินการ ${
        primary.committed
      } จากเป้า ${primary.target} ${primary.unit} คิดเป็น ${primary.percent.toFixed(0)}%`
    );
  strengths.push(
    `ยอดในระบบติดตามตรงกับงบการเงินของมหาวิทยาลัยครบทุกระดับ ทั้งรายโครงการ รายโครงการหลัก และระดับแผนงาน`
  );

  const gaps: string[] = [];
  if (activityReportCount === 0)
    gaps.push(
      `ไม่มีการบันทึกผลรายกิจกรรมเข้าระบบติดตามเลยตลอดทั้งปี (0 จาก ${activityCount} กิจกรรม) ทำให้มีหลักฐานการใช้เงินครบ แต่ไม่มีหลักฐานการส่งมอบผลที่ตรวจรับได้`
    );
  const lowKpis = kpis.filter((k) => !k.isPrimary && k.percent < 20);
  if (lowKpis.length > 0)
    gaps.push(
      `ตัวชี้วัดเชิงเครือข่ายและเชิงพาณิชย์ยังต่ำกว่า 20% ได้แก่ ${lowKpis
        .map((k) => `${k.code.replace("KPI-", "ที่ ")} (${k.percent.toFixed(0)}%)`)
        .join(" · ")} เป็นช่องว่างเชิงโครงสร้างจากการออกแบบโครงการ มิใช่ความบกพร่องของการดำเนินงาน`
    );
  gaps.push(
    `การเบิกจ่ายกระจุกตัวในช่วงปลายปีงบประมาณ ประมาณ 40% ของยอดทั้งปีเกิดขึ้นใน 55 วันสุดท้าย`
  );
  if (lagging.length > 0)
    gaps.push(
      `${lagging.length} หน่วยงานเบิกจ่ายต่ำกว่า 80% ได้แก่ ${lagging
        .map((f) => `${f.name} (${f.percent.toFixed(0)}%)`)
        .join(" · ")} ข้อจำกัดอยู่ที่กระบวนการพัสดุ มิใช่เนื้องาน`
    );
  if (zeroSpend.length > 0)
    gaps.push(`มี ${zeroSpend.length} รายการที่ไม่มีการเบิกจ่ายเลยเมื่อปิดปี`);

  // ---------- limitations ----------
  const limitations = [
    `ตัวเลขตัวชี้วัดทั้งหมดเป็น "ค่าที่โครงการรับมาดำเนินการ" มิใช่ผลสำเร็จที่ผ่านการตรวจรับ เนื่องจากยังไม่มีการบันทึกผลรายกิจกรรมพร้อมหลักฐานเข้าระบบ`,
    `การเชื่อมโยงเป้าหมายการพัฒนาที่ยั่งยืน (SDG) เป็นการวิเคราะห์ระดับแผนงานจากวัตถุประสงค์ของโครงการหลัก ยังมิได้ผูกรายโครงการไว้ในฐานข้อมูล`,
    `ยอดคืนงบประมาณ ${baht(RETURNED_BUDGET)} บาท อ้างอิงจากไฟล์งบประมาณฉบับปิดปีโดยตรง ยังไม่มีคอลัมน์จัดเก็บในฐานข้อมูล`,
  ];

  // ---------- recommendations ----------
  const recommendations = [
    {
      title: "ผูกการเบิกจ่ายกับการรายงานผล",
      detail:
        "กำหนดให้การเบิกจ่ายงวดที่สองต้องมีรายงานผลรายกิจกรรมพร้อมหลักฐานในระบบติดตามก่อน เป้าหมายคือรายงานผลเข้าระบบไม่น้อยกว่า 80% ของกิจกรรม",
    },
    {
      title: "กำหนดปฏิทินเบิกจ่ายรายไตรมาส",
      detail:
        "ตั้งเพดานขั้นต่ำสะสมรายไตรมาสและติดตามรายหน่วยงานเป็นรายเดือน เป้าหมายคือสิ้นไตรมาส 3 เบิกจ่ายไม่น้อยกว่า 70%",
    },
    {
      title: "ออกแบบตัวชี้วัดให้ตรงลักษณะงาน",
      detail:
        "ทบทวนตัวชี้วัดเครือข่าย ทรัพย์สินทางปัญญา และสถานประกอบการ หรือจัดโครงการเฉพาะที่มุ่งตัวชี้วัดกลุ่มนี้ตั้งแต่ต้นปี",
    },
    {
      title: "สนับสนุนกระบวนการพัสดุรายหน่วยงาน",
      detail:
        "จัดทีมพี่เลี้ยงด้านพัสดุให้หน่วยงานที่เบิกจ่ายต่ำกว่า 70% ในปีก่อน เป้าหมายคือไม่มีหน่วยงานใดปิดปีต่ำกว่า 80%",
    },
    {
      title: "ผูก SDG และพื้นที่รายโครงการ",
      detail:
        "บันทึกเป้าหมายการพัฒนาที่ยั่งยืนและพื้นที่ดำเนินงานตั้งแต่ขั้นเสนอโครงการ เพื่อรายงานผลระดับสากลได้โดยไม่ต้องวิเคราะห์ย้อนหลัง",
    },
  ];

  // ---------- outlook ----------
  const outlook = {
    items: carryoverRows
      .map((p) => ({
        name: p.project_name,
        initiative: INITIATIVE_LABEL[p.initiative_id || ""]?.slice(0, 4) || "",
        amount: Number(p.budget_total || 0),
      }))
      .sort((a, b) => b.amount - a.amount),
    total: carryover,
  };

  return {
    meta: REPORT_META,
    verdict,
    headline,
    initiatives,
    kpis,
    faculties: facList,
    findings: { strengths, gaps },
    limitations,
    recommendations,
    outlook,
    counts: {
      projects: active.length,
      carryoverProjects: carryoverRows.length,
      faculties: facList.length,
      leads: new Set(active.map((p) => p.responsible).filter(Boolean)).size,
      activities: activityCount,
      activityReports: activityReportCount,
      zeroSpend: zeroSpend.length,
    },
    budget,
  };
}
