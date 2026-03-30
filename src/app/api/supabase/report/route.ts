import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

// POST: ส่งรายงานกิจกรรม + ตอบ KPI + งบที่ใช้
export async function POST(req: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const body = await req.json();
  const {
    project_id,
    activity_id,
    report_description,
    evidence_url,
    submitted_by,
    activity_status,
    activity_progress,
    budget_spent,
    kpi_contributions,
  } = body;

  if (!project_id || !activity_id || !submitted_by) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // 1. Insert activity report
  const { data: report, error: reportErr } = await supabase
    .from("activity_reports")
    .insert({
      project_id,
      activity_id,
      report_description: report_description || "",
      evidence_url: evidence_url || null,
      submitted_by,
      approval_status: "approved", // auto-approve for now
    })
    .select()
    .single();

  if (reportErr) {
    return NextResponse.json({ error: reportErr.message }, { status: 500 });
  }

  // 2. Update activity status
  if (activity_status) {
    await supabase
      .from("activities")
      .update({ status: activity_status })
      .eq("id", activity_id);
  }

  // 3. Insert KPI contributions
  if (kpi_contributions && kpi_contributions.length > 0) {
    for (const kc of kpi_contributions) {
      // Insert contribution record
      await supabase.from("kpi_contributions").insert({
        kpi_target_id: kc.kpi_target_id,
        report_id: report.id,
        contribution_value: kc.value,
        evidence: kc.evidence || "",
        reported_by: submitted_by,
      });

      // Update actual_value in kpi_targets (สะสม)
      const { data: kpi } = await supabase
        .from("kpi_targets")
        .select("actual_value, target_value")
        .eq("id", kc.kpi_target_id)
        .single();

      if (kpi) {
        const newActual = Number(kpi.actual_value) + Number(kc.value);
        const verified = newActual >= Number(kpi.target_value);
        await supabase
          .from("kpi_targets")
          .update({
            actual_value: newActual,
            verified,
            updated_at: new Date().toISOString(),
          })
          .eq("id", kc.kpi_target_id);
      }
    }
  }

  // 4. Update self-reported budget on project
  if (budget_spent && Number(budget_spent) > 0) {
    const { data: proj } = await supabase
      .from("projects")
      .select("budget_used, budget_total")
      .eq("id", project_id)
      .single();

    if (proj) {
      // budget_used ใช้สำหรับ self-report (ผู้ดำเนินงาน)
      // ส่วน ERP จะ sync แยกจาก Google Sheets
      const newUsed = Number(proj.budget_used) + Number(budget_spent);
      await supabase
        .from("projects")
        .update({
          budget_used: newUsed,
          budget_remaining: Number(proj.budget_total) - newUsed,
          updated_at: new Date().toISOString(),
        })
        .eq("id", project_id);
    }
  }

  return NextResponse.json({ success: true, report_id: report.id });
}

// GET: ดึงประวัติรายงานของโครงการ
export async function GET(req: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ reports: [] });
  }

  const projectId = req.nextUrl.searchParams.get("project_id");
  if (!projectId) {
    return NextResponse.json({ error: "Missing project_id" }, { status: 400 });
  }

  // Get reports with activity info
  const { data: reports } = await supabase
    .from("activity_reports")
    .select("*, activities(activity_order, activity_name)")
    .eq("project_id", projectId)
    .order("submitted_at", { ascending: false });

  // Get KPI contributions for each report
  const reportIds = (reports || []).map((r: { id: string }) => r.id);
  let contributions: Record<string, Array<{ kpi_target_id: string; contribution_value: number; kpi_targets: { kpi_name: string; unit: string } | null }>> = {};

  if (reportIds.length > 0) {
    const { data: kpiContribs } = await supabase
      .from("kpi_contributions")
      .select("*, kpi_targets(kpi_name, unit)")
      .in("report_id", reportIds);

    if (kpiContribs) {
      for (const kc of kpiContribs) {
        if (!contributions[kc.report_id]) contributions[kc.report_id] = [];
        contributions[kc.report_id].push(kc);
      }
    }
  }

  return NextResponse.json({
    reports: (reports || []).map((r: { id: string }) => ({
      ...r,
      kpi_contributions: contributions[r.id] || [],
    })),
  });
}
