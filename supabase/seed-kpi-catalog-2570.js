/**
 * เพิ่มชุดตัวชี้วัดปีงบประมาณ 2570 ลง rpf_kpi_catalog
 *
 * ที่มา: "ตัวชี้วัดแผน 70 69-9-25 วล 9.57.xlsx" (โฟลเดอร์ 2026-09-06_แผนงบประมาณ70)
 *        คอลัมน์ "ค่าเป้าหมาย มทร.ล้านนา ปี 70"
 *
 * ⚠️ ต้องรันหลังจากที่โค้ดกรอง rpf_kpi_catalog ด้วย fiscal_year แล้วเท่านั้น
 *    (fetchKpiCatalog(fy) — commit "รองรับหลายปีงบ") ไม่งั้นหน้าเว็บจะนับตัวชี้วัด
 *    รวมสองปีเป็น 14 ตัว แล้วสัดส่วน "KPI ครอบคลุม x/y" จะเพี้ยนทันที
 *
 * ตัวชี้วัด 7 ตัวที่กลุ่มแผนงานใต้ร่มพระบารมีรับมา ปี 2570 เป้าเท่าเดิมทุกตัว
 * (ค.ต.ป. ตั้งเป้าที่ 35 ไว้ 500 แต่ค่าของมหาวิทยาลัยยังเป็น 400 — ใช้ค่าของมหาวิทยาลัย
 *  ให้สอดคล้องกับปี 2569 ที่อ้างเป้าระดับมหาวิทยาลัยเช่นกัน)
 *
 * usage:  node supabase/seed-kpi-catalog-2570.js            # dry-run
 *         node supabase/seed-kpi-catalog-2570.js --commit
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
const FY = 2570;

const ROWS = [
  { code: "KPI-10", target_count: 100, scope: "rmutl", target_unit: "เครือข่าย",
    name_th: "เครือข่ายความร่วมมือกับหน่วยงานภายนอก" },
  { code: "KPI-17", target_count: 50, scope: "rmutl", target_unit: "ผลงาน",
    name_th: "ทรัพย์สินทางปัญญาที่ยื่นขอจดทะเบียน" },
  { code: "KPI-35", target_count: 400, scope: "rmutl", target_unit: "คน",
    name_th: "คณาจารย์/บุคลากรนำเทคโนโลยีไปพัฒนา" },
  { code: "KPI-36", target_count: 15, scope: "rmutl", target_unit: "แหล่งเรียนรู้",
    name_th: "แหล่งเรียนรู้ตลอดชีวิตของสังคม" },
  { code: "KPI-38", target_count: 100, scope: "rmutl", target_unit: "สถานประกอบการ",
    name_th: "สถานประกอบการรับการถ่ายทอด" },
  { code: "KPI-39", target_count: 60, scope: "underroof", target_unit: "องค์ความรู้",
    name_th: "องค์ความรู้ในโครงการหลวง/พระราชดำริ" },
  { code: "KPI-40", target_count: 100, scope: "rmutl", target_unit: "องค์ความรู้",
    name_th: "องค์ความรู้ยกระดับคุณภาพชีวิต" },
];

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

(async () => {
  console.log(`\n🎯 เพิ่มชุดตัวชี้วัดปีงบประมาณ ${FY}`);
  console.log(`Mode: ${COMMIT ? "🟢 COMMIT" : "🟡 DRY-RUN"}\n`);

  const { data: all, error } = await sb
    .from("rpf_kpi_catalog")
    .select("code, fiscal_year, target_count")
    .order("fiscal_year");
  if (error) { console.error("❌", error.message); process.exit(1); }

  const byYear = {};
  all.forEach((r) => { byYear[r.fiscal_year] = (byYear[r.fiscal_year] || 0) + 1; });
  console.log(`  ใน catalog ตอนนี้: ${JSON.stringify(byYear)}`);

  const existing = new Set(all.filter((r) => r.fiscal_year === FY).map((r) => r.code));
  const toInsert = ROWS.filter((r) => !existing.has(r.code));

  if (toInsert.length === 0) {
    console.log(`\n✅ มีชุดปี ${FY} ครบแล้ว ไม่ต้องเพิ่ม`);
    return;
  }

  console.log(`\n📋 จะเพิ่ม ${toInsert.length} ตัว`);
  toInsert.forEach((r) =>
    console.log(`   ${r.code.padEnd(8)} เป้า ${String(r.target_count).padStart(4)} ${r.target_unit}   ${r.name_th}`));

  // ตรวจว่า migration 2026-10-07-kpi-catalog-multiyear.sql รันแล้วหรือยัง
  // ใช้การมีอยู่ของ kpi_targets.fiscal_year เป็นตัวบอก เพราะอยู่ใน transaction เดียวกัน
  // กับการเปลี่ยน PRIMARY KEY เป็น (code, fiscal_year)
  const { error: migErr } = await sb.from("kpi_targets").select("fiscal_year").limit(1);
  if (migErr) {
    console.error(
      `\n❌ ยังไม่ได้รัน migration — kpi_targets.fiscal_year ไม่มี` +
      `\n   รัน supabase/2026-10-07-kpi-catalog-multiyear.sql ใน Supabase SQL Editor ก่อน` +
      `\n   (${migErr.message}) — ยกเลิก ไม่เขียน DB`
    );
    process.exit(1);
  }
  console.log(`  ✓ migration รันแล้ว — PRIMARY KEY รองรับหลายปีงบ`);

  if (!COMMIT) { console.log(`\n🟡 DRY-RUN — รัน \`--commit\` เพื่อเขียนจริง`); return; }

  let ok = 0;
  for (const r of toInsert) {
    const { error } = await sb.from("rpf_kpi_catalog").insert({ ...r, fiscal_year: FY });
    if (error) console.log(`   ❌ ${r.code}: ${error.message}`); else ok++;
  }
  console.log(`\n✅ เพิ่มสำเร็จ ${ok}/${toInsert.length}`);
})();
