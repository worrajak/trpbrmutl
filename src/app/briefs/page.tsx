import { Metadata } from "next";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import { renderTag } from "@/lib/researcher-tags";
import { BRIEF_STATUS_META, BRIEF_MODE_META } from "@/lib/brief-matching";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "โจทย์วิจัย / Briefs | ใต้ร่มพระบารมี",
  description:
    "โจทย์/ปัญหา ที่ต้องการนักวิจัยและนักบริการวิชาการ — open briefs, assigned, mentorship",
};

interface DbBrief {
  id: string;
  title: string;
  problem_statement: string;
  location: string | null;
  target_kpis: string[];
  required_skills: string[];
  budget_min: number | string | null;
  budget_max: number | string | null;
  fiscal_year: number;
  mode: "open" | "assigned" | "mentorship";
  status: string;
  deadline: string | null;
  created_at: string;
}

async function fetchBriefs(): Promise<DbBrief[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data } = await supabase
    .from("research_briefs")
    .select("id, title, problem_statement, location, target_kpis, required_skills, budget_min, budget_max, fiscal_year, mode, status, deadline, created_at")
    .in("status", ["open", "matched", "in_progress"])
    .order("created_at", { ascending: false });
  return (data as DbBrief[]) || [];
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString("th-TH");
}

export default async function BriefsPage() {
  const briefs = await fetchBriefs();

  const byMode: Record<string, number> = {
    open: briefs.filter((b) => b.mode === "open").length,
    assigned: briefs.filter((b) => b.mode === "assigned").length,
    mentorship: briefs.filter((b) => b.mode === "mentorship").length,
  };

  return (
    <div className="space-y-4">
      {/* Hero */}
      <section className="rounded-2xl bg-violet-700 p-5 sm:p-6 text-white shadow-lg shadow-violet-500/20">
        <p className="text-xs sm:text-sm font-medium uppercase tracking-wider text-violet-100">
          📢 Research Briefs · Phase 2
        </p>
        <h1 className="mt-1.5 text-2xl sm:text-3xl font-bold drop-shadow text-white">
          โจทย์วิจัย/บริการวิชาการ
        </h1>
        <p className="mt-2 text-sm sm:text-base text-violet-50 max-w-3xl">
          {briefs.length} โจทย์ · กลุ่มแผนงานใต้ร่มฯ + พื้นที่โครงการหลวง · นักวิจัยสามารถ login (Token+PIN) ดูโจทย์ที่ตรง expertise + apply ได้
        </p>

        {/* Mode stats */}
        <div className="mt-5 grid grid-cols-3 gap-3 max-w-2xl">
          {(Object.keys(BRIEF_MODE_META) as Array<keyof typeof BRIEF_MODE_META>).map((m) => {
            const meta = BRIEF_MODE_META[m];
            return (
              <div key={m} className="rounded-xl bg-white/15 backdrop-blur p-3 ring-1 ring-white/25">
                <p className="text-xs uppercase text-violet-50/85 flex items-center gap-1">
                  <span>{meta.emoji}</span>
                  <span>{meta.label}</span>
                </p>
                <p className="mt-1 text-2xl font-bold text-white drop-shadow">{byMode[m]}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Briefs list */}
      {briefs.length === 0 ? (
        <div className="rounded-lg bg-white ring-1 ring-slate-200 p-8 text-center">
          <p className="text-slate-500">ยังไม่มีโจทย์เปิดรับ</p>
          <p className="mt-2 text-sm text-slate-400">รอ admin หรือ team_lead สร้าง brief</p>
          <Link href="/admin/briefs" className="mt-3 inline-block text-violet-700 hover:underline text-sm">
            → admin จัดการได้ที่นี่
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {briefs.map((b) => {
            const stat = BRIEF_STATUS_META[b.status];
            const mod = BRIEF_MODE_META[b.mode];
            return (
              <Link
                key={b.id}
                href={`/briefs/${b.id}`}
                className="block rounded-xl bg-white ring-1 ring-slate-200 p-4 hover:shadow-md hover:ring-violet-300 transition"
              >
                <div className="flex items-center gap-1.5 flex-wrap mb-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${stat?.color || "bg-slate-50 text-slate-700 ring-slate-200"}`}>
                    {stat?.emoji} {stat?.label}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${mod?.color}`}>
                    {mod?.emoji} {mod?.label}
                  </span>
                  {b.deadline && (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] text-amber-700 ring-1 ring-amber-200">
                      ⏰ ปิดรับ {new Date(b.deadline).toLocaleDateString("th-TH")}
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-slate-900 leading-snug">{b.title}</h3>
                <p className="mt-1.5 text-xs text-slate-600 leading-relaxed line-clamp-3">
                  {b.problem_statement}
                </p>

                {/* Required skills */}
                {b.required_skills.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">เชี่ยวชาญที่ต้องการ:</p>
                    <div className="flex flex-wrap gap-1">
                      {b.required_skills.slice(0, 5).map((slug) => {
                        const t = renderTag(slug);
                        return (
                          <span key={slug} className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] ring-1 ${t.color}`}>
                            <span>{t.emoji}</span>
                            <span>{t.label}</span>
                          </span>
                        );
                      })}
                      {b.required_skills.length > 5 && (
                        <span className="text-[10px] text-slate-400">+{b.required_skills.length - 5}</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-600">
                    {b.location && <>📍 {b.location} · </>}
                    ปี {b.fiscal_year}
                  </span>
                  <span className="font-bold text-violet-700">
                    {b.budget_min || b.budget_max
                      ? `${fmt(Number(b.budget_min || 0))}-${fmt(Number(b.budget_max || 0))} บาท`
                      : "งบยืดหยุ่น"}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
