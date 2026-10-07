/**
 * แก้ค่าเป้าหมายตัวชี้วัดระดับมหาวิทยาลัยใน rpf_kpi_catalog ให้ตรงเอกสารทางการ
 *
 * ที่มา: "ตัวชี้วัดแผน 70 69-9-25 วล 9.57.xlsx"
 *        โฟลเดอร์ 2026-09-06_แผนงบประมาณ70 · ชีต "ย1–ย5 มทร.ล้านนา-คตป"
 *        คอลัมน์ "ค่าเป้าหมาย ปี 69" = เป้าระดับมหาวิทยาลัยที่ใช้อ้างในรายงาน
 *
 * พบว่า 2 จาก 7 ตัวที่กลุ่มแผนงานรับมา บันทึกเป้าไว้ผิดตั้งแต่ตอน seed
 *   KPI-10 เครือข่ายความร่วมมือ      DB 50  -> ที่ถูก 100
 *   KPI-17 ทรัพย์สินทางปัญญา          DB 60  -> ที่ถูก 50
 * อีก 5 ตัว (35 36 38 39 40) ตรงอยู่แล้ว
 *
 * ผลต่อร้อยละที่รายงาน (กลุ่มแผนงานรับมา / เป้ามหาวิทยาลัย)
 *   KPI-10  9/50 = 18%  ->  9/100 = 9%
 *   KPI-17  8/60 = 13%  ->  8/50  = 16%
 *
 * guard: เป้าใหม่ต้องตรงค่าที่ระบุไว้ในสคริปต์ และต้องมีแถวนั้นจริง ไม่งั้นยกเลิก
 *
 * usage:  node supabase/fix-kpi-targets-2026-10-07.js            # dry-run
 *         node supabase/fix-kpi-targets-2026-10-07.js --commit
 */
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const ROOT = path.join(__dirname, "..");
fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").split("\n").forEach((l) => {
  const m = l.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
});

const COMMIT = process.argv.includes("--commit");

/** code -> { เป้าที่ถูกต้องปี 2569, ผลจริงระดับมหาวิทยาลัยปี 2569, เป้าปี 2570 } */
const OFFICIAL = {
  "KPI-10": { target: 100, actual69: 143, target70: 100 },
  "KPI-17": { target: 50, actual69: 89, target70: 50 },
  "KPI-35": { target: 400, actual69: 639, target70: 400 },
  "KPI-36": { target: 15, actual69: 20, target70: 15 },
  "KPI-38": { target: 100, actual69: 133, target70: 100 },
  "KPI-39": { target: 60, actual69: 62, target70: 60 },
  "KPI-40": { target: 100, actual69: 161, target70: 100 },
};

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

(async () => {
  console.log(`\n🎯 แก้ค่าเป้าหมายตัวชี้วัดให้ตรงเอกสารทางการ`);
  console.log(`Mode: ${COMMIT ? "🟢 COMMIT" : "🟡 DRY-RUN"}\n`);

  const { data, error } = await sb
    .from("rpf_kpi_catalog")
    .select("code, name_th, target_count, target_unit, fiscal_year")
    .order("code");
  if (error) { console.error("❌", error.message); process.exit(1); }

  const plan = [];
  let missing = 0;
  for (const [code, o] of Object.entries(OFFICIAL)) {
    const row = data.find((r) => r.code === code);
    if (!row) { console.log(`  ⚠️  ไม่พบ ${code} ใน catalog`); missing++; continue; }
    const cur = Number(row.target_count);
    const mark = cur === o.target ? "✓" : "✗";
    console.log(
      `  ${mark} ${code.padEnd(8)} DB ${String(cur).padStart(4)} · เอกสาร ${String(o.target).padStart(4)}` +
      `   (ผลจริงระดับ ม. ปี 69 = ${o.actual69} · เป้าปี 70 = ${o.target70})`
    );
    if (cur !== o.target) plan.push({ code, from: cur, to: o.target, name: row.name_th });
  }

  if (missing) { console.error(`\n❌ มีตัวชี้วัดที่หาไม่เจอ ${missing} ตัว — ยกเลิก`); process.exit(1); }

  if (plan.length === 0) { console.log(`\n✅ ตรงเอกสารครบทุกตัวแล้ว ไม่ต้องแก้`); return; }

  console.log(`\n📋 ต้องแก้ ${plan.length} ตัว`);
  plan.forEach((p) => console.log(`   ${p.code}  ${p.from} → ${p.to}   ${p.name.slice(0, 48)}`));

  if (!COMMIT) { console.log(`\n🟡 DRY-RUN — รัน \`--commit\` เพื่อเขียนจริง`); return; }

  console.log(`\n🟢 Committing...\n`);
  let ok = 0;
  for (const p of plan) {
    const { error } = await sb
      .from("rpf_kpi_catalog")
      .update({ target_count: p.to })
      .eq("code", p.code);
    if (error) console.log(`   ❌ ${p.code}: ${error.message}`); else ok++;
  }
  console.log(`✅ แก้สำเร็จ ${ok}/${plan.length}`);

  const { data: V } = await sb.from("rpf_kpi_catalog").select("code,target_count").order("code");
  const bad = V.filter((r) => OFFICIAL[r.code] && Number(r.target_count) !== OFFICIAL[r.code].target);
  console.log(bad.length === 0 ? `ยืนยัน: ตรงเอกสารครบทุกตัว` : `⚠️ ยังไม่ตรง ${bad.length} ตัว`);
})();
