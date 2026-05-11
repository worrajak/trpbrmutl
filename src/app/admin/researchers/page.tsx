"use client";

import { useState, useEffect, useMemo } from "react";
import {
  EXPERTISE_TAGS,
  getTagsByCategory,
  CATEGORY_LABEL,
  LEVEL_META,
  renderTag,
  type TagCategory,
} from "@/lib/researcher-tags";

interface Researcher {
  id: string;
  name: string;
  title: string | null;
  faculty: string | null;
  department: string | null;
  email: string | null;
  phone: string | null;
  expertise_tags: string[];
  areas: string[];
  past_projects: string[];
  level: "junior" | "mid" | "senior";
  bio: string | null;
  external_link: string | null;
  current_load: number;
  is_active: boolean;
  created_at: string;
}

export default function AdminResearchersPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [list, setList] = useState<Researcher[]>([]);
  const [loading, setLoading] = useState(false);

  // Search/filter
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<"all" | TagCategory>("all");
  const [filterLevel, setFilterLevel] = useState<"all" | "junior" | "mid" | "senior">("all");

  // Create form state
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Partial<Researcher>>({
    expertise_tags: [],
    areas: [],
    past_projects: [],
    level: "mid",
  });
  const [customTag, setCustomTag] = useState("");
  const [customArea, setCustomArea] = useState("");
  const [error, setError] = useState("");

  // Edit modal
  const [editing, setEditing] = useState<Researcher | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const tagsByCategory = useMemo(() => getTagsByCategory(), []);

  useEffect(() => {
    if (
      sessionStorage.getItem("admin_auth") === "true" ||
      sessionStorage.getItem("team_auth") === "true"
    ) {
      setAuthed(true);
      void loadList();
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
      void loadList();
    } else alert("รหัสผ่านไม่ถูกต้อง");
  }

  async function loadList() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/researchers", { cache: "no-store" });
      const data = await res.json();
      // Normalize array fields — Supabase อาจคืน null สำหรับ array column
      const normalized: Researcher[] = (data.researchers || []).map((r: Researcher) => ({
        ...r,
        expertise_tags: r.expertise_tags || [],
        areas: r.areas || [],
        past_projects: r.past_projects || [],
      }));
      setList(normalized);
    } finally {
      setLoading(false);
    }
  }

  async function handleSeed() {
    if (!confirm("Seed sample 5 นักวิจัย? (จะ error ถ้ามีข้อมูลเดิมแล้ว)")) return;
    const res = await fetch("/api/admin/researchers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seed_samples: true }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert("Seed ไม่สำเร็จ: " + data.error);
      return;
    }
    alert(`✅ Seeded ${data.seeded} นักวิจัย`);
    await loadList();
  }

  async function handleSeedFromProjects(dryRun: boolean) {
    if (!dryRun && !confirm("เพิ่มนักวิจัยจากโครงการที่กำลังดำเนินงาน?\n(ระบบจะข้าม name ที่มีอยู่แล้ว · default level=mid)")) return;
    const res = await fetch("/api/admin/researchers/seed-from-projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dry_run: dryRun }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert("Seed ล้มเหลว: " + data.error);
      return;
    }
    if (dryRun) {
      const previewLines = (data.preview || []).map((p: { name: string; faculty: string | null; current_load: number }) =>
        `• ${p.name} · ${p.faculty || "—"} · ${p.current_load} โครงการ`
      ).join("\n");
      alert(
        `📊 PREVIEW (dry-run)\n\n` +
        `Scanned ${data.total_projects_scanned} active projects\n` +
        `พบ unique persons: ${data.total_unique_persons}\n` +
        `จะเพิ่มใหม่: ${data.will_insert} (ข้ามที่มีอยู่ ${data.skipped_existing})\n\n` +
        `ตัวอย่าง 10 คนแรก:\n${previewLines}\n\n` +
        `กด '✅ Seed จริง' เพื่อ insert จริง`
      );
    } else {
      alert(
        `✅ เพิ่มนักวิจัย ${data.inserted} คน · ข้ามของเดิม ${data.skipped_existing} คน\n` +
        `(จาก ${data.total_projects_scanned} active projects · ${data.total_unique_persons} persons)`
      );
      await loadList();
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.name) {
      setError("กรุณาใส่ชื่อ");
      return;
    }
    if ((form.expertise_tags?.length || 0) === 0) {
      setError("กรุณาเลือก expertise tag อย่างน้อย 1 อัน");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/researchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "สร้างไม่สำเร็จ");
      // reset
      setForm({ expertise_tags: [], areas: [], past_projects: [], level: "mid" });
      setShowCreate(false);
      await loadList();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setCreating(false);
    }
  }

  async function handleSaveEdit() {
    if (!editing) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/admin/researchers/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "บันทึกไม่สำเร็จ");
      setEditing(null);
      await loadList();
    } catch (err: unknown) {
      alert("บันทึกไม่สำเร็จ: " + (err instanceof Error ? err.message : "?"));
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete(r: Researcher) {
    if (!confirm(`ลบ "${r.name}" ถาวร?`)) return;
    const res = await fetch(`/api/admin/researchers/${r.id}`, { method: "DELETE" });
    if (res.ok) setList((prev) => prev.filter((x) => x.id !== r.id));
    else alert("ลบไม่สำเร็จ");
  }

  function toggleTag(slug: string, target: Partial<Researcher>) {
    const current = target.expertise_tags || [];
    const next = current.includes(slug)
      ? current.filter((s) => s !== slug)
      : [...current, slug];
    return { ...target, expertise_tags: next };
  }

  function addCustom(field: "expertise_tags" | "areas" | "past_projects", value: string, target: Partial<Researcher>) {
    const v = value.trim();
    if (!v) return target;
    const current = (target[field] as string[]) || [];
    if (current.includes(v)) return target;
    return { ...target, [field]: [...current, v] };
  }

  function removeFromArray(field: "expertise_tags" | "areas" | "past_projects", value: string, target: Partial<Researcher>) {
    return { ...target, [field]: ((target[field] as string[]) || []).filter((s) => s !== value) };
  }

  // ===== Filtered list =====
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return list.filter((r) => {
      if (filterLevel !== "all" && r.level !== filterLevel) return false;
      if (filterCategory !== "all") {
        const hasCategoryTag = r.expertise_tags.some((slug) => {
          const tag = EXPERTISE_TAGS.find((t) => t.slug === slug);
          return tag?.category === filterCategory;
        });
        if (!hasCategoryTag) return false;
      }
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        (r.faculty || "").toLowerCase().includes(q) ||
        (r.email || "").toLowerCase().includes(q) ||
        r.expertise_tags.some((s) => s.toLowerCase().includes(q)) ||
        r.areas.some((a) => a.toLowerCase().includes(q))
      );
    });
  }, [list, search, filterCategory, filterLevel]);

  // ===== Auth screen =====
  if (!authed) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <form onSubmit={handleLogin} className="w-full max-w-sm rounded-lg bg-white p-8 shadow">
          <h1 className="mb-4 text-lg font-bold text-emerald-700">Admin · จัดการนักวิจัย</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="รหัสผ่าน Admin"
            className="mb-3 w-full rounded border px-3 py-2"
          />
          <button className="w-full rounded bg-emerald-700 py-2 text-white hover:bg-emerald-800">
            เข้าสู่ระบบ
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-emerald-700">🔬 ฐานนักวิจัย/นักบริการวิชาการ</h1>
          <p className="text-sm text-slate-600">
            {filtered.length}/{list.length} คน · ใช้สำหรับ AI matching engine กับโจทย์วิจัย
          </p>
        </div>
        <div className="flex gap-2">
          <a href="/admin" className="rounded border px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50">
            ← กลับ /admin
          </a>
          <button
            onClick={() => handleSeedFromProjects(true)}
            className="rounded border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
            title="ดูตัวอย่างก่อน insert จริง"
          >
            👁 Preview จากโครงการ
          </button>
          <button
            onClick={() => handleSeedFromProjects(false)}
            className="rounded border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
            title="ดึงหัวหน้าโครงการจาก active projects → สร้างเป็น researcher"
          >
            🌱 Seed จากโครงการจริง
          </button>
          {list.length === 0 && (
            <button
              onClick={handleSeed}
              className="rounded border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100"
            >
              🌱 Seed sample (5 คน)
            </button>
          )}
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
          >
            {showCreate ? "✕ ปิดฟอร์ม" : "+ เพิ่มนักวิจัย"}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg bg-white ring-1 ring-slate-200 p-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 ค้นหา (ชื่อ · คณะ · email · tag · พื้นที่)"
          className="min-w-[200px] flex-1 rounded border px-3 py-1.5 text-sm"
        />
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value as "all" | TagCategory)}
          className="rounded border px-2 py-1.5 text-sm"
        >
          <option value="all">หมวด: ทั้งหมด</option>
          {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value as "all" | "junior" | "mid" | "senior")}
          className="rounded border px-2 py-1.5 text-sm"
        >
          <option value="all">Level: ทั้งหมด</option>
          <option value="senior">🌳 Senior</option>
          <option value="mid">🌿 Mid</option>
          <option value="junior">🌱 Junior</option>
        </select>
      </div>

      {/* Create form */}
      {showCreate && (
        <CreateForm
          form={form}
          setForm={setForm}
          customTag={customTag}
          setCustomTag={setCustomTag}
          customArea={customArea}
          setCustomArea={setCustomArea}
          tagsByCategory={tagsByCategory}
          toggleTag={(slug) => setForm(toggleTag(slug, form))}
          addCustom={(field, value) => {
            setForm(addCustom(field, value, form));
            if (field === "expertise_tags") setCustomTag("");
            if (field === "areas") setCustomArea("");
          }}
          removeFromArray={(field, value) => setForm(removeFromArray(field, value, form))}
          onSubmit={handleCreate}
          onCancel={() => setShowCreate(false)}
          creating={creating}
          error={error}
        />
      )}

      {/* List */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <p className="text-sm text-slate-400 col-span-full text-center py-8">⏳ กำลังโหลด...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-slate-400 col-span-full text-center py-8">
            ไม่พบนักวิจัย — กด "Seed sample" เพื่อเริ่มต้น หรือ "+ เพิ่มนักวิจัย"
          </p>
        ) : (
          filtered.map((r) => (
            <ResearcherCard key={r.id} r={r} onEdit={() => setEditing(r)} onDelete={() => handleDelete(r)} />
          ))
        )}
      </div>

      {/* Edit modal */}
      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !savingEdit && setEditing(null)}
        >
          <div
            className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-emerald-700 text-white px-5 py-3 rounded-t-2xl">
              <h3 className="font-bold">✏️ แก้ไข {editing.name}</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <CreateForm
                form={editing}
                setForm={(f) => setEditing({ ...editing, ...(f as Researcher) })}
                customTag={customTag}
                setCustomTag={setCustomTag}
                customArea={customArea}
                setCustomArea={setCustomArea}
                tagsByCategory={tagsByCategory}
                toggleTag={(slug) => setEditing({ ...editing, ...toggleTag(slug, editing) } as Researcher)}
                addCustom={(field, value) => {
                  const updated = addCustom(field, value, editing);
                  setEditing({ ...editing, ...(updated as Researcher) });
                  if (field === "expertise_tags") setCustomTag("");
                  if (field === "areas") setCustomArea("");
                }}
                removeFromArray={(field, value) => {
                  const updated = removeFromArray(field, value, editing);
                  setEditing({ ...editing, ...(updated as Researcher) });
                }}
                hideButtons
              />
            </div>
            <div className="border-t bg-slate-50 px-5 py-3 flex gap-2 rounded-b-2xl">
              <button
                onClick={() => setEditing(null)}
                disabled={savingEdit}
                className="flex-1 rounded border bg-white py-2 text-sm hover:bg-slate-100"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="flex-1 rounded bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {savingEdit ? "⏳ กำลังบันทึก..." : "💾 บันทึก"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ====================== Sub Components ======================

