import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

/**
 * /api/supabase/projects/[id]
 *
 * GET    — ดึงข้อมูลโครงการ + activities + kpis (ใช้สำหรับ /admin/projects/[id])
 * PATCH  — แก้ไขฟิลด์โครงการ (whitelist เฉพาะที่ admin ควรแก้)
 * DELETE — ลบโครงการ + cascade activities/kpis/reports/tokens (ผ่าน FK ON DELETE CASCADE)
 *
 * Admin gate: ปัจจุบันใช้ client-side (/admin → sessionStorage) — ตรงกับ pattern เดิม
 * (cleanup-parents). ในอนาคตควรเพิ่ม x-admin-password header validation
 */

export const dynamic = "force-dynamic";

// ฟิลด์ที่ admin แก้ได้ผ่าน PATCH (whitelist)
const PATCHABLE_FIELDS = new Set([
  "project_name",
  "responsible",
  "responsible_title",
  "phone",
  "organization",
  "main_program",
  "budget_total",
  "budget_used",
  "budget_remaining",
  "budget_reported",
  "fiscal_year",
  "project_period",
  "site",
  "status",
  "erp_code",
  "sdg_tags",
]);

interface RouteContext {
  params: { id: string };
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const id = params.id;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const [projectRes, activitiesRes, kpisRes] = await Promise.all([
    supabase.from("projects").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("activities")
      .select("*")
      .eq("project_id", id)
      .order("activity_order"),
    supabase.from("kpi_targets").select("*").eq("project_id", id),
  ]);

  if (projectRes.error || !projectRes.data) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({
    project: projectRes.data,
    activities: activitiesRes.data || [],
    kpis: kpisRes.data || [],
  });
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const id = params.id;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // กรองเฉพาะฟิลด์ที่อนุญาต
  const payload: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (PATCHABLE_FIELDS.has(k)) payload[k] = v;
  }
  if (Object.keys(payload).length === 0) {
    return NextResponse.json(
      { error: "ไม่มีฟิลด์ที่อนุญาต (allowed: " + Array.from(PATCHABLE_FIELDS).join(", ") + ")" },
      { status: 400 }
    );
  }
  payload.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("projects")
    .update(payload)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, project: data });
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const id = params.id;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  // ดึง project info ก่อน (สำหรับ confirm message + count cascade)
  const [{ data: project }, { count: actCount }, { count: kpiCount }, { count: reportCount }] =
    await Promise.all([
      supabase.from("projects").select("id, project_name, erp_code").eq("id", id).maybeSingle(),
      supabase.from("activities").select("*", { count: "exact", head: true }).eq("project_id", id),
      supabase.from("kpi_targets").select("*", { count: "exact", head: true }).eq("project_id", id),
      supabase.from("activity_reports").select("*", { count: "exact", head: true }).eq("project_id", id),
    ]);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // FK CASCADE จะลบ activities/kpis/reports/tokens อัตโนมัติ
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) {
    return NextResponse.json(
      {
        error: error.message,
        hint:
          "ถ้า error เป็น 'permission denied' → รัน supabase/schema.sql ใน Dashboard เพื่อเพิ่ม anon delete policy",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    deleted: {
      project: { id: project.id, project_name: project.project_name, erp_code: project.erp_code },
      activities: actCount || 0,
      kpis: kpiCount || 0,
      reports: reportCount || 0,
    },
  });
}
