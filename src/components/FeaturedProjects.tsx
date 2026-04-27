import { SDG_GOALS } from "@/lib/sdgs";
import Link from "next/link";

/**
 * FeaturedProjects — แสดงโครงการแบบ catalog cards บนหน้าแรก
 *
 * ดีไซน์:
 *  - Gradient background ตาม main_program
 *  - SDG color tags (วงกลมเล็กๆ)
 *  - Status pulse dot สื่อ "active"
 *  - Hover lift effect
 */

interface ProjectCard {
  id: string;
  project_name: string;
  responsible: string | null;
  organization: string | null;
  main_program: string | null;
  status: string | null;
  budget_total: number | string | null;
  budget_used: number | string | null;
  sdg_tags: number[] | null;
  fiscal_year: number | null;
}

interface Props {
  projects: ProjectCard[];
  limit?: number;
}

const PROGRAM_GRADIENT: Record<string, string> = {
  "1.ผลักดันเทคโนโลยี": "from-violet-500 to-purple-600",
  "2.ขับเคลื่อนกลไก": "from-amber-500 to-orange-600",
  "3.พัฒนากำลังคน": "from-rose-500 to-pink-600",
  "ใต้ร่มพระบารมี": "from-emerald-500 to-teal-600",
};

const STATUS_INFO: Record<
  string,
  { label: string; color: string; pulse: boolean }
> = {
  approved: { label: "อนุมัติแล้ว", color: "bg-emerald-500", pulse: true },
  in_progress: { label: "กำลังดำเนินการ", color: "bg-blue-500", pulse: true },
  completed: { label: "เสร็จสิ้น", color: "bg-gray-500", pulse: false },
  delayed: { label: "ล่าช้า", color: "bg-amber-500", pulse: true },
  cancelled: { label: "ยกเลิก", color: "bg-red-500", pulse: false },
};

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString("th-TH");
}

export default function FeaturedProjects({ projects, limit = 6 }: Props) {
  // เลือกโครงการที่น่าสนใจ — มี SDG tag + งบสูง + กำลังดำเนินการ
  const featured = [...projects]
    .filter((p) => p.project_name && Number(p.budget_total) > 0)
    .sort((a, b) => {
      // priority: มี sdg_tags > งบสูง
      const sdgA = (a.sdg_tags || []).length;
      const sdgB = (b.sdg_tags || []).length;
      if (sdgA !== sdgB) return sdgB - sdgA;
      return Number(b.budget_total || 0) - Number(a.budget_total || 0);
    })
    .slice(0, limit);

  if (featured.length === 0) return null;

  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-violet-600 uppercase tracking-wider">
            ✨ Featured Projects
          </p>
          <h2 className="mt-0.5 text-xl sm:text-2xl font-bold text-gray-800">
            โครงการเด่น · ปี 2569
          </h2>
        </div>
        <Link
          href="/projects"
          className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-4 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-100 transition"
        >
          ดูทั้งหมด {projects.length} โครงการ →
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {featured.map((p) => {
          const gradient =
            PROGRAM_GRADIENT[p.main_program || ""] ||
            "from-gray-500 to-slate-600";
          const status = STATUS_INFO[p.status || "approved"] || STATUS_INFO.approved;
          const budgetTotal = Number(p.budget_total || 0);
          const budgetUsed = Number(p.budget_used || 0);
          const usagePercent =
            budgetTotal > 0 ? Math.round((budgetUsed / budgetTotal) * 100) : 0;
          const sdgs = (p.sdg_tags || [])
            .map((id) => SDG_GOALS.find((g) => g.id === id))
            .filter(Boolean)
            .slice(0, 5);

          return (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="group relative overflow-hidden rounded-2xl bg-white shadow-md hover:shadow-xl transition-all hover:-translate-y-1 ring-1 ring-gray-100"
            >
              {/* Header: gradient banner */}
              <div className={`relative h-20 bg-gradient-to-br ${gradient} p-3`}>
                {/* Status pulse */}
                <div className="absolute top-2 right-2 flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-md px-2 py-0.5 ring-1 ring-white/30">
                  {status.pulse ? (
                    <span className="relative flex h-1.5 w-1.5">
                      <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${status.color} opacity-75`} />
                      <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${status.color}`} />
                    </span>
                  ) : (
                    <span className={`h-1.5 w-1.5 rounded-full ${status.color}`} />
                  )}
                  <span className="text-[10px] font-medium text-white">
                    {status.label}
                  </span>
                </div>

                <p className="text-[10px] font-medium text-white/70 uppercase tracking-wider">
                  {p.main_program || "ใต้ร่มพระบารมี"}
                </p>
                {/* Floating SDG color dots */}
                {sdgs.length > 0 && (
                  <div className="absolute bottom-2 right-3 flex -space-x-1.5">
                    {sdgs.map((g) => (
                      <span
                        key={g!.id}
                        className="inline-flex h-5 w-5 items-center justify-center rounded-full ring-2 ring-white text-[9px]"
                        style={{ backgroundColor: g!.color }}
                        title={`SDG ${g!.id}: ${g!.name_th}`}
                      >
                        <span className="text-white font-bold">{g!.id}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Body */}
              <div className="p-4">
                <h3 className="line-clamp-2 text-sm font-bold text-gray-800 group-hover:text-violet-700 transition">
                  {p.project_name}
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                  👤 {p.responsible || p.organization || "—"}
                </p>

                {/* Budget bar */}
                <div className="mt-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-gray-400">งบประมาณ</span>
                    <span className="text-sm font-bold text-gray-700">
                      {fmt(budgetTotal)}{" "}
                      <span className="text-[10px] font-normal text-gray-400">บาท</span>
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className={`h-full transition-all bg-gradient-to-r ${
                        usagePercent >= 80
                          ? "from-emerald-400 to-emerald-600"
                          : usagePercent >= 40
                          ? "from-blue-400 to-blue-600"
                          : "from-amber-400 to-orange-500"
                      }`}
                      style={{ width: `${Math.min(usagePercent, 100)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-gray-400">
                    เบิกแล้ว {fmt(budgetUsed)} ({usagePercent}%)
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
