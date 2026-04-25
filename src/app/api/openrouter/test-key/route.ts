import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/openrouter/test-key
 * ทดสอบว่า OpenRouter API key ใช้งานได้จริง · ดู credit/limit ปัจจุบัน
 *
 * Body:  { api_key: string }
 * OK:    { ok: true, label, usage, limit, limit_remaining, is_free_tier, rate_limit }
 * Fail:  { ok: false, status, error } (status 200 — UI แสดง error message)
 *
 * ใช้ endpoint สาธารณะ https://openrouter.ai/api/v1/auth/key (รวดเร็ว · ไม่นับ token)
 */
export async function POST(req: NextRequest) {
  let body: { api_key?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const apiKey = (body.api_key || "").trim();
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "ต้องระบุ api_key" },
      { status: 400 }
    );
  }
  if (!apiKey.startsWith("sk-or-")) {
    return NextResponse.json({
      ok: false,
      error: "Key รูปแบบไม่ถูกต้อง — OpenRouter key ขึ้นต้นด้วย sk-or-",
    });
  }

  try {
    const res = await fetch("https://openrouter.ai/api/v1/auth/key", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      // OpenRouter ตอบเร็ว — ตั้ง 10 วิป้อง hang
      signal: AbortSignal.timeout(10000),
    });

    if (res.status === 401) {
      return NextResponse.json({
        ok: false,
        status: 401,
        error: "Key ไม่ถูกต้อง หรือถูก revoke แล้ว — ขอใหม่ที่ openrouter.ai/keys",
      });
    }
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({
        ok: false,
        status: res.status,
        error: `OpenRouter (${res.status}): ${text.substring(0, 200)}`,
      });
    }

    const data = await res.json();
    // OpenRouter response shape: { data: { label, usage, limit, limit_remaining, is_free_tier, rate_limit } }
    const info = data?.data || data || {};

    return NextResponse.json({
      ok: true,
      label: info.label ?? null,
      usage: typeof info.usage === "number" ? info.usage : null,
      limit: typeof info.limit === "number" ? info.limit : null,
      limit_remaining:
        typeof info.limit_remaining === "number" ? info.limit_remaining : null,
      is_free_tier: !!info.is_free_tier,
      rate_limit: info.rate_limit ?? null,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.name === "AbortError" || err.name === "TimeoutError"
          ? "Timeout — เชื่อมต่อ OpenRouter ไม่ได้ (network?)"
          : err.message
        : "ทดสอบ key ไม่สำเร็จ";
    return NextResponse.json({ ok: false, error: message });
  }
}
