"use client";

import { useState, useEffect, useMemo } from "react";
import {
  EXPERTISE_TAGS,
  CATEGORY_LABEL as SKILL_CATEGORY_LABEL,
  type TagCategory,
  renderTag,
} from "@/lib/researcher-tags";
import {
  AREA_CATEGORY_META,
  DEMAND_META,
  type AreaCategory,
  type DemandLevel,
} from "@/lib/research-areas-seed";
import { EXCELLENCE_KPIS } from "@/lib/excellence-kpi";
import { PLANS } from "@/lib/foundation";

interface Area {
  id: string;
  name: string;
  icon: string | null;
  category: AreaCategory;
  description: string | null;
  related_skills: string[];
  related_kpis: string[];
  related_plans: number[];
  demand_level: DemandLevel;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export default function AdminResearchAreasPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [list, setList] = useState<Area[]>([]);
  const [loading, setLoading] = useState(false);

  const [filterCategory, setFilterCategory] = useState<"all" | AreaCategory>("all");
  const [filterDemand, setFilterDemand] = useState<"all" | DemandLevel>("all");
  const [search, setSearch] = useState("");

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<Partial<Area>>({
    icon: "🔬",
    category: "research",
    demand_level: "medium",
    related_skills: [],
    related_kpis: [],
    related_plans: [],
  });

