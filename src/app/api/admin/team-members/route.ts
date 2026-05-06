import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { hashPin, isValidToken, isValidPin } from "@/lib/team-auth";

/**
 * /api/admin/team-members
 *
 * GET  — list ทุก team_members (ไม่ส่ง pin_hash กลับ)
 * POST — สร้างใหม่ { name, token, pin, role, email?, phone?, can_delete? }
 *
 * Auth: ใช้ admin password gate ฝั่ง client (sessionStorage)
 *       — TODO: เพิ่ม header validate ใน production
 */

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("team_members")
    .select("id, name, token, role, email, phone, can_edit, can_delete, is_active, notes, created_at, last_login_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { members: data || [] },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(req: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  let body: {
    name?: string;
    token?: string;
    pin?: string;
    role?: "team_member" | "team_lead";
    email?: string;
    phone?: string;
    can_delete?: boolean;
    notes?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = (body.name || "").trim();
  const token = (body.token || "").trim().toUpperCase();
  const pin = (body.pin || "").trim();

  if (!name) {
    return NextResponse.json({ error: "ต้องระบุชื่อ" }, { status: 400 });
  }
  if (!isValidToken(token)) {
    return NextResponse.json({ error: "Token ต้องเป็น 6-8 ตัว (A-Z, 0-9)" }, { status: 400 });
  }
  if (!isValidPin(pin)) {
    return NextResponse.json({ error: "PIN ต้องเป็นตัวเลข 4 หลัก" }, { status: 400 });
  }

  // เช็ค token ซ้ำ
  const { data: existing } = await supabase
    .from("team_members")
    .select("id")
    .eq("token", token)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: `Token ${token} มีอยู่แล้ว` }, { status: 409 });
  }

  // Hash PIN
  const pin_hash = await hashPin(pin, token);

  const { data, error } = await supabase
    .from("team_members")
    .insert({
      name,
      token,
      pin_hash,
      role: body.role || "team_member",
      email: body.email || null,
      phone: body.phone || null,
      can_edit: true,
      can_delete: body.can_delete ?? false,
      is_active: true,
      notes: body.notes || null,
    })
    .select("id, name, token, role, email, phone, can_edit, can_delete, is_active, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, member: data });
}
