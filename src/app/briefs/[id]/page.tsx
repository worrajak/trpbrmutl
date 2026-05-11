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
  const [loading, setLoading] = useState(true);
  const [matchingLoading, setMatchingLoading] = useState(false);

  // Session info
  const [isAdmin, setIsAdmin] = useState(false);
  const [isTeam, setIsTeam] = useState(false);

  useEffect(() => {
    setIsAdmin(sessionStorage.getItem("admin_auth") === "true");
    setIsTeam(sessionStorage.getItem("team_auth") === "true");
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
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-slate-800">🔍 Match นักวิจัย</h3>
            <button
              onClick={loadMatches}
              disabled={matchingLoading}
              className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {matchingLoading ? "⏳ กำลังคำนวณ..." : matches.length === 0 ? "🎯 หา match" : "🔄 หาใหม่"}
            </button>
          </div>

          {matches.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">
              กด "หา match" เพื่อให้ระบบ rank นักวิจัย Top 10 ตาม expertise + พื้นที่ + load
            </p>
          ) : (
            <div className="space-y-2">
              {matches.map((m, i) => {
                const lvl = LEVEL_META[m.researcher.level];
                return (
                  <div key={m.researcher.id} className="rounded-lg ring-1 ring-slate-200 p-3 hover:bg-slate-50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900">#{i + 1} {m.researcher.name}</span>
                          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ring-1 ${lvl.color}`}>
                            {lvl.emoji} {lvl.label}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">
                          🏷 ตรง: {m.skillScore}% · 📍 พื้นที่: {m.areaScore}% · 💼 ภาระงาน: {m.loadScore}%
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-600">
                          {m.reasons.join(" · ")}
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-2xl font-bold text-violet-700">{m.totalScore}</p>
                        <p className="text-[10px] text-slate-400">/ 100</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
              const lvl = LEVEL_META[it.researcher.level];
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
