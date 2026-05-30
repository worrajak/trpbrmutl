/**
 * ActionTier2 — รายการที่ "ต้องเร่งวันนี้"
 *
 * แสดงเฉพาะ top 3 risky projects (ไม่ใช่ทุกอัน)
 * — 1 รายการ = 1 บรรทัดที่ตอบ "ทำไมเสี่ยง + ใครรับผิดชอบ + กดเข้าไปทำอะไร"
 *
 * ถ้าไม่มี risky → empty state แบบบวก ๆ
 */
import Link from "next/link";
import type { RiskyProjectsSummary } from "@/lib/dashboard-decisions";

const SEV_STYLE = {
  high: { ring: "ring-red-300", bg: "bg-red-50", dot: "bg-red-500", text: "text-red-900" },
  medium: { ring: "ring-amber-300", bg: "bg-amber-50", dot: "bg-amber-500", text: "text-amber-900" },
};

export default function ActionTier2({ risky }: { risky: RiskyProjectsSummary }) {
  if (risky.riskyCount === 0) {
    return (
      <section className="rounded-xl bg-emerald-50 ring-1 ring-emerald-200 p-4 text-center">
        <p className="text-base font-bold text-emerald-800">
          🟢 ไม่มีโครงการที่ต้องเร่ง — ทุกตัวเดินตามแผน
        </p>
        <p className="mt-1 text-xs text-emerald-700">
          {risky.totalProjects} โครงการทำงาน · เบิกตามจังหวะเวลา
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl bg-white ring-1 ring-slate-200 p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-2 flex-wrap mb-3">
        <h2 className="text-base font-bold text-slate-900">
          ⚠ เร่ง {risky.top3.length} โครงการนี้ก่อน
        </h2>
        {risky.riskyCount > 3 && (
          <Link href="/projects" className="text-xs text-cyan-700 hover:underline whitespace-nowrap">
            ดูเสี่ยงทั้งหมด ({risky.riskyCount}) →
          </Link>
        )}
      </div>

      <ol className="space-y-2.5">
        {risky.top3.map((p, i) => {
          const s = SEV_STYLE[p.severity];
          return (
            <li key={p.id} className={`rounded-lg ${s.bg} ring-1 ${s.ring} p-3`}>
              <div className="flex items-start gap-2.5">
                <span className={`mt-1.5 inline-flex h-2 w-2 flex-shrink-0 rounded-full ${s.dot}`} />
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/projects/${p.id}`}
                    className={`block text-sm font-bold leading-snug hover:underline ${s.text}`}
                  >
                    {i + 1}. {p.name}
                  </Link>
                  <ul className={`mt-1.5 space-y-0.5 text-xs ${s.text} opacity-90`}>
                    {p.reasons.map((r, j) => (
                      <li key={j}>• {r}</li>
                    ))}
                  </ul>
                  {p.responsible && (
                    <p className="mt-1.5 text-[0.7rem] text-slate-600">
                      👤 ผู้รับผิดชอบ: <strong>{p.responsible}</strong>
                    </p>
                  )}
                </div>
                <Link
                  href={`/projects/${p.id}`}
                  className={`flex-shrink-0 rounded border ${s.ring} bg-white px-2 py-1 text-xs hover:bg-slate-50`}
                >
                  ดู →
                </Link>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