function ResearcherCard({ r, onEdit, onDelete }: { r: Researcher; onEdit: () => void; onDelete: () => void }) {
  const lvl = LEVEL_META[r.level] || LEVEL_META.mid;
  return (
    <div className={`rounded-xl bg-white ring-1 ring-slate-200 p-4 ${!r.is_active ? "opacity-50" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${lvl.color}`}>
              {lvl.emoji} {lvl.label}
            </span>
            {r.current_load > 0 && (
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] text-blue-700 ring-1 ring-blue-200">
                💼 {r.current_load} โครงการ
              </span>
            )}
          </div>
          <h3 className="mt-1.5 text-sm font-bold text-slate-900 leading-snug">
            {r.title && <span className="text-slate-500">{r.title} </span>}
            {r.name}
          </h3>
          {r.faculty && <p className="text-xs text-slate-500">{r.faculty}</p>}
          {r.email && <p className="text-[10px] text-slate-400 mt-0.5 truncate">📧 {r.email}</p>}
        </div>
      </div>

      {/* Bio */}
      {r.bio && <p className="mt-2 text-xs text-slate-600 leading-snug line-clamp-2">{r.bio}</p>}

      {/* Tags */}
      <div className="mt-3 flex flex-wrap gap-1">
        {r.expertise_tags.slice(0, 5).map((slug) => {
          const t = renderTag(slug);
          return (
            <span key={slug} className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] ring-1 ${t.color}`}>
              <span>{t.emoji}</span>
              <span>{t.label}</span>
            </span>
          );
        })}
        {r.expertise_tags.length > 5 && (
          <span className="text-[10px] text-slate-400">+{r.expertise_tags.length - 5}</span>
        )}
      </div>

      {/* Areas */}
      {r.areas.length > 0 && (
        <p className="mt-2 text-[10px] text-slate-500">
          📍 {r.areas.join(" · ")}
        </p>
      )}

      {/* Actions */}
      <div className="mt-3 flex gap-1.5 pt-2 border-t border-slate-100">
        <button onClick={onEdit} className="flex-1 rounded border border-blue-200 bg-blue-50 px-2 py-1 text-xs text-blue-700 hover:bg-blue-100">
          ✏️ แก้ไข
        </button>
        <button onClick={onDelete} className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100">
          🗑
        </button>
      </div>
    </div>
  );
}

interface CreateFormProps {
  form: Partial<Researcher>;
  setForm: (f: Partial<Researcher>) => void;
  customTag: string;
  setCustomTag: (s: string) => void;
  customArea: string;
  setCustomArea: (s: string) => void;
  tagsByCategory: ReturnType<typeof getTagsByCategory>;
  toggleTag: (slug: string) => void;
  addCustom: (field: "expertise_tags" | "areas" | "past_projects", value: string) => void;
  removeFromArray: (field: "expertise_tags" | "areas" | "past_projects", value: string) => void;
  onSubmit?: (e: React.FormEvent) => void;
  onCancel?: () => void;
  creating?: boolean;
  error?: string;
  hideButtons?: boolean;
}

function CreateForm({
  form, setForm, customTag, setCustomTag, customArea, setCustomArea,
  tagsByCategory, toggleTag, addCustom, removeFromArray,
  onSubmit, onCancel, creating, error, hideButtons,
}: CreateFormProps) {
  const formContent = (
    <>
      {/* Basic info */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-600">ชื่อ-นามสกุล *</label>
          <input
            type="text"
            value={form.name || ""}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-slate-600">คำนำหน้า / ตำแหน่ง</label>
          <input
            type="text"
            value={form.title || ""}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="ผศ.ดร. / นาย / อาจารย์"
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-slate-600">คณะ</label>
          <input
            type="text"
            value={form.faculty || ""}
            onChange={(e) => setForm({ ...form, faculty: e.target.value })}
            placeholder="คณะวิศวกรรมศาสตร์"
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-slate-600">สาขาวิชา</label>
          <input
            type="text"
            value={form.department || ""}
            onChange={(e) => setForm({ ...form, department: e.target.value })}
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-slate-600">Email</label>
          <input
            type="email"
            value={form.email || ""}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-slate-600">เบอร์โทร</label>
          <input
            type="text"
            value={form.phone || ""}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-slate-600">Level</label>
          <select
            value={form.level || "mid"}
            onChange={(e) => setForm({ ...form, level: e.target.value as "junior" | "mid" | "senior" })}
            className="w-full rounded border px-3 py-2 text-sm"
          >
            <option value="junior">🌱 Junior</option>
            <option value="mid">🌿 Mid</option>
            <option value="senior">🌳 Senior</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-600">External Link</label>
          <input
            type="url"
            value={form.external_link || ""}
            onChange={(e) => setForm({ ...form, external_link: e.target.value })}
            placeholder="https://orcid.org/..."
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* Bio */}
      <div className="mt-3">
        <label className="text-xs text-slate-600">Bio (1-2 บรรทัด)</label>
        <textarea
          value={form.bio || ""}
          onChange={(e) => setForm({ ...form, bio: e.target.value })}
          rows={2}
          placeholder="ความเชี่ยวชาญหลัก + ผลงานเด่น"
          className="w-full rounded border px-3 py-2 text-sm"
        />
      </div>

      {/* Expertise Tags - preset 20 by category + custom */}
      <div className="mt-4">
        <label className="text-sm font-bold text-slate-800">🏷 Expertise Tags *</label>
        <p className="text-[10px] text-slate-500">คลิกเพื่อเลือก/ยกเลิก · เพิ่ม custom tag ด้านล่างได้</p>

        {Object.entries(tagsByCategory).map(([catKey, tags]) => (
          <div key={catKey} className="mt-2">
            <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">
              {CATEGORY_LABEL[catKey as TagCategory]}
            </p>
            <div className="flex flex-wrap gap-1">
              {tags.map((t) => {
                const selected = form.expertise_tags?.includes(t.slug);
                return (
                  <button
                    key={t.slug}
                    type="button"
                    onClick={() => toggleTag(t.slug)}
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] ring-1 transition ${
                      selected ? `${t.color} ring-2 ring-offset-1` : "bg-white text-slate-500 ring-slate-200 hover:bg-slate-50"
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

        {/* Custom tag */}
        <div className="mt-3 flex gap-1">
          <input
            type="text"
            value={customTag}
            onChange={(e) => setCustomTag(e.target.value)}
            placeholder="custom tag (เช่น CRISPR, Quantum)"
            className="flex-1 rounded border px-2 py-1 text-xs"
          />
          <button
            type="button"
            onClick={() => customTag && addCustom("expertise_tags", customTag)}
            className="rounded bg-slate-700 px-3 py-1 text-xs text-white hover:bg-slate-800"
          >
            + เพิ่ม
          </button>
        </div>

        {/* Selected tags display */}
        {(form.expertise_tags?.length || 0) > 0 && (
          <div className="mt-2 flex flex-wrap gap-1 rounded bg-slate-50 p-2">
            <span className="text-[10px] text-slate-500 self-center">เลือก:</span>
            {form.expertise_tags?.map((slug) => {
              const t = renderTag(slug);
              return (
                <span key={slug} className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] ring-1 ${t.color}`}>
                  <span>{t.emoji}</span>
                  <span>{t.label}</span>
                  <button
                    type="button"
                    onClick={() => removeFromArray("expertise_tags", slug)}
                    className="ml-0.5 hover:text-red-600"
                  >
                    ✕
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Areas */}
      <div className="mt-4">
        <label className="text-sm font-bold text-slate-800">📍 พื้นที่ทำงาน</label>
        <div className="mt-1 flex gap-1">
          <input
            type="text"
            value={customArea}
            onChange={(e) => setCustomArea(e.target.value)}
            placeholder="เช่น เชียงใหม่, หมู่บ้านสันป่าตอง"
            className="flex-1 rounded border px-2 py-1 text-xs"
          />
          <button
            type="button"
            onClick={() => customArea && addCustom("areas", customArea)}
            className="rounded bg-slate-700 px-3 py-1 text-xs text-white hover:bg-slate-800"
          >
            + เพิ่ม
          </button>
        </div>
        {(form.areas?.length || 0) > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {form.areas?.map((a) => (
              <span key={a} className="inline-flex items-center gap-0.5 rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                📍 {a}
                <button type="button" onClick={() => removeFromArray("areas", a)} className="ml-0.5 hover:text-red-600">
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="mt-3 rounded bg-red-50 ring-1 ring-red-200 p-2 text-xs text-red-700">{error}</div>
      )}
    </>
  );

  if (hideButtons) {
    return <div className="space-y-3">{formContent}</div>;
  }

  return (
    <form onSubmit={onSubmit} className="rounded-lg bg-emerald-50 ring-1 ring-emerald-200 p-4">
      <h3 className="text-sm font-bold text-emerald-800 mb-3">เพิ่มนักวิจัย</h3>
      {formContent}
      <div className="flex gap-2 pt-3 mt-3 border-t border-emerald-200">
        <button type="button" onClick={onCancel} className="rounded border bg-white px-4 py-2 text-sm hover:bg-slate-50">
          ยกเลิก
        </button>
        <button type="submit" disabled={creating} className="flex-1 rounded bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
          {creating ? "⏳ กำลังบันทึก..." : "✅ บันทึก"}
        </button>
      </div>
    </form>
  );
}
