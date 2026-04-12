import { NextResponse } from "next/server";
import {
  fetchProjects,
  fetchActivities,
  computeActivityAlerts,
} from "@/lib/supabase-data";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function sendTelegram(text: string) {
  const res = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: "HTML" }),
    }
  );
  if (!res.ok) throw new Error(`Telegram API error: ${res.statusText}`);
  return res.json();
}

export async function POST() {
  if (!BOT_TOKEN || !CHAT_ID) {
    return NextResponse.json({ error: "Telegram not configured" }, { status: 500 });
  }

  const [projects, activities] = await Promise.all([
    fetchProjects(),
    fetchActivities(),
  ]);

  const alerts = computeActivityAlerts(projects, activities);
  const overdue = alerts.filter((a) => a.alertType === "overdue");
  const dueThisMonth = alerts.filter((a) => a.alertType === "due_this_month");

  if (alerts.length === 0) {
    await sendTelegram("✅ ระบบใต้ร่มพระบารมี มทร.ล้านนา\nไม่มีกิจกรรมที่ต้องแจ้งเตือน ทุกอย่างเป็นไปตามแผน");
    return NextResponse.json({ sent: true, alerts: 0 });
  }

  const lines: string[] = [
    "🔔 <b>แจ้งเตือนกิจกรรมโครงการ</b>",
    "ระบบติดตามโครงการ ใต้ร่มพระบารมี มทร.ล้านนา",
    "",
  ];

  if (overdue.length > 0) {
    lines.push(`🔴 <b>เลยกำหนด (${overdue.length} รายการ)</b>`);
    overdue.slice(0, 5).forEach((a) => {
      lines.push(`• ${a.projectName.substring(0, 40)}`);
      lines.push(`  └ ${a.activityName.substring(0, 40)}`);
    });
    if (overdue.length > 5) lines.push(`  ... และอีก ${overdue.length - 5} รายการ`);
    lines.push("");
  }

  if (dueThisMonth.length > 0) {
    lines.push(`🟡 <b>ถึงกำหนดเดือนนี้ (${dueThisMonth.length} รายการ)</b>`);
    dueThisMonth.slice(0, 5).forEach((a) => {
      lines.push(`• ${a.projectName.substring(0, 40)}`);
      lines.push(`  └ ${a.activityName.substring(0, 40)}`);
    });
    if (dueThisMonth.length > 5) lines.push(`  ... และอีก ${dueThisMonth.length - 5} รายการ`);
    lines.push("");
  }

  lines.push(`📊 รวมทั้งหมด ${alerts.length} รายการ`);

  await sendTelegram(lines.join("\n"));
  return NextResponse.json({ sent: true, alerts: alerts.length, overdue: overdue.length, due_this_month: dueThisMonth.length });
}
