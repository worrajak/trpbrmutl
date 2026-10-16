/**
 * /journey — 25 ปีการเดินทาง มทร.ล้านนา กับมูลนิธิโครงการหลวง (2545–2570)
 *
 * หน้า static ข้อมูลทั้งหมดอยู่ใน src/lib/journey.ts (ชุดเดียวกับสไลด์บรรยาย)
 * เล่าสองเรื่อง: เส้นเวลา 6 ระยะ และบทบาทของห้าฝ่ายว่าใครเป็นแกนด้านไหน
 */
import type { Metadata } from "next";
import Link from "next/link";
import {
  ACTORS,
  BUDGET_2570,
  CUMULATIVE,
  HRDI_ALIGNMENT,
  MILESTONES,
  PHASES,
  PREHISTORY,
  SOURCES,
  budgetShare,
} from "@/lib/journey";
import type { Phase } from "@/lib/journey";

export const metadata: Metadata = {
  title: "25 ปีการเดินทาง | ใต้ร่มพระบารมี",
  description:
    "มทร.ล้านนา กับมูลนิธิโครงการหลวง 2545–2570 · 6 ระยะ · บทบาทของมูลนิธิฯ สวพส. อว. งบแผ่นดิน และ มทร.ล้านนา",
};

const ROLE_STYLE: Record<Phase["roleLevel"], { label: string; chip: string; dot: string }> = {
  support: { label: "แกนสนับสนุน", chip: "bg-slate-100 text-slate-700", dot: "bg-slate-400" },
  co: { label: "แกนร่วม", chip: "bg-cyan-50 text-cyan-800", dot: "bg-cyan-500" },
  core: { label: "แกนหลักด้านวิศวกรรม", chip: "bg-amber-100 text-amber-900", dot: "bg-amber-500" },
};

const baht = (n: number) => n.toLocaleString("th-TH");

