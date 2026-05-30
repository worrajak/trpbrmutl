/**
 * InsightHeader — 1 ประโยค sticky ที่ตอบ "วันนี้ดีไหม? ต้องเร่งอะไร?"
 *
 * แต่ละ part คลิกได้ → ไปหน้า detail
 * สีบ่งบอกความรุนแรง: warning=amber · critical=red · good=emerald
 */
import Link from "next/link";
import type { InsightSentence } from "@/lib/dashboard-decisions";

const COLOR: Record<"good" | "warning" | "critical", { bg: string; text: string; dot: string }> = {
  good: { bg: "bg-emerald-50 ring-emerald-200", text: "text-emerald-800", dot: "bg-emerald-500" },
  warning: { bg: "bg-amber-50 ring-amber-300", text: "text-amber-900", dot: "bg-amber-500" },
  critical: { bg: "bg-red-50 ring-red-300", text: "text-red-900", dot: "bg-red-500" },
};

function maxSeverity(parts: InsightSentence["parts"]): "good" | "warning" | "critical" {
  if (parts.some((p) => p.severity === "critical")) return "critical";
  if (parts.some((p) => p.severity === "warning")) return "warning";
  return "good";
}

export default function InsightHeader({ insight }: { insight: InsightSentence }) {
  if (!insight.hasIssues) {
    return (
      <div className={`rounded-xl ring-1 px-4 py-3 ${COLOR.good.bg}`}>
        <p className={`text-sm font-bold ${COLOR.good.text}`}>{insight.fallback}</p>
      </div>
    );
  }

  const sev = maxSeverity(insight.parts);
  const c = COLOR[sev];

  return (
    <div className={`rounded-xl ring-1 px-4 py-3 ${c.bg}`}>
      <div className="flex items-start gap-3">
        <span className={`mt-1.5 inline-flex h-2.5 w-2.5 flex-shrink-0 rounded-full ${c.dot} animate-pulse`} />
        <p className={`text-sm sm:text-base font-bold leading-snug ${c.text}`}>
          <span className="opacity-70 mr-1">🎯 วันนี้:</span>
          {insight.parts.map((p, i) => (
            <span key={i}>
              {p.href ? (
                <Link href={p.href} className="underline decoration-2 underline-offset-2 hover:opacity-80">
                  {p.text}
                </Link>
              ) : (
                <span>{p.text}</span>
              )}
              {i < insight.parts.length - 1 && <span className="opacity-50 mx-1.5">·</span>}
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}
