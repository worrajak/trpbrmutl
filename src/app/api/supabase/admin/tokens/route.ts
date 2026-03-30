import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET() {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ tokens: [], balances: [] });
  }

  const [tokensRes, balancesRes] = await Promise.all([
    supabase
      .from("project_tokens")
      .select("*, projects(project_name, main_program, organization)")
      .order("project_id"),
    supabase
      .from("reward_balance")
      .select("*")
      .order("total_rpf", { ascending: false }),
  ]);

  return NextResponse.json({
    tokens: tokensRes.data || [],
    balances: balancesRes.data || [],
  });
}
