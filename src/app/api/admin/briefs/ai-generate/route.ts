import { NextRequest, NextResponse } from "next/server";
import { callOpenRouterText } from "@/lib/openrouter";
import { extractJSON } from "@/lib/ngor9-prompt";
import { getSupabase } from "@/lib/supabase";
import {
  AI_BRIEF_GENERATOR_SYSTEM,
  buildGenerateBriefUserPrompt,
  validateGeneratedBrief,
  type GenerateBriefInput,
} from "@/lib/ai-brief-generator-prompts";

interface ExtendedInput extends GenerateBriefInput {
  api_key?: string;
  model?: string;
  avoid_titles?: string[];
}

/**
 * POST /api/admin/briefs/ai-generate
 *
 * Body: {
 *   plan_number: 1 | 2 | 3,
 *   budget_remaining: number,
 *   location?, target_audience?, theme?,
 *   fiscal_year?,
 *   api_key, model?
 * }
 *
 * Output: { generated: GeneratedBrief, model_used }
 *  → admin review → save ผ่าน /api/admin/briefs (POST) ปกติ
 */

export const dynamic = "force-dynamic";
export const maxDuration = 90;

export async function POST(req: NextRequest) {
  let body: ExtendedInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.api_key) return NextResponse.json({ error: "ต้องระบุ api_key (OpenRouter)" }, { status: 400 });
  if (!body.plan_number || ![1, 2, 3].includes(body.plan_number)) {
    return NextResponse.json({ error: "plan_number ต้องเป็น 1, 2, หรือ 3" }, { status: 400 });
  }
  if (!body.budget_remaining || body.budget_remaining <= 0) {
    return NextResponse.json({ error: "budget_remaining ต้อง > 0" }, { status: 400 });
  }

  const model = body.model || "anthropic/claude-sonnet-4.5";

  // Fetch existing skill catalog → ป้อนให้ AI ใช้ซ้ำ (ลดชื่อซ้ำ/สะกดเพี้ยน)
  // ดึงเฉพาะ active + เรียงตาม usage_count desc → top 80 ส่งให้ AI
  const supabase = getSupabase();
  let existingCatalog: Array<{ name: string; usage_count?: number; demand_level?: string }> = [];
  if (supabase) {
    const { data: catalog } = await supabase
      .from("rpf_research_areas")
      .select("name, usage_count, demand_level")
      .eq("is_active", true)
      .order("usage_count", { ascending: false })
      .limit(80);
    existingCatalog = (catalog as typeof existingCatalog | null) || [];
  }

  const userPrompt = buildGenerateBriefUserPrompt({
    plan_number: body.plan_number,
    budget_remaining: body.budget_remaining,
    location: body.location || null,
    target_audience: body.target_audience || null,
    theme: body.theme || null,
    fiscal_year: body.fiscal_year || 2569,
    prioritize_kpis: body.prioritize_kpis,
    avoid_titles: body.avoid_titles,
    existing_skill_catalog: existingCatalog,
  });

  let raw: string;
  try {
    const out = await callOpenRouterText(AI_BRIEF_GENERATOR_SYSTEM, userPrompt, body.api_key, model);
    raw = out.text;
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "AI request ล้มเหลว: " + (err instanceof Error ? err.message : "?") },
      { status: 502 }
    );
  }

  const parsed = extractJSON(raw);
  if (!parsed) {
    return NextResponse.json({ error: "AI ตอบ JSON ที่ parse ไม่ได้", raw }, { status: 422 });
  }

  const validation = validateGeneratedBrief(parsed);
  if (!validation.valid || !validation.data) {
    return NextResponse.json(
      { error: "AI output ไม่ครบ field", validation_errors: validation.errors, raw: parsed },
      { status: 422 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      generated: validation.data,
      model_used: model,
      input: {
        plan_number: body.plan_number,
        budget_remaining: body.budget_remaining,
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
