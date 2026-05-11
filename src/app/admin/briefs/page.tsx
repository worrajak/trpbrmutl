"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { EXPERTISE_TAGS, getTagsByCategory, CATEGORY_LABEL, type TagCategory, renderTag } from "@/lib/researcher-tags";
import { BRIEF_STATUS_META, BRIEF_MODE_META } from "@/lib/brief-matching";
import { EXCELLENCE_KPIS } from "@/lib/excellence-kpi";
import { PLANS } from "@/lib/foundation";
import type { GeneratedBrief } from "@/lib/ai-brief-generator-prompts";
import AiSettingsBar from "@/components/AiSettingsBar";

const OR_STORAGE = "rpf_openrouter_settings";

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

  // AI Generate Brief modal
  const [showAiGen, setShowAiGen] = useState(false);
  const [aiGenBusy, setAiGenBusy] = useState(false);
  const [aiGenError, setAiGenError] = useState("");
  const [aiGenForm, setAiGenForm] = useState<{
    plan_number: 1 | 2 | 3;
    budget_remaining: number;
    location: string;
    target_audience: string;
    theme: string;
    fiscal_year: number;
  }>({
    plan_number: 1,
    budget_remaining: 200000,
    location: "",
    target_audience: "",
    theme: "",
    fiscal_year: 2569,
  });
  const [aiGenResult, setAiGenResult] = useState<GeneratedBrief | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);

  // OpenRouter (shared กับ /admin)
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("anthropic/claude-sonnet-4.5");

  const tagsByCategory = useMemo(() => getTagsByCategory(), []);

  useEffect(() => {
    if (
      sessionStorage.getItem("admin_auth") === "true" ||
      sessionStorage.getItem("team_auth") === "true"
    ) {
      setAuthed(true);
      void load();
    }
    // โหลด OpenRouter key (shared กับ /admin)
    try {
      const raw = localStorage.getItem(OR_STORAGE);
      if (raw) {
        const cfg = JSON.parse(raw);
        if (cfg.api_key) setApiKey(cfg.api_key);
        if (cfg.model) setModel(cfg.model);
      }
    } catch { /* ignore */ }
  }, []);

  // ===== AI Generate Brief =====
  function openAiGen() {
    // Reload settings จาก localStorage ตอนเปิด modal — กัน user เพิ่งเปลี่ยน model
    try {
      const raw = localStorage.getItem(OR_STORAGE);
      if (raw) {
        const cfg = JSON.parse(raw);
        if (cfg.api_key) setApiKey(cfg.api_key);
        if (cfg.model) setModel(cfg.model);
      }
    } catch { /* ignore */ }
    setShowAiGen(true);
    setAiGenError("");
    setAiGenResult(null);
  }

  async function runAiGenerate() {
    if (!apiKey) {
      setAiGenError("ต้องตั้งค่า OpenRouter API key ที่ /admin ก่อน");
      return;
    }
    setAiGenBusy(true);
    setAiGenError("");
    setAiGenResult(null);
    try {
      const res = await fetch("/api/admin/briefs/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...aiGenForm, api_key: apiKey, model }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI generate ล้มเหลว");
      setAiGenResult(data.generated);
    } catch (err: unknown) {
      setAiGenError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setAiGenBusy(false);
    }
  }

  async function saveAiDraft() {
    if (!aiGenResult) return;
    setSavingDraft(true);
    try {
      const teamMember = sessionStorage.getItem("team_member");
      const createdBy = teamMember ? JSON.parse(teamMember).name : "AI Brief Generator";
      const createdByToken = teamMember ? JSON.parse(teamMember).token : null;

      const row = {
        title: aiGenResult.brief.title,
        problem_statement: aiGenResult.brief.problem_statement,
        location: aiGenResult.brief.location,
        target_audience: aiGenResult.brief.target_audience,
        target_kpis: aiGenResult.kpi_mapping.rmutl_kpi_codes,
        plan_number: aiGenForm.plan_number,
        required_skills: aiGenResult.required_skills,
        budget_min: Math.round(aiGenResult.budget_breakdown.total * 0.8),
        budget_max: aiGenResult.budget_breakdown.total,
        fiscal_year: aiGenResult.brief.fiscal_year,
        mode: "open",
        // AI Generate save เป็น "open" → แสดงบน public /briefs ทันที
        // (admin เปลี่ยนเป็น draft/closed ภายหลังได้)
        status: "open",
        created_by: createdBy,
        created_by_token: createdByToken,
        notes: `🤖 AI Generated · งบรวม ${aiGenResult.budget_breakdown.total.toLocaleString()} บาท · กิจกรรม ${aiGenResult.activities.length} · วัสดุ ${aiGenResult.materials.length} · ผู้ร่วม ${aiGenResult.participants.researchers + aiGenResult.participants.students + aiGenResult.participants.villagers} คน\n\n${aiGenResult.ai_notes.join("\n• ")}`,
      };

      const res = await fetch("/api/admin/briefs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(row),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "บันทึกไม่สำเร็จ");
      setAiGenResult(null);
      setShowAiGen(false);
      await load();
    } catch (err: unknown) {
      setAiGenError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setSavingDraft(false);
    }
  }

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
            onClick={openAiGen}
            className="rounded bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700"
            title={apiKey ? "ให้ AI gen brief จาก KPI ของแผน + งบ" : "ต้องตั้งค่า API key ที่ /admin ก่อน"}
          >
            🤖 AI Generate
          </button>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="rounded bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700"
          >
            {showCreate ? "✕ ปิด" : "+ เพิ่มโจทย์"}
          </button>
        </div>
      </div>

      {/* ===== AI Generate Modal ===== */}
      {showAiGen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => !aiGenBusy && !savingDraft && setShowAiGen(false)}
        >
          <div
            className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-purple-700 text-white px-5 py-3 rounded-t-2xl flex items-center justify-between">
              <div>
                <h3 className="font-bold">🤖 AI Generate Brief</h3>
                <p className="text-xs text-purple-100 mt-0.5">วิเคราะห์ KPIs จาก ง.8 + งบประมาณ → gen โจทย์วิจัย</p>
              </div>
              <button onClick={() => !aiGenBusy && setShowAiGen(false)} className="text-white/80 hover:text-white text-xl">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-sm">
              {!aiGenResult ? (
                <>
                  {/* AI Settings (shared component) */}
                  <div className="rounded-lg bg-slate-50 ring-1 ring-slate-200 p-3">
                    <AiSettingsBar
                      defaultModel={model}
                      compact
                      onChange={(s) => { setApiKey(s.api_key); setModel(s.model); }}
                    />
                  </div>

                  {/* Form */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700">📚 เลือกแผน *</label>
                      <div className="mt-1.5 grid grid-cols-3 gap-2">
                        {PLANS.map((p) => (
                          <button
                            key={p.number}
                            type="button"
                            onClick={() => setAiGenForm({ ...aiGenForm, plan_number: p.number as 1 | 2 | 3 })}
                            className={`rounded-lg p-3 text-left ring-1 transition ${
                              aiGenForm.plan_number === p.number
                                ? "bg-purple-600 text-white ring-purple-500 ring-2 ring-offset-1"
                                : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            <p className="text-xs font-bold">แผน {p.number}: {p.shortTitle}</p>
                            <p className={`text-[10px] mt-0.5 ${aiGenForm.plan_number === p.number ? "text-purple-100" : "text-slate-500"}`}>
                              {p.kpis.length} KPI · งบรวม {(p.budget / 1_000_000).toFixed(1)}M
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-slate-700">💰 งบคงเหลือ (บาท) *</label>
                        <input
                          type="number"
                          value={aiGenForm.budget_remaining}
                          onChange={(e) => setAiGenForm({ ...aiGenForm, budget_remaining: Number(e.target.value) || 0 })}
                          className="w-full rounded border px-3 py-2 text-sm font-mono"
                          min={50000}
                          step={10000}
                        />
                        <p className="text-[10px] text-slate-500 mt-0.5">AI จะออกแบบงบรวม ≤ ตัวเลขนี้</p>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-700">📅 ปีงบประมาณ</label>
                        <input
                          type="number"
                          value={aiGenForm.fiscal_year}
                          onChange={(e) => setAiGenForm({ ...aiGenForm, fiscal_year: Number(e.target.value) })}
                          className="w-full rounded border px-3 py-2 text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700">📍 พื้นที่ (optional)</label>
                      <input
                        type="text"
                        value={aiGenForm.location}
                        onChange={(e) => setAiGenForm({ ...aiGenForm, location: e.target.value })}
                        placeholder="เช่น ห้วยเสี้ยว, ดอยอ่างขาง · ปล่อยว่างให้ AI แนะนำ"
                        className="w-full rounded border px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700">👥 กลุ่มเป้าหมาย (optional)</label>
                      <input
                        type="text"
                        value={aiGenForm.target_audience}
                        onChange={(e) => setAiGenForm({ ...aiGenForm, target_audience: e.target.value })}
                        placeholder="เช่น เกษตรกร 100 ครัวเรือน, นศ. ปริญญาตรี ปี 3"
                        className="w-full rounded border px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700">💡 ธีม (optional)</label>
                      <input
                        type="text"
                        value={aiGenForm.theme}
                        onChange={(e) => setAiGenForm({ ...aiGenForm, theme: e.target.value })}
                        placeholder="เช่น เกษตรอัจฉริยะ, แปรรูปกาแฟ, ภูมิปัญญาท้องถิ่น"
                        className="w-full rounded border px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <div className="rounded-lg bg-purple-50 ring-1 ring-purple-200 p-3 text-xs text-purple-800">
                    💡 AI จะ:
                    <ul className="mt-1 ml-4 list-disc space-y-0.5">
                      <li>วิเคราะห์ KPIs ของแผน {aiGenForm.plan_number} (จาก ง.8) → เลือก output/outcome/impact ที่เหมาะ</li>
                      <li>ออกแบบ <strong>กิจกรรม 3-5 ขั้น</strong> + duration_months</li>
                      <li>ระบุ <strong>วัสดุ + จำนวน + งบ</strong></li>
                      <li>คำนวณ <strong>ผู้ร่วมโครงการ</strong>: อาจารย์, นศ., ชาวบ้าน</li>
                      <li>จัดสรรงบ ค่าตอบแทน/ใช้สอย/วัสดุ ≤ {aiGenForm.budget_remaining.toLocaleString()} บาท</li>
                    </ul>
                  </div>

                  {aiGenError && (
                    <div className="rounded bg-red-50 ring-1 ring-red-200 p-2 text-xs text-red-700">⚠ {aiGenError}</div>
                  )}
                </>
              ) : (
                <>
                  {/* Result preview */}
                  <div className="rounded-lg bg-emerald-50 ring-1 ring-emerald-200 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="rounded-full bg-emerald-600 text-white px-2 py-0.5 text-[10px] font-bold">🤖 AI GENERATED</span>
                      <span className="text-xs text-emerald-700">demand: {aiGenResult.brief.demand_level}</span>
                    </div>
                    <h2 className="text-base font-bold text-slate-900 leading-snug">{aiGenResult.brief.title}</h2>
                    <p className="mt-2 text-xs text-slate-700 leading-relaxed">{aiGenResult.brief.problem_statement}</p>
                    <div className="mt-3 grid sm:grid-cols-2 gap-2 text-xs">
                      <div><strong>📍 พื้นที่:</strong> {aiGenResult.brief.location}</div>
                      <div><strong>👥 เป้า:</strong> {aiGenResult.brief.target_audience}</div>
                    </div>
                  </div>

                  {/* Activities */}
                  <div>
                    <p className="text-xs font-bold text-slate-700 mb-1.5">⚙ กิจกรรม ({aiGenResult.activities.length})</p>
                    <div className="space-y-1.5">
                      {aiGenResult.activities.map((a) => (
                        <div key={a.order} className="rounded bg-slate-50 ring-1 ring-slate-200 p-2 text-xs">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium text-slate-800">{a.order}. {a.name}</p>
                            <p className="font-bold text-slate-900 whitespace-nowrap">{a.budget.toLocaleString()} บาท</p>
                          </div>
                          <p className="text-slate-500 mt-0.5">📅 เดือน {a.duration_months.join(", ")}</p>
                          <p className="text-slate-600 mt-0.5 italic">→ {a.expected_output}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Materials */}
                  <div>
                    <p className="text-xs font-bold text-slate-700 mb-1.5">🧰 วัสดุ ({aiGenResult.materials.length})</p>
                    <div className="space-y-1">
                      {aiGenResult.materials.map((m, i) => (
                        <div key={i} className="rounded bg-amber-50 ring-1 ring-amber-200 p-2 text-xs flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="font-medium text-amber-900">{m.name} <span className="text-amber-700 font-normal">({m.quantity})</span></p>
                            <p className="text-amber-700 italic mt-0.5">{m.purpose}</p>
                          </div>
                          <p className="font-bold text-amber-900 whitespace-nowrap">{m.estimated_cost.toLocaleString()} ฿</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Participants */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded bg-blue-50 ring-1 ring-blue-200 p-3 text-center">
                      <p className="text-2xl font-bold text-blue-700">{aiGenResult.participants.researchers}</p>
                      <p className="text-[10px] text-blue-800 uppercase">อาจารย์/บุคลากร</p>
                    </div>
                    <div className="rounded bg-violet-50 ring-1 ring-violet-200 p-3 text-center">
                      <p className="text-2xl font-bold text-violet-700">{aiGenResult.participants.students}</p>
                      <p className="text-[10px] text-violet-800 uppercase">นักศึกษา</p>
                    </div>
                    <div className="rounded bg-emerald-50 ring-1 ring-emerald-200 p-3 text-center">
                      <p className="text-2xl font-bold text-emerald-700">{aiGenResult.participants.villagers}</p>
                      <p className="text-[10px] text-emerald-800 uppercase">ชาวบ้าน/ผู้เข้าร่วม</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 italic">{aiGenResult.participants.rationale}</p>

                  {/* KPI mapping */}
                  <div className="grid sm:grid-cols-3 gap-2">
                    <div className="rounded bg-blue-50 ring-1 ring-blue-200 p-3">
                      <p className="text-[10px] font-bold text-blue-800 uppercase mb-1">📊 Output</p>
                      <ul className="text-[11px] text-blue-900 space-y-0.5 ml-3 list-disc">
                        {aiGenResult.kpi_mapping.output.map((o, i) => <li key={i}>{o}</li>)}
                      </ul>
                    </div>
                    <div className="rounded bg-violet-50 ring-1 ring-violet-200 p-3">
                      <p className="text-[10px] font-bold text-violet-800 uppercase mb-1">📈 Outcome</p>
                      <ul className="text-[11px] text-violet-900 space-y-0.5 ml-3 list-disc">
                        {aiGenResult.kpi_mapping.outcome.map((o, i) => <li key={i}>{o}</li>)}
                      </ul>
                    </div>
                    <div className="rounded bg-emerald-50 ring-1 ring-emerald-200 p-3">
                      <p className="text-[10px] font-bold text-emerald-800 uppercase mb-1">🌱 Impact</p>
                      <ul className="text-[11px] text-emerald-900 space-y-0.5 ml-3 list-disc">
                        {aiGenResult.kpi_mapping.impact.map((o, i) => <li key={i}>{o}</li>)}
                      </ul>
                    </div>
                  </div>

                  {/* Budget */}
                  <div className="rounded-lg bg-amber-50 ring-1 ring-amber-300 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold text-amber-900">💰 งบประมาณรวม</p>
                      <p className="text-2xl font-bold text-amber-900">{aiGenResult.budget_breakdown.total.toLocaleString()} <span className="text-xs font-normal">บาท</span></p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="text-center"><p className="font-bold text-amber-700">{aiGenResult.budget_breakdown.compensation_pct}%</p><p className="text-amber-800">ค่าตอบแทน</p></div>
                      <div className="text-center"><p className="font-bold text-amber-700">{aiGenResult.budget_breakdown.operating_pct}%</p><p className="text-amber-800">ค่าใช้สอย</p></div>
                      <div className="text-center"><p className="font-bold text-amber-700">{aiGenResult.budget_breakdown.supplies_pct}%</p><p className="text-amber-800">ค่าวัสดุ</p></div>
                    </div>
                    <p className="mt-2 text-[11px] text-amber-800 italic">{aiGenResult.budget_breakdown.rationale}</p>
                  </div>

                  {/* AI Notes */}
                  {aiGenResult.ai_notes.length > 0 && (
                    <div className="rounded bg-purple-50 ring-1 ring-purple-200 p-3 text-xs">
                      <p className="font-bold text-purple-800 mb-1">🤖 AI Notes:</p>
                      <ul className="text-purple-900 space-y-0.5 ml-3 list-disc">
                        {aiGenResult.ai_notes.map((n, i) => <li key={i}>{n}</li>)}
                      </ul>
                    </div>
                  )}

                  {aiGenError && (
                    <div className="rounded bg-red-50 ring-1 ring-red-200 p-2 text-xs text-red-700">⚠ {aiGenError}</div>
                  )}
                </>
              )}
            </div>

            <div className="border-t bg-slate-50 px-5 py-3 flex gap-2 rounded-b-2xl">
              {!aiGenResult ? (
                <>
                  <button onClick={() => setShowAiGen(false)} disabled={aiGenBusy} className="rounded border bg-white px-4 py-2 text-sm hover:bg-slate-100 disabled:opacity-50">
                    ปิด
                  </button>
                  <button
                    onClick={runAiGenerate}
                    disabled={aiGenBusy || !apiKey || aiGenForm.budget_remaining < 50000}
                    className="flex-1 rounded bg-purple-600 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                  >
                    {aiGenBusy ? "⏳ กำลัง gen... (30-60 วินาที)" : "🤖 Generate Brief"}
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setAiGenResult(null)} disabled={savingDraft} className="rounded border bg-white px-4 py-2 text-sm hover:bg-slate-100 disabled:opacity-50">
                    ↺ Generate ใหม่
                  </button>
                  <button onClick={() => setShowAiGen(false)} disabled={savingDraft} className="rounded border bg-white px-4 py-2 text-sm hover:bg-slate-100 disabled:opacity-50">
                    ปิด (ไม่บันทึก)
                  </button>
                  <button onClick={saveAiDraft} disabled={savingDraft} className="flex-1 rounded bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                    {savingDraft ? "⏳ กำลังบันทึก..." : "✅ บันทึกเป็น Draft Brief"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

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
                      {/* Status dropdown — เปลี่ยนได้ทันที */}
                      <select
                        value={b.status}
                        onChange={async (e) => {
                          const newStatus = e.target.value;
                          const res = await fetch(`/api/admin/briefs/${b.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ status: newStatus }),
                          });
                          if (res.ok) {
                            setList((prev) => prev.map((x) => x.id === b.id ? { ...x, status: newStatus } : x));
                          } else {
                            alert("เปลี่ยน status ไม่สำเร็จ");
                          }
                        }}
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ring-1 cursor-pointer ${stat?.color || ""}`}
                        title="คลิกเพื่อเปลี่ยน status (draft = ซ่อนจากหน้า public)"
                      >
                        {Object.entries(BRIEF_STATUS_META).map(([k, v]) => (
                          <option key={k} value={k}>{v.emoji} {v.label}</option>
                        ))}
                      </select>
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
