import Link from "next/link";

/**
 * BottomDashboardCards — 3 cards เลียนสไตล์ "ราคาขึ้น/ลด/แนะนำ" ของ NorthCrop Intel
 *
 * 3 cards:
 *  1. ↑ โครงการเบิกเร็ว (ใช้งบเร็ว/ปกติ — green)
 *  2. ↓ โครงการล่าช้า (ยังไม่เบิกหรือเบิกน้อย — red)
 *  3. 🌟 SDGs ที่มีโครงการมากสุด (highlight strength)
 */

interface ProjectMin {
  id?: string;
  project_name?: string | null;
  budget_total?: number | string | null;
  budget_used?: number | string | null;
  sdg_tags?: number[] | null;
}

interface Props {
  projects: ProjectMin[];
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString("th-TH");
}

export default function BottomDashboardCards({ projects }: Props) {
  // คำนวณ usage% ต่อโครงการ
  const enriched = projects
    .filter((p) => Number(p.budget_total) > 0)
    .map((p) => ({
      ...p,
      usage:
        Number(p.budget_total) > 0
          ? (Number(p.budget_used || 0) / Number(p.budget_total)) * 100
          : 0,
    }));

  // Top 5 เบิกเร็วสุด
  const topUsed = [...enriched]
    .sort((a, b) => b.usage - a.usage)
    .slice(0, 5);

  // Top 5 เบิกน้อยสุด
  const lowUsed = [...enriched]
    .sort((a, b) => a.usage - b.usage)
    .slice(0, 5);

  // SDGs ที่มีโครงการมากสุด (top 5)
  const sdgCounts: Record<number, number> = {};
  for (const p of projects) {
    for (const id of p.sdg_tags || []) {
      sdgCounts[id] = (sdgCounts[id] || 0) + 1;
    }
  }
  const topSdgs = Object.entries(sdgCounts)
    .map(([id, count]) => ({ id: Number(id), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {/* Card 1: เบิกเร็ว */}
      <div className="rounded-lg bg-white ring-1 ring-emerald-200 overflow-hidden">
        <div className="bg-emerald-50 px-3 py-1.5 border-b border-emerald-100">
          <p className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
            <span>↑</span>
            <span>เบิกจ่ายเร็ว · ปกติ (Top 5)</span>
          </p>
        </div>
        <div className="divide-y divide-gray-50">
          {topUsed.length === 0 ? (
            <div className="px-3 py-2 text-[11px] text-gray-400 text-center">
              ไม่มีข้อมูล
            </div>
          ) : (
            topUsed.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs hover:bg-emerald-50 transition"
              >
                <span className="line-clamp-1 text-gray-700 flex-1 min-w-0">
                  {p.project_name}
                </span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] text-gray-400">
                    {fmt(Number(p.budget_used || 0))}/{fmt(Number(p.budget_total || 0))}
                  </span>
                  <span className="text-emerald-700 font-bold">
                    {p.usage.toFixed(0)}%
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
        <div className="border-t border-gray-100 px-3 py-1 text-[10px] text-gray-400">
          ที่มา: budget_used (ERP) / budget_total
        </div>
      </div>

      {/* Card 2: เบิกล่าช้า */}
      <div className="rounded-lg bg-white ring-1 ring-red-200 overflow-hidden">
        <div className="bg-red-50 px-3 py-1.5 border-b border-red-100">
          <p className="text-xs font-bold text-red-800 flex items-center gap-1.5">
            <span>↓</span>
            <span>เบิกจ่ายล่าช้า · ต้องเร่ง (Top 5)</span>
          </p>
        </div>
        <div className="divide-y divide-gray-50">
          {lowUsed.length === 0 ? (
            <div className="px-3 py-2 text-[11px] text-gray-400 text-center">
              ไม่มีข้อมูล
            </div>
          ) : (
            lowUsed.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs hover:bg-red-50 transition"
              >
                <span className="line-clamp-1 text-gray-700 flex-1 min-w-0">
                  {p.project_name}
                </span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] text-gray-400">
                    {fmt(Number(p.budget_used || 0))}/{fmt(Number(p.budget_total || 0))}
                  </span>
                  <span className="text-red-700 font-bold">
                    {p.usage.toFixed(0)}%
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
        <div className="border-t border-gray-100 px-3 py-1 text-[10px] text-gray-400">
          อาจติดที่กระบวนการ ERP / รอเอกสาร
        </div>
      </div>

      {/* Card 3: SDGs Top */}
      <div className="rounded-lg bg-white ring-1 ring-amber-200 overflow-hidden">
        <div className="bg-amber-50 px-3 py-1.5 border-b border-amber-100">
          <p className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
            <span>🌍</span>
            <span>SDGs ที่มีโครงการมากสุด (Top 5)</span>
          </p>
        </div>
        <div className="divide-y divide-gray-50">
          {topSdgs.length === 0 ? (
            <div className="px-3 py-2 text-[11px] text-gray-400 text-center">
              ยังไม่มีโครงการที่ tag SDG
            </div>
          ) : (
            topSdgs.map((s) => {
              const sdgInfo: Record<number, { name: string; color: string }> = {
                1: { name: "ขจัดความยากจน", color: "#E5243B" },
                2: { name: "ขจัดความหิวโหย", color: "#DDA63A" },
                3: { name: "สุขภาพและความเป็นอยู่ที่ดี", color: "#4C9F38" },
                4: { name: "การศึกษาที่มีคุณภาพ", color: "#C5192D" },
                5: { name: "ความเท่าเทียมทางเพศ", color: "#FF3A21" },
                6: { name: "น้ำสะอาดและสุขาภิบาล", color: "#26BDE2" },
                7: { name: "พลังงานสะอาด", color: "#FCC30B" },
                8: { name: "งานที่ดี+เศรษฐกิจ", color: "#A21942" },
                9: { name: "นวัตกรรม+โครงสร้างพื้นฐาน", color: "#FD6925" },
                10: { name: "ลดความไม่เสมอภาค", color: "#DD1367" },
                11: { name: "เมือง+ชุมชนที่ยั่งยืน", color: "#FD9D24" },
                12: { name: "ผลิต+บริโภคยั่งยืน", color: "#BF8B2E" },
                13: { name: "Climate Action", color: "#3F7E44" },
                14: { name: "ชีวิตใต้น้ำ", color: "#0A97D9" },
                15: { name: "ชีวิตบนบก", color: "#56C02B" },
                16: { name: "ความสงบสุข+ยุติธรรม", color: "#00689D" },
                17: { name: "ความร่วมมือ", color: "#19486A" },
              };
              const info = sdgInfo[s.id] || { name: `SDG ${s.id}`, color: "#888" };
              return (
                <Link
                  key={s.id}
                  href={`/sdgs/${s.id}`}
                  className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs hover:bg-amber-50 transition"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="flex h-4 w-4 items-center justify-center rounded text-[8px] font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: info.color }}
                    >
                      {s.id}
                    </span>
                    <span className="line-clamp-1 text-gray-700">
                      {info.name}
                    </span>
                  </div>
                  <span className="text-amber-700 font-bold flex-shrink-0">
                    {s.count} โครงการ
                  </span>
                </Link>
              );
            })
          )}
        </div>
        <div className="border-t border-gray-100 px-3 py-1 text-[10px] text-gray-400">
          ที่มา: projects.sdg_tags
        </div>
      </div>
    </div>
  );
}
