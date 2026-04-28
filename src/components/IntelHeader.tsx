import Link from "next/link";

/**
 * IntelHeader — สไตล์ North Crop Intel
 *
 * ดีไซน์:
 *  - Title row: ชื่อ + subtitle + live dot (เล็ก, ขวาบน)
 *  - Alert bar (ถ้ามี): bg-red, bold message, สถานะวิกฤต
 *  - Nav pills row: 7 ปุ่มหลัก (icon + label)
 *  - 4 KPI stat boxes: label เล็ก + value ใหญ่สี + sub
 *
 * ทุกอย่าง compact — ไม่มี gradient hero ใหญ่
 */

interface AlertItem {
  level: "critical" | "warning" | "info";
  title: string;
  detail?: string;
}

interface KpiBox {
  label: string;
  value: string | number;
  sub?: string;
  color: string; // tailwind text class
}

interface NavItem {
  href: string;
  icon: string;
  label: string;
}

interface Props {
  title: string;
  subtitle: string;
  isLive: boolean;
  liveText?: string;
  alerts?: AlertItem[];
  navs: NavItem[];
  stats: KpiBox[];
}

const ALERT_STYLE: Record<AlertItem["level"], { bg: string; text: string; icon: string }> = {
  critical: { bg: "bg-red-50 ring-red-200", text: "text-red-800", icon: "⚠" },
  warning: { bg: "bg-amber-50 ring-amber-200", text: "text-amber-800", icon: "⚡" },
  info: { bg: "bg-blue-50 ring-blue-200", text: "text-blue-800", icon: "ℹ" },
};

export default function IntelHeader({
  title,
  subtitle,
  isLive,
  liveText,
  alerts = [],
  navs,
  stats,
}: Props) {
  return (
    <div className="space-y-2.5">
      {/* Title row */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-baseline gap-2 min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-gray-900">{title}</h1>
          <p className="text-xs text-gray-500 truncate">{subtitle}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={`relative flex h-2 w-2`}>
            {isLive && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            )}
            <span
              className={`relative inline-flex h-2 w-2 rounded-full ${
                isLive ? "bg-emerald-500" : "bg-gray-400"
              }`}
            />
          </span>
          <span className="text-[10px] text-gray-500 whitespace-nowrap">
            {isLive ? "live" : "offline"}
            {liveText && ` · ${liveText}`}
          </span>
        </div>
      </div>

      {/* Alerts */}
      {alerts.map((a, i) => {
        const style = ALERT_STYLE[a.level];
        return (
          <div
            key={i}
            className={`flex items-center justify-between gap-3 rounded-lg ${style.bg} ring-1 px-3 py-1.5 text-xs ${style.text}`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm">{style.icon}</span>
              <span className="font-bold">{a.title}</span>
            </div>
            {a.detail && <span className="text-[11px] truncate">{a.detail}</span>}
          </div>
        );
      })}

      {/* Nav pills */}
      <div className="flex flex-wrap gap-1.5">
        {navs.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className="inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1 text-xs font-medium text-gray-700 ring-1 ring-gray-200 hover:ring-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 transition"
          >
            <span>{n.icon}</span>
            <span>{n.label}</span>
          </Link>
        ))}
      </div>

      {/* KPI Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {stats.map((s, i) => (
          <div
            key={i}
            className="rounded-lg bg-white p-2.5 ring-1 ring-gray-200"
          >
            <p className="text-[10px] text-gray-500 leading-tight">{s.label}</p>
            <p className={`mt-0.5 text-2xl font-bold leading-tight ${s.color}`}>
              {s.value}
            </p>
            {s.sub && (
              <p className="text-[10px] text-gray-400 leading-tight">{s.sub}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
