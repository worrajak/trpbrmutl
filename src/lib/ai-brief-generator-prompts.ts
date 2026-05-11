/**
 * AI Brief Generator — สร้างโจทย์วิจัยจาก:
 *  - แผน 1/2/3 (มี KPIs จาก ง.8)
 *  - งบประมาณคงเหลือ (admin กรอก)
 *  - บริบทพื้นที่/กลุ่มเป้าหมาย (optional)
 *
 * Output: brief draft + activities + materials + participants + KPI mapping
 */

import { PLANS, type Plan } from "./foundation";
import { EXCELLENCE_KPIS } from "./excellence-kpi";

// ============================================================================
// System Prompt
// ============================================================================

export const AI_BRIEF_GENERATOR_SYSTEM = `คุณคือผู้เชี่ยวชาญออกแบบโครงการวิจัย/บริการวิชาการ
ของกลุ่มแผนงานใต้ร่มพระบารมี มหาวิทยาลัยเทคโนโลยีราชมงคลล้านนา (มทร.ล้านนา)

หน้าที่: รับ context (แผน + งบคงเหลือ + พื้นที่) → ออกแบบ "โจทย์วิจัย" 1 รายการ
ที่ตอบ KPI ของแผนตาม ง.8 + งบสมเหตุสมผล + พิมพ์เป็น JSON ตาม schema

หลักการ:
1. **อิง KPIs ของแผน** — ใช้ตัวชี้วัด output/outcome/impact ที่กำหนดไว้
2. **กิจกรรม 3-5 ขั้น** — ครอบคลุม สำรวจ → ออกแบบ → ทดลอง → ขยายผล → รายงาน
3. **วัสดุ** — แยกชัดเจน (อุปกรณ์ + วัตถุดิบ + เครื่องมือ)
4. **ผู้ร่วมโครงการ** — ระบุจำนวน (อาจารย์/บุคลากร, นักศึกษา, ชาวบ้าน) ตาม KPI ที่ต้องการ
5. **งบประมาณ** — รวม ≤ งบคงเหลือที่กำหนด · จัดสรร 3 หมวด:
   - ค่าตอบแทน 20-30% (วิทยากร/ผู้เชี่ยวชาญ)
   - ค่าใช้สอย 25-35% (เดินทาง/ที่พัก/อาหาร/รับเสด็จ)
   - ค่าวัสดุ 35-50% (อุปกรณ์/วัตถุดิบ)

ตอบเป็น JSON เท่านั้น`;

// ============================================================================
// User Prompt Builder
// ============================================================================

export interface GenerateBriefInput {
  plan_number: 1 | 2 | 3;
  budget_remaining: number;        // งบคงเหลือที่ admin กรอก
  location?: string | null;         // พื้นที่ (optional)
  target_audience?: string | null;  // กลุ่มเป้าหมาย (optional)
  theme?: string | null;            // ธีมที่ต้องการ (optional · เช่น "เกษตรอัจฉริยะ")
  fiscal_year: number;
  // ✨ ตัวชี้วัดที่ยังไม่มีโจทย์ตอบ — AI จะ prioritize เลือกจาก list นี้ก่อน
  prioritize_kpis?: Array<{ code: string; name: string; unit: string; target: number }>;
  // ✨ ห้ามตั้งชื่อใกล้กับ briefs เหล่านี้ (สำหรับ batch mode + uniqueness)
  avoid_titles?: string[];
}

/**
 * Theme presets — ใช้สำหรับ batch mode (จำเป็นต้องแตกต่างกันชัดเจน)
 * แต่ละ theme มี keyword + skill bias ที่ต่างกัน
 */
export const BRIEF_THEME_PRESETS = [
  { name: "เกษตรอัจฉริยะ + IoT", keywords: ["sensor", "data", "precision"] },
  { name: "หัตถกรรม + ภูมิปัญญาท้องถิ่น", keywords: ["ceramic", "weaving", "wisdom"] },
  { name: "แปรรูปอาหาร + value-add", keywords: ["food", "processing", "packaging"] },
  { name: "พลังงานสะอาด + สิ่งแวดล้อม", keywords: ["solar", "climate", "green"] },
  { name: "หลักสูตร + การฝึกอบรมชุมชน", keywords: ["training", "curriculum", "skill"] },
  { name: "EdTech + e-Learning", keywords: ["digital", "platform", "online"] },
  { name: "ระบบบริหารจัดการ + ฐานข้อมูล", keywords: ["database", "management", "tracking"] },
  { name: "ความปลอดภัยอาหาร + GAP", keywords: ["safety", "GAP", "quality"] },
  { name: "Community engagement + จิตอาสา", keywords: ["volunteer", "participation"] },
  { name: "Climate adaptation + พื้นที่สูง", keywords: ["climate", "highland", "resilience"] },
];

