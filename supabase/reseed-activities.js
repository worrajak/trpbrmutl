// Seed กิจกรรม 5 ขั้นมาตรฐาน + KPI + แบ่งงบ ตาม template ของโครงการใต้ร่มพระบารมี
//
// โหมด:
//   default (ปลอดภัย)    — seed เฉพาะโครงการที่ activities = 0
//   --include-sparse     — + เติม 20 โครงการที่ acts 1-4 (replace กิจกรรม + KPI เดิม)
//                          แต่ "ข้าม" โครงการที่มี activity_reports แล้ว (ป้องกันข้อมูลหาย)
//   --dry-run            — แสดงว่าจะทำอะไร ไม่แตะ DB
//
// run:
//   node supabase/reseed-activities.js --dry-run
//   node supabase/reseed-activities.js
//   node supabase/reseed-activities.js --include-sparse --dry-run
//   node supabase/reseed-activities.js --include-sparse

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

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const INCLUDE_SPARSE = args.includes("--include-sparse");

// กิจกรรม 5 ขั้นมาตรฐาน (เหมือนที่ใช้ใน /api/admin/seed-activities)
const TEMPLATE_ACTS = [
  { order: 1, name: "วางแผนและประสานงาน",
    desc: "ประชุมวางแผนการดำเนินงาน ประสานงานทุกฝ่ายที่เกี่ยวข้อง จัดทำปฏิทินการทำงาน",
    months: [1, 2], pct: 0.05 },
  { order: 2, name: "สำรวจพื้นที่และจัดเตรียมวัสดุ",
    desc: "สำรวจพื้นที่เป้าหมาย จัดซื้อวัสดุ/อุปกรณ์ เตรียมความพร้อมก่อนลงพื้นที่",
    months: [2, 3, 4], pct: 0.25 },
  { order: 3, name: "ดำเนินกิจกรรมและลงพื้นที่",
    desc: "ลงพื้นที่ดำเนินกิจกรรมตามแผน ทดสอบ/สาธิต/ฝึกอบรม หารือกับกลุ่มเป้าหมาย",
    months: [3, 4, 5, 6, 7], pct: 0.45 },
  { order: 4, name: "ติดตามผลและประชุมสรุป",
    desc: "ติดตามและประเมินผลการดำเนินงาน ประชุมสรุปกับทีมงานและผู้มีส่วนได้ส่วนเสีย",
    months: [7, 8, 9], pct: 0.15 },
  { order: 5, name: "จัดทำรายงานและเผยแพร่ผล",
    desc: "รวบรวมข้อมูล จัดทำรายงานฉบับสมบูรณ์ เผยแพร่ผลการดำเนินงาน",
    months: [9, 10, 11, 12], pct: 0.10 },
];

const TEMPLATE_KPIS = [
  { name: "จำนวนผู้ได้รับประโยชน์จากโครงการ", type: "quantitative", target: 50, unit: "คน" },
  { name: "จำนวนพื้นที่/ชุมชนที่ได้รับการพัฒนา", type: "quantitative", target: 1, unit: "แห่ง" },
  { name: "ร้อยละความพึงพอใจของผู้รับบริการ", type: "quantitative", target: 80, unit: "ร้อยละ" },
  { name: "จำนวนองค์ความรู้/เทคโนโลยีที่ถ่ายทอด", type: "quantitative", target: 1, unit: "เรื่อง" },
  { name: "จัดทำรายงานฉบับสมบูรณ์", type: "qualitative", target: 1, unit: "ฉบับ" },
];

