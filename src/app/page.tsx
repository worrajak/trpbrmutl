import {
  fetchProjects,
  fetchActivities,
  fetchKpiTargets,
  computeKpiOverview,
  computeBudgetSummary,
} from "@/lib/supabase-data";
import IntelHeader from "@/components/IntelHeader";
import LatestSyncRow from "@/components/LatestSyncRow";
import KpiIndexPanel from "@/components/KpiIndexPanel";
import BottomDashboardCards from "@/components/BottomDashboardCards";
import SdgShowcase from "@/components/SdgShowcase";
import LatestReportsFeed from "@/components/LatestReportsFeed";

export const revalidate = 60;

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString("th-TH");
}

function todayThai(): string {
  const d = new Date();
  const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  return `${d.getDate()} ${months[d.getMonth()]} ${(d.getFullYear() + 543).toString().slice(-2)}`;
}

export default async function Home() {
  const [projects, activities, kpis] = await Promise.all([
    fetchProjects(),
    fetchActivities(),
    fetchKpiTargets(),
  ]);

  const isLive = projects.length > 0;
  const kpiOverview = computeKpiOverview(kpis);
  const budget = computeBudgetSummary(projects);
  const activeCount = projects.filter(
    (p) => p.status === "approved" || p.status === "in_progress"
  ).length;
  const usagePercent = budget.total > 0 ? Math.round((budget.effectiveUsed / budget.total) * 100) : 0;

  // Count projects per SDG
  const countPerSdg: Record<number, number> = {};
  for (const p of projects) {
    for (const tag of p.sdg_tags || []) {
      countPerSdg[tag] = (countPerSdg[tag] || 0) + 1;
    }
  }

  // Build alerts based on data
  const alerts: { level: "critical" | "warning" | "info"; title: string; detail?: string }[] = [];
  if (budget.pendingClearance > 0) {
    alerts.push({
      level: "warning",
      title: `รอเคลียบิล ${fmt(budget.pendingClearance)} บาท`,
      detail: "เบิก ERP แล้วแต่ยังไม่มีรายงานค่าใช้จ่ายตรงกัน",
    });
  }
  if (budget.advancePayment > 0) {
    alerts.push({
      level: "info",
      title: `หน.โครงการออกเงินก่อน ${fmt(budget.advancePayment)} บาท`,
      detail: "รอเบิกคืนจาก ERP",
    });
  }

  return (
    <div className="space-y-3">
      {/* Intel Header — title + alerts + nav pills + 4 KPI boxes */}
      <IntelHeader
        title="ใต้ร่มพระบารมี Intel"
        subtitle={`ปี 2569 · มทร.ล้านนา · ${projects.length} โครงการ`}
        isLive={isLive}
        liveText={todayThai()}
        alerts={alerts}
        navs={[
          { href: "/", icon: "🏠", label: "หน้าแรก" },
          { href: "/projects", icon: "📋", label: "โครงการ" },
          { href: "/excellence", icon: "🏆", label: "ความเลิศ" },
          { href: "/sdgs", icon: "🌍", label: "SDGs" },
          { href: "/indicators", icon: "📊", label: "ตัวชี้วัด" },
          { href: "/map", icon: "🗺️", label: "แผนที่" },
          { href: "/staff", icon: "👥", label: "บุคลากร" },
        ]}
        stats={[
          {
            label: "โครงการทั้งหมด",
            value: projects.length,
            sub: `${activeCount} กำลังดำเนินงาน · ${activities.length} กิจกรรม`,
            color: "text-emerald-700",
          },
          {
            label: "งบประมาณรวม",
            value: fmt(budget.total),
            sub: "บาท · ปี 2569",
            color: "text-blue-700",
          },
          {
            label: "เบิกจ่ายแล้ว",
            value: `${usagePercent}%`,
            sub: `${fmt(budget.effectiveUsed)} จาก ${fmt(budget.total)}`,
            color: usagePercent >= 70 ? "text-emerald-700" : usagePercent >= 30 ? "text-amber-700" : "text-red-700",
          },
          {
            label: "KPI บรรลุ",
            value: `${kpiOverview.verified}/${kpiOverview.total}`,
            sub: `เกินเป้า ${kpiOverview.exceeded} · ${kpis.length} ตัว`,
            color: "text-purple-700",
          },
        ]}
      />

      {/* Latest sync row */}
      <LatestSyncRow
        sources={[
          {
            icon: "📊",
            name: "Supabase",
            detail: "(โครงการ + กิจกรรม + KPI)",
            timestamp: `${todayThai()} · refresh ทุก 1 นาที`,
          },
          {
            icon: "💰",
            name: "Excel ERP",
            detail: "(งบประมาณเบิกจ่าย)",
            timestamp: "manual sync · /admin",
            warning: budget.pendingClearance > 0,
          },
        ]}
      />

      {/* KPI Index — Excellence Plan tabs */}
      <KpiIndexPanel projects={projects} />

      {/* Bottom dashboard - 3 cards (เร็ว/ช้า/SDG) */}
      <BottomDashboardCards projects={projects} />

      {/* SDG showcase - 17 goals grid */}
      <SdgShowcase countPerSdg={countPerSdg} totalProjects={projects.length} />

      {/* Latest reports */}
      <LatestReportsFeed limit={6} />
    </div>
  );
}