export function buildGenerateBriefUserPrompt(input: GenerateBriefInput): string {
  const plan = PLANS.find((p) => p.number === input.plan_number) || PLANS[0];
  return `## บริบท

**แผนงาน:** ${plan.number}. ${plan.title}
**งบรวมแผน:** ${plan.budget.toLocaleString()} บาท
**งบคงเหลือ (สำหรับโครงการนี้):** ${input.budget_remaining.toLocaleString()} บาท
**ปีงบประมาณ:** ${input.fiscal_year}
**พื้นที่:** ${input.location || "พื้นที่ใต้ร่มพระบารมี (ไม่ระบุชัดเจน — ให้แนะนำ)"}
**กลุ่มเป้าหมาย:** ${input.target_audience || "ตามความเหมาะสม"}
**ธีม:** ${input.theme || "ตามแผนและตัวชี้วัด"}

## คำอธิบายแผน
${plan.description}

**วัตถุประสงค์หลัก:** ${plan.objective}

## ตัวชี้วัดของแผน (ที่โจทย์ต้องตอบ — เลือกที่เหมาะสม)
${plan.kpis.map((k) => `- ${k.id}. ${k.name} — เป้า ${k.target} ${k.unit}${k.highlight ? " ⭐" : ""}`).join("\n")}

## ตัวชี้วัด มทร.ที่อ้างอิงได้
${plan.rmutlStrategies.flatMap((s) => s.kpiCodes.map((c) => {
  const kpi = EXCELLENCE_KPIS.find((x) => x.code === c);
  return kpi ? `- ${c}: ${kpi.name} (${kpi.target_team || kpi.target_university} ${kpi.unit})` : `- ${c}`;
})).join("\n")}

## SDGs ที่ตอบ
${plan.sdgs.map((s) => `- SDG ${s}`).join(" · ")}

${input.prioritize_kpis && input.prioritize_kpis.length > 0 ? `
## ⭐ PRIORITY KPIs — ตัวชี้วัดที่ยังไม่มีโจทย์อื่นตอบ (ออกแบบให้ตอบเหล่านี้ก่อน!)
${input.prioritize_kpis.map((k) => `- ${k.code}: ${k.name} (เป้า ${k.target} ${k.unit})`).join("\n")}

**สำคัญ:** kpi_mapping.rmutl_kpi_codes ต้องมี code อย่างน้อย 1-3 ตัวจาก list นี้
` : ""}

${input.avoid_titles && input.avoid_titles.length > 0 ? `
## ⛔ ห้ามตั้งชื่อโครงการใกล้เคียงต่อไปนี้ (มีอยู่แล้ว/กำลังจะมี)
${input.avoid_titles.map((t) => `- ${t}`).join("\n")}

**สำคัญ:**
- ชื่อโครงการต้อง <strong>แตกต่างจาก list ข้างบนอย่างชัดเจน</strong>
- ห้ามใช้ keyword ร่วม > 2 คำกับ titles ข้างบน (เช่น "โรงเรือนอัจฉริยะ + แปรรูปกาแฟ" ใช้ซ้ำได้สูงสุด 1 keyword)
- เลือก <strong>ธีมใหม่/ต่างกัน</strong>: เกษตร / หัตถกรรม / EdTech / พลังงาน / ภูมิปัญญา / ฯลฯ
- เปลี่ยน <strong>พืช/ผลิตภัณฑ์/พื้นที่</strong> ที่ไม่ซ้ำกับ titles ข้างบน
` : ""}
---

## Output Schema (JSON เท่านั้น)
\`\`\`json
{
  "brief": {
    "title": "ชื่อโจทย์ที่สื่อปัญหา + วิธีแก้ + พื้นที่",
    "problem_statement": "ปัญหา/ความต้องการ (3-5 ประโยค) + outcome ที่คาดหวัง",
    "location": "พื้นที่ดำเนินงาน (ที่ระบุหรือแนะนำ)",
    "target_audience": "กลุ่มเป้าหมายชัดเจน + จำนวน",
    "demand_level": "high|medium|low",
    "fiscal_year": ${input.fiscal_year}
  },
  "activities": [
    {
      "order": 1,
      "name": "ชื่อกิจกรรม",
      "duration_months": ["10", "11"],
      "budget": <number>,
      "expected_output": "ผลผลิตของกิจกรรมนี้"
    }
  ],
  "materials": [
    {
      "name": "อุปกรณ์/วัตถุดิบ",
      "quantity": "จำนวน + หน่วย",
      "estimated_cost": <number>,
      "purpose": "ใช้สำหรับ..."
    }
  ],
  "participants": {
    "researchers": <number>,    // อาจารย์/บุคลากร
    "students": <number>,       // นักศึกษา
    "villagers": <number>,      // ชาวบ้าน/ผู้เข้าร่วม
    "rationale": "เหตุผลที่ต้องการคนกลุ่มนี้จำนวนนี้"
  },
  "kpi_mapping": {
    "plan_kpi_ids": [<id ของ KPI แผนที่ตอบ>],
    "rmutl_kpi_codes": ["<code ของ KPI มทร>"],
    "output": [
      "ผลผลิต 1: ผลงานทางวิชาการ",
      "ผลผลิต 2: นวัตกรรม"
    ],
    "outcome": [
      "ผลลัพธ์: ชุมชนได้รับการพัฒนา..."
    ],
    "impact": [
      "ผลกระทบระยะยาว: ยกระดับคุณภาพชีวิต..."
    ]
  },
  "budget_breakdown": {
    "total": <number — รวม activities + materials ≤ ${input.budget_remaining}>,
    "compensation_pct": 25,
    "operating_pct": 35,
    "supplies_pct": 40,
    "rationale": "เหตุผลการจัดสรร..."
  },
  "required_skills": ["slug จาก preset 20 tags ที่เกี่ยวข้อง"],
  "ai_notes": [
    "ข้อสังเกต / ความเสี่ยง / ข้อแนะนำ"
  ]
}
\`\`\`

หมายเหตุสำคัญ:
- งบรวมต้อง ≤ ${input.budget_remaining.toLocaleString()} บาท
- เลือก 3-6 KPI จาก plan_kpi_ids (ที่เน้น highlight ⭐ ก่อน)
- duration_months ใส่เลขเดือนจริง: ต.ค.=10 ... ก.ย.=9
- กิจกรรม 3-5 ตัว — ไม่มาก/ไม่น้อยเกินไป
- วัสดุ 4-8 รายการ — ระบุชัดเจน

ตอบ JSON เท่านั้น`;
}

