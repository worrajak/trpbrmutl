import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ participants: [], evidence: [] });
  }

  const projectId = req.nextUrl.searchParams.get("project_id");
  if (!projectId) {
    return NextResponse.json({ error: "Missing project_id" }, { status: 400 });
  }

  const [participantsRes, evidenceRes] = await Promise.all([
    supabase
      .from("participants")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
    supabase
      .from("kpi_evidence")
      .select("*, kpi_targets(kpi_name)")
      .eq("kpi_targets.project_id", projectId)
      .order("created_at", { ascending: false }),
  ]);

  return NextResponse.json({
    participants: participantsRes.data || [],
    evidence: evidenceRes.data || [],
  });
}
