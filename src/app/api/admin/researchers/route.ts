import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { SAMPLE_RESEARCHERS } from "@/lib/researcher-tags";

/**
 * /api/admin/researchers
 *
 * GET   — list ทั้งหมด (รวมที่ inactive)
 * POST  — create new (ฟอร์มใน /admin/researchers)
 *         body { seed_samples: true } → seed 5 sample researchers
 */

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  const { data, error } = await supabase
    .from("researchers")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    { researchers: data || [] },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(req: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Seed sample mode
  if (body.seed_samples === true) {
    // ตรวจว่ามีของเดิมไหม — ป้องกันซ้ำ
    const { count } = await supabase
      .from("researchers")
      .select("*", { count: "exact", head: true });
    if ((count || 0) > 0) {
      return NextResponse.json(
        { error: `มีนักวิจัยอยู่แล้ว ${count} คน — ลบก่อนถ้าต้องการ seed ใหม่` },
        { status: 409 }
      );
    }
    const rows = SAMPLE_RESEARCHERS.map((s) => ({
      name: s.name,
      title: s.title || null,
      faculty: s.faculty || null,
      email: s.email || null,
      expertise_tags: s.expertise_tags,
      areas: s.areas,
      level: s.level,
      bio: s.bio || null,
      is_active: true,
    }));
    const { data, error } = await supabase.from("researchers").insert(rows).select();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, seeded: data?.length || 0, researchers: data });
  }

  // Normal create
  const name = (body.name as string || "").trim();
  if (!name) return NextResponse.json({ error: "ต้องระบุชื่อ" }, { status: 400 });

  const row = {
    name,
    title: (body.title as string) || null,
    faculty: (body.faculty as string) || null,
    department: (body.department as string) || null,
    email: (body.email as string) || null,
    phone: (body.phone as string) || null,
    expertise_tags: Array.isArray(body.expertise_tags) ? body.expertise_tags : [],
    areas: Array.isArray(body.areas) ? body.areas : [],
    past_projects: Array.isArray(body.past_projects) ? body.past_projects : [],
    level: ["junior", "mid", "senior"].includes(body.level as string) ? body.level : "mid",
    bio: (body.bio as string) || null,
    external_link: (body.external_link as string) || null,
    is_active: true,
  };

  const { data, error } = await supabase.from("researchers").insert(row).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, researcher: data });
}
