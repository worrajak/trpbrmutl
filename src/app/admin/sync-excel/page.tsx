"use client";

import { useState, useRef } from "react";

type Mode = "upload" | "gdrive" | "sheets" | "ai";
type AiProvider = "gemini" | "claude" | "openai" | "local";

interface SyncResult {
  success: boolean;
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

const AI_PROVIDERS: { value: AiProvider; label: string; hint: string }[] = [
  { value: "gemini", label: "Google Gemini (แนะนำ)", hint: "aistudio.google.com" },
  { value: "claude", label: "Claude (Anthropic)", hint: "console.anthropic.com" },
  { value: "openai", label: "OpenAI GPT-4o Mini", hint: "platform.openai.com" },
  { value: "local", label: "🖥️ Local AI (ฟรี)", hint: "Ollama / LM Studio / Jan" },
];

export default function SyncExcelPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  const [mode, setMode] = useState<Mode>("ai");
  const [gdriveId, setGdriveId] = useState("");
  const [sheetsUrl, setSheetsUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [aiProvider, setAiProvider] = useState<AiProvider>("gemini");
  const [apiKey, setApiKey] = useState("");
  const [localBaseUrl, setLocalBaseUrl] = useState("http://localhost:11434");
  const [localModel, setLocalModel] = useState("llama3");

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"idle" | "preview" | "done">("idle");
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleAuth() {
    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) setAuthed(true);
    else setAuthError("รหัสผ่านไม่ถูกต้อง");
  }

  async function getFileBase64(): Promise<string | null> {
    if (!file) return null;
    return fileToBase64(file);
  }

