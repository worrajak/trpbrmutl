/**
 * YearTransition — การ์ดเปลี่ยนผ่าน 2569 → 2570
 *
 * desktop : ซ้าย (ปีที่ปิด) | กลาง (ทิศทางใหม่) | ขวา (ปีที่เริ่ม)
 * mobile  : เรียงลงมา ซ้าย → กลาง → ขวา พร้อมลูกศรชี้ลง
 */
import Link from "next/link";
import type { YearTransition as TData } from "@/lib/year-transition";

const baht = (n: number) => Math.round(n).toLocaleString("th-TH");

/**
 * @param compact โหมดหน้าแรก — ตัดรายการให้สั้นลงและมีลิงก์ไปอ่านฉบับเต็ม
 *                หน้าแรกเป็นที่สแกน ไม่ใช่ที่อ่านละเอียด
 */
export default function YearTransition({
  data,
  compact = false,
}: {
  data: TData;
  compact?: boolean;
}) {
  const carry = compact ? data.carryForward.slice(0, 2) : data.carryForward;
  const fixes = compact ? data.fixes.slice(0, 3) : data.fixes;
  const topics = compact ? data.sampleTopics.slice(0, 3) : data.sampleTopics;

  return (
    <section className="rounded-xl bg-white p-4 ring-1 ring-slate-200 sm:p-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold text-slate-800">
          🔄 การเปลี่ยนผ่าน {data.from.fy} → {data.to.fy}
        </h2>
        {compact ? (
          <Link
            href="/executive-summary"
            className="text-[0.88rem] font-medium text-cyan-700 hover:underline"
          >
            ดูบทสรุปฉบับเต็ม →
          </Link>
        ) : (
          <span className="text-[0.8rem] text-slate-400">
            ลากสิ่งที่ได้ผลไปต่อ · แก้สิ่งที่ยังไม่ได้ผล
          </span>
        )}
      </div>

      <div className="grid items-stretch gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1fr)]">
        {/* ---------------- ซ้าย: ปีที่ปิดแล้ว ---------------- */}
        <div className="rounded-lg bg-slate-50 p-3.5 ring-1 ring-slate-200">
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <h3 className="text-[0.95rem] font-bold text-slate-700">{data.from.label}</h3>
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[0.8rem] font-bold text-slate-600">
              {data.from.status}
            </span>
          </div>
          <dl className="space-y-2">
            {data.from.stats.map((s) => (
              <div key={s.k} className="rounded-md bg-white px-2.5 py-1.5 ring-1 ring-slate-100">
                <dt className="text-[0.8rem] text-slate-500">{s.k}</dt>
                <dd className="text-sm font-bold tabular-nums text-slate-800">{s.v}</dd>
                {s.sub && <dd className="text-[0.8rem] leading-snug text-slate-400">{s.sub}</dd>}
              </div>
            ))}
          </dl>

          {/* ผลรายโครงการหลัก — แสดงทั้งสองโหมด
              เคยซ่อนในโหมดย่อเพราะคิดว่าซ้ำกับการ์ดสุขภาพ แต่การ์ดนั้นแสดงภาพรวม
              ไม่ได้แยกราย ง8 และพอซ่อนแล้วช่องซ้ายสั้นกว่าอีกสองช่องมากจนดูไม่สมดุล */}
          <p className="mb-1.5 mt-3 text-[0.8rem] font-bold uppercase tracking-wide text-slate-500">
            เบิกจ่ายรายโครงการหลัก
          </p>
          <ul className="space-y-1">
            {data.from.byInitiative.map((i) => (
              <li key={i.label} className="rounded-md bg-white px-2.5 py-1.5 ring-1 ring-slate-100">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[0.8rem] text-slate-600">{i.label}</span>
                  <span className="text-[0.88rem] font-bold tabular-nums text-slate-700">
                    {i.percent.toFixed(0)}%
                  </span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full bg-slate-400"
                    style={{ width: `${Math.min(100, i.percent)}%` }}
                  />
                </div>
                <p className="mt-0.5 text-[0.8rem] tabular-nums text-slate-400">
                  {baht(i.spent)} บาท
                </p>
              </li>
            ))}
          </ul>
        </div>

        {/* ---------------- กลาง: ทิศทางใหม่ ---------------- */}
        <div className="relative rounded-lg bg-gradient-to-b from-amber-50/80 to-white p-3.5 ring-1 ring-amber-300">
          {/* ลูกศร: ขวาบน desktop · ลงบน mobile */}
          <span className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 text-base lg:hidden">
            ⬇
          </span>
          <h3 className="mb-2 text-center text-[0.95rem] font-bold text-amber-900">
            ทิศทางใหม่
          </h3>

          <p className="mb-1.5 text-[0.8rem] font-bold uppercase tracking-wide text-emerald-700">
            ↗ ลากไปต่อ
          </p>
          <ul className="mb-3 space-y-1.5">
            {carry.map((c) => (
              <li
                key={c.title}
                className="rounded-md border-l-2 border-emerald-400 bg-emerald-50/60 px-2.5 py-1.5"
              >
                <p className="text-[0.9rem] font-bold leading-snug text-slate-800">{c.title}</p>
                <p className="text-[0.8rem] leading-snug text-slate-500">{c.why}</p>
              </li>
            ))}
          </ul>

          <p className="mb-1.5 text-[0.8rem] font-bold uppercase tracking-wide text-red-700">
            ⚙ ต้องแก้
            {compact && data.fixes.length > fixes.length && (
              <span className="ml-1 font-normal normal-case text-slate-400">
                ({fixes.length} จาก {data.fixes.length} ข้อ)
              </span>
            )}
          </p>
          <ul className="space-y-1.5">
            {fixes.map((f) => (
              <li
                key={f.title}
                className="rounded-md border-l-2 border-red-400 bg-red-50/50 px-2.5 py-1.5"
              >
                <p className="text-[0.9rem] font-bold leading-snug text-slate-800">{f.title}</p>
                <p className="text-[0.8rem] leading-snug text-slate-500">{f.problem}</p>
                <p className="mt-0.5 text-[0.8rem] leading-snug text-slate-700">
                  <span className="font-bold text-amber-700">วิธีแก้ </span>
                  {f.action}
                </p>
                <p className="text-[0.8rem] leading-snug text-slate-400">เป้า {f.metric}</p>
              </li>
            ))}
          </ul>
        </div>

        {/* ---------------- ขวา: ปีที่กำลังเริ่ม ---------------- */}
        <div className="rounded-lg bg-cyan-50/50 p-3.5 ring-1 ring-cyan-300">
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <h3 className="text-[0.95rem] font-bold text-cyan-900">{data.to.label}</h3>
            <span className="rounded-full bg-cyan-200 px-2 py-0.5 text-[0.8rem] font-bold text-cyan-900">
              {data.to.status}
            </span>
          </div>

          {/* งานต่อเนื่อง */}
          <div className="mb-2.5 rounded-md bg-white px-2.5 py-2 ring-1 ring-cyan-100">
            <p className="text-[0.8rem] text-slate-500">งานที่ยกมาจากปีก่อน</p>
            <p className="text-sm font-bold tabular-nums text-slate-800">
              {baht(data.to.carryover.amount)} บาท
            </p>
            <p className="text-[0.8rem] text-slate-400">
              กันเงินเหลื่อมปี {data.to.carryover.count} รายการ ต้องเบิกให้เสร็จในปีนี้
            </p>
          </div>

          {/* เป้าหมายเชิงกระบวนการ */}
          <p className="mb-1.5 text-[0.8rem] font-bold uppercase tracking-wide text-cyan-800">
            เป้าหมายที่ตั้งไว้
          </p>
          <dl className="mb-3 space-y-1">
            {data.to.targets.map((t) => (
              <div
                key={t.k}
                className="flex items-baseline justify-between gap-2 rounded-md bg-white px-2.5 py-1 ring-1 ring-cyan-100"
              >
                <dt className="text-[0.8rem] leading-snug text-slate-600">{t.k}</dt>
                <dd className="flex-shrink-0 text-[0.8rem] font-bold text-cyan-800">{t.v}</dd>
              </div>
            ))}
          </dl>

          {/* แผนรับข้อเสนอ ง.9 ปี 2570 */}
          <div className="mb-2.5 rounded-md bg-white px-2.5 py-2 ring-1 ring-cyan-100">
            <div className="flex flex-wrap items-baseline justify-between gap-1">
              <p className="text-[0.8rem] font-bold uppercase tracking-wide text-cyan-800">
                แผนเปิดรับข้อเสนอ ง.9
              </p>
              <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[0.8rem] font-bold text-amber-900">
                {data.to.g9.status}
              </span>
            </div>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              <div className="rounded bg-cyan-50/70 px-2 py-1">
                <p className="text-[0.8rem] text-slate-500">เปิดรับ</p>
                <p className="text-sm font-bold tabular-nums text-slate-800">
                  {data.to.g9.slots} โครงการ
                </p>
                <p className="text-[0.8rem] text-slate-400">{data.to.g9.topics} หัวข้อ</p>
              </div>
              <div className="rounded bg-cyan-50/70 px-2 py-1">
                <p className="text-[0.8rem] text-slate-500">วงเงินที่เปิดรับ</p>
                <p className="text-sm font-bold tabular-nums text-slate-800">
                  {baht(data.to.g9.open)}
                </p>
                <p className="text-[0.8rem] text-slate-400">
                  จากกรอบ {baht(data.to.g9.frame)} บาท
                </p>
              </div>
            </div>
            <p className="mt-1.5 text-[0.8rem] leading-snug text-slate-500">
              ระยะ{" "}
              {data.to.g9.byPhase.map((p, i) => (
                <span key={p.phase}>
                  {i > 0 && " · "}
                  {p.phase} {p.slots} โครงการ
                </span>
              ))}
            </p>
            <p className="text-[0.8rem] leading-snug text-slate-500">
              ภูมิอากาศเป็นสาระหลัก {data.to.g9.climatePercent.toFixed(0)}% ของวงเงิน ·
              ส่วนกลาง {baht(data.to.g9.central)} บาท
            </p>
          </div>

          {/* รายแผนงาน */}
          <ul className="mb-2.5 space-y-1">
            {data.to.g9.byPlan.map((p) => (
              <li
                key={p.id}
                className="flex items-baseline justify-between gap-2 rounded-md bg-white px-2.5 py-1 ring-1 ring-cyan-100"
              >
                <span className="text-[0.8rem] leading-snug text-slate-600">
                  <span className="font-bold text-slate-700">แผนงาน {p.id}</span> {p.name}
                </span>
                <span className="flex-shrink-0 text-right text-[0.8rem] font-bold tabular-nums text-cyan-800">
                  {p.slots} โครงการ
                  <span className="block font-normal text-slate-400">{baht(p.budget)}</span>
                </span>
              </li>
            ))}
          </ul>

          {/* ตัวอย่างหัวข้อ */}
          <p className="mb-1.5 text-[0.8rem] font-bold uppercase tracking-wide text-cyan-800">
            ตัวอย่างหัวข้อที่ตั้งธงไว้
          </p>
          <ul className="space-y-1.5">
            {topics.map((t) => (
              <li key={t.code} className="rounded-md bg-white px-2.5 py-1.5 ring-1 ring-cyan-100">
                <p className="text-[0.88rem] font-medium leading-snug text-slate-800">
                  <span className="mr-1 rounded bg-slate-700 px-1 text-[0.8rem] font-bold text-white">
                    {t.code}
                  </span>
                  {t.title}
                </p>
                <p className="mt-0.5 text-[0.8rem] text-slate-400">
                  {t.phase} · {t.months} · รับ {t.slots} × {baht(t.budgetEach)} บาท · {t.track}
                  {t.climateCore ? " · ภูมิอากาศ" : ""}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-2.5 text-[0.8rem] leading-snug text-slate-400">
        {data.to.budgetNote}
      </p>
    </section>
  );
}
