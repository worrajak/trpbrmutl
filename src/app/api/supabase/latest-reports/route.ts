import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

interface EvidenceFile { name?: string; url?: string; type?: string }
interface ReportRow {
  id: string;
  project_id: string;
  submitted_at: string;
  submitted_by: string;
  report_description: string | null;
  evidence_files: EvidenceFile[] | null;
  activities: { activity_name: string; activity_order: number } | null;
  projects: {
    project_name: string;
    main_program: string;
    organization: string | null;
  } | null;
}

// GET /api/supabase/latest-reports?limit=8
// คืนรายงานล่าสุด (ที่มีรูป) พร้อม project info
export async function GET(req: Request) {
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ reports: [] });

  const limit = Number(new URL(req.url).searchParams.get("limit") || 8);

  const { data, error } = await supabase
    .from("activity_reports")
    .select(`
      id,
      project_id,
      submitted_at,
      submitted_by,
      report_description,
      evidence_files,
      activities(activity_name, activity_order),
      projects(project_name, main_program, organization)
    `)
    .order("submitted_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ reports: [], error: error.message });

  const reports = ((data as unknown as ReportRow[]) || [])
    .map((r) => {
      const imgs = (r.evidence_files || []).filter(
        (f): f is { name?: string; url: string; type: string } =>
          f.type === "image" && !!f.url
      );
      return { ...r, images: imgs };
    })
    .filter((r) => r.images.length > 0)
    .slice(0, limit);

  return NextResponse.json({ reports });
}
