import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

/**
 * /api/admin/briefs/[id]/interest
 *  POST  — researcher แสดงความสนใจ brief นี้
 *           body: { researcher_id, note? }
 *  PATCH — admin เปลี่ยน status ของ interest (shortlist/accept/reject)
 *           body: { interest_id, status }
 */

export const dynamic = "force-dynamic";

interface Ctx { params: { id: string } }

export async function POST(req: NextRequest, { params }: Ctx) {
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  const briefId = params.id;
  if (!briefId) return NextResponse.json({ error: "Missing brief id" }, { status: 400 });

  let body: { researcher_id?: string; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const researcherId = body.researcher_id;
  if (!researcherId) return NextResponse.json({ error: "ต้องระบุ researcher_id" }, { status: 400 });

  // Upsert (กัน duplicate)
  const { data, error } = await supabase
    .from("brief_interests")
    .upsert(
      {
        brief_id: briefId,
        researcher_id: researcherId,
        note: body.note || null,
        status: "submitted",
      },
      { onConflict: "brief_id,researcher_id" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, interest: data });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  const briefId = params.id;
  if (!briefId) return NextResponse.json({ error: "Missing brief id" }, { status: 400 });

  let body: { interest_id?: string; status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.interest_id || !body.status) {
    return NextResponse.json({ error: "ต้องระบุ interest_id + status" }, { status: 400 });
  }
  if (!["submitted", "shortlisted", "rejected", "accepted"].includes(body.status)) {
    return NextResponse.json({ error: "status ไม่ถูกต้อง" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("brief_interests")
    .update({ status: body.status })
    .eq("id", body.interest_id)
    .eq("brief_id", briefId)
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "ไม่พบ interest" }, { status: 404 });

  return NextResponse.json({ success: true, interest: data });
}
