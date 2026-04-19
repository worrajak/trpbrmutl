import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

// PATCH /api/supabase/report/:id
// หน.โครงการ แก้รายงานของตัวเอง — ต้องมี token_code ที่ตรงกับโครงการ
// body: {
//   token_code: string,
//   report_description?: string,
//   evidence_url?: string | null,
//   evidence_files?: Array<{ name, url, type }> | null,
//   budget_spent?: number,
//   sdg_tags?: number[] | null,
// }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const { id: reportId } = await params;
  const body = await req.json().catch(() => ({}));
  const {
    token_code,
    report_description,
    evidence_url,
    evidence_files,
    budget_spent,
    sdg_tags,
  } = body;

  if (!reportId) return NextResponse.json({ error: "Missing report id" }, { status: 400 });
  if (!token_code) return NextResponse.json({ error: "ต้องใส่ token เพื่อแก้ไข" }, { status: 401 });

  // 1. โหลด report + ตรวจ token
  const { data: report, error: repErr } = await supabase
    .from("activity_reports")
    .select("id, project_id, budget_spent")
    .eq("id", reportId)
    .single();

  if (repErr || !report) {
    return NextResponse.json({ error: "ไม่พบรายงาน" }, { status: 404 });
  }

  const { data: token } = await supabase
    .from("project_tokens")
    .select("project_id, is_active")
    .eq("token_code", token_code)
    .single();

  if (!token || !token.is_active || token.project_id !== report.project_id) {
    return NextResponse.json({ error: "Token ไม่ถูกต้องสำหรับรายงานนี้" }, { status: 403 });
  }

  // 2. สร้าง payload เฉพาะ field ที่ถูกส่งมา
  const update: Record<string, unknown> = {};

  if (typeof report_description === "string") {
    update.report_description = report_description;
  }

  if (evidence_url !== undefined) {
    update.evidence_url = evidence_url || null;
  }

  if (evidence_files !== undefined) {
    if (Array.isArray(evidence_files)) {
      const valid = evidence_files.filter(
        (f: { url?: string }) => f.url && String(f.url).trim()
      );
      update.evidence_files = valid.length > 0 ? valid : null;
    } else {
      update.evidence_files = null;
    }
  }

  if (sdg_tags !== undefined) {
    update.sdg_tags = Array.isArray(sdg_tags) && sdg_tags.length > 0 ? sdg_tags : null;
  }

  let budgetChanged = false;
  if (budget_spent !== undefined) {
    const n = Number(budget_spent);
    if (!isFinite(n) || n < 0) {
      return NextResponse.json({ error: "ยอดเงินไม่ถูกต้อง" }, { status: 400 });
    }
    update.budget_spent = n;
    budgetChanged = true;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "ไม่มีข้อมูลให้อัปเดต" }, { status: 400 });
  }

  // 3. Update report
  const { error: updErr } = await supabase
    .from("activity_reports")
    .update(update)
    .eq("id", reportId);

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  // 4. ถ้า budget_spent เปลี่ยน → recompute budget_reported ของโครงการ
  let projectAggregate: {
    budget_reported: number;
    budget_advance: number;
    budget_remaining: number;
  } | null = null;

  if (budgetChanged) {
    const { data: allReports } = await supabase
      .from("activity_reports")
      .select("budget_spent")
      .eq("project_id", report.project_id);

    const reportedSum = (allReports || []).reduce(
      (s, r) => s + Number(r.budget_spent || 0),
      0
    );

    const { data: proj } = await supabase
      .from("projects")
      .select("budget_total, budget_used")
      .eq("id", report.project_id)
      .single();

    if (proj) {
      const erp = Number(proj.budget_used || 0);
      const total = Number(proj.budget_total || 0);
      const effectiveUsed = Math.max(erp, reportedSum);
      const advance = Math.max(0, reportedSum - erp);
      const remaining = Math.max(0, total - effectiveUsed);

      await supabase
        .from("projects")
        .update({
          budget_reported: reportedSum,
          budget_advance: advance,
          budget_remaining: remaining,
          updated_at: new Date().toISOString(),
        })
        .eq("id", report.project_id);

      projectAggregate = {
        budget_reported: reportedSum,
        budget_advance: advance,
        budget_remaining: remaining,
      };
    }
  }

  // 5. ถ้ามี sdg_tags ใหม่ → merge เข้าโครงการ
  if (Array.isArray(sdg_tags) && sdg_tags.length > 0) {
    const { data: p } = await supabase
      .from("projects")
      .select("sdg_tags")
      .eq("id", report.project_id)
      .single();

    if (p) {
      const existing: number[] = p.sdg_tags || [];
      const merged = Array.from(new Set([...existing, ...sdg_tags])).sort(
        (a, b) => a - b
      );
      await supabase
        .from("projects")
        .update({ sdg_tags: merged })
        .eq("id", report.project_id);
    }
  }

  return NextResponse.json({
    success: true,
    report_id: reportId,
    updated_fields: Object.keys(update),
    project: projectAggregate,
  });
}
