import { Metadata } from "next";
import Link from "next/link";
import {
  fetchProjects,
  fetchKpiCatalog,
  fetchKpiTargetsWithCode,
} from "@/lib/supabase-data";
import type { DBKpiCatalog, DBKpiTarget } from "@/lib/supabase-data";
import {
  EXCELLENCE_KPIS,
  getKpisByCategory,
  countProjectsByKpi,
  classifyProject,
} from "@/lib/excellence-kpi";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "ตอบยุทธศาสตร์ความเป็นเลิศ มทร.ล้านนา | ใต้ร่มพระบารมี",
  description:
    "Mapping ระหว่างโครงการใต้ร่มพระบารมีกับ KPI แผนความเป็นเลิศของ มทร.ล้านนา (ค.ต.ป. + EdPEx)",
};

// ---- ตัวชี้วัด มทร. ปี 2569 จาก DB จริง (rpf_kpi_catalog + kpi_targets.kpi_code) ----

// สีความคืบหน้า — map ของ full class strings (ห้าม dynamic template กัน Tailwind purge)
const PROGRESS_BAR_CLASS = {
  green: "bg-emerald-500",
  yellow: "bg-amber-400",
  red: "bg-red-500",
} as const;

const PROGRESS_TEXT_CLASS = {
  green: "text-emerald-700",
  yellow: "text-amber-600",
  red: "text-red-600",
} as const;

function progressTone(pct: number): keyof typeof PROGRESS_BAR_CLASS {
  if (pct >= 90) return "green";
  if (pct >= 50) return "yellow";
  return "red";
}

interface DbKpiStat {
  kpi: DBKpiCatalog;
  committed: number; // sum target_value ของทุก kpi_targets ที่ kpi_code ตรง
  projectCount: number; // จำนวนโครงการ (distinct project_id) ที่ commit
  pct: number; // % commit ต่อเป้า มทร. (ไม่ cap — cap ตอน render bar)
}

function computeDbKpiStats(
  catalog: DBKpiCatalog[],
  targets: DBKpiTarget[],
  activeIds: Set<string>
): DbKpiStat[] {
  // นับเฉพาะ target ของโครงการที่ active (ตัด cancelled + summary rows ที่ fetchProjects กรองออก)
  // ให้ตรงกับ computeKpiGap ใน dashboard-decisions.ts — ตัวเลขบน /excellence กับ home ต้องตรงกัน
  const scoped = targets.filter((t) => activeIds.has(t.project_id));
  const stats = catalog.map((kpi) => {
    const rows = scoped.filter((t) => t.kpi_code === kpi.code);
    const committed = rows.reduce((sum, t) => sum + (t.target_value || 0), 0);
    const projectCount = new Set(rows.map((t) => t.project_id)).size;
    const pct = (kpi.target_count ?? 0) > 0 ? (committed / (kpi.target_count as number)) * 100 : 0;
    return { kpi, committed, projectCount, pct };
  });
  // KPI scope='underroof' (KPI-39) ขึ้นก่อน — เป้าของกลุ่มใต้ร่มโดยตรง · ที่เหลือเรียงตาม code
  return stats.sort((a, b) => {
    if (a.kpi.scope === "underroof" && b.kpi.scope !== "underroof") return -1;
    if (b.kpi.scope === "underroof" && a.kpi.scope !== "underroof") return 1;
    return a.kpi.code.localeCompare(b.kpi.code);
  });
}

const fmtNum = (n: number | null | undefined) => (n ?? 0).toLocaleString("th-TH");

