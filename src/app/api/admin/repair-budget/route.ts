import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

// POST /api/admin/repair-budget
// แก้ไขข้อมูลงบประมาณที่ corrupt จากโค้ดเวอร์ชันเก่า
//
// Logic:
// - budget_used ควรมาจาก ERP/Excel เท่านั้น (source of truth)
// - budget_reported ควร = SUM(activity_reports.budget_spent)
// - ถ้า budget_used > budget_total + budget_reported → corrupt จากโค้ดเก่าที่บวกซ้ำ
//   → reset budget_used = budget_used - budget_reported (ค่าเดิมก่อนถูกบวก)
//
// body: { dry_run: true } — แค่วิเคราะห์ ไม่แก้
// body: { dry_run: false, project_id?: string } — แก้จริง (ทุกโครงการ หรือโครงการเดียว)

export async function POST(req: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  const body = await req.json().catch(() => ({}));
  const { dry_run = true, project_id } = body;

  // 1. ดึงโครงการ — รองรับทั้ง id (slug) และ erp_code
  let projQuery = supabase.from("projects").select("id, erp_code, project_name, budget_total, budget_used, budget_reported");
  if (project_id) {
    const key = String(project_id).trim();
    projQuery = projQuery.or(`id.eq.${key},erp_code.eq.${key}`);
  }

  const { data: projects, error: projErr } = await projQuery;
  if (projErr) return NextResponse.json({ error: projErr.message }, { status: 500 });
  if (!projects || projects.length === 0) {
    return NextResponse.json({
      dry_run,
      total_projects: 0,
      needs_fix: 0,
      corrupt: 0,
      mismatch_only: 0,
      analysis: [],
      hint: project_id ? `ไม่พบโครงการที่ id หรือ erp_code = "${project_id}"` : undefined,
    });
  }

  // 2. ดึง sum ของ budget_spent จาก activity_reports สำหรับทุกโครงการ
  const { data: reports } = await supabase
    .from("activity_reports")
    .select("project_id, budget_spent");

  const reportedSum = new Map<string, number>();
  for (const r of reports || []) {
    const v = Number(r.budget_spent || 0);
    if (v > 0) {
      reportedSum.set(r.project_id, (reportedSum.get(r.project_id) || 0) + v);
    }
  }

  // 3. วิเคราะห์และซ่อม
  const analysis = [];
  for (const p of projects) {
    const total         = Number(p.budget_total    || 0);
    const erpStored     = Number(p.budget_used     || 0);
    const reportedStored= Number(p.budget_reported || 0);
    // activity_reports.project_id อาจเก็บเป็น id (slug) หรือ erp_code — ลองทั้งสอง
    const actualReported= (reportedSum.get(p.id) || 0) + (p.erp_code && p.erp_code !== p.id ? (reportedSum.get(p.erp_code) || 0) : 0);

    // ตรวจความ corrupt:
    // (A) ถ้า erp > total → ผิดแน่ (ERP ไม่น่าเกินงบรวม) — reset = erp - reported_actual
    // (B) ถ้า erp ใกล้เคียง (erp - reported) + reported → ชัดเจนว่าเป็น bug บวกซ้ำ
    const suspectedErp     = Math.max(0, erpStored - actualReported);
    const overBudget       = erpStored > total + 0.5;
    const matchesAddBug    = actualReported > 0 && Math.abs(erpStored - (suspectedErp + actualReported)) < 1;
    const isCorrupt        = overBudget || matchesAddBug;
    const reportedMismatch = Math.abs(reportedStored - actualReported) > 0.5;

    // ถ้า corrupt → ใช้ suspectedErp (ถอยกลับก่อนถูกบวก)
    //   แต่ถ้า actualReported = 0 และยัง over budget → clamp ที่ total
    let proposedUsed = erpStored;
    if (isCorrupt) {
      if (actualReported > 0) {
        proposedUsed = suspectedErp;
      } else if (overBudget) {
        // ไม่มีรายงาน แต่ erp เกิน total → clamp ที่ total (ข้อมูลเดิมหายหมดแล้ว)
        proposedUsed = total;
      }
    }

    const proposed = {
      budget_used:     proposedUsed,
      budget_reported: actualReported,
    };

    const needsFix = isCorrupt || reportedMismatch;

    analysis.push({
      project_id: p.id,
      project_name: p.project_name,
      before: {
        total,
        budget_used: erpStored,
        budget_reported: reportedStored,
      },
      actual_reported_sum: actualReported,
      after: proposed,
      is_corrupt: isCorrupt,
      reported_mismatch: reportedMismatch,
      needs_fix: needsFix,
    });

    // 4. ถ้าไม่ใช่ dry-run และต้องแก้ → อัปเดต DB
    if (!dry_run && needsFix) {
      const effectiveUsed = Math.max(proposed.budget_used, proposed.budget_reported);
      const advance = Math.max(0, proposed.budget_reported - proposed.budget_used);
      const remaining = Math.max(0, total - effectiveUsed);

      await supabase
        .from("projects")
        .update({
          budget_used:      proposed.budget_used,
          budget_reported:  proposed.budget_reported,
          budget_advance:   advance,
          budget_remaining: remaining,
          updated_at:       new Date().toISOString(),
        })
        .eq("id", p.id);
    }
  }

  return NextResponse.json({
    dry_run,
    total_projects: projects.length,
    needs_fix: analysis.filter((a) => a.needs_fix).length,
    corrupt: analysis.filter((a) => a.is_corrupt).length,
    mismatch_only: analysis.filter((a) => a.reported_mismatch && !a.is_corrupt).length,
    analysis: analysis.filter((a) => a.needs_fix), // ส่งกลับเฉพาะที่ต้องแก้
  });
}
