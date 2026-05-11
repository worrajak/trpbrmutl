import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

/**
 * /api/admin/researchers/[id]
 *  PATCH  — update fields (whitelist)
 *  DELETE — hard delete
 */

export const dynamic = "force-dynamic";

interface Ctx { params: { id: string } }

const PATCHABLE = new Set([
  "name",
  "title",
  "faculty",
  "department",
  "email",
  "phone",
  "expertise_tags",
  "areas",
  "past_projects",
  "level",
  "bio",
  "external_link",
  "current_load",
  "is_active",
  "linked_team_member_id",
]);

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

  const updates: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (PATCHABLE.has(k)) updates[k] = v;
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "ไม่มีฟิลด์ที่อนุญาต" }, { status: 400 });
  }
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("researchers")
    .update(updates)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "ไม่พบ researcher" }, { status: 404 });

  return NextResponse.json({ success: true, researcher: data });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  const id = params.id;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { data, error } = await supabase
    .from("researchers")
    .delete()
    .eq("id", id)
    .select("id, name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data || data.length === 0) {
    return NextResponse.json({ error: "ไม่พบ researcher หรือ RLS block" }, { status: 404 });
  }

  return NextResponse.json({ success: true, deleted: data[0] });
}
