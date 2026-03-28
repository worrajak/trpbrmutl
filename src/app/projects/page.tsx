"use client";

import { useState, useEffect } from "react";
import {
  mainProjects,
  subProjects as staticProjects,
  getIndicatorById,
  getMainProjectById,
} from "@/lib/data";
import type { SubProject } from "@/lib/types";

function formatBudget(n: number): string {
  return n.toLocaleString("th-TH");
}

const statusLabel: Record<string, { text: string; cls: string }> = {
  approved: { text: "อนุมัติแล้ว", cls: "bg-green-100 text-green-700" },
  completed: { text: "ดำเนินการแล้ว", cls: "bg-blue-100 text-blue-700" },
  pending: { text: "อยู่ในกระบวนการ", cls: "bg-yellow-100 text-yellow-700" },
  revision: { text: "ปรับแก้ไข", cls: "bg-red-100 text-red-700" },
};

export default function ProjectsPage() {
  const [subProjects, setSubProjects] = useState<SubProject[]>(staticProjects);
  const [isLive, setIsLive] = useState(false);
  const [filterMain, setFilterMain] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => {
        if (data.projects?.length > 0) {
          setSubProjects(data.projects);
          setIsLive(data.isLive);
        }
      })
      .catch(() => {});
  }, []);

  const filtered = subProjects.filter((sp) => {
    if (filterMain !== "all" && sp.mainProjectId !== filterMain) return false;
    if (filterStatus !== "all" && sp.status !== filterStatus) return false;
    if (search && !sp.name.includes(search) && !sp.responsible.includes(search) && !sp.site.includes(search))
      return false;
    return true;
  });

  const totalBudget = filtered.reduce((s, p) => s + p.budget, 0);
  const totalUsed = filtered.reduce((s, p) => s + (p.budgetUsed ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-royal-700">โครงการย่อยทั้งหมด</h1>
        <p className="text-sm text-gray-600">
          รายละเอียดโครงการย่อย งบประมาณ สถานะ และตัวชี้วัดที่ตอบ
        </p>
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
            <option value="all">ทั้งหมด</option>
            {mainProjects.map((mp) => (
              <option key={mp.id} value={mp.id}>
                {mp.source} - {mp.code}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">สถานะ</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded border px-3 py-1.5 text-sm"
          >
            <option value="all">ทั้งหมด</option>
            <option value="approved">อนุมัติแล้ว</option>
            <option value="completed">ดำเนินการแล้ว</option>
            <option value="pending">อยู่ในกระบวนการ</option>
            <option value="revision">ปรับแก้ไข</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs text-gray-500">ค้นหา</label>
          <input
            type="text"
            placeholder="ชื่อโครงการ, ผู้รับผิดชอบ, พื้นที่..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded border px-3 py-1.5 text-sm"
          />
        </div>
      </div>

      {/* Summary bar */}
      <div className="flex gap-4 text-sm">
        <span className="text-gray-500">
          แสดง <strong>{filtered.length}</strong> จาก {subProjects.length} โครงการ
        </span>
        <span className="text-gray-500">
          งบรวม: <strong>{formatBudget(totalBudget)}</strong> บาท
        </span>
        {totalUsed > 0 && (
          <span className="text-gray-500">
            ใช้แล้ว: <strong>{formatBudget(totalUsed)}</strong> บาท
          </span>
        )}
      </div>

      {/* Project table */}
      <div className="overflow-x-auto rounded-lg bg-white shadow">
        <table className="w-full text-sm">
          <thead className="bg-royal-700 text-white">
            <tr>
              <th className="whitespace-nowrap px-3 py-2 text-left">รหัส</th>
              <th className="px-3 py-2 text-left">ชื่อโครงการ</th>
              <th className="px-3 py-2 text-left">ผู้รับผิดชอบ</th>
              <th className="px-3 py-2 text-left">พื้นที่</th>
              <th className="px-3 py-2 text-right">งบประมาณ</th>
              <th className="px-3 py-2 text-center">สถานะ</th>
              <th className="px-3 py-2 text-center">ตัวชี้วัด</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((sp) => {
              const main = getMainProjectById(sp.mainProjectId);
              const st = statusLabel[sp.status];
              return (
                <tr key={sp.id} className="border-t hover:bg-gray-50">
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{sp.code}</td>
                  <td className="max-w-xs px-3 py-2">
                    <a
                      href={`/projects/${sp.id}`}
                      className="font-medium text-royal-600 hover:underline"
                    >
                      {sp.name.length > 80
                        ? sp.name.substring(0, 80) + "..."
                        : sp.name}
                    </a>
                    {main && (
                      <p className="text-xs text-gray-400">{main.source}</p>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs">{sp.responsible || "-"}</td>
                  <td className="px-3 py-2 text-xs">{sp.site}</td>
                  <td className="px-3 py-2 text-right">
                    <span className="font-medium">{formatBudget(sp.budget)}</span>
                    {sp.budgetUsed !== undefined && (
                      <p className="text-xs text-gray-400">
                        ใช้: {formatBudget(sp.budgetUsed)}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${st.cls}`}
                    >
                      {st.text}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex flex-wrap justify-center gap-1">
                      {sp.indicatorContributions.map((ic) => {
                        const ind = getIndicatorById(ic.indicatorId);
                        return (
                          <span
                            key={ic.indicatorId}
                            className="inline-block rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600"
                            title={ind?.name}
                          >
                            {ic.indicatorId.replace("kpi-", "#")}
                          </span>
                        );
                      })}
                    </div>
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
