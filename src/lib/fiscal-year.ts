/**
 * Fiscal Year — จุดเดียวที่กำหนดว่า "ปีงบประมาณปัจจุบัน" คือปีไหน
 *
 * เดิมเลข 2569 กระจายอยู่หลายไฟล์ พอขึ้นปีใหม่ต้องไล่แก้ทีละจุดและพลาดง่าย
 * ไฟล์นี้รวมไว้ที่เดียว หน้าอื่นอ้าง CURRENT_FY หรือรับ fy เป็นพารามิเตอร์
 *
 * ปีงบประมาณไทย: 1 ต.ค. ของปี (FY-1) ถึง 30 ก.ย. ของปี FY
 *   FY 2569 = 1 ต.ค. 2568 ถึง 30 ก.ย. 2569
 */

/** ปีงบที่ระบบถือว่าเป็นปีปัจจุบัน — เปลี่ยนที่นี่ที่เดียวเมื่อขึ้นปีใหม่ */
export const CURRENT_FY = 2569;

/**
 * ปีงบที่ "มีข้อมูลโครงการในฐานข้อมูลแล้ว" เรียงใหม่ไปเก่า
 * ใช้ทำตัวเลือกปีและ static params ของ /executive-summary/[year]
 *
 * ⚠️ อย่าใส่ปีที่ยังไม่มีข้อมูล — หน้าจะเรนเดอร์เป็น 0 บาท 0 โครงการ
 *    ซึ่งอ่านแล้วเหมือนผลงานแย่ ทั้งที่แค่ยังไม่เริ่มบันทึก
 *    เพิ่ม 2570 เข้ามาเมื่อ sync โครงการปี 2570 ชุดแรกเข้า DB แล้ว
 */
export const AVAILABLE_FY = [2569] as const;

/** ปีงบที่ปิดแล้วและมีรายงานฉบับสมบูรณ์ */
export const CLOSED_FY = [2569] as const;

export interface FiscalYearInfo {
  fy: number;
  label: string;        // "ปีงบประมาณ 2569"
  startMs: number;
  endMs: number;
  startLabel: string;   // "1 ตุลาคม 2568"
  endLabel: string;     // "30 กันยายน 2569"
  closed: boolean;      // เลยวันสิ้นปีงบแล้วหรือยัง
  elapsedPct: number;   // ร้อยละของเวลาที่ผ่านไป (0-100)
  daysLeft: number;
}

/** ข้อมูลพื้นฐานของปีงบ — ใช้แทนการคำนวณวันที่กระจายตามไฟล์ */
export function fiscalYearInfo(fy: number = CURRENT_FY): FiscalYearInfo {
  const startYear = fy - 543 - 1; // FY2569 -> ค.ศ. 2025
  const endYear = fy - 543;       // FY2569 -> ค.ศ. 2026
  const start = new Date(startYear, 9, 1).getTime();            // 1 ต.ค.
  const end = new Date(endYear, 8, 30, 23, 59, 59).getTime();   // 30 ก.ย.

  const now = Date.now();
  const total = end - start;
  const elapsed = Math.max(0, Math.min(total, now - start));

  return {
    fy,
    label: `ปีงบประมาณ ${fy}`,
    startMs: start,
    endMs: end,
    startLabel: `1 ตุลาคม ${fy - 1}`,
    endLabel: `30 กันยายน ${fy}`,
    closed: now > end,
    elapsedPct: total > 0 ? Math.round((elapsed / total) * 100) : 0,
    daysLeft: Math.max(0, Math.ceil((end - now) / 86400000)),
  };
}

/** ปีงบที่เป็นตัวเลขถูกต้องและมีข้อมูลในระบบเท่านั้น (กัน path param มั่ว) */
export function parseFiscalYear(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isInteger(n)) return null;
  return (AVAILABLE_FY as readonly number[]).includes(n) ? n : null;
}
