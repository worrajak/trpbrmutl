import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { hashPin, isValidPin } from "@/lib/team-auth";

/**
 * /api/admin/team-members/[id]
 *
 * PATCH  — update fields (รวม reset PIN)
 * DELETE — hard delete (ใช้ระวัง · alternative: PATCH is_active=false)
 */

export const dynamic = "force-dynamic";

interface Ctx { params: { id: string } }

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  const id = params.id;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Whitelist updates
  const updates: Record<string, unknown> = {};
  if (typeof body.name === "string") updates.name = body.name.trim();
  if (typeof body.email === "string") updates.email = body.email.trim() || null;
  if (typeof body.phone === "string") updates.phone = body.phone.trim() || null;
  if (typeof body.role === "string" && ["team_member", "team_lead"].includes(body.role)) {
    updates.role = body.role;
  }
  if (typeof body.can_edit === "boolean") updates.can_edit = body.can_edit;
  if (typeof body.can_delete === "boolean") updates.can_delete = body.can_delete;
  if (typeof body.is_active === "boolean") updates.is_active = body.is_active;
  if (typeof body.notes === "string") updates.notes = body.notes;

  // Reset PIN — ถ้ามี
  if (typeof body.pin === "string" && body.pin) {
    if (!isValidPin(body.pin)) {
      return NextResponse.json({ error: "PIN ต้องเป็นตัวเลข 4 หลัก" }, { status: 400 });
    }
    // ต้องดึง token ก่อนเพื่อ salt
    const { data: existing } = await supabase
      .from("team_members")
      .select("token")
      .eq("id", id)
      .maybeSingle();
    if (!existing) {
      return NextResponse.json({ error: "ไม่พบ member" }, { status: 404 });
    }
    updates.pin_hash = await hashPin(body.pin, existing.token);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "ไม่มีฟิลด์ที่จะอัปเดต" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("team_members")
    .update(updates)
    .eq("id", id)
    .select("id, name, token, role, email, phone, can_edit, can_delete, is_active, notes, last_login_at")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "ไม่พบ member" }, { status: 404 });

  return NextResponse.json({ success: true, member: data });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  const id = params.id;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { data, error } = await supabase
    .from("team_members")
    .delete()
    .eq("id", id)
    .select("id, name, token");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data || data.length === 0) {
    return NextResponse.json({ error: "ไม่พบ member หรือ RLS block" }, { status: 404 });
  }

  return NextResponse.json({ success: true, deleted: data[0] });
}
