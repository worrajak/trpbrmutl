// Prompt สำหรับ AI อ่าน Excel งบประมาณ → สกัดเป็น JSON

export const EXCEL_BUDGET_SYSTEM_PROMPT = `คุณคือผู้เชี่ยวชาญอ่านตารางงบประมาณโครงการวิจัยของมหาวิทยาลัยเทคโนโลยีราชมงคลล้านนา
งานของคุณคือสกัดข้อมูลการใช้งบประมาณจากตารางที่ให้มา แล้วคืนเป็น JSON array

ข้อมูลที่ต้องหา:
1. รหัสโครงการ (ERP code) — ตัวเลข 18-20 หลัก เช่น 16911115000083010001
2. งบประมาณที่ได้รับจัดสรร (budget_total) — งบตั้งต้นหรือจัดสรร
3. งบประมาณที่ใช้จ่ายแล้ว (budget_used) — "เบิกจ่ายสะสม" หรือ "การเบิกจ่ายงบประมาณ"
4. งบประมาณคงเหลือ (budget_remaining) — "คงเหลือ"

กฎสำคัญ:
- นำเฉพาะ rows ที่เป็นโครงการย่อย (มี ERP code เท่านั้น) ไม่ต้องรวม header หรือ summary row
- ถ้า budget_used เป็นค่าว่างหรือ - ให้ใส่ 0
- ถ้า budget_remaining เป็นค่าว่าง ให้คำนวณจาก budget_total - budget_used
- ค่าตัวเลขใช้เฉพาะตัวเลข ไม่มีเครื่องหมายจุลภาคหรือหน่วย
- ตอบเป็น JSON array เท่านั้น ไม่มีข้อความอื่น`;

export const EXCEL_BUDGET_USER_PROMPT = `จากตารางงบประมาณด้านล่าง สกัดข้อมูลออกมาเป็น JSON array ตามโครงสร้างนี้:

[
  {
    "erp_code": "รหัสโครงการ 18-20 หลัก",
    "budget_total": ตัวเลขงบจัดสรร,
    "budget_used": ตัวเลขเบิกจ่ายสะสม,
    "budget_remaining": ตัวเลขคงเหลือ
  }
]

ข้อมูลตาราง:
`;

// Extract JSON array from AI response
export function extractJSONArray(text: string): Record<string, unknown>[] | null {
  // Try direct parse as array
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
  } catch { /* continue */ }

  // Extract from markdown code block
  const codeMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeMatch) {
    try {
      const parsed = JSON.parse(codeMatch[1]);
      if (Array.isArray(parsed)) return parsed;
    } catch { /* continue */ }
  }

  // Find JSON array in text
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      const parsed = JSON.parse(arrayMatch[0]);
      if (Array.isArray(parsed)) return parsed;
    } catch { /* continue */ }
  }

  return null;
}

// แปลง Excel rows เป็น text table สำหรับส่งให้ AI
export function excelRowsToText(rows: unknown[][]): string {
  const lines: string[] = [];
  for (const row of rows) {
    const cells = row.map((cell) => {
      if (cell === null || cell === undefined) return "-";
      if (cell instanceof Date) return cell.toLocaleDateString("th-TH");
      return String(cell).trim();
    });
    // ข้ามแถวที่ว่างทั้งหมด
    if (cells.every((c) => c === "-" || c === "")) continue;
    lines.push(cells.join(" | "));
  }
  return lines.join("\n");
}
