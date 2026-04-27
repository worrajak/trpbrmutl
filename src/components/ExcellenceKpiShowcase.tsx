import {
  EXCELLENCE_KPIS,
  getKpisByCategory,
  countProjectsByKpi,
} from "@/lib/excellence-kpi";
import Link from "next/link";

/**
 * ExcellenceKpiShowcase — โครงการตอบยุทธศาสตร์ความเลิศ มทร.ล้านนา
 *
 * แทนที่จะแสดง KPI ลอยๆ → mapping โครงการเข้ากับ KPI ของ มทร.
 * แต่ละ card บอกเป้า + จำนวนโครงการที่สนับสนุน + progress
 *
 * "เท่ดี กว่าโชว์ตัวเลขเฉยๆ" — สื่อชัดว่า KPI ไหนกำลังถูกขับเคลื่อนยังไง
 */

interface Props {
  projects: Array<{
    id?: string;
    project_name?: string | null;
    organization?: string | null;
    responsible?: string | null;
    main_program?: string | null;
    excellence_kpis?: string[] | null;
  }>;
}

export default function ExcellenceKpiShowcase({ projects }: Props) {
  const counts = countProjectsByKpi(projects);
  const groups = getKpisByCategory();
  const totalLinked = Object.values(counts).reduce((a, b) => a + b, 0);
  const activeCount = Object.keys(counts).length;

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-50 via-white to-blue-50 p-5 sm:p-7 ring-1 ring-slate-200">
      {/* Decorative gradient orb */}
      <div className="pointer-events-none absolute -top-20 -right-20 h-48 w-48 rounded-full bg-gradient-to-br from-amber-200 to-orange-300 opacity-30 blur-3xl" />

      <div className="relative">
        {/* Header */}
        <div className="mb-5 flex items-end justify-between gap-2 flex-wrap">
          <div>
            <p className="text-xs font-medium text-amber-600 uppercase tracking-wider">
              🏆 RMUTL Excellence Plan · 2569
            </p>
            <h2 className="mt-0.5 text-xl sm:text-2xl font-bold text-gray-800">
              ตอบยุทธศาสตร์ความเลิศ มทร.ล้านนา
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              โครงการใต้ร่มพระบารมี <strong className="text-gray-700">{projects.length}</strong> โครงการ
              · สนับสนุน KPI <strong className="text-emerald-700">{activeCount}/{EXCELLENCE_KPIS.length}</strong> ตัว
              · รวม{" "}
              <strong className="text-amber-700">{totalLinked}</strong> linkages
            </p>
          </div>
          <Link
            href="/excellence"
            className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-1.5 text-xs font-medium text-white shadow-md hover:shadow-lg hover:scale-105 transition"
          >
            ดู mapping เต็ม →
          </Link>
        </div>

        {/* KPI Groups */}
        <div className="space-y-5">
          {Object.entries(groups).map(([catLabel, kpis]) => (
            <div key={catLabel}>
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-[10px] font-bold text-slate-700">
                  {catLabel}
                </span>
                <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent" />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {kpis.map((kpi) => {
                  const count = counts[kpi.code] || 0;
                  const target = kpi.target_team || kpi.target_university || 0;
                  const progress = target > 0 ? Math.min((count / target) * 100, 100) : 0;
                  const isActive = count > 0;

                  return (
                    <div
                      key={kpi.code}
                      className={`group relative overflow-hidden rounded-2xl bg-white shadow-sm ring-1 transition-all ${
                        isActive
                          ? "ring-emerald-200 hover:shadow-md hover:-translate-y-0.5"
                          : "ring-gray-100 opacity-70 hover:opacity-100"
                      }`}
                    >
                      {/* Top gradient strip */}
                      <div
                        className={`h-1 bg-gradient-to-r ${kpi.color} ${!isActive && "opacity-30"}`}
                      />

                      <div className="p-3">
                        {/* Header: code + icon + count badge */}
                        <div className="flex items-start justify-between gap-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className={`text-base ${!isActive && "grayscale"}`}
                            >
                              {kpi.icon}
                            </span>
                            <span className="text-[9px] font-mono font-bold text-slate-500">
                              KPI {kpi.code}
                            </span>
                          </div>

                          {/* Active count */}
                          {isActive && (
                            <div className="relative flex-shrink-0">
                              <div
                                className={`flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br ${kpi.color} text-[9px] font-bold text-white shadow-md`}
                              >
                                {count}
                              </div>
                              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                                <span
                                  className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"
                                />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                              </span>
                            </div>
                          )}
                        </div>

                        {/* KPI name */}
                        <h4 className="mt-1.5 text-xs font-bold text-gray-800 line-clamp-2 min-h-[32px]">
                          {kpi.name}
                        </h4>

                        {/* Target line */}
                        <p className="mt-1 text-[10px] text-gray-500">
                          เป้า:{" "}
                          <strong className="text-gray-700">
                            {target}
                          </strong>{" "}
                          {kpi.unit}
                        </p>

                        {/* Progress bar */}
                        <div className="mt-2">
                          <div className="flex justify-between text-[9px] text-gray-400 mb-0.5">
                            <span>มี {count} โครงการ</span>
                            <span>{progress.toFixed(0)}%</span>
                          </div>
                          <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className={`h-full transition-all bg-gradient-to-r ${kpi.color}`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>

                        {/* Responsible (compact) */}
                        <p className="mt-1.5 text-[9px] text-slate-400 truncate">
                          👤 {kpi.responsible}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-5 flex items-center justify-between gap-3 rounded-xl bg-white/60 backdrop-blur-sm p-3 ring-1 ring-slate-100">
          <p className="text-[10px] text-slate-600">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 mr-1.5" />
            <strong className="text-slate-800">Auto-classify</strong> โดยจับคำในชื่อโครงการ ·
            admin สามารถ override ได้ที่{" "}
            <Link href="/admin/projects" className="text-blue-600 hover:underline">
              /admin/projects
            </Link>
          </p>
          <p className="text-[10px] text-slate-400 hidden sm:block">
            Source: PerformanceEvaluation-System (สถช.)
          </p>
        </div>
      </div>
    </section>
  );
}
