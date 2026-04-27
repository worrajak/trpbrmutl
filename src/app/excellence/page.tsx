import { Metadata } from "next";
import Link from "next/link";
import { fetchProjects } from "@/lib/supabase-data";
import {
  EXCELLENCE_KPIS,
  getKpisByCategory,
  countProjectsByKpi,
  classifyProject,
} from "@/lib/excellence-kpi";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "ตอบยุทธศาสตร์ความเลิศ มทร.ล้านนา | ใต้ร่มพระบารมี",
  description:
    "Mapping ระหว่างโครงการใต้ร่มพระบารมีกับ KPI แผนความเป็นเลิศของ มทร.ล้านนา (ค.ต.ป. + EdPEx)",
};

export default async function ExcellencePage() {
  const projects = await fetchProjects();
  const counts = countProjectsByKpi(projects);
  const groups = getKpisByCategory();
  const totalLinked = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="rounded-3xl bg-gradient-to-br from-amber-500 via-orange-600 to-rose-600 p-6 sm:p-8 text-white shadow-2xl shadow-amber-500/20">
        <p className="text-xs font-medium uppercase tracking-wider text-amber-100/80">
          🏆 RMUTL Excellence Plan
        </p>
        <h1 className="mt-1 text-2xl sm:text-3xl font-bold drop-shadow">
          ตอบยุทธศาสตร์ความเลิศ มทร.ล้านนา ปี 2569
        </h1>
        <p className="mt-2 text-sm text-amber-50/90 max-w-2xl">
          แสดง mapping ระหว่างโครงการใต้ร่มพระบารมี
          กับ KPI ของแผนความเลิศ มทร.ล้านนา
          (ค.ต.ป. คำรับรองฯ + EdPEx)
          เพื่อให้เห็นว่าแต่ละ KPI กำลังถูกขับเคลื่อนด้วยโครงการใดบ้าง
        </p>

        <div className="mt-5 grid grid-cols-3 gap-3 max-w-xl">
          {[
            {
              label: "โครงการทั้งหมด",
              value: projects.length,
              accent: "text-amber-200",
            },
            {
              label: "KPI ที่สนับสนุน",
              value: `${Object.keys(counts).length}/${EXCELLENCE_KPIS.length}`,
              accent: "text-yellow-200",
            },
            {
              label: "Total Linkages",
              value: totalLinked,
              accent: "text-rose-200",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl bg-white/15 backdrop-blur-md p-3 ring-1 ring-white/20"
            >
              <p className="text-[10px] font-medium uppercase text-white/70">
                {s.label}
              </p>
              <p className={`mt-0.5 text-2xl font-bold ${s.accent}`}>{s.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Source notice */}
      <div className="rounded-xl bg-blue-50 p-3 text-xs text-blue-800 ring-1 ring-blue-200">
        📖 Source: PerformanceEvaluation-System (สถช.) · เอกสาร "10-11-68 ตัวชี้วัดสถาบัน" · แผนความเป็นเลิศ มทร.ล้านนา 66-70
      </div>

      {/* Per-KPI deep dive */}
      {Object.entries(groups).map(([catLabel, kpis]) => (
        <section key={catLabel}>
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-800">หมวด: {catLabel}</h2>
            <div className="flex-1 h-px bg-gradient-to-r from-amber-200 to-transparent" />
            <span className="text-xs text-gray-500">{kpis.length} KPIs</span>
          </div>

          <div className="space-y-3">
            {kpis.map((kpi) => {
              const linkedProjects = projects.filter((p) => {
                // อนาคต: ถ้า DB เพิ่ม column excellence_kpis แล้ว → ใช้ override นั้น
                const override = (p as { excellence_kpis?: string[] | null }).excellence_kpis;
                const codes = override && override.length > 0 ? override : classifyProject(p);
                return codes.includes(kpi.code);
              });
              const target = kpi.target_team || kpi.target_university || 0;
              const progress = target > 0 ? Math.min((linkedProjects.length / target) * 100, 100) : 0;
              const isActive = linkedProjects.length > 0;

              return (
                <div
                  key={kpi.code}
                  className={`overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ${
                    isActive ? "ring-emerald-200" : "ring-gray-100"
                  }`}
                >
                  {/* Header */}
                  <div className={`bg-gradient-to-r ${kpi.color} p-4 text-white`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{kpi.icon}</span>
                          <span className="font-mono text-xs font-bold opacity-80">
                            KPI {kpi.code}
                          </span>
                          {isActive && (
                            <span className="rounded-full bg-white/30 backdrop-blur px-2 py-0.5 text-[10px] font-bold">
                              ✓ Active
                            </span>
                          )}
                        </div>
                        <h3 className="mt-1 text-base font-bold drop-shadow">
                          {kpi.name}
                        </h3>
                        <p className="mt-1 text-xs text-white/80">
                          เป้า มทร. {kpi.target_university ?? "—"}{" "}
                          {kpi.unit}{" "}
                          {kpi.target_team != null && (
                            <span>· เป้าทีม {kpi.target_team} {kpi.unit}</span>
                          )}
                          · ผู้รับผิดชอบ: {kpi.responsible}
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-3xl font-bold drop-shadow">
                          {linkedProjects.length}
                        </p>
                        <p className="text-[10px] text-white/80">โครงการ</p>
                      </div>
                    </div>

                    {/* Progress vs team target */}
                    {target > 0 && (
                      <div className="mt-3">
                        <div className="flex justify-between text-[10px] text-white/80 mb-1">
                          <span>ความคืบหน้าต่อเป้า {target} {kpi.unit}</span>
                          <span>{progress.toFixed(0)}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
                          <div
                            className="h-full bg-white"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Linked projects */}
                  <div className="p-4">
                    {linkedProjects.length === 0 ? (
                      <div className="rounded-lg bg-gray-50 p-3 text-center text-xs text-gray-400">
                        ยังไม่มีโครงการที่สนับสนุน KPI นี้
                      </div>
                    ) : (
                      <>
                        <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-2">
                          📋 โครงการที่สนับสนุน ({linkedProjects.length})
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {linkedProjects.slice(0, 6).map((p) => (
                            <Link
                              key={p.id}
                              href={`/projects/${p.id}`}
                              className="group flex items-start gap-2 rounded-lg p-2 hover:bg-amber-50 transition"
                            >
                              <span className="mt-0.5 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500" />
                              <div className="min-w-0">
                                <p className="line-clamp-2 text-xs font-medium text-gray-700 group-hover:text-amber-700 transition">
                                  {p.project_name}
                                </p>
                                <p className="text-[10px] text-gray-400">
                                  👤 {p.responsible || p.organization || "—"}
                                </p>
                              </div>
                            </Link>
                          ))}
                        </div>
                        {linkedProjects.length > 6 && (
                          <p className="mt-2 text-center text-xs text-gray-400">
                            + อีก {linkedProjects.length - 6} โครงการ
                          </p>
                        )}

                        {/* Keywords used */}
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-[10px] text-gray-400">
                            🔍 Auto-match keywords:{" "}
                            {kpi.keywords.map((k, i) => (
                              <span key={i}>
                                <code className="rounded bg-gray-100 px-1 text-[10px] text-gray-600">{k}</code>
                                {i < kpi.keywords.length - 1 && " · "}
                              </span>
                            ))}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {/* Footer note */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50 p-5 ring-1 ring-slate-200">
        <h3 className="text-sm font-bold text-gray-800">
          📌 หมายเหตุการ Mapping
        </h3>
        <ul className="mt-2 space-y-1 text-xs text-gray-600">
          <li>
            • โครงการแต่ละโครงการอาจตอบ KPI ได้หลายตัวพร้อมกัน
            (เช่นโครงการอบรมเซรามิกในชุมชน → ตอบทั้ง 7.1ก-1, 7.1ก-3, 7.1ก-4)
          </li>
          <li>
            • ระบบใช้ <strong>auto-classify</strong> ด้วย keyword matching เป็นค่าตั้งต้น
          </li>
          <li>
            • Admin override ได้ผ่าน{" "}
            <Link href="/admin/projects" className="text-blue-600 hover:underline">
              /admin/projects
            </Link>{" "}
            (ฟิลด์ <code className="bg-gray-100 px-1 rounded">excellence_kpis</code> รายโครงการ — TODO)
          </li>
          <li>
            • เป้าหมาย "ทีมใต้ร่มพระบารมี" ดึงมาจาก KPI Analysis ของ สถช. (PerformanceEvaluation-System)
          </li>
        </ul>
      </div>
    </div>
  );
}
