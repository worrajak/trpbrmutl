"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { renderTag, LEVEL_META } from "@/lib/researcher-tags";
import {
  BRIEF_STATUS_META,
  BRIEF_MODE_META,
  type MatchScore,
} from "@/lib/brief-matching";
import { EXCELLENCE_KPIS } from "@/lib/excellence-kpi";

const OR_STORAGE = "rpf_openrouter_settings";

interface AiRerankItem {
  researcher_id: string;
  ai_score: number;
  fitness_label: string;
  reasons: string[];
  concerns: string[];
}

interface Ngor9Draft {
  project_name: string;
  responsible: string;
  responsible_title?: string;
  organization?: string;
  budget_total: number;
  project_period?: string;
  site?: string;
  main_program: string;
  activities: Array<{ order: number; name: string; budget: number; planned_months: number[]; output: string }>;
  kpi: { quantitative?: string[]; qualitative?: string[]; time_target?: string; budget_target?: string };
  budget_breakdown?: { compensation_pct: number; supplies_pct: number; operating_pct: number; rationale: string };
  ai_notes?: string[];
}

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
  assigned_researcher_id: string | null;
  mentor_researcher_id: string | null;
  status: string;
  deadline: string | null;
  notes: string | null;
  created_at: string;
}

interface Interest {
  id: string;
  researcher_id: string;
  note: string | null;
  status: string;
  submitted_at: string;
  researcher: {
    id: string;
    name: string;
    title: string | null;
    faculty: string | null;
    level: "junior" | "mid" | "senior";
    expertise_tags: string[];
    areas: string[];
    current_load: number;
  } | null;
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString("th-TH");
}

