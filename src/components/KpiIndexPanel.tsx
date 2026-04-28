"use client";

import { useState } from "react";
import {
  EXCELLENCE_KPIS,
  classifyProject,
  type ExcellenceKpi,
} from "@/lib/excellence-kpi";

/**
 * KpiIndexPanel — สไตล์ "ดัชนีค่าครองชีพ" ของ North Crop Intel
 *
 * Header: title + alert count + tabs (categories)
 * Body: list ของ KPI · dot ซ้าย + ชื่อ + จำนวน·เป้า + %คืบหน้า ขวา
 * Footer: tip box (yellow)
 */

interface Props {
  projects: Array<{
    id?: string;
    project_name?: string | null;
    organization?: string | null;
    responsible?: string | null;
    main_program?: string | null;
  }>;
}

const TABS = [
  { key: "ค.ต.ป.", icon: "🏛", color: "bg-amber-100 text-amber-800 ring-amber-300" },
  { key: "EdPEx 7.1ก", icon: "📊", color: "bg-blue-100 text-blue-800 ring-blue-300" },
  { key: "EdPEx 7.1ค", icon: "🎯", color: "bg-purple-100 text-purple-800 ring-purple-300" },
  { key: "EdPEx 7.2ก", icon: "💼", color: "bg-rose-100 text-rose-800 ring-rose-300" },
];

function getDot(progress: number, count: number): string {
  if (count === 0) return "bg-gray-300"; // ไม่มีโครงการ
  if (progress >= 100) return "bg-emerald-500"; // เกินเป้า
  if (progress >= 70) return "bg-blue-500"; // ใกล้เป้า
  if (progress >= 30) return "bg-amber-500"; // กำลังเดิน
  return "bg-red-500"; // ห่างเป้า
}

function getProgressColor(progress: number, count: number): string {
  if (count === 0) return "text-gray-400";
  if (progress >= 100) return "text-emerald-700";
  if (progress >= 70) return "text-blue-700";
  if (progress >= 30) return "text-amber-700";
  return "text-red-700";
}

export default function KpiIndexPanel({ projects }: Props) {
  const [activeTab, setActiveTab] = useState<string>(TABS[0].key);

  // คำนวณ count ต่อ KPI
  const counts: Record<string, number> = {};
  for (const p of projects) {
    for (const code of classifyProject(p)) {
      counts[code] = (counts[code] || 0) + 1;
    }
  }

  // KPIs ของ tab ปัจจุบัน
  const tabKpis = EXCELLENCE_KPIS.filter((k) => k.category_label === activeTab);

  // นับจำนวน "ห่างเป้า" (ทุก tab) สำหรับแสดงใน header alert
  const offTrackCount = EXCELLENCE_KPIS.filter((k) => {
    const c = counts[k.code] || 0;
    const target = k.target_team || k.target_university || 0;
    if (target === 0) return false;
    return c / target < 0.3;
  }).length;

  return (
    <div className="rounded-lg bg-white ring-1 ring-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base">🏆</span>
          <p className="text-xs sm:text-sm font-bold text-gray-800 truncate">
            ตอบยุทธศาสตร์ความเลิศ มทร.ล้านนา · ปี 2569
          </p>
        </div>
        {offTrackCount > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-amber-200 whitespace-nowrap">
            <span>⚠</span>
            <span>มี {offTrackCount} KPI ห่างเป้า</span>
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-gray-100 px-3 py-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium ring-1 transition ${
              activeTab === t.key
                ? t.color
                : "bg-white text-gray-600 ring-gray-200 hover:bg-gray-50"
            }`}
          >
            <span>{t.icon}</span>
            <span>{t.key}</span>
            <span className="ml-0.5 text-[10px] opacity-60">
              ({EXCELLENCE_KPIS.filter((k) => k.category_label === t.key).length})
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      <div className="divide-y divide-gray-50">
        {tabKpis.map((kpi: ExcellenceKpi) => {
          const count = counts[kpi.code] || 0;
          const target = kpi.target_team || kpi.target_university || 0;
          const progress = target > 0 ? (count / target) * 100 : 0;
          const dot = getDot(progress, count);
          const progressColor = getProgressColor(progress, count);

          return (
            <div
              key={kpi.code}
              className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition"
            >
              <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${dot}`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-gray-800 leading-tight truncate">
                  {kpi.name}
                </p>
                <p className="text-[10px] text-gray-400 truncate">
                  KPI {kpi.code} · เป้า {target} {kpi.unit} · {kpi.responsible}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[10px] text-gray-500">
                  {count}/{target} {kpi.unit}
                </p>
                <p className={`text-xs font-bold ${progressColor}`}>
                  {progress >= 100 ? "✓ " : ""}
                  {progress.toFixed(0)}%
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tip box */}
      <div className="border-t border-gray-100 bg-amber-50 px-3 py-2 text-[11px] text-amber-800 flex items-start gap-2">
        <span>💡</span>
        <p>
          โครงการ <strong>1 ตัวสนับสนุน KPI ได้หลายตัว</strong> · ระบบใช้
          auto-classify จากชื่อโครงการ — admin override ได้ที่ /admin/projects
        </p>
      </div>

      {/* Source */}
      <div className="border-t border-gray-100 px-3 py-1.5 text-[10px] text-gray-400 flex items-center justify-between">
        <span>ที่มา: PerformanceEvaluation-System (สถช.) · KPI Analysis 2569</span>
        <a
          href="/excellence"
          className="text-blue-600 hover:underline"
        >
          ดู mapping เต็ม →
        </a>
      </div>
    </div>
  );
}
