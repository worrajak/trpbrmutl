import { NextResponse } from "next/server";
import { fetchAllProjects } from "@/lib/sheets";
import { subProjects as staticProjects } from "@/lib/data";

export const revalidate = 300;

export async function GET() {
  const live = await fetchAllProjects();
  const projects = live.length > 0 ? live : staticProjects;
  return NextResponse.json({ projects, isLive: live.length > 0 });
}
