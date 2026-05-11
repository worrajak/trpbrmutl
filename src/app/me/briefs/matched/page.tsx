"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { renderTag } from "@/lib/researcher-tags";
import { BRIEF_STATUS_META, BRIEF_MODE_META, type MatchScore } from "@/lib/brief-matching";

interface ResearcherInfo {
  id: string;
  name: string;
}

interface MatchedItem {
  brief: {
    id: string;
    title: string;
    problem_statement: string;
    location: string | null;
    target_kpis: string[];
    plan_number: number | null;
    required_skills: string[];
    budget_min: number | null;
    budget_max: number | null;
    fiscal_year: number;
    mode: "open" | "assigned" | "mentorship";
    status: string;
    deadline: string | null;
  };
  match: MatchScore;
  interest: { id: string; status: string; submitted_at: string; note: string | null } | null;
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString("th-TH");
}

export default function MyMatchedBriefsPage() {
  const [researcher, setResearcher] = useState<ResearcherInfo | null>(null);
  const [matches, setMatches] = useState<MatchedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyingFor, setApplyingFor] = useState<string | null>(null);
  const [applyNote, setApplyNote] = useState("");

  useEffect(() => {
    if (sessionStorage.getItem("researcher_auth") !== "true") {
      window.location.href = "/admin";
      return;
    }
    try {
      const raw = sessionStorage.getItem("researcher_info");
      if (raw) {
        const r = JSON.parse(raw);
        setResearcher({ id: r.id, name: r.name });
        void loadMatches(r.id);
      }
    } catch {
      window.location.href = "/admin";
    }
  }, []);

  async function loadMatches(researcherId: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/researcher/${researcherId}/matched-briefs?limit=20`, { cache: "no-store" });
      const data = await res.json();
      setMatches(data.matched || []);
    } finally {
      setLoading(false);
    }
  }

  async function handleApply(briefId: string) {
    if (!researcher) return;
    try {
      const res = await fetch(`/api/admin/briefs/${briefId}/interest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ researcher_id: researcher.id, note: applyNote || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Apply ล้มเหลว");
      setApplyingFor(null);
      setApplyNote("");
      await loadMatches(researcher.id);
    } catch (err: unknown) {
      alert("Apply ล้มเหลว: " + (err instanceof Error ? err.message : "?"));
    }
  }

  if (!researcher) return <div className="text-center py-12 text-slate-400">กำลังโหลด...</div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-2">
        <div>
          <Link href="/me/researcher" className="text-xs text-slate-500 hover:underline">← My Portal</Link>
          <h1 className="text-2xl font-bold text-cyan-700 mt-1">🎯 โจทย์วิจัยที่ Match กับคุณ</h1>
          <p className="text-sm text-slate-600 mt-1">
            {matches.length} โจทย์ · เรียงตาม fitness score (skill + พื้นที่ + level + load)
          </p>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <p className="text-center py-12 text-slate-400">⏳ กำลังคำนวณ match...</p>
      ) : matches.length === 0 ? (
        <div className="rounded-xl bg-amber-50 ring-1 ring-amber-200 p-8 text-center">
          <p className="text-amber-800">ยังไม่มีโจทย์ที่ match</p>
          <p className="text-xs text-amber-700 mt-2">
            อาจเพราะ admin ยังไม่ได้สร้าง brief หรือ skill ของคุณยังไม่ตรงกับโจทย์ที่มี<br />
            ลองอัปเดต expertise tags ผ่าน admin
          </p>
          <Link href="/briefs" className="mt-3 inline-block text-amber-700 hover:underline text-sm">
            → ดูโจทย์ทั้งหมด
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map(({ brief, match, interest }) => {
            const stat = BRIEF_STATUS_META[brief.status];
            const mod = BRIEF_MODE_META[brief.mode];
            const isApplying = applyingFor === brief.id;
            return (
              <div key={brief.id} className="rounded-xl bg-white ring-1 ring-slate-200 p-4 hover:shadow-md transition">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${stat?.color || ""}`}>
                        {stat?.emoji} {stat?.label}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${mod?.color}`}>
                        {mod?.emoji} {mod?.label}
                      </span>
                      {brief.deadline && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] text-amber-700 ring-1 ring-amber-200">
                          ⏰ {new Date(brief.deadline).toLocaleDateString("th-TH")}
                        </span>
                      )}
                    </div>
                    <Link href={`/briefs/${brief.id}`} className="block hover:text-cyan-700">
                      <h3 className="text-base font-bold text-slate-900 leading-snug">{brief.title}</h3>
                    </Link>
                    <p className="mt-1.5 text-xs text-slate-600 leading-relaxed line-clamp-2">{brief.problem_statement}</p>

                    {/* Match details */}
                    <div className="mt-3 rounded-lg bg-slate-50 p-2.5 text-xs">
                      <p className="text-slate-700 font-bold mb-1">
                        🎯 Match Score: <span className="text-cyan-700 text-base">{match.totalScore}</span>/100
                      </p>
                      <div className="grid grid-cols-3 gap-1 text-[10px] text-slate-500">
                        <span>🏷 ตรง: <strong>{match.skillScore}%</strong></span>
                        <span>📍 พื้นที่: <strong>{match.areaScore}%</strong></span>
                        <span>💼 ภาระงาน: <strong>{match.loadScore}%</strong></span>
                      </div>
                      {match.skillMatched.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {match.skillMatched.map((slug) => {
                            const t = renderTag(slug);
                            return (
                              <span key={slug} className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] ring-1 ${t.color}`}>
                                <span>{t.emoji}</span>{t.label}
                              </span>
                            );
                          })}
                        </div>
                      )}
                      <p className="mt-2 text-[10px] text-slate-600">{match.reasons.join(" · ")}</p>
                    </div>

                    <div className="mt-3 flex items-center justify-between flex-wrap gap-1 text-xs">
                      <span className="text-slate-600">
                        {brief.location && <>📍 {brief.location} · </>}
                        ปี {brief.fiscal_year}
                      </span>
                      <span className="font-bold text-violet-700">
                        {brief.budget_min || brief.budget_max
                          ? `${fmt(Number(brief.budget_min || 0))}-${fmt(Number(brief.budget_max || 0))} บาท`
                          : "งบยืดหยุ่น"}
                      </span>
                    </div>
                  </div>

                  {/* Apply action */}
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    {interest ? (
                      <span className={`rounded-full px-3 py-1.5 text-xs font-bold text-center ${
                        interest.status === "accepted" ? "bg-emerald-100 text-emerald-800"
                        : interest.status === "shortlisted" ? "bg-blue-100 text-blue-800"
                        : interest.status === "rejected" ? "bg-red-100 text-red-800"
                        : "bg-slate-100 text-slate-700"
                      }`}>
                        ✓ Applied · {interest.status}
                      </span>
                    ) : (
                      <button
                        onClick={() => setApplyingFor(brief.id)}
                        className="rounded-md bg-cyan-600 px-4 py-2 text-xs font-bold text-white hover:bg-cyan-700"
                      >
                        ✋ Apply
                      </button>
                    )}
                    <Link
                      href={`/briefs/${brief.id}`}
                      className="rounded-md border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 hover:bg-slate-50 text-center"
                    >
                      👀 ดูเต็ม
                    </Link>
                  </div>
                </div>

                {/* Apply form modal */}
                {isApplying && (
                  <div className="mt-3 rounded-lg bg-cyan-50 ring-1 ring-cyan-300 p-3">
                    <p className="text-xs font-bold text-cyan-900 mb-2">📝 ข้อความถึงผู้ดูแล (optional)</p>
                    <textarea
                      value={applyNote}
                      onChange={(e) => setApplyNote(e.target.value)}
                      rows={2}
                      placeholder="แนะนำตัว · แผนงานที่อยากทำ · ผลงานที่เกี่ยวข้อง..."
                      className="w-full rounded border px-3 py-2 text-xs"
                    />
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => { setApplyingFor(null); setApplyNote(""); }}
                        className="rounded border bg-white px-3 py-1.5 text-xs hover:bg-slate-50"
                      >
                        ยกเลิก
                      </button>
                      <button
                        onClick={() => handleApply(brief.id)}
                        className="flex-1 rounded bg-cyan-600 py-1.5 text-xs font-medium text-white hover:bg-cyan-700"
                      >
                        ✋ ยืนยัน Apply
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
