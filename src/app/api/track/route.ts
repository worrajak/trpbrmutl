import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ ok: true }); // ไม่มี Supabase ก็ไม่ error
    }

    const body = await req.json();
    const { event, page, target } = body;

    if (!event || !page) {
      return NextResponse.json({ error: "missing fields" }, { status: 400 });
    }

    // hash IP เพื่อความเป็นส่วนตัว
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || "unknown";
    const ipHash = await hashString(ip);

    const referrer = req.headers.get("referer") || "";
    const ua = req.headers.get("user-agent") || "";

    await supabase.from("analytics_events").insert({
      event,
      page,
      target: target || null,
      referrer,
      user_agent: ua,
      ip_hash: ipHash,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str + "rpf-salt-2569");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").substring(0, 16);
}
