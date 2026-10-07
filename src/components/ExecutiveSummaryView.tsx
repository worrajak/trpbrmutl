/**
 * ExecutiveSummaryView — เนื้อหาบทสรุปผู้บริหาร ใช้ร่วมกันทุกปีงบ
 *
 * โครงสร้าง 7 ส่วนตามแบบ executive summary สากล
 *   1 ขอบเขต · 2 ตัวเลขหลัก · 3 ผลเทียบเป้า · 4 ข้อค้นพบ
 *   5 ข้อจำกัดของข้อมูล · 6 ข้อเสนอ · 7 งานที่ต่อเนื่อง
 *
 * ตัวเลขดึงจากฐานข้อมูลสด ไม่พิมพ์มือ · รับ fy เพื่อให้ดูย้อนปีได้
 */
import Link from "next/link";
import {
  fetchProjects,
  fetchActivities,
  fetchKpiCatalog,
  fetchKpiTargetsWithCode,
  fetchFaculties,
  fetchActivityReportCount,
} from "@/lib/supabase-data";
import { buildExecutiveSummary, REPORT_META } from "@/lib/executive-summary";
import { buildYearTransition } from "@/lib/year-transition";
import YearTransition from "@/components/dashboard/YearTransition";
import { AVAILABLE_FY, CURRENT_FY, fiscalYearInfo } from "@/lib/fiscal-year";

const baht = (n: number) => Math.round(n).toLocaleString("th-TH");

/**
 * ไฟล์รายงานใน public/reports/ — ใช้ชื่อ URL เป็นอังกฤษกันปัญหา encoding
 * แต่ตั้งชื่อไฟล์ตอนดาวน์โหลดเป็นภาษาไทยด้วย attribute download
 */
const DOWNLOADS = [
  {
    href: "/reports/RPF2569-annual-report.pdf",
    file: "รายงานผลการดำเนินงาน-ใต้ร่มพระบารมี-2569-ฉบับสมบูรณ์.pdf",
    title: "รายงานผลการดำเนินงาน ฉบับสมบูรณ์",
    desc: "57 หน้า · 7 บท + ภาคผนวกรายโครงการและตัวชี้วัด",
    size: "273 KB",
    icon: "📕",
    primary: true,
  },
  {
    href: "/reports/RPF2569-executive-summary.pdf",
    file: "บทสรุปผู้บริหาร-ใต้ร่มพระบารมี-2569.pdf",
    title: "บทสรุปผู้บริหาร",
    desc: "2 หน้า · สำหรับนำเสนอและแนบวาระประชุม",
    size: "131 KB",
    icon: "📄",
    primary: false,
  },
];

const SEV_TEXT = {
  good: "text-emerald-700",
  warning: "text-amber-700",
  critical: "text-red-700",
} as const;
const SEV_BAR = {
  good: "bg-emerald-500",
  warning: "bg-amber-500",
  critical: "bg-red-500",
} as const;

