import { NextRequest, NextResponse } from "next/server";

// GET /api/ai-models?provider=gemini&api_key=...&local_base_url=...
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const provider = searchParams.get("provider");
  const apiKey = searchParams.get("api_key") || "";
  const localBaseUrl = searchParams.get("local_base_url") || "http://localhost:11434";

  try {
    let models: string[] = [];

    if (provider === "gemini") {
      models = await fetchGeminiModels(apiKey);
    } else if (provider === "claude") {
      models = await fetchClaudeModels(apiKey);
    } else if (provider === "openai") {
      models = await fetchOpenAIModels(apiKey);
    } else if (provider === "local") {
      models = await fetchLocalModels(localBaseUrl);
    } else {
      return NextResponse.json({ error: "provider ไม่รองรับ" }, { status: 400 });
    }

    return NextResponse.json({ models });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function fetchGeminiModels(apiKey: string): Promise<string[]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=50`
  );
  if (!res.ok) throw new Error(`Gemini: ${res.status} ${res.statusText}`);
  const data = await res.json();
  return (data.models || [])
    .filter((m: { supportedGenerationMethods?: string[]; name: string }) =>
      m.supportedGenerationMethods?.includes("generateContent")
    )
    .map((m: { name: string }) => m.name.replace("models/", ""))
    .filter((name: string) => name.startsWith("gemini"));
}

async function fetchClaudeModels(apiKey: string): Promise<string[]> {
  const res = await fetch("https://api.anthropic.com/v1/models", {
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
  });
  if (!res.ok) throw new Error(`Claude: ${res.status} ${res.statusText}`);
  const data = await res.json();
  return (data.data || []).map((m: { id: string }) => m.id);
}

async function fetchOpenAIModels(apiKey: string): Promise<string[]> {
  const res = await fetch("https://api.openai.com/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(`OpenAI: ${res.status} ${res.statusText}`);
  const data = await res.json();
  return (data.data || [])
    .map((m: { id: string }) => m.id)
    .filter((id: string) => id.startsWith("gpt"))
    .sort();
}

async function fetchLocalModels(baseUrl: string): Promise<string[]> {
  const base = baseUrl.replace(/\/$/, "");

  // ลอง Ollama native API ก่อน
  try {
    const res = await fetch(`${base}/api/tags`);
    if (res.ok) {
      const data = await res.json();
      return (data.models || []).map((m: { name: string }) => m.name);
    }
  } catch { /* ลอง OpenAI compat แทน */ }

  // Fallback: OpenAI-compatible /v1/models
  const res = await fetch(`${base}/v1/models`);
  if (!res.ok) throw new Error(`Local AI: ไม่สามารถเชื่อมต่อ ${base}`);
  const data = await res.json();
  return (data.data || []).map((m: { id: string }) => m.id);
}
