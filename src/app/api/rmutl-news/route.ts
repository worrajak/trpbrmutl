import { NextResponse } from "next/server";
import { scrapeRmutlNews } from "@/lib/scraper";

// cache 1 ชั่วโมง — ข่าวมหาวิทยาลัยไม่ได้อัพเดทบ่อยขนาดนั้น
export const revalidate = 3600;

export async function GET() {
  const news = await scrapeRmutlNews(8);
  return NextResponse.json(
    { news, source: "www.rmutl.ac.th" },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    }
  );
}
