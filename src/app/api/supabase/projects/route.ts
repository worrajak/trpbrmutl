import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

// ไม่ cache — ดึงข้อมูลสดจาก Supabase ทุกครั้ง
export const dynamic = "force-dynamic";

/** ป้องกันชื่อสถาบัน/หน่วยงานถูกแสดงเป็น "ผู้รับผิดชอบ" */
function sanitizeResponsible(
  responsible: string | null,
  organization: string | null
): string | null {
  if (!responsible || responsible.trim() === "") return null;
  if (organization && responsible.trim() === organization.trim()) return null;
  const orgKeywords = ["สถาบัน", "วิทยาลัย", "มหาวิทยาลัย", "ศูนย์", "สำนัก", "กอง", "ฝ่าย", "กลุ่ม", "สำนักงาน"];
  if (orgKeywords.some((kw) => responsible.trim().startsWith(kw))) return null;
  return responsible;
}

interface EvidenceFile { name?: string; url?: string; type?: string }
interface ReportRow {
  project_id: string;
  submitted_at: string;
  submitted_by: string;
  report_description: string | null;
  evidence_files: EvidenceFile[] | null;
}

export async function GET(_req: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ projects: [], isLive: false });
  }

  const [{ data, error }, { data: reports }] = await Promise.all([
    supabase.from("projects").select("*").order("main_program"),
    supabase
      .from("activity_reports")
      .select("project_id, submitted_at, submitted_by, report_description, evidence_files")
      .order("submitted_at", { ascending: false }),
  ]);

  if (error) {
    return NextResponse.json({ projects: [], isLive: false });
  }

  // Build map of latest report per project (+ first image from evidence_files)
  const latestByProject = new Map<string, {
    submitted_at: string;
    submitted_by: string;
    description: string | null;
    image_url: string | null;
    report_count: number;
  }>();

  const reportCounts = new Map<string, number>();
  for (const r of (reports as ReportRow[]) || []) {
    reportCounts.set(r.project_id, (reportCounts.get(r.project_id) || 0) + 1);
    if (!latestByProject.has(r.project_id)) {
      const firstImage =
        (r.evidence_files || []).find(
          (f) => f.type === "image" && f.url && f.url.trim()
        )?.url || null;
      latestByProject.set(r.project_id, {
        submitted_at: r.submitted_at,
        submitted_by: r.submitted_by,
        description: r.report_description,
        image_url: firstImage,
        report_count: 0,
      });
    }
  }
  // Backfill report_count
  latestByProject.forEach((info, pid) => {
    info.report_count = reportCounts.get(pid) || 0;
  });

  const projects = (data || [])
    .filter((p) => !p.erp_code || !p.erp_code.endsWith("0000"))
    .map((p) => ({
      ...p,
      responsible: sanitizeResponsible(p.responsible, p.organization),
      last_report: latestByProject.get(p.id) || null,
    }));

  return NextResponse.json({ projects, isLive: true });
}
