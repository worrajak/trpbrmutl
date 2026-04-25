import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import * as XLSX from "xlsx";

/**
 * POST /api/supabase/sync-excel
 * Sync งบประมาณจาก Excel "กรอบแผนงบประมาณใต้ร่มฯ" (ไม่ใช้ AI)
 *
 * โครงสร้าง Excel ที่รองรับ (column index, 0-based):
 *   col 0  = ชื่อโครงการ (อาจมี "(หัวหน้าโครงการ)" ท้ายชื่อ)
 *   col 1  = erp_code (ตัวเลข 18-20 หลัก · ข้ามที่ลงท้าย "0000" — parent row)
 *   col 4  = budget_total
 *   col 9  = budget_used
 *   col 12 = budget_remaining
 *
 * Body:
 *   { gdrive_file_id?, file_base64?, sheets_url?, dry_run?: boolean }
 *
 * Response (preview / dry_run):
 *   { success, dry_run: true, total_parsed, will_create, will_update, will_skip, diff: [...] }
 *
 * Response (จริง):
 *   { success, total_parsed, created, updated, unchanged, errors }
 *
 * Skip-if-unchanged: ถ้า budget_total/used/remaining ใน DB ตรงกับ Excel แล้ว → ไม่ส่ง UPDATE
 */
