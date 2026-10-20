import { Metadata } from "next";
import Link from "next/link";
import raw from "@/data/g9-2570-topics.json";

/**
 * ร่างหัวข้อโครงการย่อย ง.9 ปีงบประมาณ 2570 — รายละเอียดครบทุกหัวข้อ
 * ข้อมูลส่งออกจาก topics_g9.py (ชุดเดียวกับ PDF ร่างหัวข้อ) ด้วย topics_g9_json.py
 *   2026-09-06_แผนงบประมาณ70/ง8-2570-v2/_สคริปต์/ — ห้ามแก้ JSON ด้วยมือ ให้แก้ต้นทางแล้วส่งออกใหม่
 * ⚠️ ยังเป็น "ร่างเพื่อหารือ" ไม่ใช่ประกาศฉบับทางการ
 */

export const metadata: Metadata = {
  title: "(ร่าง) แนวทางโครงการย่อย ง.9 ปีงบประมาณ 2570 | ใต้ร่มพระบารมี",
  description:
    "(ร่าง) แนวทางโครงการย่อย ง.9 ปีงบประมาณ 2570 ทั้ง 33 หัวข้อ 61 โครงการ — วัตถุประสงค์ เป้า ระยะเวลา วงเงิน หมวดงบที่แนะนำ และข้อควรระวังในการเขียน (ร่างเพื่อหารือ)",
};

interface Section { label: string; items: string[] }
interface Topic {
  code: string; plan: string; frame: string; frameName: string; title: string;
  months: number; window: string; slots: number; budgetEach: number; track: string;
  climateCore: boolean; climateNote: string; sections: Section[];
}
interface Data {
  meta: { status: string; source: string; exported: string; note: string; slots: number; topics: number; open: number };
  frames: { id: string; plan: string; name: string; budget: number }[];
  rules: Record<string, (string | string[])[]>;
  topicsList: Topic[];
}
const data = raw as unknown as Data;

const PLANS: Record<string, string> = {
  "1": "ผลักดันเทคโนโลยี นวัตกรรมสู่ชุมชน",
  "2": "พัฒนากำลังคน สร้างอาชีพ ลดความเหลื่อมล้ำ",
  "3": "ขับเคลื่อนกลไกการพัฒนาองค์ความรู้",
};

// จัดแถวของการ์ดเป็น 5 กลุ่ม ตามลำดับในเอกสารร่าง
const GROUPS: { icon: string; name: string; labels: string[] }[] = [
  { icon: "📌", name: "โครงการ", labels: ["วัตถุประสงค์", "เป้าต่อโครงการ", "พื้นที่เป้าหมาย", "ฐานงานปี 2569"] },
  { icon: "👥", name: "ทีมทำงาน", labels: ["ความเชี่ยวชาญที่แนะนำ", "อาจารย์ สาขาที่ต้องการ", "ผู้ช่วยปฏิบัติงาน", "นักศึกษา", "คนทำงานบริการวิชาการ"] },
  { icon: "🤝", name: "ภาคีและการส่งมอบ", labels: ["หน่วยงานหลัก ขอความร่วมมืออะไร", "ผู้ใช้ประโยชน์", "ผู้ร่วมทุน", "ส่งต่ออะไร ให้ใคร"] },
  { icon: "🔬", name: "ต่อยอดเป็นทุนวิจัย (ไม่ใช่งบใต้ร่มฯ)", labels: ["กลุ่มวิจัยที่รับช่วงยื่นทุนวิจัย", "ผู้ช่วยวิจัยในข้อเสนอต่อยอด", "ยื่นทุนต่อ"] },
  { icon: "💰", name: "งบประมาณ (หมวดเงินอุดหนุน)", labels: ["งบที่แนะนำ", "ไม่แนะนำ"] },
];

const baht = (n: number) => n.toLocaleString("th-TH");
const asRows = (k: string) => (data.rules[k] || []) as string[][];
const asText = (k: string) => (data.rules[k] || []) as string[];

