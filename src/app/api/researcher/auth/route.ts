import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { verifyPin, isValidToken, isValidPin } from "@/lib/team-auth";

/**
 * POST /api/researcher/auth
 *
 * Researcher login (Token + PIN)
 * Body: { token, pin }
 *
 * Flow:
 *  1. Verify token + PIN ใน team_members
 *  2. Cross-ref rpf_researchers ที่ linked_team_member_id = team_member.id
 *  3. ถ้าไม่ใช่ researcher → reject (404)
 *  4. Update last_login_at
 *  5. Return { researcher info } สำหรับ frontend store ใน sessionStorage
 */

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  let body: { token?: string; pin?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const token = (body.token || "").trim().toUpperCase();
  const pin = (body.pin || "").trim();
  if (!isValidToken(token)) return NextResponse.json({ error: "Token รูปแบบไม่ถูกต้อง" }, { status: 400 });
  if (!isValidPin(pin)) return NextResponse.json({ error: "PIN ต้องเป็นตัวเลข 4 หลัก" }, { status: 400 });

  // 1. Lookup team_member
  const { data: tm } = await supabase
    .from("team_members")
    .select("id, name, token, pin_hash, is_active")
    .eq("token", token)
    .eq("is_active", true)
    .maybeSingle();
  if (!tm) return NextResponse.json({ error: "Token หรือ PIN ไม่ถูกต้อง" }, { status: 401 });

  const ok = await verifyPin(pin, token, tm.pin_hash);
  if (!ok) return NextResponse.json({ error: "Token หรือ PIN ไม่ถูกต้อง" }, { status: 401 });

  // 2. Cross-ref researcher
  const { data: researcher } = await supabase
    .from("rpf_researchers")
    .select("id, name, title, faculty, department, email, phone, expertise_tags, areas, level, bio, current_load, external_link, is_active")
    .eq("linked_team_member_id", tm.id)
    .maybeSingle();
  if (!researcher) {
    return NextResponse.json(
      { error: "Token นี้ไม่ใช่ของนักวิจัย · กรุณา login ที่ tab 'คณะทำงาน' แทน" },
      { status: 403 }
    );
  }

  // 3. Update last_login (best-effort)
  void supabase.from("team_members").update({ last_login_at: new Date().toISOString() }).eq("id", tm.id);

  return NextResponse.json(
    {
      success: true,
      researcher: {
        ...researcher,
        expertise_tags: researcher.expertise_tags || [],
        areas: researcher.areas || [],
      },
      team_member_id: tm.id,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
