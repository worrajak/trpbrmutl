import {
  fetchProjects,
  fetchActivities,
  fetchKpiTargets,
  computeProgramSummaries,
  computeKpiOverview,
  computeBudgetSummary,
} from "@/lib/supabase-data";
import HeroBanner from "@/components/HeroBanner";
import SdgShowcase from "@/components/SdgShowcase";
import ExcellenceKpiShowcase from "@/components/ExcellenceKpiShowcase";
import FeaturedProjects from "@/components/FeaturedProjects";
import RmutlNewsCatalog from "@/components/RmutlNewsCatalog";
import NewsSection from "@/components/NewsSection";
import LatestReportsFeed from "@/components/LatestReportsFeed";
import Link from "next/link";

export const revalidate = 60;

function fmt(n: number): string {
  return n.toLocaleString("th-TH");
}

const PROGRAM_INFO: Record<string, { label: string; gradient: string; icon: string }> = {
  "1.ผลักดันเทคโนโลยี": {
    label: "ผลักดันเทคโนโลยี",
    gradient: "from-violet-500 to-purple-600",
    icon: "🚀",
  },
  "2.ขับเคลื่อนกลไก": {
    label: "ขับเคลื่อนกลไก",
    gradient: "from-amber-500 to-orange-600",
    icon: "⚙️",
  },
  "3.พัฒนากำลังคน": {
    label: "พัฒนากำลังคน",
    gradient: "from-rose-500 to-pink-600",
    icon: "👥",
  },
};

