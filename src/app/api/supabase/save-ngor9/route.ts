import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { generateProjectId } from "@/lib/ngor9-prompt";

/**
 * POST /api/supabase/save-ngor9
 *
 * 2 modes:
 *   1) INSERT mode (default)         — สร้างโครงการใหม่ + activities + kpis + token
 *   2) MERGE mode (merge_into_id)    — UPDATE โครงการเดิม + REPLACE activities/kpis
 *      → ใช้ตอนที่ admin match กับโครงการที่มีอยู่แล้ว (จาก Excel/ERP)
 *
 * MERGE mode rules:
 *   - project: update เฉพาะฟิลด์ที่ NGOR9 ให้ข้อมูล "ดีกว่า" (ไม่ทับของเก่าที่มีค่า)
 *   - budget_strategy:
 *       "keep" (default) — เก็บ budget_total เดิม (ปกติมาจาก ERP/Excel ที่แม่นกว่า)
 *       "ngor9"          — ใช้ budget_total จาก NGOR9 แทน (ถ้า admin บอกว่างบเดิมไม่สมเหตุสมผล)
 *   - budget_used / budget_remaining: ไม่แตะ (มาจาก ERP)
 *   - activities: REPLACE ทั้งหมด (NGOR9 = source of truth ของแผนกิจกรรม)
 *   - kpi_targets: REPLACE ทั้งหมด (เก็บเฉพาะ is_additional=true ที่ admin เพิ่มเอง)
 *   - token: คงของเดิม (ไม่สร้างใหม่)
 */

interface ActivityIn {
  order: number;
  name: string;
  budget: number;
  planned_months: number[];
  output: string;
}

interface KpiIn {
  quantitative?: string[];
  qualitative?: string[];
  time_target?: string;
  budget_target?: string;
}

type ListStrategy = "replace" | "append" | "keep";

interface SaveBody {
  project_name: string;
  responsible?: string | null;
  responsible_title?: string | null;
  phone?: string | null;
  organization?: string | null;
  budget_total?: number;
  project_period?: string | null;
  site?: string | null;
  main_program?: string | null;
  activities?: ActivityIn[];
  kpi?: KpiIn;
  fiscal_year?: number;

  // MERGE mode
  merge_into_id?: string | null;
  budget_strategy?: "keep" | "ngor9";
  // ใหม่: ให้ admin เลือกว่าจะจัดการกับของเดิมยังไง
  // - replace: ลบของเดิมหมด แล้วใส่ของ ง9 (พฤติกรรมเดิม)
  // - append: คงของเดิม แล้วเติมของ ง9 ต่อท้าย (renumber order)
  // - keep: ไม่แตะของเดิม + ไม่ใส่ของ ง9 (ใช้เมื่อของเดิมดีอยู่แล้ว)
  activities_strategy?: ListStrategy;
  kpis_strategy?: ListStrategy;
}

/** Build kpi_targets rows จาก parsed KPI */
function buildKpiRows(projectId: string, kpi: KpiIn | undefined): Array<Record<string, unknown>> {
  const targets: Array<Record<string, unknown>> = [];
  if (!kpi) return targets;

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
  return targets;
}

/** Build activity rows */
function buildActivityRows(projectId: string, activities: ActivityIn[] | undefined): Array<Record<string, unknown>> {
  if (!activities || activities.length === 0) return [];
  return activities.map((a) => ({
    project_id: projectId,
    activity_order: a.order,
    activity_name: a.name || `กิจกรรมที่ ${a.order}`,
    budget: a.budget || 0,
    planned_months: a.planned_months || [],
    expected_output: a.output || null,
    status: "not_started",
  }));
}

