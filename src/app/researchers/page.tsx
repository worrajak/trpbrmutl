import { Metadata } from "next";
import { getSupabase } from "@/lib/supabase";
import {
  EXPERTISE_TAGS,
  CATEGORY_LABEL,
  LEVEL_META,
  renderTag,
  type TagCategory,
} from "@/lib/researcher-tags";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "นักวิจัย/นักบริการวิชาการ | ใต้ร่มพระบารมี",
  description:
    "ฐานข้อมูลนักวิจัยและนักบริการวิชาการของกลุ่มแผนงานใต้ร่มพระบารมี · จัดกลุ่มตามความเชี่ยวชาญ 4 หมวด",
};

interface DbResearcher {
  id: string;
  name: string;
  title: string | null;
  faculty: string | null;
  email: string | null;
  expertise_tags: string[];
  areas: string[];
  level: "junior" | "mid" | "senior";
  bio: string | null;
  current_load: number;
}

async function fetchResearchers(): Promise<DbResearcher[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data } = await supabase
    .from("rpf_researchers")
    .select("id, name, title, faculty, email, expertise_tags, areas, level, bio, current_load")
    .eq("is_active", true)
    .order("name");
  // Normalize array fields — Supabase อาจคืน null
  return ((data as DbResearcher[]) || []).map((r) => ({
    ...r,
    expertise_tags: r.expertise_tags || [],
    areas: r.areas || [],
  }));
}

export default async function ResearchersPage() {
  const list = await fetchResearchers();

  // Stats
  const tagCount: Record<string, number> = {};
  const byCategory: Record<TagCategory, number> = { tech: 0, innovation: 0, teaching: 0, community: 0 };
  const levelCount: Record<string, number> = { junior: 0, mid: 0, senior: 0 };
  for (const r of list) {
    levelCount[r.level] = (levelCount[r.level] || 0) + 1;
    for (const slug of r.expertise_tags) {
      tagCount[slug] = (tagCount[slug] || 0) + 1;
      const t = EXPERTISE_TAGS.find((x) => x.slug === slug);
      if (t) byCategory[t.category]++;
    }
  }

  return (
    <div className="space-y-4">
      {/* Hero */}
      <section className="rounded-2xl bg-emerald-700 p-5 sm:p-6 text-white shadow-lg shadow-emerald-500/20">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium uppercase tracking-wider text-emerald-100">
              🔬 Researchers Catalog
            </p>
            <h1 className="mt-1.5 text-2xl sm:text-3xl font-bold drop-shadow text-white">
              นักวิจัย/นักบริการวิชาการ
            </h1>
            <p className="mt-2 text-sm sm:text-base text-emerald-50 max-w-3xl">
              {list.length} คน · ฐานข้อมูลสำหรับ AI matching engine กับโจทย์วิจัยของกลุ่มแผนงานใต้ร่มพระบารมี
            </p>
          </div>
          <a
            href="/researchers/register"
            className="rounded-xl bg-white text-emerald-700 px-4 py-2 text-sm font-bold shadow-md hover:bg-emerald-50 hover:scale-105 transition whitespace-nowrap"
          >
            + ลงทะเบียนนักวิจัย
          </a>
        </div>

        {/* Stats */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Senior", value: levelCount.senior, emoji: "🌳" },
            { label: "Mid", value: levelCount.mid, emoji: "🌿" },
            { label: "Junior", value: levelCount.junior, emoji: "🌱" },
            { label: "Tags ใช้งาน", value: Object.keys(tagCount).length, emoji: "🏷" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-white/15 backdrop-blur p-3 ring-1 ring-white/25">
              <p className="text-[10px] uppercase text-emerald-50/85">{s.label}</p>
              <p className="mt-1 text-2xl font-bold text-white drop-shadow">
                <span className="mr-1">{s.emoji}</span>
                {s.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Category overview */}
      <section className="grid sm:grid-cols-4 gap-2">
        {(Object.keys(CATEGORY_LABEL) as TagCategory[]).map((cat) => {
          const colors: Record<TagCategory, string> = {
            tech: "bg-blue-50 ring-blue-200 text-blue-800",
            innovation: "bg-rose-50 ring-rose-200 text-rose-800",
            teaching: "bg-violet-50 ring-violet-200 text-violet-800",
            community: "bg-emerald-50 ring-emerald-200 text-emerald-800",
          };
          return (
            <div key={cat} className={`rounded-lg ring-1 p-3 ${colors[cat]}`}>
              <p className="text-xs uppercase font-bold opacity-80">{CATEGORY_LABEL[cat]}</p>
              <p className="mt-1 text-2xl font-bold">
                {byCategory[cat]}
                <span className="text-xs ml-1 opacity-70">expertise</span>
              </p>
            </div>
          );
        })}
      </section>

      {/* Researchers grid */}
      {list.length === 0 ? (
        <div className="rounded-lg bg-white ring-1 ring-slate-200 p-8 text-center">
          <p className="text-slate-500">ยังไม่มีข้อมูลนักวิจัย</p>
          <a href="/admin/researchers" className="mt-2 inline-block text-emerald-700 hover:underline text-sm">
            → admin เพิ่มได้ที่นี่
          </a>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((r) => {
            const lvl = LEVEL_META[r.level] || LEVEL_META.mid;
            return (
              <div key={r.id} className="rounded-xl bg-white ring-1 ring-slate-200 p-4 hover:shadow-md transition">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${lvl.color}`}>
                    {lvl.emoji} {lvl.label}
                  </span>
                  {r.current_load > 0 && (
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] text-blue-700 ring-1 ring-blue-200">
                      💼 {r.current_load} active
                    </span>
                  )}
                </div>
                <h3 className="mt-2 text-base font-bold text-slate-900 leading-snug">
                  {r.title && <span className="text-slate-500 text-sm">{r.title} </span>}
                  {r.name}
                </h3>
                {r.faculty && <p className="text-xs text-slate-500 mt-0.5">{r.faculty}</p>}
                {r.bio && <p className="mt-2 text-xs text-slate-700 leading-relaxed line-clamp-3">{r.bio}</p>}

                {/* Tags */}
                <div className="mt-3 flex flex-wrap gap-1">
                  {r.expertise_tags.slice(0, 6).map((slug) => {
                    const t = renderTag(slug);
                    return (
                      <span key={slug} className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] ring-1 ${t.color}`}>
                        <span>{t.emoji}</span>
                        <span>{t.label}</span>
                      </span>
                    );
                  })}
                  {r.expertise_tags.length > 6 && (
                    <span className="text-[10px] text-slate-400">+{r.expertise_tags.length - 6}</span>
                  )}
                </div>

                {/* Areas */}
                {r.areas.length > 0 && (
                  <p className="mt-2 text-[10px] text-slate-500">📍 {r.areas.slice(0, 3).join(" · ")}</p>
                )}

                {/* Contact */}
                {r.email && (
                  <p className="mt-3 pt-2 border-t border-slate-100 text-[10px] text-slate-400 truncate">
                    📧 {r.email}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Note */}
      <div className="rounded-lg bg-amber-50 ring-1 ring-amber-200 p-3 text-xs text-amber-800">
        💡 <strong>Phase 1:</strong> Foundation — ฐานนักวิจัยพร้อมแล้ว · Phase 2 ถัดไป: Brief library + Manual matching · Phase 3: AI auto-match + generate ง9
      </div>
    </div>
  );
}
