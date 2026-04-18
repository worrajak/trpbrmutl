import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

// Backup API — เรียกได้จาก GitHub Actions ด้วย Bearer token
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const secret = process.env.BACKUP_SECRET;

  if (!secret || auth !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return new NextResponse("Supabase not configured", { status: 503 });
  }

  const [projects, researchers, staff, sites] = await Promise.all([
    supabase.from("projects").select("*").order("erp_code"),
    supabase.from("researchers").select("*"),
    supabase.from("staff").select("*"),
    supabase.from("sites").select("*"),
  ]);

  const backup = {
    exported_at: new Date().toISOString(),
    tables: {
      projects: projects.data || [],
      researchers: researchers.data || [],
      staff: staff.data || [],
      sites: sites.data || [],
    },
    counts: {
      projects: projects.data?.length ?? 0,
      researchers: researchers.data?.length ?? 0,
      staff: staff.data?.length ?? 0,
      sites: sites.data?.length ?? 0,
    },
  };

  return NextResponse.json(backup, {
    headers: {
      "Content-Disposition": `attachment; filename="rpf-backup-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
