import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

/**
 * /api/admin/briefs/[id]
 *  GET    — single brief + interests + matched candidates
 *  PATCH  — update fields (whitelist)
 *  DELETE — hard delete (cascade brief_interests)
 */

export const dynamic = "force-dynamic";

interface Ctx { params: { id: string } }

const PATCHABLE = new Set([
  "title", "problem_statement", "location", "target_audience",
  "target_kpis", "plan_number", "required_skills",
  "budget_min", "budget_max", "fiscal_year",
  "mode", "assigned_researcher_id", "mentor_researcher_id",
  "status", "deadline", "notes", "ai_ngor9_draft",
]);

export async function GET(_req: NextRequest, { params }: Ctx) {
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  const id = params.id;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  // Parallel fetch brief + interests + assigned researchers
  const [briefRes, interestsRes] = await Promise.all([
    supabase.from("research_briefs").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("brief_interests")
      .select("*, researcher:researchers(id, name, title, faculty, level, expertise_tags, areas, current_load)")
      .eq("brief_id", id)
      .order("submitted_at", { ascending: false }),
  ]);

  if (briefRes.error) return NextResponse.json({ error: briefRes.error.message }, { status: 500 });
  if (!briefRes.data) return NextResponse.json({ error: "ไม่พบ brief" }, { status: 404 });

  return NextResponse.json(
    {
      brief: briefRes.data,
      interests: interestsRes.data || [],
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  const id = params.id;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (PATCHABLE.has(k)) updates[k] = v;
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "ไม่มีฟิลด์ที่อนุญาต" }, { status: 400 });
  }
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("research_briefs")
    .update(updates)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "ไม่พบ brief" }, { status: 404 });

  return NextResponse.json({ success: true, brief: data });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  const id = params.id;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { data, error } = await supabase
    .from("research_briefs")
    .delete()
    .eq("id", id)
    .select("id, title");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data || data.length === 0) {
    return NextResponse.json({ error: "ไม่พบ brief หรือ RLS block" }, { status: 404 });
  }

  return NextResponse.json({ success: true, deleted: data[0] });
}
