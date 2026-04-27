/**
 * HeroBanner — หน้าแรกแบบโมเดิร์น
 *
 * ดีไซน์:
 *  - Animated gradient background (emerald → teal → cyan)
 *  - Glassmorphism stats cards (white/80 + backdrop-blur)
 *  - Floating orbs (pulse animation) สื่อ "active" ตามเทรนด์
 *  - Soft shadow + rounded-3xl
 */

interface HeroProps {
  projectCount: number;
  activeCount: number; // status = approved/in_progress
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
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 p-6 sm:p-10 shadow-2xl shadow-emerald-500/20">
      {/* Floating orbs - สื่อ "active" */}
      <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-lime-300/30 blur-3xl animate-pulse" />
      <div
        className="pointer-events-none absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-cyan-300/30 blur-3xl animate-pulse"
        style={{ animationDelay: "1s" }}
      />
      <div
        className="pointer-events-none absolute top-1/3 right-1/4 h-32 w-32 rounded-full bg-yellow-300/20 blur-2xl animate-pulse"
        style={{ animationDelay: "2s" }}
      />

      <div className="relative">
        {/* Top row: Logo + Live badge */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt=""
              className="h-14 w-auto sm:h-20 drop-shadow-lg"
            />
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-emerald-100/80">
                Royal Project Foundation
              </p>
              <h1 className="mt-1 text-2xl sm:text-4xl font-bold text-white drop-shadow-md">
                ใต้ร่มพระบารมี
              </h1>
              <p className="mt-1 text-sm text-emerald-50/90">
                มหาวิทยาลัยเทคโนโลยีราชมงคลล้านนา · ปีงบประมาณ 2569
              </p>
            </div>
          </div>

          {/* Live indicator */}
          {isLive ? (
            <div className="hidden sm:flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-md px-3 py-1.5 ring-1 ring-white/30">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-300 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-lime-400" />
              </span>
              <span className="text-xs font-medium text-white">Realtime</span>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2 rounded-full bg-amber-500/20 backdrop-blur-md px-3 py-1.5 ring-1 ring-amber-300/30">
              <span className="h-2 w-2 rounded-full bg-amber-300" />
              <span className="text-xs font-medium text-amber-100">Offline</span>
            </div>
          )}
        </div>

        {/* Stats row - glassmorphism */}
        <div className="mt-6 sm:mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "โครงการทั้งหมด",
              value: projectCount.toString(),
              sub: `${activeCount} กำลังดำเนินงาน`,
              accent: "text-lime-200",
              dot: "bg-lime-400",
            },
            {
              label: "งบประมาณ",
              value: fmt(budgetTotal),
              sub: "บาท · ปี 2569",
              accent: "text-cyan-200",
              dot: "bg-cyan-400",
            },
            {
              label: "ใช้จ่ายแล้ว",
              value: fmt(budgetUsed),
              sub: `${usagePercent}% ของงบ`,
              accent: "text-amber-200",
              dot: "bg-amber-400",
            },
            {
              label: "SDGs",
              value: "17",
              sub: "เป้าหมายโลก",
              accent: "text-rose-200",
              dot: "bg-rose-400",
            },
          ].map((s, i) => (
            <div
              key={i}
              className="rounded-2xl bg-white/15 backdrop-blur-md p-3 sm:p-4 ring-1 ring-white/20 hover:bg-white/20 transition"
            >
              <div className="flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                <p className="text-[10px] sm:text-xs font-medium uppercase text-white/70 tracking-wide">
                  {s.label}
                </p>
              </div>
              <p className={`mt-1 text-xl sm:text-3xl font-bold text-white drop-shadow`}>
                {s.value}
              </p>
              <p className={`text-[10px] sm:text-xs ${s.accent}`}>{s.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
