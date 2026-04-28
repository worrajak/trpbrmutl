/**
 * LatestSyncRow — แสดงแหล่งข้อมูลล่าสุด พร้อม timestamp
 * เลียนสไตล์ "ข้อมูลล่าสุดเมื่อ" ของ North Crop Intel
 */

interface SyncSource {
  icon: string;
  name: string;
  detail?: string;
  timestamp: string; // เช่น "28 เม.ย." หรือ "27/04/2569 16:15"
  warning?: boolean;
}

interface Props {
  title?: string;
  sources: SyncSource[];
}

export default function LatestSyncRow({
  title = "ข้อมูลล่าสุดเมื่อ",
  sources,
}: Props) {
  return (
    <div className="rounded-lg bg-white ring-1 ring-gray-200 p-3">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-700">
        <span>🕐</span>
        <span>{title}</span>
      </p>
      <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1.5">
        {sources.map((s, i) => (
          <div key={i} className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-sm">{s.icon}</span>
              <span className="text-gray-700 truncate">
                {s.name}
                {s.detail && <span className="text-gray-400 ml-1">{s.detail}</span>}
              </span>
            </div>
            <span className="flex items-center gap-1 text-[11px] text-gray-500 whitespace-nowrap flex-shrink-0">
              {s.timestamp}
              {s.warning && <span className="text-amber-500">⚠</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
