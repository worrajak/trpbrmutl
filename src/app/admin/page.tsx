"use client";

import { useState, useEffect, useRef } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface TokenData {
  token_code: string;
  project_id: string;
  responsible_name: string;
  last_used_at: string | null;
  projects: { project_name: string; organization: string } | null;
}
interface BalanceData {
  token_code: string;
  total_rpf: number;
  report_count: number;
  streak_count: number;
}
interface AnalyticsData {
  totalViews: number;
  uniqueVisitors: number;
  topPages: { page: string; count: number }[];
  topClicks: { target: string; count: number }[];
  dailyViews: { date: string; count: number }[];
  period: string;
}
interface SyncResult {
  total_parsed: number;
  updated: number;
  created: number;
  errors: string[];
}
interface PreviewRow {
  erp_code: string;
  budget_total: number;
  budget_used: number;
  budget_remaining: number;
}

type OpenSection = "tokens" | "analytics" | "sync" | "ngor9" | "seed" | "repair" | null;

const PAGE_LABELS: Record<string, string> = {
  "/": "หน้าแรก", "/projects": "โครงการย่อย",
  "/indicators": "ตัวชี้วัด", "/map": "แผนที่",
  "/staff": "บุคลากร", "/regulations": "ระเบียบ/ประกาศ",
};

