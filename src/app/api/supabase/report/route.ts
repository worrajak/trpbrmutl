import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { calculateAndGrantReward } from "@/lib/reward-engine";

// POST: ส่งรายงานกิจกรรม + ตอบ KPI + งบที่ใช้ + reward
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
    budget_spent,
    kpi_contributions,
    token_code,
  } = body;

  if (!project_id || !activity_id || !submitted_by) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // ตรวจ token ถ้ามี
  if (token_code) {
    const { data: token } = await supabase
      .from("project_tokens")
      .select("project_id")
      .eq("token_code", token_code)
      .eq("is_active", true)
      .single();

    if (!token || token.project_id !== project_id) {
      return NextResponse.json({ error: "Token ไม่ถูกต้องสำหรับโครงการนี้" }, { status: 401 });
    }
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

  // 3. Insert KPI contributions + evidence + participants
  if (kpi_contributions && kpi_contributions.length > 0) {
    for (const kc of kpi_contributions) {
      // Insert contribution record
      await supabase.from("kpi_contributions").insert({
        kpi_target_id: kc.kpi_target_id,
        report_id: report.id,
        contribution_value: kc.value,
        evidence: kc.evidence_desc || "",
        reported_by: submitted_by,
      });

      // Insert KPI evidence (หลักฐาน) - optional, ไม่ block ถ้าตารางยังไม่มี
      if (kc.evidence_url) {
        try {
          await supabase.from("kpi_evidence").insert({
            kpi_target_id: kc.kpi_target_id,
            report_id: report.id,
            evidence_type: kc.evidence_type || "link",
            evidence_url: kc.evidence_url,
            description: kc.evidence_desc || "",
            uploaded_by: submitted_by,
          });
        } catch { /* table may not exist yet */ }
      }

      // Insert participants (รายชื่อผู้เข้าร่วม) - optional
      if (kc.participants && kc.participants.length > 0) {
        try {
          const participantRows = kc.participants
            .filter((p: { full_name: string }) => p.full_name.trim())
            .map((p: { full_name: string; participant_type: string; student_id: string; organization: string }) => ({
              project_id,
              report_id: report.id,
              full_name: p.full_name.trim(),
              participant_type: p.participant_type,
              student_id: p.student_id || null,
              organization: p.organization || null,
            }));

          if (participantRows.length > 0) {
            await supabase.from("participants").insert(participantRows);
          }
        } catch { /* table may not exist yet */ }
      }

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

  // 5. คำนวณ + ให้ reward (ถ้ามี token)
  let rewardResult = null;
  if (token_code) {
    rewardResult = await calculateAndGrantReward(
      report.id,
      project_id,
      token_code,
      activity_id,
      kpi_contributions || []
    );
  }

  return NextResponse.json({
    success: true,
    report_id: report.id,
    reward: rewardResult,
  });
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
