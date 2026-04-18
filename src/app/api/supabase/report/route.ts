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
    new_kpis,       // ตัวชี้วัดใหม่ที่ หน.โครงการ เพิ่มเอง
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

  // 4. บันทึก budget_spent ใน activity_reports และอัปเดต budget_reported บน project
  if (budget_spent && Number(budget_spent) > 0) {
    // บันทึกยอดที่รายงานไว้กับ report record
    await supabase
      .from("activity_reports")
      .update({ budget_spent: Number(budget_spent) })
      .eq("id", report.id);

    // ดึงข้อมูล project
    const { data: proj } = await supabase
      .from("projects")
      .select("budget_total, budget_used, budget_reported")
      .eq("id", project_id)
      .single();

    if (proj) {
      const erp      = Number(proj.budget_used     || 0); // จาก Excel sync — ไม่แตะ
      const reported = Number(proj.budget_reported  || 0) + Number(budget_spent); // สะสมจากรายงาน
      const total    = Number(proj.budget_total     || 0);

      // effective_used = ใช้ค่าสูงสุดระหว่าง ERP กับรายงาน
      const effectiveUsed = Math.max(erp, reported);

      // advance = หน.ออกเองก่อน (reported > erp)
      const advance = Math.max(0, reported - erp);

      await supabase
        .from("projects")
        .update({
          budget_reported:  reported,
          budget_advance:   advance,
          budget_remaining: Math.max(0, total - effectiveUsed),
          updated_at:       new Date().toISOString(),
        })
        .eq("id", project_id);
    }
  }

  // 5. สร้าง KPI ใหม่ที่ หน.โครงการ เพิ่มระหว่างโครงการ
  const createdNewKpis: Array<{ kpi_name: string; verified: boolean }> = [];

  if (new_kpis && Array.isArray(new_kpis) && new_kpis.length > 0) {
    for (const nk of new_kpis as Array<{
      kpi_name: string; kpi_type: string;
      target_value: number; actual_value: number; unit: string;
    }>) {
      if (!nk.kpi_name?.trim()) continue;

      const target  = Number(nk.target_value) || 1;
      const actual  = Number(nk.actual_value) || 0;
      const verified = actual >= target;

      const { data: newKpi } = await supabase.from("kpi_targets").insert({
        project_id,
        kpi_name:    nk.kpi_name.trim(),
        kpi_type:    nk.kpi_type || "quantitative",
        target_value: target,
        actual_value: actual,
        unit:        nk.unit || "รายการ",
        verified,
        is_additional: true,   // flag ว่าเป็นตัวชี้วัดเพิ่มเติม
      }).select().single();

      // บันทึก contribution ทันทีถ้ามีค่าเริ่มต้น
      if (newKpi && actual > 0) {
        await supabase.from("kpi_contributions").insert({
          kpi_target_id: newKpi.id,
          report_id: report.id,
          contribution_value: actual,
          evidence: `เพิ่มโดย ${submitted_by}`,
          reported_by: submitted_by,
        });
      }

      createdNewKpis.push({ kpi_name: nk.kpi_name.trim(), verified });
    }
  }

  // 6. คำนวณ + ให้ reward (ถ้ามี token)
  let rewardResult = null;
  if (token_code) {
    rewardResult = await calculateAndGrantReward(
      report.id,
      project_id,
      token_code,
      activity_id,
      kpi_contributions || [],
      createdNewKpis
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
