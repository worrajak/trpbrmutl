import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

// DELETE /api/supabase/cleanup-parents
// ลบ project rows ที่ erp_code ลงท้ายด้วย 0000 (parent/summary rows)
export async function DELETE() {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  // ดึงรายการที่จะลบก่อน
  const { data: toDelete, error: fetchErr } = await supabase
    .from("projects")
    .select("id, erp_code, project_name, budget_total")
    .like("erp_code", "%0000");

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }

  if (!toDelete || toDelete.length === 0) {
    return NextResponse.json({ deleted: 0, rows: [] });
  }

  const { error: deleteErr } = await supabase
    .from("projects")
    .delete()
    .like("erp_code", "%0000");

  if (deleteErr) {
    return NextResponse.json({ error: deleteErr.message }, { status: 500 });
  }

  return NextResponse.json({
    deleted: toDelete.length,
    rows: toDelete.map((r) => ({ erp_code: r.erp_code, project_name: r.project_name, budget_total: r.budget_total })),
  });
}
