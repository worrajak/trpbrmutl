"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { EXPERTISE_TAGS, getTagsByCategory, CATEGORY_LABEL, type TagCategory, renderTag } from "@/lib/researcher-tags";
import { BRIEF_STATUS_META, BRIEF_MODE_META } from "@/lib/brief-matching";
import { EXCELLENCE_KPIS } from "@/lib/excellence-kpi";
import { PLANS } from "@/lib/foundation";

interface Brief {
  id: string;
  title: string;
  problem_statement: string;
  location: string | null;
  target_audience: string | null;
  target_kpis: string[];
  plan_number: number | null;
  required_skills: string[];
  budget_min: number | string | null;
  budget_max: number | string | null;
  fiscal_year: number;
  mode: "open" | "assigned" | "mentorship";
  status: string;
  deadline: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export default function AdminBriefsPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [list, setList] = useState<Brief[]>([]);
  const [loading, setLoading] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<Partial<Brief>>({
    target_kpis: [],
    required_skills: [],
    fiscal_year: 2569,
    mode: "open",
    status: "open",
  });

  // Search
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const tagsByCategory = useMemo(() => getTagsByCategory(), []);

  useEffect(() => {
    if (
      sessionStorage.getItem("admin_auth") === "true" ||
      sessionStorage.getItem("team_auth") === "true"
    ) {
      setAuthed(true);
      void load();
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
      void load();
    } else alert("รหัสผ่านไม่ถูกต้อง");
  }

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/briefs", { cache: "no-store" });
      const data = await res.json();
      setList(data.briefs || []);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.title) {
      setError("ต้องระบุชื่อโจทย์");
      return;
    }
    if (!form.problem_statement) {
      setError("ต้องระบุ problem statement");
      return;
    }
    setCreating(true);
    try {
      const teamMember = sessionStorage.getItem("team_member");
      const createdBy = teamMember ? JSON.parse(teamMember).name : "super-admin";
      const createdByToken = teamMember ? JSON.parse(teamMember).token : null;

      const res = await fetch("/api/admin/briefs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          created_by: createdBy,
          created_by_token: createdByToken,
          budget_min: form.budget_min ? Number(form.budget_min) : null,
          budget_max: form.budget_max ? Number(form.budget_max) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "สร้างไม่สำเร็จ");
      setForm({ target_kpis: [], required_skills: [], fiscal_year: 2569, mode: "open", status: "open" });
      setShowCreate(false);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(b: Brief) {
    if (!confirm(`ลบ "${b.title}" ถาวร?`)) return;
    const res = await fetch(`/api/admin/briefs/${b.id}`, { method: "DELETE" });
    if (res.ok) setList((prev) => prev.filter((x) => x.id !== b.id));
    else alert("ลบไม่สำเร็จ");
  }

  function toggleSkill(slug: string) {
    const cur = form.required_skills || [];
    setForm({
      ...form,
      required_skills: cur.includes(slug) ? cur.filter((s) => s !== slug) : [...cur, slug],
    });
  }

  function toggleKpi(code: string) {
    const cur = form.target_kpis || [];
    setForm({
      ...form,
      target_kpis: cur.includes(code) ? cur.filter((s) => s !== code) : [...cur, code],
    });
  }

  // Filtered list
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return list.filter((b) => {
      if (filterStatus !== "all" && b.status !== filterStatus) return false;
      if (!q) return true;
      return (
        b.title.toLowerCase().includes(q) ||
        b.problem_statement.toLowerCase().includes(q) ||
        (b.location || "").toLowerCase().includes(q)
      );
    });
  }, [list, search, filterStatus]);

  // Auth screen
  if (!authed) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <form onSubmit={handleLogin} className="w-full max-w-sm rounded-lg bg-white p-8 shadow">
          <h1 className="mb-4 text-lg font-bold text-violet-700">Admin · จัดการโจทย์วิจัย</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="รหัสผ่าน"
            className="mb-3 w-full rounded border px-3 py-2"
          />
          <button className="w-full rounded bg-violet-700 py-2 text-white hover:bg-violet-800">
            เข้าสู่ระบบ
          </button>
          <p className="mt-3 text-[10px] text-slate-400 text-center">
            หรือ login เป็นคณะทำงานที่ /admin
          </p>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-violet-700">📢 จัดการโจทย์วิจัย</h1>
          <p className="text-sm text-slate-600">
            {filtered.length}/{list.length} โจทย์ · open / assigned / mentorship
          </p>
        </div>
        <div className="flex gap-2">
          <a href="/admin" className="rounded border px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50">← /admin</a>
          <Link href="/briefs" className="rounded border bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50">
            👀 ดูหน้าสาธารณะ
          </Link>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="rounded bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700"
          >
            {showCreate ? "✕ ปิด" : "+ เพิ่มโจทย์"}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg bg-white ring-1 ring-slate-200 p-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 ค้นหา (ชื่อโจทย์ · ปัญหา · พื้นที่)"
          className="min-w-[200px] flex-1 rounded border px-3 py-1.5 text-sm"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded border px-2 py-1.5 text-sm"
        >
          <option value="all">Status: ทั้งหมด</option>
          {Object.entries(BRIEF_STATUS_META).map(([k, v]) => (
            <option key={k} value={k}>{v.emoji} {v.label}</option>
          ))}
        </select>
      </div>

      {/* Create form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="rounded-lg bg-violet-50 ring-1 ring-violet-200 p-4 space-y-3">
          <h3 className="text-sm font-bold text-violet-800">เพิ่มโจทย์ใหม่</h3>

          <div>
            <label className="text-xs text-slate-600">ชื่อโจทย์ *</label>
            <input
              type="text"
              value={form.title || ""}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              placeholder="เช่น พัฒนาระบบรดน้ำอัจฉริยะสำหรับสวนกาแฟดอยอ่างขาง"
              className="w-full rounded border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-slate-600">Problem Statement * (ปัญหา/ความต้องการ)</label>
            <textarea
              value={form.problem_statement || ""}
              onChange={(e) => setForm({ ...form, problem_statement: e.target.value })}
              required
              rows={4}
              placeholder="อธิบายปัญหาในพื้นที่ + ความต้องการที่จะแก้ + outcome ที่คาดหวัง"
              className="w-full rounded border px-3 py-2 text-sm"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-600">พื้นที่</label>
              <input
                type="text"
                value={form.location || ""}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="เช่น ดอยอ่างขาง, ห้วยเสี้ยว"
                className="w-full rounded border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600">กลุ่มเป้าหมาย</label>
              <input
                type="text"
                value={form.target_audience || ""}
                onChange={(e) => setForm({ ...form, target_audience: e.target.value })}
                placeholder="เช่น เกษตรกร 100 ครัวเรือน"
                className="w-full rounded border px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-600">Mode</label>
              <select
                value={form.mode || "open"}
                onChange={(e) => setForm({ ...form, mode: e.target.value as "open" | "assigned" | "mentorship" })}
                className="w-full rounded border px-3 py-2 text-sm"
              >
                {Object.entries(BRIEF_MODE_META).map(([k, v]) => (
                  <option key={k} value={k}>{v.emoji} {v.label}</option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {BRIEF_MODE_META[form.mode || "open"]?.desc}
              </p>
            </div>
            <div>
              <label className="text-xs text-slate-600">Plan</label>
              <select
                value={form.plan_number || ""}
                onChange={(e) => setForm({ ...form, plan_number: e.target.value ? Number(e.target.value) : null })}
                className="w-full rounded border px-3 py-2 text-sm"
              >
                <option value="">(ไม่ระบุ)</option>
                {PLANS.map((p) => (
                  <option key={p.number} value={p.number}>
                    แผน {p.number}: {p.shortTitle}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-600">ปีงบประมาณ</label>
              <input
                type="number"
                value={form.fiscal_year || 2569}
                onChange={(e) => setForm({ ...form, fiscal_year: Number(e.target.value) })}
                className="w-full rounded border px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-600">งบประมาณต่ำสุด</label>
              <input
                type="number"
                value={String(form.budget_min ?? "")}
                onChange={(e) => setForm({ ...form, budget_min: e.target.value ? Number(e.target.value) : null })}
                placeholder="100000"
                className="w-full rounded border px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600">งบประมาณสูงสุด</label>
              <input
                type="number"
                value={String(form.budget_max ?? "")}
                onChange={(e) => setForm({ ...form, budget_max: e.target.value ? Number(e.target.value) : null })}
                placeholder="500000"
                className="w-full rounded border px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600">Deadline</label>
              <input
                type="date"
                value={form.deadline || ""}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                className="w-full rounded border px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* Required skills */}
          <div>
            <label className="text-sm font-bold text-slate-800">🏷 เชี่ยวชาญที่ต้องการ ({(form.required_skills || []).length} เลือก)</label>
            {Object.entries(tagsByCategory).map(([cat, tags]) => (
              <div key={cat} className="mt-1.5">
                <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">{CATEGORY_LABEL[cat as TagCategory]}</p>
                <div className="flex flex-wrap gap-1">
                  {tags.map((t) => {
                    const sel = (form.required_skills || []).includes(t.slug);
                    return (
                      <button
                        key={t.slug}
                        type="button"
                        onClick={() => toggleSkill(t.slug)}
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] ring-1 ${
                          sel ? `${t.color} ring-2 ring-offset-1` : "bg-white text-slate-500 ring-slate-200"
                        }`}
                      >
                        <span>{t.emoji}</span>
                        <span>{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Target KPIs */}
          <div>
            <label className="text-sm font-bold text-slate-800">🎯 ตอบ KPI ({(form.target_kpis || []).length} เลือก)</label>
            <p className="text-[10px] text-slate-500">เลือก KPI ที่โจทย์นี้สนับสนุน</p>
            <div className="mt-1.5 max-h-48 overflow-y-auto rounded border border-slate-200 p-2 space-y-1">
              {EXCELLENCE_KPIS.map((kpi) => {
                const sel = (form.target_kpis || []).includes(kpi.code);
                return (
                  <label
                    key={kpi.code}
                    className={`flex items-start gap-2 rounded px-2 py-1 cursor-pointer text-xs ${
                      sel ? "bg-blue-50 ring-1 ring-blue-200" : "hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={sel}
                      onChange={() => toggleKpi(kpi.code)}
                      className="mt-0.5"
                    />
                    <span className="flex-1">
                      <code className="rounded bg-white px-1 text-[10px] mr-1 font-mono ring-1 ring-slate-200">{kpi.code}</code>
                      <span>{kpi.icon} {kpi.name}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="rounded bg-red-50 ring-1 ring-red-200 p-2 text-xs text-red-700">{error}</div>
          )}

          <div className="flex gap-2 pt-3 border-t border-violet-200">
            <button type="button" onClick={() => setShowCreate(false)} className="rounded border bg-white px-4 py-2 text-sm hover:bg-slate-50">
              ยกเลิก
            </button>
            <button type="submit" disabled={creating} className="flex-1 rounded bg-violet-600 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50">
              {creating ? "⏳ กำลังบันทึก..." : "✅ บันทึก"}
            </button>
          </div>
        </form>
      )}

      {/* List */}
      <div className="space-y-2">
        {loading ? (
          <p className="text-center py-8 text-slate-400">⏳ กำลังโหลด...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-slate-400 bg-white rounded-lg ring-1 ring-slate-200">
            ยังไม่มีโจทย์ — กด "+ เพิ่มโจทย์" เพื่อเริ่มต้น
          </div>
        ) : (
          filtered.map((b) => {
            const stat = BRIEF_STATUS_META[b.status];
            const mod = BRIEF_MODE_META[b.mode];
            return (
              <div key={b.id} className="rounded-lg bg-white ring-1 ring-slate-200 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ring-1 ${stat?.color || ""}`}>
                        {stat?.emoji} {stat?.label}
                      </span>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ring-1 ${mod?.color}`}>
                        {mod?.emoji} {mod?.label}
                      </span>
                    </div>
                    <Link href={`/briefs/${b.id}`} className="block mt-1 text-sm font-bold text-slate-900 hover:text-violet-700 leading-snug">
                      {b.title}
                    </Link>
                    <p className="mt-1 text-xs text-slate-600 line-clamp-2">{b.problem_statement}</p>
                    <p className="mt-1 text-[10px] text-slate-500">
                      {b.location && `📍 ${b.location} · `}
                      🏷 {b.required_skills.length} skills · 🎯 {b.target_kpis.length} KPIs
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <Link
                      href={`/briefs/${b.id}`}
                      className="rounded border border-violet-200 bg-violet-50 px-2 py-1 text-[10px] text-violet-700 hover:bg-violet-100 text-center"
                    >
                      ดู / Match
                    </Link>
                    <button
                      onClick={() => handleDelete(b)}
                      className="rounded border border-red-200 bg-red-50 px-2 py-1 text-[10px] text-red-700 hover:bg-red-100"
                    >
                      🗑 ลบ
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
