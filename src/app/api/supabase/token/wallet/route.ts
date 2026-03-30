import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

// POST: ผูก TRON wallet address กับ token
export async function POST(req: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const { token_code, tron_wallet } = await req.json();

  if (!token_code || !tron_wallet) {
    return NextResponse.json({ error: "Missing token_code or tron_wallet" }, { status: 400 });
  }

  // Validate TRON address format (starts with T, 34 chars)
  if (!tron_wallet.startsWith("T") || tron_wallet.length !== 34) {
    return NextResponse.json({ error: "TRON address ไม่ถูกต้อง" }, { status: 400 });
  }

  // Check token exists
  const { data: token } = await supabase
    .from("project_tokens")
    .select("id, tron_wallet")
    .eq("token_code", token_code)
    .eq("is_active", true)
    .single();

  if (!token) {
    return NextResponse.json({ error: "Token ไม่ถูกต้อง" }, { status: 401 });
  }

  // Update wallet
  const { error } = await supabase
    .from("project_tokens")
    .update({ tron_wallet })
    .eq("token_code", token_code);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, tron_wallet });
}
