import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 500 }
    );
  }

  const [projectRes, activitiesRes, kpisRes] = await Promise.all([
    supabase.from("projects").select("*").eq("id", id).single(),
    supabase
      .from("activities")
      .select("*")
      .eq("project_id", id)
      .order("activity_order"),
    supabase.from("kpi_targets").select("*").eq("project_id", id),
  ]);

  if (projectRes.error) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({
    project: projectRes.data,
    activities: activitiesRes.data || [],
    kpis: kpisRes.data || [],
  });
}
