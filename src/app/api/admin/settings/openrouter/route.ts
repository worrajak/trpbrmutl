import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

/**
 * /api/admin/settings/openrouter
 *
 *  GET    — load { api_key, model } จาก server (table app_settings)
 *  POST   — save { api_key, model } → upsert
 *  DELETE — clear keys (api_key + model)
 *
 * Note: anon access · production ควรใช้ admin password gate ฝั่ง API
 */

export const dynamic = "force-dynamic";

const KEY_API = "openrouter_api_key";
const KEY_MODEL = "openrouter_model";

export async function GET() {
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  const { data, error } = await supabase
    .from("app_settings")
    .select("key, value, updated_at, updated_by")
    .in("key", [KEY_API, KEY_MODEL]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const result: { api_key?: string; model?: string; updated_at?: string; updated_by?: string } = {};
  for (const row of data || []) {
    if (row.key === KEY_API) result.api_key = row.value;
    if (row.key === KEY_MODEL) result.model = row.value;
    if (row.updated_at && (!result.updated_at || row.updated_at > result.updated_at)) {
      result.updated_at = row.updated_at;
      result.updated_by = row.updated_by;
    }
  }

  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  let body: { api_key?: string; model?: string; updated_by?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updatedBy = body.updated_by || "admin";
  const now = new Date().toISOString();
  const rows: Array<{ key: string; value: string; updated_at: string; updated_by: string }> = [];

  if (typeof body.api_key === "string") {
    rows.push({ key: KEY_API, value: body.api_key, updated_at: now, updated_by: updatedBy });
  }
  if (typeof body.model === "string" && body.model) {
    rows.push({ key: KEY_MODEL, value: body.model, updated_at: now, updated_by: updatedBy });
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: "ไม่มีฟิลด์ที่จะ save" }, { status: 400 });
  }

  const { error } = await supabase.from("app_settings").upsert(rows, { onConflict: "key" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, saved: rows.map((r) => r.key) });
}

export async function DELETE() {
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  const { error } = await supabase
    .from("app_settings")
    .delete()
    .in("key", [KEY_API, KEY_MODEL]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
