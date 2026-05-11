/**
 * ai-brief-prompts.ts — Prompt templates สำหรับ AI matching + ง9 generation
 *
 * ใช้กับ OpenRouter (แบ่งปัน key กับ /admin) — รองรับ Claude/Gemini/GPT
 */

import { EXCELLENCE_KPIS } from "./excellence-kpi";
import type { ExcellenceKpi } from "./excellence-kpi";

// ============================================================================
// 1. AI Rerank — input: top 10 candidates → AI rerank ตาม fitness สำหรับ brief
// ============================================================================

export const AI_RERANK_SYSTEM = `คุณคือผู้เชี่ยวชาญด้านการ matching นักวิจัยกับโจทย์วิจัยในบริบทงานพัฒนาชุมชนพื้นที่สูง
ของกลุ่มแผนงานใต้ร่มพระบารมี มหาวิทยาลัยเทคโนโลยีราชมงคลล้านนา (มทร.ล้านนา)

งานของคุณ: re-rank candidates ตาม fitness (0-100) โดยพิจารณา:
1. Skill match (เชี่ยวชาญตรง)
2. Area familiarity (เคยทำงานพื้นที่ใกล้เคียง)
3. Workload (current_load — ภาระงานปัจจุบัน)
4. Brief mode:
   - open: ทุก level OK · senior > mid > junior
   - assigned: ต้อง senior + low load
   - mentorship: ต้อง mix (senior 1 + junior/mid 1)

ตอบเป็น JSON เท่านั้น`;

export function buildRerankUserPrompt(
  brief: {
    title: string;
    problem_statement: string;
    location: string | null;
    required_skills: string[];
    target_kpis: string[];
    mode: string;
    budget_min: number | null;
    budget_max: number | null;
  },
  candidates: Array<{
    id: string;
    name: string;
    title: string | null;
    level: string;
    expertise_tags: string[];
    areas: string[];
    current_load: number;
    bio?: string | null;
  }>
): string {
  const kpiContext = brief.target_kpis
    .map((c) => {
      const k = EXCELLENCE_KPIS.find((x) => x.code === c);
      return k ? `- ${c}: ${k.name} (เป้า ${k.target_team || k.target_university} ${k.unit})` : `- ${c}`;
    })
    .join("\n");

  return `## โจทย์วิจัย
**Title:** ${brief.title}
**Problem:** ${brief.problem_statement}
**Location:** ${brief.location || "—"}
**Mode:** ${brief.mode}
**Required skills:** ${brief.required_skills.join(", ") || "ไม่ระบุ"}
**Target KPIs:**
${kpiContext}
**Budget:** ${brief.budget_min || "—"}–${brief.budget_max || "—"} บาท

## Candidates (${candidates.length})
${candidates
  .map(
    (c, i) => `${i + 1}. **${c.name}** (${c.title || "—"}) [${c.level}] · load=${c.current_load}
   - Skills: ${c.expertise_tags.join(", ")}
   - Areas: ${c.areas.join(", ") || "—"}
   - Bio: ${c.bio || "—"}`
  )
  .join("\n\n")}

## Output schema (JSON only)
{
  "rerank": [
    {
      "researcher_id": "<id>",
      "ai_score": 85,
      "fitness_label": "เหมาะสมมาก",
      "reasons": [
        "เชี่ยวชาญตรง 3 ด้าน",
        "เคยทำงานพื้นที่นี้",
        "ภาระงานน้อย"
      ],
      "concerns": [
        "ยังไม่เคยทำ <topic> แบบนี้"
      ]
    }
  ],
  "recommended_pair": {
    "mentor_id": "<id หรือ null>",
    "mentee_id": "<id หรือ null>",
    "rationale": "..."
  }
}

ตอบ JSON ตามนี้เท่านั้น เรียง rerank จาก ai_score สูง→ต่ำ`;
}

// ============================================================================
// 2. Generate ง9 — input: brief + chosen researcher → AI draft ง9 JSON
// ============================================================================

export const AI_NGOR9_SYSTEM = `คุณคือผู้เชี่ยวชาญเขียนข้อเสนอโครงการ (ง9) ของระบบราชการไทย
ตามแบบฟอร์มของ มทร.ล้านนา + กลุ่มแผนงานใต้ร่มพระบารมี

หน้าที่: รับ brief + นักวิจัยที่ได้รับมอบหมาย → ร่าง ง9 ออกมาเป็น JSON ตาม schema
ที่ระบบใช้นำเข้าผ่าน /admin/upload-ngor9

หลักการ:
- กิจกรรม (activities): แบ่งเป็น 4-7 step ครอบคลุมตั้งแต่ "ออกแบบ → ทดลอง → ขยายผล → รายงาน"
- planned_months ใส่เลขเดือนจริง (ต.ค.=10 ... ก.ย.=9)
- งบประมาณ:
  · ค่าตอบแทน (วิทยากร/ผู้เชี่ยวชาญ) ~ 20-30%
  · ค่าใช้สอย (เดินทาง/ที่พัก/อาหาร) ~ 25-35%
  · ค่าวัสดุ (อุปกรณ์/วัตถุดิบ) ~ 35-50%
- KPI: derive จาก target_kpis ของ brief + เพิ่มผลลัพธ์ที่จับต้องได้

ตอบเป็น JSON เท่านั้น`;

