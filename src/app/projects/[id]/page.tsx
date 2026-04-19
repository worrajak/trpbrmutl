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
import TokenLogin from "@/components/TokenLogin";
import TronWalletConnect from "@/components/TronWalletConnect";
import BudgetReconciliation from "@/components/BudgetReconciliation";
import { sdgTagsToGoals } from "@/lib/sdgs";

interface ReportData {
  id: string;
  report_description: string;
  evidence_url: string | null;
  submitted_by: string;
  submitted_at: string;
  budget_spent: number | null;
  sdg_tags: number[] | null;
  evidence_files: Array<{ name: string; url: string; type: string }> | null;
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
  const [editingReport, setEditingReport] = useState<ReportData | null>(null);
  const [tokenCode, setTokenCode] = useState<string | null>(null);
  const [tokenInfo, setTokenInfo] = useState<{ responsible_name: string; tron_wallet: string | null } | null>(null);
  const [rpfBalance, setRpfBalance] = useState<{ total_rpf: number; report_count: number; streak_count: number } | null>(null);
  const [tronWallet, setTronWallet] = useState<string | null>(null);

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
  const budgetTotal    = Number(project.budget_total)    || 0;
  const budgetUsed     = Number(project.budget_used)     || 0;
  const budgetReported = Number(project.budget_reported) || 0;
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