export default async function Home() {
  const [projects, activities, kpis] = await Promise.all([
    fetchProjects(),
    fetchActivities(),
    fetchKpiTargets(),
  ]);

  const isLive = projects.length > 0;
  const programSummaries = computeProgramSummaries(projects);
  const kpiOverview = computeKpiOverview(kpis);
  const budget = computeBudgetSummary(projects);

  // Active = approved + in_progress
  const activeCount = projects.filter(
    (p) => p.status === "approved" || p.status === "in_progress"
  ).length;

  // Count projects per SDG
  const countPerSdg: Record<number, number> = {};
  for (const p of projects) {
    for (const tag of p.sdg_tags || []) {
      countPerSdg[tag] = (countPerSdg[tag] || 0) + 1;
    }
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Modern Hero */}
      <HeroBanner
        projectCount={projects.length}
        activeCount={activeCount}
        budgetTotal={budget.total}
        budgetUsed={budget.effectiveUsed}
        isLive={isLive}
      />

      {/* RMUTL Excellence KPI mapping - "เท่ดี กว่าโชว์ตัวชี้วัดเฉยๆ" */}
      <ExcellenceKpiShowcase projects={projects} />

      {/* SDGs Showcase - 17 goals interactive grid */}
      <SdgShowcase countPerSdg={countPerSdg} totalProjects={projects.length} />

      {/* Program Cards - modern gradient */}
      <section>
        <div className="mb-3">
          <p className="text-xs font-medium text-amber-600 uppercase tracking-wider">
            🎯 Main Programs
          </p>
          <h2 className="mt-0.5 text-lg sm:text-xl font-bold text-gray-800">
            โครงการหลัก 3 ด้าน
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {programSummaries.map((ps) => {
            const info = PROGRAM_INFO[ps.program] || {
              label: ps.program,
              gradient: "from-gray-500 to-slate-600",
              icon: "📁",
            };
            return (
              <Link
                key={ps.program}
                href={`/projects?main=${encodeURIComponent(ps.program)}`}
                className="group relative overflow-hidden rounded-2xl bg-white shadow-md hover:shadow-xl transition-all hover:-translate-y-1"
              >
                {/* Gradient header */}
                <div className={`relative bg-gradient-to-br ${info.gradient} p-5 text-white`}>
                  <div className="flex items-start justify-between">
                    <span className="text-3xl drop-shadow">{info.icon}</span>
                    <span className="rounded-full bg-white/20 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-medium ring-1 ring-white/30">
                      {ps.projectCount} โครงการ
                    </span>
                  </div>
                  <h3 className="mt-3 text-lg font-bold drop-shadow">{info.label}</h3>
                  <p className="mt-1 text-xs text-white/80">
                    งบ {fmt(ps.budgetTotal)} บาท
                  </p>
                </div>

                {/* Body - progress */}
                <div className="p-4">
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-gray-500">เบิกจ่าย</span>
                    <span className="font-bold text-gray-800">
                      {fmt(ps.budgetUsed)}{" "}
                      <span className="font-normal text-gray-400">บาท</span>
                    </span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className={`h-full transition-all bg-gradient-to-r ${
                        ps.usagePercent >= 80
                          ? "from-emerald-400 to-emerald-600"
                          : ps.usagePercent >= 40
                          ? "from-blue-400 to-blue-600"
                          : "from-amber-400 to-orange-500"
                      }`}
                      style={{ width: `${Math.min(ps.usagePercent, 100)}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-gray-500">
                    <span>{ps.usagePercent}% ของงบ</span>
                    <span>คงเหลือ {fmt(ps.budgetRemaining)}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Featured Projects Catalog - 4 cols x 2 rows */}
      <FeaturedProjects projects={projects} limit={8} />

      {/* Budget Reconciliation Panel - ย่อให้กระชับ */}
      <section className="rounded-2xl bg-gradient-to-br from-gray-50 to-white p-5 shadow-sm ring-1 ring-gray-100">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              💰 Budget Status
            </p>
            <h3 className="mt-0.5 text-base font-bold text-gray-800">
              สถานะงบประมาณโดยรวม
            </h3>
          </div>
          {kpiOverview.verified > 0 && (
            <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-700">
              ✓ KPI บรรลุ {kpiOverview.verified}/{kpiOverview.total}
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "งบรวม", value: budget.total, color: "text-gray-700", dot: "bg-gray-400" },
            { label: "เบิก ERP", value: budget.erp, color: "text-blue-700", dot: "bg-blue-500" },
            { label: "รายงาน", value: budget.reported, color: "text-purple-700", dot: "bg-purple-500" },
            { label: "รอเคลียบิล", value: budget.pendingClearance, color: "text-orange-700", dot: "bg-orange-500" },
            { label: "ออกเอง", value: budget.advancePayment, color: "text-yellow-700", dot: "bg-yellow-500" },
            { label: "คงเหลือ", value: budget.remaining, color: "text-emerald-700", dot: "bg-emerald-500" },
          ].map(({ label, value, color, dot }) => (
            <div key={label} className="rounded-xl bg-white p-3 ring-1 ring-gray-100">
              <div className="flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                <p className="text-[10px] text-gray-500">{label}</p>
              </div>
              <p className={`mt-0.5 text-base sm:text-lg font-bold ${color}`}>
                {fmt(value)}
              </p>
            </div>
          ))}
        </div>
        {(budget.pendingClearance > 0 || budget.advancePayment > 0) && (
          <div className="mt-3 space-y-2">
            {budget.pendingClearance > 0 && (
              <div className="flex items-center gap-2 rounded-xl bg-orange-50 px-3 py-2 text-xs text-orange-700 ring-1 ring-orange-200">
                ⚠ มีการเบิก ERP <strong>{fmt(budget.pendingClearance)} บาท</strong> ยังไม่มีรายงานค่าใช้จ่ายตรงกัน
              </div>
            )}
            {budget.advancePayment > 0 && (
              <div className="flex items-center gap-2 rounded-xl bg-yellow-50 px-3 py-2 text-xs text-yellow-700 ring-1 ring-yellow-200">
                💡 หัวหน้าโครงการออกเงินก่อน <strong>{fmt(budget.advancePayment)} บาท</strong> · รอเบิกคืน
              </div>
            )}
          </div>
        )}
      </section>

      {/* Reports - กลาง */}
      <LatestReportsFeed limit={8} />

      {/* ข่าวสารจาก 2 แหล่ง — วางคู่กัน 2 cols (lg+) */}
      <div className="grid lg:grid-cols-2 gap-6">
        <RmutlNewsCatalog />
        <NewsSection />
      </div>

      {/* Quick links - modern pill style */}
      <section>
        <p className="mb-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
          🧭 Quick Navigation
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              href: "/projects",
              label: "รายการโครงการ",
              icon: "📋",
              desc: `${projects.length} โครงการ`,
              gradient: "from-blue-500 to-cyan-500",
            },
            {
              href: "/indicators",
              label: "ตัวชี้วัด",
              icon: "📊",
              desc: `${kpis.length} KPI · บรรลุ ${kpiOverview.verified}`,
              gradient: "from-emerald-500 to-teal-500",
            },
            {
              href: "/map",
              label: "แผนที่",
              icon: "🗺️",
              desc: "พื้นที่โครงการ",
              gradient: "from-amber-500 to-orange-500",
            },
            {
              href: "/staff",
              label: "บุคลากร",
              icon: "👥",
              desc: "นักวิจัย+ทีมงาน",
              gradient: "from-rose-500 to-pink-500",
            },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group relative overflow-hidden rounded-2xl bg-white p-4 shadow-md hover:shadow-xl transition-all hover:-translate-y-0.5 ring-1 ring-gray-100"
            >
              {/* Gradient accent (top) */}
              <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${item.gradient}`} />
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${item.gradient} text-2xl shadow-md group-hover:scale-110 transition`}
                >
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800">{item.label}</p>
                  <p className="text-[11px] text-gray-500 truncate">{item.desc}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