export function buildNgor9UserPrompt(
  brief: {
    title: string;
    problem_statement: string;
    location: string | null;
    target_audience: string | null;
    required_skills: string[];
    target_kpis: string[];
    plan_number: number | null;
    budget_min: number | null;
    budget_max: number | null;
    fiscal_year: number;
  },
  researcher: {
    name: string;
    title: string | null;
    faculty: string | null;
    expertise_tags: string[];
    areas: string[];
  }
): string {
  const targetBudget = brief.budget_max
    ? Number(brief.budget_max)
    : brief.budget_min
    ? Number(brief.budget_min) * 1.5
    : 200_000;

  const kpiContext = brief.target_kpis
    .map((c) => {
      const k = EXCELLENCE_KPIS.find((x) => x.code === c);
      return k ? `- ${c}: ${k.name} (หน่วย: ${k.unit}, เป้า: ${k.target_team || k.target_university})` : `- ${c}`;
    })
    .join("\n");

  const planLabels: Record<number, string> = {
    1: "1.ผลักดันเทคโนโลยี",
    2: "3.พัฒนากำลังคน", // PDF→DB sequence map
    3: "2.ขับเคลื่อนกลไก",
  };
  const mainProgram = brief.plan_number ? planLabels[brief.plan_number] : "1.ผลักดันเทคโนโลยี";

  return `## Brief
- Title: ${brief.title}
- Problem: ${brief.problem_statement}
- Location: ${brief.location || "—"}
- Target audience: ${brief.target_audience || "—"}
- Required skills: ${brief.required_skills.join(", ")}
- Target KPIs:
${kpiContext}
- Budget: ${targetBudget.toLocaleString()} บาท (กรอบ ${brief.budget_min || "—"}–${brief.budget_max || "—"})
- ปีงบประมาณ: ${brief.fiscal_year}

## Researcher
- ${researcher.title || ""} ${researcher.name}
- Faculty: ${researcher.faculty || "—"}
- Expertise: ${researcher.expertise_tags.join(", ")}
- Areas: ${researcher.areas.join(", ") || "—"}

## Output schema (JSON only)
{
  "project_name": "ชื่อโครงการเต็ม (สื่อปัญหา + วิธีแก้ + พื้นที่)",
  "responsible": "${researcher.name}",
  "responsible_title": "${researcher.title || ""}",
  "phone": "",
  "organization": "${researcher.faculty || "มทร.ล้านนา"}",
  "budget_total": ${Math.round(targetBudget)},
  "project_period": "1 ตุลาคม ${brief.fiscal_year - 1} - 30 กันยายน ${brief.fiscal_year}",
  "site": "${brief.location || ""}",
  "main_program": "${mainProgram}",
  "activities": [
    {
      "order": 1,
      "name": "ออกแบบและวางแผน...",
      "budget": <ตัวเลข>,
      "planned_months": [10, 11],
      "output": "ผลผลิตที่คาดหวัง"
    }
  ],
  "kpi": {
    "quantitative": ["รายการตัวชี้วัดเชิงปริมาณตาม target_kpis"],
    "qualitative": ["รายการเชิงคุณภาพ"],
    "time_target": "ดำเนินกิจกรรมตามแผนได้ ร้อยละ 90",
    "budget_target": "เบิกจ่ายงบประมาณได้ ร้อยละ 95"
  },
  "budget_breakdown": {
    "compensation_pct": 25,
    "supplies_pct": 40,
    "operating_pct": 35,
    "rationale": "เน้นวัสดุ/อุปกรณ์เพราะเป็นงานทดลอง..."
  },
  "ai_notes": [
    "ข้อสังเกตเพิ่มเติม / เหตุผลการออกแบบ"
  ]
}

หลัก:
- กิจกรรม 4-7 รายการ
- รวม budget ของกิจกรรม = budget_total
- planned_months ครอบคลุม ต.ค.${brief.fiscal_year - 544}–ก.ย.${brief.fiscal_year - 543}
- ตอบ JSON เท่านั้น`;
}

// ============================================================================
// 3. Validate AI output
// ============================================================================

export interface AiNgor9Output {
  project_name: string;
  responsible: string;
  responsible_title?: string;
  phone?: string;
  organization?: string;
  budget_total: number;
  project_period?: string;
  site?: string;
  main_program: string;
  activities: Array<{
    order: number;
    name: string;
    budget: number;
    planned_months: number[];
    output: string;
  }>;
  kpi: {
    quantitative?: string[];
    qualitative?: string[];
    time_target?: string;
    budget_target?: string;
  };
  budget_breakdown?: {
    compensation_pct: number;
    supplies_pct: number;
    operating_pct: number;
    rationale: string;
  };
  ai_notes?: string[];
}

export function validateNgor9Output(obj: unknown): { valid: boolean; errors: string[]; data?: AiNgor9Output } {
  const errors: string[] = [];
  if (!obj || typeof obj !== "object") {
    return { valid: false, errors: ["Output ต้องเป็น object"] };
  }
  const o = obj as Record<string, unknown>;
  if (!o.project_name || typeof o.project_name !== "string") errors.push("ขาด project_name");
  if (!o.responsible || typeof o.responsible !== "string") errors.push("ขาด responsible");
  if (typeof o.budget_total !== "number" || o.budget_total <= 0) errors.push("budget_total ต้อง > 0");
  if (!Array.isArray(o.activities) || o.activities.length === 0) errors.push("ต้องมี activities อย่างน้อย 1 รายการ");
  if (!o.kpi || typeof o.kpi !== "object") errors.push("ขาด kpi object");

  return {
    valid: errors.length === 0,
    errors,
    data: errors.length === 0 ? (o as unknown as AiNgor9Output) : undefined,
  };
}
