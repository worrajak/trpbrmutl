"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import type {
  DBProject,
  DBActivity,
  DBKpiTarget,
} from "@/lib/supabase-data";
import SCurveChart from "@/components/SCurveChart";
import ReportForm from "@/components/ReportForm";

interface ReportData {
  id: string;
  report_description: string;
  evidence_url: string | null;
  submitted_by: string;
  submitted_at: string;
  activities: { activity_order: number; activity_name: string } | null;
  kpi_contributions: Array<{
    contribution_value: number;
    kpi_targets: { kpi_name: string; unit: string } | null;
  }>;
}

function formatBudget(n: number): string {
  return Number(n).toLocaleString("th-TH");
}

const FISCAL_MONTHS = [10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const MONTH_LABELS = [
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
];

const statusLabel: Record<string, { text: string; cls: string }> = {
  not_started: { text: "ยังไม่เริ่ม", cls: "bg-gray-100 text-gray-600" },
  in_progress: {
    text: "กำลังดำเนินการ",
    cls: "bg-yellow-100 text-yellow-700",
  },
  completed: { text: "เสร็จสมบูรณ์", cls: "bg-green-100 text-green-700" },
  delayed: { text: "ล่าช้า", cls: "bg-red-100 text-red-700" },
  cancelled: { text: "ยกเลิก", cls: "bg-gray-200 text-gray-500" },
  approved: { text: "อนุมัติแล้ว", cls: "bg-green-100 text-green-700" },
};

const programColor: Record<string, string> = {
  "1.ผลักดันเทคโนโลยี": "bg-blue-100 text-blue-700",
  "2.ขับเคลื่อนกลไก": "bg-green-100 text-green-700",
  "3.พัฒนากำลังคน": "bg-purple-100 text-purple-700",
};

function getCurrentFiscalMonth(): number {
  const now = new Date();
  const m = now.getMonth() + 1; // 1-12
  // ปีงบ: ต.ค.68=0, พ.ย.68=1, ... ก.ย.69=11
  const fiscalIndex = FISCAL_MONTHS.indexOf(m);
  return fiscalIndex >= 0 ? fiscalIndex : 5;
}

function computePlannedCurve(activities: DBActivity[]): number[] {
  // สร้าง S-Curve จากกิจกรรมจริง
  const monthWeights = new Array(12).fill(0);
  let totalWeight = 0;

  for (const act of activities) {
    for (const pm of act.planned_months) {
      const idx = FISCAL_MONTHS.indexOf(pm);
      if (idx >= 0) {
        monthWeights[idx]++;
        totalWeight++;
      }
    }
  }

  if (totalWeight === 0) return [2, 8, 18, 32, 48, 62, 74, 84, 91, 96, 99, 100];

  // สะสมเป็น %
  const cumulative: number[] = [];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += monthWeights[i];
    cumulative.push(Math.round((sum / totalWeight) * 100));
  }
  return cumulative;
}

