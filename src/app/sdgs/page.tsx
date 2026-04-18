import { Metadata } from "next";
import { getSupabase } from "@/lib/supabase";
import { SDG_GOALS, sdgTagsToGoals } from "@/lib/sdgs";
import Link from "next/link";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "SDGs | มหาวิทยาลัยเทคโนโลยีราชมงคลล้านนา",
  description:
    "ผลงานวิจัยและบริการวิชาการของ มทร.ล้านนา ที่สนับสนุนเป้าหมายการพัฒนาที่ยั่งยืน (SDGs) ภายใต้โครงการใต้ร่มพระบารมี",
  keywords: [
    "SDGs", "Sustainable Development Goals", "มทร.ล้านนา", "RMUTL",
    "วิจัย", "บริการวิชาการ", "ใต้ร่มพระบารมี", "การพัฒนาที่ยั่งยืน",
  ],
  openGraph: {
    title: "SDGs — มทร.ล้านนา | โครงการใต้ร่มพระบารมี",
    description: "ผลงานที่สนับสนุนเป้าหมายการพัฒนาที่ยั่งยืน 17 ข้อ",
    type: "website",
  },
};

async function fetchSdgData() {
  const supabase = getSupabase();
  if (!supabase) return { projects: [], reports: [] };

  const [{ data: projects }, { data: reports }] = await Promise.all([
    supabase.from("projects").select("id, project_name, organization, sdg_tags, main_program").neq("sdg_tags", "{}"),
    supabase.from("activity_reports").select("id, project_id, sdg_tags, evidence_files, submitted_at").neq("sdg_tags", "{}"),
  ]);

  return { projects: projects || [], reports: reports || [] };
}

export default async function SdgsPage() {
  const { projects, reports } = await fetchSdgData();

  // นับโครงการต่อ SDG
  const countPerSdg: Record<number, number> = {};
  for (const p of projects) {
    for (const tag of (p.sdg_tags || [])) {
      countPerSdg[tag] = (countPerSdg[tag] || 0) + 1;
    }
  }

  const totalTagged = projects.length;
  const totalReports = reports.length;

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "SDGs — มหาวิทยาลัยเทคโนโลยีราชมงคลล้านนา",
            description: "ผลงานที่สนับสนุนเป้าหมายการพัฒนาที่ยั่งยืน (SDGs)",
            url: "https://trpbrmutl.vercel.app/sdgs",
            publisher: {
              "@type": "CollegeOrUniversity",
              name: "มหาวิทยาลัยเทคโนโลยีราชมงคลล้านนา",
              alternateName: "RMUTL",
              url: "https://www.rmutl.ac.th",
            },
            about: { "@type": "Thing", name: "Sustainable Development Goals" },
          }),
        }}
      />

      <div className="space-y-8">
        {/* Header */}
        <div className="rounded-xl bg-gradient-to-r from-blue-900 to-green-800 p-6 text-white shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl">🌐</span>
            <div>
              <h1 className="text-2xl font-bold">Sustainable Development Goals</h1>
              <p className="text-white/80 text-sm">เป้าหมายการพัฒนาที่ยั่งยืน | มทร.ล้านนา</p>
            </div>
          </div>
          <p className="text-white/70 text-xs mt-2">
            ผลงานวิจัยและบริการวิชาการภายใต้โครงการใต้ร่มพระบารมี ที่สนับสนุน SDGs ของสหประชาชาติ
          </p>
          <div className="flex gap-4 mt-4">
            <div className="bg-white/20 rounded-lg px-3 py-2 text-center">
              <p className="text-xl font-bold">{totalTagged}</p>
              <p className="text-xs text-white/70">โครงการที่แท็ก SDGs</p>
            </div>
            <div className="bg-white/20 rounded-lg px-3 py-2 text-center">
              <p className="text-xl font-bold">{totalReports}</p>
              <p className="text-xs text-white/70">รายงานพร้อมหลักฐาน</p>
            </div>
            <div className="bg-white/20 rounded-lg px-3 py-2 text-center">
              <p className="text-xl font-bold">{Object.keys(countPerSdg).length}</p>
              <p className="text-xs text-white/70">SDGs ที่ครอบคลุม</p>
            </div>
          </div>
        </div>

        {/* Public API banner */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 flex items-start gap-3">
          <span className="text-2xl">🔗</span>
          <div className="flex-1">
            <p className="font-medium text-blue-900 text-sm">เปิดข้อมูลสำหรับการอ้างอิง (Open Data)</p>
            <p className="text-xs text-blue-700 mt-0.5">
              หน่วยงานภายนอกสามารถดึงข้อมูลผลงาน SDGs ผ่าน Public API ได้ที่
            </p>
            <code className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded mt-1 inline-block">
              GET /api/public/sdgs?goal=4
            </code>
          </div>
        </div>

        {/* SDG Grid */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">เป้าหมายที่ดำเนินงาน</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {SDG_GOALS.map((goal) => {
              const count = countPerSdg[goal.id] || 0;
              return (
                <Link
                  key={goal.id}
                  href={`/sdgs/${goal.id}`}
                  className={`relative rounded-xl p-4 border-2 transition hover:shadow-md ${
                    count > 0 ? "border-transparent shadow-sm" : "border-gray-100 opacity-50"
                  }`}
                  style={{ backgroundColor: count > 0 ? goal.bg : "#f9fafb" }}
                >
                  {count > 0 && (
                    <span
                      className="absolute -top-2 -right-2 text-xs font-bold text-white rounded-full w-6 h-6 flex items-center justify-center"
                      style={{ backgroundColor: goal.color }}
                    >
                      {count}
                    </span>
                  )}
                  <div className="text-3xl mb-2">{goal.icon}</div>
                  <div
                    className="text-xs font-bold mb-1"
                    style={{ color: goal.color }}
                  >
                    SDG {goal.id}
                  </div>
                  <p className="text-xs text-gray-700 font-medium leading-snug">
                    {goal.name_th}
                  </p>
                  {count > 0 && (
                    <p className="text-xs mt-1" style={{ color: goal.color }}>
                      {count} โครงการ →
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* โครงการล่าสุดที่มีหลักฐาน */}
        {totalReports > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">รายงานล่าสุดพร้อมหลักฐาน</h2>
            <div className="space-y-3">
              {reports.slice(0, 5).map((r: {
                id: string; project_id: string; sdg_tags: number[];
                evidence_files: { name: string; url: string; type: string }[];
                submitted_at: string;
              }) => {
                const proj = projects.find((p: { id: string }) => p.id === r.project_id);
                const goals = sdgTagsToGoals(r.sdg_tags || []);
                return (
                  <div key={r.id} className="rounded-lg bg-white border p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">
                          {proj?.project_name || r.project_id}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">{proj?.organization}</p>
                      </div>
                      <p className="text-xs text-gray-400">
                        {new Date(r.submitted_at).toLocaleDateString("th-TH")}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {goals.map((g) => (
                        <span key={g.id} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white"
                          style={{ backgroundColor: g.color }}>
                          {g.icon} SDG {g.id}
                        </span>
                      ))}
                    </div>
                    {(r.evidence_files || []).length > 0 && (
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {r.evidence_files.map((f, i) => (
                          <a key={i} href={f.url} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                            {f.type === "pdf" ? "📄" : "🖼️"} {f.name}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
