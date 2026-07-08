/**
 * Home dashboard — decision-first
 *
 * ออกแบบรอบ "การตัดสินใจของแอดมิน/ทีมงาน" ไม่ใช่ "data dump"
 *
 * 3 คำถามที่ตอบใน 5 วินาที:
 *   Q1. งบประมาณเร่งใช้แค่ไหน?
 *   Q2. KPI ไหนยังไม่ตอบ?
 *   Q3. โครงการไหนเสี่ยง?
 *
 * Pyramid layered:
 *   TIER 0 — Insight sentence (1 ประโยค)
 *   TIER 1 — 3 หัวข้อใหญ่ (ทุกตัวมีของเปรียบเทียบ)
 *   TIER 2 — Action items (top 3 risky · ไม่ใช่ทุกตัว)
 *   TIER 3 — Drill-down links → หน้า detail
 */
import {
  fetchProjects,
  fetchActivities,
  fetchKpiCatalog,
  fetchKpiTargetsWithCode,
} from "@/lib/supabase-data";
import {
  computeBudgetUrgency,
  computeKpiGap,
  computeRiskyProjects,
  composeInsightSentence,
} from "@/lib/dashboard-decisions";
import InsightHeader from "@/components/dashboard/InsightHeader";
import HealthTier1 from "@/components/dashboard/HealthTier1";
import ActionTier2 from "@/components/dashboard/ActionTier2";
import DrillDownTier3 from "@/components/dashboard/DrillDownTier3";

export const revalidate = 60;

export default async function Home() {
  const [projects, activities, kpiCatalog, kpiTargets] = await Promise.all([
    fetchProjects(),
    fetchActivities(),
    fetchKpiCatalog(),
    fetchKpiTargetsWithCode(),
  ]);

  const fy = 2569;
  // fetchProjects ไม่กรอง status='cancelled' — ตัดออกจากทุก compute ที่นี่
  const activeProjects = projects.filter((p) => p.status !== "cancelled");
  const budget = computeBudgetUrgency(activeProjects, fy);
  const kpiGap = computeKpiGap(activeProjects, kpiCatalog, kpiTargets);
  const risky = computeRiskyProjects(activeProjects, activities, fy);
  const insight = composeInsightSentence(budget, kpiGap, risky);

  return (
    <div className="space-y-4">
      {/* TIER 0 — 1 ประโยค "วันนี้ดีไหม?" */}
      <InsightHeader insight={insight} />

      {/* TIER 1 — 3 หัวข้อใหญ่ (5-sec scan) */}
      <HealthTier1 budget={budget} kpiGap={kpiGap} risky={risky} />

      {/* TIER 2 — Action: เร่งโครงการที่ risky */}
      <ActionTier2 risky={risky} />

      {/* TIER 3 — Drill-down links → หน้า detail */}
      <DrillDownTier3 />

      {/* Footer — meta info (เล็ก ไม่ใช่ decision) */}
      <p className="text-center text-[0.65rem] text-slate-400 pt-3">
        ปี {fy} · {activeProjects.length} โครงการ (ไม่รวมยกเลิก) · {activities.length} กิจกรรม ·
        refresh ทุก 60 วินาที · {new Date().toLocaleDateString("th-TH")}
      </p>
    </div>
  );
}
