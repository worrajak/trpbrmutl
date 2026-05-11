import { Metadata } from "next";
import { getSupabase } from "@/lib/supabase";
import { renderTag } from "@/lib/researcher-tags";
import {
  AREA_CATEGORY_META,
  DEMAND_META,
  type AreaCategory,
  type DemandLevel,
} from "@/lib/research-areas-seed";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "สาขางานวิจัยที่ต้องการ | ใต้ร่มพระบารมี",
  description:
    "Catalog สาขางานวิจัย/บริการวิชาการที่กลุ่มแผนงานใต้ร่มพระบารมี มทร.ล้านนา กำลังต้องการ — admin curate",
};

interface DbArea {
  id: string;
  name: string;
  icon: string | null;
  category: AreaCategory;
  description: string | null;
  related_skills: string[];
  related_kpis: string[];
  related_plans: number[];
  demand_level: DemandLevel;
  notes: string | null;
}

async function fetchAreas(): Promise<DbArea[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data } = await supabase
    .from("rpf_research_areas")
    .select("id, name, icon, category, description, related_skills, related_kpis, related_plans, demand_level, notes")
    .eq("is_active", true)
    .order("demand_level", { ascending: true })  // high first (a-z order: high, low, medium)
    .order("name");
  return ((data as DbArea[]) || []).map((a) => ({
    ...a,
    related_skills: a.related_skills || [],
    related_kpis: a.related_kpis || [],
    related_plans: a.related_plans || [],
  }));
}

export default async function ResearchAreasPage() {
  const list = await fetchAreas();

  // Sort: high → medium → low
  const order: Record<DemandLevel, number> = { high: 0, medium: 1, low: 2 };
  const sorted = [...list].sort((a, b) => order[a.demand_level] - order[b.demand_level]);

  // Group by category
  const byCategory: Record<AreaCategory, DbArea[]> = {
    research: [], academic_service: [], expertise: [], other: [],
  };
  for (const a of sorted) byCategory[a.category].push(a);

  const stats: Record<DemandLevel, number> = {
    high: list.filter((a) => a.demand_level === "high").length,
    medium: list.filter((a) => a.demand_level === "medium").length,
    low: list.filter((a) => a.demand_level === "low").length,
  };

  return (
    <div className="space-y-4">
      {/* Hero */}
      <section className="rounded-2xl bg-cyan-700 p-5 sm:p-6 text-white shadow-lg shadow-cyan-500/20">
        <p className="text-xs sm:text-sm font-medium uppercase tracking-wider text-cyan-100">
          📚 Research Areas Catalog
        </p>
        <h1 className="mt-1.5 text-2xl sm:text-3xl font-bold drop-shadow text-white">
          สาขางานวิจัย/บริการวิชาการที่ต้องการ
        </h1>
        <p className="mt-2 text-sm sm:text-base text-cyan-50 max-w-3xl">
          {list.length} รายการ · catalog ที่กลุ่มแผนงานใต้ร่มพระบารมี curate ขึ้นมา —
          นักวิจัยใช้อ้างอิงเลือกสาขาตัวเอง · admin/team_lead ใช้สร้าง brief
        </p>

        <div className="mt-5 grid grid-cols-3 gap-3 max-w-2xl">
          {(Object.keys(DEMAND_META) as DemandLevel[]).map((d) => {
            const m = DEMAND_META[d];
            return (
              <div key={d} className="rounded-xl bg-white/15 backdrop-blur p-3 ring-1 ring-white/25">
                <p className="text-xs uppercase text-cyan-50/85 flex items-center gap-1">
                  <span>{m.emoji}</span>
                  <span>{m.label}</span>
                </p>
                <p className="mt-1 text-2xl font-bold text-white drop-shadow">{stats[d]}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Empty state */}
      {list.length === 0 && (
        <div className="rounded-lg bg-white ring-1 ring-slate-200 p-8 text-center">
          <p className="text-slate-500">ยังไม่มีข้อมูล</p>
          <a href="/admin/research-areas" className="mt-2 inline-block text-cyan-700 hover:underline text-sm">
            → admin จัดการได้ที่นี่
          </a>
        </div>
      )}

      {/* By category */}
      {(Object.keys(AREA_CATEGORY_META) as AreaCategory[]).map((cat) => {
        const items = byCategory[cat];
        if (items.length === 0) return null;
        const meta = AREA_CATEGORY_META[cat];
        return (
          <section key={cat}>
            <h2 className="mb-2 text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
              <span>{meta.emoji}</span>
              <span>{meta.label}</span>
              <span className="text-xs text-slate-400 font-normal">({items.length})</span>
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((a) => {
                const dem = DEMAND_META[a.demand_level];
                return (
                  <div key={a.id} className="rounded-xl bg-white ring-1 ring-slate-200 p-4 hover:shadow-md hover:ring-cyan-300 transition">
                    <div className="flex items-start gap-3">
                      <span className="text-3xl flex-shrink-0">{a.icon || meta.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${dem.color}`}>
                          {dem.emoji} {dem.label}
                        </span>
                        <h3 className="mt-1.5 text-sm font-bold text-slate-900 leading-snug">{a.name}</h3>
                        {a.description && (
                          <p className="mt-1 text-xs text-slate-600 leading-relaxed line-clamp-3">{a.description}</p>
                        )}

                        {/* Skills */}
                        {a.related_skills.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {a.related_skills.slice(0, 4).map((slug) => {
                              const t = renderTag(slug);
                              return (
                                <span key={slug} className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] ring-1 ${t.color}`}>
                                  <span>{t.emoji}</span>
                                  <span>{t.label}</span>
                                </span>
                              );
                            })}
                            {a.related_skills.length > 4 && <span className="text-[10px] text-slate-400">+{a.related_skills.length - 4}</span>}
                          </div>
                        )}

                        {/* Plans + KPIs */}
                        <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-500 flex-wrap">
                          {a.related_plans.length > 0 && <span>📚 แผน {a.related_plans.join(", ")}</span>}
                          {a.related_kpis.length > 0 && (
                            <span className="flex items-center gap-1">
                              🎯
                              {a.related_kpis.slice(0, 3).map((c) => (
                                <code key={c} className="rounded bg-slate-100 px-1 text-[9px] font-mono">{c}</code>
                              ))}
                              {a.related_kpis.length > 3 && <span>+{a.related_kpis.length - 3}</span>}
                            </span>
                          )}
                        </div>

                        {a.notes && (
                          <p className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500 italic">💡 {a.notes}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {/* Note */}
      <div className="rounded-lg bg-cyan-50 ring-1 ring-cyan-200 p-3 text-xs text-cyan-800">
        💡 catalog นี้ admin curate — researchers ใช้อ้างอิงเลือกสาขาตัวเอง · briefs ใช้ข้อมูล related_skills/KPIs auto-fill ได้
      </div>
    </div>
  );
}
