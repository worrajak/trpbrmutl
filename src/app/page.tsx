import {
  fetchProjects,
  fetchActivities,
  fetchKpiTargets,
  computeProgramSummaries,
  computeKpiOverview,
} from "@/lib/supabase-data";
import NewsSection from "@/components/NewsSection";

export const revalidate = 60; // revalidate ทุก 1 นาที

function formatBudget(n: number): string {
  return n.toLocaleString("th-TH");
}

const programLabels: Record<string, { label: string; color: string }> = {
  "1.ผลักดันเทคโนโลยี": { label: "ผลักดันเทคโนโลยี", color: "bg-royal-500" },
  "2.ขับเคลื่อนกลไก": { label: "ขับเคลื่อนกลไก", color: "bg-gold-600" },
  "3.พัฒนากำลังคน": { label: "พัฒนากำลังคน", color: "bg-royal-700" },
};

export default async function Home() {
  const [projects, activities, kpis] = await Promise.all([
    fetchProjects(),
    fetchActivities(),
    fetchKpiTargets(),
  ]);

  const isLive = projects.length > 0;

  // Summaries
  const programSummaries = computeProgramSummaries(projects);
  const kpiOverview = computeKpiOverview(kpis);

  // Overall totals
  const totalBudget = projects.reduce((s, p) => s + Number(p.budget_total), 0);
  const totalUsed = projects.reduce((s, p) => s + Number(p.budget_used), 0);
  const totalRemaining = totalBudget - totalUsed;
  const usagePercent =
    totalBudget > 0 ? Math.round((totalUsed / totalBudget) * 100) : 0;
  const totalActivities = activities.length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="rounded-xl bg-royal-gradient p-6 text-white shadow-lg">
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className="h-16 w-auto hidden sm:block" />
          <div>
            <h1 className="text-2xl font-bold">
              ภาพรวมโครงการใต้ร่มพระบารมี
            </h1>
            <p className="mt-1 text-sm text-white/80">
              ปีงบประมาณ 2569 | มหาวิทยาลัยเทคโนโลยีราชมงคลล้านนา
            </p>
            <p className="text-xs text-gold-300">
              รวม 3 โครงการหลัก: ขับเคลื่อนกลไก, ผลักดันเทคโนโลยี, พัฒนากำลังคน
            </p>
          </div>
        </div>
        {isLive ? (
          <p className="mt-2 text-xs text-green-300">
            ข้อมูลจาก Supabase (realtime) | อัปเดตทุก 1 นาที
          </p>
        ) : (
          <p className="mt-2 text-xs text-orange-300">
            ไม่สามารถเชื่อมต่อ Supabase
          </p>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg bg-white p-4 shadow">
          <p className="text-xs text-gray-500">โครงการทั้งหมด</p>
          <p className="text-3xl font-bold text-royal-700">
            {projects.length}
          </p>
          <p className="text-xs text-gray-400">
            กิจกรรม {totalActivities} รายการ
          </p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <p className="text-xs text-gray-500">งบประมาณรวม</p>
          <p className="text-2xl font-bold text-royal-700">
            {formatBudget(totalBudget)}
          </p>
          <p className="text-xs text-gray-400">บาท</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <p className="text-xs text-gray-500">เบิกจ่ายแล้ว</p>
          <p className="text-2xl font-bold text-blue-600">
            {formatBudget(totalUsed)}
          </p>
          <div className="mt-1">
            <div className="flex justify-between text-xs text-gray-400">
              <span>บาท</span>
              <span>{usagePercent}%</span>
            </div>
            <div className="mt-0.5 h-1.5 rounded-full bg-gray-200">
              <div
                className="h-1.5 rounded-full bg-blue-500 transition-all"
                style={{ width: `${Math.min(usagePercent, 100)}%` }}
              />
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <p className="text-xs text-gray-500">ตัวชี้วัดที่บรรลุเป้า</p>
          <p className="text-3xl font-bold text-green-600">
            {kpiOverview.verified}
            <span className="text-lg text-gray-400">
              /{kpiOverview.total}
            </span>
          </p>
          <p className="text-xs text-gray-400">
            เกินเป้า {kpiOverview.exceeded} ตัว
          </p>
        </div>
      </div>


      {/* Program Cards with Budget Progress */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-800">
          โครงการหลัก
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {programSummaries.map((ps) => {
            const pl = programLabels[ps.program] || {
              label: ps.program,
              color: "bg-gray-600",
            };
            return (
              <a
                key={ps.program}
                href={`/projects?main=${encodeURIComponent(ps.program)}`}
                className="block rounded-lg bg-white p-5 shadow transition hover:shadow-md"
              >
                <span
                  className={`inline-block rounded px-2 py-0.5 text-xs font-medium text-white ${pl.color}`}
                >
                  {pl.label}
                </span>
                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <p className="text-xs text-gray-400">งบประมาณ</p>
                    <p className="text-lg font-bold text-royal-700">
                      {formatBudget(ps.budgetTotal)}{" "}
                      <span className="text-xs font-normal text-gray-400">
                        บาท
                      </span>
                    </p>
                  </div>
                  <p className="text-xs text-gray-500">
                    {ps.projectCount} โครงการ
                  </p>
                </div>
                {/* Budget progress bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>
                      เบิกจ่าย {formatBudget(ps.budgetUsed)} บาท
                    </span>
                    <span>{ps.usagePercent}%</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-gray-200">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        ps.usagePercent >= 80
                          ? "bg-green-500"
                          : ps.usagePercent >= 40
                          ? "bg-blue-500"
                          : "bg-orange-400"
                      }`}
                      style={{
                        width: `${Math.min(ps.usagePercent, 100)}%`,
                      }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    คงเหลือ {formatBudget(ps.budgetRemaining)} บาท
                  </p>
                </div>
              </a>
            );
          })}
        </div>
      </section>

      {/* ข่าวล่าสุด */}
      <NewsSection />

      {/* Quick links */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { href: "/projects", label: "รายการโครงการ", icon: "📋", desc: `${projects.length} โครงการ` },
          { href: "/indicators", label: "ตัวชี้วัด", icon: "📊", desc: `${kpis.length} ตัวชี้วัด · บรรลุ ${kpiOverview.verified}` },
          { href: "/map", label: "แผนที่", icon: "🗺️", desc: "พื้นที่โครงการ" },
          { href: "/staff", label: "บุคลากร", icon: "👥", desc: "นักวิจัยและทีมงาน" },
        ].map((item) => (
          <a key={item.href} href={item.href}
            className="flex flex-col items-center gap-1 rounded-lg bg-white p-4 shadow text-center transition hover:shadow-md hover:bg-royal-50">
            <span className="text-2xl">{item.icon}</span>
            <p className="text-sm font-semibold text-gray-800">{item.label}</p>
            <p className="text-xs text-gray-400">{item.desc}</p>
          </a>
        ))}
      </section>
    </div>
  );
}
