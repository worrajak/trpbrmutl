import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { generateProjectId } from "@/lib/ngor9-prompt";

export async function POST(req: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const body = await req.json();
  const {
    project_name, responsible, responsible_title, phone,
    organization, budget_total, project_period, site,
    main_program, activities, kpi,
  } = body;

  if (!project_name) {
    return NextResponse.json({ error: "ต้องระบุชื่อโครงการ" }, { status: 400 });
  }

  const projectId = generateProjectId(project_name);

  // 1. Insert project
  const { error: projErr } = await supabase.from("projects").insert({
    id: projectId,
    main_program: main_program || "3.พัฒนากำลังคน",
    organization: organization || "",
    project_name,
    responsible: responsible || null,
    responsible_title: responsible_title || null,
    phone: phone || null,
    budget_total: budget_total || 0,
    budget_used: 0,
    budget_remaining: budget_total || 0,
    fiscal_year: 2569,
    project_period: project_period || null,
    site: site || null,
    status: "approved",
  });

  if (projErr) {
    return NextResponse.json({ error: "บันทึกโครงการ: " + projErr.message }, { status: 500 });
  }

  // 2. Insert activities
  if (activities && activities.length > 0) {
    const actRows = activities.map((a: { order: number; name: string; budget: number; planned_months: number[]; output: string }) => ({
      project_id: projectId,
      activity_order: a.order,
      activity_name: a.name,
      budget: a.budget || 0,
      planned_months: a.planned_months || [],
      expected_output: a.output || null,
      status: "not_started",
    }));

    const { error: actErr } = await supabase.from("activities").insert(actRows);
    if (actErr) {
      console.error("Activities error:", actErr.message);
    }
  }

  // 3. Insert KPI targets
  if (kpi) {
    const targets: Array<Record<string, unknown>> = [];

    if (kpi.quantitative) {
      for (const q of kpi.quantitative) {
        if (!q) continue;
        const numMatch = q.match(/[≥>]?\s*(\d+)\s+(คน|เครื่อง|ฉบับ|ชุด|บทความ|หลักสูตร|แปลง|ผลิตภัณฑ์|ระบบ|เครือข่าย|ชุมชน|ราย|องค์ความรู้)/);
        targets.push({
          project_id: projectId,
          kpi_name: q,
          kpi_type: "quantitative",
          target_value: numMatch ? parseInt(numMatch[1]) : 1,
          actual_value: 0,
          unit: numMatch ? numMatch[2] : "รายการ",
          verified: false,
        });
      }
    }

    if (kpi.qualitative) {
      for (const q of kpi.qualitative) {
        if (!q) continue;
        const pctMatch = q.match(/(\d+)\s*%/);
        targets.push({
          project_id: projectId,
          kpi_name: q,
          kpi_type: "qualitative",
          target_value: pctMatch ? parseInt(pctMatch[1]) : 80,
          actual_value: 0,
          unit: "%",
          verified: false,
        });
      }
    }

    if (kpi.time_target) {
      const pct = kpi.time_target.match(/(\d+)/);
      targets.push({
        project_id: projectId,
        kpi_name: kpi.time_target,
        kpi_type: "time",
        target_value: pct ? parseInt(pct[1]) : 85,
        actual_value: 0,
        unit: "%",
        verified: false,
      });
    }

    if (kpi.budget_target) {
      const pct = kpi.budget_target.match(/(\d+)/);
      targets.push({
        project_id: projectId,
        kpi_name: kpi.budget_target,
        kpi_type: "budget",
        target_value: pct ? parseInt(pct[1]) : 95,
        actual_value: 0,
        unit: "%",
        verified: false,
      });
    }

    if (targets.length > 0) {
      const { error: kpiErr } = await supabase.from("kpi_targets").insert(targets);
      if (kpiErr) console.error("KPI error:", kpiErr.message);
    }
  }

  // 4. Create token for the project
  const tokenCode = String(100000 + Math.floor(Math.random() * 899999));
  try {
    await supabase.from("project_tokens").insert({
      project_id: projectId,
      token_code: tokenCode,
      responsible_name: responsible || organization || "หัวหน้าโครงการ",
      is_active: true,
    });
    await supabase.from("reward_balance").insert({
      token_code: tokenCode,
      total_rpf: 0,
      report_count: 0,
      streak_count: 0,
    });
  } catch { /* token tables may not exist */ }

  return NextResponse.json({
    success: true,
    project_id: projectId,
    token_code: tokenCode,
  });
}
