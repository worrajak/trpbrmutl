import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { getSdgGoal } from "@/lib/sdgs";

// Public API — ให้หน่วยงานภายนอก citation/ดึงข้อมูล SDGs ของ มทร.ล้านนา
// GET /api/public/sdgs              → ทุก SDG
// GET /api/public/sdgs?goal=4       → เฉพาะ SDG 4
// GET /api/public/sdgs?goal=4,9,11  → หลาย SDG
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const goalParam = req.nextUrl.searchParams.get("goal");
  const goalIds = goalParam
    ? goalParam.split(",").map(Number).filter((n) => n >= 1 && n <= 17)
    : [];

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: "Service unavailable" }, { status: 503 });

  let projectQuery = supabase
    .from("projects")
    .select("id, project_name, organization, responsible, budget_total, sdg_tags, main_program, status");

  if (goalIds.length > 0) {
    projectQuery = projectQuery.overlaps("sdg_tags", goalIds);
  } else {
    projectQuery = projectQuery.neq("sdg_tags", "{}");
  }

  let reportQuery = supabase
    .from("activity_reports")
    .select("id, project_id, sdg_tags, evidence_files, submitted_at, report_description, submitted_by")
    .order("submitted_at", { ascending: false });

  if (goalIds.length > 0) {
    reportQuery = reportQuery.overlaps("sdg_tags", goalIds);
  } else {
    reportQuery = reportQuery.neq("sdg_tags", "{}");
  }

  const [{ data: projects }, { data: reports }] = await Promise.all([projectQuery, reportQuery]);

  // เสริม SDG metadata
  const enrichedProjects = (projects || []).map((p) => ({
    ...p,
    sdg_goals: (p.sdg_tags || []).map((id: number) => {
      const g = getSdgGoal(id);
      return g ? { id: g.id, name_th: g.name_th, name_en: g.name_en } : { id };
    }),
  }));

  const response = {
    meta: {
      source: "มหาวิทยาลัยเทคโนโลยีราชมงคลล้านนา (RMUTL)",
      program: "โครงการใต้ร่มพระบารมี",
      api_version: "1.0",
      generated_at: new Date().toISOString(),
      license: "CC BY 4.0",
      citation: "มหาวิทยาลัยเทคโนโลยีราชมงคลล้านนา. (2569). ผลงาน SDGs โครงการใต้ร่มพระบารมี. สืบค้นจาก https://trpbrmutl.vercel.app/api/public/sdgs",
    },
    summary: {
      total_projects: enrichedProjects.length,
      total_reports_with_evidence: (reports || []).filter(
        (r) => (r.evidence_files || []).length > 0
      ).length,
      sdg_goals_covered: [...new Set((projects || []).flatMap((p) => p.sdg_tags || []))].sort((a, b) => a - b),
    },
    projects: enrichedProjects,
    reports_with_evidence: (reports || []).filter(
      (r) => (r.evidence_files || []).length > 0
    ),
  };

  return NextResponse.json(response, {
    headers: {
      "Access-Control-Allow-Origin": "*",  // เปิดให้ทุก domain ดึงได้
      "Cache-Control": "public, max-age=300",
      "X-Source": "RMUTL-RPF",
    },
  });
}
