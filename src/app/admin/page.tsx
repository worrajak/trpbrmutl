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
  not_found: string[];
  errors: string[];
}
interface PreviewRow {
  erp_code: string;
  budget_total: number;
  budget_used: number;
  budget_remaining: number;
}

type AiProvider = "gemini" | "claude" | "openai" | "local";
type OpenSection = "tokens" | "analytics" | "sync" | "ngor9" | null;

const PAGE_LABELS: Record<string, string> = {
  "/": "หน้าแรก", "/projects": "โครงการย่อย",
  "/indicators": "ตัวชี้วัด", "/map": "แผนที่",
  "/staff": "บุคลากร", "/regulations": "ระเบียบ/ประกาศ",
};
const AI_PROVIDERS = [
  { value: "gemini" as AiProvider, label: "Gemini (แนะนำ)", hint: "aistudio.google.com" },
  { value: "claude" as AiProvider, label: "Claude", hint: "console.anthropic.com" },
  { value: "openai" as AiProvider, label: "OpenAI", hint: "platform.openai.com" },
  { value: "local" as AiProvider, label: "🖥️ Local AI", hint: "Ollama / LM Studio" },
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
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Sync Excel Panel ─────────────────────────────────────────────────────────

const AI_KEY_STORAGE = "rpf_ai_settings";

function loadAiSettings() {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(AI_KEY_STORAGE) || "null"); } catch { return null; }
}
function saveAiSettings(settings: Record<string, unknown>) {
  localStorage.setItem(AI_KEY_STORAGE, JSON.stringify(settings));
}

