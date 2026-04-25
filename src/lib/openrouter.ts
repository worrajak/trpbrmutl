/**
 * OpenRouter — Universal AI Gateway
 * 1 API key ใช้ได้ทุกโมเดล (Claude, GPT, Gemini, Llama, DeepSeek, Qwen, Mistral ฯลฯ)
 * https://openrouter.ai/docs
 *
 * Pattern อ้างอิงจาก CESrc_Profile (cesru) — ใช้ OpenRouter เป็น gateway เดียว
 * ไม่มี provider switcher อีกต่อไป
 */

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://rpf-researcher-profile.vercel.app");
const SITE_TITLE = "RPF Researcher Profile";

// Default models — เลือก free + เร็ว สำหรับ JSON extraction
export const DEFAULT_TEXT_MODEL = "google/gemini-2.0-flash-exp:free";
export const DEFAULT_PDF_MODEL = "anthropic/claude-haiku-4.5";

// Quick-pick lists สำหรับ UI (browser modal ดึงสด ๆ จาก /api/ai-models)
export const SUGGESTED_MODELS = {
  free: [
    "google/gemini-2.0-flash-exp:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "deepseek/deepseek-r1:free",
    "deepseek/deepseek-chat-v3-0324:free",
    "qwen/qwen-2.5-72b-instruct:free",
  ],
  paid: [
    "anthropic/claude-haiku-4.5",
    "anthropic/claude-sonnet-4.5",
    "openai/gpt-4.1-mini",
    "openai/gpt-4.1",
    "google/gemini-2.5-flash",
    "google/gemini-2.5-pro",
  ],
};

type Role = "system" | "user" | "assistant";
type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }
  | { type: "file"; file: { filename: string; file_data: string } };
type ChatMessage = { role: Role; content: string | ContentPart[] };

interface OpenRouterOptions {
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  plugins?: Array<Record<string, unknown>>;
}

export interface OpenRouterResult {
  text: string;
  raw: unknown;
}

export async function callOpenRouter(opts: OpenRouterOptions): Promise<OpenRouterResult> {
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.apiKey}`,
      "HTTP-Referer": SITE_URL,
      "X-Title": SITE_TITLE,
    },
    body: JSON.stringify({
      model: opts.model,
      max_tokens: opts.maxTokens ?? 4096,
      temperature: opts.temperature ?? 0.1,
      messages: opts.messages,
      ...(opts.plugins ? { plugins: opts.plugins } : {}),
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenRouter (${res.status}): ${errText.substring(0, 400)}`);
  }

  const data = await res.json();
  const text: string = data.choices?.[0]?.message?.content || "";
  return { text, raw: data };
}

/** Text-only — สำหรับ Excel parsing ที่ extract เป็น text แล้ว */
export async function callOpenRouterText(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
  model: string
): Promise<OpenRouterResult> {
  return callOpenRouter({
    apiKey,
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });
}

/**
 * PDF parsing engines (OpenRouter file-parser plugin)
 * - "native"     : Claude/Gemini อ่าน PDF เอง — แม่นสุด รองรับ scan ได้
 *                  (ใช้ได้กับ models ที่ support PDF natively เท่านั้น)
 * - "pdf-text"   : ฟรี · text-only · ใช้ไม่ได้กับ scanned PDF
 * - "mistral-ocr": $2/1,000 หน้า · OCR สำหรับ scan
 *
 * https://openrouter.ai/docs/features/multimodal/pdfs
 */
export type PdfEngine = "native" | "pdf-text" | "mistral-ocr";
export const DEFAULT_PDF_ENGINE: PdfEngine = "native";

export async function callOpenRouterPDF(
  systemPrompt: string,
  userPrompt: string,
  pdfBase64: string,
  apiKey: string,
  model: string,
  engine: PdfEngine = DEFAULT_PDF_ENGINE
): Promise<OpenRouterResult> {
  return callOpenRouter({
    apiKey,
    model,
    maxTokens: 8192,
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          {
            type: "file",
            file: {
              filename: "document.pdf",
              file_data: `data:application/pdf;base64,${pdfBase64}`,
            },
          },
          { type: "text", text: userPrompt },
        ],
      },
    ],
    plugins: [{ id: "file-parser", pdf: { engine } }],
  });
}
