import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { randomBytes } from "crypto";

// กิจกรรมมาตรฐาน 5 ขั้น สำหรับโครงการใต้ร่มพระบารมี
const DEFAULT_ACTIVITIES = [
  {
    order: 1,
    name: "วางแผนและประสานงาน",
    desc: "ประชุมวางแผนการดำเนินงาน ประสานงานทุกฝ่ายที่เกี่ยวข้อง จัดทำปฏิทินการทำงาน",
    months: [1, 2],
    budget_pct: 0.05,
  },
  {
    order: 2,
    name: "สำรวจพื้นที่และจัดเตรียมวัสดุ",
    desc: "สำรวจพื้นที่เป้าหมาย จัดซื้อวัสดุ/อุปกรณ์ เตรียมความพร้อมก่อนลงพื้นที่",
    months: [2, 3, 4],
    budget_pct: 0.25,
  },
  {
    order: 3,
    name: "ดำเนินกิจกรรมและลงพื้นที่",
    desc: "ลงพื้นที่ดำเนินกิจกรรมตามแผน ทดสอบ/สาธิต/ฝึกอบรม หารือกับกลุ่มเป้าหมาย",
    months: [3, 4, 5, 6, 7],
    budget_pct: 0.45,
  },
  {
    order: 4,
    name: "ติดตามผลและประชุมสรุป",
    desc: "ติดตามและประเมินผลการดำเนินงาน ประชุมสรุปกับทีมงานและผู้มีส่วนได้ส่วนเสีย",
    months: [7, 8, 9],
    budget_pct: 0.15,
  },
  {
    order: 5,
    name: "จัดทำรายงานและเผยแพร่ผล",
    desc: "รวบรวมข้อมูล จัดทำรายงานฉบับสมบูรณ์ เผยแพร่ผลการดำเนินงาน",
    months: [9, 10, 11, 12],
    budget_pct: 0.10,
  },
];

// KPI มาตรฐานสำหรับโครงการใต้ร่มพระบารมี
const DEFAULT_KPIS = [
  { name: "จำนวนผู้ได้รับประโยชน์จากโครงการ", type: "quantitative", target: 50, unit: "คน" },
  { name: "จำนวนพื้นที่/ชุมชนที่ได้รับการพัฒนา", type: "quantitative", target: 1, unit: "แห่ง" },
  { name: "ร้อยละความพึงพอใจของผู้รับบริการ", type: "quantitative", target: 80, unit: "ร้อยละ" },
  { name: "จำนวนองค์ความรู้/เทคโนโลยีที่ถ่ายทอด", type: "quantitative", target: 1, unit: "เรื่อง" },
  { name: "จัดทำรายงานฉบับสมบูรณ์", type: "qualitative", target: 1, unit: "ฉบับ" },
];

function generateToken(): string {
  return randomBytes(3).toString("hex").toUpperCase().slice(0, 6);
}

export async function POST(req: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  const body = await req.json();
  const { project_id, all_empty } = body; // seed โครงการเดียว หรือทุกโครงการที่ว่าง

  // รายชื่อ project ที่จะ seed
  let projectIds: string[] = [];

  if (all_empty) {
    // ดึงโครงการใต้ร่มพระบารมีทั้งหมด
    const { data: projects } = await supabase
      .from("projects")
      .select("id")
      .eq("main_program", "ใต้ร่มพระบารมี");

    if (!projects) return NextResponse.json({ error: "ดึงโครงการไม่ได้" }, { status: 500 });

    // กรองเฉพาะที่ยังไม่มีกิจกรรม
    const allIds = projects.map((p: { id: string }) => p.id);
    const { data: existingActs } = await supabase
      .from("activities")
      .select("project_id")
      .in("project_id", allIds);

    const hasActivity = new Set((existingActs || []).map((a: { project_id: string }) => a.project_id));
    projectIds = allIds.filter((id: string) => !hasActivity.has(id));
  } else if (project_id) {
    projectIds = [project_id];
  } else {
    return NextResponse.json({ error: "ต้องระบุ project_id หรือ all_empty: true" }, { status: 400 });
  }

  const results: { project_id: string; activities: number; kpis: number; token: string | null; error?: string }[] = [];

  for (const pid of projectIds) {
    try {
      // ดึงงบโครงการ
      const { data: proj } = await supabase
        .from("projects")
        .select("budget_total")
        .eq("id", pid)
        .single();

      const total = Number(proj?.budget_total || 0);

      // 1. Seed activities
      const actRows = DEFAULT_ACTIVITIES.map((a) => ({
        project_id: pid,
        activity_order: a.order,
        activity_name: a.name,
        expected_output: a.desc,
        budget: Math.round(total * a.budget_pct),
        planned_months: a.months,
        status: "not_started",
      }));

      const { error: actErr } = await supabase.from("activities").insert(actRows);
      if (actErr) throw new Error(`activities: ${actErr.message}`);

      // 2. Seed KPI targets
      const kpiRows = DEFAULT_KPIS.map((k) => ({
        project_id: pid,
        kpi_name: k.name,
        kpi_type: k.type,
        target_value: k.target,
        actual_value: 0,
        unit: k.unit,
        verified: false,
      }));

      const { error: kpiErr } = await supabase.from("kpi_targets").insert(kpiRows);
      if (kpiErr) throw new Error(`kpi_targets: ${kpiErr.message}`);

      // 3. สร้าง Token ถ้ายังไม่มี
      const { data: existingToken } = await supabase
        .from("project_tokens")
        .select("token_code")
        .eq("project_id", pid)
        .maybeSingle();

      let tokenCode: string | null = existingToken?.token_code ?? null;

      if (!tokenCode) {
        // สุ่ม token ไม่ซ้ำ
        let attempts = 0;
        while (attempts < 10) {
          const candidate = generateToken();
          const { data: dup } = await supabase
            .from("project_tokens")
            .select("token_code")
            .eq("token_code", candidate)
            .maybeSingle();

          if (!dup) {
            const { error: tokErr } = await supabase.from("project_tokens").insert({
              project_id: pid,
              token_code: candidate,
              is_active: true,
              created_at: new Date().toISOString(),
            });
            if (!tokErr) { tokenCode = candidate; break; }
          }
          attempts++;
        }
      }

      results.push({ project_id: pid, activities: actRows.length, kpis: kpiRows.length, token: tokenCode });
    } catch (e) {
      results.push({ project_id: pid, activities: 0, kpis: 0, token: null, error: String(e) });
    }
  }

  return NextResponse.json({
    success: true,
    seeded: results.filter((r) => !r.error).length,
    errors: results.filter((r) => r.error).length,
    results,
  });
}
