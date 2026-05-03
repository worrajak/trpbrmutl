import { Metadata } from "next";
import Link from "next/link";
import { fetchProjects } from "@/lib/supabase-data";
import {
  FRAMEWORKS,
  IMPACT_DIMENSIONS,
  PLANS,
  countProjectsPerPlan,
  computeImpactStats,
  buildConnectionTable,
  PLAN_TO_DB_PROGRAM,
} from "@/lib/foundation";
import PlanTabs from "@/components/foundation/PlanTabs";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "ที่มาและความสำคัญ | ใต้ร่มพระบารมี",
  description:
    "งานของกลุ่มแผนงานใต้ร่มพระบารมี · 5 กรอบ + 4 มิติผลกระทบ + 3 แผนงานหลัก × 25 ตัวชี้วัด · งบ 8M บาท · ปี 2569",
};

export default async function FoundationPage() {
  const projects = await fetchProjects();
  const projectCounts = countProjectsPerPlan(projects);
  const impactStats = computeImpactStats(projects);
  const totalKpis = PLANS.reduce((s, p) => s + p.kpis.length, 0);
  const totalSubProjects = PLANS.reduce((s, p) => s + p.subProjects.length, 0);
  const totalBudget = PLANS.reduce((s, p) => s + p.budget, 0);
  const connectionRows = buildConnectionTable();

  return (
    <div className="space-y-4">
      {/* ============== HERO compact ============== */}
      <div className="rounded-xl bg-gradient-to-br from-amber-500 via-orange-600 to-rose-600 p-4 text-white shadow-lg shadow-amber-500/20">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-amber-100/90">
              📖 Foundation · Why we exist
            </p>
            <h1 className="mt-0.5 text-xl sm:text-2xl font-bold drop-shadow">
              ที่มาและความสำคัญ
            </h1>
            <p className="mt-1 text-xs text-amber-50/90 max-w-3xl">
              งานของเรายึดราก <strong>5 กรอบ</strong> · ตอบ <strong>4 มิติผลกระทบ</strong> ·
              ผ่าน <strong>3 แผนงานหลัก × {totalKpis} ตัวชี้วัด · {totalSubProjects} โครงการย่อย</strong>
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: "งบรวม", value: `${(totalBudget / 1_000_000).toFixed(0)}M`, sub: "บาท" },
              { label: "โครงการในระบบ", value: projects.length, sub: `${impactStats.totalCommunities} พื้นที่` },
              { label: "SDGs ที่ตอบ", value: `${impactStats.totalSdgs}/17`, sub: "เป้าโลก" },
            ].map((s) => (
              <div key={s.label} className="rounded-lg bg-white/15 backdrop-blur px-3 py-1.5 ring-1 ring-white/20">
                <p className="text-[9px] uppercase text-white/70">{s.label}</p>
                <p className="text-lg font-bold leading-tight drop-shadow">{s.value}</p>
                <p className="text-[9px] text-white/80">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ============== SECTION 1: 5 กรอบที่เรายึด ============== */}
      <section>
        <h2 className="mb-2 text-base sm:text-lg font-bold text-gray-800">
          🌳 5 กรอบที่เรายึด
        </h2>
        <div className="space-y-3">
          {FRAMEWORKS.map((f) => (
            <div
              key={f.id}
              className="relative overflow-hidden rounded-xl ring-1 ring-slate-200 bg-white p-4 hover:shadow-md transition"
            >
              {/* Side gradient strip — ใช้ wider เพื่อโดดเด่นขึ้น */}
              <div className={`absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b ${f.color}`} />
              <div className="pl-4 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <span className="text-3xl flex-shrink-0">{f.icon}</span>
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-base sm:text-lg font-bold text-slate-900">{f.name}</h3>
                      <span className="text-[10px] text-slate-400 font-mono">L{f.level}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-700 leading-snug">{f.shortDesc}</p>
                    <p className="mt-1.5 text-xs text-slate-500 italic leading-relaxed">↳ {f.detail}</p>
                  </div>
                </div>
                {f.externalLink && (
                  <a
                    href={f.externalLink}
                    target={f.externalLink.startsWith("http") ? "_blank" : undefined}
                    rel="noreferrer"
                    className="flex-shrink-0 inline-flex items-center gap-1 rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 transition"
                  >
                    อ่านต่อ →
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============== SECTION 2: 4 มิติผลกระทบ ============== */}
      <section>
        <h2 className="mb-2 text-base sm:text-lg font-bold text-gray-800">
          🎯 4 มิติผลกระทบที่เรามุ่งเป้า
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {IMPACT_DIMENSIONS.map((d) => (
            <div
              key={d.id}
              className={`rounded-xl p-4 ring-1 ${d.color}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl">{d.icon}</span>
                <h3 className="text-base font-bold">{d.name}</h3>
              </div>
              <p className="mt-2 text-xs opacity-90 leading-snug">{d.description}</p>
              <p className="mt-3 text-xs font-bold border-t border-current/20 pt-2">
                {d.computeStatLabel(impactStats)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ============== SECTION 3: 3 แผนงานหลัก × KPI ย่อย ============== */}
      <section>
        <h2 className="mb-2 text-base sm:text-lg font-bold text-gray-800">
          📚 3 แผนงานหลัก · งบ {(totalBudget / 1_000_000).toFixed(0)}M บาท
        </h2>
        <PlanTabs projectCounts={projectCounts} />
      </section>

      {/* ============== SECTION 4: Connection Table ============== */}
      <section>
        <h2 className="mb-2 text-base sm:text-lg font-bold text-gray-800">
          🔗 ทุกแผน × ทุกตัวชี้วัด × ทุกกรอบ
        </h2>
        <div className="rounded-lg bg-white ring-1 ring-gray-200 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-[10px] uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left">แผนงาน</th>
                <th className="px-3 py-2 text-right">งบ</th>
                <th className="px-3 py-2 text-left">KPI มทร.</th>
                <th className="px-3 py-2 text-left">SDGs</th>
                <th className="px-3 py-2 text-left">โครงการในระบบ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {connectionRows.map((row) => {
                const dbProgram = PLAN_TO_DB_PROGRAM[row.planNumber];
                return (
                  <tr key={row.planNumber} className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <p className="font-bold text-gray-900">
                        แผน {row.planNumber}: {row.planTitle}
                      </p>
                      <p className="text-[10px] text-gray-400">{dbProgram}</p>
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {(row.budget / 1_000_000).toFixed(1)}M
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-0.5">
                        {row.rmutlKpis.map((c) => (
                          <code
                            key={c}
                            className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700 ring-1 ring-blue-100"
                          >
                            {c}
                          </code>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-0.5">
                        {row.sdgs.map((s) => (
                          <Link
                            key={s}
                            href={`/sdgs/${s}`}
                            className="inline-flex items-center justify-center h-4 w-4 rounded text-[9px] font-bold text-white bg-green-600 hover:bg-green-700"
                          >
                            {s}
                          </Link>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-gray-600">
                      <Link
                        href={`/projects?main_program=${encodeURIComponent(dbProgram)}`}
                        className="text-blue-600 hover:underline"
                      >
                        {projectCounts[row.planNumber] || 0} โครงการ →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td className="px-3 py-2 text-xs font-bold text-gray-700">รวมทั้งสิ้น</td>
                <td className="px-3 py-2 text-right font-mono font-bold text-gray-900">
                  {(totalBudget / 1_000_000).toFixed(0)}M
                </td>
                <td className="px-3 py-2 text-[10px] text-gray-500">
                  {Array.from(new Set(connectionRows.flatMap((r) => r.rmutlKpis))).length} unique
                </td>
                <td className="px-3 py-2 text-[10px] text-gray-500">
                  {Array.from(new Set(connectionRows.flatMap((r) => r.sdgs))).length}/17
                </td>
                <td className="px-3 py-2 text-[10px] text-gray-500">
                  {projects.length} โครงการ
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* ============== References ============== */}
      <section className="rounded-lg bg-slate-50 ring-1 ring-slate-200 p-4">
        <h3 className="text-sm font-bold text-gray-800 mb-2">📚 เอกสารอ้างอิง</h3>
        <ul className="space-y-1 text-xs text-gray-600">
          {PLANS.map((p) => (
            <li key={p.number} className="flex items-start gap-1.5">
              <span className="text-red-500">📄</span>
              <a href={p.pdfPath} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                แบบเสนอแผนงาน (ง.8) — แผนงานที่ {p.number}: {p.shortTitle}
              </a>
            </li>
          ))}
          <li className="flex items-start gap-1.5">
            <span>🔗</span>
            <Link href="/excellence" className="text-blue-600 hover:underline">
              KPI Mapping ความเป็นเลิศ มทร.ล้านนา · /excellence
            </Link>
          </li>
          <li className="flex items-start gap-1.5">
            <span>🔗</span>
            <Link href="/sdgs" className="text-blue-600 hover:underline">
              SDGs Mapping · /sdgs
            </Link>
          </li>
          <li className="flex items-start gap-1.5">
            <span>🔗</span>
            <span>
              Source: PerformanceEvaluation-System (สถช.) · KPI Analysis 2569
            </span>
          </li>
        </ul>
      </section>
    </div>
  );
}
