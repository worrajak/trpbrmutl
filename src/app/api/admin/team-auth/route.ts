import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { verifyPin, isValidToken, isValidPin } from "@/lib/team-auth";

/**
 * POST /api/admin/team-auth
 * Login สำหรับ team_member — รับ token + PIN → verify → คืน member info
 */

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  let body: { token?: string; pin?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const token = (body.token || "").trim().toUpperCase();
  const pin = (body.pin || "").trim();

  if (!isValidToken(token)) {
    return NextResponse.json({ error: "Token ต้องเป็น 6-8 ตัว (A-Z, 0-9)" }, { status: 400 });
  }
  if (!isValidPin(pin)) {
    return NextResponse.json({ error: "PIN ต้องเป็นตัวเลข 4 หลัก" }, { status: 400 });
  }

  // ดึง member ตาม token
  const { data: member, error } = await supabase
    .from("team_members")
    .select("id, name, token, pin_hash, role, can_edit, can_delete, is_active, last_login_at")
    .eq("token", token)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "DB error: " + error.message }, { status: 500 });
  }
  if (!member) {
    // ไม่บอกว่า token ผิดหรือไม่มี — ป้องกัน enumeration
    return NextResponse.json({ error: "Token หรือ PIN ไม่ถูกต้อง" }, { status: 401 });
  }

  // Verify PIN
  const ok = await verifyPin(pin, token, member.pin_hash);
  if (!ok) {
    return NextResponse.json({ error: "Token หรือ PIN ไม่ถูกต้อง" }, { status: 401 });
  }

  // Update last_login_at (best-effort, non-blocking)
  void supabase
    .from("team_members")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", member.id);

  return NextResponse.json(
    {
      success: true,
      member: {
        id: member.id,
        name: member.name,
        token: member.token,
        role: member.role,
        can_edit: member.can_edit,
        can_delete: member.can_delete,
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
