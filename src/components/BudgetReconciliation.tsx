"use client";

interface Props {
  budgetTotal: number;
  budgetUsedErp: number;      // เบิกจ่ายจาก ERP/กองคลัง (budget_used)
  budgetReported: number;     // รายงานสะสมจาก หน.โครงการ (budget_reported)
  compact?: boolean;          // แสดงแบบย่อ (สำหรับหน้ารวม)
}

function fmt(n: number): string {
  return Math.round(n).toLocaleString("th-TH");
}

export default function BudgetReconciliation({
  budgetTotal, budgetUsedErp, budgetReported, compact
}: Props) {
  const total    = Math.max(0, budgetTotal);
  const erp      = Math.max(0, budgetUsedErp);
  const reported = Math.max(0, budgetReported);

  // ค่าที่คำนวณ
  const effectiveUsed    = Math.max(erp, reported);                // ใช้จริง = max(erp, reported)
  const pendingClearance = Math.max(0, erp - reported);            // ERP เบิกแล้ว แต่ยังไม่มีรายงาน (ต้องรายงานเพิ่ม)
  const advancePayment   = Math.max(0, reported - erp);            // หน.ออกเอง รอ ERP เบิกคืน
  const remaining        = Math.max(0, total - effectiveUsed);     // คงเหลือจริง
  const usedPct          = total > 0 ? Math.round((effectiveUsed / total) * 100) : 0;
  const erpPct           = total > 0 ? Math.round((erp / total) * 100) : 0;
  const reportedPct      = total > 0 ? Math.round((reported / total) * 100) : 0;

  if (compact) {
    return (
      <div className="grid grid-cols-4 gap-2 text-xs">
        <div className="rounded bg-gray-50 p-2">
          <div className="text-gray-500">งบรวม</div>
          <div className="font-bold text-royal-700">{fmt(total)}</div>
        </div>
        <div className="rounded bg-blue-50 p-2">
          <div className="text-blue-600">ERP</div>
          <div className="font-bold text-blue-800">{fmt(erp)}</div>
        </div>
        <div className="rounded bg-amber-50 p-2">
          <div className="text-amber-600">รายงาน</div>
          <div className="font-bold text-amber-800">{fmt(reported)}</div>
        </div>
        <div className="rounded bg-green-50 p-2">
          <div className="text-green-600">คงเหลือ</div>
          <div className="font-bold text-green-800">{fmt(remaining)}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 4 ยอดหลัก */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-3">
          <p className="text-xs text-gray-500">งบประมาณรวม</p>
          <p className="text-xl font-bold text-royal-700">{fmt(total)}</p>
          <p className="text-[10px] text-gray-400">บาท</p>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
          <p className="text-xs text-blue-600">เบิกจ่ายจริง (ERP/กองคลัง)</p>
          <p className="text-xl font-bold text-blue-800">{fmt(erp)}</p>
          <p className="text-[10px] text-blue-500">บาท · {erpPct}% ของงบ</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs text-amber-600">รายงานสะสม (หน.โครงการ)</p>
          <p className="text-xl font-bold text-amber-800">{fmt(reported)}</p>
          <p className="text-[10px] text-amber-500">บาท · {reportedPct}% ของงบ</p>
        </div>
        <div className="rounded-lg border border-green-200 bg-green-50 p-3">
          <p className="text-xs text-green-600">คงเหลือใช้จริง</p>
          <p className="text-xl font-bold text-green-800">{fmt(remaining)}</p>
          <p className="text-[10px] text-green-500">บาท · {100 - usedPct}% ของงบ</p>
        </div>
      </div>

      {/* Progress bar แบบซ้อน: ERP + advance (ส่วนเกิน) */}
      <div>
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span>ความคืบหน้าการใช้งบ</span>
          <span className={usedPct > 100 ? "text-red-600 font-bold" : "font-medium"}>
            ใช้จริง {fmt(effectiveUsed)} / {fmt(total)} ({usedPct}%)
          </span>
        </div>
        <div className="relative h-3 rounded-full bg-gray-100 overflow-hidden">
          {/* ERP bar (น้ำเงิน) */}
          <div
            className="absolute left-0 top-0 h-3 bg-blue-500 transition-all"
            style={{ width: `${Math.min(erpPct, 100)}%` }}
            title={`ERP: ${fmt(erp)}`}
          />
          {/* Advance bar (ส้ม) ต่อจาก ERP */}
          {advancePayment > 0 && (
            <div
              className="absolute top-0 h-3 bg-amber-400 transition-all"
              style={{
                left: `${Math.min(erpPct, 100)}%`,
                width: `${Math.min(total > 0 ? (advancePayment / total) * 100 : 0, 100 - Math.min(erpPct, 100))}%`,
              }}
              title={`หน.ออกเอง: ${fmt(advancePayment)}`}
            />
          )}
        </div>
        <div className="flex gap-3 mt-1 text-[10px] text-gray-500">
          <span className="flex items-center gap-1"><span className="h-2 w-3 rounded bg-blue-500 inline-block" />ERP</span>
          {advancePayment > 0 && (
            <span className="flex items-center gap-1"><span className="h-2 w-3 rounded bg-amber-400 inline-block" />หน.ออกเอง</span>
          )}
          <span className="flex items-center gap-1"><span className="h-2 w-3 rounded bg-gray-100 border border-gray-200 inline-block" />คงเหลือ</span>
        </div>
      </div>

      {/* แจ้งเตือน (Alert) */}
      {pendingClearance > 0 && (
        <div className="rounded-lg border-l-4 border-red-400 bg-red-50 p-3">
          <div className="flex items-start gap-2">
            <span className="text-xl">⚠️</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-800">
                ต้องรายงานเพิ่ม {fmt(pendingClearance)} บาท
              </p>
              <p className="text-xs text-red-700 mt-0.5">
                ERP/กองคลัง บันทึกการเบิกจ่ายแล้ว <b>{fmt(erp)}</b> บาท แต่ หน.โครงการ รายงานครอบคลุมเพียง <b>{fmt(reported)}</b> บาท
                — กรุณารายงานกิจกรรมเพิ่มเติมและแนบเอกสารเคลียร์บิลสำหรับส่วนต่าง <b>{fmt(pendingClearance)}</b> บาท
              </p>
            </div>
          </div>
        </div>
      )}

      {advancePayment > 0 && (
        <div className="rounded-lg border-l-4 border-amber-400 bg-amber-50 p-3">
          <div className="flex items-start gap-2">
            <span className="text-xl">💸</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">
                หน.โครงการออกเงินเองก่อน {fmt(advancePayment)} บาท
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                รายงานสะสม <b>{fmt(reported)}</b> บาท แต่ ERP เบิกให้เพียง <b>{fmt(erp)}</b> บาท
                — อยู่ระหว่างส่งเอกสารเบิกจ่ายเพิ่มเติมจากกองคลัง <b>{fmt(advancePayment)}</b> บาท
              </p>
            </div>
          </div>
        </div>
      )}

      {pendingClearance === 0 && advancePayment === 0 && effectiveUsed > 0 && (
        <div className="rounded-lg border-l-4 border-green-400 bg-green-50 p-3">
          <div className="flex items-start gap-2">
            <span className="text-xl">✅</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-green-800">
                ERP และรายงาน ตรงกัน — ไม่มีส่วนต่าง
              </p>
              <p className="text-xs text-green-700 mt-0.5">
                เบิกจ่ายจริง {fmt(erp)} บาท = รายงานสะสม {fmt(reported)} บาท
              </p>
            </div>
          </div>
        </div>
      )}

      {effectiveUsed === 0 && total > 0 && (
        <div className="rounded-lg border-l-4 border-gray-300 bg-gray-50 p-3">
          <div className="flex items-start gap-2">
            <span className="text-xl">📊</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700">ยังไม่มีการเบิกจ่ายหรือรายงาน</p>
              <p className="text-xs text-gray-600">งบประมาณ {fmt(total)} บาท พร้อมใช้งานเต็มจำนวน</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
