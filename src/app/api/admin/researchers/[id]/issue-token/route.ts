import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { hashPin, suggestToken, isValidToken } from "@/lib/team-auth";

/**
 * POST /api/admin/researchers/[id]/issue-token
 *
 * Approve researcher + auto-create team_member with token + PIN
 *
 * Body: { custom_token?, custom_pin? }  — ถ้าไม่ใส่ระบบ generate ให้
 *
 * Flow:
 *  1. Lookup researcher
 *  2. Generate/use token + PIN (PIN 4 หลัก)
 *  3. Hash PIN
 *  4. Insert team_member
 *  5. Update rpf_researchers.linked_team_member_id + is_active=true
 *  6. Return { token, pin } (plain) สำหรับ admin คัดลอกส่งให้ researcher
 */

export const dynamic = "force-dynamic";

interface Ctx { params: { id: string } }

export async function POST(req: NextRequest, { params }: Ctx) {
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  const id = params.id;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  let body: { custom_token?: string; custom_pin?: string };
  try { body = await req.json(); } catch { body = {}; }

  // 1. Lookup researcher
  const { data: researcher, error: rErr } = await supabase
    .from("rpf_researchers")
    .select("id, name, email, linked_team_member_id, is_active")
    .eq("id", id)
    .maybeSingle();
  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 });
  if (!researcher) return NextResponse.json({ error: "ไม่พบ researcher" }, { status: 404 });

  // ถ้ามี token แล้ว → return existing
  if (researcher.linked_team_member_id) {
    const { data: existingTm } = await supabase
      .from("team_members")
      .select("token")
      .eq("id", researcher.linked_team_member_id)
      .maybeSingle();
    if (existingTm) {
      return NextResponse.json({
        success: true,
        already_issued: true,
        token: existingTm.token,
        message: "researcher นี้มี token อยู่แล้ว · กรุณา reset PIN ที่หน้า /admin/team หากต้องการ",
      });
    }
  }

  // 2. Generate token (custom หรือ auto-suggest)
  let token = (body.custom_token || "").toUpperCase().trim();
  if (!token) {
    // Auto-suggest จากชื่อ + retry ถ้าซ้ำ
    for (let attempt = 0; attempt < 5; attempt++) {
      token = suggestToken(researcher.name);
      const { data: dup } = await supabase
        .from("team_members")
        .select("id")
        .eq("token", token)
        .maybeSingle();
      if (!dup) break;
    }
  }
  if (!isValidToken(token)) {
    return NextResponse.json({ error: "Token ต้องเป็น 6-8 ตัว A-Z, 0-9" }, { status: 400 });
  }

  // 3. Generate PIN (custom หรือ random 4 digit)
  const pin = body.custom_pin || String(Math.floor(1000 + Math.random() * 9000));
  if (!/^\d{4}$/.test(pin)) {
    return NextResponse.json({ error: "PIN ต้องเป็นตัวเลข 4 หลัก" }, { status: 400 });
  }

  // 4. Hash PIN + insert team_member
  const pin_hash = await hashPin(pin, token);
  const { data: tm, error: tmErr } = await supabase
    .from("team_members")
    .insert({
      name: researcher.name,
      token,
      pin_hash,
      role: "team_member",
      email: researcher.email,
      can_edit: false,        // researcher แก้ profile ตัวเองได้ ไม่แก้คนอื่น
      can_delete: false,
      is_active: true,
      notes: `Auto-issued for researcher ${id}`,
    })
    .select("id")
    .single();
  if (tmErr) return NextResponse.json({ error: "สร้าง team_member ล้มเหลว: " + tmErr.message }, { status: 500 });

  // 5. Update researcher
  const { error: updErr } = await supabase
    .from("rpf_researchers")
    .update({
      linked_team_member_id: tm.id,
      is_active: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (updErr) {
    return NextResponse.json({ error: "อัปเดต researcher ล้มเหลว: " + updErr.message }, { status: 500 });
  }

  // 6. Return credentials (plain) ให้ admin copy ส่งให้ researcher
  return NextResponse.json({
    success: true,
    researcher_id: id,
    researcher_name: researcher.name,
    team_member_id: tm.id,
    token,
    pin,            // plain text — ส่งครั้งเดียว · admin ต้องคัดลอก
    login_url: "/admin",
    message: "🎉 Issued · ส่ง token + PIN ให้ researcher login ที่ /admin → tab 'นักวิจัย'",
  });
}
