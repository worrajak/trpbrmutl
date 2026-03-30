import { NextRequest, NextResponse } from "next/server";
import { NGOR9_SYSTEM_PROMPT, NGOR9_USER_PROMPT, extractJSON } from "@/lib/ngor9-prompt";

// POST: ส่ง PDF (base64) ไปให้ AI parse → คืน JSON
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { pdf_base64, ai_provider, api_key } = body;

  if (!pdf_base64 || !ai_provider || !api_key) {
    return NextResponse.json(
      { error: "ต้องระบุ pdf_base64, ai_provider, api_key" },
      { status: 400 }
    );
  }

  try {
    let result: Record<string, unknown> | null = null;

    if (ai_provider === "claude") {
      result = await parseWithClaude(pdf_base64, api_key);
    } else if (ai_provider === "gemini") {
      result = await parseWithGemini(pdf_base64, api_key);
    } else if (ai_provider === "openai") {
      result = await parseWithOpenAI(pdf_base64, api_key);
    } else {
      return NextResponse.json({ error: "AI provider ไม่รองรับ" }, { status: 400 });
    }

    if (!result) {
      return NextResponse.json({ error: "AI ไม่สามารถอ่านข้อมูลได้" }, { status: 422 });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ===== Claude API (Anthropic) =====
async function parseWithClaude(pdfBase64: string, apiKey: string) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: NGOR9_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: pdfBase64,
              },
            },
            { type: "text", text: NGOR9_USER_PROMPT },
          ],
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
  return extractJSON(text);
}

// ===== Google Gemini API =====
async function parseWithGemini(pdfBase64: string, apiKey: string) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inline_data: {
                  mime_type: "application/pdf",
                  data: pdfBase64,
                },
              },
              {
                text: NGOR9_SYSTEM_PROMPT + "\n\n" + NGOR9_USER_PROMPT,
              },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: 4096,
          temperature: 0.1,
        },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Gemini API: ${err.error?.message || res.statusText}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return extractJSON(text);
}

// ===== OpenAI API (GPT-4o) =====
async function parseWithOpenAI(pdfBase64: string, apiKey: string) {
  // OpenAI ไม่รับ PDF โดยตรง ต้องแปลงเป็น image ก่อน
  // ใช้ text description แทน
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      max_tokens: 4096,
      messages: [
        { role: "system", content: NGOR9_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:application/pdf;base64,${pdfBase64}`,
              },
            },
            { type: "text", text: NGOR9_USER_PROMPT },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`OpenAI API: ${err.error?.message || res.statusText}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || "";
  return extractJSON(text);
}
