"use client";

import { useState, useEffect } from "react";

interface ParsedProject {
  project_name: string;
  responsible: string;
  responsible_title: string;
  phone: string;
  organization: string;
  budget_total: number;
  project_period: string;
  site: string;
  main_program: string;
  activities: Array<{
    order: number;
    name: string;
    budget: number;
    planned_months: number[];
    output: string;
  }>;
  kpi: {
    quantitative: string[];
    qualitative: string[];
    time_target: string;
    budget_target: string;
  };
}

// OpenRouter — quick-pick models (browser modal อยู่ในหน้านี้แล้ว)
const OR_QUICK_MODELS = [
  { id: "anthropic/claude-haiku-4.5", label: "Claude Haiku 4.5 (แม่น/ถูก)" },
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { id: "openai/gpt-4.1-mini", label: "GPT-4.1 mini" },
  { id: "google/gemini-2.0-flash-exp:free", label: "Gemini 2.0 · FREE" },
];
const OR_STORAGE = "rpf_openrouter_settings";

// ===== Model browser types (sync กับ /api/ai-models) =====
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
  total: number;
  free_count: number;
  paid_count: number;
  free: OrModelInfo[];
  paid: OrModelInfo[];
  all: OrModelInfo[];
}

// ===== Test-key result =====
interface KeyTestResult {
  ok: boolean;
  label?: string | null;
  usage?: number | null;
  limit?: number | null;
  limit_remaining?: number | null;
  is_free_tier?: boolean;
  error?: string;
}

const MONTH_LABELS: Record<number, string> = {
  10: "ต.ค.", 11: "พ.ย.", 12: "ธ.ค.",
  1: "ม.ค.", 2: "ก.พ.", 3: "มี.ค.",
  4: "เม.ย.", 5: "พ.ค.", 6: "มิ.ย.",
  7: "ก.ค.", 8: "ส.ค.", 9: "ก.ย.",
};

const PROGRAMS = ["1.ผลักดันเทคโนโลยี", "2.ขับเคลื่อนกลไก", "3.พัฒนากำลังคน"];

