import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

// POST: ตรวจสอบ token 6 หลัก → คืน project info
export async function POST(req: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const { token_code } = await req.json();
  if (!token_code || token_code.length !== 6) {
    return NextResponse.json({ error: "Token ต้องเป็นตัวเลข 6 หลัก" }, { status: 400 });
  }

  const { data: token, error } = await supabase
    .from("project_tokens")
    .select("*, projects(id, project_name, main_program, responsible, organization)")
    .eq("token_code", token_code)
    .eq("is_active", true)
    .single();

  if (error || !token) {
    return NextResponse.json({ error: "Token ไม่ถูกต้องหรือหมดอายุ" }, { status: 401 });
  }

  // Update last_used_at
  await supabase
    .from("project_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("token_code", token_code);

  // Get reward balance
  const { data: balance } = await supabase
    .from("reward_balance")
    .select("*")
    .eq("token_code", token_code)
    .single();

  return NextResponse.json({
    valid: true,
    token,
    balance: balance || { total_rpf: 0, report_count: 0, streak_count: 0 },
  });
}
