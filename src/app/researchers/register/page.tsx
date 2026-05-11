"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  EXPERTISE_TAGS,
  CATEGORY_LABEL,
  type TagCategory,
  renderTag,
  LEVEL_META,
} from "@/lib/researcher-tags";

/**
 * /researchers/register — public form ให้นักวิจัยลงทะเบียนเอง
 * Flow: submit → is_active=false → admin approve → ใช้งานได้
 */

interface FormState {
  name: string;
  title: string;
  faculty: string;
  department: string;
  email: string;
  phone: string;
  expertise_tags: string[];
  areas: string[];
  bio: string;
  level: "junior" | "mid" | "senior";
  external_link: string;
  honeypot: string; // bot trap (hidden)
}

export default function RegisterResearcherPage() {
  const [form, setForm] = useState<FormState>({
    name: "",
    title: "",
    faculty: "",
    department: "",
    email: "",
    phone: "",
    expertise_tags: [],
    areas: [],
    bio: "",
    level: "mid",
    external_link: "",
    honeypot: "",
  });
  const [customTag, setCustomTag] = useState("");
  const [customArea, setCustomArea] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const tagsByCategory = useMemo(() => {
    const groups: Record<TagCategory, typeof EXPERTISE_TAGS> = {
      tech: [], innovation: [], teaching: [], community: [],
    };
    for (const t of EXPERTISE_TAGS) groups[t.category].push(t);
    return groups;
  }, []);

  function toggleTag(slug: string) {
    setForm((f) => ({
      ...f,
      expertise_tags: f.expertise_tags.includes(slug)
        ? f.expertise_tags.filter((s) => s !== slug)
        : [...f.expertise_tags, slug],
    }));
  }

  function addCustom(field: "expertise_tags" | "areas", value: string) {
    const v = value.trim();
    if (!v) return;
    setForm((f) => {
      const cur = f[field] as string[];
      if (cur.includes(v)) return f;
      return { ...f, [field]: [...cur, v] };
    });
    if (field === "expertise_tags") setCustomTag("");
    if (field === "areas") setCustomArea("");
  }

  function removeFromArray(field: "expertise_tags" | "areas", value: string) {
    setForm((f) => ({ ...f, [field]: (f[field] as string[]).filter((s) => s !== value) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.name || form.name.length < 3) { setError("กรุณาใส่ชื่อ-นามสกุล (อย่างน้อย 3 ตัว)"); return; }
    if (!form.email || !form.email.includes("@")) { setError("กรุณาใส่ email ที่ถูกต้อง"); return; }
    if (form.expertise_tags.length === 0) { setError("เลือก expertise อย่างน้อย 1 อัน"); return; }

    setBusy(true);
    try {
      const res = await fetch("/api/researchers/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "ลงทะเบียนไม่สำเร็จ");
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setBusy(false);
    }
  }

  // ===== Success screen =====
  if (success) {
    return (
      <div className="max-w-lg mx-auto py-12">
        <div className="rounded-2xl bg-emerald-50 ring-1 ring-emerald-300 p-8 text-center">
          <div className="text-6xl mb-3">✅</div>
          <h1 className="text-2xl font-bold text-emerald-700">ลงทะเบียนสำเร็จ</h1>
          <p className="mt-3 text-sm text-emerald-800 leading-relaxed">
            ขอบคุณครับ! ระบบได้บันทึกข้อมูลของคุณแล้ว<br />
            <strong>Admin จะ review ภายใน 24 ชั่วโมง</strong><br />
            หลังจาก approve โปรไฟล์จะปรากฎบน catalog สาธารณะ + เริ่มเข้าระบบ matching ได้
          </p>
          <div className="mt-6 flex gap-2 justify-center">
            <Link href="/researchers" className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
              ดู Catalog นักวิจัย
            </Link>
            <Link href="/" className="rounded border bg-white px-4 py-2 text-sm hover:bg-slate-100">
              กลับหน้าหลัก
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {/* Hero */}
      <section className="rounded-2xl bg-emerald-700 p-5 sm:p-6 text-white shadow-lg shadow-emerald-500/20">
        <p className="text-xs font-medium uppercase tracking-wider text-emerald-100">
          🔬 Researcher Self-Registration
        </p>
        <h1 className="mt-1.5 text-2xl sm:text-3xl font-bold drop-shadow text-white">
          ลงทะเบียนเป็นนักวิจัย/นักบริการวิชาการ
        </h1>
        <p className="mt-2 text-sm sm:text-base text-emerald-50">
          ลงทะเบียนเพื่อให้ระบบจับคู่ (match) คุณกับโจทย์วิจัยที่ตรงกับความถนัดและพื้นที่ที่คุณทำงาน ·
          ข้ามสังกัดได้
        </p>
      </section>

      <form onSubmit={handleSubmit} className="rounded-xl bg-white ring-1 ring-slate-200 p-5 space-y-4">
        {/* Honeypot — hidden from human */}
        <input
          type="text"
          name="honeypot"
          value={form.honeypot}
          onChange={(e) => setForm({ ...form, honeypot: e.target.value })}
          tabIndex={-1}
          autoComplete="off"
          style={{ position: "absolute", left: "-9999px", width: 0, height: 0, opacity: 0 }}
          aria-hidden="true"
        />

        {/* Section 1: Basic info */}
        <div>
          <h2 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-1.5 mb-3">
            👤 ข้อมูลส่วนตัว
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-600 font-medium">ชื่อ-นามสกุล <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                placeholder="เช่น นายสมชาย ใจดี"
                className="w-full rounded border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600 font-medium">คำนำหน้า / ตำแหน่ง</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="ผศ.ดร. / นาย / อาจารย์"
                className="w-full rounded border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600 font-medium">Email <span className="text-red-500">*</span></label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                placeholder="name@rmutl.ac.th"
                className="w-full rounded border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600 font-medium">เบอร์โทร (optional)</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="0xx-xxx-xxxx"
                className="w-full rounded border px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Affiliation */}
        <div>
          <h2 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-1.5 mb-3">
            🏛 สังกัด
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-600 font-medium">คณะ/สถาบัน</label>
              <input
                type="text"
                value={form.faculty}
                onChange={(e) => setForm({ ...form, faculty: e.target.value })}
                placeholder="คณะวิศวกรรมศาสตร์"
                className="w-full rounded border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600 font-medium">สาขาวิชา</label>
              <input
                type="text"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                placeholder="วิศวกรรมไฟฟ้า"
                className="w-full rounded border px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="text-xs text-slate-600 font-medium">Level</label>
            <div className="mt-1 flex gap-1.5">
              {(["junior", "mid", "senior"] as const).map((lv) => {
                const m = LEVEL_META[lv];
                const sel = form.level === lv;
                return (
                  <button
                    key={lv}
                    type="button"
                    onClick={() => setForm({ ...form, level: lv })}
                    className={`flex-1 rounded-md px-3 py-2 text-xs font-medium ring-1 transition ${
                      sel ? `${m.color} ring-2 ring-offset-1` : "bg-white text-slate-500 ring-slate-200"
                    }`}
                  >
                    {m.emoji} {m.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Section 3: Expertise tags */}
        <div>
          <h2 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-1.5 mb-3">
            🏷 ความเชี่ยวชาญ <span className="text-red-500">*</span>
            <span className="font-normal text-xs text-slate-500 ml-2">
              (เลือกอย่างน้อย 1 · ใช้สำหรับ match กับโจทย์วิจัย)
            </span>
          </h2>
          {Object.entries(tagsByCategory).map(([cat, tags]) => (
            <div key={cat} className="mb-3">
              <p className="text-[0.65rem] uppercase font-bold text-slate-500 mb-1">
                {CATEGORY_LABEL[cat as TagCategory]}
              </p>
              <div className="flex flex-wrap gap-1">
                {tags.map((t) => {
                  const sel = form.expertise_tags.includes(t.slug);
                  return (
                    <button
                      key={t.slug}
                      type="button"
                      onClick={() => toggleTag(t.slug)}
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[0.72rem] ring-1 ${
                        sel ? `${t.color} ring-2 ring-offset-1` : "bg-white text-slate-500 ring-slate-200 hover:bg-slate-50"
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
          <div className="mt-2 flex gap-1">
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
          {/* Selected display */}
          {form.expertise_tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1 rounded bg-slate-50 p-2">
              <span className="text-[0.65rem] text-slate-500 self-center">เลือก:</span>
              {form.expertise_tags.map((slug) => {
                const t = renderTag(slug);
                return (
                  <span key={slug} className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[0.65rem] ring-1 ${t.color}`}>
                    <span>{t.emoji}</span>
                    <span>{t.label}</span>
                    <button type="button" onClick={() => removeFromArray("expertise_tags", slug)} className="ml-0.5 hover:text-red-600">✕</button>
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Section 4: Areas */}
        <div>
          <h2 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-1.5 mb-3">
            📍 พื้นที่ทำงาน
            <span className="font-normal text-xs text-slate-500 ml-2">
              (จังหวัด/อำเภอ/หมู่บ้าน — ใช้สำหรับ match พื้นที่)
            </span>
          </h2>
          <div className="flex gap-1">
            <input
              type="text"
              value={customArea}
              onChange={(e) => setCustomArea(e.target.value)}
              placeholder="เช่น เชียงใหม่, ดอยอ่างขาง, สันป่าตอง"
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
          {form.areas.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {form.areas.map((a) => (
                <span key={a} className="inline-flex items-center gap-0.5 rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
                  📍 {a}
                  <button type="button" onClick={() => removeFromArray("areas", a)} className="ml-0.5 hover:text-red-600">✕</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Section 5: Bio */}
        <div>
          <h2 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-1.5 mb-3">
            📝 Bio + Link
          </h2>
          <textarea
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            rows={3}
            placeholder="ความเชี่ยวชาญหลัก + ผลงานเด่น (1-2 บรรทัด)"
            className="w-full rounded border px-3 py-2 text-sm"
          />
          <input
            type="url"
            value={form.external_link}
            onChange={(e) => setForm({ ...form, external_link: e.target.value })}
            placeholder="https://orcid.org/..."
            className="mt-2 w-full rounded border px-3 py-2 text-sm"
          />
        </div>

        {/* Submit */}
        {error && (
          <div className="rounded bg-red-50 ring-1 ring-red-200 p-3 text-sm text-red-700">⚠ {error}</div>
        )}
        <div className="rounded-lg bg-amber-50 ring-1 ring-amber-200 p-3 text-xs text-amber-800">
          🔒 ข้อมูลของคุณจะรอ admin approve · email และเบอร์โทรจะแสดงเฉพาะหลัง approve
        </div>
        <div className="flex gap-2">
          <Link href="/researchers" className="rounded border bg-white px-4 py-2 text-sm hover:bg-slate-100">
            ยกเลิก
          </Link>
          <button
            type="submit"
            disabled={busy}
            className="flex-1 rounded bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {busy ? "⏳ กำลังบันทึก..." : "✅ ลงทะเบียน"}
          </button>
        </div>
      </form>
    </div>
  );
}