function RuleTable({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[36rem] border-collapse text-[0.9rem]">
        <thead>
          <tr className="bg-cyan-50 text-left text-cyan-900">
            {head.map((h) => (
              <th key={h} className="border border-cyan-100 px-2 py-1 font-bold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="align-top">
              {r.map((c, j) => (
                <td key={j} className={`border border-slate-200 px-2 py-1 leading-snug ${j === 0 ? "font-medium text-slate-800" : "text-slate-600"}`}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Rule({ title, children, open = false }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details open={open} className="group rounded-lg bg-white ring-1 ring-slate-200">
      <summary className="cursor-pointer list-none px-3 py-2 text-[0.95rem] font-bold text-slate-800">
        <span className="mr-1 inline-block transition group-open:rotate-90">▸</span>
        {title}
      </summary>
      <div className="space-y-2 px-3 pb-3">{children}</div>
    </details>
  );
}

function TopicCard({ t }: { t: Topic }) {
  const byLabel = new Map(t.sections.map((s) => [s.label, s.items]));
  return (
    <details id={t.code} className="group scroll-mt-20 rounded-lg bg-white ring-1 ring-slate-200 open:ring-cyan-300">
      <summary className="cursor-pointer list-none px-3 py-2.5">
        <p className="text-[0.95rem] font-medium leading-snug text-slate-800">
          <span className="mr-1.5 rounded bg-slate-700 px-1.5 text-[0.8rem] font-bold text-white">{t.code}</span>
          {t.title}
        </p>
        <p className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[0.8rem] text-slate-500">
          <span>{t.months} เดือน · {t.window}</span>
          <span>รับ {t.slots} × {baht(t.budgetEach)} บาท</span>
          <span>Track {t.track}</span>
          {t.climateCore && <span className="rounded bg-emerald-50 px-1 text-emerald-800">ภูมิอากาศ</span>}
          <span className="text-cyan-700 group-open:hidden">ดูรายละเอียด ▾</span>
        </p>
      </summary>
      <div className="space-y-3 border-t border-slate-100 px-3 py-3">
        <p className="text-[0.8rem] text-slate-500">{t.climateNote}</p>
        {GROUPS.map((g) => {
          const rows = g.labels.filter((l) => byLabel.has(l));
          if (!rows.length) return null;
          return (
            <div key={g.name}>
              <p className="mb-1 text-[0.8rem] font-bold uppercase tracking-wide text-cyan-800">
                {g.icon} {g.name}
              </p>
              <dl className="divide-y divide-slate-100 rounded-md ring-1 ring-slate-100">
                {rows.map((l) => (
                  <div key={l} className="grid gap-1 px-2 py-1.5 sm:grid-cols-[11rem_1fr]">
                    <dt className="text-[0.85rem] font-bold text-slate-700">{l}</dt>
                    <dd className="space-y-0.5 text-[0.9rem] leading-snug text-slate-700">
                      {byLabel.get(l)!.map((x, i) => (
                        <p key={i} className={x.startsWith("✗") ? "text-rose-700" : ""}>{x}</p>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          );
        })}
      </div>
    </details>
  );
}

export default function G9Page() {
  const { meta, frames, topicsList } = data;
  return (
    <div className="mx-auto max-w-5xl space-y-5 px-3 py-5 sm:px-4">
      <header className="space-y-2">
        <p className="text-[0.85rem] text-slate-500">
          <Link href="/" className="text-cyan-700 hover:underline">ภาพรวม</Link> › ง.9 ปีงบประมาณ 2570
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">(ร่าง) แนวทางโครงการย่อย ง.9 ปีงบประมาณ 2570</h1>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[0.85rem] font-bold text-amber-900">ร่าง · แนวทางโครงการ ปี 2570</span>
        </div>
        <p className="rounded-md bg-amber-50 px-3 py-2 text-[0.9rem] leading-snug text-amber-900 ring-1 ring-amber-200">
          หน้านี้เป็น<b>ร่างแนวทางโครงการย่อย ปีงบประมาณ 2570</b> เพื่อหารือและเตรียมเขียนข้อเสนอ ยังไม่ใช่ประกาศรับข้อเสนอฉบับทางการ หัวข้อ วงเงิน และเงื่อนไขอาจเปลี่ยนได้ ·
          {" "}{meta.note}
        </p>
        <div className="grid grid-cols-3 gap-2">
          {[
            ["หัวข้อ", `${meta.topics}`],
            ["เปิดรับ", `${meta.slots} โครงการ`],
            ["วงเงินเปิดรับ", `${baht(meta.open)} บาท`],
          ].map(([k, v]) => (
            <div key={k} className="rounded-md bg-cyan-50 px-2 py-1.5 ring-1 ring-cyan-100">
              <p className="text-[0.8rem] text-slate-500">{k}</p>
              <p className="text-[0.95rem] font-bold tabular-nums text-slate-800">{v}</p>
            </div>
          ))}
        </div>
        <nav className="flex flex-wrap gap-1.5 text-[0.85rem]">
          <a href="#rules" className="rounded-full bg-slate-800 px-2.5 py-1 font-medium text-white">ข้อควรระวังในการเขียน ง.9</a>
          {Object.entries(PLANS).map(([id, name]) => (
            <a key={id} href={`#plan-${id}`} className="rounded-full bg-white px-2.5 py-1 text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50">
              แผนงาน {id} {name}
            </a>
          ))}
        </nav>
      </header>

      <section id="rules" className="scroll-mt-20 space-y-2">
        <h2 className="text-lg font-bold text-slate-900">ข้อควรระวังในการเขียน ง.9 — กติกากลางทุกหัวข้อ</h2>
        <p className="text-[0.9rem] text-slate-600">การ์ดรายหัวข้อด้านล่างเขียนเฉพาะสิ่งที่ต่างกัน เงื่อนไขที่ใช้ร่วมกันอยู่ในส่วนนี้</p>
        <Rule title="สิ่งที่ทุกโครงการต้องมี" open>
          <RuleTable head={["ต้องมี", "ที่มา"]} rows={asRows("mustHave")} />
        </Rule>
        <Rule title="พื้นที่และทีม">
          {asText("areaTeam").map((p, i) => <p key={i} className="text-[0.9rem] leading-relaxed text-slate-700">{p}</p>)}
        </Rule>
        <Rule title="หมวดงบประมาณที่แนะนำให้เขียน (งบเงินอุดหนุน ไม่ใช่งบวิจัย)" open>
          {asText("budgetIntro").map((p, i) => <p key={i} className="text-[0.9rem] leading-relaxed text-slate-700">{p}</p>)}
          <RuleTable head={["หมวด", "แนะนำให้เขียน", "ข้อควรระวัง"]} rows={asRows("budgetOk")} />
        </Rule>
        <Rule title="รายการที่ไม่แนะนำหรือห้าม" open>
          <RuleTable head={["รายการ", "เหตุผล", "ทางที่ถูก"]} rows={asRows("budgetNo")} />
        </Rule>
        <Rule title="ต่อยอด FF และ SF ให้เกิดจริง — ผู้ใช้ประโยชน์ การร่วมทุน การส่งมอบ">
          {asText("followonIntro").map((p, i) => <p key={i} className="text-[0.9rem] leading-relaxed text-slate-700">{p}</p>)}
          <RuleTable head={["ต้องมี", "หมายถึง", "หลักฐาน"]} rows={asRows("followonNeeds")} />
          <p className="pt-1 text-[0.9rem] font-bold text-slate-800">ลำดับงานให้ทันรอบ SF ปีงบ 2571</p>
          <RuleTable head={["ช่วง", "ทำอะไร", "ใครทำ"]} rows={asRows("timeline")} />
          <p className="pt-1 text-[0.9rem] font-bold text-slate-800">เวทีจับคู่กลางปี เม.ย.–พ.ค. 2570</p>
          <RuleTable head={["รายการ", "รายละเอียด"]} rows={asRows("forum")} />
          {asText("timing").map((p, i) => <p key={i} className="text-[0.9rem] leading-relaxed text-slate-700">{p}</p>)}
        </Rule>
      </section>

      {Object.entries(PLANS).map(([id, name]) => {
        const list = topicsList.filter((t) => t.plan === id);
        const slots = list.reduce((a, t) => a + t.slots, 0);
        const money = list.reduce((a, t) => a + t.slots * t.budgetEach, 0);
        return (
          <section key={id} id={`plan-${id}`} className="scroll-mt-20 space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-1 border-b-2 border-cyan-600 pb-1">
              <h2 className="text-lg font-bold text-slate-900">แผนงาน {id} {name}</h2>
              <p className="text-[0.85rem] tabular-nums text-slate-500">{list.length} หัวข้อ · {slots} โครงการ · {baht(money)} บาท</p>
            </div>
            {frames.filter((f) => f.plan === id).map((f) => {
              const ft = list.filter((t) => t.frame === f.id);
              if (!ft.length) return null;
              return (
                <div key={f.id} className="space-y-1.5">
                  <p className="text-[0.95rem] font-bold text-cyan-900">
                    กรอบ {f.id} {f.name}
                    <span className="ml-1.5 font-normal text-slate-500">· {baht(f.budget)} บาท</span>
                  </p>
                  {ft.map((t) => <TopicCard key={t.code} t={t} />)}
                </div>
              );
            })}
          </section>
        );
      })}

      <footer className="border-t border-slate-200 pt-3 text-[0.8rem] leading-snug text-slate-500">
        สถานะ: ร่างแนวทางโครงการ ปี 2570 · ที่มา: {meta.source} · ส่งออกข้อมูล {meta.exported} · เลขแผนงานในหน้านี้ใช้ลำดับของร่าง ง.9
        (แผนงาน 2 พัฒนากำลังคน · แผนงาน 3 ขับเคลื่อนองค์ความรู้) ซึ่งสลับกับลำดับใน พ.ร.บ.งบประมาณและ ง.8 ฉบับเสนอลงนาม
      </footer>
    </div>
  );
}
