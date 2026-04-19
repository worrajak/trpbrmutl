import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import * as XLSX from "xlsx";
import {
  EXCEL_BUDGET_SYSTEM_PROMPT,
  EXCEL_BUDGET_USER_PROMPT,
  extractJSONArray,
} from "@/lib/excel-budget-prompt";

// POST: รับ Excel (base64) + AI provider + API key → AI parse → sync Supabase
export async function POST(req: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const body = await req.json();
  const { file_base64, sheets_url, ai_provider, api_key, preview_only, local_base_url, local_model, model } = body;

  // local AI ไม่ต้องการ api_key
  const isLocal = ai_provider === "local";
  if (!file_base64 && !sheets_url) {
    return NextResponse.json(
      { error: "ต้องระบุ file_base64 หรือ sheets_url" },
      { status: 400 }
    );
  }
  if (!ai_provider) {
    return NextResponse.json(
      { error: "ต้องระบุ ai_provider" },
      { status: 400 }
    );
  }
  if (!isLocal && !api_key) {
    return NextResponse.json(
      { error: "ต้องระบุ api_key สำหรับ provider นี้" },
      { status: 400 }
    );
  }
  if (isLocal && !local_base_url) {
    return NextResponse.json(
      { error: "ต้องระบุ local_base_url เช่น http://localhost:11434" },
      { status: 400 }
    );
  }

  try {
    // 1. Parse Excel → text table
    let buffer: Buffer;
    if (sheets_url) {
      const exportUrl = buildSheetsExportUrl(sheets_url);
      if (!exportUrl) {
        return NextResponse.json({ error: "sheets_url ไม่ถูกต้อง" }, { status: 400 });
      }
      const res = await fetch(exportUrl, { redirect: "follow" });
      if (!res.ok) {
        return NextResponse.json({ error: `ดาวน์โหลด Google Sheets ไม่ได้: ${res.statusText}` }, { status: 400 });
      }
      buffer = Buffer.from(await res.arrayBuffer());
    } else {
      buffer = Buffer.from(file_base64, "base64");
    }
    const tableText = excelToText(buffer);

    // 2. ส่งให้ AI อ่าน
    let aiResult: Record<string, unknown>[] | null = null;
    let rawText = "";

    if (ai_provider === "claude") {
      const r = await parseWithClaude(tableText, api_key, model);
      rawText = r.rawText;
      aiResult = r.data;
    } else if (ai_provider === "gemini") {
      const r = await parseWithGemini(tableText, api_key, model);
      rawText = r.rawText;
      aiResult = r.data;
    } else if (ai_provider === "openai") {
      const r = await parseWithOpenAI(tableText, api_key, model);
      rawText = r.rawText;
      aiResult = r.data;
    } else if (ai_provider === "local") {
      const r = await parseWithLocal(tableText, local_base_url, model || local_model || "llama3");
      rawText = r.rawText;
      aiResult = r.data;
    } else {
      return NextResponse.json({ error: "AI provider ไม่รองรับ" }, { status: 400 });
    }

    if (!aiResult || aiResult.length === 0) {
      return NextResponse.json(
        { error: "AI ไม่สามารถสกัดข้อมูลได้", raw_text: rawText.substring(0, 2000) },
        { status: 422 }
      );
    }

    // 3. ถ้าเป็น preview_only → คืน data ให้ดูก่อน ไม่ต้อง sync
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
  const header = "ชื่อโครงการ | erp_code | budget_total | budget_used | budget_remaining";
  const lines = [header];

  for (const row of rows) {
    const erpRaw = row[1];
    if (!erpRaw) continue;
    const erpCode = String(erpRaw).replace(/\.0$/, "").trim();
    if (!ERP_REGEX.test(erpCode)) continue;
    if (erpCode.endsWith("0000")) continue; // ข้าม parent/summary row

    const name = String(row[0] ?? "").replace(/\n/g, " ").trim();
    const budgetTotal = toNumber(row[4]);
    const budgetUsed = toNumber(row[9]);
    const budgetRemaining = toNumber(row[12]);

    lines.push(`${name} | ${erpCode} | ${budgetTotal} | ${budgetUsed} | ${budgetRemaining}`);
  }

  return lines.join("\n");
}

// ===== AI Providers =====
type ParseResult = { data: Record<string, unknown>[] | null; rawText: string };

async function parseWithClaude(tableText: string, apiKey: string, model?: string): Promise<ParseResult> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: model || "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      system: EXCEL_BUDGET_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: EXCEL_BUDGET_USER_PROMPT + tableText,
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Claude API: ${err.error?.message || res.statusText}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text || "";
  return { data: extractJSONArray(text), rawText: text };
}

async function parseWithGemini(tableText: string, apiKey: string, model?: string): Promise<ParseResult> {
  const geminiModel = model || "gemini-2.0-flash";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text:
                  EXCEL_BUDGET_SYSTEM_PROMPT +
                  "\n\n" +
                  EXCEL_BUDGET_USER_PROMPT +
                  tableText,
              },
            ],
          },
        ],
        generationConfig: { maxOutputTokens: 4096, temperature: 0.1 },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Gemini API: ${err.error?.message || res.statusText}`);
  }

  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  const text = parts
    .filter((p: { text?: string }) => p.text)
    .map((p: { text: string }) => p.text)
    .join("\n");

  return { data: extractJSONArray(text), rawText: text };
}

async function parseWithOpenAI(tableText: string, apiKey: string, model?: string): Promise<ParseResult> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || "gpt-4o-mini",
      max_tokens: 4096,
      messages: [
        { role: "system", content: EXCEL_BUDGET_SYSTEM_PROMPT },
        { role: "user", content: EXCEL_BUDGET_USER_PROMPT + tableText },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`OpenAI API: ${err.error?.message || res.statusText}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || "";
  return { data: extractJSONArray(text), rawText: text };
}

// Local AI — OpenAI-compatible (Ollama, LM Studio, Jan, etc.)
async function parseWithLocal(
  tableText: string,
  baseUrl: string,
  model: string
): Promise<ParseResult> {
  const url = baseUrl.replace(/\/$/, "") + "/v1/chat/completions";

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: EXCEL_BUDGET_SYSTEM_PROMPT },
        { role: "user", content: EXCEL_BUDGET_USER_PROMPT + tableText },
      ],
      temperature: 0.1,
      stream: false,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Local AI (${url}): ${res.status} ${text.substring(0, 200)}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || "";
  return { data: extractJSONArray(text), rawText: text };
}

// ===== Sync to Supabase =====
interface BudgetRow {
  erp_code: string;
  project_name?: string;
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
    const budgetTotal = Number(proj.budget_total) || 0;
    const budgetUsed = Number(proj.budget_used) || 0;
    // clamp ≥ 0 — ERP อาจมีติดลบแต่ระบบเราไม่แสดง
    const budgetRemaining = Math.max(0, Number(proj.budget_remaining) || Math.max(0, budgetTotal - budgetUsed));

    const { data: existing, error: fetchErr } = await supabase
      .from("projects")
      .select("id, budget_reported")
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
        project_name: proj.project_name || `โครงการ ${erpCode}`,
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
    const reported = Number((existing as { budget_reported?: number }).budget_reported || 0);
    const effectiveUsed = Math.max(budgetUsed, reported);
    const effectiveRemaining = Math.max(0, budgetTotal - effectiveUsed);

    const { error: updateErr } = await supabase
      .from("projects")
      .update({ budget_total: budgetTotal, budget_used: budgetUsed, budget_remaining: effectiveRemaining })
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
