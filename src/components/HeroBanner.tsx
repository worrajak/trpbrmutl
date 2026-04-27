/**
 * HeroBanner v2 — compact + dense
 *
 * เปลี่ยนจาก v1:
 *  - ลด padding (py-6 → py-4)
 *  - Logo เล็กลง (h-14 → h-10)
 *  - Stats ย้ายมาเรียงข้าง title ในแถวเดียว (แนวนอน) ไม่ขึ้นบรรทัดใหม่
 *  - ลดความสูงไปครึ่งหนึ่ง — ให้พื้นที่หน้าแรกมีอย่างอื่นมากขึ้น
 */

interface HeroProps {
  projectCount: number;
  activeCount: number;
  budgetTotal: number;
  budgetUsed: number;
  isLive: boolean;
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString("th-TH");
}

export default function HeroBanner({
  projectCount,
  activeCount,
  budgetTotal,
  budgetUsed,
  isLive,
}: HeroProps) {
  const usagePercent = budgetTotal > 0 ? Math.round((budgetUsed / budgetTotal) * 100) : 0;

  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 p-4 sm:p-5 shadow-lg shadow-emerald-500/20">
      {/* Floating orbs - smaller */}
      <div className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-lime-300/30 blur-3xl animate-pulse" />
      <div
        className="pointer-events-none absolute -bottom-16 -left-12 h-44 w-44 rounded-full bg-cyan-300/25 blur-3xl animate-pulse"
        style={{ animationDelay: "1s" }}
      />

      <div className="relative flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
        {/* Left: title + logo + live badge — compact */}
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt=""
            className="h-10 w-auto sm:h-12 drop-shadow"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-white drop-shadow truncate">
                ใต้ร่มพระบารมี
              </h1>
              {isLive ? (
                <span className="flex items-center gap-1 rounded-full bg-white/20 backdrop-blur px-2 py-0.5 ring-1 ring-white/30">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-300 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-lime-400" />
                  </span>
                  <span className="text-[9px] font-medium text-white">LIVE</span>
                </span>
              ) : (
                <span className="rounded-full bg-amber-500/20 backdrop-blur px-2 py-0.5 text-[9px] text-amber-100 ring-1 ring-amber-300/30">
                  OFFLINE
                </span>
              )}
            </div>
            <p className="text-[11px] text-emerald-50/90 truncate">
              มทร.ล้านนา · ปี 2569 · Royal Project Foundation
            </p>
          </div>
        </div>

        {/* Right: stats - inline horizontal */}
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2 lg:flex-shrink-0">
          {[
            {
              label: "โครงการ",
              value: projectCount.toString(),
              sub: `${activeCount} active`,
              dot: "bg-lime-400",
            },
            {
              label: "งบรวม",
              value: fmt(budgetTotal),
              sub: "บาท",
              dot: "bg-cyan-400",
            },
            {
              label: "เบิกแล้ว",
              value: fmt(budgetUsed),
              sub: `${usagePercent}%`,
              dot: "bg-amber-400",
            },
            {
              label: "SDGs",
              value: "17",
              sub: "เป้าโลก",
              dot: "bg-rose-400",
            },
          ].map((s, i) => (
            <div
              key={i}
              className="rounded-lg bg-white/15 backdrop-blur px-2 py-1.5 ring-1 ring-white/20 hover:bg-white/20 transition lg:min-w-[80px]"
            >
              <div className="flex items-center gap-1">
                <span className={`h-1 w-1 rounded-full ${s.dot}`} />
                <p className="text-[8px] sm:text-[9px] font-medium uppercase text-white/70">
                  {s.label}
                </p>
              </div>
              <p className="text-base sm:text-lg font-bold text-white drop-shadow leading-tight">
                {s.value}
              </p>
              <p className="text-[8px] sm:text-[9px] text-white/70 leading-tight">
                {s.sub}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
