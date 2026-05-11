import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { findMatchingBriefs } from "@/lib/brief-matching";

/**
 * GET /api/researcher/[id]/matched-briefs?limit=10
 *
 * คืน briefs ที่ match กับ researcher's expertise + areas (rank ตาม score)
 * + แสดง interest status (ถ้า apply ไปแล้ว)
 */

export const dynamic = "force-dynamic";

interface Ctx { params: { id: string } }

export async function GET(req: NextRequest, { params }: Ctx) {
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  const id = params.id;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const limit = Number(req.nextUrl.searchParams.get("limit") || "10");

  // Fetch researcher + open briefs + interests parallel
  const [resR, briefsR, interestsR] = await Promise.all([
    supabase
      .from("rpf_researchers")
      .select("id, name, level, expertise_tags, areas, current_load")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("research_briefs")
      .select("id, title, problem_statement, location, target_kpis, plan_number, required_skills, budget_min, budget_max, fiscal_year, mode, status, deadline")
      .in("status", ["open", "matched"])
      .order("created_at", { ascending: false }),
    supabase
      .from("brief_interests")
      .select("id, brief_id, status, submitted_at, note")
      .eq("researcher_id", id),
  ]);

  if (resR.error || !resR.data) return NextResponse.json({ error: "ไม่พบ researcher" }, { status: 404 });

  const researcher = {
    id: resR.data.id,
    name: resR.data.name,
    level: resR.data.level,
    expertise_tags: resR.data.expertise_tags || [],
    areas: resR.data.areas || [],
    current_load: resR.data.current_load || 0,
  };

  const briefs = (briefsR.data || []).map((b) => ({
    ...b,
    target_kpis: b.target_kpis || [],
    required_skills: b.required_skills || [],
  }));

  // Build interests map for quick lookup
  const interestsMap = new Map<string, { status: string; submitted_at: string; id: string; note: string | null }>();
  for (const i of interestsR.data || []) {
    interestsMap.set(i.brief_id, { id: i.id, status: i.status, submitted_at: i.submitted_at, note: i.note });
  }

  // Match each brief
  const matched = findMatchingBriefs(researcher, briefs, limit);

  // Enrich with interest status
  const result = matched.map(({ brief, match }) => ({
    brief,
    match,
    interest: interestsMap.get(brief.id || "") || null,
  }));

  return NextResponse.json(
    {
      researcher_id: id,
      total_open_briefs: briefs.length,
      matched: result,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