function SyncExcelPanel() {
  const [mode, setMode] = useState<"ai" | "manual">("ai");
  const [file, setFile] = useState<File | null>(null);
  const [aiProvider, setAiProvider] = useState<AiProvider>("gemini");
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({ gemini: "", claude: "", openai: "" });
  const [localBaseUrl, setLocalBaseUrl] = useState("http://localhost:11434");
  const [localModel, setLocalModel] = useState("llama3");
  const [availableModels, setAvailableModels] = useState<Record<string, string[]>>({});
  const [selectedModels, setSelectedModels] = useState<Record<string, string>>({});
  const [fetchingModels, setFetchingModels] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"idle" | "preview" | "done">("idle");
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState("");
  const [rawAiText, setRawAiText] = useState("");
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // โหลด settings จาก localStorage ตอน mount
  useEffect(() => {
    const s = loadAiSettings();
    if (!s) return;
    if (s.provider) setAiProvider(s.provider);
    if (s.keys) setApiKeys(s.keys);
    if (s.localBaseUrl) setLocalBaseUrl(s.localBaseUrl);
    if (s.localModel) setLocalModel(s.localModel);
    if (s.selectedModels) setSelectedModels(s.selectedModels);
  }, []);

  function handleSaveSettings() {
    saveAiSettings({ provider: aiProvider, keys: apiKeys, localBaseUrl, localModel, selectedModels });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleFetchModels() {
    const key = apiKeys[aiProvider] || "";
    if (aiProvider !== "local" && !key) { setError("กรุณาใส่ API Key ก่อน"); return; }
    setFetchingModels(true);
    setError("");
    const params = new URLSearchParams({
      provider: aiProvider,
      api_key: key,
      local_base_url: localBaseUrl,
    });
    const res = await fetch(`/api/ai-models?${params}`);
    const data = await res.json();
    setFetchingModels(false);
    if (!res.ok) { setError(data.error || "ดึง models ไม่ได้"); return; }
    setAvailableModels((prev) => ({ ...prev, [aiProvider]: data.models }));
    // ตั้ง default model ถ้ายังไม่ได้เลือก
    if (!selectedModels[aiProvider] && data.models.length > 0) {
      setSelectedModels((prev) => ({ ...prev, [aiProvider]: data.models[0] }));
    }
  }

  const apiKey = apiKeys[aiProvider] || "";
  const currentModels = availableModels[aiProvider] || [];
  const selectedModel = selectedModels[aiProvider] || "";

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
    if (aiProvider !== "local" && !apiKey) { setError("กรุณาใส่ API Key"); setLoading(false); return; }

    const res = await fetch("/api/supabase/ai-sync-excel", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_base64: base64, ai_provider: aiProvider, api_key: apiKey,
        local_base_url: localBaseUrl, local_model: localModel, model: selectedModel, preview_only: true }),
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
      body: JSON.stringify({ file_base64: base64, ai_provider: aiProvider, api_key: apiKey,
        local_base_url: localBaseUrl, local_model: localModel, model: selectedModel }),
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

      {/* AI settings */}
      {mode === "ai" && (
        <div className="space-y-3 rounded-lg bg-gray-50 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">AI Provider & API Keys</p>
            <button onClick={handleSaveSettings}
              className={`rounded px-3 py-1 text-xs font-medium transition ${saved ? "bg-green-100 text-green-700" : "bg-white border text-gray-600 hover:bg-gray-100"}`}>
              {saved ? "✓ บันทึกแล้ว" : "💾 บันทึก Keys"}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {AI_PROVIDERS.map((p) => (
              <button key={p.value} onClick={() => setAiProvider(p.value)}
                className={`rounded-lg border p-2 text-left text-xs transition ${aiProvider === p.value ? "border-yellow-500 bg-yellow-50" : "border-gray-200 bg-white hover:border-gray-300"}`}>
                <p className="font-medium">{p.label}</p>
                <p className="text-gray-400 mt-0.5">{p.hint}</p>
                {p.value !== "local" && apiKeys[p.value] && (
                  <p className="text-green-500 mt-0.5">✓ มี key</p>
                )}
              </button>
            ))}
          </div>

          {aiProvider === "local" ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Base URL</p>
                  <input type="text" className="w-full rounded border px-3 py-1.5 text-sm"
                    value={localBaseUrl} onChange={(e) => setLocalBaseUrl(e.target.value)}
                    placeholder="http://localhost:11434" />
                </div>
                <div className="flex items-end">
                  <button onClick={handleFetchModels} disabled={fetchingModels}
                    className="w-full rounded border bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                    {fetchingModels ? "⏳..." : "🔍 ดึง Models"}
                  </button>
                </div>
              </div>
              {currentModels.length > 0 ? (
                <div>
                  <p className="text-xs text-gray-500 mb-1">เลือก Model ({currentModels.length} ตัว)</p>
                  <select className="w-full rounded border px-3 py-1.5 text-sm"
                    value={selectedModel}
                    onChange={(e) => setSelectedModels((prev) => ({ ...prev, [aiProvider]: e.target.value }))}>
                    {currentModels.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-gray-500 mb-1">หรือพิมพ์ชื่อ Model</p>
                  <input type="text" className="w-full rounded border px-3 py-1.5 text-sm"
                    value={selectedModel} placeholder="llama3, typhoon2..."
                    onChange={(e) => setSelectedModels((prev) => ({ ...prev, [aiProvider]: e.target.value }))} />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div>
                <p className="text-xs text-gray-500 mb-1">
                  API Key — {AI_PROVIDERS.find(p => p.value === aiProvider)?.label}
                </p>
                <div className="flex gap-2">
                  <input type="password" className="flex-1 rounded border px-3 py-1.5 text-sm"
                    placeholder="sk-... หรือ AIza..."
                    value={apiKeys[aiProvider] || ""}
                    onChange={(e) => setApiKeys((prev) => ({ ...prev, [aiProvider]: e.target.value }))} />
                  <button onClick={handleFetchModels} disabled={fetchingModels || !apiKey}
                    className="rounded border bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 whitespace-nowrap">
                    {fetchingModels ? "⏳..." : "🔍 ดึง Models"}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">🔒 เก็บใน browser เท่านั้น</p>
              </div>
              {currentModels.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">เลือก Model ({currentModels.length} ตัว)</p>
                  <select className="w-full rounded border px-3 py-1.5 text-sm"
                    value={selectedModel}
                    onChange={(e) => setSelectedModels((prev) => ({ ...prev, [aiProvider]: e.target.value }))}>
                    {currentModels.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}
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
              { label: "ไม่พบใน DB", value: result.not_found.length, c: "text-yellow-700" },
            ].map(({ label, value, c }) => (
              <div key={label} className="bg-white rounded-lg p-2">
                <p className={`text-xl font-bold ${c}`}>{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            ))}
          </div>
          {result.not_found.length > 0 && (
            <details className="mt-3">
              <summary className="text-xs text-yellow-700 cursor-pointer">ERP ที่ไม่พบ ({result.not_found.length})</summary>
              <div className="mt-1 font-mono text-xs text-gray-600 max-h-24 overflow-y-auto">
                {result.not_found.map((c) => <p key={c}>{c}</p>)}
              </div>
            </details>
          )}
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
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
        <p className="text-sm font-medium text-blue-800 mb-1">รองรับ AI หลายตัว</p>
        <p className="text-xs text-blue-600">Gemini · Claude · OpenAI GPT-4o · Local AI (Ollama)</p>
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
