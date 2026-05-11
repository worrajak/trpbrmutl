import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

/**
 * POST /api/researchers/register
 *
 * Public endpoint — researcher self-register
 *
 * Body: {
 *   name *, title?, faculty?, department?, email *, phone?,
 *   expertise_tags[] *, areas[]?, bio?, external_link?,
 *   honeypot?  (ห้ามกรอก · bot trap)
 * }
 *
 * Result: insert is_active=false (pending) → admin approve ภายหลัง
 */

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // 1. Honeypot check (bot trap — ถ้ามีค่า = bot)
  if (typeof body.honeypot === "string" && body.honeypot.length > 0) {
    // เงียบ ๆ คืน success ให้ bot ไม่รู้ว่าโดนจับ
    return NextResponse.json({ success: true });
  }

  // 2. Validate
  const name = (body.name as string || "").trim();
  const email = (body.email as string || "").trim();
  if (!name || name.length < 3) {
    return NextResponse.json({ error: "ต้องระบุชื่อ-นามสกุล (อย่างน้อย 3 ตัว)" }, { status: 400 });
  }
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "ต้องระบุ email ที่ถูกต้อง" }, { status: 400 });
  }
  const tags = Array.isArray(body.expertise_tags) ? (body.expertise_tags as string[]) : [];
  if (tags.length === 0) {
    return NextResponse.json({ error: "ต้องเลือก expertise tag อย่างน้อย 1 อัน" }, { status: 400 });
  }

  // 3. กัน email ซ้ำ
  const { data: existing } = await supabase
    .from("rpf_researchers")
    .select("id, name, is_active")
    .eq("email", email)
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      {
        error: existing.is_active
          ? "Email นี้มีในระบบแล้ว กรุณาติดต่อ admin หากต้องการแก้ไข"
          : "Email นี้รอ admin approve อยู่ กรุณารอสักครู่",
      },
      { status: 409 }
    );
  }

  // 4. Insert (is_active=false → pending)
  const row = {
    name,
    title: (body.title as string) || null,
    faculty: (body.faculty as string) || null,
    department: (body.department as string) || null,
    email,
    phone: (body.phone as string) || null,
    expertise_tags: tags,
    areas: Array.isArray(body.areas) ? body.areas : [],
    past_projects: [],
    level: ["junior", "mid", "senior"].includes(body.level as string) ? body.level : "mid",
    bio: (body.bio as string) || null,
    external_link: (body.external_link as string) || null,
    is_active: false, // pending — admin approve
  };

  const { data, error } = await supabase
    .from("rpf_researchers")
    .insert(row)
    .select("id, name")
    .single();

  if (error) {
    return NextResponse.json({ error: "บันทึกไม่สำเร็จ: " + error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: "ลงทะเบียนสำเร็จ · admin จะ review ภายใน 24 ชั่วโมง",
    researcher_id: data.id,
  });
}
