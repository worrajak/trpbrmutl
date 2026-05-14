import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { syncBriefSkillsToCatalog } from "@/lib/sync-brief-skills";
import { summarizeSourceChain, type SourceChainItem } from "@/lib/ai-brief-generator-prompts";

/**
 * /api/admin/briefs
 *  GET   — list ทั้งหมด (filter ?status=open ได้)
 *  POST  — create new brief
 *
 * Auth: ใช้ admin password หรือ team_member token (ฝั่ง client gate ใน sessionStorage)
 *       — TODO Phase 3: เพิ่ม header validate
 */

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  const status = req.nextUrl.searchParams.get("status");

  let q = supabase
    .from("research_briefs")
    .select("*")
    .order("created_at", { ascending: false });
  if (status) q = q.eq("status", status);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    { briefs: data || [] },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(req: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = (body.title as string || "").trim();
  const problem = (body.problem_statement as string || "").trim();
  if (!title) return NextResponse.json({ error: "ต้องระบุชื่อโจทย์" }, { status: 400 });
  if (!problem) return NextResponse.json({ error: "ต้องระบุ problem_statement" }, { status: 400 });

  // Source attribution chain — auto-compute verification_status + min_credibility
  const sourceChain: SourceChainItem[] = Array.isArray(body.source_chain)
    ? (body.source_chain as SourceChainItem[])
    : [];
  const sourceSummary = summarizeSourceChain(sourceChain);

  // Allow client to override status (e.g. admin already verified manually)
  const verificationOverride = body.verification_status as string | undefined;
  const verificationStatus = ["pending", "verified", "flagged"].includes(verificationOverride || "")
    ? (verificationOverride as "pending" | "verified" | "flagged")
    : sourceSummary.verification_status;

  const row = {
    title,
    problem_statement: problem,
    location: (body.location as string) || null,
    target_audience: (body.target_audience as string) || null,
    target_kpis: Array.isArray(body.target_kpis) ? body.target_kpis : [],
    plan_number: typeof body.plan_number === "number" ? body.plan_number : null,
    required_skills: Array.isArray(body.required_skills) ? body.required_skills : [],
    budget_min: typeof body.budget_min === "number" ? body.budget_min : null,
    budget_max: typeof body.budget_max === "number" ? body.budget_max : null,
    fiscal_year: typeof body.fiscal_year === "number" ? body.fiscal_year : 2569,
    mode: ["open", "assigned", "mentorship"].includes(body.mode as string) ? body.mode : "open",
    assigned_researcher_id: (body.assigned_researcher_id as string) || null,
    mentor_researcher_id: (body.mentor_researcher_id as string) || null,
    status: ["draft", "open", "matched", "in_progress", "closed", "cancelled"].includes(body.status as string)
      ? body.status
      : "open",
    deadline: (body.deadline as string) || null,
    created_by: (body.created_by as string) || null,
    created_by_token: (body.created_by_token as string) || null,
    notes: (body.notes as string) || null,
    source_chain: sourceChain,
    verification_status: verificationStatus,
    min_credibility: sourceSummary.min_credibility,
  };

  const { data, error } = await supabase.from("research_briefs").insert(row).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Auto-sync required_skills → rpf_research_areas catalog (non-blocking errors)
  let skillSync: { added: string[]; updated: string[]; errors: string[] } | null = null;
  if (Array.isArray(row.required_skills) && row.required_skills.length > 0) {
    skillSync = await syncBriefSkillsToCatalog(supabase, row.required_skills, {
      brief_id: (data as { id: string } | null)?.id,
      brief_title: row.title,
    });
  }

  return NextResponse.json({ success: true, brief: data, skill_sync: skillSync });
}
