import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import * as XLSX from "xlsx";

// POST: รับ Google Drive file ID → download Excel → parse → update Supabase
// Body: { gdrive_file_id: string } หรือ { file_base64: string }
export async function POST(req: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const body = await req.json();
  const { gdrive_file_id, file_base64 } = body;

  if (!gdrive_file_id && !file_base64) {
    return NextResponse.json(
      { error: "ต้องระบุ gdrive_file_id หรือ file_base64" },
      { status: 400 }
    );
  }

  try {
    let buffer: Buffer;

    if (file_base64) {
      // รับไฟล์ base64 จาก client (upload โดยตรง)
      buffer = Buffer.from(file_base64, "base64");
    } else {
      // ดาวน์โหลดจาก Google Drive (ต้องเป็นไฟล์ที่แชร์แบบ public)
      const url = `https://drive.google.com/uc?export=download&id=${gdrive_file_id}&confirm=t`;
      const res = await fetch(url);
      if (!res.ok) {
        return NextResponse.json(
          { error: `ไม่สามารถดาวน์โหลดจาก Google Drive: ${res.statusText}` },
          { status: 400 }
        );
      }
      const arrayBuffer = await res.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    }

    // Parse Excel
    const projects = parseExcel(buffer);
    if (projects.length === 0) {
      return NextResponse.json({ error: "ไม่พบข้อมูลโครงการใน Excel" }, { status: 400 });
    }

    // Sync to Supabase
    const result = await syncToSupabase(supabase, projects);

    return NextResponse.json({
      success: true,
      total_parsed: projects.length,
      updated: result.updated,
      not_found: result.notFound,
      errors: result.errors,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ===== Types =====
interface ExcelProject {
  erp_code: string;
  project_name: string;
  budget_total: number;
  budget_used: number;
  budget_remaining: number;
}

// ===== Parse Excel =====
function parseExcel(buffer: Buffer): ExcelProject[] {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });

  // ใช้ sheet แรกที่มี ERP code (กรอบแผนงบประมาณ)
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
  }) as unknown[][];

  const projects: ExcelProject[] = [];
  const ERP_REGEX = /^\d{18,20}$/;

  for (const row of rows) {
    const erpRaw = row[1];
    if (!erpRaw) continue;

    // ERP code เป็นตัวเลข 18-20 หลัก
    const erpCode = String(erpRaw).replace(/\.0$/, "").trim();
    if (!ERP_REGEX.test(erpCode)) continue;

    const projectName = String(row[0] ?? "").trim();
    const budgetTotal = toNumber(row[4]);
    const budgetUsed = toNumber(row[9]);   // เบิกจ่ายสะสม
    const budgetRemaining = toNumber(row[12]); // คงเหลือ

    // คำนวณ remaining ถ้าไม่มีค่า
    const remaining = budgetRemaining ?? (budgetTotal - (budgetUsed ?? 0));

    projects.push({
      erp_code: erpCode,
      project_name: projectName,
      budget_total: budgetTotal ?? 0,
      budget_used: budgetUsed ?? 0,
      budget_remaining: remaining ?? 0,
    });
  }

  return projects;
}

function toNumber(val: unknown): number {
  if (val === null || val === undefined || val === "") return 0;
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}

// ===== Sync to Supabase =====
async function syncToSupabase(
  supabase: ReturnType<typeof getSupabase>,
  projects: ExcelProject[]
) {
  if (!supabase) throw new Error("Supabase not configured");

  let updated = 0;
  const notFound: string[] = [];
  const errors: string[] = [];

  for (const proj of projects) {
    // ค้นหา project ใน Supabase ด้วย erp_code
    const { data: existing, error: fetchErr } = await supabase
      .from("projects")
      .select("id, erp_code, project_name")
      .eq("erp_code", proj.erp_code)
      .maybeSingle();

    if (fetchErr) {
      errors.push(`${proj.erp_code}: ${fetchErr.message}`);
      continue;
    }

    if (!existing) {
      notFound.push(proj.erp_code);
      continue;
    }

    // Update เฉพาะ budget fields
    const { error: updateErr } = await supabase
      .from("projects")
      .update({
        budget_total: proj.budget_total,
        budget_used: proj.budget_used,
        budget_remaining: proj.budget_remaining,
      })
      .eq("erp_code", proj.erp_code);

    if (updateErr) {
      errors.push(`${proj.erp_code}: ${updateErr.message}`);
    } else {
      updated++;
    }
  }

  return { updated, notFound, errors };
}