  // Step 1: AI อ่าน Excel → preview
  async function handleAiPreview() {
    setLoading(true);
    setError("");
    setPreview([]);
    setStep("idle");

    if (aiProvider !== "local" && !apiKey) { setError("กรุณาใส่ API Key"); setLoading(false); return; }

    let body: Record<string, unknown>;
    if (mode === "sheets") {
      if (!sheetsUrl) { setError("กรุณาใส่ Google Sheets URL"); setLoading(false); return; }
      body = { sheets_url: sheetsUrl, ai_provider: aiProvider, api_key: apiKey,
               local_base_url: localBaseUrl, local_model: localModel, preview_only: true };
    } else {
      const base64 = await getFileBase64();
      if (!base64) { setError("กรุณาเลือกไฟล์ Excel"); setLoading(false); return; }
      body = { file_base64: base64, ai_provider: aiProvider, api_key: apiKey,
               local_base_url: localBaseUrl, local_model: localModel, preview_only: true };
    }

    const res = await fetch("/api/supabase/ai-sync-excel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) { setError(data.error || "เกิดข้อผิดพลาด"); return; }
    setPreview(data.preview || []);
    setStep("preview");
  }

  // Step 2: ยืนยัน → sync จริง
  async function handleConfirmSync() {
    setLoading(true);
    setError("");

    let body: Record<string, unknown>;
    if (mode === "sheets") {
      body = { sheets_url: sheetsUrl, ai_provider: aiProvider, api_key: apiKey,
               local_base_url: localBaseUrl, local_model: localModel };
    } else {
      const base64 = await getFileBase64();
      if (!base64) { setError("ไฟล์หายไป กรุณาเลือกใหม่"); setLoading(false); return; }
      body = { file_base64: base64, ai_provider: aiProvider, api_key: apiKey,
               local_base_url: localBaseUrl, local_model: localModel };
    }

    const res = await fetch("/api/supabase/ai-sync-excel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) { setError(data.error || "เกิดข้อผิดพลาด"); return; }
    setResult(data);
    setStep("done");
  }

  // Manual sync (ไม่ใช้ AI)
  async function handleManualSync() {
    setLoading(true);
    setError("");
    setResult(null);
    setStep("idle");

    let body: Record<string, string> = {};

    if (mode === "gdrive") {
      const fileId = extractGdriveId(gdriveId);
      if (!fileId) { setError("Google Drive ID ไม่ถูกต้อง"); setLoading(false); return; }
      body = { gdrive_file_id: fileId };
    } else if (mode === "sheets") {
      if (!sheetsUrl) { setError("กรุณาใส่ Google Sheets URL"); setLoading(false); return; }
      body = { sheets_url: sheetsUrl };
    } else {
      const base64 = await getFileBase64();
      if (!base64) { setError("กรุณาเลือกไฟล์ Excel"); setLoading(false); return; }
      body = { file_base64: base64 };
    }

    const res = await fetch("/api/supabase/sync-excel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) setError(data.error || "เกิดข้อผิดพลาด");
    else { setResult(data); setStep("done"); }
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-xl shadow w-80">
          <h2 className="text-xl font-bold mb-4 text-center">Admin Login</h2>
          <input
            type="password"
            className="w-full border rounded px-3 py-2 mb-3"
            placeholder="รหัสผ่าน Admin"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAuth()}
          />
          {authError && <p className="text-red-500 text-sm mb-2">{authError}</p>}
          <button onClick={handleAuth} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
            เข้าสู่ระบบ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-1">Sync งบประมาณจาก Excel</h1>
      <p className="text-gray-500 text-sm mb-6">
        อัปเดต budget_total / budget_used / budget_remaining ใน Supabase ผ่าน ERP code
      </p>

      {/* Mode tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { key: "ai", label: "✨ AI + Upload" },
          { key: "sheets", label: "📊 Google Sheets" },
          { key: "upload", label: "📁 Upload (manual)" },
          { key: "gdrive", label: "☁️ Google Drive" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setMode(key as Mode); setStep("idle"); setError(""); setResult(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              mode === key ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="bg-white border rounded-xl p-6 mb-4 space-y-4">

        {/* Google Sheets URL */}
        {mode === "sheets" && (
          <div>
            <label className="block text-sm font-medium mb-2">Google Sheets URL</label>
            <input type="text" className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="https://docs.google.com/spreadsheets/d/..."
              value={sheetsUrl} onChange={(e) => setSheetsUrl(e.target.value)} />
            <p className="text-xs text-gray-400 mt-1">⚠️ ต้อง Share เป็น &quot;Anyone with the link&quot;</p>
          </div>
        )}

        {/* File picker (ใช้ทั้ง ai และ upload) */}
        {(mode === "ai" || mode === "upload") && (
          <div>
            <label className="block text-sm font-medium mb-2">เลือกไฟล์ Excel (.xlsx)</label>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
              onChange={(e) => { setFile(e.target.files?.[0] ?? null); setStep("idle"); setResult(null); }} />
            <div onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition">
              {file
                ? <p className="text-green-600 font-medium">✓ {file.name}</p>
                : <p className="text-gray-400">คลิกเพื่อเลือกไฟล์ หรือลากมาวาง</p>}
            </div>
          </div>
        )}

        {/* Google Drive URL */}
        {mode === "gdrive" && (
          <div>
            <label className="block text-sm font-medium mb-2">Google Drive File ID หรือ URL</label>
            <input type="text" className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="เช่น 1ABC...xyz หรือ https://drive.google.com/file/d/1ABC.../view"
              value={gdriveId} onChange={(e) => setGdriveId(e.target.value)} />
            <p className="text-xs text-gray-400 mt-1">⚠️ ต้องตั้งค่า Share เป็น &quot;Anyone with the link&quot;</p>
          </div>
        )}

        {/* AI Provider settings */}
        {(mode === "ai" || mode === "sheets") && (
          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-medium text-purple-700">⚙️ ตั้งค่า AI</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {AI_PROVIDERS.map((p) => (
                <button key={p.value} onClick={() => setAiProvider(p.value)}
                  className={`p-3 rounded-lg border text-left text-sm transition ${
                    aiProvider === p.value ? "border-purple-500 bg-purple-50" : "border-gray-200 hover:border-gray-300"
                  }`}>
                  <p className="font-medium">{p.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{p.hint}</p>
                </button>
              ))}
            </div>
            {aiProvider === "local" ? (
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Base URL</label>
                  <input type="text" className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="http://localhost:11434"
                    value={localBaseUrl} onChange={(e) => setLocalBaseUrl(e.target.value)} />
                  <p className="text-xs text-gray-400 mt-1">
                    Ollama: 11434 · LM Studio: 1234 · Jan: 1337
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Model name</label>
                  <input type="text" className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="เช่น llama3, gemma3, typhoon2"
                    value={localModel} onChange={(e) => setLocalModel(e.target.value)} />
                </div>
              </div>
            ) : (
              <input type="password" className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder={`API Key สำหรับ ${AI_PROVIDERS.find(p => p.value === aiProvider)?.label}`}
                value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
            )}
          </div>
        )}
      </div>

      {/* Action buttons */}
      {(mode === "ai" || mode === "sheets") ? (
        <div className="space-y-3">
          {step !== "preview" && (
            <button onClick={handleAiPreview} disabled={loading}
              className="w-full bg-purple-600 text-white py-3 rounded-xl font-medium hover:bg-purple-700 disabled:opacity-50">
              {loading ? "⏳ AI กำลังอ่าน Excel..." : "✨ ให้ AI อ่าน Excel → Preview"}
            </button>
          )}

          {/* Preview table */}
          {step === "preview" && preview.length > 0 && (
            <div className="bg-white border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-gray-700">AI อ่านได้ {preview.length} โครงการ</p>
                <button onClick={() => setStep("idle")} className="text-xs text-gray-400 hover:text-gray-600">
                  ← กลับ
                </button>
              </div>
              <div className="overflow-x-auto max-h-72 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr>
                      <th className="text-left p-2 font-medium text-gray-600">ERP Code</th>
                      <th className="text-right p-2 font-medium text-gray-600">งบรวม</th>
                      <th className="text-right p-2 font-medium text-gray-600">เบิกจ่าย</th>
                      <th className="text-right p-2 font-medium text-gray-600">คงเหลือ</th>
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
              <button onClick={handleConfirmSync} disabled={loading}
                className="w-full mt-4 bg-green-600 text-white py-3 rounded-xl font-medium hover:bg-green-700 disabled:opacity-50">
                {loading ? "⏳ กำลัง Sync..." : `✅ ยืนยัน Sync ${preview.length} รายการ → Supabase`}
              </button>
            </div>
          )}
        </div>
      ) : (
        <button onClick={handleManualSync} disabled={loading}
          className="w-full bg-green-600 text-white py-3 rounded-xl font-medium hover:bg-green-700 disabled:opacity-50">
          {loading ? "⏳ กำลัง Sync..." : "🔄 Sync งบประมาณ → Supabase"}
        </button>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-600 text-sm">❌ {error}</p>
        </div>
      )}

      {/* Result */}
      {step === "done" && result && (
        <div className="mt-4 bg-white border rounded-xl p-6">
          <h3 className="font-bold text-lg mb-4 text-green-700">✅ Sync สำเร็จ</h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            {[
              { label: "พบใน Excel", value: result.total_parsed, color: "blue" },
              { label: "อัปเดตสำเร็จ", value: result.updated, color: "green" },
              { label: "ไม่พบใน DB", value: result.not_found.length, color: "yellow" },
            ].map(({ label, value, color }) => (
              <div key={label} className={`bg-${color}-50 rounded-lg p-3 text-center`}>
                <p className={`text-2xl font-bold text-${color}-700`}>{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            ))}
          </div>

          {result.not_found.length > 0 && (
            <div className="mb-3">
              <p className="text-sm font-medium text-yellow-700 mb-1">ERP code ที่ไม่พบใน Supabase:</p>
              <div className="bg-yellow-50 rounded p-2 text-xs text-gray-600 max-h-28 overflow-y-auto font-mono">
                {result.not_found.map((c) => <p key={c}>{c}</p>)}
              </div>
            </div>
          )}

          {result.errors.length > 0 && (
            <div>
              <p className="text-sm font-medium text-red-700 mb-1">Errors:</p>
              <div className="bg-red-50 rounded p-2 text-xs text-red-600 max-h-28 overflow-y-auto">
                {result.errors.map((e, i) => <p key={i}>{e}</p>)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function extractGdriveId(input: string): string {
  const match = input.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  if (/^[a-zA-Z0-9_-]{20,}$/.test(input.trim())) return input.trim();
  return "";
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
