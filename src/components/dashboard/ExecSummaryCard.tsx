/**
 * ExecSummaryCard — การ์ดย่อ "สรุปผู้บริหาร" บนหน้าแรก
 *
 * แสดงเฉพาะคำตัดสิน 1 บรรทัด + ตัวเลขหลัก 4 ตัว + ข้อค้นพบ 1 ข้อดี 1 ข้อต้องแก้
 * ทั้งการ์ดคลิกได้ → /executive-summary (ฉบับเต็ม 7 ส่วนตามโครงสร้างสากล)
 */
import Link from "next/link";
import type { ExecutiveSummary } from "@/lib/executive-summary";

const TONE = {
  good: { ring: "ring-emerald-200", chip: "bg-emerald-100 text-emerald-800", bar: "bg-emerald-500" },
  warning: { ring: "ring-amber-300", chip: "bg-amber-100 text-amber-900", bar: "bg-amber-500" },
  critical: { ring: "ring-red-300", chip: "bg-red-100 text-red-900", bar: "bg-red-500" },
} as const;

const baht = (n: number) => Math.round(n).toLocaleString("th-TH");

export default function ExecSummaryCard({ data }: { data: ExecutiveSummary }) {
  const t = TONE[data.verdict.severity];
  const pctOfFrame = Math.min(100, data.budget.percentOfFrame);
  const pctCarry = Math.min(100, data.budget.percentWithCarryover);

  const figures = [
    { k: "กรอบงบประมาณ", v: baht(data.budget.frame), u: "บาท" },
    { k: "เบิกจ่ายทั้งปี", v: baht(data.budget.spent), u: `บาท · ${data.budget.percentOfFrame.toFixed(1)}%` },
    { k: "รายการโครงการ", v: String(data.counts.projects), u: `${data.counts.faculties} หน่วยงาน` },
    { k: "กันเหลื่อมปี 2570", v: baht(data.budget.carryover), u: `บาท · ${data.counts.carryoverProjects} รายการ` },
  ];

  const topStrength = data.findings.strengths[0];
  const topGap = data.findings.gaps[0];

  return (
    <div className={`rounded-xl bg-white ring-1 ${t.ring}`}>
    <Link
      href="/executive-summary"
      className="block rounded-t-xl p-4 pb-3 transition hover:bg-slate-50/60"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-slate-800">📋 สรุปผู้บริหาร</h2>
        <span className={`rounded-full px-2 py-0.5 text-[0.8rem] font-bold ${t.chip}`}>
          {data.meta.status} · {data.meta.asOf}
        </span>
      </div>

      <p className="mt-2 text-sm font-bold leading-snug text-slate-900">{data.verdict.headline}</p>

      {/* แถบความคืบหน้าเทียบกรอบงบ */}
      <div className="mt-2.5">
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="absolute inset-y-0 left-0 bg-slate-300" style={{ width: `${pctCarry}%` }} />
          <div className={`absolute inset-y-0 left-0 ${t.bar}`} style={{ width: `${pctOfFrame}%` }} />
        </div>
        <p className="mt-1 text-[0.8rem] text-slate-500">
          เบิกจ่าย {data.budget.percentOfFrame.toFixed(1)}% · รวมเงินกันเหลื่อมปี{" "}
          {data.budget.percentWithCarryover.toFixed(1)}% ของกรอบ {baht(data.budget.frame)} บาท
        </p>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {figures.map((f) => (
          <div key={f.k} className="rounded-lg bg-slate-50 px-2.5 py-2">
            <dt className="text-[0.8rem] text-slate-500">{f.k}</dt>
            <dd className="text-sm font-bold tabular-nums text-slate-900">{f.v}</dd>
            <dd className="text-[0.8rem] text-slate-400">{f.u}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-3 space-y-1.5">
        {topStrength && (
          <p className="text-[0.9rem] leading-snug text-slate-600">
            <span className="mr-1 font-bold text-emerald-700">ผลสำเร็จ</span>
            {topStrength}
          </p>
        )}
        {topGap && (
          <p className="text-[0.9rem] leading-snug text-slate-600">
            <span className="mr-1 font-bold text-amber-700">ต้องแก้</span>
            {topGap}
          </p>
        )}
      </div>

      <p className="mt-3 text-right text-xs font-medium text-cyan-700">
        อ่านบทสรุปฉบับเต็ม →
      </p>
    </Link>

    {/* แถวดาวน์โหลด — อยู่นอก Link เพราะ <a> ซ้อนใน <a> ไม่ได้ */}
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-100 px-4 py-2.5">
      <span className="text-[0.8rem] text-slate-400">ดาวน์โหลด</span>
      <a
        href="/reports/RPF2569-annual-report.pdf"
        download="รายงานผลการดำเนินงาน-ใต้ร่มพระบารมี-2569-ฉบับสมบูรณ์.pdf"
        className="text-[0.9rem] font-medium text-cyan-700 hover:underline"
      >
        📕 เล่มฉบับสมบูรณ์ (57 หน้า)
      </a>
      <a
        href="/reports/RPF2569-executive-summary.pdf"
        download="บทสรุปผู้บริหาร-ใต้ร่มพระบารมี-2569.pdf"
        className="text-[0.9rem] font-medium text-cyan-700 hover:underline"
      >
        📄 บทสรุป 2 หน้า
      </a>
    </div>
    </div>
  );
}
