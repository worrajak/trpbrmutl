"use client";

import { useState, useEffect } from "react";
import type { DBProject } from "@/lib/supabase-data";

function formatBudget(n: number): string {
  return Number(n).toLocaleString("th-TH");
}

const statusLabel: Record<string, { text: string; cls: string }> = {
  approved: { text: "อนุมัติแล้ว", cls: "bg-green-100 text-green-700" },
  in_progress: { text: "กำลังดำเนินการ", cls: "bg-yellow-100 text-yellow-700" },
  completed: { text: "เสร็จสมบูรณ์", cls: "bg-blue-100 text-blue-700" },
  delayed: { text: "ล่าช้า", cls: "bg-red-100 text-red-700" },
  cancelled: { text: "ยกเลิก", cls: "bg-gray-200 text-gray-500" },
};

const programOptions = [
  { value: "all", label: "ทั้งหมด" },
  { value: "1.ผลักดันเทคโนโลยี", label: "1.ผลักดันเทคโนโลยี" },
  { value: "2.ขับเคลื่อนกลไก", label: "2.ขับเคลื่อนกลไก" },
  { value: "3.พัฒนากำลังคน", label: "3.พัฒนากำลังคน" },
];

const programColor: Record<string, string> = {
  "1.ผลักดันเทคโนโลยี": "bg-blue-100 text-blue-700",
  "2.ขับเคลื่อนกลไก": "bg-green-100 text-green-700",
  "3.พัฒนากำลังคน": "bg-purple-100 text-purple-700",
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<DBProject[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filterMain, setFilterMain] = useState<string>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    // Check URL params for filter
    const params = new URLSearchParams(window.location.search);
    const mainParam = params.get("main");
    if (mainParam) setFilterMain(mainParam);

    fetch("/api/supabase/projects")
      .then((r) => r.json())
      .then((data) => {
        setProjects(data.projects || []);
        setIsLive(data.isLive);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = projects.filter((p) => {
    if (filterMain !== "all" && p.main_program !== filterMain) return false;
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

      {/* Filters */}
      <div className="flex flex-wrap gap-3 rounded-lg bg-white p-4 shadow">
        <div>
          <label className="mb-1 block text-xs text-gray-500">โครงการหลัก</label>
          <select
            value={filterMain}
            onChange={(e) => setFilterMain(e.target.value)}
            className="rounded border px-3 py-1.5 text-sm"
          >
            {programOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs text-gray-500">ค้นหา</label>
          <input
            type="text"
            placeholder="ชื่อโครงการ, ผู้รับผิดชอบ, พื้นที่, รหัส ERP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded border px-3 py-1.5 text-sm"
          />
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
                  <td className="max-w-xs px-3 py-2">
                    <a
                      href={`/projects/${p.id}`}
                      className="font-medium text-royal-600 hover:underline"
                    >
                      {p.project_name.length > 60
                        ? p.project_name.substring(0, 60) + "..."
                        : p.project_name}
                    </a>
                    <p className="mt-0.5">
                      <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${pc}`}>
                        {p.main_program}
                      </span>
                    </p>
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-600">
                    {p.organization || (p.main_program === "ใต้ร่มพระบารมี" ? "กลุ่มแผนงานใต้ร่มพระบารมี" : "-")}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {p.responsible || "-"}
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
                  <td className="px-3 py-2 font-mono text-[10px] text-gray-400">
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
