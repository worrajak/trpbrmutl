import {
  fetchProjects,
  fetchActivities,
  fetchKpiTargets,
  computeProgramSummaries,
  computeKpiOverview,
  computeActivityAlerts,
  getMonthName,
} from "@/lib/supabase-data";
import { indicators } from "@/lib/data";
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
  const alerts = computeActivityAlerts(projects, activities);

  // Overall totals
  const totalBudget = projects.reduce((s, p) => s + Number(p.budget_total), 0);
  const totalUsed = projects.reduce((s, p) => s + Number(p.budget_used), 0);
  const totalRemaining = totalBudget - totalUsed;
  const usagePercent =
    totalBudget > 0 ? Math.round((totalUsed / totalBudget) * 100) : 0;
  const totalActivities = activities.length;
  const completedActivities = activities.filter(
    (a) => a.status === "completed"
  ).length;

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

      {/* Activity Alerts */}
      {alerts.length > 0 && (
        <section className="rounded-lg border border-orange-200 bg-orange-50 p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-orange-800">
            <span>&#128276;</span>
            แจ้งเตือนกิจกรรม ({alerts.length} รายการ)
          </h2>
          <div className="space-y-2">
            {alerts.slice(0, 5).map((alert, i) => (
              <a
                key={i}
                href={`/projects/${alert.projectId}`}
                className="flex items-start gap-3 rounded-md bg-white p-3 shadow-sm transition hover:shadow-md"
              >
                <span
                  className={`mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full ${
                    alert.alertType === "overdue"
                      ? "bg-red-500"
                      : alert.alertType === "due_this_month"
                      ? "bg-yellow-500"
                      : "bg-green-500"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-800">
                    {alert.projectName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {alert.activityName} | แผน: {getMonthName(alert.plannedMonth)}
                    {alert.responsible && ` | ${alert.responsible}`}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${
                    alert.alertType === "overdue"
                      ? "bg-red-100 text-red-700"
                      : alert.alertType === "due_this_month"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {alert.alertType === "overdue"
                    ? "เลยกำหนด"
                    : alert.alertType === "due_this_month"
                    ? "ถึงกำหนด"
                    : "เร็วๆ นี้"}
                </span>
              </a>
            ))}
            {alerts.length > 5 && (
              <p className="text-center text-xs text-gray-500">
                และอีก {alerts.length - 5} รายการ...
              </p>
            )}
          </div>
        </section>
      )}

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

      {/* KPI Summary from Supabase */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-800">
          สรุปตัวชี้วัดจากโครงการ ({kpis.length} ตัวชี้วัด)
        </h2>

        {/* KPI Overview Cards */}
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg bg-green-50 p-3 text-center">
            <p className="text-2xl font-bold text-green-700">
              {kpiOverview.verified}
            </p>
            <p className="text-xs text-green-600">บรรลุเป้า</p>
          </div>
          <div className="rounded-lg bg-blue-50 p-3 text-center">
            <p className="text-2xl font-bold text-blue-700">
              {kpiOverview.exceeded}
            </p>
            <p className="text-xs text-blue-600">เกินเป้า</p>
          </div>
          <div className="rounded-lg bg-yellow-50 p-3 text-center">
            <p className="text-2xl font-bold text-yellow-700">
              {kpiOverview.inProgress}
            </p>
            <p className="text-xs text-yellow-600">กำลังดำเนินการ</p>
          </div>
          <div className="rounded-lg bg-red-50 p-3 text-center">
            <p className="text-2xl font-bold text-red-700">
              {kpiOverview.notStarted}
            </p>
            <p className="text-xs text-red-600">ยังไม่เริ่ม</p>
          </div>
        </div>

        {/* KPI Table grouped by project */}
        <div className="overflow-x-auto rounded-lg bg-white shadow">
          <table className="w-full text-sm">
            <thead className="bg-royal-gradient text-white">
              <tr>
                <th className="px-4 py-2 text-left">โครงการ</th>
                <th className="px-4 py-2 text-left">ตัวชี้วัด</th>
                <th className="px-4 py-2 text-right">เป้าหมาย</th>
                <th className="px-4 py-2 text-right">ผลสะสม</th>
                <th className="px-4 py-2 text-right">%</th>
                <th className="px-4 py-2 text-center">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {projects.slice(0, 10).map((proj) => {
                const projKpis = kpis.filter(
                  (k) =>
                    k.project_id === proj.id && k.kpi_type === "quantitative"
                );
                if (projKpis.length === 0) return null;

                return projKpis.map((k, ki) => {
                  const pct =
                    Number(k.target_value) > 0
                      ? Math.round(
                          (Number(k.actual_value) / Number(k.target_value)) *
                            100
                        )
                      : 0;
                  return (
                    <tr key={k.id} className="border-t hover:bg-gray-50">
                      {ki === 0 && (
                        <td
                          className="px-4 py-2"
                          rowSpan={projKpis.length}
                        >
                          <a
                            href={`/projects/${proj.id}`}
                            className="text-royal-600 hover:underline"
                          >
                            {proj.project_name.length > 40
                              ? proj.project_name.substring(0, 40) + "..."
                              : proj.project_name}
                          </a>
                        </td>
                      )}
                      <td className="px-4 py-2 text-xs">{k.kpi_name}</td>
                      <td className="px-4 py-2 text-right">
                        {Number(k.target_value)} {k.unit}
                      </td>
                      <td className="px-4 py-2 text-right font-medium">
                        {Number(k.actual_value)} {k.unit}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-xs font-bold ${
                            pct > 100
                              ? "bg-blue-100 text-blue-700"
                              : pct >= 80
                              ? "bg-green-100 text-green-700"
                              : pct >= 1
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {pct}%
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        {k.verified ? (
                          <span className="text-green-600">&#10003;</span>
                        ) : pct > 0 ? (
                          <span className="text-yellow-600">&#9679;</span>
                        ) : (
                          <span className="text-gray-300">&#9675;</span>
                        )}
                      </td>
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
          {projects.length > 10 && (
            <div className="border-t p-3 text-center">
              <a
                href="/indicators"
                className="text-sm text-royal-600 hover:underline"
              >
                ดูตัวชี้วัดทั้งหมด {kpis.length} ตัว จาก {projects.length}{" "}
                โครงการ &rarr;
              </a>
            </div>
          )}
        </div>
      </section>

      {/* Budget Overview - Top 10 by usage */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-800">
          สถานะการเบิกจ่ายงบประมาณ (ERP)
        </h2>
        <div className="overflow-x-auto rounded-lg bg-white shadow">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left">โครงการ</th>
                <th className="px-4 py-2 text-left">รหัส ERP</th>
                <th className="px-4 py-2 text-right">งบประมาณ</th>
                <th className="px-4 py-2 text-right">เบิกจ่าย</th>
                <th className="px-4 py-2 text-right">คงเหลือ</th>
                <th className="px-4 py-2 text-center" style={{ minWidth: 120 }}>
                  สัดส่วน
                </th>
              </tr>
            </thead>
            <tbody>
              {[...projects]
                .sort(
                  (a, b) => Number(b.budget_used) - Number(a.budget_used)
                )
                .slice(0, 15)
                .map((p) => {
                  const pct =
                    Number(p.budget_total) > 0
                      ? Math.round(
                          (Number(p.budget_used) / Number(p.budget_total)) *
                            100
                        )
                      : 0;
                  return (
                    <tr key={p.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <a
                          href={`/projects/${p.id}`}
                          className="text-royal-600 hover:underline"
                        >
                          {p.project_name.length > 35
                            ? p.project_name.substring(0, 35) + "..."
                            : p.project_name}
                        </a>
                      </td>
                      <td className="px-4 py-2 font-mono text-xs text-gray-500">
                        {p.erp_code || "-"}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {formatBudget(Number(p.budget_total))}
                      </td>
                      <td className="px-4 py-2 text-right font-medium">
                        {formatBudget(Number(p.budget_used))}
                      </td>
                      <td className="px-4 py-2 text-right text-gray-500">
                        {formatBudget(Number(p.budget_remaining))}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 rounded-full bg-gray-200">
                            <div
                              className={`h-2 rounded-full ${
                                pct >= 80
                                  ? "bg-green-500"
                                  : pct >= 40
                                  ? "bg-blue-500"
                                  : pct > 0
                                  ? "bg-orange-400"
                                  : "bg-gray-300"
                              }`}
                              style={{
                                width: `${Math.min(pct, 100)}%`,
                              }}
                            />
                          </div>
                          <span className="w-10 text-right text-xs text-gray-500">
                            {pct}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