function computeActualCurve(activities: DBActivity[]): number[] {
  const currentMonth = getCurrentFiscalMonth();
  const total = activities.length;
  if (total === 0) return [];

  const actual: number[] = [];
  for (let i = 0; i <= currentMonth; i++) {
    const fm = FISCAL_MONTHS[i];
    const completed = activities.filter(
      (a) =>
        a.status === "completed" &&
        a.planned_months.some(
          (pm) => FISCAL_MONTHS.indexOf(pm) <= i
        )
    ).length;
    actual.push(Math.round((completed / total) * 100));
  }
  return actual;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [project, setProject] = useState<DBProject | null | undefined>(undefined);
  const [activities, setActivities] = useState<DBActivity[]>([]);
  const [kpis, setKpis] = useState<DBKpiTarget[]>([]);
  const [reports, setReports] = useState<ReportData[]>([]);
  const [reportActivity, setReportActivity] = useState<DBActivity | null>(null);

  async function loadData() {
    try {
      const [projRes, reportRes] = await Promise.all([
        fetch(`/api/supabase/project?id=${id}`),
        fetch(`/api/supabase/report?project_id=${id}`),
      ]);
      if (!projRes.ok) throw new Error("not found");
      const projData = await projRes.json();
      setProject(projData.project || null);
      setActivities(projData.activities || []);
      setKpis(projData.kpis || []);

      if (reportRes.ok) {
        const reportData = await reportRes.json();
        setReports(reportData.reports || []);
      }
    } catch {
      setProject(null);
    }
  }

  useEffect(() => {
    loadData();
  }, [id]);

  if (project === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-500">กำลังโหลดข้อมูลโครงการ...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <p className="text-lg font-medium text-gray-700">ไม่พบโครงการนี้</p>
          <a
            href="/projects"
            className="mt-2 inline-block text-royal-600 hover:underline"
          >
            กลับหน้ารายการโครงการ
          </a>
        </div>
      </div>
    );
  }

  const st = statusLabel[project.status] || statusLabel.approved;
  const pc = programColor[project.main_program] || "bg-gray-100 text-gray-700";
  const budgetUsedPct =
    Number(project.budget_total) > 0
      ? Math.round((Number(project.budget_used) / Number(project.budget_total)) * 100)
      : 0;
  const currentFiscalMonth = getCurrentFiscalMonth();
  const plannedCurve = computePlannedCurve(activities);
  const actualCurve = computeActualCurve(activities);

  const quantKpis = kpis.filter((k) => k.kpi_type === "quantitative");
  const qualKpis = kpis.filter((k) => k.kpi_type === "qualitative");
  const timeKpi = kpis.find((k) => k.kpi_type === "time");
  const budgetKpi = kpis.find((k) => k.kpi_type === "budget");

  // Gantt: current month highlight
  const currentCalMonth = new Date().getMonth() + 1;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500">
        <a href="/" className="hover:text-royal-600">หน้าแรก</a>
        {" / "}
        <a href="/projects" className="hover:text-royal-600">โครงการ</a>
        {" / "}
        <span className="text-gray-700">{project.id}</span>
      </nav>

      {/* Project header */}
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${pc}`}>
              {project.main_program}
            </span>
            <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${st.cls}`}>
              {st.text}
            </span>
          </div>
          {project.erp_code && (
            <span className="font-mono text-xs text-gray-400">
              ERP: {project.erp_code}
            </span>
          )}
        </div>
        <h1 className="mt-3 text-xl font-bold text-gray-900">
          {project.project_name}
        </h1>

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-gray-500">งบประมาณ</p>
            <p className="text-lg font-bold text-royal-700">
              {formatBudget(project.budget_total)}{" "}
              <span className="text-xs font-normal">บาท</span>
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">เบิกจ่ายแล้ว</p>
            <p className="text-lg font-bold text-blue-600">
              {formatBudget(project.budget_used)}{" "}
              <span className="text-xs font-normal">บาท ({budgetUsedPct}%)</span>
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">คงเหลือ</p>
            <p className="text-lg font-bold text-gray-600">
              {formatBudget(project.budget_remaining)}{" "}
              <span className="text-xs font-normal">บาท</span>
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">ผู้รับผิดชอบ</p>
            <p className="font-medium">{project.responsible || "-"}</p>
            {project.responsible_title && (
              <p className="text-xs text-gray-400">{project.responsible_title}</p>
            )}
            {project.phone && (
              <p className="text-xs text-gray-400">{project.phone}</p>
            )}
          </div>
        </div>

        {/* Budget progress bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-500">
            <span>การใช้งบประมาณ</span>
            <span>{budgetUsedPct}%</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-gray-200">
            <div
              className={`h-2 rounded-full transition-all ${
                budgetUsedPct >= 80
                  ? "bg-green-500"
                  : budgetUsedPct >= 40
                  ? "bg-blue-500"
                  : "bg-orange-400"
              }`}
              style={{ width: `${Math.min(budgetUsedPct, 100)}%` }}
            />
          </div>
        </div>

        {/* Info row */}
        <div className="mt-4 grid grid-cols-2 gap-4 rounded bg-gray-50 p-3 sm:grid-cols-3">
          <div>
            <p className="text-xs text-gray-500">หน่วยงาน</p>
            <p className="text-sm font-medium">{project.organization}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">ระยะเวลา</p>
            <p className="text-sm font-medium">{project.project_period || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">สถานที่ดำเนินงาน</p>
            <p className="text-sm font-medium">{project.site || "-"}</p>
          </div>
        </div>
      </div>

      {/* Gantt Chart */}
      {activities.length > 0 && (
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">
            แผนปฏิบัติงาน (Gantt Chart)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-royal-700 text-white">
                  <th className="sticky left-0 z-10 bg-royal-700 px-3 py-2 text-left" style={{ minWidth: 200 }}>
                    กิจกรรม
                  </th>
                  {FISCAL_MONTHS.map((m, i) => (
                    <th
                      key={m}
                      className={`px-1 py-2 text-center ${
                        m === currentCalMonth ? "bg-red-600" : ""
                      }`}
                      style={{ minWidth: 44 }}
                    >
                      {MONTH_LABELS[i]}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right" style={{ minWidth: 70 }}>
                    งบ
                  </th>
                  <th className="px-3 py-2 text-center" style={{ minWidth: 80 }}>
                    สถานะ
                  </th>
                  <th className="px-2 py-2 text-center" style={{ minWidth: 40 }}>

                  </th>
                </tr>
              </thead>
              <tbody>
                {activities.map((act) => {
                  const actSt = statusLabel[act.status] || statusLabel.not_started;
                  return (
                    <tr key={act.id} className="border-t hover:bg-gray-50">
                      <td className="sticky left-0 z-10 bg-white px-3 py-2 font-medium">
                        <span className="text-gray-400 mr-1">{act.activity_order}.</span>
                        {act.activity_name.length > 40
                          ? act.activity_name.substring(0, 40) + "..."
                          : act.activity_name}
                      </td>
                      {FISCAL_MONTHS.map((m) => {
                        const isPlanned = act.planned_months.includes(m);
                        const isCurrent = m === currentCalMonth;
                        const isPast = (() => {
                          const ci = FISCAL_MONTHS.indexOf(currentCalMonth);
                          const mi = FISCAL_MONTHS.indexOf(m);
                          return mi < ci;
                        })();

                        let cellClass = "bg-white";
                        if (isPlanned) {
                          if (act.status === "completed") {
                            cellClass = "bg-green-400";
                          } else if (act.status === "in_progress" && isCurrent) {
                            cellClass = "bg-yellow-400 animate-pulse";
                          } else if (isPast && act.status === "not_started") {
                            cellClass = "bg-red-300"; // overdue
                          } else if (isPast) {
                            cellClass = "bg-green-300";
                          } else {
                            cellClass = "bg-blue-200"; // future planned
                          }
                        }

                        return (
                          <td
                            key={m}
                            className={`border-l px-0 py-2 ${
                              isCurrent ? "border-l-2 border-l-red-400" : ""
                            }`}
                          >
                            {isPlanned && (
                              <div
                                className={`mx-auto h-4 w-full rounded-sm ${cellClass}`}
                                title={`${act.activity_name} - ${MONTH_LABELS[FISCAL_MONTHS.indexOf(m)]}`}
                              />
                            )}
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-right text-gray-600">
                        {Number(act.budget) > 0 ? formatBudget(act.budget) : "-"}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`rounded px-1.5 py-0.5 text-xs ${actSt.cls}`}>
                          {actSt.text}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button
                          onClick={() => setReportActivity(act)}
                          className="rounded bg-royal-700 px-2 py-1 text-xs text-white hover:bg-royal-800"
                          title="รายงานความก้าวหน้า"
                        >
                          +
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Legend */}
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-sm bg-green-400" /> เสร็จแล้ว
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-sm bg-green-300" /> ผ่านแล้ว
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 animate-pulse rounded-sm bg-yellow-400" /> กำลังทำ
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-sm bg-blue-200" /> แผนอนาคต
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-sm bg-red-300" /> ล่าช้า
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-0.5 bg-red-400" /> เดือนปัจจุบัน
            </span>
          </div>
        </div>
      )}

      {/* S-Curve */}
      {activities.length > 0 && (
        <div className="rounded-lg bg-white p-6 shadow">
          <SCurveChart
            planned={plannedCurve}
            actual={actualCurve}
            currentMonth={currentFiscalMonth}
          />
        </div>
      )}

      {/* KPI Targets - Quantitative */}
      {quantKpis.length > 0 && (
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">
            ตัวชี้วัดเชิงปริมาณ ({quantKpis.length} ตัว)
          </h2>
          <div className="space-y-3">
            {quantKpis.map((k) => {
              const pct =
                Number(k.target_value) > 0
                  ? Math.round((Number(k.actual_value) / Number(k.target_value)) * 100)
                  : 0;
              return (
                <div key={k.id} className="rounded border p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">
                        {k.kpi_name}
                      </p>
                    </div>
                    <span
                      className={`ml-2 shrink-0 rounded px-2 py-0.5 text-xs font-bold ${
                        pct > 100
                          ? "bg-blue-100 text-blue-700"
                          : pct >= 100
                          ? "bg-green-100 text-green-700"
                          : pct >= 1
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {pct}%
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-gray-400">เป้าหมาย</p>
                      <p className="font-semibold">
                        {Number(k.target_value)} {k.unit}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">ผลสะสม</p>
                      <p className="font-semibold text-blue-600">
                        {Number(k.actual_value)} {k.unit}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">สถานะ</p>
                      <p>
                        {k.verified ? (
                          <span className="text-green-600 font-medium">&#10003; บรรลุเป้า</span>
                        ) : pct > 0 ? (
                          <span className="text-yellow-600">กำลังดำเนินการ</span>
                        ) : (
                          <span className="text-gray-400">รอรายงาน</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-gray-200">
                    <div
                      className={`h-1.5 rounded-full transition-all ${
                        pct > 100
                          ? "bg-blue-500"
                          : pct >= 100
                          ? "bg-green-500"
                          : pct >= 1
                          ? "bg-yellow-500"
                          : "bg-gray-300"
                      }`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* KPI - Qualitative */}
      {qualKpis.length > 0 && (
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">
            ตัวชี้วัดเชิงคุณภาพ
          </h2>
          <div className="space-y-2">
            {qualKpis.map((k) => (
              <div key={k.id} className="flex items-center justify-between rounded border p-3">
                <p className="text-sm">{k.kpi_name}</p>
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${
                  k.verified
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-500"
                }`}>
                  {k.verified ? "&#10003; ผ่าน" : "รอประเมิน"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI - Time & Budget */}
      {(timeKpi || budgetKpi) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {timeKpi && (
            <div className="rounded-lg bg-white p-5 shadow">
              <p className="text-xs text-gray-500">ตัวชี้วัดเชิงเวลา</p>
              <p className="mt-1 text-sm font-medium">{timeKpi.kpi_name}</p>
              <p className="mt-2 text-2xl font-bold text-royal-700">
                {Number(timeKpi.actual_value)}%
                <span className="text-sm text-gray-400"> / {Number(timeKpi.target_value)}%</span>
              </p>
            </div>
          )}
          {budgetKpi && (
            <div className="rounded-lg bg-white p-5 shadow">
              <p className="text-xs text-gray-500">ตัวชี้วัดเชิงค่าใช้จ่าย</p>
              <p className="mt-1 text-sm font-medium">{budgetKpi.kpi_name}</p>
              <p className="mt-2 text-2xl font-bold text-royal-700">
                {budgetUsedPct}%
                <span className="text-sm text-gray-400"> / ≤{Number(budgetKpi.target_value)}%</span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Report History */}
      {reports.length > 0 && (
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">
            ประวัติการรายงาน ({reports.length} ครั้ง)
          </h2>
          <div className="space-y-3">
            {reports.map((r) => (
              <div key={r.id} className="rounded border-l-4 border-l-royal-500 bg-gray-50 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {r.activities
                        ? `${r.activities.activity_order}. ${r.activities.activity_name}`
                        : "กิจกรรม"}
                    </p>
                    <p className="mt-1 text-sm text-gray-600">
                      {r.report_description}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-gray-400">
                    {new Date(r.submitted_at).toLocaleDateString("th-TH", {
                      day: "numeric",
                      month: "short",
                      year: "2-digit",
                    })}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-gray-500">
                    &#128100; {r.submitted_by}
                  </span>
                  {r.evidence_url && (
                    <a
                      href={r.evidence_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      &#128206; หลักฐาน
                    </a>
                  )}
                  {r.kpi_contributions.length > 0 && (
                    <>
                      {r.kpi_contributions.map((kc, i) => (
                        <span
                          key={i}
                          className="rounded bg-green-100 px-1.5 py-0.5 text-green-700"
                        >
                          &#10003;{" "}
                          {kc.kpi_targets
                            ? kc.kpi_targets.kpi_name.substring(0, 25)
                            : "KPI"}{" "}
                          +{Number(kc.contribution_value)}
                          {kc.kpi_targets ? ` ${kc.kpi_targets.unit}` : ""}
                        </span>
                      ))}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity Budget Breakdown */}
      {activities.some((a) => Number(a.budget) > 0) && (
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">
            งบประมาณรายกิจกรรม
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">กิจกรรม</th>
                  <th className="px-3 py-2 text-right">งบจัดสรร</th>
                  <th className="px-3 py-2 text-left">ผลผลิต</th>
                </tr>
              </thead>
              <tbody>
                {activities
                  .filter((a) => Number(a.budget) > 0)
                  .map((a) => (
                    <tr key={a.id} className="border-t">
                      <td className="px-3 py-2">
                        <span className="text-gray-400 mr-1">{a.activity_order}.</span>
                        {a.activity_name}
                      </td>
                      <td className="px-3 py-2 text-right font-medium">
                        {formatBudget(a.budget)} บาท
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-500">
                        {a.expected_output || "-"}
                      </td>
                    </tr>
                  ))}
              </tbody>
              <tfoot className="bg-gray-50 font-semibold">
                <tr>
                  <td className="px-3 py-2">รวม</td>
                  <td className="px-3 py-2 text-right text-royal-700">
                    {formatBudget(
                      activities.reduce((s, a) => s + Number(a.budget), 0)
                    )}{" "}
                    บาท
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Report Form Modal */}
      {reportActivity && (
        <ReportForm
          projectId={id}
          activity={{
            id: reportActivity.id,
            activity_order: reportActivity.activity_order,
            activity_name: reportActivity.activity_name,
          }}
          kpis={kpis}
          onClose={() => setReportActivity(null)}
          onSaved={() => {
            setReportActivity(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}
