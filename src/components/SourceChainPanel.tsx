/**
 * SourceChainPanel — แสดงสายของแหล่งข้อมูลใน brief
 *
 * แนวคิด: ทุก claim ใน problem_statement ต้องตอบ 3 คำถาม
 *   1. ใครเป็นคนรายงาน?
 *   2. ผ่านใครมา?
 *   3. ต้นทางคืออะไร? น่าเชื่อแค่ไหน?
 *
 * Verification status:
 *   - flagged  → แดง · ต้อง verify ก่อนใช้
 *   - pending  → เหลือง · รอ admin ตรวจ
 *   - verified → เขียว · ผ่านการตรวจสอบแล้ว
 */
import type { SourceChainItem } from "@/lib/ai-brief-generator-prompts";

interface Props {
  chain: SourceChainItem[] | null | undefined;
  verificationStatus?: "pending" | "verified" | "flagged" | null;
  minCredibility?: number | null;
  compact?: boolean;
}

const ROLE_LABEL: Record<SourceChainItem["reporter_role"], { emoji: string; label: string }> = {
  direct_observer: { emoji: "👁", label: "ผู้สังเกตตรง" },
  interviewer: { emoji: "🎤", label: "ผู้สัมภาษณ์" },
  document: { emoji: "📄", label: "เอกสาร" },
  secondary: { emoji: "🔁", label: "เล่าต่อ" },
  ai_estimate: { emoji: "🤖", label: "AI ประมาณการ" },
};

const EVIDENCE_LABEL: Record<SourceChainItem["evidence_type"], string> = {
  direct_observation: "เห็นด้วยตา",
  interview: "สัมภาษณ์",
  document: "เอกสาร",
  secondary: "รายงานต่อ",
  ai_inference: "AI อนุมาน",
};

const STATUS_META: Record<"pending" | "verified" | "flagged", { color: string; emoji: string; label: string }> = {
  flagged: { color: "bg-red-50 text-red-800 ring-red-300", emoji: "⚠", label: "ต้อง verify" },
  pending: { color: "bg-amber-50 text-amber-800 ring-amber-300", emoji: "⏳", label: "รอ admin ตรวจ" },
  verified: { color: "bg-emerald-50 text-emerald-800 ring-emerald-300", emoji: "✓", label: "ตรวจสอบแล้ว" },
};

function credibilityColor(c: number): string {
  if (c >= 5) return "bg-emerald-100 text-emerald-800 ring-emerald-300";
  if (c >= 4) return "bg-blue-100 text-blue-800 ring-blue-300";
  if (c >= 3) return "bg-amber-100 text-amber-800 ring-amber-300";
  if (c >= 2) return "bg-orange-100 text-orange-800 ring-orange-300";
  return "bg-red-100 text-red-800 ring-red-300";
}

function credibilityLabel(c: number): string {
  if (c >= 5) return "เห็น+พยาน 2+";
  if (c >= 4) return "สัมภาษณ์+เอกสาร";
  if (c >= 3) return "เอกสารทางการ";
  if (c >= 2) return "เล่าต่อ";
  return "ไม่ระบุที่มา";
}

export default function SourceChainPanel({
  chain,
  verificationStatus,
  minCredibility,
  compact = false,
}: Props) {
  const items = Array.isArray(chain) ? chain : [];
  const status = verificationStatus || (items.length === 0 ? "pending" : "pending");
  const stat = STATUS_META[status];

  if (items.length === 0) {
    return (
      <div className="rounded-lg bg-slate-50 ring-1 ring-slate-200 p-3 text-xs text-slate-600">
        <p className="font-bold mb-1">⛓ สายของแหล่งข้อมูล</p>
        <p className="text-slate-500">ยังไม่มีระบุแหล่งข้อมูลของ brief นี้ — กรุณาให้ admin/ผู้สร้าง verify</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white ring-1 ring-slate-200 p-3 sm:p-4 space-y-3">
      {/* Header — verification status + min credibility */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
          <span>⛓</span>
          <span>สายของแหล่งข้อมูล ({items.length} claims)</span>
        </p>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`rounded-full px-2 py-0.5 text-[0.65rem] font-bold ring-1 ${stat.color}`}>
            {stat.emoji} {stat.label}
          </span>
          {typeof minCredibility === "number" && (
            <span className={`rounded-full px-2 py-0.5 text-[0.65rem] font-bold ring-1 ${credibilityColor(minCredibility)}`}>
              ต่ำสุด: {minCredibility}/5
            </span>
          )}
        </div>
      </div>

      {/* Claims list */}
      <div className="space-y-2.5">
        {items.map((item, i) => {
          const role = ROLE_LABEL[item.reporter_role] || { emoji: "❔", label: item.reporter_role };
          const cred = item.credibility || 1;
          return (
            <div
              key={i}
              className={`rounded-lg p-2.5 ring-1 ${
                item.needs_verification
                  ? "bg-amber-50 ring-amber-300"
                  : cred <= 2
                  ? "bg-orange-50 ring-orange-200"
                  : "bg-slate-50 ring-slate-200"
              }`}
            >
              {/* Claim text */}
              <p className="text-xs text-slate-800 italic">"{item.claim}"</p>

              {!compact && (
                <div className="mt-2 grid sm:grid-cols-2 gap-x-3 gap-y-1 text-[0.7rem] text-slate-700">
                  {/* Reporter */}
                  <div>
                    <span className="text-slate-500">ผู้รายงาน:</span>{" "}
                    <span className="font-medium">
                      {role.emoji} {item.reporter}
                    </span>
                    <span className="text-slate-400"> ({role.label})</span>
                  </div>
                  {/* Origin */}
                  <div>
                    <span className="text-slate-500">ต้นทาง:</span>{" "}
                    <span className="font-medium">{item.origin || "—"}</span>
                  </div>
                  {/* Via chain */}
                  {Array.isArray(item.via) && item.via.length > 0 && (
                    <div className="sm:col-span-2">
                      <span className="text-slate-500">ผ่าน:</span>{" "}
                      {item.via.map((v, j) => (
                        <span key={j} className="rounded bg-white px-1.5 py-0.5 ring-1 ring-slate-200 text-slate-700 mr-1">
                          → {v}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Footer — evidence + credibility + flag */}
              <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[0.65rem] text-slate-500">
                  หลักฐาน: <strong>{EVIDENCE_LABEL[item.evidence_type] || item.evidence_type}</strong>
                </span>
                <div className="flex items-center gap-1.5">
                  <span className={`rounded-full px-1.5 py-0.5 text-[0.65rem] font-bold ring-1 ${credibilityColor(cred)}`}>
                    {cred}/5 · {credibilityLabel(cred)}
                  </span>
                  {item.needs_verification && (
                    <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[0.65rem] font-bold text-amber-800 ring-1 ring-amber-300">
                      ⚠ ต้อง verify
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer — methodology hint */}
      <p className="text-[0.65rem] text-slate-500 border-t border-slate-100 pt-2">
        💡 หลักการ: ทุกข้อความต้องตอบ <strong>ใครรายงาน · ผ่านใคร · ต้นทาง</strong> ได้ —
        ใช้ระบบเครดิตแหล่งข้อมูล (1-5) เพื่อช่วย admin ประเมินก่อนเผยแพร่
      </p>
    </div>
  );
}
