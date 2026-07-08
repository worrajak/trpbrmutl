"use client";

import { useState, useEffect, useMemo } from "react";
import type {
  DBProject,
  DBActivity,
  DBFaculty,
  DBInitiative,
} from "@/lib/supabase-data";
import { fetchActivities } from "@/lib/supabase-data";
import { computeRiskyProjects } from "@/lib/dashboard-decisions";

interface ProjectWithReport extends DBProject {
  last_report: {
    submitted_at: string;
    submitted_by: string;
    description: string | null;
    image_url: string | null;
    report_count: number;
  } | null;
}

function formatBudget(n: number): string {
  return Number(n).toLocaleString("th-TH");
}

function formatRelativeTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffH = diffMs / 1000 / 3600;
  if (diffH < 1) return "เมื่อครู่";
  if (diffH < 24) return `${Math.floor(diffH)} ชม.ที่แล้ว`;
  const diffD = diffH / 24;
  if (diffD < 7) return `${Math.floor(diffD)} วันที่แล้ว`;
  if (diffD < 30) return `${Math.floor(diffD / 7)} สัปดาห์ก่อน`;
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}

const statusLabel: Record<string, { text: string; cls: string }> = {
  approved: { text: "อนุมัติแล้ว", cls: "bg-green-100 text-green-700" },
  in_progress: { text: "กำลังดำเนินการ", cls: "bg-yellow-100 text-yellow-700" },
  completed: { text: "เสร็จสมบูรณ์", cls: "bg-blue-100 text-blue-700" },
  delayed: { text: "ล่าช้า", cls: "bg-red-100 text-red-700" },
  cancelled: { text: "ยกเลิก", cls: "bg-gray-200 text-gray-500" },
};

// map ค่า ?main= เดิม (main_program) → initiative_id ใหม่ — กันลิงก์เก่าพัง
const MAIN_TO_INITIATIVE: Record<string, string> = {
  "1.ผลักดันเทคโนโลยี": "thrust",
  "2.ขับเคลื่อนกลไก": "knowledge",
  "3.พัฒนากำลังคน": "workforce",
};

// badge สถานะอนุมัติ (จาก approval_status JSONB) — แสดงเฉพาะ key ที่ true · ซ้อนกันได้
const approvalBadges: Array<{
  key: "approved" | "editing" | "in_review";
  text: string;
  cls: string;
}> = [
  { key: "approved", text: "อนุมัติแล้ว", cls: "bg-green-100 text-green-700" },
  { key: "editing", text: "ปรับแก้ไข", cls: "bg-yellow-100 text-yellow-700" },
  { key: "in_review", text: "รออนุมัติ", cls: "bg-orange-100 text-orange-700" },
];

