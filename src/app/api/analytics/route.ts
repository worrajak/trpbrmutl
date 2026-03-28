import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({
      totalViews: 0,
      uniqueVisitors: 0,
      topClicks: [],
      topPages: [],
      dailyViews: [],
      period: "0 วัน",
      error: "Supabase not configured",
    });
  }

  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get("days") || "30");
  const since = new Date();
  since.setDate(since.getDate() - days);

  // จำนวน page views ทั้งหมด
  const { count: totalViews } = await supabase
    .from("analytics_events")
    .select("*", { count: "exact", head: true })
    .eq("event", "page_view")
    .gte("created_at", since.toISOString());

  // จำนวน visitors (unique ip_hash)
  const { data: visitorData } = await supabase
    .from("analytics_events")
    .select("ip_hash")
    .eq("event", "page_view")
    .gte("created_at", since.toISOString());

  const uniqueVisitors = new Set(visitorData?.map((r) => r.ip_hash)).size;

  // ลิงก์ที่คลิกมากที่สุด
  const { data: clickData } = await supabase
    .from("analytics_events")
    .select("target, page")
    .eq("event", "link_click")
    .gte("created_at", since.toISOString());

  const clickCounts: Record<string, number> = {};
  clickData?.forEach((row) => {
    const key = row.target || row.page;
    clickCounts[key] = (clickCounts[key] || 0) + 1;
  });

  const topClicks = Object.entries(clickCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([target, count]) => ({ target, count }));

  // หน้าที่เข้าชมมากที่สุด
  const { data: pageData } = await supabase
    .from("analytics_events")
    .select("page")
    .eq("event", "page_view")
    .gte("created_at", since.toISOString());

  const pageCounts: Record<string, number> = {};
  pageData?.forEach((row) => {
    pageCounts[row.page] = (pageCounts[row.page] || 0) + 1;
  });

  const topPages = Object.entries(pageCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([page, count]) => ({ page, count }));

  // views ย้อนหลังรายวัน (7 วัน)
  const dailyViews: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const nextD = new Date(d);
    nextD.setDate(nextD.getDate() + 1);

    const { count } = await supabase
      .from("analytics_events")
      .select("*", { count: "exact", head: true })
      .eq("event", "page_view")
      .gte("created_at", dateStr)
      .lt("created_at", nextD.toISOString().split("T")[0]);

    dailyViews.push({ date: dateStr, count: count || 0 });
  }

  return NextResponse.json({
    totalViews: totalViews || 0,
    uniqueVisitors,
    topClicks,
    topPages,
    dailyViews,
    period: `${days} วัน`,
  });
}
