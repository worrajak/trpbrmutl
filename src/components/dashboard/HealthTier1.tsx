/**
 * HealthTier1 — 3 หัวข้อใหญ่ที่ตอบ 5-sec test
 *
 *   [งบ X% / เวลา Y%]   [KPI A/B ตอบแล้ว]   [N/M เสี่ยง]
 *    🔴 ช้า Z pp         🟡 ขาด K            🔴 ต้องเร่ง
 *
 * ทุกตัวมี: ตัวเลขหลัก + ของเปรียบเทียบ + สถานะสี (สีเป็นสัญญาณ ไม่ใช่ตกแต่ง)
 */
import Link from "next/link";
import type { BudgetUrgency, KpiGap, RiskyProjectsSummary } from "@/lib/dashboard-decisions";

interface Props {
  budget: BudgetUrgency;
  kpiGap: KpiGap;
  risky: RiskyProjectsSummary;
}

const STATUS_BG: Record<string, string> = {
  ahead: "bg-emerald-50 ring-emerald-200",
  on_track: "bg-emerald-50 ring-emerald-200",
  good: "bg-emerald-50 ring-emerald-200",
  warning: "bg-amber-50 ring-amber-300",
  behind: "bg-amber-50 ring-amber-300",
  critical: "bg-red-50 ring-red-300",
};

const STATUS_TEXT: Record<string, string> = {
  ahead: "text-emerald-800",
  on_track: "text-emerald-800",
  good: "text-emerald-800",
  warning: "text-amber-900",
  behind: "text-amber-900",
  critical: "text-red-900",
};

function fmtBaht(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString("th-TH");
}

interface CardProps {
  href: string;
  icon: string;
  title: string;
  bigText: string;
  compareText: string;
  statusLabel: string;
  status: string;
}

function HealthCard({ href, icon, title, bigText, compareText, statusLabel, status }: CardProps) {
  const bg = STATUS_BG[status] || "bg-white ring-slate-200";
  const text = STATUS_TEXT[status] || "text-slate-800";

  return (
    <Link
      href={href}
      className={`rounded-xl ring-1 px-4 py-3.5 transition hover:shadow-md hover:scale-[1.01] ${bg}`}
    >
      <p className="text-xs uppercase tracking-wider text-slate-600 font-medium flex items-center gap-1.5">
        <span className="text-sm">{icon}</span>
        <span>{title}</span>
      </p>
      <p className={`mt-1 text-3xl font-bold leading-tight ${text}`}>{bigText}</p>
      <div className="mt-2 flex items-baseline justify-between gap-2">
        <p className="text-xs text-slate-600 leading-tight">{compareText}</p>
      </div>
      <p className={`mt-1.5 text-xs font-bold ${text}`}>{statusLabel}</p>
    </Link>
  );
}

export default function HealthTier1({ budget, kpiGap, risky }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {/* Q1: งบเร่งใช้แค่ไหน */}
      <HealthCard
        href="/projects"
        icon="💰"
        title="งบเบิก vs เวลา"
        bigText={`${budget.usedPct}%`}
        compareText={`เวลา FY ${budget.elapsedPct}% · เบิกแล้ว ${fmtBaht(budget.usedAmount)} / ${fmtBaht(budget.totalBudget)} บ.`}
        statusLabel={budget.label}
        status={budget.status}
      />

      {/* Q2: KPI gap */}
      <HealthCard
        href="/excellence"
        icon="🎯"
        title="KPI ตอบแล้ว"
        bigText={`${kpiGap.coveredKpis}/${kpiGap.totalKpis}`}
        compareText={
          kpiGap.gapCount > 0
            ? `ขาด ${kpiGap.gapCount} ตัว — เช่น ${kpiGap.uncoveredTop3.map((k) => `KPI ${k.code}`).join(", ")}`
            : `ครบทุกตัว 🎉`
        }
        statusLabel={kpiGap.label}
        status={kpiGap.status}
      />

      {/* Q3: โครงการเสี่ยง */}
      <HealthCard
        href="/projects"
        icon="⚠"
        title="โครงการเสี่ยง"
        bigText={`${risky.riskyCount}/${risky.totalProjects}`}
        compareText={
          risky.riskyCount > 0
            ? `เบิกช้า/ไม่รายงานเกินกำหนด · ดูเต็มด้านล่าง`
            : `โครงการทั้งหมดเดินตามแผน`
        }
        statusLabel={risky.label}
        status={risky.status}
      />
    </div>
  );
}
