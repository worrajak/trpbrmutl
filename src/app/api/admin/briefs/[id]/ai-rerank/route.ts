import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { rankResearchers } from "@/lib/brief-matching";
import { callOpenRouterText } from "@/lib/openrouter";
import { extractJSON } from "@/lib/ngor9-prompt";
import { AI_RERANK_SYSTEM, buildRerankUserPrompt } from "@/lib/ai-brief-prompts";

/**
 * POST /api/admin/briefs/[id]/ai-rerank
 *
 * Body: { api_key, model }
 *
 * Flow:
 *  1. คำนวณ skill score ranking (computeMatchScore) — top 10 candidates
 *  2. ส่งไป LLM พร้อม brief context → AI rerank ใหม่ + เพิ่ม reasons + concerns
 *  3. คืน { skill_ranking, ai_ranking, recommended_pair }
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface Ctx { params: { id: string } }

interface AiRerankItem {
  researcher_id: string;
  ai_score: number;
  fitness_label: string;
  reasons: string[];
  concerns: string[];
}

interface AiRerankOutput {
  rerank: AiRerankItem[];
  recommended_pair?: {
    mentor_id: string | null;
    mentee_id: string | null;
    rationale: string;
  };
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  const id = params.id;
  if (!id) return NextResponse.json({ error: "Missing brief id" }, { status: 400 });

  let body: { api_key?: string; model?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.api_key) return NextResponse.json({ error: "ต้องระบุ api_key (OpenRouter)" }, { status: 400 });
  const model = body.model || "anthropic/claude-haiku-4.5";

  // 1. Fetch brief + candidates
  const [briefRes, researchersRes] = await Promise.all([
    supabase.from("research_briefs").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("rpf_researchers")
      .select("id, name, title, faculty, level, expertise_tags, areas, current_load, bio")
      .eq("is_active", true),
  ]);

  if (briefRes.error || !briefRes.data) {
    return NextResponse.json({ error: "ไม่พบ brief" }, { status: 404 });
  }
  const brief = briefRes.data;
  const allResearchers = researchersRes.data || [];

  // 2. Skill score ranking (deterministic) → top 10
  const skillRanking = rankResearchers(brief, allResearchers, 10);
  if (skillRanking.length === 0) {
    return NextResponse.json(
      { error: "ไม่มี researcher ที่ match — ลองเพิ่มนักวิจัยหรือปรับ required_skills" },
      { status: 422 }
    );
  }

  // 3. AI rerank
  const userPrompt = buildRerankUserPrompt(
    {
      title: brief.title,
      problem_statement: brief.problem_statement,
      location: brief.location,
      required_skills: brief.required_skills,
      target_kpis: brief.target_kpis,
      mode: brief.mode,
      budget_min: brief.budget_min,
      budget_max: brief.budget_max,
    },
    skillRanking.map((m) => ({
      id: m.researcher.id,
      name: m.researcher.name,
      title: m.researcher.title || null,
      level: m.researcher.level,
      expertise_tags: m.researcher.expertise_tags,
      areas: m.researcher.areas,
      current_load: m.researcher.current_load || 0,
      bio: m.researcher.bio || null,
    }))
  );

  let aiResult: AiRerankOutput | null = null;
  let aiError: string | null = null;
  try {
    const out = await callOpenRouterText(AI_RERANK_SYSTEM, userPrompt, body.api_key, model);
    const parsed = extractJSON(out.text);
    if (!parsed) {
      aiError = "AI ตอบ JSON ที่ parse ไม่ได้";
    } else {
      aiResult = parsed as unknown as AiRerankOutput;
    }
  } catch (err: unknown) {
    aiError = err instanceof Error ? err.message : "AI request ล้มเหลว";
  }

  return NextResponse.json(
    {
      brief_id: id,
      skill_ranking: skillRanking,
      ai_ranking: aiResult?.rerank || null,
      recommended_pair: aiResult?.recommended_pair || null,
      ai_error: aiError,
      model_used: model,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
