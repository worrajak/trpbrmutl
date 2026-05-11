"use client";

import { useState, useEffect } from "react";

/**
 * AiSettingsBar — shared component สำหรับตั้งค่า OpenRouter
 *  - Input API Key + ปุ่ม "🔌 Connect" (test + load models)
 *  - Display key info (label, usage, limit)
 *  - Input model + ปุ่ม "🌐 Browse Models"
 *  - Auto-save localStorage (rpf_openrouter_settings)
 *
 * ใช้ใน: /admin (SyncExcel), /admin/upload-ngor9, /admin/briefs (AI Generate Modal)
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

interface Props {
  /** Initial values (จะ override โดย localStorage ถ้ามี) */
  defaultModel?: string;
  /** ระบุว่าหน้านี้ใช้ vision (จะ filter รุ่นที่ support เท่านั้น) */
  visionRequired?: boolean;
  /** Callback เมื่อ user เปลี่ยนค่า — auto-saved แล้ว */
  onChange?: (settings: { api_key: string; model: string }) => void;
  /** Compact mode (ซ่อน descriptions) */
  compact?: boolean;
}

export default function AiSettingsBar({
  defaultModel = "anthropic/claude-haiku-4.5",
  visionRequired = false,
  onChange,
  compact = false,
}: Props) {
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(defaultModel);
  const [showKey, setShowKey] = useState(false);

  // Connect / test
  const [testing, setTesting] = useState(false);
  const [keyTest, setKeyTest] = useState<KeyTestResult | null>(null);

  // Models browser
  const [showModels, setShowModels] = useState(false);
  const [orModels, setOrModels] = useState<OrModelList | null>(null);
  const [orLoading, setOrLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "free" | "paid">("paid");
  const [search, setSearch] = useState("");
  const [visionOnly, setVisionOnly] = useState(visionRequired);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(OR_STORAGE);
      if (raw) {
        const cfg = JSON.parse(raw);
        if (cfg.api_key) setApiKey(cfg.api_key);
        if (cfg.model) setModel(cfg.model);
      }
    } catch { /* ignore */ }
  }, []);

  // Save to localStorage when key/model changes (debounced via effect)
  useEffect(() => {
    if (!apiKey && !model) return;
    try {
      localStorage.setItem(OR_STORAGE, JSON.stringify({ api_key: apiKey, model }));
      onChange?.({ api_key: apiKey, model });
    } catch { /* ignore */ }
  }, [apiKey, model, onChange]);

  async function handleConnect() {
    if (!apiKey) {
      setKeyTest({ ok: false, error: "กรุณาใส่ API Key ก่อน" });
      return;
    }
    setTesting(true);
    setKeyTest(null);
    try {
      // Parallel: test key + load models
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
      if (modelsRes.ok) {
        const m = await modelsRes.json();
        setOrModels(m);
      }
    } catch (err: unknown) {
      setKeyTest({ ok: false, error: err instanceof Error ? err.message : "ทดสอบไม่สำเร็จ" });
    } finally {
      setTesting(false);
    }
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
      {/* API Key + Connect */}
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
            <span>🔑 OpenRouter API Key</span>
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
          title="ทดสอบ key + โหลดรายการ models"
        >
          {testing ? "⏳ Connecting..." : "🔌 Connect"}
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
            {keyTest.is_free_tier && <span className="ml-1 text-amber-700">(Free tier)</span>}
          </span>
          {keyTest.limit != null && (
            <span className="text-[10px] text-emerald-700">
              💰 ใช้ ${keyTest.usage?.toFixed(4) || "0"} / ${keyTest.limit?.toFixed(2)}
              · เหลือ ${keyTest.limit_remaining?.toFixed(2)}
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
          title="เปิดรายการ models"
        >
          🌐 Browse
        </button>
      </div>

      {!compact && (
        <p className="text-[10px] text-slate-500">
          💡 ค่าจะถูก auto-save ที่ localStorage · ใช้ร่วมกับหน้า /admin, /admin/upload-ngor9, /admin/briefs
        </p>
      )}

      {/* ===== Models Browser Modal ===== */}
      {showModels && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowModels(false)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
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

            {/* Filters */}
            <div className="flex items-center gap-2 border-b bg-slate-50 px-4 py-2 flex-wrap">
              <button
                onClick={() => setFilter("free")}
                className={`rounded px-3 py-1 text-xs font-medium ${filter === "free" ? "bg-emerald-600 text-white" : "border bg-white"}`}
              >
                ✨ ฟรี ({orModels?.free_count || 0})
              </button>
              <button
                onClick={() => setFilter("paid")}
                className={`rounded px-3 py-1 text-xs font-medium ${filter === "paid" ? "bg-blue-600 text-white" : "border bg-white"}`}
              >
                💰 Premium ({orModels?.paid_count || 0})
              </button>
              <button
                onClick={() => setFilter("all")}
                className={`rounded px-3 py-1 text-xs font-medium ${filter === "all" ? "bg-gray-600 text-white" : "border bg-white"}`}
              >
                ทั้งหมด ({orModels?.total || 0})
              </button>
              <label className="ml-2 flex items-center gap-1 text-xs text-slate-700 cursor-pointer">
                <input type="checkbox" checked={visionOnly} onChange={(e) => setVisionOnly(e.target.checked)} />
                <span>👁 Vision เท่านั้น</span>
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="🔍 ค้นหา..."
                className="ml-auto flex-1 min-w-[150px] rounded border px-3 py-1 text-xs"
              />
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {orLoading ? (
                <p className="text-center py-8 text-slate-400 text-sm">⏳ กำลังโหลด...</p>
              ) : !orModels ? (
                <p className="text-center py-8 text-slate-400 text-sm">
                  กด "🔌 Connect" ก่อนเพื่อโหลด models
                </p>
              ) : filteredModels.length === 0 ? (
                <p className="text-center py-8 text-slate-400 text-sm">ไม่พบ models</p>
              ) : (
                filteredModels.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => selectModel(m.id)}
                    className={`w-full text-left rounded-lg p-3 ring-1 transition ${
                      m.id === model
                        ? "bg-purple-50 ring-purple-300 ring-2"
                        : "bg-white ring-slate-200 hover:bg-slate-50 hover:ring-purple-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 flex-wrap">
                          <p className="font-bold text-sm text-slate-900">{m.name}</p>
                          {m.is_free && (
                            <span className="rounded-full bg-emerald-100 text-emerald-800 px-1.5 py-0.5 text-[9px] font-bold">FREE</span>
                          )}
                          {m.has_vision && (
                            <span className="rounded-full bg-blue-100 text-blue-800 px-1.5 py-0.5 text-[9px] font-bold">👁 VISION</span>
                          )}
                          {m.id === model && (
                            <span className="rounded-full bg-purple-600 text-white px-1.5 py-0.5 text-[9px] font-bold">✓ SELECTED</span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">{m.id}</p>
                        <p className="text-[10px] text-slate-600 mt-1">
                          {m.provider} · {m.price} · ctx {(m.context_length / 1000).toFixed(0)}K
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="border-t bg-slate-50 px-4 py-2 text-[10px] text-slate-500 text-center">
              💾 คลิก model → save อัตโนมัติ · ใช้กับทุกหน้า admin
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
