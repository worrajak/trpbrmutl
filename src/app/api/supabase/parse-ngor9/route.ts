import { NextRequest, NextResponse } from "next/server";
import { NGOR9_SYSTEM_PROMPT, NGOR9_USER_PROMPT, extractJSON } from "@/lib/ngor9-prompt";
import { callOpenRouterPDF, DEFAULT_PDF_MODEL } from "@/lib/openrouter";

/**
 * POST /api/supabase/parse-ngor9
 * รับ PDF (base64) → ส่งให้ OpenRouter parse → คืน JSON ตาม schema ง9
 *
 * Body: { pdf_base64, api_key, model? }
 * ใช้ OpenRouter เป็น gateway เดียว — รองรับ Claude / GPT / Gemini / ฯลฯ ผ่าน 1 key
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { pdf_base64, api_key, model } = body;

  if (!pdf_base64 || !api_key) {
    return NextResponse.json(
      { error: "ต้องระบุ pdf_base64 และ api_key (OpenRouter — ขอที่ openrouter.ai/keys)" },
      { status: 400 }
    );
  }

  try {
    const { text } = await callOpenRouterPDF(
      NGOR9_SYSTEM_PROMPT,
      NGOR9_USER_PROMPT,
      pdf_base64,
      api_key,
      model || DEFAULT_PDF_MODEL
    );

    const result = extractJSON(text);
    if (!result) {
      return NextResponse.json(
        {
          error: "AI ไม่สามารถแปลงข้อมูลเป็น JSON ได้ — ลองเปลี่ยน model",
          raw_text: text.substring(0, 2000),
        },
        { status: 422 }
      );
    }

    return NextResponse.json({ success: true, data: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
