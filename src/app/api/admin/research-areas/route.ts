import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { SAMPLE_AREAS } from "@/lib/research-areas-seed";

/**
 * /api/admin/research-areas
 *
 * GET   — list ทั้งหมด (filter ?category=, ?demand=)
 * POST  — create new · หรือ { seed_samples: true } → bulk seed 14 sample
 */

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  const category = req.nextUrl.searchParams.get("category");
  const demand = req.nextUrl.searchParams.get("demand");

  let q = supabase.from("rpf_research_areas").select("*").order("created_at", { ascending: false });
  if (category) q = q.eq("category", category);
  if (demand) q = q.eq("demand_level", demand);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    { areas: data || [] },
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

  // Seed mode
  if (body.seed_samples === true) {
    const { count } = await supabase
      .from("rpf_research_areas")
      .select("*", { count: "exact", head: true });
    if ((count || 0) > 0) {
      return NextResponse.json(
        { error: `มี research areas อยู่แล้ว ${count} รายการ — ลบก่อนถ้าต้องการ seed ใหม่` },
        { status: 409 }
      );
    }
    const rows = SAMPLE_AREAS.map((a) => ({
      name: a.name,
      icon: a.icon,
      category: a.category,
      description: a.description,
      related_skills: a.related_skills,
      related_kpis: a.related_kpis,
      related_plans: a.related_plans,
      demand_level: a.demand_level,
      notes: a.notes || null,
      is_active: true,
    }));
    const { data, error } = await supabase.from("rpf_research_areas").insert(rows).select();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, seeded: data?.length || 0, areas: data });
  }

  // Normal create
  const name = (body.name as string || "").trim();
  if (!name) return NextResponse.json({ error: "ต้องระบุชื่อ" }, { status: 400 });

  const row = {
    name,
    icon: (body.icon as string) || null,
    category: ["research", "academic_service", "expertise", "other"].includes(body.category as string)
      ? body.category : "research",
    description: (body.description as string) || null,
    related_skills: Array.isArray(body.related_skills) ? body.related_skills : [],
    related_kpis: Array.isArray(body.related_kpis) ? body.related_kpis : [],
    related_plans: Array.isArray(body.related_plans) ? body.related_plans : [],
    demand_level: ["high", "medium", "low"].includes(body.demand_level as string)
      ? body.demand_level : "medium",
    notes: (body.notes as string) || null,
    is_active: true,
  };

  const { data, error } = await supabase.from("rpf_research_areas").insert(row).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, area: data });
}
