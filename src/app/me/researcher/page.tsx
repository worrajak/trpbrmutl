"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { renderTag, LEVEL_META } from "@/lib/researcher-tags";

interface ResearcherInfo {
  id: string;
  name: string;
  title: string | null;
  faculty: string | null;
  department: string | null;
  email: string | null;
  phone: string | null;
  expertise_tags: string[];
  areas: string[];
  level: "junior" | "mid" | "senior";
  bio: string | null;
  current_load: number;
  external_link: string | null;
}

export default function MeResearcherPage() {
  const [researcher, setResearcher] = useState<ResearcherInfo | null>(null);
  const [matchedCount, setMatchedCount] = useState<number | null>(null);
  const [appliedCount, setAppliedCount] = useState<number | null>(null);

  useEffect(() => {
    if (sessionStorage.getItem("researcher_auth") !== "true") {
      window.location.href = "/admin";
      return;
    }
    try {
      const raw = sessionStorage.getItem("researcher_info");
      if (raw) {
        const r = JSON.parse(raw) as ResearcherInfo;
        setResearcher({ ...r, expertise_tags: r.expertise_tags || [], areas: r.areas || [] });
        // Fetch matched briefs count
        void fetch(`/api/researcher/${r.id}/matched-briefs`)
          .then((res) => res.json())
          .then((data) => {
            setMatchedCount((data.matched || []).length);
            const applied = (data.matched || []).filter((m: { interest: { status: string } | null }) => m.interest).length;
            setAppliedCount(applied);
          });
      }
    } catch {
      window.location.href = "/admin";
    }
  }, []);

  function logout() {
    sessionStorage.removeItem("researcher_auth");
    sessionStorage.removeItem("researcher_info");
    window.location.href = "/admin";
  }

  if (!researcher) {
    return <div className="text-center py-12 text-slate-400">กำลังโหลด...</div>;
  }

  const lvl = LEVEL_META[researcher.level] || LEVEL_META.mid;

  return (
    <div className="space-y-4">
      {/* Hero */}
      <section className="rounded-2xl bg-cyan-700 p-5 sm:p-6 text-white shadow-lg shadow-cyan-500/20">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-cyan-100">
              🔬 My Portal
            </p>
            <h1 className="mt-1.5 text-2xl sm:text-3xl font-bold drop-shadow text-white">
              {researcher.title && <span className="text-cyan-100 text-base font-normal mr-1">{researcher.title}</span>}
              {researcher.name}
            </h1>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <span className={`rounded-full px-2 py-0.5 text-[0.72rem] font-bold ring-1 ${lvl.color}`}>
                {lvl.emoji} {lvl.label}
              </span>
              {researcher.faculty && (
                <span className="text-sm text-cyan-50">🏛 {researcher.faculty}</span>
              )}
            </div>
          </div>
          <button
            onClick={logout}
            className="rounded border border-white/30 bg-white/10 backdrop-blur px-3 py-1.5 text-xs text-white hover:bg-white/20"
          >
            🚪 ออกจากระบบ
          </button>
        </div>

        {/* Stats */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-white/15 backdrop-blur p-3 ring-1 ring-white/25">
            <p className="text-xs uppercase text-cyan-50/85">โครงการที่ทำอยู่</p>
            <p className="mt-1 text-2xl font-bold text-white drop-shadow">{researcher.current_load}</p>
          </div>
          <div className="rounded-xl bg-white/15 backdrop-blur p-3 ring-1 ring-white/25">
            <p className="text-xs uppercase text-cyan-50/85">โจทย์ Match</p>
            <p className="mt-1 text-2xl font-bold text-white drop-shadow">{matchedCount ?? "..."}</p>
          </div>
          <div className="rounded-xl bg-white/15 backdrop-blur p-3 ring-1 ring-white/25">
            <p className="text-xs uppercase text-cyan-50/85">Applied</p>
            <p className="mt-1 text-2xl font-bold text-white drop-shadow">{appliedCount ?? "..."}</p>
          </div>
        </div>
      </section>

      {/* Quick links */}
      <section className="grid sm:grid-cols-2 gap-3">
        <Link
          href="/me/briefs/matched"
          className="rounded-xl bg-cyan-50 ring-1 ring-cyan-300 p-5 hover:shadow-md hover:ring-cyan-400 transition"
        >
          <div className="flex items-center gap-2 text-cyan-800">
            <span className="text-2xl">🎯</span>
            <h2 className="text-base font-bold">โจทย์วิจัยที่ Match กับคุณ</h2>
          </div>
          <p className="mt-2 text-xs text-cyan-700">
            ดูโจทย์ที่ตรงกับ expertise + พื้นที่ของคุณ · apply ได้ทันที
          </p>
          <p className="mt-3 text-xs font-bold text-cyan-700">→ ไปดูโจทย์ที่ match ({matchedCount ?? "..."} โจทย์)</p>
        </Link>

        <Link
          href={`/researchers#${researcher.id}`}
          className="rounded-xl bg-emerald-50 ring-1 ring-emerald-300 p-5 hover:shadow-md hover:ring-emerald-400 transition"
        >
          <div className="flex items-center gap-2 text-emerald-800">
            <span className="text-2xl">👤</span>
            <h2 className="text-base font-bold">โปรไฟล์ของคุณ (สาธารณะ)</h2>
          </div>
          <p className="mt-2 text-xs text-emerald-700">
            ดูว่าโปรไฟล์ปรากฎต่อคนทั่วไปอย่างไร · ติดต่อ admin หากต้องการแก้ไข
          </p>
          <p className="mt-3 text-xs font-bold text-emerald-700">→ ดูโปรไฟล์ public</p>
        </Link>
      </section>

      {/* Profile preview */}
      <section className="rounded-xl bg-white ring-1 ring-slate-200 p-5">
        <h2 className="text-sm font-bold text-slate-800 mb-3">📋 ข้อมูลของคุณ (ที่ AI ใช้ matching)</h2>
        <div className="space-y-3 text-sm">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase mb-1">📧 ติดต่อ</p>
            <p className="text-slate-700">
              {researcher.email && <span className="mr-3">📧 {researcher.email}</span>}
              {researcher.phone && <span>📱 {researcher.phone}</span>}
            </p>
          </div>
          {researcher.bio && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase mb-1">📝 Bio</p>
              <p className="text-slate-700 leading-relaxed">{researcher.bio}</p>
            </div>
          )}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase mb-1">🏷 ความเชี่ยวชาญ ({researcher.expertise_tags.length})</p>
            <div className="flex flex-wrap gap-1">
              {researcher.expertise_tags.map((slug) => {
                const t = renderTag(slug);
                return (
                  <span key={slug} className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs ring-1 ${t.color}`}>
                    <span>{t.emoji}</span>
                    <span>{t.label}</span>
                  </span>
                );
              })}
            </div>
          </div>
          {researcher.areas.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase mb-1">📍 พื้นที่ทำงาน</p>
              <div className="flex flex-wrap gap-1">
                {researcher.areas.map((a) => (
                  <span key={a} className="inline-flex items-center gap-0.5 rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                    📍 {a}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        <p className="mt-4 pt-3 border-t border-slate-100 text-[0.72rem] text-slate-500">
          💡 ต้องการแก้ไข expertise tags หรือพื้นที่? · ติดต่อ admin ที่ /admin/researchers
        </p>
      </section>
    </div>
  );
}
