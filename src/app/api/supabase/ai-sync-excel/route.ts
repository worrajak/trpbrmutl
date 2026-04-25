import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import * as XLSX from "xlsx";
import {
  EXCEL_BUDGET_SYSTEM_PROMPT,
  EXCEL_BUDGET_USER_PROMPT,
  extractJSONArray,
} from "@/lib/excel-budget-prompt";
import { callOpenRouterText, DEFAULT_TEXT_MODEL } from "@/lib/openrouter";

/**
 * POST /api/supabase/ai-sync-excel
 * รับ Excel (base64 หรือ Google Sheets URL) → ส่งให้ OpenRouter parse → sync Supabase
 *
 * Body: { file_base64?, sheets_url?, api_key, model?, preview_only? }
 * ใช้ OpenRouter เป็น gateway เดียว — 1 key รองรับทุกโมเดล
 */
export async function POST(req: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const body = await req.json();
  const { file_base64, sheets_url, api_key, model, preview_only } = body;

  if (!file_base64 && !sheets_url) {
    return NextResponse.json(
      { error: "ต้องระบุ file_base64 หรือ sheets_url" },
      { status: 400 }
    );
  }
  if (!api_key) {
    return NextResponse.json(
      { error: "ต้องระบุ OpenRouter API Key (ขอที่ openrouter.ai/keys)" },
      { status: 400 }
    );
  }

  try {
    // 1. โหลด/parse Excel → text table
    let buffer: Buffer;
    if (sheets_url) {
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
      buffer = Buffer.from(file_base64, "base64");
    }
    const tableText = excelToText(buffer);

    // 2. ส่งให้ OpenRouter
    const { text } = await callOpenRouterText(
      EXCEL_BUDGET_SYSTEM_PROMPT,
      EXCEL_BUDGET_USER_PROMPT + tableText,
      api_key,
      model || DEFAULT_TEXT_MODEL
    );

    const aiResult = extractJSONArray(text);
    if (!aiResult || aiResult.length === 0) {
      return NextResponse.json(
        {
          error: "AI ไม่สามารถสกัดข้อมูลได้ — ลองเปลี่ยน model หรือตรวจไฟล์",
          raw_text: text.substring(0, 2000),
        },
        { status: 422 }
      );
    }

    // 3. ถ้าเป็น preview_only → คืน data ให้ดูก่อน
    if (preview_only) {
      return NextResponse.json({
        success: true,
        preview: aiResult,
        total_parsed: aiResult.length,
      });
    }

    // 4. Sync to Supabase
    const result = await syncToSupabase(supabase, aiResult);

    return NextResponse.json({
      success: true,
      total_parsed: aiResult.length,
      updated: result.updated,
      created: result.created,
      errors: result.errors,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ===== Excel → text =====
function toNumber(val: unknown): number {
  if (val === null || val === undefined || val === "") return 0;
  const n = Number(String(val).replace(/,/g, "").trim());
  return isNaN(n) ? 0 : n;
}

function excelToText(buffer: Buffer): string {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
  }) as unknown[][];

  const ERP_REGEX = /^\d{18,20}$/;
  const header =
    "ชื่อโครงการ | responsible | erp_code | budget_total | budget_used | budget_remaining";
  const lines = [header];

  for (const row of rows) {
    const erpRaw = row[1];
    if (!erpRaw) continue;
    const erpCode = String(erpRaw).replace(/\.0$/, "").trim();
    if (!ERP_REGEX.test(erpCode)) continue;
    if (erpCode.endsWith("0000")) continue; // ข้าม parent/summary row

    const rawName = String(row[0] ?? "").replace(/\n/g, " ").trim();
    // ดึงชื่อหัวหน้าโครงการจากวงเล็บท้ายชื่อ + ตัดออกจาก project_name
    const { name: cleanName, responsible } = splitNameAndResponsible(rawName);
    const budgetTotal = toNumber(row[4]);
    const budgetUsed = toNumber(row[9]);
    const budgetRemaining = toNumber(row[12]);

    lines.push(
      `${cleanName} | ${responsible || "-"} | ${erpCode} | ${budgetTotal} | ${budgetUsed} | ${budgetRemaining}`
    );
  }

  return lines.join("\n");
}

// ดึงชื่อหัวหน้าโครงการจากวงเล็บท้ายชื่อ เช่น "...โครงการ X (นายวัชระ)" → {name:"...โครงการ X", responsible:"นายวัชระ"}
function splitNameAndResponsible(raw: string): { name: string; responsible: string } {
  const m = raw.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (m) {
    const responsible = m[2].trim();
    // กรองวงเล็บที่ไม่ใช่ชื่อคน (เช่น "(GI)" "(งาหอม)" "(2)" )
    const looksLikePerson =
      /^(นาย|นาง|นางสาว|ดร\.|ผศ\.|รศ\.|ศ\.|อาจารย์|ผู้ช่วยศาสตราจารย์|รองศาสตราจารย์|ศาสตราจารย์)/.test(
        responsible
      );
    if (looksLikePerson) {
      return { name: m[1].trim(), responsible };
    }
  }
  return { name: raw, responsible: "" };
}

// ===== Sync to Supabase =====
interface BudgetRow {
  erp_code: string;
  project_name?: string;
  responsible?: string;
  budget_total: number;
  budget_used: number;
  budget_remaining: number;
}

async function syncToSupabase(
  supabase: ReturnType<typeof getSupabase>,
  rows: Record<string, unknown>[]
) {
  if (!supabase) throw new Error("Supabase not configured");

  let updated = 0;
  let created = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const proj = row as unknown as BudgetRow;
    if (!proj.erp_code) continue;

    const erpCode = String(proj.erp_code).trim();
    const responsible = (proj.responsible || "").trim();
    const projectName = (proj.project_name || "").trim();
    const budgetTotal = Number(proj.budget_total) || 0;
    const budgetUsed = Number(proj.budget_used) || 0;
    // clamp ≥ 0 — ERP อาจมีติดลบแต่ระบบเราไม่แสดง
    const budgetRemaining = Math.max(
      0,
      Number(proj.budget_remaining) || Math.max(0, budgetTotal - budgetUsed)
    );

    const { data: existing, error: fetchErr } = await supabase
      .from("projects")
      .select("id, budget_reported, responsible, project_name")
      .eq("erp_code", erpCode)
      .maybeSingle();

    if (fetchErr) {
      errors.push(`${erpCode}: ${fetchErr.message}`);
      continue;
    }

    if (!existing) {
      const { error: insertErr } = await supabase.from("projects").insert({
        id: erpCode,
        erp_code: erpCode,
        project_name: projectName || `โครงการ ${erpCode}`,
        responsible: responsible || null,
        main_program: "ใต้ร่มพระบารมี",
        organization: "",
        budget_total: budgetTotal,
        budget_used: budgetUsed,
        budget_remaining: budgetRemaining,
      });
      if (insertErr) {
        errors.push(`${erpCode} (insert): ${insertErr.message}`);
      } else {
        created++;
      }
      continue;
    }

    // คำนวณ effective remaining โดยรวม budget_reported ด้วย
    const existingRow = existing as {
      budget_reported?: number;
      responsible?: string | null;
      project_name?: string | null;
    };
    const reported = Number(existingRow.budget_reported || 0);
    const effectiveUsed = Math.max(budgetUsed, reported);
    const effectiveRemaining = Math.max(0, budgetTotal - effectiveUsed);

    // Update payload — เติม responsible/project_name ก็ต่อเมื่อ DB ยังว่างอยู่ (กันทับชื่อที่ user แก้เอง)
    const updatePayload: Record<string, unknown> = {
      budget_total: budgetTotal,
      budget_used: budgetUsed,
      budget_remaining: effectiveRemaining,
    };
    if (responsible && !existingRow.responsible) {
      updatePayload.responsible = responsible;
    }
    if (projectName && !existingRow.project_name) {
      updatePayload.project_name = projectName;
    }

    const { error: updateErr } = await supabase
      .from("projects")
      .update(updatePayload)
      .eq("erp_code", erpCode);

    if (updateErr) {
      errors.push(`${erpCode}: ${updateErr.message}`);
    } else {
      updated++;
    }
  }

  return { updated, created, errors };
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