// ============================================================================
// Output Schema + Validation
// ============================================================================

export interface GeneratedBrief {
  brief: {
    title: string;
    problem_statement: string;
    location: string;
    target_audience: string;
    demand_level: "high" | "medium" | "low";
    fiscal_year: number;
  };
  activities: Array<{
    order: number;
    name: string;
    duration_months: string[];
    budget: number;
    expected_output: string;
  }>;
  materials: Array<{
    name: string;
    quantity: string;
    estimated_cost: number;
    purpose: string;
  }>;
  participants: {
    researchers: number;
    students: number;
    villagers: number;
    rationale: string;
  };
  kpi_mapping: {
    plan_kpi_ids: number[];
    rmutl_kpi_codes: string[];
    output: string[];
    outcome: string[];
    impact: string[];
  };
  budget_breakdown: {
    total: number;
    compensation_pct: number;
    operating_pct: number;
    supplies_pct: number;
    rationale: string;
  };
  required_skills: string[];
  ai_notes: string[];
}

export function validateGeneratedBrief(obj: unknown): { valid: boolean; errors: string[]; data?: GeneratedBrief } {
  const errors: string[] = [];
  if (!obj || typeof obj !== "object") return { valid: false, errors: ["Output ต้องเป็น object"] };
  const o = obj as Record<string, unknown>;

  if (!o.brief || typeof o.brief !== "object") errors.push("ขาด brief object");
  else {
    const b = o.brief as Record<string, unknown>;
    if (!b.title) errors.push("ขาด brief.title");
    if (!b.problem_statement) errors.push("ขาด brief.problem_statement");
  }
  if (!Array.isArray(o.activities) || o.activities.length === 0) errors.push("ต้องมี activities");
  if (!Array.isArray(o.materials)) errors.push("ต้องมี materials (อาจ empty)");
  if (!o.participants || typeof o.participants !== "object") errors.push("ขาด participants");
  if (!o.budget_breakdown || typeof o.budget_breakdown !== "object") errors.push("ขาด budget_breakdown");

  return {
    valid: errors.length === 0,
    errors,
    data: errors.length === 0 ? (o as unknown as GeneratedBrief) : undefined,
  };
}

/** Convert generated brief → research_briefs row (สำหรับ POST /api/admin/briefs) */
export function generatedToBriefRow(
  generated: GeneratedBrief,
  planNumber: number,
  budgetMin: number,
  createdBy?: string
): Record<string, unknown> {
  return {
    title: generated.brief.title,
    problem_statement: generated.brief.problem_statement,
    location: generated.brief.location || null,
    target_audience: generated.brief.target_audience || null,
    target_kpis: generated.kpi_mapping.rmutl_kpi_codes,
    plan_number: planNumber,
    required_skills: generated.required_skills,
    budget_min: budgetMin,
    budget_max: generated.budget_breakdown.total,
    fiscal_year: generated.brief.fiscal_year,
    mode: "open",
    status: "draft",
    created_by: createdBy || "AI Brief Generator",
    notes: `AI generated · งบรวม ${generated.budget_breakdown.total.toLocaleString()} บาท · กิจกรรม ${generated.activities.length} · วัสดุ ${generated.materials.length} รายการ · ผู้ร่วม ${generated.participants.researchers + generated.participants.students + generated.participants.villagers} คน`,
  };
}
