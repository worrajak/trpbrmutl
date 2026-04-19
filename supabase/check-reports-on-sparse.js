// ตรวจ 21 โครงการที่มี activities 1-4 ว่ามีรายงานแล้วหรือยัง
const { createClient } = require("@supabase/supabase-js");
const { readFileSync } = require("fs");
const { resolve } = require("path");
try {
  const envText = readFileSync(resolve(__dirname, "../.env.local"), "utf8");
  for (const line of envText.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/i);
    if (!m) continue;
    const [, k, vRaw] = m;
    const v = vRaw.replace(/^["']|["']$/g, "");
    if (!process.env[k]) process.env[k] = v;
  }
} catch {}
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
(async () => {
  const [projRes, actRes, repRes] = await Promise.all([
    sb.from("projects").select("id, project_name"),
    sb.from("activities").select("id, project_id, activity_name, activity_order"),
    sb.from("activity_reports").select("project_id, budget_spent"),
  ]);
  const actByProj = new Map();
  for (const a of actRes.data || []) {
    if (!actByProj.has(a.project_id)) actByProj.set(a.project_id, []);
    actByProj.get(a.project_id).push(a);
  }
  const repByProj = new Map();
  for (const r of repRes.data || []) repByProj.set(r.project_id, (repByProj.get(r.project_id) || 0) + 1);

  const sparse = (projRes.data || [])
    .map((p) => ({ ...p, acts: actByProj.get(p.id) || [], reports: repByProj.get(p.id) || 0 }))
    .filter((p) => p.acts.length >= 1 && p.acts.length <= 4);

  console.log(`=== 21 โครงการที่มีกิจกรรม 1-4 ขั้น ===\n`);
  const safeToReplace = [], hasReports = [];
  for (const p of sparse) {
    const actList = p.acts.sort((a, b) => a.activity_order - b.activity_order).map((a) => `${a.activity_order}:${(a.activity_name || "").slice(0, 20)}`).join(" | ");
    console.log(`\n[${p.acts.length}กิจ ${p.reports}รายงาน] ${p.id}`);
    console.log(`   ${(p.project_name || "").slice(0, 55)}`);
    console.log(`   ${actList}`);
    (p.reports > 0 ? hasReports : safeToReplace).push(p);
  }

  console.log(`\n\n=== สรุป ===`);
  console.log(`ปลอดภัย replace ได้ (ไม่มีรายงาน): ${safeToReplace.length}`);
  console.log(`มีรายงานแล้ว — ห้ามแตะ:            ${hasReports.length}`);
  if (hasReports.length) {
    console.log(`\n-- โครงการที่มีรายงาน (ห้ามแตะ):`);
    for (const p of hasReports) console.log(`   ${p.id}  (${p.reports} รายงาน)`);
  }
})();
