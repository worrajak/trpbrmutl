import { SDG_GOALS } from "@/lib/sdgs";
import Link from "next/link";

/**
 * SdgShowcase — แสดง SDGs 17 ข้อบนหน้าแรก
 *
 * ดีไซน์:
 *  - 17 cards · สีตาม UN SDG official
 *  - SDG ที่มีโครงการ (active) → glow effect + count badge
 *  - SDG ที่ไม่มี → สีจาง (opacity-50) + grayscale
 *  - Click → /sdgs/[id]
 *
 * "Active" สื่อด้วย: glow shadow + scale on hover + animated badge
 */
interface SdgShowcaseProps {
  countPerSdg: Record<number, number>;
  totalProjects: number;
}

export default function SdgShowcase({ countPerSdg, totalProjects }: SdgShowcaseProps) {
  const totalTagged = Object.values(countPerSdg).reduce((a, b) => a + b, 0);
  const activeSdgs = Object.keys(countPerSdg).length;

  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider">
            🌍 Sustainable Development Goals
          </p>
          <h2 className="mt-0.5 text-xl sm:text-2xl font-bold text-gray-800">
            17 เป้าหมายโลก · กับโครงการ มทร.ล้านนา
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            {activeSdgs}/17 ข้อ มีโครงการสนับสนุน · รวม {totalTagged} โครงการที่ tag SDG
            {totalProjects > totalTagged && (
              <span className="text-amber-600">
                {" "}
                · ยังไม่ tag {totalProjects - totalTagged} โครงการ
              </span>
            )}
          </p>
        </div>
        <Link
          href="/sdgs"
          className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-50 px-4 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition"
        >
          ดูทั้งหมด →
        </Link>
      </div>

      {/* Grid: 17 SDGs */}
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-9 lg:grid-cols-9 gap-2 sm:gap-3">
        {SDG_GOALS.map((g) => {
          const count = countPerSdg[g.id] || 0;
          const isActive = count > 0;

          return (
            <Link
              key={g.id}
              href={`/sdgs/${g.id}`}
              className={`group relative aspect-square rounded-xl overflow-hidden transition-all duration-300 ${
                isActive
                  ? "ring-2 ring-white shadow-lg hover:scale-105 hover:-translate-y-1"
                  : "opacity-40 grayscale-[60%] hover:opacity-70 hover:grayscale-0"
              }`}
              style={{
                backgroundColor: g.color,
                boxShadow: isActive ? `0 8px 24px ${g.color}40` : undefined,
              }}
              title={`SDG ${g.id}: ${g.name_th}`}
            >
              {/* Animated gradient overlay สำหรับ active */}
              {isActive && (
                <div
                  className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
                />
              )}

              <div className="relative h-full flex flex-col items-center justify-center p-1 text-white">
                <span className="text-2xl sm:text-3xl drop-shadow-md">{g.icon}</span>
                <p className="mt-0.5 text-[9px] sm:text-[10px] font-bold opacity-90">
                  SDG {g.id}
                </p>
                <p className="text-[8px] sm:text-[9px] leading-tight text-center px-1 line-clamp-2 opacity-80 hidden sm:block">
                  {g.name_th.length > 20 ? g.name_th.substring(0, 20) + "…" : g.name_th}
                </p>
              </div>

              {/* Active badge - count */}
              {isActive && (
                <div className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 flex items-center justify-center rounded-full bg-white text-[10px] font-bold shadow-md ring-2 ring-current"
                  style={{ color: g.color }}
                >
                  {count}
                </div>
              )}

              {/* Pulsing dot สำหรับ active */}
              {isActive && (
                <span className="absolute top-1 left-1 flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Mobile - "view all" link */}
      <Link
        href="/sdgs"
        className="mt-3 sm:hidden flex items-center justify-center gap-1 rounded-lg bg-emerald-50 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
      >
        ดู SDG ทั้งหมด →
      </Link>
    </section>
  );
}
