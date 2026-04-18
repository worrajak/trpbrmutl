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

export async function GET(req: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ projects: [], isLive: false });
  }

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("main_program");

  if (error) {
    return NextResponse.json({ projects: [], isLive: false });
  }

  const projects = (data || [])
    .filter((p) => !p.erp_code || !p.erp_code.endsWith("0000"))
    .map((p) => ({
      ...p,
      responsible: sanitizeResponsible(p.responsible, p.organization),
    }));

  return NextResponse.json({ projects, isLive: true });
}
