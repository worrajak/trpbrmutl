import { NextResponse } from "next/server";

/**
 * GET /api/ai-models
 * ดึง model list จาก OpenRouter (public endpoint, ไม่ต้องใช้ key)
 * คืน { free, paid, all, free_count, paid_count, total } เรียง free ก่อน
 *
 * Cache 5 นาทีบน edge
 */

interface OpenRouterModel {
  id: string;
  name?: string;
  pricing?: { prompt?: string; completion?: string };
  context_length?: number;
  architecture?: { modality?: string; input_modalities?: string[] };
}

interface FormattedModel {
  id: string;
  name: string;
  is_free: boolean;
  price: string;
  context_length: number;
  has_vision: boolean;
  provider: string;
}

export const revalidate = 300;

export async function GET() {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { Accept: "application/json" },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `OpenRouter API returned ${res.status}` },
        { status: 500 }
      );
    }

    const data = await res.json();
    const models: OpenRouterModel[] = data.data || [];

    const isFreeModel = (m: OpenRouterModel): boolean =>
      m.id.includes(":free") ||
      (!!m.pricing && m.pricing.prompt === "0" && m.pricing.completion === "0");

    const format = (m: OpenRouterModel): FormattedModel => {
      const promptCost = parseFloat(m.pricing?.prompt || "0");
      const completionCost = parseFloat(m.pricing?.completion || "0");
      const free = promptCost === 0 && completionCost === 0;
      const hasVision = !!(
        m.architecture?.input_modalities?.includes("image") ||
        m.architecture?.modality?.toLowerCase().includes("image")
      );
      return {
        id: m.id,
        name: m.name || m.id,
        is_free: free,
        price: free
          ? "FREE"
          : `$${(promptCost * 1_000_000).toFixed(2)}/$${(completionCost * 1_000_000).toFixed(2)} per M`,
        context_length: m.context_length || 0,
        has_vision: hasVision,
        provider: m.id.split("/")[0] || "unknown",
      };
    };

    const free = models
      .filter(isFreeModel)
      .map(format)
      .sort((a, b) => a.id.localeCompare(b.id));

    const paid = models
      .filter((m) => !isFreeModel(m))
      .map(format)
      .sort((a, b) => {
        const aPrice = parseFloat(a.price.replace(/[^0-9.]/g, "")) || 999;
        const bPrice = parseFloat(b.price.replace(/[^0-9.]/g, "")) || 999;
        if (aPrice !== bPrice) return aPrice - bPrice;
        return a.id.localeCompare(b.id);
      });

    return NextResponse.json({
      total: models.length,
      free_count: free.length,
      paid_count: paid.length,
      free,
      paid,
      all: [...free, ...paid],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch OpenRouter models";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
