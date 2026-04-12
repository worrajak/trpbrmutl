// Prompt สำหรับ AI อ่าน Excel งบประมาณ → สกัดเป็น JSON

export const EXCEL_BUDGET_SYSTEM_PROMPT = `You are a data extraction assistant. Extract budget data from a pipe-delimited table and return ONLY a valid JSON array. No explanations, no markdown, no extra text — just the raw JSON array.`;

export const EXCEL_BUDGET_USER_PROMPT = `The table below uses | as delimiter. The first row is the header. Extract every data row into a JSON array with these exact fields:
- erp_code: string (the value from the "erp_code" column)
- budget_total: number (from "budget_total" column)
- budget_used: number (from "budget_used" column, use 0 if empty)
- budget_remaining: number (from "budget_remaining" column)

Return ONLY the JSON array, nothing else. Table:

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
