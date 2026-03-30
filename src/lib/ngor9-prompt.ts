// Prompt Template สำหรับ parse ง9 PDF — ใช้กับ AI ตัวไหนก็ได้

export const NGOR9_SYSTEM_PROMPT = `คุณคือผู้เชี่ยวชาญอ่านเอกสาร ง9 (แบบเสนอโครงการ/กิจกรรมย่อย) ของราชการไทย
งานของคุณคือสกัดข้อมูลจากเอกสาร ง9 ออกมาเป็น JSON ตามโครงสร้างที่กำหนด

สิ่งที่ต้องสกัด:
1. ข้อมูลทั่วไป: ชื่อโครงการ, ผู้รับผิดชอบ, หน่วยงาน, งบประมาณ, ระยะเวลา, สถานที่
2. กิจกรรม (จาก section 10.1 แผนปฏิบัติงาน): ชื่อกิจกรรม, งบ, เดือนที่ทำ, ผลผลิต
3. ตัวชี้วัด (จาก section 11): เชิงปริมาณ, เชิงคุณภาพ, เชิงเวลา, เชิงค่าใช้จ่าย

สำคัญ:
- planned_months ใช้เลขเดือนจริง: ต.ค.=10, พ.ย.=11, ธ.ค.=12, ม.ค.=1, ... ก.ย.=9
- งบประมาณเก็บเฉพาะตัวเลข (ไม่ต้องมีคำว่า "บาท")
- ถ้าอ่านไม่ชัดให้ใส่ "?" ไว้`;

export const NGOR9_USER_PROMPT = `จากเอกสาร ง9 นี้ ให้สกัดข้อมูลออกมาเป็น JSON ตามโครงสร้างนี้เท่านั้น:

{
  "project_name": "ชื่อโครงการเต็ม",
  "responsible": "ชื่อ-นามสกุล ผู้รับผิดชอบ/หัวหน้าโครงการ",
  "responsible_title": "ตำแหน่ง",
  "phone": "เบอร์โทรศัพท์ (ถ้ามี)",
  "organization": "หน่วยงานที่รับผิดชอบ",
  "budget_total": ตัวเลขงบรวม,
  "project_period": "วันเริ่ม - วันสิ้นสุด",
  "site": "สถานที่ดำเนินงาน",
  "main_program": "1.ผลักดันเทคโนโลยี" หรือ "2.ขับเคลื่อนกลไก" หรือ "3.พัฒนากำลังคน",
  "activities": [
    {
      "order": 1,
      "name": "ชื่อกิจกรรม",
      "budget": ตัวเลขงบ,
      "planned_months": [10, 11, 12],
      "output": "ผลผลิตที่คาดหวัง"
    }
  ],
  "kpi": {
    "quantitative": ["รายการตัวชี้วัดเชิงปริมาณ"],
    "qualitative": ["รายการตัวชี้วัดเชิงคุณภาพ"],
    "time_target": "ตัวชี้วัดเชิงเวลา",
    "budget_target": "ตัวชี้วัดเชิงค่าใช้จ่าย"
  }
}

ตอบเป็น JSON เท่านั้น ไม่ต้องมีข้อความอธิบายเพิ่ม`;

// สร้าง ID จากชื่อโครงการ
export function generateProjectId(name: string): string {
  const cleaned = name
    .replace(/โครงการ/g, "")
    .replace(/[^\u0E00-\u0E7Fa-zA-Z0-9\s]/g, "")
    .trim()
    .substring(0, 30);

  // Simple transliteration for common words
  const map: Record<string, string> = {
    "Plant profile": "plant-profile",
    "LoRa": "lora",
    "Hydro Pure": "hydro-pure",
    "Green Building": "green-building",
    "BSF": "bsf",
    "Cape Gooseberry": "cape-gooseberry",
    "Rose": "rose",
    "GI": "gi",
  };

  for (const [key, val] of Object.entries(map)) {
    if (name.includes(key)) return val + "-" + Date.now().toString(36).slice(-4);
  }

  // Fallback: use timestamp-based ID
  return "proj-" + Date.now().toString(36);
}

// Extract JSON from AI response (handles markdown code blocks)
export function extractJSON(text: string): Record<string, unknown> | null {
  // Try direct parse
  try {
    return JSON.parse(text);
  } catch {
    // Try extracting from markdown code block
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      try {
        return JSON.parse(match[1]);
      } catch {
        return null;
      }
    }
    // Try finding JSON object in text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}