export async function POST(req: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const body = (await req.json()) as SaveBody;
  if (!body.project_name) {
    return NextResponse.json({ error: "ต้องระบุชื่อโครงการ" }, { status: 400 });
  }

  const fiscal_year = body.fiscal_year || 2569;
  const isMerge = !!body.merge_into_id;
  const warnings: string[] = [];

  // ============================================================
  // MERGE MODE
  // ============================================================
  if (isMerge && body.merge_into_id) {
    const targetId = body.merge_into_id;

    // 1. Verify target exists
    const { data: target } = await supabase
      .from("projects")
      .select("id, project_name, budget_total, budget_used, budget_remaining, fiscal_year, erp_code")
      .eq("id", targetId)
      .maybeSingle();

    if (!target) {
      return NextResponse.json(
        { error: `ไม่พบโครงการเป้าหมาย id=${targetId}` },
        { status: 404 }
      );
    }

    // 2. UPDATE project — เลือก field เฉพาะที่ NGOR9 ให้ข้อมูล (ไม่ทับ null/empty)
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    // ฟิลด์ที่ NGOR9 มักดีกว่า → ใส่ถ้ามีค่า
    if (body.responsible) updates.responsible = body.responsible;
    if (body.responsible_title) updates.responsible_title = body.responsible_title;
    if (body.phone) updates.phone = body.phone;
    if (body.organization) updates.organization = body.organization;
    if (body.project_period) updates.project_period = body.project_period;
    if (body.site) updates.site = body.site;
    if (body.main_program) updates.main_program = body.main_program;

    // ชื่อโครงการ — ใช้ของ NGOR9 เพราะมักเป็นชื่อทางการเต็ม
    if (body.project_name) updates.project_name = body.project_name;

    // งบ — ตาม strategy
    const newBudget = Number(body.budget_total || 0);
    const oldBudget = Number(target.budget_total || 0);
    const strategy = body.budget_strategy || "keep";
    if (strategy === "ngor9" && newBudget > 0) {
      updates.budget_total = newBudget;
      // คำนวณ remaining ใหม่ จากของ ERP ที่มีอยู่
      const used = Number(target.budget_used || 0);
      updates.budget_remaining = Math.max(newBudget - used, 0);
      warnings.push(`อัปเดตงบประมาณตาม ง9: ${oldBudget.toLocaleString()} → ${newBudget.toLocaleString()}`);
    } else if (strategy === "keep" && newBudget > 0 && Math.abs(newBudget - oldBudget) > 1) {
      warnings.push(`ง9 ระบุงบ ${newBudget.toLocaleString()} แต่เก็บของเดิม ${oldBudget.toLocaleString()} (ตาม Excel/ERP)`);
    }

    const { error: updErr } = await supabase
      .from("projects")
      .update(updates)
      .eq("id", targetId);

    if (updErr) {
      return NextResponse.json(
        { error: "อัปเดตโครงการล้มเหลว: " + updErr.message },
        { status: 500 }
      );
    }

    // 3. ACTIVITIES — จัดการตาม activities_strategy
    // - replace: ลบของเดิมหมด → INSERT ของ ง9
    // - append:  คงของเดิม → INSERT ของ ง9 ต่อท้าย (renumber order)
    // - keep:    ไม่แตะของเดิม + ไม่ใส่ของ ง9
    // ค่า default = "replace" (พฤติกรรมเดิม) แต่ฝั่ง UI จะแนะนำ "append" ถ้าของเดิมมี > 0
    const actStrategy: ListStrategy = body.activities_strategy || "replace";
    const { count: oldActCount } = await supabase
      .from("activities")
      .select("*", { count: "exact", head: true })
      .eq("project_id", targetId);

    let activitiesInserted = 0;
    let activitiesReplaced = 0;
    let activitiesKept = 0;
    const newActsRaw = body.activities || [];

    if (actStrategy === "keep") {
      activitiesKept = oldActCount || 0;
      if (newActsRaw.length > 0) {
        warnings.push(`ℹ คงกิจกรรมเดิม ${oldActCount} รายการไว้ (ทิ้งกิจกรรม ง9 ${newActsRaw.length} รายการ)`);
      }
    } else if (actStrategy === "append") {
      // หา max activity_order ของเดิม → renumber ของใหม่ต่อจากนั้น
      const { data: maxRow } = await supabase
        .from("activities")
        .select("activity_order")
        .eq("project_id", targetId)
        .order("activity_order", { ascending: false })
        .limit(1)
        .maybeSingle();
      const startOrder = (maxRow?.activity_order || 0) + 1;
      const renumbered = newActsRaw.map((a, i) => ({ ...a, order: startOrder + i }));
      const actRows = buildActivityRows(targetId, renumbered);
      activitiesKept = oldActCount || 0;
      if (actRows.length > 0) {
        const { data: ins, error: insErr } = await supabase.from("activities").insert(actRows).select("id");
        if (insErr) warnings.push(`เพิ่มกิจกรรม ง9 ล้มเหลว: ${insErr.message}`);
        else activitiesInserted = ins?.length || actRows.length;
      } else if ((oldActCount || 0) === 0) {
        warnings.push("⚠ ทั้ง ง9 และของเดิมไม่มีกิจกรรม — เพิ่มเองได้ที่ /admin/projects");
      }
    } else {
      // replace (default)
      const actRows = buildActivityRows(targetId, newActsRaw);
      if (actRows.length > 0) {
        const { error: delActErr } = await supabase.from("activities").delete().eq("project_id", targetId);
        if (delActErr) warnings.push(`ลบกิจกรรมเดิมไม่สำเร็จ: ${delActErr.message}`);
        else activitiesReplaced = oldActCount || 0;

        const { data: ins, error: insErr } = await supabase.from("activities").insert(actRows).select("id");
        if (insErr) warnings.push(`เพิ่มกิจกรรมใหม่ล้มเหลว: ${insErr.message}`);
        else activitiesInserted = ins?.length || actRows.length;
      } else if ((oldActCount || 0) > 0) {
        // safety: ง9 ว่าง + เดิมมี → คงของเดิมไว้ (ไม่ลบ) ถึงจะเลือก replace
        activitiesKept = oldActCount || 0;
        warnings.push(`⚠ AI ไม่พบกิจกรรมใน ง9 → คงกิจกรรมเดิม ${oldActCount} รายการไว้ (ไม่ลบ)`);
      } else {
        warnings.push("⚠ ทั้ง ง9 และของเดิมไม่มีกิจกรรม — เพิ่มเองได้ที่ /admin/projects");
      }
    }

    // 4. KPI_TARGETS — จัดการตาม kpis_strategy (logic เดียวกับ activities)
    const kpiStrategy: ListStrategy = body.kpis_strategy || "replace";
    const { count: oldKpiCount } = await supabase
      .from("kpi_targets")
      .select("*", { count: "exact", head: true })
      .eq("project_id", targetId);

    let kpisInserted = 0;
    let kpisReplaced = 0;
    let kpisKept = 0;
    const kpiRows = buildKpiRows(targetId, body.kpi);

    if (kpiStrategy === "keep") {
      kpisKept = oldKpiCount || 0;
      if (kpiRows.length > 0) {
        warnings.push(`ℹ คง KPI เดิม ${oldKpiCount} รายการไว้ (ทิ้ง KPI ง9 ${kpiRows.length} รายการ)`);
      }
    } else if (kpiStrategy === "append") {
      kpisKept = oldKpiCount || 0;
      if (kpiRows.length > 0) {
        const { data: ins, error: insErr } = await supabase.from("kpi_targets").insert(kpiRows).select("id");
        if (insErr) warnings.push(`เพิ่ม KPI ง9 ล้มเหลว: ${insErr.message}`);
        else kpisInserted = ins?.length || kpiRows.length;
      }
    } else {
      // replace
      if (kpiRows.length > 0) {
        const { error: delKpiErr } = await supabase
          .from("kpi_targets")
          .delete()
          .eq("project_id", targetId)
          .or("is_additional.is.null,is_additional.eq.false");
        if (delKpiErr) warnings.push(`ลบ KPI เดิมไม่สำเร็จ: ${delKpiErr.message}`);
        else kpisReplaced = oldKpiCount || 0;

        const { data: ins, error: insErr } = await supabase.from("kpi_targets").insert(kpiRows).select("id");
        if (insErr) warnings.push(`เพิ่ม KPI ใหม่ล้มเหลว: ${insErr.message}`);
        else kpisInserted = ins?.length || kpiRows.length;
      } else if ((oldKpiCount || 0) > 0) {
        kpisKept = oldKpiCount || 0;
        warnings.push(`⚠ AI ไม่พบ KPI ใน ง9 → คง KPI เดิม ${oldKpiCount} รายการไว้`);
      }
    }

    // 5. Token — หา token ที่มีอยู่ ไม่สร้างใหม่
    const { data: existingToken } = await supabase
      .from("project_tokens")
      .select("token_code")
      .eq("project_id", targetId)
      .eq("is_active", true)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      mode: "merge",
      project_id: targetId,
      token_code: existingToken?.token_code || null,
      fiscal_year: target.fiscal_year || fiscal_year,
      activities_inserted: activitiesInserted,
      activities_total: body.activities?.length || 0,
      activities_replaced: activitiesReplaced,
      activities_kept: activitiesKept,
      activities_strategy: actStrategy,
      kpis_inserted: kpisInserted,
      kpis_replaced: kpisReplaced,
      kpis_kept: kpisKept,
      kpis_strategy: kpiStrategy,
      budget_strategy: strategy,
      warnings,
    });
  }

  // ============================================================
  // INSERT MODE (default — เดิม)
  // ============================================================
  const projectId = generateProjectId(body.project_name);

  // ตรวจซ้ำ: ผู้รับผิดชอบเดียวกัน + ปีเดียวกัน (เป็นเพียง warning ไม่ block)
  const { data: existing } = await supabase
    .from("projects")
    .select("id, project_name, responsible, fiscal_year")
    .eq("fiscal_year", fiscal_year)
    .ilike("responsible", body.responsible || "");

  let duplicateInfo = null;
  if (existing && existing.length > 0) {
    duplicateInfo = existing.map((e) => ({
      id: e.id,
      project_name: e.project_name,
      responsible: e.responsible,
    }));
  }

  // 1. Insert project
  const { error: projErr } = await supabase.from("projects").insert({
    id: projectId,
    main_program: body.main_program || "3.พัฒนากำลังคน",
    organization: body.organization || "",
    project_name: body.project_name,
    responsible: body.responsible || null,
    responsible_title: body.responsible_title || null,
    phone: body.phone || null,
    budget_total: body.budget_total || 0,
    budget_used: 0,
    budget_remaining: body.budget_total || 0,
    fiscal_year,
    project_period: body.project_period || null,
    site: body.site || null,
    status: "approved",
  });
  if (projErr) {
    return NextResponse.json({ error: "บันทึกโครงการ: " + projErr.message }, { status: 500 });
  }

  // 2. Insert activities
  let activitiesInserted = 0;
  let activitiesError: string | null = null;
  const actRows = buildActivityRows(projectId, body.activities);
  if (actRows.length > 0) {
    const { data: ins, error: actErr } = await supabase.from("activities").insert(actRows).select("id");
    if (actErr) activitiesError = actErr.message;
    else activitiesInserted = ins?.length || actRows.length;
  }

  // 3. Insert KPI targets
  let kpisInserted = 0;
  let kpisError: string | null = null;
  const kpiRows = buildKpiRows(projectId, body.kpi);
  if (kpiRows.length > 0) {
    const { data: ins, error: kpiErr } = await supabase.from("kpi_targets").insert(kpiRows).select("id");
    if (kpiErr) kpisError = kpiErr.message;
    else kpisInserted = ins?.length || kpiRows.length;
  }

  // 4. Create token
  const tokenCode = String(100000 + Math.floor(Math.random() * 899999));
  try {
    await supabase.from("project_tokens").insert({
      project_id: projectId,
      token_code: tokenCode,
      responsible_name: body.responsible || body.organization || "หัวหน้าโครงการ",
      is_active: true,
    });
    await supabase.from("reward_balance").insert({
      token_code: tokenCode,
      total_rpf: 0,
      report_count: 0,
      streak_count: 0,
    });
  } catch {
    /* token tables may not exist */
  }

  // Build warnings
  if (!body.activities || body.activities.length === 0) {
    warnings.push("⚠ AI ไม่พบกิจกรรมใน PDF — ลองเปลี่ยน model/engine แล้ว parse ใหม่ หรือเพิ่มกิจกรรมเองในหน้า /admin/projects");
  } else if (activitiesError) {
    warnings.push(`⚠ บันทึกกิจกรรมล้มเหลว (${activitiesInserted}/${body.activities.length}): ${activitiesError}`);
  } else if (activitiesInserted < body.activities.length) {
    warnings.push(`⚠ บันทึกกิจกรรมไม่ครบ: ${activitiesInserted}/${body.activities.length}`);
  }
  if (kpisError) {
    warnings.push(`⚠ บันทึก KPI ล้มเหลว: ${kpisError}`);
  }

  return NextResponse.json({
    success: true,
    mode: "insert",
    project_id: projectId,
    token_code: tokenCode,
    fiscal_year,
    duplicate_warning: duplicateInfo,
    activities_inserted: activitiesInserted,
    activities_total: body.activities?.length || 0,
    kpis_inserted: kpisInserted,
    warnings,
  });
}