function Section({ no, title, children }: { no: number; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl bg-white p-4 ring-1 ring-slate-200 sm:p-5">
      <h2 className="mb-3 flex items-baseline gap-2 text-[0.95rem] font-bold text-slate-800 sm:text-base">
        <span className="inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-cyan-700 text-[0.8rem] font-bold text-white">
          {no}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function JourneyPage() {
  const share = budgetShare();

  return (
    <div className="space-y-3">
      {/* หัวเรื่อง */}
      <div className="rounded-xl bg-gradient-to-br from-cyan-800 to-slate-800 p-5 text-white">
        <Link href="/" className="text-[0.9rem] text-cyan-200 hover:text-white">
          ← กลับหน้าแรก
        </Link>
        <h1 className="mt-1.5 text-xl font-bold sm:text-2xl">25 ปีการเดินทาง</h1>
        <p className="text-[0.95rem] text-cyan-100">
          มหาวิทยาลัยเทคโนโลยีราชมงคลล้านนา กับมูลนิธิโครงการหลวง พ.ศ. 2545–2570
        </p>
        <p className="mt-3 max-w-3xl text-[0.9rem] leading-relaxed text-cyan-50">
          จากทีมช่างที่ขึ้นดอยไปแก้ปัญหาเครื่องจักรเฉพาะหน้า สู่แกนวิศวกรรมและเทคโนโลยีของเครือข่ายพื้นที่สูง
          ที่มีรายการงบประมาณแผ่นดินระบุชื่อโครงการโดยตรง
        </p>
      </div>

      {/* 1 เส้นเวลา */}
      <Section no={1} title="เส้นเวลา: ก่อนเราเข้ามา และหมุดหมายของ มทร.ล้านนา">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-[0.8rem] font-bold uppercase tracking-wide text-slate-500">บริบทเดิม</p>
            <ol className="space-y-2 border-l-2 border-slate-200 pl-4">
              {PREHISTORY.map((e) => (
                <li key={e.year} className="relative">
                  <span className="absolute -left-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full bg-slate-300" />
                  <span className="font-bold tabular-nums text-slate-700">{e.year}</span>{" "}
                  <span className="text-[0.9rem] text-slate-600">{e.text}</span>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <p className="mb-2 text-[0.8rem] font-bold uppercase tracking-wide text-cyan-700">มทร.ล้านนา</p>
            <ol className="space-y-2 border-l-2 border-cyan-200 pl-4">
              {MILESTONES.map((e) => (
                <li key={e.year} className="relative">
                  <span className="absolute -left-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full bg-cyan-600" />
                  <span className="font-bold tabular-nums text-cyan-800">{e.year}</span>{" "}
                  <span className="text-[0.9rem] text-slate-700">{e.text}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </Section>

      {/* 2 หกระยะ */}
      <Section no={2} title="หกระยะ บทบาทที่ขยับจากแกนสนับสนุนสู่แกนหลัก">
        <div className="mb-3 flex flex-wrap gap-2">
          {(Object.keys(ROLE_STYLE) as Phase["roleLevel"][]).map((k) => (
            <span key={k} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[0.8rem] font-bold ${ROLE_STYLE[k].chip}`}>
              <span className={`h-2 w-2 rounded-full ${ROLE_STYLE[k].dot}`} />
              {ROLE_STYLE[k].label}
            </span>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PHASES.map((p) => {
            const r = ROLE_STYLE[p.roleLevel];
            return (
              <article key={p.no} className="flex flex-col rounded-lg bg-slate-50 p-3.5 ring-1 ring-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <span className="text-[0.8rem] font-bold text-slate-500">ระยะที่ {p.no}</span>
                  <span className="font-bold tabular-nums text-cyan-800">{p.years}</span>
                </div>
                <h3 className="mt-1 text-[0.95rem] font-bold leading-snug text-slate-900">{p.title}</h3>
                <span className={`mt-2 inline-flex w-fit items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.8rem] font-bold ${r.chip}`}>
                  <span className={`h-2 w-2 rounded-full ${r.dot}`} />
                  {p.role}
                </span>
                <dl className="mt-3 grid grid-cols-2 gap-2">
                  {p.highlights.map((h) => (
                    <div key={h.label} className="rounded-md bg-white px-2 py-1.5">
                      <dt className="text-base font-bold tabular-nums text-amber-700">{h.n}</dt>
                      <dd className="text-[0.8rem] leading-snug text-slate-600">{h.label}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-auto pt-2 text-[0.8rem] text-slate-400">ที่มา: {p.sources.map((k) => SOURCES[k]).join(" · ")}</p>
              </article>
            );
          })}
        </div>
      </Section>

      {/* 3 ผลสะสม */}
      <Section no={3} title={`ผลสะสม ${CUMULATIVE.period}`}>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { k: "ผลผลิต", items: CUMULATIVE.output, tone: "text-cyan-800" },
            { k: "ผลลัพธ์", items: CUMULATIVE.outcome, tone: "text-amber-700" },
          ].map((g) => (
            <div key={g.k}>
              <p className="mb-2 text-[0.8rem] font-bold text-slate-500">{g.k}</p>
              <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {g.items.map((it) => (
                  <div key={it.label} className="rounded-lg bg-slate-50 px-2.5 py-2">
                    <dt className={`text-lg font-bold tabular-nums ${g.tone}`}>{it.n}</dt>
                    <dd className="text-[0.8rem] leading-snug text-slate-600">{it.label}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[0.8rem] text-slate-400">ที่มา: {SOURCES[CUMULATIVE.source]}</p>
      </Section>

      {/* 4 ห้าฝ่าย */}
      <Section no={4} title="ห้าฝ่ายในระบบ ใครเป็นแกนด้านไหน">
        <p className="mb-3 text-[0.9rem] leading-relaxed text-slate-600">
          ไม่มีฝ่ายใดเป็นแกนหลักในทุกเรื่อง แต่ละฝ่ายเป็นแกนในมิติของตัวเอง และเป็นแกนรองให้ฝ่ายอื่น
          มทร.ล้านนาเป็นแกนหลักในมิติวิศวกรรมและเทคโนโลยี ส่วนโจทย์ ทิศทางวิจัย นโยบาย และเงิน มาจากอีกสี่ฝ่าย
        </p>
        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-5">
          {ACTORS.map((a) => {
            const us = a.key === "rmutl";
            return (
              <div
                key={a.key}
                className={`rounded-lg p-3 ring-1 ${us ? "bg-amber-50 ring-amber-300" : "bg-slate-50 ring-slate-200"}`}
              >
                <p className={`text-[0.8rem] font-bold ${us ? "text-amber-800" : "text-cyan-700"}`}>{a.axis}</p>
                <h3 className="mt-0.5 text-[0.95rem] font-bold leading-snug text-slate-900">{a.name}</h3>
                <p className="mt-1.5 text-[0.85rem] leading-snug text-slate-600">{a.detail}</p>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-[0.8rem] text-slate-400">
          กรอบห้าฝ่ายเป็นการวิเคราะห์ของกลุ่มแผนงาน ไม่ใช่การจัดบทบาทอย่างเป็นทางการของหน่วยงานใด
        </p>
      </Section>

      {/* 5 งบแผ่นดิน */}
      <Section no={5} title="งบประมาณแผ่นดิน หมวดเงินอุดหนุน ปี 2570: เล็ก แต่ระบุชื่อและต่อเนื่อง">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
          <div className="rounded-lg bg-amber-50 px-4 py-3 ring-1 ring-amber-200 sm:w-56">
            <p className="text-[0.8rem] text-amber-800">รวมสามรายการ</p>
            <p className="text-2xl font-bold tabular-nums text-amber-800">{baht(share.total)}</p>
            <p className="text-[0.85rem] text-amber-900">
              บาท · {share.percent.toFixed(2)}% ของงบ มทร.ล้านนา {baht(BUDGET_2570.rmutlTotal)} บาท
            </p>
          </div>
          <ul className="flex-1 space-y-2">
            {BUDGET_2570.lines.map((l) => (
              <li key={l.code} className="flex flex-col gap-0.5 rounded-lg bg-slate-50 px-3 py-2 sm:flex-row sm:items-baseline sm:gap-3">
                <span className="text-[0.8rem] font-bold text-slate-500">รายการ {l.code}</span>
                <span className="flex-1 text-[0.9rem] leading-snug text-slate-700">{l.name}</span>
                <span className="font-bold tabular-nums text-slate-900">{baht(l.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-3 text-[0.9rem] leading-relaxed text-slate-600">
          เงินก้อนนี้ไม่ใช่งบวิจัยแข่งขัน จึงใช้เป็นทุนตั้งต้นให้ทีมลงพื้นที่ได้ทุกปีโดยไม่ขาดช่วง
          แล้วต่อยอดไปขอทุนใหญ่จากแหล่งอื่น ความต่อเนื่องนี้คือสิ่งที่ทำให้การทำงาน 25 ปีสะสมผลได้
        </p>
        <p className="mt-2 text-[0.8rem] text-slate-400">ที่มา: {SOURCES[BUDGET_2570.source]}</p>
      </Section>

      {/* 6 สวพส. */}
      <Section no={6} title="ไปต่อ: ความสอดคล้องกับแผนวิจัยพื้นที่สูง 5 ปีของ สวพส. (2571–2575)">
        <div className="space-y-2">
          {HRDI_ALIGNMENT.map((m) => (
            <div key={m.hrdi} className="grid gap-1.5 rounded-lg bg-slate-50 p-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-3">
              <p className="text-[0.9rem] leading-snug text-slate-700">{m.hrdi}</p>
              <span className="hidden text-cyan-600 sm:block">↔</span>
              <p className="text-[0.9rem] font-medium leading-snug text-cyan-900">{m.ours}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[0.8rem] text-slate-400">
          การจับคู่เป็นข้อเสนอของกลุ่มแผนงาน ยังไม่ได้รับการยืนยันจาก สวพส. · เลขแผนงานใช้ลำดับของ ง.8 ปี 2570 ·
          ที่มา: {SOURCES.HRDI}
        </p>
      </Section>

      <div className="flex flex-wrap gap-x-4 gap-y-1 px-1 text-[0.9rem]">
        <Link href="/foundation" className="font-medium text-cyan-700 hover:underline">📖 ที่มาและ 3 แผนงานปีปัจจุบัน →</Link>
        <Link href="/executive-summary" className="font-medium text-cyan-700 hover:underline">📋 บทสรุปผู้บริหารปี 2569 →</Link>
      </div>
    </div>
  );
}
