import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { rankResearchers } from "@/lib/brief-matching";

/**
 * GET /api/admin/briefs/[id]/match
 *  คำนวณ match score กับ researchers ทั้งหมดที่ active
 *  คืน top 10 ranked
 *
 * Phase 3 จะเพิ่ม ?ai=true เพื่อให้ LLM rerank
 */

export const dynamic = "force-dynamic";

interface Ctx { params: { id: string } }

export async function GET(req: NextRequest, { params }: Ctx) {
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  const id = params.id;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const topN = Number(req.nextUrl.searchParams.get("limit") || "10");

  const [briefRes, researchersRes] = await Promise.all([
    supabase
      .from("research_briefs")
      .select("id, required_skills, location, mode")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("researchers")
      .select("id, name, title, faculty, level, expertise_tags, areas, current_load, email")
      .eq("is_active", true),
  ]);

  if (briefRes.error) return NextResponse.json({ error: briefRes.error.message }, { status: 500 });
  if (!briefRes.data) return NextResponse.json({ error: "ไม่พบ brief" }, { status: 404 });

  const ranked = rankResearchers(briefRes.data, researchersRes.data || [], topN);

  return NextResponse.json(
    {
      brief_id: id,
      total_researchers: (researchersRes.data || []).length,
      matches: ranked,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
