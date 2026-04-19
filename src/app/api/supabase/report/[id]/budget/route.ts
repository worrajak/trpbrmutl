import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

// PATCH /api/supabase/report/:id/budget
// ให้ หน.โครงการ แก้ไข budget_spent ของ report ที่ตัวเองสร้าง (auth ด้วย token_code)
// body: { token_code: string, budget_spent: number }
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
  const { token_code, budget_spent } = body;

  if (!reportId) {
    return NextResponse.json({ error: "Missing report id" }, { status: 400 });
  }
  if (!token_code) {
    return NextResponse.json({ error: "ต้องใส่ token เพื่อแก้ไข" }, { status: 401 });
  }
  const newAmount = Number(budget_spent);
  if (!isFinite(newAmount) || newAmount < 0) {
    return NextResponse.json({ error: "ยอดเงินไม่ถูกต้อง" }, { status: 400 });
  }

  // 1. ดึง report + project_id
  const { data: report, error: repErr } = await supabase
    .from("activity_reports")
    .select("id, project_id, budget_spent")
    .eq("id", reportId)
    .single();

  if (repErr || !report) {
    return NextResponse.json({ error: "ไม่พบรายงาน" }, { status: 404 });
  }

  // 2. ตรวจ token ว่าเป็นของโครงการนี้จริง
  const { data: token } = await supabase
    .from("project_tokens")
    .select("project_id, is_active")
    .eq("token_code", token_code)
    .single();

  if (!token || !token.is_active || token.project_id !== report.project_id) {
    return NextResponse.json({ error: "Token ไม่ถูกต้องสำหรับรายงานนี้" }, { status: 403 });
  }

  // 3. อัปเดต budget_spent ของ report
  const { error: updErr } = await supabase
    .from("activity_reports")
    .update({ budget_spent: newAmount })
    .eq("id", reportId);

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  // 4. คำนวณ budget_reported ของโครงการใหม่ (SUM ของทุก report)
  const { data: allReports } = await supabase
    .from("activity_reports")
    .select("budget_spent")
    .eq("project_id", report.project_id);

  const reportedSum = (allReports || []).reduce(
    (s, r) => s + Number(r.budget_spent || 0),
    0
  );

  // 5. ดึงข้อมูลโครงการเพื่อคำนวณ advance/remaining
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
  }

  return NextResponse.json({
    success: true,
    report_id: reportId,
    previous_amount: Number(report.budget_spent || 0),
    new_amount: newAmount,
    project_budget_reported: reportedSum,
  });
}
