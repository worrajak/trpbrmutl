"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * AiSettingsBar — ตั้งค่า OpenRouter (key + model)
 *
 * Storage priority:
 *   1. Server (table app_settings) — share ทุก device · มี delete
 *   2. localStorage (browser) — fallback · เร็ว
 *
 * Buttons:
 *   - 🔌 Connect       — test key + load models
 *   - 🌐 Browse        — เปิด modal เลือก model
 *   - 💾 Save Server   — POST → table app_settings
 *   - 🗑 Clear All     — ลบทั้ง server + localStorage
 */

const OR_STORAGE = "rpf_openrouter_settings";

export interface OrModelInfo {
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

interface KeyTestResult {
  ok: boolean;
  label?: string | null;
  usage?: number | null;
  limit?: number | null;
  limit_remaining?: number | null;
  is_free_tier?: boolean;
  error?: string;
}

interface ServerSettings {
  api_key?: string;
  model?: string;
  updated_at?: string;
  updated_by?: string;
}

interface Props {
  defaultModel?: string;
  visionRequired?: boolean;
  onChange?: (settings: { api_key: string; model: string }) => void;
  compact?: boolean;
}

type Source = "server" | "browser" | "none";

export default function AiSettingsBar({
  defaultModel = "anthropic/claude-haiku-4.5",
  visionRequired = false,
  onChange,
  compact = false,
}: Props) {
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(defaultModel);
  const [showKey, setShowKey] = useState(false);
  const [source, setSource] = useState<Source>("none");
  const [serverInfo, setServerInfo] = useState<ServerSettings | null>(null);

  // Connect / test
  const [testing, setTesting] = useState(false);
  const [keyTest, setKeyTest] = useState<KeyTestResult | null>(null);

  // Save / clear
  const [savingServer, setSavingServer] = useState(false);
  const [savedTick, setSavedTick] = useState(false);

  // Models browser
  const [showModels, setShowModels] = useState(false);
  const [orModels, setOrModels] = useState<OrModelList | null>(null);
  const [orLoading, setOrLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "free" | "paid">("paid");
  const [search, setSearch] = useState("");
  const [visionOnly, setVisionOnly] = useState(visionRequired);

  // ===== Load on mount: server first → fallback localStorage =====
  useEffect(() => {
    let mounted = true;

    async function loadInitial() {
      // 1. Try server first
      try {
        const res = await fetch("/api/admin/settings/openrouter", { cache: "no-store" });
        if (res.ok) {
          const data: ServerSettings = await res.json();
          if (data.api_key || data.model) {
            if (!mounted) return;
            if (data.api_key) setApiKey(data.api_key);
            if (data.model) setModel(data.model);
            setSource("server");
            setServerInfo(data);
            // Sync to localStorage too
            localStorage.setItem(OR_STORAGE, JSON.stringify({ api_key: data.api_key || "", model: data.model || "" }));
            return;
          }
        }
      } catch { /* network error — fallback */ }

      // 2. Fallback localStorage
      try {
        const raw = localStorage.getItem(OR_STORAGE);
        if (raw && mounted) {
          const cfg = JSON.parse(raw);
          if (cfg.api_key) setApiKey(cfg.api_key);
          if (cfg.model) setModel(cfg.model);
          if (cfg.api_key || cfg.model) setSource("browser");
        }
      } catch { /* ignore */ }
    }

    void loadInitial();
    return () => { mounted = false; };
  }, []);

  // Auto-save to localStorage on change (always)
  useEffect(() => {
    if (!apiKey && !model) return;
    try {
      localStorage.setItem(OR_STORAGE, JSON.stringify({ api_key: apiKey, model }));
      onChange?.({ api_key: apiKey, model });
    } catch { /* ignore */ }
  }, [apiKey, model, onChange]);

  // ===== Connect (test + load models) =====
  const handleConnect = useCallback(async () => {
    if (!apiKey) {
      setKeyTest({ ok: false, error: "กรุณาใส่ API Key ก่อน" });
      return;
    }
    setTesting(true);
    setKeyTest(null);
    try {
      const [testRes, modelsRes] = await Promise.all([
        fetch("/api/openrouter/test-key", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ api_key: apiKey }),
        }),
        fetch("/api/ai-models"),
      ]);
      const testData = (await testRes.json()) as KeyTestResult;
      setKeyTest(testData);
      if (modelsRes.ok) setOrModels(await modelsRes.json());
    } catch (err: unknown) {
      setKeyTest({ ok: false, error: err instanceof Error ? err.message : "ทดสอบไม่สำเร็จ" });
    } finally {
      setTesting(false);
    }
  }, [apiKey]);

  // ===== Save to Server =====
  async function handleSaveServer() {
    if (!apiKey) {
      alert("กรุณาใส่ API Key ก่อน");
      return;
    }
    setSavingServer(true);
    try {
      const res = await fetch("/api/admin/settings/openrouter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: apiKey, model, updated_by: "admin" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "บันทึกไม่สำเร็จ");
      setSource("server");
      setServerInfo({ api_key: apiKey, model, updated_at: new Date().toISOString() });
      setSavedTick(true);
      setTimeout(() => setSavedTick(false), 2500);
    } catch (err: unknown) {
      alert("Save Server ไม่สำเร็จ: " + (err instanceof Error ? err.message : "?"));
    } finally {
      setSavingServer(false);
    }
  }

  // ===== Clear All (server + localStorage) =====
  async function handleClearAll() {
    if (!confirm("ลบ API key + model ทั้งใน server และ browser?")) return;
    try {
      await fetch("/api/admin/settings/openrouter", { method: "DELETE" });
    } catch { /* ignore network */ }
    try {
      localStorage.removeItem(OR_STORAGE);
    } catch { /* ignore */ }
    setApiKey("");
    setModel(defaultModel);
    setKeyTest(null);
    setSource("none");
    setServerInfo(null);
  }

  function selectModel(id: string) {
    setModel(id);
    setShowModels(false);
  }

  // Filter models
  const filteredModels = (() => {
    if (!orModels) return [];
    let base: OrModelInfo[] =
      filter === "free" ? orModels.free : filter === "paid" ? orModels.paid : orModels.all;
    if (visionOnly) base = base.filter((m) => m.has_vision);
    const q = search.trim().toLowerCase();
    if (q) base = base.filter((m) => m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q));
    return base;
  })();

  return (
    <div className="space-y-2">
      {/* Source indicator */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium text-slate-500 uppercase">
          🤖 OpenRouter Settings
        </span>
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full ring-1 ${
            source === "server"
              ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
              : source === "browser"
              ? "bg-blue-50 text-blue-700 ring-blue-200"
              : "bg-slate-50 text-slate-500 ring-slate-200"
          }`}
          title={
            source === "server"
              ? `บันทึกที่ Server · share ทุก device${serverInfo?.updated_at ? ` · ${new Date(serverInfo.updated_at).toLocaleString("th-TH")}` : ""}`
              : source === "browser"
              ? "บันทึกในเครื่องนี้เท่านั้น"
              : "ยังไม่ได้บันทึก"
          }
        >
          {source === "server" ? "🌐 Server" : source === "browser" ? "💻 Browser" : "❓ ไม่มี"}
        </span>
      </div>

      {/* API Key + Connect */}
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
            <span>🔑 API Key</span>
            <button type="button" onClick={() => setShowKey(!showKey)} className="text-[10px] text-slate-500 hover:text-slate-700">
              {showKey ? "🙈 ซ่อน" : "👁 แสดง"}
            </button>
          </label>
          <input
            type={showKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => { setApiKey(e.target.value); setKeyTest(null); }}
            placeholder="sk-or-v1-..."
            className="w-full rounded border px-3 py-2 text-sm font-mono"
          />
        </div>
        <button
          type="button"
          onClick={handleConnect}
          disabled={!apiKey || testing}
          className="rounded bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
        >
          {testing ? "⏳ Testing..." : "🔌 Connect"}
        </button>
      </div>

      {/* Test result */}
      {keyTest && !keyTest.ok && (
        <div className="rounded bg-red-50 ring-1 ring-red-200 p-2 text-xs text-red-700">
          ⚠ {keyTest.error}
        </div>
      )}
      {keyTest && keyTest.ok && (
        <div className="rounded bg-emerald-50 ring-1 ring-emerald-200 p-2 text-xs text-emerald-800 flex items-center justify-between gap-2 flex-wrap">
          <span>
            ✅ <strong>{keyTest.label || "OpenRouter Key"}</strong>
            {keyTest.is_free_tier && <span className="ml-1 text-amber-700">(Free)</span>}
          </span>
          {keyTest.limit != null && (
            <span className="text-[10px] text-emerald-700">
              💰 ${keyTest.usage?.toFixed(4) || "0"} / ${keyTest.limit?.toFixed(2)}
            </span>
          )}
        </div>
      )}

      {/* Model + Browse */}
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="text-xs font-bold text-slate-700">🤖 AI Model</label>
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="anthropic/claude-sonnet-4.5"
            className="w-full rounded border px-3 py-2 text-sm font-mono"
          />
        </div>
        <button
          type="button"
          onClick={() => { setShowModels(true); if (!orModels && apiKey) handleConnect(); }}
          className="rounded bg-purple-600 px-3 py-2 text-xs font-medium text-white hover:bg-purple-700 whitespace-nowrap"
        >
          🌐 Browse
        </button>
      </div>

      {/* Save / Clear buttons */}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={handleSaveServer}
          disabled={!apiKey || savingServer}
          className="flex-1 rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          title="บันทึกที่ Server — share ทุก device + browser"
        >
          {savingServer ? "⏳ กำลังบันทึก..." : savedTick ? "✅ บันทึกแล้ว" : "💾 Save to Server"}
        </button>
        <button
          type="button"
          onClick={handleClearAll}
          disabled={!apiKey && source === "none"}
          className="rounded bg-red-50 ring-1 ring-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
          title="ลบทั้ง Server + Browser"
        >
          🗑 ลบ
        </button>
      </div>

      {!compact && (
        <p className="text-[10px] text-slate-500 leading-relaxed">
          💡 <strong>Server</strong>: share ทุก device + admin ทุกคน · <strong>Browser</strong>: เครื่องนี้เท่านั้น (auto-save) ·
          ระบบโหลด Server ก่อน → fallback Browser
        </p>
      )}

      {/* ===== Models Browser Modal ===== */}
      {showModels && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowModels(false)}>
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="bg-purple-700 px-5 py-3 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold flex items-center gap-2">🌐 OpenRouter Models</h3>
                  {orModels && (
                    <p className="text-xs text-purple-100 mt-0.5">
                      ทั้งหมด {orModels.total} · ฟรี {orModels.free_count} · เสียเงิน {orModels.paid_count}
                    </p>
                  )}
                </div>
                <button onClick={() => setShowModels(false)} className="text-white/80 hover:text-white text-xl">✕</button>
              </div>
            </div>

            <div className="flex items-center gap-2 border-b bg-slate-50 px-4 py-2 flex-wrap">
              <button onClick={() => setFilter("free")} className={`rounded px-3 py-1 text-xs font-medium ${filter === "free" ? "bg-emerald-600 text-white" : "border bg-white"}`}>
                ✨ ฟรี ({orModels?.free_count || 0})
              </button>
              <button onClick={() => setFilter("paid")} className={`rounded px-3 py-1 text-xs font-medium ${filter === "paid" ? "bg-blue-600 text-white" : "border bg-white"}`}>
                💰 Premium ({orModels?.paid_count || 0})
              </button>
              <button onClick={() => setFilter("all")} className={`rounded px-3 py-1 text-xs font-medium ${filter === "all" ? "bg-gray-600 text-white" : "border bg-white"}`}>
                ทั้งหมด ({orModels?.total || 0})
              </button>
              <label className="ml-2 flex items-center gap-1 text-xs text-slate-700 cursor-pointer">
                <input type="checkbox" checked={visionOnly} onChange={(e) => setVisionOnly(e.target.checked)} />
                <span>👁 Vision</span>
              </label>
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 ค้นหา..." className="ml-auto flex-1 min-w-[150px] rounded border px-3 py-1 text-xs" />
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {orLoading ? (
                <p className="text-center py-8 text-slate-400 text-sm">⏳ กำลังโหลด...</p>
              ) : !orModels ? (
                <p className="text-center py-8 text-slate-400 text-sm">กด "🔌 Connect" ก่อนเพื่อโหลด models</p>
              ) : filteredModels.length === 0 ? (
                <p className="text-center py-8 text-slate-400 text-sm">ไม่พบ models</p>
              ) : (
                filteredModels.map((m) => (
                  <button key={m.id} onClick={() => selectModel(m.id)} className={`w-full text-left rounded-lg p-3 ring-1 transition ${
                    m.id === model ? "bg-purple-50 ring-purple-300 ring-2" : "bg-white ring-slate-200 hover:bg-slate-50 hover:ring-purple-200"
                  }`}>
                    <div className="flex items-center gap-1 flex-wrap">
                      <p className="font-bold text-sm text-slate-900">{m.name}</p>
                      {m.is_free && <span className="rounded-full bg-emerald-100 text-emerald-800 px-1.5 py-0.5 text-[9px] font-bold">FREE</span>}
                      {m.has_vision && <span className="rounded-full bg-blue-100 text-blue-800 px-1.5 py-0.5 text-[9px] font-bold">👁 VISION</span>}
                      {m.id === model && <span className="rounded-full bg-purple-600 text-white px-1.5 py-0.5 text-[9px] font-bold">✓ SELECTED</span>}
                    </div>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">{m.id}</p>
                    <p className="text-[10px] text-slate-600 mt-1">{m.provider} · {m.price} · ctx {(m.context_length / 1000).toFixed(0)}K</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