const programColor: Record<string, string> = {
  "1.ผลักดันเทคโนโลยี": "bg-blue-100 text-blue-700",
  "2.ขับเคลื่อนกลไก": "bg-green-100 text-green-700",
  "3.พัฒนากำลังคน": "bg-purple-100 text-purple-700",
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectWithReport[]>([]);
  const [faculties, setFaculties] = useState<DBFaculty[]>([]);
  const [initiatives, setInitiatives] = useState<DBInitiative[]>([]);
  const [activities, setActivities] = useState<DBActivity[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filterInitiative, setFilterInitiative] = useState<string>("all");
  const [filterFaculty, setFilterFaculty] = useState<string>("all");
  const [showCancelled, setShowCancelled] = useState(false);
  const [riskyOnly, setRiskyOnly] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    // Check URL params for filter
    const params = new URLSearchParams(window.location.search);
    // รองรับทั้ง ?main= และ ?main_program= (หน้า foundation/PlanTabs ใช้ main_program)
    const mainParam = params.get("main") ?? params.get("main_program");
    if (mainParam) {
      // map main_program → initiative_id · ถ้า map ไม่เจอ fallback "all" (กันตารางว่างจากค่าดิบ)
      setFilterInitiative(MAIN_TO_INITIATIVE[mainParam] || "all");
    }
    if (params.get("filter") === "risky") {
      setRiskyOnly(true);
      // เกณฑ์ overdue activity ต้องใช้ activities — ดึงตรงจาก Supabase (anon client)
      // เฉพาะตอนเปิด filter นี้ · ถ้าดึงไม่ได้ (คืน []) จะเหลือเกณฑ์เบิกช้าอย่างเดียว
      fetchActivities()
        .then(setActivities)
        .catch(() => {});
    }

    fetch("/api/supabase/projects")
      .then((r) => r.json())
      .then((data) => {
        setProjects(data.projects || []);
        setFaculties(data.faculties || []);
        setInitiatives(data.initiatives || []);
        setIsLive(data.isLive);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // โครงการเสี่ยง — เกณฑ์เดียวกับ home dashboard (computeRiskyProjects ใน lib/dashboard-decisions.ts)
  // summary คืนเฉพาะ riskyCount + top3 จึงเรียกทีละโครงการ: riskyCount > 0 = โครงการนั้นเข้าเกณฑ์เสี่ยง
  const riskyIds = useMemo(() => {
    if (!riskyOnly) return null;
    const ids = new Set<string>();
    for (const p of projects) {
      if (computeRiskyProjects([p], activities).riskyCount > 0) ids.add(p.id);
    }
    return ids;
  }, [riskyOnly, projects, activities]);

  const filtered = projects
    .filter((p) => {
      // โครงการที่ยกเลิกไม่แสดงเป็น default (เปิดดูได้ผ่าน checkbox "แสดงที่ยกเลิก")
      if (!showCancelled && p.status === "cancelled") return false;
      if (riskyIds && !riskyIds.has(p.id)) return false;
      if (filterInitiative !== "all" && p.initiative_id !== filterInitiative)
        return false;
      if (filterFaculty !== "all" && p.faculty_id !== filterFaculty) return false;
      if (
        search &&
        !p.project_name.includes(search) &&
        !(p.responsible || "").includes(search) &&
        !(p.site || "").includes(search) &&
        !(p.organization || "").includes(search) &&
        !(p.erp_code || "").includes(search)
      )
        return false;
      return true;
    })
    .sort((a, b) => {
      // เรียงตามวันรายงานล่าสุด (ใหม่อยู่บน) — โครงการที่ยังไม่รายงานลงล่างสุด
      const aTime = a.last_report
        ? new Date(a.last_report.submitted_at).getTime()
        : 0;
      const bTime = b.last_report
        ? new Date(b.last_report.submitted_at).getTime()
        : 0;
      return bTime - aTime;
    });

  const totalBudget = filtered.reduce((s, p) => s + Number(p.budget_total), 0);
  const totalUsed = filtered.reduce((s, p) => s + Number(p.budget_used), 0);
  const totalRemaining = totalBudget - totalUsed;
  const usagePct = totalBudget > 0 ? Math.round((totalUsed / totalBudget) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-500">กำลังโหลดข้อมูลโครงการ...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-royal-700">โครงการทั้งหมด</h1>
        <p className="text-sm text-gray-600">
          ข้อมูลจาก ง9 + ยอดเบิกจ่ายจาก Google Sheets (ERP)
        </p>
        {isLive && (
          <p className="mt-1 text-xs text-green-600">ข้อมูลจาก Supabase (realtime)</p>
        )}
      </div>

      {/* Filters — stack vertical บนมือถือ · เรียงแถวบน sm ขึ้นไป */}
      <div className="flex flex-col gap-3 rounded-lg bg-white p-4 shadow sm:flex-row sm:flex-wrap sm:items-end">
        <div>
          <label className="mb-1 block text-xs text-gray-500">แผนงาน</label>
          <select
            value={filterInitiative}
            onChange={(e) => setFilterInitiative(e.target.value)}
            className="w-full rounded border px-3 py-1.5 text-sm sm:w-auto"
          >
            <option value="all">ทั้งหมด</option>
            {initiatives.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name_th}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">หน่วยงาน</label>
          <select
            value={filterFaculty}
            onChange={(e) => setFilterFaculty(e.target.value)}
            className="w-full rounded border px-3 py-1.5 text-sm sm:w-auto"
          >
            <option value="all">ทั้งหมด</option>
            {faculties.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name_short || f.name_th}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 sm:min-w-[200px]">
          <label className="mb-1 block text-xs text-gray-500">ค้นหา</label>
          <input
            type="text"
            placeholder="ชื่อโครงการ, ผู้รับผิดชอบ, พื้นที่, รหัส ERP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded border px-3 py-1.5 text-sm"
          />
        </div>
        <div className="flex items-center gap-3 sm:pb-1.5">
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-gray-500">
            <input
              type="checkbox"
              checked={showCancelled}
              onChange={(e) => setShowCancelled(e.target.checked)}
            />
            แสดงที่ยกเลิก
          </label>
          {riskyOnly && (
            <button
              type="button"
              onClick={() => setRiskyOnly(false)}
              title="ล้าง filter โครงการเสี่ยง"
              className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-[0.72rem] font-medium text-red-700 hover:bg-red-200"
            >
              เฉพาะโครงการเสี่ยง ✕
            </button>
          )}
        </div>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg bg-white p-3 shadow">
          <p className="text-xs text-gray-500">โครงการ</p>
          <p className="text-xl font-bold text-royal-700">{filtered.length}</p>
        </div>
        <div className="rounded-lg bg-white p-3 shadow">
          <p className="text-xs text-gray-500">งบรวม</p>
          <p className="text-xl font-bold text-royal-700">{formatBudget(totalBudget)}</p>
        </div>
        <div className="rounded-lg bg-white p-3 shadow">
          <p className="text-xs text-gray-500">เบิกจ่ายแล้ว</p>
          <p className="text-xl font-bold text-blue-600">{formatBudget(totalUsed)}</p>
          <div className="mt-1 h-1.5 rounded-full bg-gray-200">
            <div
              className="h-1.5 rounded-full bg-blue-500"
              style={{ width: `${Math.min(usagePct, 100)}%` }}
            />
          </div>
        </div>
        <div className="rounded-lg bg-white p-3 shadow">
          <p className="text-xs text-gray-500">คงเหลือ</p>
          <p className="text-xl font-bold text-gray-600">{formatBudget(totalRemaining)}</p>
        </div>
      </div>

      {/* Project table */}
      <div className="overflow-x-auto rounded-lg bg-white shadow">
        <table className="w-full text-sm">
          <thead className="bg-royal-700 text-white">
            <tr>
              <th className="px-2 py-2 text-center" style={{ width: 72 }}>รายงาน</th>
              <th className="px-3 py-2 text-left">โครงการ</th>
              <th className="px-3 py-2 text-left">หน่วยงาน</th>
              <th className="px-3 py-2 text-left">ผู้รับผิดชอบ</th>
              <th className="px-3 py-2 text-right">งบประมาณ</th>
              <th className="px-3 py-2 text-center" style={{ minWidth: 120 }}>เบิกจ่าย</th>
              <th className="px-3 py-2 text-left">รหัส ERP</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const pct =
                Number(p.budget_total) > 0
                  ? Math.round((Number(p.budget_used) / Number(p.budget_total)) * 100)
                  : 0;
              const pc = programColor[p.main_program] || "bg-gray-100 text-gray-600";
              return (
                <tr key={p.id} className="border-t hover:bg-gray-50">
                  <td className="px-2 py-2 text-center">
                    {p.last_report ? (
                      <a
                        href={`/projects/${p.id}`}
                        className="inline-flex flex-col items-center gap-0.5"
                        title={`${p.last_report.report_count} รายงาน · ล่าสุด ${formatRelativeTime(p.last_report.submitted_at)}`}
                      >
                        {p.last_report.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.last_report.image_url}
                            alt=""
                            loading="lazy"
                            className="h-12 w-12 rounded object-cover ring-1 ring-gray-200"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded bg-blue-50 text-blue-400 ring-1 ring-blue-100">
                            📝
                          </div>
                        )}
                        <span className="text-[0.65rem] text-gray-500">
                          {formatRelativeTime(p.last_report.submitted_at)}
                        </span>
                      </a>
                    ) : (
                      <span className="inline-flex flex-col items-center gap-0.5 text-gray-300">
                        <div className="flex h-12 w-12 items-center justify-center rounded bg-gray-50 ring-1 ring-gray-100">
                          <span className="text-lg">—</span>
                        </div>
                        <span className="text-[0.65rem]">ยังไม่รายงาน</span>
                      </span>
                    )}
                  </td>
                  <td className="max-w-xs px-3 py-2">
                    <a
                      href={`/projects/${p.id}`}
                      className="font-medium text-royal-600 hover:underline"
                    >
                      {p.project_name.length > 60
                        ? p.project_name.substring(0, 60) + "..."
                        : p.project_name}
                    </a>
                    <p className="mt-0.5 flex flex-wrap gap-1">
                      <span className={`inline-block rounded px-1.5 py-0.5 text-[0.65rem] font-medium ${pc}`}>
                        {p.main_program}
                      </span>
                      {/* badge สถานะอนุมัติ — แสดงทุก key ที่ true (ซ้อนกันได้) */}
                      {approvalBadges.map(
                        (b) =>
                          p.approval_status?.[b.key] && (
                            <span
                              key={b.key}
                              className={`inline-block rounded px-1.5 py-0.5 text-[0.65rem] font-medium ${b.cls}`}
                            >
                              {b.text}
                            </span>
                          )
                      )}
                      {p.status === "cancelled" && (
                        <span className={`inline-block rounded px-1.5 py-0.5 text-[0.65rem] font-medium ${statusLabel.cancelled.cls}`}>
                          {statusLabel.cancelled.text}
                        </span>
                      )}
                    </p>
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-600">
                    {p.organization || (p.main_program === "ใต้ร่มพระบารมี" ? "กลุ่มแผนงานใต้ร่มพระบารมี" : "-")}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {p.responsible || "-"}
                    {p.responsible_external && (
                      <p className="text-[0.65rem] text-gray-400">
                        รับผิดชอบนอกกลุ่ม: {p.responsible_external}
                      </p>
                    )}
                    {p.site && (
                      <p className="text-gray-400">
                        {p.site.length > 30 ? p.site.substring(0, 30) + "..." : p.site}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className="font-medium">{formatBudget(p.budget_total)}</span>
                    <p className="text-xs text-gray-400">
                      เหลือ {formatBudget(p.budget_remaining)}
                    </p>
                  </td>
                  <td className="px-3 py-2">
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
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                      <span className="w-10 text-right text-xs text-gray-500">
                        {pct}%
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {formatBudget(p.budget_used)} บาท
                    </p>
                  </td>
                  <td className="px-3 py-2 font-mono text-[0.65rem] text-gray-400">
                    {p.erp_code || "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
