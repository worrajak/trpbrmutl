import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { SDG_GOALS, getSdgGoal, sdgTagsToGoals } from "@/lib/sdgs";
import Link from "next/link";

export const revalidate = 300;

export async function generateStaticParams() {
  return SDG_GOALS.map((g) => ({ goal: String(g.id) }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ goal: string }> }
): Promise<Metadata> {
  const { goal } = await params;
  const g = getSdgGoal(Number(goal));
  if (!g) return {};
  return {
    title: `SDG ${g.id}: ${g.name_th} | มทร.ล้านนา`,
    description: `ผลงานของ มทร.ล้านนา ที่สนับสนุน SDG ${g.id}: ${g.name_en} — ${g.name_th} ภายใต้โครงการใต้ร่มพระบารมี`,
    keywords: [...g.keywords, "มทร.ล้านนา", "RMUTL", "SDGs", `SDG${g.id}`, g.name_en, g.name_th],
    openGraph: {
      title: `SDG ${g.id}: ${g.name_th} — มทร.ล้านนา`,
      description: `ผลงานและหลักฐานที่สนับสนุน ${g.name_en}`,
      type: "website",
    },
  };
}

async function fetchGoalData(goalId: number) {
  const supabase = getSupabase();
  if (!supabase) return { projects: [], reports: [] };

  const [{ data: projects }, { data: reports }] = await Promise.all([
    supabase.from("projects")
      .select("id, project_name, organization, sdg_tags, main_program, responsible, budget_total")
      .contains("sdg_tags", [goalId]),
    supabase.from("activity_reports")
      .select("id, project_id, sdg_tags, evidence_files, submitted_at, report_description, submitted_by")
      .contains("sdg_tags", [goalId])
      .order("submitted_at", { ascending: false }),
  ]);

  return { projects: projects || [], reports: reports || [] };
}

export default async function SdgGoalPage(
  { params }: { params: Promise<{ goal: string }> }
) {
  const { goal } = await params;
  const goalId = Number(goal);
  const g = getSdgGoal(goalId);
  if (!g || isNaN(goalId)) notFound();

  const { projects, reports } = await fetchGoalData(goalId);

  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ResearchProject",
            name: `SDG ${g.id}: ${g.name_en} — มหาวิทยาลัยเทคโนโลยีราชมงคลล้านนา`,
            description: `ผลงานที่สนับสนุน ${g.name_en} (${g.name_th})`,
            url: `https://trpbrmutl.vercel.app/sdgs/${g.id}`,
            about: { "@type": "Thing", name: g.name_en, identifier: `SDG${g.id}` },
            publisher: { "@type": "CollegeOrUniversity", name: "RMUTL", url: "https://www.rmutl.ac.th" },
            numberOfItems: projects.length,
          }),
        }}
      />

      <div className="space-y-6">
        {/* Back */}
        <Link href="/sdgs" className="text-sm text-gray-500 hover:text-gray-700">← SDGs ทั้งหมด</Link>

        {/* Header */}
        <div className="rounded-xl p-6 text-white shadow-lg" style={{ backgroundColor: g.color }}>
          <div className="flex items-center gap-4">
            <span className="text-5xl">{g.icon}</span>
            <div>
              <p className="text-sm font-medium opacity-80">SDG {g.id}</p>
              <h1 className="text-2xl font-bold">{g.name_th}</h1>
              <p className="text-sm opacity-80">{g.name_en}</p>
            </div>
          </div>
          <div className="flex gap-4 mt-4">
            <div className="bg-white/20 rounded-lg px-3 py-2 text-center">
              <p className="text-xl font-bold">{projects.length}</p>
              <p className="text-xs opacity-75">โครงการ</p>
            </div>
            <div className="bg-white/20 rounded-lg px-3 py-2 text-center">
              <p className="text-xl font-bold">{reports.length}</p>
              <p className="text-xs opacity-75">รายงาน</p>
            </div>
          </div>
        </div>

        {/* Citation API */}
        <div className="rounded-lg border p-3 bg-gray-50 text-xs text-gray-600">
          <span className="font-medium">📎 Citation API: </span>
          <code className="bg-gray-100 px-1.5 py-0.5 rounded">
            GET /api/public/sdgs?goal={g.id}
          </code>
          <span className="ml-2 text-gray-400">— สำหรับหน่วยงานภายนอกอ้างอิง</span>
        </div>

        {/* Projects */}
        {projects.length > 0 ? (
          <div>
            <h2 className="font-semibold text-gray-800 mb-3">โครงการที่เกี่ยวข้อง ({projects.length})</h2>
            <div className="space-y-3">
              {projects.map((p: {
                id: string; project_name: string; organization: string;
                sdg_tags: number[]; responsible: string; budget_total: number;
              }) => {
                const otherGoals = sdgTagsToGoals((p.sdg_tags || []).filter((t) => t !== goalId));
                return (
                  <Link key={p.id} href={`/projects/${p.id}`}
                    className="block rounded-lg bg-white border p-4 hover:shadow-md transition">
                    <p className="font-medium text-gray-800 text-sm">{p.project_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{p.organization}</p>
                    {p.responsible && (
                      <p className="text-xs text-gray-500">ผู้รับผิดชอบ: {p.responsible}</p>
                    )}
                    {otherGoals.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        <span className="text-xs text-gray-400">SDGs อื่น:</span>
                        {otherGoals.map((og) => (
                          <span key={og.id} className="text-xs text-white px-1.5 py-0.5 rounded-full"
                            style={{ backgroundColor: og.color }}>
                            {og.icon}{og.id}
                          </span>
                        ))}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="rounded-lg bg-gray-50 p-8 text-center text-gray-500">
            ยังไม่มีโครงการที่แท็ก SDG {g.id} นี้
          </div>
        )}

        {/* Reports with evidence */}
        {reports.length > 0 && (
          <div>
            <h2 className="font-semibold text-gray-800 mb-3">รายงานและหลักฐาน ({reports.length})</h2>
            <div className="space-y-3">
              {reports.map((r: {
                id: string; project_id: string; report_description: string;
                submitted_by: string; submitted_at: string;
                evidence_files: { name: string; url: string; type: string }[];
              }) => {
                const proj = projects.find((p: { id: string }) => p.id === r.project_id);
                return (
                  <div key={r.id} className="rounded-lg bg-white border p-4">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">
                          {proj?.project_name || r.project_id}
                        </p>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">{r.report_description}</p>
                        <p className="text-xs text-gray-400 mt-1">รายงานโดย: {r.submitted_by}</p>
                      </div>
                      <p className="text-xs text-gray-400 shrink-0">
                        {new Date(r.submitted_at).toLocaleDateString("th-TH")}
                      </p>
                    </div>
                    {(r.evidence_files || []).length > 0 && (
                      <div className="flex gap-2 mt-3 flex-wrap border-t pt-2">
                        <span className="text-xs text-gray-500">หลักฐาน:</span>
                        {r.evidence_files.map((f, i) => (
                          <a key={i} href={f.url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-blue-600 hover:underline bg-blue-50 px-2 py-0.5 rounded">
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
