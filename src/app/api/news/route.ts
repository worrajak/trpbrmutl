import { NextResponse } from "next/server";
import { scrapeNews } from "@/lib/scraper";

export const revalidate = 3600; // cache 1 ชั่วโมง

export async function GET() {
  const news = await scrapeNews();
  return NextResponse.json({ news });
}