      {/* Token Auth + RPF Balance */}
      {!tokenCode ? (
        <TokenLogin
          projectId={id}
          onAuthenticated={(code, info) => {
            setTokenCode(code);
            setTokenInfo(info);
            // Fetch balance
            fetch("/api/supabase/token", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token_code: code }),
            })
              .then((r) => r.json())
              .then((d) => setRpfBalance(d.balance))
              .catch(() => {});
          }}
        />
      ) : (
        <div className="rounded-lg bg-gradient-to-r from-royal-700 to-blue-600 px-5 py-3 text-white shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">&#128176;</span>
              <div>
                <p className="text-sm font-medium">
                  {tokenInfo?.responsible_name || "หัวหน้าโครงการ"}
                </p>
                <p className="text-xs text-white/70">
                  Token: {tokenCode}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">
                {(rpfBalance?.total_rpf || 0).toLocaleString()} RPF
              </p>
              <p className="text-xs text-white/70">
                {rpfBalance?.report_count || 0} รายงาน | streak {rpfBalance?.streak_count || 0}
              </p>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-white/20 pt-2">
            <span className="text-xs text-white/70">TRON Wallet:</span>
            <TronWalletConnect
              tokenCode={tokenCode}
              currentWallet={tronWallet || tokenInfo?.tron_wallet || null}
              onWalletLinked={(addr) => setTronWallet(addr)}
            />
          </div>
        </div>
      )}

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

        {/* ผู้รับผิดชอบ */}
        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
          <span className="text-gray-500">ผู้รับผิดชอบ:</span>
          <span className="font-medium">{project.responsible || "-"}</span>
          {project.responsible_title && (
            <span className="text-xs text-gray-400">({project.responsible_title})</span>
          )}
          {project.phone && (
            <span className="text-xs text-gray-400">☎ {project.phone}</span>
          )}
        </div>

        {/* 💰 Budget Reconciliation — แสดง 3 ยอด + แจ้งเตือน discrepancy */}
        <div className="mt-4">
          <BudgetReconciliation
            budgetTotal={budgetTotal}
            budgetUsedErp={budgetUsed}
            budgetReported={budgetReported}
          />
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

        {/* SDG Tags */}
        {(project.sdg_tags || []).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {sdgTagsToGoals(project.sdg_tags || []).map((g) => (
              <a
                key={g.id}
                href={`/sdgs/${g.id}`}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-white transition hover:opacity-80"
                style={{ backgroundColor: g.color }}
              >
                {g.icon} SDG {g.id}: {g.name_th}
              </a>
            ))}
          </div>
        )}
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
                        {tokenCode ? (
                          <button
                            onClick={() => setReportActivity(act)}
                            className="rounded bg-royal-700 px-2 py-1 text-xs text-white hover:bg-royal-800"
                            title="รายงานความก้าวหน้า"
                          >
                            +
                          </button>
                        ) : (
                          <span className="text-xs text-gray-300" title="ใส่ Token เพื่อรายงาน">
                            &#128274;
                          </span>
                        )}
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
                {budgetTotal > 0 ? Math.round((Math.max(budgetUsed, budgetReported) / budgetTotal) * 100) : 0}%
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
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">
                      {r.activities
                        ? `${r.activities.activity_order}. ${r.activities.activity_name}`
                        : "กิจกรรม"}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">
                      {r.report_description}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-xs text-gray-400">
                      {new Date(r.submitted_at).toLocaleDateString("th-TH", {
                        day: "numeric",
                        month: "short",
                        year: "2-digit",
                      })}
                    </span>
                    {tokenCode && (
                      <button
                        onClick={() => setEditingReport(r)}
                        className="rounded bg-blue-50 px-2 py-0.5 text-[11px] text-blue-700 hover:bg-blue-100"
                        title="แก้ไขรายงานนี้"
                      >
                        ✏️ แก้ไข
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-gray-500">
                    &#128100; {r.submitted_by}
                  </span>
                  <ReportBudgetEditor
                    reportId={r.id}
                    currentAmount={Number(r.budget_spent || 0)}
                    tokenCode={tokenCode}
                    onSaved={loadData}
                  />
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
                  {(r.evidence_files || []).map((f, fi) => (
                    <a
                      key={fi}
                      href={f.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded bg-purple-50 px-1.5 py-0.5 text-purple-700 hover:underline"
                    >
                      {f.type === "pdf" ? "📄" : f.type === "image" ? "🖼️" : "🔗"}
                      {f.name || "หลักฐาน"}
                    </a>
                  ))}
                  {(r.sdg_tags || []).length > 0 &&
                    sdgTagsToGoals(r.sdg_tags || []).map((g) => (
                      <a
                        key={g.id}
                        href={`/sdgs/${g.id}`}
                        className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white"
                        style={{ backgroundColor: g.color }}
                      >
                        {g.icon} {g.id}
                      </a>
                    ))
                  }
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
          tokenCode={tokenCode || undefined}
          onClose={() => setReportActivity(null)}
          onSaved={() => {
            setReportActivity(null);
            loadData();
            // Refresh RPF balance
            if (tokenCode) {
              fetch("/api/supabase/token", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token_code: tokenCode }),
              })
                .then((r) => r.json())
                .then((d) => setRpfBalance(d.balance))
                .catch(() => {});
            }
          }}
        />
      )}

      {/* Edit Report Modal — หน.โครงการแก้ข้อความ/รูป/ยอดเงิน */}
      {editingReport && tokenCode && (
        <EditReportModal
          report={editingReport}
          tokenCode={tokenCode}
          onClose={() => setEditingReport(null)}
          onSaved={() => {
            setEditingReport(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}

// ─── Inline budget editor (หน.โครงการแก้ยอดเงินในรายงานตัวเอง) ─────────────
function ReportBudgetEditor({
  reportId,
  currentAmount,
  tokenCode,
  onSaved,
}: {
  reportId: string;
  currentAmount: number;
  tokenCode: string | null;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(currentAmount || ""));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // ไม่ได้ login token → แสดงแค่ยอด (ถ้ามี)
  if (!tokenCode) {
    if (currentAmount > 0) {
      return (
        <span className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-700">
          💰 {formatBudget(currentAmount)} บาท
        </span>
      );
    }
    return null;
  }

  // Authed → แสดงยอด + edit icon / หรือฟอร์มแก้
  if (!editing) {
    return (
      <button
        onClick={() => { setEditing(true); setValue(String(currentAmount || "")); setError(""); }}
        className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 ${currentAmount > 0 ? "bg-amber-50 text-amber-700 hover:bg-amber-100" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
        title="คลิกเพื่อแก้ยอดเงิน"
      >
        💰 {currentAmount > 0 ? `${formatBudget(currentAmount)} บาท` : "เพิ่มยอด"}
        <span className="text-[10px] opacity-60">✏️</span>
      </button>
    );
  }

  async function save() {
    const n = Number(value);
    if (!isFinite(n) || n < 0) { setError("ยอดไม่ถูกต้อง"); return; }
    setSaving(true); setError("");
    const res = await fetch(`/api/supabase/report/${reportId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token_code: tokenCode, budget_spent: n }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error || "บันทึกไม่สำเร็จ"); return; }
    setEditing(false);
    onSaved();
  }

  return (
    <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5">
      <span>💰</span>
      <input
        type="number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
        className="w-24 rounded border px-1 py-0.5 text-xs"
        autoFocus
        min={0}
      />
      <span className="text-gray-500">บาท</span>
      <button
        onClick={save}
        disabled={saving}
        className="rounded bg-green-600 px-2 py-0.5 text-white hover:bg-green-700 disabled:opacity-50"
      >
        {saving ? "..." : "บันทึก"}
      </button>
      <button
        onClick={() => setEditing(false)}
        className="rounded bg-gray-200 px-2 py-0.5 text-gray-700 hover:bg-gray-300"
      >
        ยกเลิก
      </button>
      {error && <span className="text-red-600 ml-1">{error}</span>}
    </span>
  );
}

// ─── Edit Report Modal (แก้ข้อความ + รูป/หลักฐาน + ยอดเงิน) ───────────────
type EvidenceFile = { name: string; url: string; type: string };

function EditReportModal({
  report,
  tokenCode,
  onClose,
  onSaved,
}: {
  report: ReportData;
  tokenCode: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [description, setDescription] = useState(report.report_description || "");
  const [evidenceUrl, setEvidenceUrl] = useState(report.evidence_url || "");
  const [files, setFiles] = useState<EvidenceFile[]>(
    (report.evidence_files || []).map((f) => ({ name: f.name || "", url: f.url || "", type: f.type || "link" }))
  );
  const [budgetSpent, setBudgetSpent] = useState(String(report.budget_spent || 0));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function addFile() {
    setFiles([...files, { name: "", url: "", type: "link" }]);
  }
  function removeFile(i: number) {
    setFiles(files.filter((_, idx) => idx !== i));
  }
  function updateFile(i: number, patch: Partial<EvidenceFile>) {
    setFiles(files.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  }

  async function save() {
    setSaving(true);
    setError("");

    const cleanFiles = files
      .map((f) => ({ ...f, url: f.url.trim(), name: f.name.trim() }))
      .filter((f) => f.url);

    const budget = Number(budgetSpent);
    if (!isFinite(budget) || budget < 0) {
      setError("ยอดเงินไม่ถูกต้อง");
      setSaving(false);
      return;
    }

    const res = await fetch(`/api/supabase/report/${report.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token_code: tokenCode,
        report_description: description,
        evidence_url: evidenceUrl.trim() || null,
        evidence_files: cleanFiles,
        budget_spent: budget,
      }),
    });

    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "บันทึกไม่สำเร็จ");
      return;
    }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="sticky top-0 flex items-center justify-between border-b bg-white px-5 py-3">
          <h2 className="text-base font-semibold text-gray-800">✏️ แก้ไขรายงาน</h2>
          <button onClick={onClose} className="text-xl text-gray-400 hover:text-gray-600">
            ×
          </button>
        </div>

        <div className="space-y-4 p-5">
          {/* Activity label */}
          {report.activities && (
            <p className="text-xs text-gray-500">
              กิจกรรม: <b>{report.activities.activity_order}. {report.activities.activity_name}</b>
            </p>
          )}

          {/* Description */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">ข้อความรายงาน</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="เล่าสิ่งที่ทำ ผลที่ได้ บทเรียน..."
            />
          </div>

          {/* Budget spent */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">💰 ยอดเงินที่ใช้ในกิจกรรมนี้ (บาท)</label>
            <input
              type="number"
              value={budgetSpent}
              onChange={(e) => setBudgetSpent(e.target.value)}
              min={0}
              className="w-40 rounded-lg border px-3 py-2 text-sm"
            />
            <p className="mt-1 text-[11px] text-gray-500">
              ระบบจะคำนวณ budget_reported ของโครงการใหม่จากยอดรวมทุกรายงาน
            </p>
          </div>

          {/* Primary evidence URL */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">🔗 ลิงก์หลักฐานหลัก (ถ้ามี)</label>
            <input
              type="url"
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="https://..."
            />
          </div>

          {/* Evidence files */}
          <div className="rounded-lg border border-purple-200 bg-purple-50 p-3">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-semibold text-purple-800">📎 หลักฐาน/รูปภาพ ({files.length} รายการ)</label>
              <button
                onClick={addFile}
                className="rounded bg-purple-600 px-2 py-0.5 text-xs text-white hover:bg-purple-700"
              >
                + เพิ่ม
              </button>
            </div>

            <div className="space-y-2">
              {files.length === 0 && (
                <p className="text-center text-xs text-purple-500">ยังไม่มีหลักฐาน — กด &ldquo;+ เพิ่ม&rdquo; เพื่อแนบรูป/เอกสาร</p>
              )}

              {files.map((f, i) => (
                <div key={i} className="flex flex-col gap-1 rounded bg-white p-2 sm:flex-row sm:items-center">
                  <select
                    value={f.type}
                    onChange={(e) => updateFile(i, { type: e.target.value })}
                    className="rounded border px-2 py-1 text-xs"
                  >
                    <option value="image">🖼️ รูป</option>
                    <option value="pdf">📄 PDF</option>
                    <option value="link">🔗 Link</option>
                    <option value="video">🎥 วิดีโอ</option>
                  </select>
                  <input
                    type="text"
                    value={f.name}
                    onChange={(e) => updateFile(i, { name: e.target.value })}
                    placeholder="ชื่อ (เช่น รูปลงพื้นที่)"
                    className="flex-1 rounded border px-2 py-1 text-xs"
                  />
                  <input
                    type="url"
                    value={f.url}
                    onChange={(e) => updateFile(i, { url: e.target.value })}
                    placeholder="URL (https://...)"
                    className="flex-[2] rounded border px-2 py-1 text-xs"
                  />
                  <button
                    onClick={() => removeFile(i)}
                    className="rounded bg-red-100 px-2 py-1 text-xs text-red-700 hover:bg-red-200"
                    title="ลบรายการนี้"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <p className="mt-2 text-[10px] text-purple-600">
              💡 อัปโหลดรูปไปยัง Google Drive / Imgur / Dropbox แล้วใส่ลิงก์แบบ public ที่นี่
            </p>
          </div>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">❌ {error}</p>}
        </div>

        <div className="sticky bottom-0 flex justify-end gap-2 border-t bg-white px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-lg border px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            ยกเลิก
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-royal-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-royal-800 disabled:opacity-50"
          >
            {saving ? "⏳ กำลังบันทึก..." : "💾 บันทึก"}
          </button>
        </div>
      </div>
    </div>
  );
}