// OpenRouter — quick-pick models (browser modal ดึงสด ๆ จาก /api/ai-models)
const OPENROUTER_QUICK_MODELS = [
  // ฟรี
  { id: "google/gemini-2.0-flash-exp:free", label: "Gemini 2.0 Flash · FREE" },
  { id: "meta-llama/llama-3.3-70b-instruct:free", label: "Llama 3.3 70B · FREE" },
  { id: "deepseek/deepseek-chat-v3-0324:free", label: "DeepSeek V3 · FREE" },
  // เสียเงิน (ถูก/แม่นยำ)
  { id: "anthropic/claude-haiku-4.5", label: "Claude Haiku 4.5" },
  { id: "openai/gpt-4.1-mini", label: "GPT-4.1 mini" },
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [open, setOpen] = useState<OpenSection>(null);

  useEffect(() => {
    if (sessionStorage.getItem("admin_auth") === "true") setAuthed(true);
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) { sessionStorage.setItem("admin_auth", "true"); setAuthed(true); }
    else alert("รหัสผ่านไม่ถูกต้อง");
  }

  function toggle(section: OpenSection) {
    setOpen((prev) => (prev === section ? null : section));
  }

  if (!authed) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <form onSubmit={handleLogin} className="w-full max-w-sm rounded-xl bg-white p-8 shadow-lg">
          <h1 className="mb-1 text-xl font-bold text-royal-700">Admin Panel</h1>
          <p className="mb-5 text-sm text-gray-500">ระบบจัดการโครงการใต้ร่มพระบารมี</p>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="รหัสผ่าน Admin" className="mb-3 w-full rounded-lg border px-3 py-2" autoFocus />
          <button className="w-full rounded-lg bg-royal-700 py-2 text-white hover:bg-royal-800">
            เข้าสู่ระบบ
          </button>
        </form>
      </div>
    );
  }

  const cards = [
    {
      key: "sync" as OpenSection,
      icon: "📊",
      title: "Sync งบประมาณจาก Excel",
      desc: "Upload Excel → AI อ่านอัตโนมัติ → อัปเดต Supabase",
      color: "border-yellow-300 bg-yellow-50",
      activeColor: "border-yellow-400",
    },
    {
      key: "ngor9" as OpenSection,
      icon: "📄",
      title: "นำเข้าเอกสาร ง9",
      desc: "Upload PDF ง9 → AI parse → บันทึกโครงการใหม่",
      color: "border-blue-300 bg-blue-50",
      activeColor: "border-blue-400",
    },
    {
      key: "tokens" as OpenSection,
      icon: "🔑",
      title: "จัดการ Token / RPF Coin",
      desc: "ดู Token, ยอด RPF, streak ของแต่ละโครงการ",
      color: "border-purple-300 bg-purple-50",
      activeColor: "border-purple-400",
    },
    {
      key: "analytics" as OpenSection,
      icon: "📈",
      title: "สถิติการใช้งาน",
      desc: "ผู้เข้าชม, หน้ายอดนิยม, ลิงก์ที่คลิกมาก",
      color: "border-green-300 bg-green-50",
      activeColor: "border-green-400",
    },
    {
      key: "seed" as OpenSection,
      icon: "🌱",
      title: "เตรียมข้อมูลโครงการ",
      desc: "สร้างกิจกรรม 5 ขั้น + ตัวชี้วัด + Token สำหรับโครงการที่ยังว่าง",
      color: "border-teal-300 bg-teal-50",
      activeColor: "border-teal-400",
    },
    {
      key: "repair" as OpenSection,
      icon: "🛠️",
      title: "ซ่อมข้อมูลงบประมาณ",
      desc: "ตรวจสอบและแก้ไข budget_used ที่ corrupt จากโค้ดเวอร์ชันเก่า (dry-run ก่อนแก้จริง)",
      color: "border-rose-300 bg-rose-50",
      activeColor: "border-rose-400",
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-royal-700">Admin Panel</h1>
        <p className="text-sm text-gray-500">มหาวิทยาลัยเทคโนโลยีราชมงคลล้านนา</p>
      </div>

      {cards.map((card) => (
        <div key={card.key}
          className={`rounded-xl border-2 transition-all ${open === card.key ? card.activeColor + " bg-white shadow-md" : card.color}`}>
          {/* Card header */}
          <button onClick={() => toggle(card.key)}
            className="flex w-full items-center gap-3 p-5 text-left">
            <span className="text-2xl">{card.icon}</span>
            <div className="flex-1">
              <p className="font-semibold text-gray-800">{card.title}</p>
              <p className="text-sm text-gray-500">{card.desc}</p>
            </div>
            <span className="text-gray-400 text-lg">{open === card.key ? "▲" : "▼"}</span>
          </button>

          {/* Card body */}
          {open === card.key && (
            <div className="border-t px-5 pb-6 pt-4">
              {card.key === "sync" && <SyncExcelPanel />}
              {card.key === "ngor9" && <Ngor9Panel />}
              {card.key === "tokens" && <TokensPanel />}
              {card.key === "analytics" && <AnalyticsPanel />}
              {card.key === "seed" && <SeedActivitiesPanel />}
              {card.key === "repair" && <RepairBudgetPanel />}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Sync Excel Panel (OpenRouter only) ───────────────────────────────────────
//
// แทน multi-provider (Gemini/Claude/OpenAI/Local) ด้วย OpenRouter ตัวเดียว
// (อ้างอิง pattern จาก CESrc_Profile) — 1 key รองรับทุกโมเดล
// localStorage key: rpf_openrouter_settings = { api_key, model }

const OR_STORAGE = "rpf_openrouter_settings";

interface OrSettings { api_key: string; model: string }

function loadOrSettings(): OrSettings | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(OR_STORAGE) || "null"); } catch { return null; }
}
function saveOrSettings(s: OrSettings) {
  localStorage.setItem(OR_STORAGE, JSON.stringify(s));
}

interface OrModelInfo {
  id: string;
  name: string;
  is_free: boolean;
  price: string;
  context_length: number;
  has_vision: boolean;
  provider: string;
}
interface OrModelList {
  total: number; free_count: number; paid_count: number;
  free: OrModelInfo[]; paid: OrModelInfo[]; all: OrModelInfo[];
}

function SyncExcelPanel() {
  const [mode, setMode] = useState<"ai" | "manual">("ai");
  const [file, setFile] = useState<File | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("google/gemini-2.0-flash-exp:free");
  const [savedTick, setSavedTick] = useState(false);

  // Model browser modal
  const [showOrModels, setShowOrModels] = useState(false);
  const [orModels, setOrModels] = useState<OrModelList | null>(null);
  const [orLoading, setOrLoading] = useState(false);
  const [orFilter, setOrFilter] = useState<"free" | "paid" | "all">("free");
  const [orSearch, setOrSearch] = useState("");

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"idle" | "preview" | "done">("idle");
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState("");
  const [rawAiText, setRawAiText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // โหลด settings จาก localStorage ตอน mount
  useEffect(() => {
    const s = loadOrSettings();
    if (!s) return;
    if (s.api_key) setApiKey(s.api_key);
    if (s.model) setModel(s.model);
  }, []);

  function handleSaveSettings() {
    saveOrSettings({ api_key: apiKey, model });
    setSavedTick(true);
    setTimeout(() => setSavedTick(false), 2000);
  }

  async function fetchOrModels() {
    setOrLoading(true);
    try {
      const res = await fetch("/api/ai-models");
      const data = await res.json();
      if (res.ok) setOrModels(data);
    } finally {
      setOrLoading(false);
    }
  }

  function openOrModelsBrowser() {
    setShowOrModels(true);
    if (!orModels) fetchOrModels();
  }

  async function getBase64(): Promise<string | null> {
    if (!file) return null;
    return new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res((reader.result as string).split(",")[1]);
      reader.onerror = rej;
      reader.readAsDataURL(file);
    });
  }

  async function handleAiPreview() {
    setLoading(true); setError("");
    const base64 = await getBase64();
    if (!base64) { setError("กรุณาเลือกไฟล์"); setLoading(false); return; }
    if (!apiKey) { setError("กรุณาใส่ OpenRouter API Key"); setLoading(false); return; }

    const res = await fetch("/api/supabase/ai-sync-excel", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_base64: base64, api_key: apiKey, model, preview_only: true }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error || "เกิดข้อผิดพลาด"); setRawAiText(data.raw_text || ""); return; }
    setRawAiText("");
    setPreview(data.preview || []); setStep("preview");
  }

  async function handleConfirmSync() {
    setLoading(true); setError("");
    const base64 = await getBase64();
    if (!base64) { setError("กรุณาเลือกไฟล์ใหม่"); setLoading(false); return; }
    const res = await fetch("/api/supabase/ai-sync-excel", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_base64: base64, api_key: apiKey, model }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error || "เกิดข้อผิดพลาด"); return; }
    setResult(data); setStep("done");
  }

  async function handleManualSync() {
    setLoading(true); setError("");
    const base64 = await getBase64();
    if (!base64) { setError("กรุณาเลือกไฟล์"); setLoading(false); return; }
    const res = await fetch("/api/supabase/sync-excel", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_base64: base64 }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error || "เกิดข้อผิดพลาด"); return; }
    setResult(data); setStep("done");
  }

  async function handleCleanupParents() {
    if (!confirm("ลบ project rows ที่ erp_code ลงท้าย 0000 (summary rows) ออกจาก DB?")) return;
    setLoading(true); setError("");
    const res = await fetch("/api/supabase/cleanup-parents", { method: "DELETE" });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error || "เกิดข้อผิดพลาด"); return; }
    alert(`ลบแล้ว ${data.deleted} rows ✓`);
  }

  return (
    <div className="space-y-4">
      {/* Mode tabs */}
      <div className="flex gap-2">
        {[{ key: "ai", label: "✨ AI อ่านอัตโนมัติ" }, { key: "manual", label: "📁 Manual" }].map(({ key, label }) => (
          <button key={key} onClick={() => { setMode(key as "ai" | "manual"); setStep("idle"); setError(""); setResult(null); }}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium ${mode === key ? "bg-yellow-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* File picker */}
      <div>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
          onChange={(e) => { setFile(e.target.files?.[0] ?? null); setStep("idle"); setResult(null); }} />
        <div onClick={() => fileRef.current?.click()}
          className="cursor-pointer rounded-lg border-2 border-dashed border-gray-300 p-5 text-center hover:border-yellow-400 hover:bg-yellow-50 transition">
          {file ? <p className="text-green-600 font-medium">✓ {file.name}</p>
            : <p className="text-gray-400 text-sm">คลิกเพื่อเลือกไฟล์ Excel (.xlsx)</p>}
        </div>
      </div>

      {/* AI settings — OpenRouter only */}
      {mode === "ai" && (
        <div className="space-y-3 rounded-lg bg-gradient-to-br from-orange-50 to-pink-50 border border-orange-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-orange-800 flex items-center gap-1">
                🌐 OpenRouter — 1 key ใช้ได้ทุกโมเดล
              </p>
              <p className="text-[10px] text-orange-600 mt-0.5">
                Claude · GPT · Gemini · Llama · DeepSeek · Qwen ฯลฯ ผ่าน gateway เดียว
              </p>
            </div>
            <button onClick={handleSaveSettings}
              className={`rounded px-3 py-1 text-xs font-medium transition ${savedTick ? "bg-green-100 text-green-700" : "bg-white border text-gray-600 hover:bg-gray-100"}`}>
              {savedTick ? "✓ บันทึกแล้ว" : "💾 บันทึก"}
            </button>
          </div>

          {/* API Key */}
          <div>
            <p className="text-xs text-gray-500 mb-1">
              OpenRouter API Key
              <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer"
                className="ml-2 text-[11px] text-orange-600 hover:underline">สมัคร →</a>
            </p>
            <input type="password" className="w-full rounded border px-3 py-1.5 text-sm font-mono"
              placeholder="sk-or-v1-xxxxxxxxxxxx..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)} />
            <p className="text-[10px] text-gray-400 mt-1">🔒 เก็บใน browser เท่านั้น (localStorage)</p>
          </div>

          {/* Model picker */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-gray-500">Model</p>
              <button onClick={openOrModelsBrowser}
                className="text-[11px] text-orange-600 hover:text-orange-800 font-medium">
                🔄 ดู Models ทั้งหมดจาก OpenRouter (Live) →
              </button>
            </div>
            <input type="text" className="w-full rounded border px-3 py-1.5 text-sm font-mono"
              placeholder="เช่น google/gemini-2.0-flash-exp:free"
              value={model}
              onChange={(e) => setModel(e.target.value)} />
            <p className="text-[10px] text-gray-500 mt-1">⚡ Quick pick:</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {OPENROUTER_QUICK_MODELS.map((m) => (
                <button key={m.id} onClick={() => setModel(m.id)}
                  className={`text-[10px] px-2 py-1 rounded font-mono transition ${
                    model === m.id
                      ? "bg-orange-600 text-white"
                      : m.id.includes(":free")
                      ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                      : "bg-white border text-gray-600 hover:bg-gray-50"
                  }`}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* OpenRouter Models Modal */}
      {showOrModels && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowOrModels(false)}>
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex-shrink-0 bg-gradient-to-r from-orange-500 to-pink-500 px-5 py-3 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold flex items-center gap-2">🌐 OpenRouter Models</h3>
                  {orModels && (
                    <p className="text-xs text-white/80 mt-0.5">
                      ทั้งหมด {orModels.total} · ฟรี {orModels.free_count} · เสียเงิน {orModels.paid_count}
                    </p>
                  )}
                </div>
                <button onClick={() => setShowOrModels(false)}
                  className="text-white/80 hover:text-white text-xl">✕</button>
              </div>
            </div>
            <div className="flex flex-shrink-0 flex-wrap items-center gap-2 border-b bg-gray-50 px-4 py-2">
              <button onClick={() => setOrFilter("free")}
                className={`rounded-full px-3 py-1 text-xs ${orFilter === "free" ? "bg-emerald-600 text-white" : "border bg-white"}`}>
                ✨ ฟรี ({orModels?.free_count || 0})
              </button>
              <button onClick={() => setOrFilter("paid")}
                className={`rounded-full px-3 py-1 text-xs ${orFilter === "paid" ? "bg-blue-600 text-white" : "border bg-white"}`}>
                💰 Premium ({orModels?.paid_count || 0})
              </button>
              <button onClick={() => setOrFilter("all")}
                className={`rounded-full px-3 py-1 text-xs ${orFilter === "all" ? "bg-gray-600 text-white" : "border bg-white"}`}>
                ทั้งหมด ({orModels?.total || 0})
              </button>
              <input type="text" value={orSearch} onChange={(e) => setOrSearch(e.target.value)}
                placeholder="🔍 ค้นหา model..."
                className="min-w-[160px] flex-1 rounded border px-3 py-1 text-xs" />
              <button onClick={fetchOrModels} disabled={orLoading}
                className="rounded border bg-white px-3 py-1 text-xs hover:bg-gray-50 disabled:opacity-50">
                {orLoading ? "⏳" : "🔄"} Refresh
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {orLoading ? (
                <p className="py-12 text-center text-sm text-gray-400">กำลังโหลด...</p>
              ) : !orModels ? (
                <p className="py-12 text-center text-sm text-gray-400">ไม่มีข้อมูล</p>
              ) : (
                <div className="space-y-1">
                  {(orFilter === "free" ? orModels.free
                    : orFilter === "paid" ? orModels.paid
                    : orModels.all)
                    .filter((m) => !orSearch || m.id.toLowerCase().includes(orSearch.toLowerCase()) || m.name?.toLowerCase().includes(orSearch.toLowerCase()))
                    .slice(0, 200)
                    .map((m) => {
                      const active = model === m.id;
                      return (
                        <div key={m.id}
                          className={`flex items-start gap-2 rounded-lg p-2 transition ${
                            active ? "bg-orange-50 border border-orange-300" : "border border-transparent hover:bg-gray-50"
                          }`}>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-mono text-xs font-semibold">{m.id}</span>
                              {m.is_free && <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-700">FREE</span>}
                              {m.has_vision && <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] text-violet-700">📷 Vision</span>}
                              {!m.is_free && <span className="text-[10px] text-gray-500">{m.price}</span>}
                            </div>
                            <p className="mt-0.5 text-[10px] text-gray-400">
                              {m.provider}
                              {m.context_length > 0 && <> · {(m.context_length / 1000).toFixed(0)}k ctx</>}
                            </p>
                          </div>
                          <button onClick={() => { setModel(m.id); setShowOrModels(false); }}
                            className="flex-shrink-0 rounded bg-orange-100 px-2 py-1 text-[10px] text-orange-700 hover:bg-orange-200">
                            {active ? "✓ ใช้อยู่" : "ใช้ตัวนี้"}
                          </button>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      {step !== "preview" && (
        <button onClick={mode === "ai" ? handleAiPreview : handleManualSync} disabled={loading}
          className="w-full rounded-lg bg-yellow-500 py-2.5 text-sm font-semibold text-white hover:bg-yellow-600 disabled:opacity-50">
          {loading ? "⏳ กำลังประมวลผล..."
            : mode === "ai" ? "✨ ให้ AI อ่าน → Preview ก่อน Sync"
            : "🔄 Sync งบประมาณ → Supabase"}
        </button>
      )}

      {/* Cleanup button */}
      {step !== "preview" && (
        <button onClick={handleCleanupParents} disabled={loading}
          className="w-full rounded-lg border border-red-200 py-2 text-xs text-red-500 hover:bg-red-50 disabled:opacity-50">
          🗑 ลบ parent rows (erp_code ลงท้าย 0000) ออกจาก DB
        </button>
      )}

      {/* Preview */}
      {step === "preview" && (
        <div className="rounded-lg border bg-white overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
            <p className="font-medium text-sm">AI อ่านได้ {preview.length} โครงการ — ตรวจสอบก่อน Sync</p>
            <button onClick={() => setStep("idle")} className="text-xs text-gray-400 hover:text-gray-600">ยกเลิก</button>
          </div>
          <div className="overflow-x-auto max-h-56 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-50 border-b">
                <tr>
                  <th className="p-2 text-left font-medium text-gray-600">ERP Code</th>
                  <th className="p-2 text-right font-medium text-gray-600">งบรวม</th>
                  <th className="p-2 text-right font-medium text-gray-600">เบิกจ่าย</th>
                  <th className="p-2 text-right font-medium text-gray-600">คงเหลือ</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} className="border-t hover:bg-gray-50">
                    <td className="p-2 font-mono text-gray-700">{row.erp_code}</td>
                    <td className="p-2 text-right">{row.budget_total?.toLocaleString("th-TH")}</td>
                    <td className="p-2 text-right text-orange-600">{row.budget_used?.toLocaleString("th-TH")}</td>
                    <td className="p-2 text-right text-green-600">{row.budget_remaining?.toLocaleString("th-TH")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3 border-t">
            <button onClick={handleConfirmSync} disabled={loading}
              className="w-full rounded-lg bg-green-600 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50">
              {loading ? "⏳ กำลัง Sync..." : `✅ ยืนยัน Sync ${preview.length} รายการ → Supabase`}
            </button>
          </div>
        </div>
      )}

      {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">❌ {error}</p>}
      {rawAiText && (
        <details className="rounded-lg border border-orange-200 bg-orange-50 p-3">
          <summary className="cursor-pointer text-xs font-medium text-orange-700">🔍 AI Response (debug) — คลิกเพื่อดู</summary>
          <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-xs text-gray-700">{rawAiText}</pre>
        </details>
      )}

      {/* Result */}
      {step === "done" && result && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4">
          <p className="font-semibold text-green-700 mb-3">✅ Sync สำเร็จ</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: "พบใน Excel", value: result.total_parsed, c: "text-blue-700" },
              { label: "อัปเดตแล้ว", value: result.updated, c: "text-green-700" },
              { label: "สร้างใหม่", value: result.created ?? 0, c: "text-purple-700" },
            ].map(({ label, value, c }) => (
              <div key={label} className="bg-white rounded-lg p-2">
                <p className={`text-xl font-bold ${c}`}>{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── NGOR9 Panel ──────────────────────────────────────────────────────────────

function Ngor9Panel() {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        Upload PDF ง9 → AI อ่านและแยกข้อมูล → ตรวจสอบ → บันทึกลง Supabase
      </p>
      <div className="rounded-lg bg-gradient-to-r from-orange-50 to-pink-50 border border-orange-200 p-4">
        <p className="text-sm font-medium text-orange-800 mb-1">🌐 ใช้ OpenRouter เป็น gateway</p>
        <p className="text-xs text-orange-600">1 key รองรับ Claude · GPT · Gemini · Llama · DeepSeek ฯลฯ</p>
      </div>
      <a href="/admin/upload-ngor9"
        className="flex items-center justify-center gap-2 w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
        เปิดหน้านำเข้าเอกสาร ง9 →
      </a>
    </div>
  );
}

// ─── Tokens Panel ─────────────────────────────────────────────────────────────

function TokensPanel() {
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [balances, setBalances] = useState<Record<string, BalanceData>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/supabase/admin/tokens")
      .then((r) => r.json())
      .then((data) => {
        setTokens(data.tokens || []);
        const map: Record<string, BalanceData> = {};
        for (const b of data.balances || []) map[b.token_code] = b;
        setBalances(map);
      })
      .finally(() => setLoading(false));
  }, []);

  function copyToken(code: string) {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  }

  const filtered = tokens.filter((t) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return t.token_code.includes(q) || t.responsible_name.toLowerCase().includes(q)
      || (t.projects?.project_name || "").toLowerCase().includes(q);
  });

  const totalRpf = Object.values(balances).reduce((s, b) => s + Number(b.total_rpf), 0);
  const totalReports = Object.values(balances).reduce((s, b) => s + (b.report_count || 0), 0);

  if (loading) return <p className="text-center text-gray-500 py-8">กำลังโหลด...</p>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Token ทั้งหมด", value: tokens.length, c: "text-royal-700" },
          { label: "รายงานทั้งหมด", value: totalReports, c: "text-blue-600" },
          { label: "RPF แจกไปแล้ว", value: totalRpf.toLocaleString(), c: "text-green-600" },
          { label: "ใช้งานแล้ว", value: tokens.filter((t) => t.last_used_at).length, c: "text-purple-600" },
        ].map(({ label, value, c }) => (
          <div key={label} className="rounded-lg bg-white border p-3 text-center">
            <p className={`text-xl font-bold ${c}`}>{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      <input type="text" value={filter} onChange={(e) => setFilter(e.target.value)}
        placeholder="ค้นหา token, ชื่อโครงการ, ผู้รับผิดชอบ..."
        className="w-full rounded-lg border px-3 py-2 text-sm" />

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-royal-700 text-white text-xs">
            <tr>
              <th className="px-3 py-2 text-left">Token</th>
              <th className="px-3 py-2 text-left">โครงการ</th>
              <th className="px-3 py-2 text-left">ผู้รับผิดชอบ</th>
              <th className="px-3 py-2 text-right">RPF</th>
              <th className="px-3 py-2 text-center">รายงาน</th>
              <th className="px-3 py-2 text-center">🔥</th>
              <th className="px-3 py-2 text-center">Copy</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => {
              const bal = balances[t.token_code];
              return (
                <tr key={t.token_code} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <span className="rounded bg-gray-100 px-2 py-1 font-mono font-bold text-royal-700">
                      {t.token_code}
                    </span>
                  </td>
                  <td className="px-3 py-2 max-w-xs">
                    <a href={`/projects/${t.project_id}`} className="text-royal-600 hover:underline text-xs">
                      {(t.projects?.project_name || "").substring(0, 40)}{(t.projects?.project_name || "").length > 40 ? "..." : ""}
                    </a>
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-600">{t.responsible_name}</td>
                  <td className="px-3 py-2 text-right font-bold text-green-600">
                    {Number(bal?.total_rpf || 0).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-center text-xs">{bal?.report_count || 0}</td>
                  <td className="px-3 py-2 text-center text-xs">
                    {(bal?.streak_count || 0) >= 3
                      ? <span className="text-orange-500">🔥{bal?.streak_count}</span>
                      : <span className="text-gray-300">{bal?.streak_count || 0}</span>}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button onClick={() => copyToken(t.token_code)}
                      className={`rounded px-2 py-1 text-xs ${copied === t.token_code ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                      {copied === t.token_code ? "✓" : "Copy"}
                    </button>
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

// ─── Analytics Panel ──────────────────────────────────────────────────────────

function AnalyticsPanel() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics?days=${days}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) return <p className="text-center text-gray-500 py-8">กำลังโหลดสถิติ...</p>;
  if (!data) return <p className="text-center text-gray-400 py-8">ไม่สามารถโหลดข้อมูลได้</p>;

  const maxView = Math.max(...data.dailyViews.map((v) => v.count), 1);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <select value={days} onChange={(e) => setDays(Number(e.target.value))}
          className="rounded border px-3 py-1 text-sm">
          <option value={7}>7 วัน</option>
          <option value={30}>30 วัน</option>
          <option value={90}>90 วัน</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "เข้าชมทั้งหมด", value: data.totalViews.toLocaleString(), c: "text-royal-700" },
          { label: "ผู้เข้าชม (unique)", value: data.uniqueVisitors.toLocaleString(), c: "text-blue-600" },
          { label: "คลิกลิงก์", value: data.topClicks.reduce((s, c) => s + c.count, 0).toLocaleString(), c: "text-green-600" },
          { label: "หน้ายอดนิยม", value: PAGE_LABELS[data.topPages[0]?.page] || data.topPages[0]?.page || "-", c: "text-purple-600" },
        ].map(({ label, value, c }) => (
          <div key={label} className="rounded-lg bg-white border p-3">
            <p className="text-xs text-gray-500">{label}</p>
            <p className={`text-lg font-bold ${c}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Mini bar chart */}
      <div className="rounded-lg bg-white border p-4">
        <p className="text-xs font-semibold text-gray-600 mb-3">เข้าชมรายวัน</p>
        <div className="flex items-end gap-1.5" style={{ height: 80 }}>
          {data.dailyViews.map((d) => (
            <div key={d.date} className="flex flex-1 flex-col items-center">
              <span className="text-[9px] text-gray-400 mb-0.5">{d.count || ""}</span>
              <div className="w-full rounded-t bg-royal-500"
                style={{ height: `${Math.max((d.count / maxView) * 64, d.count ? 4 : 0)}px` }} />
              <span className="mt-1 text-[9px] text-gray-400">{d.date.slice(5)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg bg-white border p-4">
          <p className="text-xs font-semibold text-gray-600 mb-2">หน้าที่เข้าชมมากสุด</p>
          <table className="w-full text-sm">
            <tbody>
              {data.topPages.map((p, i) => (
                <tr key={i} className="border-t">
                  <td className="py-1.5 text-gray-700">{PAGE_LABELS[p.page] || p.page}</td>
                  <td className="py-1.5 text-right font-medium text-royal-700">{p.count.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="rounded-lg bg-white border p-4">
          <p className="text-xs font-semibold text-gray-600 mb-2">ลิงก์ที่คลิกมากสุด</p>
          <table className="w-full text-sm">
            <tbody>
              {data.topClicks.map((c, i) => (
                <tr key={i} className="border-t">
                  <td className="py-1.5 max-w-[180px] truncate text-gray-700">{c.target}</td>
                  <td className="py-1.5 text-right font-medium text-green-600">{c.count.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Seed Activities Panel ────────────────────────────────────────────────────

function SeedActivitiesPanel() {
  const [loading, setLoading] = useState<"" | "all" | "tokens">("");
  const [results, setResults] = useState<{
    seeded: number; errors: number;
    results: { project_id: string; activities: number; kpis: number; token: string | null; responsible_name: string; error?: string }[];
  } | null>(null);
  const [error, setError] = useState("");

  async function callApi(body: object) {
    setLoading(body && "tokens_only" in body ? "tokens" : "all");
    setError(""); setResults(null);
    const res = await fetch("/api/admin/seed-activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setLoading("");
    if (!res.ok) setError(data.error || "เกิดข้อผิดพลาด");
    else setResults(data);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-teal-50 border border-teal-200 p-4 text-sm text-teal-800">
        <p className="font-semibold mb-1">สิ่งที่จะถูกสร้างสำหรับโครงการที่ยังไม่มีข้อมูล:</p>
        <ul className="list-disc list-inside space-y-0.5 text-teal-700">
          <li>กิจกรรม 5 ขั้น (วางแผน → สำรวจ → ลงพื้นที่ → ติดตาม → รายงาน)</li>
          <li>ตัวชี้วัด 5 รายการ (ผู้ได้รับประโยชน์, พื้นที่, ความพึงพอใจ, องค์ความรู้, รายงาน)</li>
          <li>Token 6 หลักสำหรับหัวหน้าโครงการ (ถ้ายังไม่มี) — แยกชื่อจากวงเล็บท้ายชื่อโครงการ</li>
        </ul>
        <p className="mt-2 text-xs text-teal-600">⚠️ โครงการที่มีกิจกรรมอยู่แล้วจะไม่ถูกแตะ (ใช้ปุ่มที่ 2 สำหรับ token เท่านั้น)</p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          onClick={() => {
            if (!confirm("สร้างกิจกรรม + ตัวชี้วัด + Token ให้โครงการใต้ร่มพระบารมีทั้งหมดที่ยังว่าง?")) return;
            callApi({ all_empty: true });
          }}
          disabled={!!loading}
          className="rounded-xl bg-teal-600 py-3 text-white font-medium hover:bg-teal-700 disabled:opacity-50 text-sm"
        >
          {loading === "all" ? "⏳ กำลังสร้าง..." : "🌱 สร้างข้อมูลให้โครงการที่ว่าง"}
        </button>
        <button
          onClick={() => {
            if (!confirm("สร้าง Token เฉพาะโครงการที่ยังไม่มี Token (ไม่แตะกิจกรรม/KPI)?")) return;
            callApi({ tokens_only: true });
          }}
          disabled={!!loading}
          className="rounded-xl bg-amber-500 py-3 text-white font-medium hover:bg-amber-600 disabled:opacity-50 text-sm"
        >
          {loading === "tokens" ? "⏳ กำลังสร้าง Token..." : "🔑 สร้าง Token ที่หายไป"}
        </button>
      </div>

      {error && <p className="text-red-600 text-sm">❌ {error}</p>}

      {results && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-green-50 p-3 text-center">
              <p className="text-2xl font-bold text-green-700">{results.seeded}</p>
              <p className="text-xs text-gray-500">โครงการที่สร้างสำเร็จ</p>
            </div>
            <div className="rounded-lg bg-red-50 p-3 text-center">
              <p className="text-2xl font-bold text-red-700">{results.errors}</p>
              <p className="text-xs text-gray-500">มีข้อผิดพลาด</p>
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto rounded-lg border">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="p-2 text-left text-gray-600">Project ID</th>
                  <th className="p-2 text-left text-gray-600">ผู้รับผิดชอบ</th>
                  <th className="p-2 text-center text-gray-600">กจ.</th>
                  <th className="p-2 text-center text-gray-600">KPI</th>
                  <th className="p-2 text-center text-gray-600">Token</th>
                  <th className="p-2 text-left text-gray-600">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {results.results.map((r) => (
                  <tr key={r.project_id} className={`border-t ${r.error ? "bg-red-50" : ""}`}>
                    <td className="p-2 font-mono text-gray-600 max-w-[100px] truncate">{r.project_id}</td>
                    <td className="p-2 text-gray-700 max-w-[120px] truncate">{r.responsible_name || "-"}</td>
                    <td className="p-2 text-center">{r.activities || "-"}</td>
                    <td className="p-2 text-center">{r.kpis || "-"}</td>
                    <td className="p-2 text-center font-mono font-bold text-teal-700">{r.token || "-"}</td>
                    <td className="p-2">{r.error ? <span className="text-red-600">{r.error}</span> : <span className="text-green-600">✅</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Repair Budget Panel ──────────────────────────────────────────────────────

interface RepairAnalysisRow {
  project_id: string;
  project_name: string;
  before: { total: number; budget_used: number; budget_reported: number };
  actual_reported_sum: number;
  after: { budget_used: number; budget_reported: number };
  is_corrupt: boolean;
  reported_mismatch: boolean;
  needs_fix: boolean;
}

interface RepairResult {
  dry_run: boolean;
  total_projects: number;
  needs_fix: number;
  corrupt: number;
  mismatch_only: number;
  analysis: RepairAnalysisRow[];
  hint?: string;
}

function fmtTh(n: number): string {
  return Math.round(n).toLocaleString("th-TH");
}

function RepairBudgetPanel() {
  const [loading, setLoading] = useState<"" | "scan" | "fix">("");
  const [scan, setScan] = useState<RepairResult | null>(null);
  const [fixResult, setFixResult] = useState<RepairResult | null>(null);
  const [projectId, setProjectId] = useState("");
  const [error, setError] = useState("");

  async function runScan() {
    setLoading("scan");
    setError("");
    setFixResult(null);
    const body: Record<string, unknown> = { dry_run: true };
    if (projectId.trim()) body.project_id = projectId.trim();
    const res = await fetch("/api/admin/repair-budget", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setLoading("");
    if (!res.ok) {
      setError(data.error || "เกิดข้อผิดพลาด");
      return;
    }
    setScan(data);
  }

  async function runFix() {
    if (!scan || scan.needs_fix === 0) return;
    if (!confirm(`ยืนยันการแก้ไขข้อมูล ${scan.needs_fix} โครงการ? (การกระทำนี้จะอัปเดตตาราง projects โดยตรง)`)) return;
    setLoading("fix");
    setError("");
    const body: Record<string, unknown> = { dry_run: false };
    if (projectId.trim()) body.project_id = projectId.trim();
    const res = await fetch("/api/admin/repair-budget", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setLoading("");
    if (!res.ok) {
      setError(data.error || "เกิดข้อผิดพลาด");
      return;
    }
    setFixResult(data);
    setScan(null);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-rose-50 border border-rose-200 p-4 text-sm text-rose-800">
        <p className="font-semibold mb-1">เครื่องมือซ่อมข้อมูลงบประมาณ (สำหรับ corrupt จากโค้ดเก่า)</p>
        <ul className="list-disc list-inside space-y-0.5 text-rose-700 text-xs">
          <li><code className="bg-white px-1 rounded">budget_used</code> = เบิกจ่ายจริงจาก ERP/Excel (source of truth)</li>
          <li><code className="bg-white px-1 rounded">budget_reported</code> = SUM ของรายงาน (กิจกรรม)</li>
          <li>โค้ดเก่ามี bug บวก <code className="bg-white px-1 rounded">budget_spent</code> เข้าไปใน <code className="bg-white px-1 rounded">budget_used</code> ซ้ำ ทำให้ยอดสูงผิดปกติ</li>
          <li>ระบบจะตรวจ: ถ้า <b>budget_used &gt; budget_total</b> และใกล้เคียง <code>erp − reported_actual</code> → ถือว่า corrupt</li>
        </ul>
        <p className="mt-2 text-xs text-rose-600">
          ⚠️ ทำ <b>dry-run</b> (ตรวจ) ก่อนเสมอ — ดูรายการ → ค่อยยืนยันแก้จริง
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
          <input
            type="text"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            placeholder="เว้นว่าง = สแกนทุกโครงการ / หรือใส่ id slug / erp_code / เพื่อซ่อมโครงการเดียว"
            className="flex-1 rounded-lg border px-3 py-2 text-sm font-mono"
          />
          <button
            onClick={runScan}
            disabled={!!loading}
            className="rounded-lg bg-rose-600 py-2 px-4 text-white font-medium hover:bg-rose-700 disabled:opacity-50 text-sm whitespace-nowrap"
          >
            {loading === "scan" ? "⏳ กำลังตรวจ..." : "🔍 ตรวจ (dry-run)"}
          </button>
        </div>
        <p className="text-xs text-gray-500">
          💡 แนะนำ: กด <b>ตรวจ</b> โดยเว้นช่องว่างไว้ก่อน เพื่อสแกนทุกโครงการในฐานข้อมูล
        </p>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">❌ {error}</p>}

      {/* Scan summary */}
      {scan && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg bg-white border p-3 text-center">
              <p className="text-xl font-bold text-gray-700">{scan.total_projects}</p>
              <p className="text-xs text-gray-500">โครงการทั้งหมด</p>
            </div>
            <div className="rounded-lg bg-white border p-3 text-center">
              <p className="text-xl font-bold text-rose-700">{scan.needs_fix}</p>
              <p className="text-xs text-gray-500">ต้องแก้ไข</p>
            </div>
            <div className="rounded-lg bg-white border p-3 text-center">
              <p className="text-xl font-bold text-red-700">{scan.corrupt}</p>
              <p className="text-xs text-gray-500">corrupt (บวกซ้ำ)</p>
            </div>
            <div className="rounded-lg bg-white border p-3 text-center">
              <p className="text-xl font-bold text-amber-700">{scan.mismatch_only}</p>
              <p className="text-xs text-gray-500">รายงานไม่ sync</p>
            </div>
          </div>

          {scan.needs_fix > 0 ? (
            <>
              <div className="overflow-x-auto rounded-lg border bg-white max-h-96 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-gray-50 border-b">
                    <tr>
                      <th className="p-2 text-left font-medium text-gray-600">Project</th>
                      <th className="p-2 text-right font-medium text-gray-600">งบรวม</th>
                      <th className="p-2 text-right font-medium text-gray-600">ERP (ก่อน)</th>
                      <th className="p-2 text-right font-medium text-gray-600">ERP (หลัง)</th>
                      <th className="p-2 text-right font-medium text-gray-600">รายงาน (ก่อน)</th>
                      <th className="p-2 text-right font-medium text-gray-600">รายงานจริง</th>
                      <th className="p-2 text-center font-medium text-gray-600">ประเภท</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scan.analysis.map((a) => (
                      <tr key={a.project_id} className="border-t hover:bg-gray-50">
                        <td className="p-2 max-w-[200px]">
                          <p className="font-mono text-gray-500 text-[10px]">{a.project_id}</p>
                          <p className="truncate text-gray-700">{a.project_name}</p>
                        </td>
                        <td className="p-2 text-right font-medium">{fmtTh(a.before.total)}</td>
                        <td className={`p-2 text-right ${a.is_corrupt ? "text-red-600 line-through" : "text-gray-700"}`}>
                          {fmtTh(a.before.budget_used)}
                        </td>
                        <td className="p-2 text-right text-blue-700 font-bold">{fmtTh(a.after.budget_used)}</td>
                        <td className={`p-2 text-right ${a.reported_mismatch ? "text-amber-600 line-through" : "text-gray-700"}`}>
                          {fmtTh(a.before.budget_reported)}
                        </td>
                        <td className="p-2 text-right text-amber-700 font-bold">{fmtTh(a.actual_reported_sum)}</td>
                        <td className="p-2 text-center">
                          {a.is_corrupt && (
                            <span className="rounded bg-red-100 px-2 py-0.5 text-[10px] text-red-700">corrupt</span>
                          )}
                          {!a.is_corrupt && a.reported_mismatch && (
                            <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] text-amber-700">mismatch</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                onClick={runFix}
                disabled={!!loading}
                className="w-full rounded-lg bg-red-600 py-3 text-white font-semibold hover:bg-red-700 disabled:opacity-50 text-sm"
              >
                {loading === "fix" ? "⏳ กำลังแก้ไข..." : `⚠️ ยืนยันการแก้ไข ${scan.needs_fix} โครงการ → เขียนลง DB จริง`}
              </button>
            </>
          ) : (
            <div className={`rounded-lg border p-4 text-center ${scan.hint ? "bg-yellow-50 border-yellow-200" : "bg-green-50 border-green-200"}`}>
              {scan.hint ? (
                <p className="text-sm font-semibold text-yellow-700">⚠️ {scan.hint}</p>
              ) : (
                <p className="text-sm font-semibold text-green-700">✅ ไม่พบข้อมูล corrupt — ทุกโครงการปกติ</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Fix result */}
      {fixResult && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4">
          <p className="font-semibold text-green-700 mb-2">✅ แก้ไขข้อมูลสำเร็จ</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-white rounded-lg p-2">
              <p className="text-xl font-bold text-green-700">{fixResult.needs_fix}</p>
              <p className="text-xs text-gray-500">โครงการที่แก้ไข</p>
            </div>
            <div className="bg-white rounded-lg p-2">
              <p className="text-xl font-bold text-red-700">{fixResult.corrupt}</p>
              <p className="text-xs text-gray-500">corrupt ที่ reset</p>
            </div>
            <div className="bg-white rounded-lg p-2">
              <p className="text-xl font-bold text-amber-700">{fixResult.mismatch_only}</p>
              <p className="text-xs text-gray-500">sync ใหม่</p>
            </div>
          </div>
          <p className="text-xs text-green-600 mt-3">
            แนะนำ: รัน <b>Sync Excel</b> อีกครั้งเพื่อรีเฟรชยอด ERP → ตรวจหน้าโครงการว่าแสดงผลถูกต้อง
          </p>
        </div>
      )}
    </div>
  );
}