export default function UploadNgor9Page() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");

  // OpenRouter settings (shared กับหน้า /admin)
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("anthropic/claude-haiku-4.5");

  // PDF parsing engine (file-parser plugin)
  // - native: Claude/Gemini อ่านเอง (ดีสุด · รองรับ scan)
  // - pdf-text: ฟรี · text-only · ใช้ไม่ได้กับ scan
  // - mistral-ocr: $2/1000 หน้า · OCR
  const [engine, setEngine] = useState<"native" | "pdf-text" | "mistral-ocr">("native");

  // Test connection state
  const [testingKey, setTestingKey] = useState(false);
  const [keyTest, setKeyTest] = useState<KeyTestResult | null>(null);

  // Model browser modal
  const [showOrModels, setShowOrModels] = useState(false);
  const [orModels, setOrModels] = useState<OrModelList | null>(null);
  const [orLoading, setOrLoading] = useState(false);
  const [orFilter, setOrFilter] = useState<"free" | "paid" | "all">("paid");
  const [orSearch, setOrSearch] = useState("");
  const [orVisionOnly, setOrVisionOnly] = useState(false);

  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState("");

  // Parsed data (editable)
  const [parsed, setParsed] = useState<ParsedProject | null>(null);

  // Save state
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [savedToken, setSavedToken] = useState("");
  const [duplicateWarning, setDuplicateWarning] = useState<Array<{ id: string; project_name: string; responsible: string | null }> | null>(null);
  const [savedProjectId, setSavedProjectId] = useState("");
  const [savedCounts, setSavedCounts] = useState<{
    activities_inserted: number;
    activities_total: number;
    kpis_inserted: number;
    warnings: string[];
    mode?: "insert" | "merge";
    activities_replaced?: number;
    kpis_replaced?: number;
  } | null>(null);
  const [fiscalYear, setFiscalYear] = useState(2570);

  // ===== Match-then-merge flow (เช็คโครงการซ้ำก่อน save) =====
  type MatchCandidate = {
    id: string;
    project_name: string;
    responsible: string | null;
    organization: string | null;
    fiscal_year: number | null;
    erp_code: string | null;
    budget_total: number;
    budget_used: number;
    main_program: string | null;
    score: number;
    signals: string[];
  };
  const [matchCandidates, setMatchCandidates] = useState<MatchCandidate[] | null>(null);
  const [matching, setMatching] = useState(false);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [budgetStrategy, setBudgetStrategy] = useState<"keep" | "ngor9">("keep");

  useEffect(() => {
    const s = sessionStorage.getItem("admin_auth");
    if (s === "true") setAuthed(true);
    // โหลด OpenRouter settings (key+model) จาก localStorage shared กับ /admin
    try {
      const raw = localStorage.getItem(OR_STORAGE);
      if (raw) {
        const cfg = JSON.parse(raw) as { api_key?: string; model?: string };
        if (cfg.api_key) setApiKey(cfg.api_key);
        if (cfg.model) setModel(cfg.model);
      }
    } catch { /* ignore */ }
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
    } else alert("รหัสผ่านไม่ถูกต้อง");
  }

  // ===== Test OpenRouter API key =====
  async function handleTestKey() {
    if (!apiKey) {
      setKeyTest({ ok: false, error: "กรุณาใส่ API Key ก่อน" });
      return;
    }
    setTestingKey(true);
    setKeyTest(null);
    try {
      const res = await fetch("/api/openrouter/test-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: apiKey }),
      });
      const data = (await res.json()) as KeyTestResult;
      setKeyTest(data);
      // ถ้า key ใช้ได้ → save (ใช้ครั้งหน้าไม่ต้องกรอกใหม่)
      if (data.ok) {
        localStorage.setItem(OR_STORAGE, JSON.stringify({ api_key: apiKey, model }));
      }
    } catch (err: unknown) {
      setKeyTest({
        ok: false,
        error: err instanceof Error ? err.message : "ทดสอบ key ไม่สำเร็จ",
      });
    } finally {
      setTestingKey(false);
    }
  }

  // ===== Fetch OpenRouter model list =====
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

  async function handleParse() {
    if (!file || !apiKey) return;
    setParsing(true);
    setParseError("");

    try {
      // Save OpenRouter settings (shared กับหน้า /admin)
      localStorage.setItem(OR_STORAGE, JSON.stringify({ api_key: apiKey, model }));

      // Convert file to base64
      const buffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
      );

      const res = await fetch("/api/supabase/parse-ngor9", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pdf_base64: base64,
          api_key: apiKey,
          model,
          engine,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        const msg = data.error || "เกิดข้อผิดพลาด";
        const raw = data.raw_text ? "\n\nAI ตอบ:\n" + data.raw_text.substring(0, 500) : "";
        // ตรวจ pattern ของ "Failed to parse document.pdf" → แนะให้เปลี่ยน engine ก่อน
        const hint = /Failed to parse|file-parser|provider_name":null/i.test(msg)
          ? "\n\nคำแนะนำ (ลองตามลำดับ):\n" +
            `  1. เปลี่ยน PDF Engine — ตอนนี้ใช้ "${engine}" → ลอง ${
              engine === "native"
                ? "'pdf-text' (ฟรี · text PDF) หรือ 'mistral-ocr' (สำหรับ scan)"
                : engine === "pdf-text"
                ? "'native' (Claude/Gemini อ่านเอง · รองรับ scan)"
                : "'native' หรือ 'pdf-text'"
            }\n` +
            "  2. เปลี่ยน Model → Claude Haiku/Sonnet 4.5 หรือ Gemini 2.5 (PDF native)\n" +
            "  3. ถ้า PDF เป็นภาพ scan ทั้งเล่ม → ต้องใช้ 'mistral-ocr' (เสียเงิน $2/1000 หน้า)"
          : "";
        throw new Error(msg + raw + hint);
      }

      setParsed(data.data as ParsedProject);
    } catch (err: unknown) {
      setParseError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setParsing(false);
    }
  }

  function updateField(field: string, value: string | number) {
    if (!parsed) return;
    setParsed({ ...parsed, [field]: value });
  }

  function updateActivity(idx: number, field: string, value: string | number | number[]) {
    if (!parsed) return;
    const acts = [...parsed.activities];
    acts[idx] = { ...acts[idx], [field]: value };
    setParsed({ ...parsed, activities: acts });
  }

  function addActivity() {
    if (!parsed) return;
    setParsed({
      ...parsed,
      activities: [
        ...parsed.activities,
        { order: parsed.activities.length + 1, name: "", budget: 0, planned_months: [], output: "" },
      ],
    });
  }

  function removeActivity(idx: number) {
    if (!parsed) return;
    const acts = parsed.activities.filter((_, i) => i !== idx);
    acts.forEach((a, i) => (a.order = i + 1));
    setParsed({ ...parsed, activities: acts });
  }

  function toggleMonth(actIdx: number, month: number) {
    if (!parsed) return;
    const acts = [...parsed.activities];
    const months = [...acts[actIdx].planned_months];
    const i = months.indexOf(month);
    if (i >= 0) months.splice(i, 1);
    else months.push(month);
    acts[actIdx] = { ...acts[actIdx], planned_months: months };
    setParsed({ ...parsed, activities: acts });
  }

  // ===== Step 1: ตรวจ match ก่อน save =====
  // เป็น entry point ของปุ่ม "บันทึกลง Supabase"
  async function handleSave() {
    if (!parsed) return;
    setSaveError("");
    setMatching(true);
    try {
      const res = await fetch("/api/supabase/match-ngor9", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_name: parsed.project_name,
          responsible: parsed.responsible,
          fiscal_year: fiscalYear,
          organization: parsed.organization,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "ตรวจซ้ำไม่สำเร็จ");

      const matches: MatchCandidate[] = data.matches || [];
      if (matches.length === 0) {
        // ไม่เจอใกล้เคียง → save เป็นโครงการใหม่ทันที
        await actuallySave(null, "keep");
      } else {
        // เจอ → เปิด modal ให้ admin เลือก
        setMatchCandidates(matches);
        setShowMatchModal(true);
      }
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setMatching(false);
    }
  }

  // ===== Step 2: ลงทะเบียนจริง (insert ใหม่ หรือ merge) =====
  async function actuallySave(mergeIntoId: string | null, strategy: "keep" | "ngor9") {
    if (!parsed) return;
    setSaving(true);
    setSaveError("");
    setShowMatchModal(false);

    try {
      const res = await fetch("/api/supabase/save-ngor9", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...parsed,
          fiscal_year: fiscalYear,
          merge_into_id: mergeIntoId,
          budget_strategy: strategy,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "บันทึกไม่สำเร็จ");

      setSavedToken(data.token_code || "");
      setSavedProjectId(data.project_id || "");
      setDuplicateWarning(data.duplicate_warning || null);
      setSavedCounts({
        activities_inserted: data.activities_inserted ?? 0,
        activities_total: data.activities_total ?? 0,
        kpis_inserted: data.kpis_inserted ?? 0,
        warnings: data.warnings ?? [],
        mode: data.mode,
        activities_replaced: data.activities_replaced,
        kpis_replaced: data.kpis_replaced,
      });
      setSaved(true);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  }

  // Auth screen
  if (!authed) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <form onSubmit={handleLogin} className="w-full max-w-sm rounded-lg bg-white p-8 shadow">
          <h1 className="mb-4 text-lg font-bold text-royal-700">Admin - นำเข้า ง9</h1>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="รหัสผ่าน Admin" className="mb-3 w-full rounded border px-3 py-2" />
          <button className="w-full rounded bg-royal-700 py-2 text-white hover:bg-royal-800">เข้าสู่ระบบ</button>
        </form>
      </div>
    );
  }

  // Success screen
  if (saved) {
    return (
      <div className="mx-auto max-w-lg py-10">
        <div className="rounded-lg bg-white p-8 shadow text-center">
          <div className="text-5xl mb-4">&#10003;</div>
          <h1 className="text-2xl font-bold text-green-700">บันทึกสำเร็จ!</h1>
          <p className="mt-2 text-gray-600">
            โครงการ &quot;{parsed?.project_name}&quot; ปี {fiscalYear}
          </p>

          {/* Token ที่สร้าง */}
          {savedToken && (
            <div className="mt-4 rounded-lg bg-royal-50 border-2 border-royal-300 p-4">
              <p className="text-sm text-gray-600">Token สำหรับ หน.โครงการ:</p>
              <p className="mt-1 font-mono text-3xl font-bold tracking-[0.3em] text-royal-700">
                {savedToken}
              </p>
              <button
                onClick={() => { navigator.clipboard.writeText(savedToken); }}
                className="mt-2 rounded bg-royal-700 px-3 py-1 text-xs text-white hover:bg-royal-800"
              >
                Copy Token
              </button>
              <p className="mt-2 text-xs text-gray-500">
                ส่ง Token นี้ให้ {parsed?.responsible || "หัวหน้าโครงการ"} เพื่อรายงานผลและรับ RPF Coin
              </p>
            </div>
          )}

          {/* Activities/KPIs counts + warnings */}
          {savedCounts && (
            <div className="mt-4 rounded-lg border bg-gray-50 p-3 text-left">
              <p className="text-xs font-medium text-gray-700">
                รายละเอียดที่บันทึก
                {savedCounts.mode === "merge" && (
                  <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800">
                    🔄 อัปเดตโครงการเดิม
                  </span>
                )}
                {savedCounts.mode === "insert" && (
                  <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-800">
                    ➕ โครงการใหม่
                  </span>
                )}
              </p>
              <ul className="mt-1 space-y-0.5 text-xs text-gray-600">
                <li>
                  • กิจกรรม: <strong>{savedCounts.activities_inserted}</strong>/{savedCounts.activities_total}
                  {savedCounts.mode === "merge" && savedCounts.activities_replaced != null && savedCounts.activities_replaced > 0 && (
                    <span className="text-amber-700"> (แทนที่ของเดิม {savedCounts.activities_replaced} รายการ)</span>
                  )}
                </li>
                <li>
                  • ตัวชี้วัด (KPI): <strong>{savedCounts.kpis_inserted}</strong>
                  {savedCounts.mode === "merge" && savedCounts.kpis_replaced != null && savedCounts.kpis_replaced > 0 && (
                    <span className="text-amber-700"> (แทนที่ของเดิม {savedCounts.kpis_replaced} รายการ)</span>
                  )}
                </li>
              </ul>
              {savedCounts.warnings.length > 0 && (
                <div className="mt-2 rounded border border-amber-300 bg-amber-50 p-2">
                  {savedCounts.warnings.map((w, i) => (
                    <p key={i} className="text-[11px] text-amber-800">{w}</p>
                  ))}
                  {savedProjectId && (
                    <p className="mt-1 text-[11px] text-amber-700">
                      → เปิด <a href={`/projects/${savedProjectId}`} className="underline" target="_blank" rel="noreferrer">ดูโครงการ</a>
                      {" หรือ "}
                      <a href="/admin/projects" className="underline">แก้ไข/ลบโครงการ</a>
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Duplicate Warning */}
          {duplicateWarning && duplicateWarning.length > 0 && (
            <div className="mt-4 rounded bg-yellow-50 border border-yellow-300 p-3 text-left">
              <p className="text-sm font-medium text-yellow-800">
                &#9888; พบผู้รับผิดชอบซ้ำในปี {fiscalYear}:
              </p>
              <ul className="mt-1 space-y-1">
                {duplicateWarning.map((d) => (
                  <li key={d.id} className="text-xs text-yellow-700">
                    <a href={`/projects/${d.id}`} className="underline hover:text-yellow-900">
                      {d.project_name}
                    </a>
                    {" — "}{d.responsible}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-yellow-600">
                หน.โครงการ อาจใช้ Token เดิมได้ ดูที่หน้า Token/RPF
              </p>
            </div>
          )}

          <div className="mt-6 flex justify-center gap-3">
            <button onClick={() => {
              setParsed(null); setSaved(false); setFile(null);
              setSavedToken(""); setDuplicateWarning(null); setSavedCounts(null);
              setMatchCandidates(null); setShowMatchModal(false);
              setBudgetStrategy("keep");
            }}
              className="rounded bg-royal-700 px-4 py-2 text-white hover:bg-royal-800">
              นำเข้าไฟล์ใหม่
            </button>
            <a href="/admin/tokens" className="rounded border px-4 py-2 text-gray-600 hover:bg-gray-100">
              จัดการ Token
            </a>
            <a href="/projects" className="rounded border px-4 py-2 text-gray-600 hover:bg-gray-100">
              ดูโครงการ
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-royal-700">นำเข้าเอกสาร ง9</h1>
        <p className="text-sm text-gray-600">Upload PDF ง9 → AI อ่านข้อมูล → ตรวจสอบ/แก้ไข → บันทึกลง Supabase</p>
      </div>

      {/* Step 1: AI Settings + Upload */}
      {!parsed && (
        <div className="space-y-4 rounded-lg bg-white p-6 shadow">
          <h2 className="font-semibold text-gray-800">1. ตั้งค่า AI + เลือกไฟล์</h2>

          {/* OpenRouter banner */}
          <div className="rounded-lg border border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 p-3 text-xs text-indigo-800">
            🌐 ใช้ <span className="font-semibold">OpenRouter</span> เป็น gateway · 1 key รองรับ Claude · GPT · Gemini · Llama · DeepSeek ฯลฯ ·{" "}
            <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" className="underline font-medium hover:text-indigo-900">
              ขอ key ฟรี
            </a>
          </div>

          {/* OpenRouter API Key */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">OpenRouter API Key</label>
              <button
                type="button"
                onClick={handleTestKey}
                disabled={!apiKey || testingKey}
                className="rounded border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
              >
                {testingKey ? "⏳ กำลังตรวจ..." : "🔌 ทดสอบ Key"}
              </button>
            </div>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => { setApiKey(e.target.value); setKeyTest(null); }}
              placeholder="sk-or-v1-..."
              className="w-full rounded border px-3 py-2 text-sm font-mono"
            />
            <p className="mt-1 text-xs text-gray-400">
              Key จะถูกเก็บใน localStorage ของเครื่องนี้เท่านั้น (shared กับหน้า /admin) ·{" "}
              <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" className="underline hover:text-indigo-600">
                ขอ key ฟรี
              </a>
            </p>

            {/* Test result */}
            {keyTest && (
              <div
                className={`mt-2 rounded-lg border p-3 text-xs ${
                  keyTest.ok
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {keyTest.ok ? (
                  <>
                    <p className="font-medium">✓ Key ใช้งานได้</p>
                    <ul className="mt-1 space-y-0.5 text-[11px]">
                      {keyTest.label && <li>• Label: <code className="font-mono">{keyTest.label}</code></li>}
                      {typeof keyTest.usage === "number" && (
                        <li>• ใช้ไปแล้ว: <strong>${keyTest.usage.toFixed(4)}</strong></li>
                      )}
                      {typeof keyTest.limit === "number" && keyTest.limit > 0 ? (
                        <li>
                          • Limit: ${keyTest.limit.toFixed(2)}
                          {typeof keyTest.limit_remaining === "number" && (
                            <> · เหลือ <strong>${keyTest.limit_remaining.toFixed(4)}</strong></>
                          )}
                        </li>
                      ) : (
                        <li>• Limit: ไม่จำกัด (pay-as-you-go)</li>
                      )}
                      {keyTest.is_free_tier && (
                        <li className="text-emerald-700">• 🆓 Free tier — ใช้ได้เฉพาะ models ลงท้าย <code>:free</code></li>
                      )}
                    </ul>
                  </>
                ) : (
                  <p>✗ {keyTest.error}</p>
                )}
              </div>
            )}
          </div>

          {/* Model picker */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                Model{" "}
                <span className="text-xs font-normal text-gray-400">
                  (PDF — แนะนำ Claude Haiku 4.5 / Gemini 2.5)
                </span>
              </label>
              <button
                type="button"
                onClick={openOrModelsBrowser}
                className="rounded border border-orange-200 bg-orange-50 px-2.5 py-1 text-[11px] font-medium text-orange-700 hover:bg-orange-100"
              >
                🔄 ดู Models ทั้งหมด (Live)
              </button>
            </div>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="anthropic/claude-haiku-4.5"
              className="w-full rounded border px-3 py-2 text-sm font-mono"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {OR_QUICK_MODELS.map((m) => {
                const isFree = m.id.includes(":free");
                const active = model === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setModel(m.id)}
                    className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                      active
                        ? "border-royal-500 bg-royal-50 text-royal-700 ring-1 ring-royal-300"
                        : isFree
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-xs text-gray-400">
              💡 Tip: ถ้า PDF ภาพ scan ลองใช้ <code className="font-mono">anthropic/claude-haiku-4.5</code> หรือ <code className="font-mono">google/gemini-2.5-flash</code> (vision)
            </p>
          </div>

          {/* PDF Engine picker */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              PDF Engine{" "}
              <span className="text-xs font-normal text-gray-400">
                (ถ้า &quot;Failed to parse&quot; → เปลี่ยน engine)
              </span>
            </label>
            <div className="grid gap-2 sm:grid-cols-3">
              {[
                {
                  id: "native" as const,
                  title: "🎯 Native",
                  desc: "Claude/Gemini อ่าน PDF เอง · รองรับ scan · แม่นสุด",
                  badge: "แนะนำ",
                  badgeColor: "bg-emerald-100 text-emerald-700",
                },
                {
                  id: "pdf-text" as const,
                  title: "📄 pdf-text",
                  desc: "ฟรี · text-only · ใช้ไม่ได้กับภาพ scan",
                  badge: "FREE",
                  badgeColor: "bg-emerald-100 text-emerald-700",
                },
                {
                  id: "mistral-ocr" as const,
                  title: "🔍 mistral-ocr",
                  desc: "OCR สำหรับ scan · $2/1,000 หน้า",
                  badge: "$",
                  badgeColor: "bg-amber-100 text-amber-700",
                },
              ].map((opt) => {
                const active = engine === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setEngine(opt.id)}
                    className={`rounded-lg border p-3 text-left text-xs transition ${
                      active
                        ? "border-royal-500 bg-royal-50 ring-1 ring-royal-300"
                        : "border-gray-200 bg-white hover:bg-gray-50"
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-between gap-1">
                      <span className="font-semibold text-gray-800">{opt.title}</span>
                      <span className={`rounded px-1.5 py-0.5 text-[9px] ${opt.badgeColor}`}>
                        {opt.badge}
                      </span>
                    </div>
                    <p className="text-[11px] leading-snug text-gray-500">{opt.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* File Upload */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">ไฟล์ ง9 (PDF)</label>
            <input type="file" accept=".pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full rounded border px-3 py-2 text-sm" />
            {file && <p className="mt-1 text-xs text-green-600">เลือกแล้ว: {file.name} ({(file.size / 1024).toFixed(0)} KB)</p>}
          </div>

          {/* Parse Button */}
          <button onClick={handleParse} disabled={!file || !apiKey || parsing}
            className="w-full rounded bg-royal-700 py-3 font-medium text-white hover:bg-royal-800 disabled:opacity-50">
            {parsing ? "กำลังอ่านเอกสาร..." : "อ่านเอกสารด้วย AI"}
          </button>

          {parseError && (
            <div className="rounded bg-red-50 p-3 text-sm text-red-700 whitespace-pre-wrap">{parseError}</div>
          )}
        </div>
      )}

      {/* Step 2: Review + Edit */}
      {parsed && !saved && (
        <div className="space-y-4">
          <div className="rounded-lg bg-green-50 border border-green-200 p-4">
            <p className="text-sm text-green-700 font-medium">
              AI อ่านข้อมูลเสร็จแล้ว — กรุณาตรวจสอบและแก้ไขก่อนบันทึก
            </p>
          </div>

          {/* ข้อมูลทั่วไป */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 font-semibold text-gray-800">2. ข้อมูลโครงการ</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs text-gray-500">ปีงบประมาณ</label>
                <select value={fiscalYear} onChange={(e) => setFiscalYear(Number(e.target.value))}
                  className="w-full rounded border px-3 py-2 text-sm font-bold text-royal-700">
                  <option value={2569}>2569 (ปัจจุบัน)</option>
                  <option value={2570}>2570 (ปีหน้า)</option>
                  <option value={2571}>2571</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">โครงการหลัก</label>
                <select value={parsed.main_program}
                  onChange={(e) => updateField("main_program", e.target.value)}
                  className="w-full rounded border px-3 py-2 text-sm">
                  {PROGRAMS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-gray-500">ชื่อโครงการ</label>
                <input type="text" value={parsed.project_name}
                  onChange={(e) => updateField("project_name", e.target.value)}
                  className="w-full rounded border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500">หน่วยงาน</label>
                <input type="text" value={parsed.organization}
                  onChange={(e) => updateField("organization", e.target.value)}
                  className="w-full rounded border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500">ผู้รับผิดชอบ</label>
                <input type="text" value={parsed.responsible}
                  onChange={(e) => updateField("responsible", e.target.value)}
                  className="w-full rounded border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500">ตำแหน่ง</label>
                <input type="text" value={parsed.responsible_title}
                  onChange={(e) => updateField("responsible_title", e.target.value)}
                  className="w-full rounded border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500">งบประมาณ (บาท)</label>
                <input type="number" value={parsed.budget_total}
                  onChange={(e) => updateField("budget_total", Number(e.target.value))}
                  className="w-full rounded border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500">เบอร์โทร</label>
                <input type="text" value={parsed.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  className="w-full rounded border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500">ระยะเวลา</label>
                <input type="text" value={parsed.project_period}
                  onChange={(e) => updateField("project_period", e.target.value)}
                  className="w-full rounded border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500">สถานที่ดำเนินงาน</label>
                <input type="text" value={parsed.site}
                  onChange={(e) => updateField("site", e.target.value)}
                  className="w-full rounded border px-3 py-2 text-sm" />
              </div>
            </div>
          </div>

          {/* กิจกรรม + Gantt */}
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">3. กิจกรรม ({parsed.activities.length} รายการ)</h2>
              <button onClick={addActivity}
                className="rounded bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700">
                + เพิ่มกิจกรรม
              </button>
            </div>

            <div className="space-y-3">
              {parsed.activities.map((act, idx) => (
                <div key={idx} className="rounded border p-3">
                  <div className="flex items-start gap-2">
                    <span className="mt-2 text-sm font-bold text-gray-400">{act.order}.</span>
                    <div className="flex-1 space-y-2">
                      <input type="text" value={act.name}
                        onChange={(e) => updateActivity(idx, "name", e.target.value)}
                        placeholder="ชื่อกิจกรรม"
                        className="w-full rounded border px-2 py-1 text-sm" />
                      <div className="flex gap-2">
                        <div className="w-28">
                          <label className="text-[10px] text-gray-400">งบ (บาท)</label>
                          <input type="number" value={act.budget}
                            onChange={(e) => updateActivity(idx, "budget", Number(e.target.value))}
                            className="w-full rounded border px-2 py-1 text-xs" />
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] text-gray-400">เดือนที่ทำ (คลิกเลือก)</label>
                          <div className="flex flex-wrap gap-1">
                            {[10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((m) => (
                              <button key={m} type="button"
                                onClick={() => toggleMonth(idx, m)}
                                className={`rounded px-1.5 py-0.5 text-[10px] ${
                                  act.planned_months.includes(m)
                                    ? "bg-blue-500 text-white"
                                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                }`}>
                                {MONTH_LABELS[m]}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <input type="text" value={act.output}
                        onChange={(e) => updateActivity(idx, "output", e.target.value)}
                        placeholder="ผลผลิตที่คาดหวัง"
                        className="w-full rounded border px-2 py-1 text-xs text-gray-600" />
                    </div>
                    <button onClick={() => removeActivity(idx)}
                      className="mt-1 text-red-400 hover:text-red-600">&#10005;</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* KPI */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 font-semibold text-gray-800">4. ตัวชี้วัด</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500">เชิงปริมาณ (บรรทัดละ 1 ตัว)</label>
                <textarea value={parsed.kpi.quantitative.join("\n")}
                  onChange={(e) => setParsed({
                    ...parsed,
                    kpi: { ...parsed.kpi, quantitative: e.target.value.split("\n").filter(Boolean) }
                  })}
                  rows={4} className="w-full rounded border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500">เชิงคุณภาพ (บรรทัดละ 1 ตัว)</label>
                <textarea value={parsed.kpi.qualitative.join("\n")}
                  onChange={(e) => setParsed({
                    ...parsed,
                    kpi: { ...parsed.kpi, qualitative: e.target.value.split("\n").filter(Boolean) }
                  })}
                  rows={3} className="w-full rounded border px-3 py-2 text-sm" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs text-gray-500">เชิงเวลา</label>
                  <input type="text" value={parsed.kpi.time_target}
                    onChange={(e) => setParsed({
                      ...parsed,
                      kpi: { ...parsed.kpi, time_target: e.target.value }
                    })}
                    className="w-full rounded border px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">เชิงค่าใช้จ่าย</label>
                  <input type="text" value={parsed.kpi.budget_target}
                    onChange={(e) => setParsed({
                      ...parsed,
                      kpi: { ...parsed.kpi, budget_target: e.target.value }
                    })}
                    className="w-full rounded border px-3 py-2 text-sm" />
                </div>
              </div>
            </div>
          </div>

          {/* Save */}
          <div className="flex gap-3">
            <button onClick={() => setParsed(null)}
              className="flex-1 rounded border py-3 text-gray-600 hover:bg-gray-100">
              ยกเลิก / อ่านใหม่
            </button>
            <button onClick={handleSave} disabled={saving || matching}
              className="flex-1 rounded bg-royal-700 py-3 font-medium text-white hover:bg-royal-800 disabled:opacity-50">
              {matching ? "🔍 กำลังตรวจโครงการซ้ำ..." : saving ? "💾 กำลังบันทึก..." : "🔍 ตรวจซ้ำ → บันทึก"}
            </button>
          </div>

          {saveError && (
            <div className="rounded bg-red-50 p-3 text-sm text-red-700">{saveError}</div>
          )}
        </div>
      )}

      {/* ===== Match Decision Modal ===== */}
      {showMatchModal && matchCandidates && parsed && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !saving && setShowMatchModal(false)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex-shrink-0 bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold">🔍 พบโครงการที่อาจตรงกัน</h3>
                  <p className="text-xs text-white/80 mt-0.5">
                    เลือกว่าจะ <strong>อัปเดต</strong> โครงการเดิม (ใช้ ง9 เป็นข้อมูลละเอียด) หรือ <strong>สร้างใหม่</strong>
                  </p>
                </div>
                <button
                  onClick={() => !saving && setShowMatchModal(false)}
                  disabled={saving}
                  className="text-white/80 hover:text-white text-xl disabled:opacity-50"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 space-y-3 overflow-y-auto p-5 text-sm">
              {/* Source NGOR9 info */}
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-[11px] font-medium text-emerald-700">🆕 ข้อมูลจาก ง9 ที่กำลังจะบันทึก:</p>
                <p className="mt-1 font-medium text-emerald-900">{parsed.project_name}</p>
                <p className="text-xs text-emerald-700">
                  ผู้รับผิดชอบ: {parsed.responsible || "—"} · งบ: {Number(parsed.budget_total || 0).toLocaleString()} · ปี {fiscalYear}
                </p>
                <p className="mt-1 text-xs text-emerald-600">
                  กิจกรรม {parsed.activities?.length || 0} รายการ · KPI {(parsed.kpi.quantitative?.length || 0) + (parsed.kpi.qualitative?.length || 0) + (parsed.kpi.time_target ? 1 : 0) + (parsed.kpi.budget_target ? 1 : 0)} รายการ
                </p>
              </div>

              {/* Match candidates */}
              <p className="text-xs font-medium text-gray-700">
                โครงการที่ตรงกัน {matchCandidates.length} รายการ (เรียงตามคะแนน):
              </p>
              {matchCandidates.map((m, i) => {
                const isTop = i === 0;
                return (
                  <div
                    key={m.id}
                    className={`rounded-lg border-2 p-3 ${
                      isTop ? "border-amber-300 bg-amber-50" : "border-gray-200 bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {isTop && (
                            <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-medium text-white">
                              แนะนำ
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-gray-400">
                            score: {(m.score * 100).toFixed(0)}%
                          </span>
                        </div>
                        <p className="mt-1 font-medium text-gray-800">{m.project_name}</p>
                        <p className="text-xs text-gray-600">
                          ผู้รับผิดชอบ: {m.responsible || "—"} · ปี {m.fiscal_year || "—"}
                          {m.erp_code && (
                            <>
                              {" "}
                              · ERP: <code className="font-mono text-[10px]">{m.erp_code}</code>
                            </>
                          )}
                        </p>
                        <p className="text-xs text-gray-600">
                          งบ: {m.budget_total.toLocaleString()} · เบิก: {m.budget_used.toLocaleString()}
                        </p>
                        {m.signals.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {m.signals.map((s, si) => (
                              <span
                                key={si}
                                className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Budget comparison + strategy chooser (เฉพาะ row นี้) */}
                        {Math.abs(m.budget_total - Number(parsed.budget_total || 0)) > 1 &&
                          Number(parsed.budget_total || 0) > 0 && (
                            <div className="mt-2 rounded border border-gray-300 bg-white p-2">
                              <p className="text-[11px] font-medium text-gray-700">
                                ⚠ งบประมาณต่างกัน — ใช้ของไหน?
                              </p>
                              <div className="mt-1 flex flex-col gap-1">
                                <label className="flex cursor-pointer items-center gap-2 text-xs">
                                  <input
                                    type="radio"
                                    name={`budget-${m.id}`}
                                    checked={budgetStrategy === "keep"}
                                    onChange={() => setBudgetStrategy("keep")}
                                  />
                                  <span>
                                    เก็บของเดิม{" "}
                                    <strong className="text-blue-700">{m.budget_total.toLocaleString()}</strong>
                                    <span className="text-gray-400 text-[10px]"> (ปกติมาจาก Excel/ERP - แม่นกว่า)</span>
                                  </span>
                                </label>
                                <label className="flex cursor-pointer items-center gap-2 text-xs">
                                  <input
                                    type="radio"
                                    name={`budget-${m.id}`}
                                    checked={budgetStrategy === "ngor9"}
                                    onChange={() => setBudgetStrategy("ngor9")}
                                  />
                                  <span>
                                    ใช้ของ ง9{" "}
                                    <strong className="text-emerald-700">
                                      {Number(parsed.budget_total || 0).toLocaleString()}
                                    </strong>
                                    <span className="text-gray-400 text-[10px]"> (ถ้างบเดิมไม่สมเหตุสมผล)</span>
                                  </span>
                                </label>
                              </div>
                            </div>
                          )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => actuallySave(m.id, budgetStrategy)}
                          disabled={saving}
                          className={`whitespace-nowrap rounded px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 ${
                            isTop ? "bg-amber-600 hover:bg-amber-700" : "bg-blue-600 hover:bg-blue-700"
                          }`}
                        >
                          🔄 อัปเดตเข้าโครงการนี้
                        </button>
                        <a
                          href={`/projects/${m.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="whitespace-nowrap rounded border border-gray-300 px-3 py-1.5 text-center text-[11px] text-gray-600 hover:bg-gray-50"
                        >
                          🔗 ดูของเดิม
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 border-t bg-gray-50 px-5 py-3">
              <p className="mb-2 text-[11px] text-gray-500">
                หรือถ้าไม่ใช่โครงการเดียวกัน:
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => !saving && setShowMatchModal(false)}
                  disabled={saving}
                  className="flex-1 rounded border bg-white py-2 text-sm hover:bg-gray-100 disabled:opacity-50"
                >
                  ⬅ กลับไปแก้ไข
                </button>
                <button
                  onClick={() => actuallySave(null, "keep")}
                  disabled={saving}
                  className="flex-1 rounded bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {saving ? "⏳ กำลังบันทึก..." : "➕ สร้างเป็นโครงการใหม่"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== OpenRouter Models Browser Modal ===== */}
      {showOrModels && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowOrModels(false)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
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
                <button
                  onClick={() => setShowOrModels(false)}
                  className="text-white/80 hover:text-white text-xl"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-shrink-0 flex-wrap items-center gap-2 border-b bg-gray-50 px-4 py-2">
              <button
                onClick={() => setOrFilter("free")}
                className={`rounded-full px-3 py-1 text-xs ${
                  orFilter === "free" ? "bg-emerald-600 text-white" : "border bg-white"
                }`}
              >
                ✨ ฟรี ({orModels?.free_count || 0})
              </button>
              <button
                onClick={() => setOrFilter("paid")}
                className={`rounded-full px-3 py-1 text-xs ${
                  orFilter === "paid" ? "bg-blue-600 text-white" : "border bg-white"
                }`}
              >
                💰 Premium ({orModels?.paid_count || 0})
              </button>
              <button
                onClick={() => setOrFilter("all")}
                className={`rounded-full px-3 py-1 text-xs ${
                  orFilter === "all" ? "bg-gray-600 text-white" : "border bg-white"
                }`}
              >
                ทั้งหมด ({orModels?.total || 0})
              </button>
              <label className="flex items-center gap-1 rounded-full border bg-white px-3 py-1 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={orVisionOnly}
                  onChange={(e) => setOrVisionOnly(e.target.checked)}
                  className="h-3 w-3"
                />
                📷 Vision เท่านั้น <span className="text-gray-400">(แนะนำสำหรับ PDF)</span>
              </label>
              <input
                type="text"
                value={orSearch}
                onChange={(e) => setOrSearch(e.target.value)}
                placeholder="🔍 ค้นหา model..."
                className="min-w-[160px] flex-1 rounded border px-3 py-1 text-xs"
              />
              <button
                onClick={fetchOrModels}
                disabled={orLoading}
                className="rounded border bg-white px-3 py-1 text-xs hover:bg-gray-50 disabled:opacity-50"
              >
                {orLoading ? "⏳" : "🔄"} Refresh
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2">
              {orLoading ? (
                <p className="py-12 text-center text-sm text-gray-400">กำลังโหลด...</p>
              ) : !orModels ? (
                <p className="py-12 text-center text-sm text-gray-400">ไม่มีข้อมูล</p>
              ) : (
                <div className="space-y-1">
                  {(orFilter === "free"
                    ? orModels.free
                    : orFilter === "paid"
                    ? orModels.paid
                    : orModels.all
                  )
                    .filter(
                      (m) =>
                        (!orSearch ||
                          m.id.toLowerCase().includes(orSearch.toLowerCase()) ||
                          m.name?.toLowerCase().includes(orSearch.toLowerCase())) &&
                        (!orVisionOnly || m.has_vision)
                    )
                    .slice(0, 200)
                    .map((m) => {
                      const active = model === m.id;
                      return (
                        <div
                          key={m.id}
                          className={`flex items-start gap-2 rounded-lg p-2 transition ${
                            active
                              ? "bg-orange-50 border border-orange-300"
                              : "border border-transparent hover:bg-gray-50"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-mono text-xs font-semibold">{m.id}</span>
                              {m.is_free && (
                                <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-700">
                                  FREE
                                </span>
                              )}
                              {m.has_vision && (
                                <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] text-violet-700">
                                  📷 Vision
                                </span>
                              )}
                              {!m.is_free && (
                                <span className="text-[10px] text-gray-500">{m.price}</span>
                              )}
                            </div>
                            <p className="mt-0.5 text-[10px] text-gray-400">
                              {m.provider}
                              {m.context_length > 0 && (
                                <> · {(m.context_length / 1000).toFixed(0)}k ctx</>
                              )}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setModel(m.id);
                              setShowOrModels(false);
                            }}
                            className="flex-shrink-0 rounded bg-orange-100 px-2 py-1 text-[10px] text-orange-700 hover:bg-orange-200"
                          >
                            {active ? "✓ ใช้อยู่" : "ใช้ตัวนี้"}
                          </button>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Footer hint */}
            <div className="flex-shrink-0 border-t bg-gray-50 px-4 py-2 text-[10px] text-gray-500">
              💡 Tip: PDF parsing ใช้ <code className="font-mono">file-parser</code> plugin · models ที่มี <span className="text-violet-700">📷 Vision</span> จะอ่าน PDF ได้แม่นกว่า
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
