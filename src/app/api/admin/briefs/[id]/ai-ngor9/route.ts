import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { callOpenRouterText } from "@/lib/openrouter";
import { extractJSON } from "@/lib/ngor9-prompt";
import {
  AI_NGOR9_SYSTEM,
  buildNgor9UserPrompt,
  validateNgor9Output,
} from "@/lib/ai-brief-prompts";

/**
 * POST /api/admin/briefs/[id]/ai-ngor9
 *
 * Body: { researcher_id, api_key, model, save_draft? }
 *
 * Flow:
 *  1. Fetch brief + chosen researcher
 *  2. Build prompt → call OpenRouter
 *  3. Validate JSON output
 *  4. Optional: save into research_briefs.ai_ngor9_draft
 *  5. Return draft (admin/team review → submit ผ่าน /admin/upload-ngor9)
 */

export const dynamic = "force-dynamic";
export const maxDuration = 90;

interface Ctx { params: { id: string } }

export async function POST(req: NextRequest, { params }: Ctx) {
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  const id = params.id;
  if (!id) return NextResponse.json({ error: "Missing brief id" }, { status: 400 });

  let body: { researcher_id?: string; api_key?: string; model?: string; save_draft?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.researcher_id) return NextResponse.json({ error: "ต้องระบุ researcher_id" }, { status: 400 });
  if (!body.api_key) return NextResponse.json({ error: "ต้องระบุ api_key (OpenRouter)" }, { status: 400 });
  const model = body.model || "anthropic/claude-sonnet-4.5";

  // 1. Fetch brief + researcher
  const [briefRes, researcherRes] = await Promise.all([
    supabase.from("research_briefs").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("rpf_researchers")
      .select("id, name, title, faculty, expertise_tags, areas")
      .eq("id", body.researcher_id)
      .maybeSingle(),
  ]);

  if (briefRes.error || !briefRes.data) {
    return NextResponse.json({ error: "ไม่พบ brief" }, { status: 404 });
  }
  if (researcherRes.error || !researcherRes.data) {
    return NextResponse.json({ error: "ไม่พบ researcher" }, { status: 404 });
  }

  const brief = briefRes.data;
  const researcher = researcherRes.data;

  // 2. Build prompt
  const userPrompt = buildNgor9UserPrompt(
    {
      title: brief.title,
      problem_statement: brief.problem_statement,
      location: brief.location,
      target_audience: brief.target_audience,
      required_skills: brief.required_skills,
      target_kpis: brief.target_kpis,
      plan_number: brief.plan_number,
      budget_min: brief.budget_min,
      budget_max: brief.budget_max,
      fiscal_year: brief.fiscal_year,
    },
    {
      name: researcher.name,
      title: researcher.title,
      faculty: researcher.faculty,
      expertise_tags: researcher.expertise_tags,
      areas: researcher.areas,
    }
  );

  // 3. Call AI
  let raw: string;
  try {
    const out = await callOpenRouterText(AI_NGOR9_SYSTEM, userPrompt, body.api_key, model);
    raw = out.text;
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "AI request ล้มเหลว: " + (err instanceof Error ? err.message : "?") },
      { status: 502 }
    );
  }

  const parsed = extractJSON(raw);
  if (!parsed) {
    return NextResponse.json(
      { error: "AI ตอบ JSON ที่ parse ไม่ได้", raw },
      { status: 422 }
    );
  }

  const validation = validateNgor9Output(parsed);
  if (!validation.valid || !validation.data) {
    return NextResponse.json(
      { error: "AI output ไม่ครบ field", validation_errors: validation.errors, raw: parsed },
      { status: 422 }
    );
  }

  // 4. Optional save into brief
  if (body.save_draft) {
    await supabase
      .from("research_briefs")
      .update({
        ai_ngor9_draft: validation.data,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
  }

  return NextResponse.json(
    {
      success: true,
      draft: validation.data,
      saved: !!body.save_draft,
      model_used: model,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
