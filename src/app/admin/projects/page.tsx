"use client";

import { useState, useEffect, useMemo } from "react";

/**
 * /admin/projects
 * จัดการโครงการ (list · search · edit · delete) สำหรับ admin
 *
 * Use case: หลังนำเข้าจาก ง9 PDF หรือ Excel แล้วโครงการมีปัญหา
 *   → admin มาที่นี่เพื่อแก้ไขฟิลด์ หรือลบทิ้งแล้วนำเข้าใหม่
 */

interface ProjectRow {
  id: string;
  erp_code: string | null;
  project_name: string;
  responsible: string | null;
  responsible_title: string | null;
  organization: string | null;
  main_program: string | null;
  budget_total: number | string | null;
  budget_used: number | string | null;
  budget_remaining: number | string | null;
  fiscal_year: number | null;
  status: string | null;
  phone: string | null;
  project_period: string | null;
  site: string | null;
}

const PROGRAMS = [
  "1.ผลักดันเทคโนโลยี",
  "2.ขับเคลื่อนกลไก",
  "3.พัฒนากำลังคน",
  "ใต้ร่มพระบารมี",
];

export default function AdminProjectsPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");

  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterProgram, setFilterProgram] = useState<string>("all");
  const [filterYear, setFilterYear] = useState<string>("all");

  // Edit modal
  const [editing, setEditing] = useState<ProjectRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

  // Delete confirm
  const [deleting, setDeleting] = useState<ProjectRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [lastResult, setLastResult] = useState("");

  useEffect(() => {
    const s = sessionStorage.getItem("admin_auth");
    if (s === "true") {
      setAuthed(true);
      void loadProjects();
    }
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      sessionStorage.setItem("admin_auth", "true");
      setAuthed(true);
      void loadProjects();
    } else alert("รหัสผ่านไม่ถูกต้อง");
  }

  async function loadProjects() {
    setLoading(true);
    try {
      const res = await fetch("/api/supabase/projects");
      const data = await res.json();
      setRows(data.projects || []);
    } finally {
      setLoading(false);
    }
  }

  // ===== Filters =====
  const years = useMemo(() => {
    const set = new Set<number>();
    for (const r of rows) if (r.fiscal_year) set.add(r.fiscal_year);
    return Array.from(set).sort((a, b) => b - a);
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filterProgram !== "all" && r.main_program !== filterProgram) return false;
      if (filterYear !== "all" && String(r.fiscal_year) !== filterYear) return false;
      if (!q) return true;
      return (
        r.project_name.toLowerCase().includes(q) ||
        (r.responsible || "").toLowerCase().includes(q) ||
        (r.erp_code || "").toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q)
      );
    });
  }, [rows, search, filterProgram, filterYear]);

  // ===== Edit =====
  async function handleSaveEdit() {
    if (!editing) return;
    setSaving(true);
    setEditError("");
    try {
      const payload = {
        project_name: editing.project_name,
        responsible: editing.responsible,
        responsible_title: editing.responsible_title,
        organization: editing.organization,
        main_program: editing.main_program,
        budget_total: Number(editing.budget_total) || 0,
        budget_used: Number(editing.budget_used) || 0,
        budget_remaining: Number(editing.budget_remaining) || 0,
        fiscal_year: editing.fiscal_year,
        status: editing.status,
        phone: editing.phone,
        project_period: editing.project_period,
        site: editing.site,
      };
      const res = await fetch(`/api/supabase/projects/${encodeURIComponent(editing.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "บันทึกไม่สำเร็จ");
      setLastResult(`✓ บันทึก "${editing.project_name}" สำเร็จ`);
      setEditing(null);
      await loadProjects();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  }

  // ===== Delete =====
  async function handleConfirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      const res = await fetch(`/api/supabase/projects/${encodeURIComponent(deleting.id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "ลบไม่สำเร็จ");
      const d = data.deleted || {};
      setLastResult(
        `🗑 ลบ "${deleting.project_name}" สำเร็จ · cascade activities=${d.activities}, kpis=${d.kpis}, reports=${d.reports}`
      );
      setDeleting(null);
      await loadProjects();
    } catch (err: unknown) {
      alert("ลบไม่สำเร็จ: " + (err instanceof Error ? err.message : "เกิดข้อผิดพลาด"));
    } finally {
      setDeleteBusy(false);
    }
  }

  // ===== Auth screen =====
  if (!authed) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <form onSubmit={handleLogin} className="w-full max-w-sm rounded-lg bg-white p-8 shadow">
          <h1 className="mb-4 text-lg font-bold text-royal-700">Admin - จัดการโครงการ</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="รหัสผ่าน Admin"
            className="mb-3 w-full rounded border px-3 py-2"
          />
          <button className="w-full rounded bg-royal-700 py-2 text-white hover:bg-royal-800">
            เข้าสู่ระบบ
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-royal-700">จัดการโครงการ</h1>
          <p className="text-sm text-gray-600">
            {filtered.length} / {rows.length} โครงการ · แก้ไข/ลบทีละโครงการเพื่อนำเข้าใหม่
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="/admin"
            className="rounded border px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
          >
            ← กลับ /admin
          </a>
          <a
            href="/admin/upload-ngor9"
            className="rounded border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-700 hover:bg-emerald-100"
          >
            + นำเข้า ง9 (PDF)
          </a>
          <button
            onClick={loadProjects}
            disabled={loading}
            className="rounded border bg-white px-3 py-1.5 text-xs hover:bg-gray-50 disabled:opacity-50"
          >
            {loading ? "⏳" : "🔄"} Refresh
          </button>
        </div>
      </div>

      {/* Last result */}
      {lastResult && (
        <div className="flex items-start justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <p>{lastResult}</p>
          <button onClick={() => setLastResult("")} className="text-emerald-600 hover:text-emerald-900">
            ✕
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg bg-white p-3 shadow-sm">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 ค้นหา (ชื่อ · ผู้รับผิดชอบ · ERP code · ID)"
          className="min-w-[200px] flex-1 rounded border px-3 py-1.5 text-sm"
        />
        <select
          value={filterProgram}
          onChange={(e) => setFilterProgram(e.target.value)}
          className="rounded border px-2 py-1.5 text-sm"
        >
          <option value="all">โครงการหลัก: ทั้งหมด</option>
          {PROGRAMS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          value={filterYear}
          onChange={(e) => setFilterYear(e.target.value)}
          className="rounded border px-2 py-1.5 text-sm"
        >
          <option value="all">ปี: ทั้งหมด</option>
          {years.map((y) => (
            <option key={y} value={String(y)}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg bg-white shadow">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-2 py-2 text-left">ปี</th>
              <th className="px-2 py-2 text-left">ERP</th>
              <th className="px-2 py-2 text-left">ชื่อโครงการ</th>
              <th className="px-2 py-2 text-left">ผู้รับผิดชอบ</th>
              <th className="px-2 py-2 text-right">งบรวม</th>
              <th className="px-2 py-2 text-right">เบิก</th>
              <th className="px-2 py-2 text-right">คงเหลือ</th>
              <th className="px-2 py-2 text-center">การจัดการ</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-gray-400">
                  ⏳ กำลังโหลด...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-gray-400">
                  ไม่พบโครงการ
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="border-t hover:bg-gray-50">
                  <td className="px-2 py-2 text-gray-500">{r.fiscal_year || "-"}</td>
                  <td className="px-2 py-2 font-mono text-[10px] text-gray-500">
                    {r.erp_code ? r.erp_code.slice(-6) : "-"}
                  </td>
                  <td className="px-2 py-2">
                    <a
                      href={`/projects/${r.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-royal-700 hover:underline"
                    >
                      {r.project_name}
                    </a>
                    <p className="text-[10px] text-gray-400">{r.main_program || "-"}</p>
                  </td>
                  <td className="px-2 py-2">{r.responsible || <span className="text-gray-300">—</span>}</td>
                  <td className="px-2 py-2 text-right font-mono">
                    {Number(r.budget_total || 0).toLocaleString("th-TH")}
                  </td>
                  <td className="px-2 py-2 text-right font-mono text-blue-700">
                    {Number(r.budget_used || 0).toLocaleString("th-TH")}
                  </td>
                  <td className="px-2 py-2 text-right font-mono text-emerald-700">
                    {Number(r.budget_remaining || 0).toLocaleString("th-TH")}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-center">
                    <button
                      onClick={() => setEditing(r)}
                      className="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] text-blue-700 hover:bg-blue-100"
                    >
                      ✏️ แก้ไข
                    </button>{" "}
                    <button
                      onClick={() => setDeleting(r)}
                      className="rounded border border-red-200 bg-red-50 px-2 py-1 text-[11px] text-red-700 hover:bg-red-100"
                    >
                      🗑 ลบ
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ===== Edit Modal ===== */}
      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !saving && setEditing(null)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-white">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">✏️ แก้ไขโครงการ</h3>
                <button
                  onClick={() => !saving && setEditing(null)}
                  className="text-white/80 hover:text-white text-xl"
                >
                  ✕
                </button>
              </div>
              <p className="mt-1 text-[11px] text-white/80 font-mono">{editing.id}</p>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-5 text-sm">
              <div>
                <label className="text-xs text-gray-500">ชื่อโครงการ</label>
                <input
                  type="text"
                  value={editing.project_name || ""}
                  onChange={(e) => setEditing({ ...editing, project_name: e.target.value })}
                  className="w-full rounded border px-3 py-2"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs text-gray-500">ผู้รับผิดชอบ</label>
                  <input
                    type="text"
                    value={editing.responsible || ""}
                    onChange={(e) => setEditing({ ...editing, responsible: e.target.value })}
                    className="w-full rounded border px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">ตำแหน่ง</label>
                  <input
                    type="text"
                    value={editing.responsible_title || ""}
                    onChange={(e) => setEditing({ ...editing, responsible_title: e.target.value })}
                    className="w-full rounded border px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">เบอร์โทร</label>
                  <input
                    type="text"
                    value={editing.phone || ""}
                    onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                    className="w-full rounded border px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">ปีงบประมาณ</label>
                  <input
                    type="number"
                    value={editing.fiscal_year || ""}
                    onChange={(e) =>
                      setEditing({ ...editing, fiscal_year: Number(e.target.value) || null })
                    }
                    className="w-full rounded border px-3 py-2"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-gray-500">หน่วยงาน</label>
                  <input
                    type="text"
                    value={editing.organization || ""}
                    onChange={(e) => setEditing({ ...editing, organization: e.target.value })}
                    className="w-full rounded border px-3 py-2"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-gray-500">โครงการหลัก</label>
                  <select
                    value={editing.main_program || ""}
                    onChange={(e) => setEditing({ ...editing, main_program: e.target.value })}
                    className="w-full rounded border px-3 py-2"
                  >
                    <option value="">(ไม่ระบุ)</option>
                    {PROGRAMS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500">งบประมาณรวม</label>
                  <input
                    type="number"
                    value={editing.budget_total ?? ""}
                    onChange={(e) =>
                      setEditing({ ...editing, budget_total: Number(e.target.value) || 0 })
                    }
                    className="w-full rounded border px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">เบิกจ่าย (ERP)</label>
                  <input
                    type="number"
                    value={editing.budget_used ?? ""}
                    onChange={(e) =>
                      setEditing({ ...editing, budget_used: Number(e.target.value) || 0 })
                    }
                    className="w-full rounded border px-3 py-2 font-mono"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-gray-500">คงเหลือใช้จริง</label>
                  <input
                    type="number"
                    value={editing.budget_remaining ?? ""}
                    onChange={(e) =>
                      setEditing({ ...editing, budget_remaining: Number(e.target.value) || 0 })
                    }
                    className="w-full rounded border px-3 py-2 font-mono"
                  />
                  <p className="mt-1 text-[10px] text-gray-400">
                    💡 ปกติ = งบรวม − เบิกจ่าย (sync-excel จะคำนวณให้อัตโนมัติ)
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">ระยะเวลา</label>
                  <input
                    type="text"
                    value={editing.project_period || ""}
                    onChange={(e) => setEditing({ ...editing, project_period: e.target.value })}
                    className="w-full rounded border px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">สถานะ</label>
                  <select
                    value={editing.status || ""}
                    onChange={(e) => setEditing({ ...editing, status: e.target.value })}
                    className="w-full rounded border px-3 py-2"
                  >
                    <option value="">(ไม่ระบุ)</option>
                    <option value="approved">approved</option>
                    <option value="in_progress">in_progress</option>
                    <option value="completed">completed</option>
                    <option value="cancelled">cancelled</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-gray-500">สถานที่ดำเนินงาน</label>
                  <textarea
                    value={editing.site || ""}
                    onChange={(e) => setEditing({ ...editing, site: e.target.value })}
                    rows={2}
                    className="w-full rounded border px-3 py-2"
                  />
                </div>
              </div>

              {editError && (
                <div className="rounded bg-red-50 p-2 text-xs text-red-700">{editError}</div>
              )}
            </div>

            <div className="flex flex-shrink-0 gap-2 border-t bg-gray-50 px-5 py-3">
              <button
                onClick={() => setEditing(null)}
                disabled={saving}
                className="flex-1 rounded border bg-white py-2 text-sm hover:bg-gray-100 disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="flex-1 rounded bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "⏳ กำลังบันทึก..." : "💾 บันทึก"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Delete Confirm ===== */}
      {deleting && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !deleteBusy && setDeleting(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-red-700">🗑 ยืนยันการลบโครงการ</h3>
            <div className="mt-3 rounded border border-red-200 bg-red-50 p-3 text-sm">
              <p className="font-medium text-red-900">{deleting.project_name}</p>
              <p className="mt-1 text-xs text-red-700">
                ID: <code className="font-mono">{deleting.id}</code>
                {deleting.erp_code && (
                  <>
                    {" · "}ERP: <code className="font-mono">{deleting.erp_code}</code>
                  </>
                )}
              </p>
            </div>
            <p className="mt-3 text-xs text-gray-600">
              ⚠ การลบจะ <strong>cascade</strong> ลบทั้ง:
              <br />
              • activities (กิจกรรมทั้งหมด)
              <br />
              • kpi_targets (ตัวชี้วัด)
              <br />
              • activity_reports (รายงานที่ส่งแล้ว)
              <br />
              • project_tokens (token หัวหน้าโครงการ)
              <br />
              <span className="font-medium text-red-700">การลบไม่สามารถกู้คืนได้</span>
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setDeleting(null)}
                disabled={deleteBusy}
                className="flex-1 rounded border bg-white py-2 text-sm hover:bg-gray-100 disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleteBusy}
                className="flex-1 rounded bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteBusy ? "⏳ กำลังลบ..." : "🗑 ลบเลย"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