export default async function ExcellencePage() {
  const [allProjects, kpiCatalog, kpiTargets] = await Promise.all([
    fetchProjects(),
    fetchKpiCatalog(),
    fetchKpiTargetsWithCode(),
  ]);
  // exclude โครงการที่ถูกยกเลิก (fy=2569 มี 1 row) จากการนับ/จับคู่เป็น default
  const projects = allProjects.filter((p) => p.status !== "cancelled");
  const activeIds = new Set(projects.map((p) => p.id));
  const dbKpiStats = computeDbKpiStats(kpiCatalog, kpiTargets, activeIds);
  const counts = countProjectsByKpi(projects);
  const groups = getKpisByCategory();
  const totalLinked = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      {/* Hero — solid amber-700 (กัน gradient purge + อ่านชัด) */}
      <section className="rounded-2xl bg-amber-700 p-6 sm:p-7 text-white shadow-xl shadow-amber-500/20">
        <p className="text-xs sm:text-sm font-medium uppercase tracking-wider text-amber-100">
          🏆 RMUTL Excellence Plan
        </p>
        <h1 className="mt-1.5 text-2xl sm:text-3xl font-bold drop-shadow leading-tight text-white">
          ตอบยุทธศาสตร์ความเป็นเลิศ มทร.ล้านนา ปี 2569
        </h1>
        <p className="mt-3 text-sm sm:text-base text-amber-50 max-w-3xl leading-relaxed">
          แสดง mapping ระหว่างโครงการใต้ร่มพระบารมีกับ KPI
          ของแผนความเป็นเลิศ มทร.ล้านนา (ค.ต.ป. คำรับรองฯ + EdPEx)
          เพื่อให้เห็นว่าแต่ละ KPI กำลังถูกขับเคลื่อนด้วยโครงการใดบ้าง
        </p>

        <div className="mt-5 grid grid-cols-3 gap-3 max-w-2xl">
          {[
            { label: "โครงการทั้งหมด", value: projects.length },
            {
              label: "KPI ที่สนับสนุน",
              value: `${Object.keys(counts).length}/${EXCELLENCE_KPIS.length}`,
            },
            { label: "Total Linkages", value: totalLinked },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl bg-white/15 backdrop-blur-md p-3 ring-1 ring-white/25"
            >
              <p className="text-xs font-medium uppercase text-amber-50/85">
                {s.label}
              </p>
              <p className="mt-1 text-2xl sm:text-3xl font-bold text-white drop-shadow">
                {s.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ตัวชี้วัด มทร. ปี 2569 — จาก DB จริง (rpf_kpi_catalog + kpi_targets ที่มี kpi_code) */}
      {dbKpiStats.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-800">
              📊 ตัวชี้วัด มทร. ปี 2569 — จากฐานข้อมูลจริง
            </h2>
            <div className="flex-1 h-px bg-gradient-to-r from-amber-200 to-transparent" />
            <span className="text-xs text-gray-500">
              {dbKpiStats.length} KPIs
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {dbKpiStats.map(({ kpi, committed, projectCount, pct }) => {
              const isUnderroof = kpi.scope === "underroof";
              const tone = progressTone(pct);
              return (
                <div
                  key={kpi.code}
                  className={
                    isUnderroof
                      ? // KPI-39 — เป้าของกลุ่มใต้ร่มโดยตรง: การ์ดใหญ่เต็มแถว + ring royal
                        "md:col-span-2 lg:col-span-3 rounded-2xl bg-white p-5 sm:p-6 shadow-md ring-2 ring-royal-400"
                      : "rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
                  }
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-block rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.72rem] font-bold text-slate-600">
                      {kpi.code}
                    </span>
                    {isUnderroof && (
                      <span className="inline-block rounded px-1.5 py-0.5 text-[0.65rem] font-medium bg-royal-600 text-white">
                        ⭐ เป้าหมายใต้ร่มโดยตรง
                      </span>
                    )}
                  </div>

                  <h3
                    className={
                      isUnderroof
                        ? "mt-2 text-base sm:text-lg font-bold text-royal-800 leading-snug"
                        : "mt-2 text-sm font-semibold text-gray-800 leading-snug"
                    }
                  >
                    {kpi.name_th}
                  </h3>
                  {isUnderroof && kpi.description && (
                    <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                      {kpi.description}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <p
                      className={
                        isUnderroof
                          ? "text-3xl sm:text-4xl font-bold text-royal-700"
                          : "text-2xl font-bold text-gray-800"
                      }
                    >
                      {fmtNum(committed)}
                      <span className="text-sm font-medium text-gray-400">
                        {" "}
                        / {fmtNum(kpi.target_count)}
                      </span>
                    </p>
                    {kpi.target_unit && (
                      <span className="text-xs text-gray-500">
                        {kpi.target_unit}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    📋 commit จาก {projectCount} โครงการ
                  </p>

                  <div className="mt-3">
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-gray-500">commit ต่อเป้า มทร.</span>
                      <span
                        className={`font-bold ${PROGRESS_TEXT_CLASS[tone]}`}
                      >
                        {Math.round(pct)}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${PROGRESS_BAR_CLASS[tone]}`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="mt-3 text-xs text-gray-500">
            💡 เป้า มทร. เป็นเป้าระดับมหาวิทยาลัย — กลุ่มใต้ร่มฯ
            เป็นผู้สนับสนุนส่วนหนึ่ง ยกเว้น KPI-39
          </p>
        </section>
      )}

      {/* Source notice */}
      <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900 ring-1 ring-blue-200">
        📖 <strong>Source:</strong> PerformanceEvaluation-System (สถช.) · เอกสาร "10-11-68 ตัวชี้วัดสถาบัน" · แผนความเป็นเลิศ มทร.ล้านนา 66-70
      </div>

      {/* หัวข้อ section catalog เดิม — ชี้ชัดว่าเป็น keyword matching ไม่ใช่ commit จาก DB */}
      <div className="pt-2">
        <h2 className="text-xl font-bold text-gray-800">
          🔍 การจับคู่อัตโนมัติ (keyword) — แผนความเป็นเลิศ มทร.ล้านนา
        </h2>
        <p className="mt-1 text-xs text-gray-500">
          ด้านล่างนี้เป็นการจับคู่โครงการ ↔ KPI ด้วย keyword matching
          (ค่าตั้งต้นอัตโนมัติ) — ต่างจาก section ด้านบนที่เป็นตัวเลข commit
          จริงจากฐานข้อมูล
        </p>
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

              // Static fallback bg per KPI category — กัน Tailwind purge dynamic gradient
              const headerBg =
                kpi.category === "ktpp"
                  ? "bg-amber-700"
                  : kpi.category === "edpex_71_a"
                  ? "bg-blue-700"
                  : kpi.category === "edpex_71_c"
                  ? "bg-violet-700"
                  : "bg-rose-700";
              return (
                <div
                  key={kpi.code}
                  className={`overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ${
                    isActive ? "ring-emerald-300" : "ring-slate-200"
                  }`}
                >
                  {/* Header — ใช้ static solid bg แทน gradient (อ่านชัดกว่า + ไม่ติด purge) */}
                  <div className={`${headerBg} p-5 text-white`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-2xl">{kpi.icon}</span>
                          <span className="font-mono text-sm font-bold text-white/90">
                            KPI {kpi.code}
                          </span>
                          {isActive && (
                            <span className="rounded-full bg-white/25 backdrop-blur px-2.5 py-0.5 text-xs font-bold text-white">
                              ✓ Active
                            </span>
                          )}
                        </div>
                        <h3 className="mt-2 text-lg sm:text-xl font-bold drop-shadow leading-snug text-white">
                          {kpi.name}
                        </h3>
                        <p className="mt-1.5 text-sm text-white/95 leading-relaxed">
                          เป้า มทร. <strong>{kpi.target_university ?? "—"}</strong>{" "}
                          {kpi.unit}{" "}
                          {kpi.target_team != null && (
                            <span>· เป้าทีม <strong>{kpi.target_team}</strong> {kpi.unit}</span>
                          )}
                        </p>
                        <p className="mt-1 text-xs text-white/85">
                          👤 ผู้รับผิดชอบ: {kpi.responsible}
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-4xl font-bold drop-shadow text-white">
                          {linkedProjects.length}
                        </p>
                        <p className="text-xs text-white/90 mt-0.5">โครงการ</p>
                      </div>
                    </div>

                    {/* Progress vs team target */}
                    {target > 0 && (
                      <div className="mt-4">
                        <div className="flex justify-between text-xs text-white/95 mb-1.5">
                          <span>ความคืบหน้าต่อเป้า {target} {kpi.unit}</span>
                          <span className="font-bold">{progress.toFixed(0)}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-white/25 overflow-hidden">
                          <div
                            className="h-full bg-white shadow"
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
                        <p className="text-[0.65rem] font-medium text-gray-500 uppercase tracking-wider mb-2">
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
                                <p className="text-[0.65rem] text-gray-400">
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
                          <p className="text-[0.65rem] text-gray-400">
                            🔍 Auto-match keywords:{" "}
                            {kpi.keywords.map((k, i) => (
                              <span key={i}>
                                <code className="rounded bg-gray-100 px-1 text-[0.65rem] text-gray-600">{k}</code>
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