export default function BriefDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [brief, setBrief] = useState<Brief | null>(null);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [matches, setMatches] = useState<MatchScore[]>([]);
  const [aiRanking, setAiRanking] = useState<AiRerankItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [aiRerankBusy, setAiRerankBusy] = useState(false);
  const [aiNgor9Busy, setAiNgor9Busy] = useState(false);
  const [draft, setDraft] = useState<Ngor9Draft | null>(null);
  const [aiError, setAiError] = useState("");

  // OpenRouter settings (shared กับ /admin)
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("anthropic/claude-haiku-4.5");

  // Session info
  const [isAdmin, setIsAdmin] = useState(false);
  const [isTeam, setIsTeam] = useState(false);

  useEffect(() => {
    setIsAdmin(sessionStorage.getItem("admin_auth") === "true");
    setIsTeam(sessionStorage.getItem("team_auth") === "true");
    try {
      const raw = localStorage.getItem(OR_STORAGE);
      if (raw) {
        const cfg = JSON.parse(raw);
        if (cfg.api_key) setApiKey(cfg.api_key);
        if (cfg.model) setModel(cfg.model);
      }
    } catch { /* ignore */ }
    void load();
  }, [id]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/briefs/${id}`, { cache: "no-store" });
      const data = await res.json();
      setBrief(data.brief);
      setInterests(data.interests || []);
    } finally {
      setLoading(false);
    }
  }

  async function loadMatches() {
    setMatchingLoading(true);
    try {
      const res = await fetch(`/api/admin/briefs/${id}/match?limit=10`, { cache: "no-store" });
      const data = await res.json();
      setMatches(data.matches || []);
    } finally {
      setMatchingLoading(false);
    }
  }

  async function runAiRerank() {
    if (!apiKey) {
      setAiError("ต้องตั้งค่า OpenRouter API key ที่ /admin ก่อน");
      return;
    }
    setAiRerankBusy(true);
    setAiError("");
    try {
      const res = await fetch(`/api/admin/briefs/${id}/ai-rerank`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: apiKey, model }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI rerank ล้มเหลว");
      setMatches(data.skill_ranking || []);
      setAiRanking(data.ai_ranking || null);
      if (data.ai_error) setAiError("AI: " + data.ai_error);
    } catch (err: unknown) {
      setAiError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setAiRerankBusy(false);
    }
  }

  async function generateNgor9(researcherId: string) {
    if (!apiKey) {
      setAiError("ต้องตั้งค่า OpenRouter API key ที่ /admin ก่อน");
      return;
    }
    setAiNgor9Busy(true);
    setAiError("");
    setDraft(null);
    try {
      const res = await fetch(`/api/admin/briefs/${id}/ai-ngor9`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          researcher_id: researcherId,
          api_key: apiKey,
          model: model.includes("haiku") ? "anthropic/claude-sonnet-4.5" : model,
          save_draft: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI generate ล้มเหลว");
      setDraft(data.draft);
    } catch (err: unknown) {
      setAiError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setAiNgor9Busy(false);
    }
  }

  async function changeInterestStatus(interestId: string, status: string) {
    const res = await fetch(`/api/admin/briefs/${id}/interest`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interest_id: interestId, status }),
    });
    if (res.ok) await load();
    else alert("เปลี่ยน status ไม่สำเร็จ");
  }

  if (loading) return <div className="text-center py-12 text-slate-400">กำลังโหลด...</div>;
  if (!brief) return <div className="text-center py-12 text-slate-400">ไม่พบ brief</div>;

  const stat = BRIEF_STATUS_META[brief.status];
  const mod = BRIEF_MODE_META[brief.mode];
  const canManage = isAdmin || isTeam;

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="text-xs text-slate-500">
        <Link href="/briefs" className="hover:underline">📢 Briefs</Link>
        {" / "}
        <span className="text-slate-700">{brief.title.substring(0, 50)}...</span>
      </div>

      {/* Header */}
      <section className="rounded-xl bg-violet-700 p-5 sm:p-6 text-white shadow-lg shadow-violet-500/20">
        <div className="flex items-center gap-1.5 flex-wrap mb-2">
          <span className={`rounded-full bg-white/20 backdrop-blur px-2 py-0.5 text-xs font-bold text-white ring-1 ring-white/30`}>
            {stat?.emoji} {stat?.label}
          </span>
          <span className={`rounded-full bg-white/20 backdrop-blur px-2 py-0.5 text-xs font-bold text-white ring-1 ring-white/30`}>
            {mod?.emoji} {mod?.label}
          </span>
          {brief.deadline && (
            <span className="rounded-full bg-amber-300/30 backdrop-blur px-2 py-0.5 text-xs text-amber-100 ring-1 ring-amber-200/50">
              ⏰ ปิดรับ {new Date(brief.deadline).toLocaleDateString("th-TH")}
            </span>
          )}
        </div>
        <h1 className="text-xl sm:text-2xl font-bold drop-shadow text-white leading-snug">
          {brief.title}
        </h1>
        <p className="mt-3 text-sm text-violet-50 leading-relaxed whitespace-pre-line">
          {brief.problem_statement}
        </p>

        {/* Meta */}
        <div className="mt-4 grid sm:grid-cols-3 gap-3">
          <div className="rounded-lg bg-white/15 backdrop-blur p-3 ring-1 ring-white/20">
            <p className="text-[10px] uppercase text-violet-50/85">พื้นที่</p>
            <p className="text-sm font-bold text-white mt-0.5">📍 {brief.location || "—"}</p>
          </div>
          <div className="rounded-lg bg-white/15 backdrop-blur p-3 ring-1 ring-white/20">
            <p className="text-[10px] uppercase text-violet-50/85">งบประมาณ</p>
            <p className="text-sm font-bold text-white mt-0.5">
              💰 {brief.budget_min || brief.budget_max
                ? `${fmt(Number(brief.budget_min || 0))}-${fmt(Number(brief.budget_max || 0))} บาท`
                : "ยืดหยุ่น"}
            </p>
          </div>
          <div className="rounded-lg bg-white/15 backdrop-blur p-3 ring-1 ring-white/20">
            <p className="text-[10px] uppercase text-violet-50/85">กลุ่มเป้าหมาย</p>
            <p className="text-sm font-bold text-white mt-0.5">👥 {brief.target_audience || "—"}</p>
          </div>
        </div>
      </section>

      {/* Required skills + KPIs */}
      <div className="grid sm:grid-cols-2 gap-3">
        {/* Required skills */}
        <div className="rounded-lg bg-white ring-1 ring-slate-200 p-4">
          <h3 className="text-sm font-bold text-slate-800 mb-2">🏷 เชี่ยวชาญที่ต้องการ</h3>
          {brief.required_skills.length === 0 ? (
            <p className="text-xs text-slate-400">— ไม่ได้ระบุ —</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {brief.required_skills.map((slug) => {
                const t = renderTag(slug);
                return (
                  <span key={slug} className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs ring-1 ${t.color}`}>
                    <span>{t.emoji}</span>
                    <span>{t.label}</span>
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Target KPIs */}
        <div className="rounded-lg bg-white ring-1 ring-slate-200 p-4">
          <h3 className="text-sm font-bold text-slate-800 mb-2">🎯 ตอบ KPI</h3>
          {brief.target_kpis.length === 0 ? (
            <p className="text-xs text-slate-400">— ไม่ได้ระบุ —</p>
          ) : (
            <ul className="space-y-1">
              {brief.target_kpis.map((code) => {
                const kpi = EXCELLENCE_KPIS.find((k) => k.code === code);
                return (
                  <li key={code} className="flex items-start gap-2 text-xs">
                    <code className="rounded bg-blue-50 px-1.5 py-0.5 text-blue-700 ring-1 ring-blue-200 font-mono flex-shrink-0">{code}</code>
                    <span className="text-slate-700">{kpi?.name || "(ไม่รู้จัก)"}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Match candidates (admin/team) */}
      {canManage && brief.status !== "closed" && brief.status !== "cancelled" && (
        <div className="rounded-lg bg-white ring-1 ring-slate-200 p-4">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 className="text-base font-bold text-slate-800">🔍 Match นักวิจัย</h3>
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={loadMatches}
                disabled={matchingLoading}
                className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                title="คำนวณ skill score (ฟรี · ไม่ใช้ AI)"
              >
                {matchingLoading ? "⏳" : "📊"} Skill Score
              </button>
              <button
                onClick={runAiRerank}
                disabled={aiRerankBusy || !apiKey}
                className="rounded-md bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                title={apiKey ? "AI rerank top 10 candidates" : "ต้องตั้งค่า API key ที่ /admin ก่อน"}
              >
                {aiRerankBusy ? "⏳ กำลัง AI..." : "🤖 AI Rerank"}
              </button>
            </div>
          </div>

          {aiError && (
            <div className="mb-3 rounded bg-red-50 ring-1 ring-red-200 p-2 text-xs text-red-700">
              ⚠ {aiError}
            </div>
          )}

          {matches.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">
              กด "Skill Score" เพื่อ rank ตาม algorithm · หรือ "AI Rerank" เพื่อให้ AI ช่วยพิจารณาภาพรวม
            </p>
          ) : (
            <div className="space-y-2">
              {matches.map((m, i) => {
                const lvl = LEVEL_META[m.researcher.level] || LEVEL_META.mid;
                const aiInfo = aiRanking?.find((a) => a.researcher_id === m.researcher.id);
                return (
                  <div key={m.researcher.id} className={`rounded-lg ring-1 p-3 hover:bg-slate-50 transition ${
                    aiInfo ? "ring-purple-200 bg-purple-50/30" : "ring-slate-200"
                  }`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900">#{i + 1} {m.researcher.name}</span>
                          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ring-1 ${lvl.color}`}>
                            {lvl.emoji} {lvl.label}
                          </span>
                          {aiInfo && (
                            <span className="rounded-full bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-800 ring-1 ring-purple-300">
                              🤖 {aiInfo.fitness_label}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">
                          🏷 ตรง: {m.skillScore}% · 📍 พื้นที่: {m.areaScore}% · 💼 ภาระงาน: {m.loadScore}%
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-600">
                          {m.reasons.join(" · ")}
                        </p>
                        {aiInfo && (
                          <div className="mt-2 rounded bg-white ring-1 ring-purple-100 p-2 text-[11px] space-y-1">
                            <div>
                              <span className="font-bold text-purple-700">AI Reasons:</span>
                              <ul className="ml-3 list-disc text-slate-700">
                                {aiInfo.reasons.map((r, ri) => <li key={ri}>{r}</li>)}
                              </ul>
                            </div>
                            {aiInfo.concerns.length > 0 && (
                              <div>
                                <span className="font-bold text-amber-700">Concerns:</span>
                                <ul className="ml-3 list-disc text-amber-800">
                                  {aiInfo.concerns.map((c, ci) => <li key={ci}>{c}</li>)}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0 flex flex-col items-end gap-1">
                        <p className="text-2xl font-bold text-violet-700">{m.totalScore}</p>
                        {aiInfo && (
                          <p className="text-xs font-bold text-purple-700">AI: {aiInfo.ai_score}</p>
                        )}
                        <button
                          onClick={() => generateNgor9(m.researcher.id)}
                          disabled={aiNgor9Busy || !apiKey}
                          className="rounded bg-emerald-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-emerald-700 disabled:opacity-50 mt-1"
                          title="ให้ AI ร่าง ง9 จาก brief นี้"
                        >
                          {aiNgor9Busy ? "⏳" : "📄 AI Draft ง9"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* AI ngor9 draft modal */}
      {draft && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setDraft(null)}
        >
          <div
            className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-emerald-700 text-white px-5 py-3 rounded-t-2xl flex items-center justify-between">
              <div>
                <h3 className="font-bold">🤖 AI Draft — ง9</h3>
                <p className="text-xs text-emerald-100 mt-0.5">{draft.project_name}</p>
              </div>
              <button onClick={() => setDraft(null)} className="text-white/80 hover:text-white text-xl">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3 text-sm">
              <div>
                <p className="text-xs font-bold text-slate-600">📋 ข้อมูลโครงการ</p>
                <ul className="mt-1 text-xs text-slate-700 space-y-0.5">
                  <li>👤 ผู้รับผิดชอบ: <strong>{draft.responsible_title} {draft.responsible}</strong></li>
                  <li>🏛 หน่วยงาน: {draft.organization}</li>
                  <li>📅 ระยะเวลา: {draft.project_period}</li>
                  <li>📍 พื้นที่: {draft.site}</li>
                  <li>💰 งบรวม: <strong className="text-emerald-700">{draft.budget_total.toLocaleString()} บาท</strong></li>
                  <li>📊 main_program: {draft.main_program}</li>
                </ul>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-600">⚙ กิจกรรม ({draft.activities.length})</p>
                <ol className="mt-1 space-y-1.5">
                  {draft.activities.map((a) => (
                    <li key={a.order} className="rounded bg-slate-50 ring-1 ring-slate-200 p-2 text-xs">
                      <p className="font-medium text-slate-800">{a.order}. {a.name}</p>
                      <p className="text-slate-500 mt-0.5">เดือน: {a.planned_months.join(", ")} · งบ: {a.budget.toLocaleString()} บาท</p>
                      <p className="text-slate-600 mt-0.5 italic">→ {a.output}</p>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="grid sm:grid-cols-2 gap-2">
                <div className="rounded bg-blue-50 ring-1 ring-blue-200 p-2">
                  <p className="text-xs font-bold text-blue-800">📈 KPI เชิงปริมาณ</p>
                  <ul className="mt-1 text-[11px] text-blue-900 space-y-0.5 ml-3 list-disc">
                    {draft.kpi.quantitative?.map((q, i) => <li key={i}>{q}</li>)}
                  </ul>
                </div>
                <div className="rounded bg-rose-50 ring-1 ring-rose-200 p-2">
                  <p className="text-xs font-bold text-rose-800">🎯 KPI เชิงคุณภาพ</p>
                  <ul className="mt-1 text-[11px] text-rose-900 space-y-0.5 ml-3 list-disc">
                    {draft.kpi.qualitative?.map((q, i) => <li key={i}>{q}</li>)}
                  </ul>
                </div>
              </div>

              {draft.budget_breakdown && (
                <div className="rounded bg-amber-50 ring-1 ring-amber-200 p-3">
                  <p className="text-xs font-bold text-amber-800">💰 Budget breakdown</p>
                  <div className="mt-1 grid grid-cols-3 gap-2 text-xs text-amber-900">
                    <div>
                      <p className="font-bold">{draft.budget_breakdown.compensation_pct}%</p>
                      <p className="text-[10px]">ค่าตอบแทน</p>
                    </div>
                    <div>
                      <p className="font-bold">{draft.budget_breakdown.supplies_pct}%</p>
                      <p className="text-[10px]">ค่าวัสดุ</p>
                    </div>
                    <div>
                      <p className="font-bold">{draft.budget_breakdown.operating_pct}%</p>
                      <p className="text-[10px]">ค่าใช้สอย</p>
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] text-amber-800 italic">{draft.budget_breakdown.rationale}</p>
                </div>
              )}

              {draft.ai_notes && draft.ai_notes.length > 0 && (
                <div className="rounded bg-purple-50 ring-1 ring-purple-200 p-2 text-xs text-purple-800">
                  <p className="font-bold">🤖 AI Notes:</p>
                  <ul className="mt-1 space-y-0.5 ml-3 list-disc">
                    {draft.ai_notes.map((n, i) => <li key={i}>{n}</li>)}
                  </ul>
                </div>
              )}
            </div>
            <div className="border-t bg-slate-50 px-5 py-3 flex gap-2 rounded-b-2xl">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(draft, null, 2));
                  alert("📋 Copy JSON ไปที่ clipboard แล้ว · paste ใน /admin/upload-ngor9");
                }}
                className="rounded bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700"
              >
                📋 Copy JSON
              </button>
              <button
                onClick={() => setDraft(null)}
                className="flex-1 rounded border bg-white py-2 text-sm hover:bg-slate-100"
              >
                ปิด (draft ถูกบันทึกใน brief แล้ว)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interests submitted */}
      <div className="rounded-lg bg-white ring-1 ring-slate-200 p-4">
        <h3 className="text-base font-bold text-slate-800 mb-3">
          💬 ผู้แสดงความสนใจ ({interests.length})
        </h3>
        {interests.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">ยังไม่มีผู้สมัคร</p>
        ) : (
          <div className="space-y-2">
            {interests.map((it) => {
              if (!it.researcher) return null;
              const lvl = LEVEL_META[it.researcher.level] || LEVEL_META.mid;
              return (
                <div key={it.id} className="rounded-lg ring-1 ring-slate-200 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900">{it.researcher.name}</span>
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ring-1 ${lvl.color}`}>
                          {lvl.emoji} {lvl.label}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(it.submitted_at).toLocaleDateString("th-TH")}
                        </span>
                      </div>
                      {it.researcher.faculty && <p className="text-xs text-slate-500">{it.researcher.faculty}</p>}
                      {it.note && <p className="mt-2 text-xs text-slate-700 leading-relaxed">{it.note}</p>}
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold text-center ${
                        it.status === "accepted" ? "bg-emerald-100 text-emerald-800"
                        : it.status === "shortlisted" ? "bg-blue-100 text-blue-800"
                        : it.status === "rejected" ? "bg-red-100 text-red-800"
                        : "bg-slate-100 text-slate-700"
                      }`}>
                        {it.status}
                      </span>
                      {canManage && it.status === "submitted" && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => changeInterestStatus(it.id, "shortlisted")}
                            className="rounded bg-blue-50 px-2 py-0.5 text-[10px] text-blue-700 hover:bg-blue-100"
                          >
                            shortlist
                          </button>
                          <button
                            onClick={() => changeInterestStatus(it.id, "rejected")}
                            className="rounded bg-red-50 px-2 py-0.5 text-[10px] text-red-700 hover:bg-red-100"
                          >
                            reject
                          </button>
                        </div>
                      )}
                      {canManage && it.status === "shortlisted" && (
                        <button
                          onClick={() => changeInterestStatus(it.id, "accepted")}
                          className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-700 hover:bg-emerald-100"
                        >
                          accept
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit link for admin/team */}
      {canManage && (
        <Link
          href={`/admin/briefs?edit=${brief.id}`}
          className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-200"
        >
          ✏️ แก้ไข brief นี้ในหน้า admin
        </Link>
      )}
    </div>
  );
}
