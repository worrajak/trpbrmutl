import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ projects: [], isLive: false });
  }

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("main_program");

  if (error) {
    return NextResponse.json({ projects: [], isLive: false });
  }

  return NextResponse.json({ projects: data || [], isLive: true });
}