  const skillsByCategory = useMemo(() => {
    const groups: Record<TagCategory, typeof EXPERTISE_TAGS> = {
      tech: [], innovation: [], teaching: [], community: [],
    };
    for (const t of EXPERTISE_TAGS) groups[t.category].push(t);
    return groups;
  }, []);

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
      const res = await fetch("/api/admin/research-areas", { cache: "no-store" });
      const data = await res.json();
      // Normalize array fields
      const normalized: Area[] = (data.areas || []).map((a: Area) => ({
        ...a,
        related_skills: a.related_skills || [],
        related_kpis: a.related_kpis || [],
        related_plans: a.related_plans || [],
      }));
      setList(normalized);
    } finally {
      setLoading(false);
    }
  }

  async function handleSeed() {
    if (!confirm("Seed sample 14 รายการ? (จะ error ถ้ามีข้อมูลอยู่แล้ว)")) return;
    const res = await fetch("/api/admin/research-areas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seed_samples: true }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert("Seed ไม่สำเร็จ: " + data.error);
      return;
    }
    alert(`✅ Seeded ${data.seeded} รายการ`);
    await load();
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.name) {
      setError("ต้องระบุชื่อ");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/research-areas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "สร้างไม่สำเร็จ");
      setForm({ icon: "🔬", category: "research", demand_level: "medium", related_skills: [], related_kpis: [], related_plans: [] });
      setShowCreate(false);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(a: Area) {
    if (!confirm(`ลบ "${a.name}" ถาวร?`)) return;
    const res = await fetch(`/api/admin/research-areas/${a.id}`, { method: "DELETE" });
    if (res.ok) setList((prev) => prev.filter((x) => x.id !== a.id));
    else alert("ลบไม่สำเร็จ");
  }

  function toggleSkill(slug: string) {
    const cur = form.related_skills || [];
    setForm({
      ...form,
      related_skills: cur.includes(slug) ? cur.filter((s) => s !== slug) : [...cur, slug],
    });
  }

  function toggleKpi(code: string) {
    const cur = form.related_kpis || [];
    setForm({
      ...form,
      related_kpis: cur.includes(code) ? cur.filter((s) => s !== code) : [...cur, code],
    });
  }

  function togglePlan(num: number) {
    const cur = form.related_plans || [];
    setForm({
      ...form,
      related_plans: cur.includes(num) ? cur.filter((s) => s !== num) : [...cur, num],
    });
  }

  // Filter
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return list.filter((a) => {
      if (filterCategory !== "all" && a.category !== filterCategory) return false;
      if (filterDemand !== "all" && a.demand_level !== filterDemand) return false;
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) ||
        (a.description || "").toLowerCase().includes(q)
      );
    });
  }, [list, search, filterCategory, filterDemand]);

  if (!authed) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <form onSubmit={handleLogin} className="w-full max-w-sm rounded-lg bg-white p-8 shadow">
          <h1 className="mb-4 text-lg font-bold text-cyan-700">Admin · จัดการสาขางานวิจัยที่ต้องการ</h1>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="รหัสผ่าน Admin" className="mb-3 w-full rounded border px-3 py-2" />
          <button className="w-full rounded bg-cyan-700 py-2 text-white hover:bg-cyan-800">เข้าสู่ระบบ</button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-cyan-700">📚 สาขางานวิจัย/บริการวิชาการที่ต้องการ</h1>
          <p className="text-sm text-slate-600">
            {filtered.length}/{list.length} รายการ · catalog ที่กลุ่มแผนงานต้องการ — researcher อ้างอิงเลือก
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <a href="/admin" className="rounded border px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50">← /admin</a>
          <a href="/research-areas" className="rounded border bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50">👀 ดูหน้าสาธารณะ</a>
          {list.length === 0 && (
            <button onClick={handleSeed} className="rounded border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100">
              🌱 Seed 14 sample
            </button>
          )}
          <button onClick={() => setShowCreate(!showCreate)} className="rounded bg-cyan-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-cyan-700">
            {showCreate ? "✕ ปิด" : "+ เพิ่มสาขา"}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg bg-white ring-1 ring-slate-200 p-3">
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 ค้นหา (ชื่อ · รายละเอียด)"
          className="min-w-[200px] flex-1 rounded border px-3 py-1.5 text-sm" />
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value as "all" | AreaCategory)}
          className="rounded border px-2 py-1.5 text-sm">
          <option value="all">หมวด: ทั้งหมด</option>
          {(Object.keys(AREA_CATEGORY_META) as AreaCategory[]).map((k) => (
            <option key={k} value={k}>{AREA_CATEGORY_META[k].emoji} {AREA_CATEGORY_META[k].label}</option>
          ))}
        </select>
        <select value={filterDemand} onChange={(e) => setFilterDemand(e.target.value as "all" | DemandLevel)}
          className="rounded border px-2 py-1.5 text-sm">
          <option value="all">ความต้องการ: ทั้งหมด</option>
          {(Object.keys(DEMAND_META) as DemandLevel[]).map((k) => (
            <option key={k} value={k}>{DEMAND_META[k].emoji} {DEMAND_META[k].label}</option>
          ))}
        </select>
      </div>

      {/* Create form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="rounded-lg bg-cyan-50 ring-1 ring-cyan-200 p-4 space-y-3">
          <h3 className="text-sm font-bold text-cyan-800">เพิ่มสาขางานวิจัยใหม่</h3>
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs text-slate-600">ชื่อสาขา *</label>
              <input type="text" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="เช่น เกษตรแม่นยำสำหรับพืชผลที่สูง" required
                className="w-full rounded border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-600">Icon (emoji)</label>
              <input type="text" value={form.icon || ""} onChange={(e) => setForm({ ...form, icon: e.target.value })}
                placeholder="🌾" maxLength={4}
                className="w-full rounded border px-3 py-2 text-center text-xl" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-600">หมวด</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as AreaCategory })}
                className="w-full rounded border px-3 py-2 text-sm">
                {(Object.keys(AREA_CATEGORY_META) as AreaCategory[]).map((k) => (
                  <option key={k} value={k}>{AREA_CATEGORY_META[k].emoji} {AREA_CATEGORY_META[k].label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-600">ระดับความต้องการ</label>
              <select value={form.demand_level} onChange={(e) => setForm({ ...form, demand_level: e.target.value as DemandLevel })}
                className="w-full rounded border px-3 py-2 text-sm">
                {(Object.keys(DEMAND_META) as DemandLevel[]).map((k) => (
                  <option key={k} value={k}>{DEMAND_META[k].emoji} {DEMAND_META[k].label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-600">รายละเอียด (1-2 บรรทัด)</label>
            <textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2} placeholder="อธิบายสาขา + บริบทการใช้งาน + impact"
              className="w-full rounded border px-3 py-2 text-sm" />
          </div>

          {/* Plans */}
          <div>
            <label className="text-sm font-bold text-slate-800">📚 แผนที่เกี่ยวข้อง ({(form.related_plans || []).length} เลือก)</label>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {PLANS.map((p) => {
                const sel = (form.related_plans || []).includes(p.number);
                return (
                  <button key={p.number} type="button" onClick={() => togglePlan(p.number)}
                    className={`rounded-md px-2 py-1 text-xs ring-1 ${
                      sel ? "bg-blue-100 text-blue-800 ring-blue-300 ring-2 ring-offset-1" : "bg-white text-slate-600 ring-slate-200"
                    }`}>
                    แผน {p.number}: {p.shortTitle}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Skills */}
          <div>
            <label className="text-sm font-bold text-slate-800">🏷 Skills ที่เกี่ยวข้อง ({(form.related_skills || []).length} เลือก)</label>
            {Object.entries(skillsByCategory).map(([cat, tags]) => (
              <div key={cat} className="mt-1.5">
                <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">{SKILL_CATEGORY_LABEL[cat as TagCategory]}</p>
                <div className="flex flex-wrap gap-1">
                  {tags.map((t) => {
                    const sel = (form.related_skills || []).includes(t.slug);
                    return (
                      <button key={t.slug} type="button" onClick={() => toggleSkill(t.slug)}
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] ring-1 ${
                          sel ? `${t.color} ring-2 ring-offset-1` : "bg-white text-slate-500 ring-slate-200"
                        }`}>
                        <span>{t.emoji}</span>
                        <span>{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* KPIs */}
          <div>
            <label className="text-sm font-bold text-slate-800">🎯 KPI ที่ตอบ ({(form.related_kpis || []).length} เลือก)</label>
            <div className="mt-1.5 max-h-40 overflow-y-auto rounded border border-slate-200 p-2 space-y-1">
              {EXCELLENCE_KPIS.map((kpi) => {
                const sel = (form.related_kpis || []).includes(kpi.code);
                return (
                  <label key={kpi.code} className={`flex items-start gap-2 rounded px-2 py-1 cursor-pointer text-xs ${
                    sel ? "bg-blue-50 ring-1 ring-blue-200" : "hover:bg-slate-50"
                  }`}>
                    <input type="checkbox" checked={sel} onChange={() => toggleKpi(kpi.code)} className="mt-0.5" />
                    <span className="flex-1">
                      <code className="rounded bg-white px-1 text-[10px] mr-1 font-mono ring-1 ring-slate-200">{kpi.code}</code>
                      {kpi.icon} {kpi.name}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-600">หมายเหตุ</label>
            <textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2} className="w-full rounded border px-3 py-2 text-sm" />
          </div>

          {error && <div className="rounded bg-red-50 ring-1 ring-red-200 p-2 text-xs text-red-700">{error}</div>}

          <div className="flex gap-2 pt-3 border-t border-cyan-200">
            <button type="button" onClick={() => setShowCreate(false)} className="rounded border bg-white px-4 py-2 text-sm hover:bg-slate-50">ยกเลิก</button>
            <button type="submit" disabled={creating} className="flex-1 rounded bg-cyan-600 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50">
              {creating ? "⏳ กำลังบันทึก..." : "✅ บันทึก"}
            </button>
          </div>
        </form>
      )}

      {/* List */}
      <div className="grid gap-3 sm:grid-cols-2">
        {loading ? (
          <p className="col-span-full text-center py-8 text-slate-400">⏳ กำลังโหลด...</p>
        ) : filtered.length === 0 ? (
          <div className="col-span-full text-center py-8 text-slate-400 bg-white rounded-lg ring-1 ring-slate-200">
            ยังไม่มีข้อมูล — กด "🌱 Seed 14 sample" เพื่อเริ่ม หรือ "+ เพิ่มสาขา"
          </div>
        ) : (
          filtered.map((a) => {
            const cat = AREA_CATEGORY_META[a.category];
            const dem = DEMAND_META[a.demand_level];
            return (
              <div key={a.id} className={`rounded-xl bg-white ring-1 ring-slate-200 p-4 ${!a.is_active ? "opacity-50" : ""}`}>
                <div className="flex items-start gap-3">
                  <span className="text-3xl flex-shrink-0">{a.icon || cat.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 flex-wrap mb-1">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${cat.color}`}>
                        {cat.emoji} {cat.label}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${dem.color}`}>
                        {dem.emoji} {dem.label}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 leading-snug">{a.name}</h3>
                    {a.description && <p className="mt-1 text-xs text-slate-600 leading-relaxed line-clamp-2">{a.description}</p>}

                    {/* Skills */}
                    {a.related_skills.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {a.related_skills.slice(0, 4).map((slug) => {
                          const t = renderTag(slug);
                          return (
                            <span key={slug} className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] ring-1 ${t.color}`}>
                              <span>{t.emoji}</span>
                              <span>{t.label}</span>
                            </span>
                          );
                        })}
                        {a.related_skills.length > 4 && <span className="text-[10px] text-slate-400">+{a.related_skills.length - 4}</span>}
                      </div>
                    )}

                    {/* KPIs + Plans */}
                    <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-500">
                      {a.related_plans.length > 0 && <span>📚 แผน {a.related_plans.join(", ")}</span>}
                      {a.related_kpis.length > 0 && <span>🎯 {a.related_kpis.length} KPI</span>}
                    </div>

                    {/* Actions */}
                    <div className="mt-3 pt-2 border-t border-slate-100 flex gap-1">
                      <button className="flex-1 rounded border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] text-blue-700 hover:bg-blue-100" disabled>
                        ✏️ แก้ไข (TODO)
                      </button>
                      <button onClick={() => handleDelete(a)} className="rounded border border-red-200 bg-red-50 px-2 py-1 text-[10px] text-red-700 hover:bg-red-100">
                        🗑
                      </button>
                    </div>
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