export async function POST(req: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const body = await req.json();
  const { gdrive_file_id, file_base64, sheets_url, dry_run } = body;

  if (!gdrive_file_id && !file_base64 && !sheets_url) {
    return NextResponse.json(
      { error: "ต้องระบุ gdrive_file_id, file_base64 หรือ sheets_url" },
      { status: 400 }
    );
  }

  try {
    // ---- 1. Load workbook ----
    let buffer: Buffer;
    if (file_base64) {
      buffer = Buffer.from(file_base64, "base64");
    } else if (sheets_url) {
      const exportUrl = buildSheetsExportUrl(sheets_url);
      if (!exportUrl) {
        return NextResponse.json({ error: "sheets_url ไม่ถูกต้อง" }, { status: 400 });
      }
      const res = await fetch(exportUrl, { redirect: "follow" });
      if (!res.ok) {
        return NextResponse.json(
          { error: `ดาวน์โหลด Google Sheets ไม่ได้: ${res.statusText}` },
          { status: 400 }
        );
      }
      buffer = Buffer.from(await res.arrayBuffer());
    } else {
      const url = `https://drive.google.com/uc?export=download&id=${gdrive_file_id}&confirm=t`;
      const res = await fetch(url);
      if (!res.ok) {
        return NextResponse.json(
          { error: `ดาวน์โหลด Google Drive ไม่ได้: ${res.statusText}` },
          { status: 400 }
        );
      }
      buffer = Buffer.from(await res.arrayBuffer());
    }

    // ---- 2. Parse Excel → rows ----
    const projects = parseExcel(buffer);
    if (projects.length === 0) {
      return NextResponse.json({ error: "ไม่พบข้อมูลโครงการใน Excel" }, { status: 400 });
    }

    // ---- 3. Bulk fetch existing rows (1 query) ----
    const erpCodes = projects.map((p) => p.erp_code);
    const { data: existingRows, error: fetchErr } = await supabase
      .from("projects")
      .select(
        "id, erp_code, project_name, responsible, budget_total, budget_used, budget_remaining, budget_reported"
      )
      .in("erp_code", erpCodes);

    if (fetchErr) {
      return NextResponse.json(
        { error: `Fetch existing failed: ${fetchErr.message}` },
        { status: 500 }
      );
    }

    const existingMap = new Map<string, ExistingRow>();
    for (const r of (existingRows || []) as ExistingRow[]) {
      existingMap.set(r.erp_code, r);
    }

    // ---- 4. Diff ----
    const toInsert: ProjectRow[] = [];
    const toUpdate: { row: ProjectRow; existing: ExistingRow; effectiveRemaining: number }[] = [];
    const unchanged: string[] = [];
    const diffPreview: DiffEntry[] = [];

    for (const p of projects) {
      const existing = existingMap.get(p.erp_code);
      if (!existing) {
        toInsert.push(p);
        diffPreview.push({
          erp_code: p.erp_code,
          project_name: p.project_name,
          action: "create",
          new: { total: p.budget_total, used: p.budget_used, remaining: p.budget_remaining },
        });
        continue;
      }

      const reported = Number(existing.budget_reported || 0);
      const effectiveUsed = Math.max(p.budget_used, reported);
      const effectiveRemaining = Math.max(0, p.budget_total - effectiveUsed);

      const totalChanged = !numEq(existing.budget_total, p.budget_total);
      const usedChanged = !numEq(existing.budget_used, p.budget_used);
      const remainChanged = !numEq(existing.budget_remaining, effectiveRemaining);

      if (!totalChanged && !usedChanged && !remainChanged) {
        unchanged.push(p.erp_code);
        continue;
      }

      toUpdate.push({ row: p, existing, effectiveRemaining });
      diffPreview.push({
        erp_code: p.erp_code,
        project_name: existing.project_name || p.project_name,
        action: "update",
        old: {
          total: Number(existing.budget_total) || 0,
          used: Number(existing.budget_used) || 0,
          remaining: Number(existing.budget_remaining) || 0,
        },
        new: { total: p.budget_total, used: p.budget_used, remaining: effectiveRemaining },
        changed: [
          totalChanged && "total",
          usedChanged && "used",
          remainChanged && "remaining",
        ].filter(Boolean) as string[],
      });
    }

    // ---- 5. Dry-run → return preview ----
    if (dry_run) {
      return NextResponse.json({
        success: true,
        dry_run: true,
        total_parsed: projects.length,
        will_create: toInsert.length,
        will_update: toUpdate.length,
        will_skip: unchanged.length,
        diff: diffPreview,
      });
    }

    // ---- 6. Apply ----
    const errors: string[] = [];
    let created = 0;
    let updated = 0;

    // Bulk INSERT (1 call)
    if (toInsert.length > 0) {
      const insertPayload = toInsert.map((p) => ({
        id: p.erp_code,
        erp_code: p.erp_code,
        project_name: p.project_name || `โครงการ ${p.erp_code}`,
        responsible: p.responsible || null,
        main_program: "ใต้ร่มพระบารมี",
        organization: "",
        budget_total: p.budget_total,
        budget_used: p.budget_used,
        budget_remaining: p.budget_remaining,
      }));
      const { error: insertErr } = await supabase.from("projects").insert(insertPayload);
      if (insertErr) {
        errors.push(`bulk insert: ${insertErr.message}`);
      } else {
        created = toInsert.length;
      }
    }

    // Per-row UPDATE (เฉพาะที่เปลี่ยน · เติม responsible/project_name ถ้า DB ว่าง)
    for (const { row: p, existing, effectiveRemaining } of toUpdate) {
      const payload: Record<string, unknown> = {
        budget_total: p.budget_total,
        budget_used: p.budget_used,
        budget_remaining: effectiveRemaining,
      };
      const trim = (s: string | null | undefined) => (typeof s === "string" ? s.trim() : "");
      if (p.responsible && !trim(existing.responsible)) {
        payload.responsible = p.responsible;
      }
      if (p.project_name && !trim(existing.project_name)) {
        payload.project_name = p.project_name;
      }
      const { error: updErr } = await supabase
        .from("projects")
        .update(payload)
        .eq("erp_code", p.erp_code);
      if (updErr) {
        errors.push(`${p.erp_code}: ${updErr.message}`);
      } else {
        updated++;
      }
    }

    return NextResponse.json({
      success: true,
      total_parsed: projects.length,
      created,
      updated,
      unchanged: unchanged.length,
      errors,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ===== Types =====
interface ProjectRow {
  erp_code: string;
  project_name: string;
  responsible: string;
  budget_total: number;
  budget_used: number;
  budget_remaining: number;
}

interface ExistingRow {
  id: string;
  erp_code: string;
  project_name: string | null;
  responsible: string | null;
  budget_total: number | string | null;
  budget_used: number | string | null;
  budget_remaining: number | string | null;
  budget_reported: number | string | null;
}

interface DiffEntry {
  erp_code: string;
  project_name: string;
  action: "create" | "update";
  old?: { total: number; used: number; remaining: number };
  new: { total: number; used: number; remaining: number };
  changed?: string[];
}

// ===== Helpers =====
const PERSON_PREFIX_REGEX =
  /^(นาย|นาง|นางสาว|ดร\.|ผศ\.|รศ\.|ศ\.|อาจารย์|ผู้ช่วยศาสตราจารย์|รองศาสตราจารย์|ศาสตราจารย์)/;

function splitNameAndResponsible(raw: string): { name: string; responsible: string } {
  const m = raw.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (m && PERSON_PREFIX_REGEX.test(m[2].trim())) {
    return { name: m[1].trim(), responsible: m[2].trim() };
  }
  return { name: raw, responsible: "" };
}

function toNumber(val: unknown): number {
  if (val === null || val === undefined || val === "") return 0;
  const n = Number(String(val).replace(/,/g, "").trim());
  return isNaN(n) ? 0 : n;
}

// เปรียบเทียบ number ที่มาจาก DB (อาจเป็น string จาก DECIMAL) กับ Excel
function numEq(a: unknown, b: unknown): boolean {
  return Math.round(Number(a || 0) * 100) === Math.round(Number(b || 0) * 100);
}

// ===== Parse Excel =====
function parseExcel(buffer: Buffer): ProjectRow[] {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
  }) as unknown[][];

  const projects: ProjectRow[] = [];
  const ERP_REGEX = /^\d{18,20}$/;

  for (const row of rows) {
    const erpRaw = row[1];
    if (!erpRaw) continue;
    const erpCode = String(erpRaw).replace(/\.0$/, "").trim();
    if (!ERP_REGEX.test(erpCode)) continue;
    if (erpCode.endsWith("0000")) continue; // ข้าม parent/summary row

    const fullName = String(row[0] ?? "").replace(/\n/g, " ").trim();
    const { name, responsible } = splitNameAndResponsible(fullName);
    const budgetTotal = toNumber(row[4]);
    const budgetUsed = toNumber(row[9]);
    const budgetRemainingRaw = toNumber(row[12]);
    // ถ้า remaining ใน Excel ว่าง คำนวณ total - used (clamp ≥ 0)
    const budgetRemaining = Math.max(0, budgetRemainingRaw || budgetTotal - budgetUsed);

    projects.push({
      erp_code: erpCode,
      project_name: name,
      responsible,
      budget_total: budgetTotal,
      budget_used: budgetUsed,
      budget_remaining: budgetRemaining,
    });
  }

  return projects;
}

// ===== Google Sheets URL → Export URL =====
function buildSheetsExportUrl(url: string): string | null {
  try {
    const match = url.match(/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (!match) return null;
    const id = match[1];
    const gidMatch = url.match(/[?&#]gid=(\d+)/);
    const gid = gidMatch ? gidMatch[1] : "0";
    return `https://docs.google.com/spreadsheets/d/${id}/export?format=xlsx&gid=${gid}`;
  } catch {
    return null;
  }
}