function Section({
  no,
  title,
  children,
}: {
  no: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl bg-white p-4 ring-1 ring-slate-200 sm:p-5">
      <h2 className="mb-3 flex items-baseline gap-2 text-sm font-bold text-slate-800">
        <span className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-cyan-700 text-[0.8rem] font-bold text-white">
          {no}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export default async function ExecutiveSummaryView({ fy = CURRENT_FY }: { fy?: number }) {
  const projects = await fetchProjects(fy);
  const [activities, kpiCatalog, kpiTargets, faculties, activityReportCount] =
    await Promise.all([
      fetchActivities(projects.map((p) => p.id)),
      fetchKpiCatalog(fy),
      fetchKpiTargetsWithCode(),
      fetchFaculties(),
      fetchActivityReportCount(),
    ]);

  const d = buildExecutiveSummary({
    fy,
    projects,
    kpiCatalog,
    kpiTargets,
    faculties,
    activities,
    activityReportCount,
  });
  const transition = buildYearTransition(d);

  return (
    <div className="space-y-3">
      {/* หัวเรื่อง */}
      <div className="rounded-xl bg-gradient-to-br from-cyan-800 to-slate-800 p-5 text-white">
        <Link href="/" className="text-[0.9rem] text-cyan-200 hover:text-white">
          ← กลับหน้าแรก
        </Link>
        <h1 className="mt-1.5 text-lg font-bold sm:text-xl">บทสรุปผู้บริหาร</h1>
        <p className="text-sm text-cyan-100">
          กลุ่มแผนงานใต้ร่มพระบารมี มหาวิทยาลัยเทคโนโลยีราชมงคลล้านนา
        </p>
        <p className="mt-2 text-[0.9rem] text-cyan-200">
          ปีงบประมาณ {d.meta.fiscalYear} · {d.meta.periodStart} ถึง {d.meta.periodEnd} ·{" "}
          {d.meta.status}
        </p>

        {/* เลือกปีงบ — ขึ้นเฉพาะเมื่อมีข้อมูลมากกว่าหนึ่งปี */}
        {AVAILABLE_FY.length > 1 && (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span className="text-[0.8rem] text-cyan-300">ดูปีงบ</span>
            {AVAILABLE_FY.map((y) => {
              const info = fiscalYearInfo(y);
              const active = y === fy;
              return (
                <Link
                  key={y}
                  href={`/executive-summary/${y}`}
                  className={`rounded-full px-2.5 py-0.5 text-[0.88rem] font-medium transition ${
                    active
                      ? "bg-white text-cyan-900"
                      : "bg-white/15 text-cyan-100 hover:bg-white/25"
                  }`}
                >
                  {y}
                  {info.closed ? "" : " (กำลังดำเนินการ)"}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* การเปลี่ยนผ่านปีงบประมาณ — อยู่บนสุดเพราะเป็นสิ่งที่ต้องตัดสินใจต่อ */}
      <YearTransition data={transition} />

      {/* ---- ด้านล่างนี้คือการรายงานผลปีงบประมาณที่ปิดแล้ว ---- */}
      <div className="flex items-center gap-2 pt-1">
        <span className="h-px flex-1 bg-slate-200" />
        <span className="text-[0.8rem] font-medium text-slate-400">
          รายงานผลการดำเนินงาน ปีงบประมาณ {d.meta.fiscalYear}
        </span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      {/* คำตัดสิน */}
      <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200 sm:p-5">
        <p className={`text-base font-bold leading-snug sm:text-lg ${SEV_TEXT[d.verdict.severity]}`}>
          {d.verdict.headline}
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{d.verdict.detail}</p>
      </div>

      {/* ดาวน์โหลดเอกสาร */}
      <section className="rounded-xl bg-white p-4 ring-1 ring-slate-200 sm:p-5">
        <h2 className="mb-2.5 text-sm font-bold text-slate-800">⬇ ดาวน์โหลดเอกสารฉบับเต็ม</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {DOWNLOADS.map((d) => (
            <a
              key={d.href}
              href={d.href}
              download={d.file}
              className={`flex items-start gap-3 rounded-lg p-3 ring-1 transition hover:shadow-md ${
                d.primary
                  ? "bg-cyan-50/60 ring-cyan-300 hover:bg-cyan-50"
                  : "bg-slate-50 ring-slate-200 hover:bg-white"
              }`}
            >
              <span className="text-xl leading-none">{d.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[0.95rem] font-bold text-slate-800">{d.title}</span>
                <span className="block text-[0.88rem] leading-snug text-slate-500">{d.desc}</span>
                <span className="mt-0.5 block text-[0.8rem] text-slate-400">
                  PDF · {d.size} · ข้อมูล ณ {REPORT_META.asOf}
                </span>
              </span>
            </a>
          ))}
        </div>
        <p className="mt-2 text-[0.8rem] leading-snug text-slate-400">
          เอกสารทั้งสองฉบับใช้ชุดตัวเลขเดียวกับหน้านี้ หากข้อมูลในระบบเปลี่ยนหลังจากนี้
          ตัวเลขบนหน้าเว็บจะอัปเดตก่อน ส่วนไฟล์ PDF จะอัปเดตเมื่อจัดทำเล่มรอบถัดไป
        </p>
      </section>

      {/* 1 ขอบเขต */}
      <Section no={1} title="ขอบเขตและที่มาของรายงาน">
        <dl className="grid gap-2 sm:grid-cols-2">
          {[
            ["รอบรายงาน", `ปีงบประมาณ ${d.meta.fiscalYear} เต็มปี (${d.meta.periodStart} – ${d.meta.periodEnd})`],
            ["สถานะ", `${d.meta.status} · ข้อมูล ณ ${d.meta.asOf}`],
            ["ขอบเขต", `${d.counts.projects} รายการโครงการ ภายใต้ 3 โครงการหลักตามแบบ ง8 · ${d.counts.faculties} หน่วยงาน · หัวหน้าโครงการ ${d.counts.leads} ท่าน`],
            ["แหล่งข้อมูล", d.meta.source],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg bg-slate-50 px-3 py-2">
              <dt className="text-[0.8rem] text-slate-500">{k}</dt>
              <dd className="text-[0.95rem] leading-snug text-slate-800">{v}</dd>
            </div>
          ))}
        </dl>
      </Section>

      {/* 2 ตัวเลขหลัก */}
      <Section no={2} title="ตัวเลขหลัก">
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {d.headline.map((h) => (
            <div key={h.label} className="rounded-lg bg-slate-50 px-3 py-2.5">
              <dt className="text-[0.8rem] text-slate-500">{h.label}</dt>
              <dd
                className={`text-base font-bold tabular-nums ${
                  h.severity ? SEV_TEXT[h.severity] : "text-slate-900"
                }`}
              >
                {h.value}
              </dd>
              {h.sub && <dd className="text-[0.8rem] text-slate-400">{h.sub}</dd>}
            </div>
          ))}
        </dl>
      </Section>

      {/* 3 ผลเทียบเป้า */}
      <Section no={3} title="ผลการดำเนินงานเทียบเป้าหมาย">
        <h3 className="mb-1.5 text-[0.9rem] font-bold text-slate-600">
          ก. งบประมาณรายโครงการหลัก (เทียบกรอบงบประมาณ)
        </h3>
        <div className="space-y-2">
          {d.initiatives.map((i) => (
            <div key={i.id} className="rounded-lg bg-slate-50 px-3 py-2">
              <div className="flex flex-wrap items-baseline justify-between gap-1">
                <span className="text-[0.95rem] font-medium text-slate-800">{i.label}</span>
                <span className="text-[0.9rem] tabular-nums text-slate-500">
                  {baht(i.spent)} / {baht(i.frame)} บาท · {i.projects} รายการ
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={i.percent >= 90 ? SEV_BAR.good : SEV_BAR.warning}
                    style={{ width: `${Math.min(100, i.percent)}%`, height: "100%" }}
                  />
                </div>
                <span
                  className={`w-10 text-right text-[0.9rem] font-bold tabular-nums ${
                    i.percent >= 90 ? SEV_TEXT.good : SEV_TEXT.warning
                  }`}
                >
                  {i.percent.toFixed(0)}%
                </span>
              </div>
            </div>
          ))}
        </div>

        <h3 className="mb-1.5 mt-4 text-[0.9rem] font-bold text-slate-600">
          ข. ตัวชี้วัดที่รับมาดำเนินการ (เทียบเป้าหมายมหาวิทยาลัย)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-[0.9rem]">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-1.5 pr-2 font-medium">ตัวชี้วัด</th>
                <th className="py-1.5 pr-2 text-right font-medium">รับมา</th>
                <th className="py-1.5 pr-2 text-right font-medium">เป้า</th>
                <th className="py-1.5 text-right font-medium">ร้อยละ</th>
              </tr>
            </thead>
            <tbody>
              {d.kpis.map((k) => (
                <tr key={k.code} className="border-b border-slate-100 last:border-0">
                  <td className="py-1.5 pr-2">
                    <span className="font-medium text-slate-800">
                      {k.code.replace("KPI-", "ที่ ")}
                    </span>{" "}
                    <span className="text-slate-500">{k.name}</span>
                    {k.isPrimary && (
                      <span className="ml-1 rounded bg-cyan-100 px-1 text-[0.8rem] font-bold text-cyan-800">
                        เป้าของกลุ่มโดยตรง
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 pr-2 text-right tabular-nums text-slate-800">
                    {k.committed.toLocaleString("th-TH")}
                  </td>
                  <td className="py-1.5 pr-2 text-right tabular-nums text-slate-400">
                    {k.target.toLocaleString("th-TH")}
                  </td>
                  <td className={`py-1.5 text-right font-bold tabular-nums ${SEV_TEXT[k.severity]}`}>
                    {k.percent.toFixed(0)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[0.8rem] leading-snug text-slate-400">
          เป้าหมายในคอลัมน์ &ldquo;เป้า&rdquo; เป็นเป้าระดับมหาวิทยาลัย
          กลุ่มแผนงานเป็นผู้สนับสนุนส่วนหนึ่ง ยกเว้นตัวชี้วัดที่กำกับว่าเป็นเป้าของกลุ่มโดยตรง
        </p>

        <h3 className="mb-1.5 mt-4 text-[0.9rem] font-bold text-slate-600">
          ค. การเบิกจ่ายรายหน่วยงาน (เทียบงบที่ได้รับโอน)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-[0.9rem]">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-1.5 pr-2 font-medium">หน่วยงาน</th>
                <th className="py-1.5 pr-2 text-right font-medium">รายการ</th>
                <th className="py-1.5 pr-2 text-right font-medium">งบที่โอน</th>
                <th className="py-1.5 pr-2 text-right font-medium">เบิกจ่าย</th>
                <th className="py-1.5 text-right font-medium">ร้อยละ</th>
              </tr>
            </thead>
            <tbody>
              {d.faculties.map((f) => (
                <tr key={f.name} className="border-b border-slate-100 last:border-0">
                  <td className="py-1.5 pr-2 text-slate-800">{f.name}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums text-slate-500">{f.projects}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums text-slate-600">{baht(f.budget)}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums text-slate-800">{baht(f.spent)}</td>
                  <td
                    className={`py-1.5 text-right font-bold tabular-nums ${
                      f.percent >= 95 ? SEV_TEXT.good : f.percent >= 80 ? "text-slate-700" : SEV_TEXT.warning
                    }`}
                  >
                    {f.percent.toFixed(0)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* 4 ข้อค้นพบ */}
      <Section no={4} title="ข้อค้นพบสำคัญ">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <h3 className="mb-1.5 text-[0.9rem] font-bold text-emerald-700">จุดแข็ง</h3>
            <ul className="space-y-1.5">
              {d.findings.strengths.map((s, i) => (
                <li
                  key={i}
                  className="rounded-lg border-l-2 border-emerald-400 bg-emerald-50/50 px-2.5 py-1.5 text-[0.9rem] leading-snug text-slate-700"
                >
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-1.5 text-[0.9rem] font-bold text-amber-700">ช่องว่างและความเสี่ยง</h3>
            <ul className="space-y-1.5">
              {d.findings.gaps.map((s, i) => (
                <li
                  key={i}
                  className="rounded-lg border-l-2 border-amber-400 bg-amber-50/50 px-2.5 py-1.5 text-[0.9rem] leading-snug text-slate-700"
                >
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* 5 ข้อจำกัด */}
      <Section no={5} title="ข้อจำกัดของข้อมูล">
        <ul className="space-y-1.5">
          {d.limitations.map((s, i) => (
            <li
              key={i}
              className="rounded-lg border-l-2 border-slate-300 bg-slate-50 px-2.5 py-1.5 text-[0.9rem] leading-snug text-slate-600"
            >
              {s}
            </li>
          ))}
        </ul>
      </Section>

      {/* 6 ข้อเสนอ */}
      <Section no={6} title="ข้อเสนอต่อผู้บริหาร">
        <ol className="space-y-2">
          {d.recommendations.map((r, i) => (
            <li key={r.title} className="flex gap-2.5">
              <span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-slate-800 text-[0.8rem] font-bold text-white">
                {i + 1}
              </span>
              <div>
                <p className="text-[0.95rem] font-bold text-slate-800">{r.title}</p>
                <p className="text-[0.9rem] leading-snug text-slate-600">{r.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      {/* 7 งานที่ต่อเนื่อง */}
      <Section no={7} title="งานที่ต่อเนื่องไปปีงบประมาณ 2570">
        <p className="mb-2 text-[0.95rem] text-slate-600">
          ได้รับอนุมัติให้ขยายเวลาการใช้งบประมาณ {d.outlook.items.length} รายการ วงเงินรวม{" "}
          <span className="font-bold text-slate-900">{baht(d.outlook.total)}</span> บาท
        </p>
        <ul className="space-y-1.5">
          {d.outlook.items.map((it) => (
            <li
              key={it.name}
              className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2"
            >
              <span className="text-[0.9rem] leading-snug text-slate-700">
                {it.initiative && (
                  <span className="mr-1.5 font-bold text-slate-500">{it.initiative}</span>
                )}
                {it.name}
              </span>
              <span className="flex-shrink-0 text-[0.9rem] font-bold tabular-nums text-slate-800">
                {baht(it.amount)}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      {/* ลิงก์ต่อ */}
      <div className="grid gap-2 sm:grid-cols-3">
        {[
          { href: "/projects", icon: "📂", t: "รายโครงการทั้งหมด", d: "การเบิกจ่ายรายโครงการ" },
          { href: "/excellence", icon: "📊", t: "ตัวชี้วัด มทร.", d: "mapping รายโครงการ" },
          { href: "/sdgs", icon: "🌐", t: "SDG", d: "เป้าหมายการพัฒนาที่ยั่งยืน" },
        ].map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-lg bg-white p-3 ring-1 ring-slate-200 transition hover:bg-cyan-50/30 hover:ring-cyan-300"
          >
            <p className="text-sm font-bold text-slate-800">
              {l.icon} {l.t}
            </p>
            <p className="text-[0.88rem] text-slate-500">{l.d}</p>
          </Link>
        ))}
      </div>

      <p className="pt-2 text-center text-[0.8rem] leading-snug text-slate-400">
        ตัวเลขทุกจำนวนคำนวณจากฐานข้อมูลระบบติดตามโครงการโดยตรง (refresh ทุก 60 วินาที)
        <br />
        รายละเอียดฉบับเต็มอยู่ใน {d.meta.fullReport}
      </p>
    </div>
  );
}
