import { Metadata } from "next";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import { renderTag } from "@/lib/researcher-tags";
import { BRIEF_STATUS_META, BRIEF_MODE_META } from "@/lib/brief-matching";
import { EXCELLENCE_KPIS } from "@/lib/excellence-kpi";
import { PLANS } from "@/lib/foundation";

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
  plan_number: number | null;
  required_skills: string[];
  budget_min: number | string | null;
  budget_max: number | string | null;
  fiscal_year: number;
  mode: "open" | "assigned" | "mentorship";
  status: string;
  deadline: string | null;
  created_at: string;
  verification_status?: "pending" | "verified" | "flagged" | null;
  min_credibility?: number | null;
}

async function fetchBriefs(): Promise<DbBrief[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data } = await supabase
    .from("research_briefs")
    .select("id, title, problem_statement, location, target_kpis, plan_number, required_skills, budget_min, budget_max, fiscal_year, mode, status, deadline, created_at, verification_status, min_credibility")
    .in("status", ["open", "matched", "in_progress"])
    .order("created_at", { ascending: false });
  return ((data as DbBrief[]) || []).map((b) => ({
    ...b,
    target_kpis: b.target_kpis || [],
    required_skills: b.required_skills || [],
  }));
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

  // ===== KPI Coverage =====
  // รวม target_kpis ทุก brief → unique set
  const coveredKpis = new Set<string>();
  for (const b of briefs) {
    for (const code of b.target_kpis) coveredKpis.add(code);
  }

  const allExcellenceCodes = EXCELLENCE_KPIS.map((k) => k.code);
  const uncoveredExcellence = EXCELLENCE_KPIS.filter((k) => !coveredKpis.has(k.code));
  const coverageExcellence = (coveredKpis.size / allExcellenceCodes.length) * 100;

  // Plan coverage — นับว่า brief ในแต่ละ plan ตอบ plan KPI ครบไหม (อนุมาน)
  const planCoverage = PLANS.map((p) => {
    const briefsInPlan = briefs.filter((b) => b.plan_number === p.number);
    return {
      plan: p,
      briefCount: briefsInPlan.length,
      // นับ rmutl_kpi_codes ที่ brief ในแผนนี้ตอบ
      kpisCovered: new Set(briefsInPlan.flatMap((b) => b.target_kpis)).size,
    };
  });

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

        {/* KPI Coverage Bar */}
        <div className="mt-5 rounded-xl bg-white/15 backdrop-blur p-4 ring-1 ring-white/25">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <p className="text-xs uppercase text-violet-50/90 font-bold">
              🎯 KPI Coverage (มทร./EdPEx)
            </p>
            <p className="text-sm text-white">
              <strong>{coveredKpis.size}</strong> / {allExcellenceCodes.length} ตัว
              <span className="ml-2 text-violet-100">({coverageExcellence.toFixed(0)}%)</span>
            </p>
          </div>
          <div className="h-2 rounded-full bg-white/20 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-300 to-yellow-300 shadow"
              style={{ width: `${coverageExcellence}%` }}
            />
          </div>
        </div>

        {/* Plan coverage stats */}
        <div className="mt-3 grid grid-cols-3 gap-2 max-w-3xl">
          {planCoverage.map(({ plan, briefCount, kpisCovered }) => (
            <div key={plan.number} className="rounded-lg bg-white/10 backdrop-blur p-2.5 ring-1 ring-white/20">
              <p className="text-[0.65rem] text-violet-100/85 truncate">📚 แผน {plan.number}: {plan.shortTitle}</p>
              <div className="mt-1 flex items-baseline justify-between gap-1">
                <span className="text-lg font-bold text-white">{briefCount}</span>
                <span className="text-[0.65rem] text-violet-100">โจทย์ · {kpisCovered} KPIs</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Uncovered KPIs (callout — เพื่อ AI gen รอบต่อไปเลือก) */}
      {uncoveredExcellence.length > 0 && briefs.length > 0 && (
        <section className="rounded-xl bg-amber-50 ring-1 ring-amber-300 p-4">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h2 className="text-sm font-bold text-amber-900 flex items-center gap-2">
              <span>💡</span>
              <span>ตัวชี้วัดที่ยังไม่มีโจทย์ตอบ ({uncoveredExcellence.length} ตัว)</span>
            </h2>
            <Link
              href="/admin/briefs"
              className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
            >
              🤖 ไปสร้างโจทย์ AI Gen
            </Link>
          </div>
          <p className="text-xs text-amber-700 mb-3">
            ⚡ ใช้รายการนี้เป็น "ธีม" ตอน AI Generate Brief — AI จะเลือกออกแบบโจทย์ที่ตอบตัวชี้วัดเหล่านี้
          </p>
          <div className="grid sm:grid-cols-2 gap-2">
            {uncoveredExcellence.map((kpi) => (
              <div key={kpi.code} className="rounded bg-white ring-1 ring-amber-200 p-2 text-xs flex items-start gap-2">
                <span className="text-base flex-shrink-0">{kpi.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 flex-wrap">
                    <code className="rounded bg-amber-100 px-1.5 py-0.5 text-[0.65rem] font-mono text-amber-800">
                      {kpi.code}
                    </code>
                    <span className="text-[9px] rounded-full bg-slate-100 text-slate-600 px-1.5 py-0.5">
                      {kpi.category_label}
                    </span>
                  </div>
                  <p className="mt-1 text-slate-800 leading-snug">{kpi.name}</p>
                  <p className="text-[0.65rem] text-slate-500 mt-0.5">
                    เป้า {kpi.target_team || kpi.target_university} {kpi.unit} · {kpi.responsible}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

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
            const briefKpis = b.target_kpis.map((c) => EXCELLENCE_KPIS.find((k) => k.code === c)).filter(Boolean);
            const plan = b.plan_number ? PLANS.find((p) => p.number === b.plan_number) : null;

            return (
              <Link
                key={b.id}
                href={`/briefs/${b.id}`}
                className="block rounded-xl bg-white ring-1 ring-slate-200 p-4 hover:shadow-md hover:ring-violet-300 transition"
              >
                <div className="flex items-center gap-1.5 flex-wrap mb-2">
                  <span className={`rounded-full px-2 py-0.5 text-[0.65rem] font-bold ring-1 ${stat?.color || "bg-slate-50 text-slate-700 ring-slate-200"}`}>
                    {stat?.emoji} {stat?.label}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[0.65rem] font-bold ring-1 ${mod?.color}`}>
                    {mod?.emoji} {mod?.label}
                  </span>
                  {plan && (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[0.65rem] text-amber-800 ring-1 ring-amber-200">
                      📚 แผน {plan.number}
                    </span>
                  )}
                  {b.deadline && (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[0.65rem] text-amber-700 ring-1 ring-amber-200">
                      ⏰ ปิดรับ {new Date(b.deadline).toLocaleDateString("th-TH")}
                    </span>
                  )}
                  {/* Verification badge — แหล่งข้อมูล */}
                  {b.verification_status === "flagged" && (
                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-[0.65rem] font-bold text-red-800 ring-1 ring-red-300" title="แหล่งข้อมูลต้อง verify">
                      ⚠ แหล่งต้อง verify
                    </span>
                  )}
                  {b.verification_status === "verified" && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[0.65rem] font-bold text-emerald-800 ring-1 ring-emerald-300" title="แหล่งข้อมูลตรวจสอบแล้ว">
                      ✓ ตรวจสอบแล้ว
                    </span>
                  )}
                  {typeof b.min_credibility === "number" && b.min_credibility >= 1 && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[0.65rem] font-bold ring-1 ${
                        b.min_credibility >= 4 ? "bg-blue-50 text-blue-800 ring-blue-200"
                        : b.min_credibility >= 3 ? "bg-amber-50 text-amber-800 ring-amber-200"
                        : "bg-orange-50 text-orange-800 ring-orange-200"
                      }`}
                      title="คะแนนความน่าเชื่อต่ำสุดของแหล่งข้อมูล (1-5)"
                    >
                      ⛓ {b.min_credibility}/5
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-slate-900 leading-snug">{b.title}</h3>
                <p className="mt-1.5 text-xs text-slate-600 leading-relaxed line-clamp-3">
                  {b.problem_statement}
                </p>

                {/* Target KPIs (ใหม่!) — แสดงตัวชี้วัดที่โจทย์นี้ตอบ */}
                {briefKpis.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[0.65rem] font-bold text-blue-700 uppercase mb-1">
                      🎯 ตอบตัวชี้วัด ({briefKpis.length} ตัว):
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {briefKpis.map((k) => (
                        <span
                          key={k!.code}
                          className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-1.5 py-0.5 text-[0.65rem] ring-1 ring-blue-200"
                          title={`${k!.name} · เป้า ${k!.target_team || k!.target_university} ${k!.unit}`}
                        >
                          <span>{k!.icon}</span>
                          <code className="font-mono text-blue-700">{k!.code}</code>
                          <span className="text-slate-700 line-clamp-1 max-w-[140px]">{k!.name}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Required skills */}
                {b.required_skills.length > 0 && (
                  <div className="mt-2">
                    <p className="text-[0.65rem] font-bold text-slate-500 uppercase mb-1">เชี่ยวชาญที่ต้องการ:</p>
                    <div className="flex flex-wrap gap-1">
                      {b.required_skills.slice(0, 5).map((slug) => {
                        const t = renderTag(slug);
                        return (
                          <span key={slug} className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[0.65rem] ring-1 ${t.color}`}>
                            <span>{t.emoji}</span>
                            <span>{t.label}</span>
                          </span>
                        );
                      })}
                      {b.required_skills.length > 5 && (
                        <span className="text-[0.65rem] text-slate-400">+{b.required_skills.length - 5}</span>
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