async function seedOne(p, replaceExisting) {
  const total = Number(p.budget_total || 0);

  if (replaceExisting) {
    // ลบกิจกรรม + kpi เดิม (CASCADE จะลบ kpi_contributions ตาม แต่ไม่มี reports ใน subset นี้)
    if (!DRY_RUN) {
      await sb.from("activities").delete().eq("project_id", p.id);
      await sb.from("kpi_targets").delete().eq("project_id", p.id);
    }
  }

  const acts = TEMPLATE_ACTS.map((a) => ({
    project_id: p.id,
    activity_order: a.order,
    activity_name: a.name,
    expected_output: a.desc,
    budget: Math.round(total * a.pct),
    planned_months: a.months,
    status: "not_started",
  }));
  const kpis = TEMPLATE_KPIS.map((k) => ({
    project_id: p.id,
    kpi_name: k.name,
    kpi_type: k.type,
    target_value: k.target,
    actual_value: 0,
    unit: k.unit,
    verified: false,
  }));

  if (!DRY_RUN) {
    const { error: e1 } = await sb.from("activities").insert(acts);
    if (e1) throw new Error(`activities: ${e1.message}`);
    const { error: e2 } = await sb.from("kpi_targets").insert(kpis);
    if (e2) throw new Error(`kpi_targets: ${e2.message}`);
  }

  return { acts: acts.length, kpis: kpis.length, budgetSplit: acts.map((a) => a.budget) };
}

(async () => {
  const [projRes, actRes, repRes] = await Promise.all([
    sb.from("projects").select("id, project_name, budget_total"),
    sb.from("activities").select("project_id"),
    sb.from("activity_reports").select("project_id"),
  ]);
  const actCount = new Map();
  for (const a of actRes.data || []) actCount.set(a.project_id, (actCount.get(a.project_id) || 0) + 1);
  const hasReports = new Set((repRes.data || []).map((r) => r.project_id));

  const rows = (projRes.data || []).map((p) => ({
    ...p, acts: actCount.get(p.id) || 0, hasReports: hasReports.has(p.id),
  }));

  const empty = rows.filter((r) => r.acts === 0);
  const sparse = rows.filter((r) => r.acts >= 1 && r.acts <= 4 && !r.hasReports);
  const skipped = rows.filter((r) => r.acts >= 1 && r.acts <= 4 && r.hasReports);

  const targets = INCLUDE_SPARSE ? [...empty, ...sparse] : empty;

  console.log(`โหมด: ${DRY_RUN ? "DRY-RUN (ไม่แตะ DB)" : "APPLY"}  |  include-sparse: ${INCLUDE_SPARSE}\n`);
  console.log(`= ${empty.length} โครงการไม่มีกิจกรรมเลย → seed ใหม่`);
  if (INCLUDE_SPARSE) {
    console.log(`= ${sparse.length} โครงการมี 1-4 ไม่มีรายงาน → replace เป็น template 5 ขั้น`);
    console.log(`= ข้าม ${skipped.length} โครงการที่มีรายงานแล้ว`);
  }
  console.log(`\nเป้าหมาย: ${targets.length} โครงการ\n`);

  let ok = 0, err = 0;
  for (const p of targets) {
    const replaceExisting = p.acts > 0;
    try {
      const r = await seedOne(p, replaceExisting);
      const budgetStr = r.budgetSplit.map((b) => b.toLocaleString()).join(" / ");
      const action = replaceExisting ? "REPLACE" : "NEW";
      console.log(`✅ [${action}] ${p.id.padEnd(25)} งบ ${Number(p.budget_total).toLocaleString().padStart(10)}  แบ่งงวด: ${budgetStr}`);
      ok++;
    } catch (e) {
      console.log(`❌ ${p.id} — ${e.message}`);
      err++;
    }
  }

  console.log(`\n=== สรุป ===`);
  console.log(`สำเร็จ: ${ok}  |  ล้มเหลว: ${err}  |  ${DRY_RUN ? "(dry-run — ยังไม่มีการแก้ DB)" : ""}`);
  if (skipped.length && INCLUDE_SPARSE) {
    console.log(`\n⚠ ข้าม ${skipped.length} โครงการ (มีรายงานแล้ว):`);
    for (const p of skipped) console.log(`   ${p.id}  (${p.project_name?.slice(0, 50)})`);
  }
})();
