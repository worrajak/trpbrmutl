/**
 * แก้ initiative_id ให้ตรงกับรหัส ERP (แหล่งอ้างอิงทางการเงิน)
 *
 * ที่มา: session ก่อนหน้าแก้ initiative_id ของบางโครงการตาม "Action plan master"
 *        ทับค่าที่ decode จาก ERP → ทำให้ยอดงบราย ง8 ไม่ตรงไฟล์งบประมาณทางการ
 *
 * พิสูจน์แล้วว่า ERP ถูก (เทียบกับไฟล์ 14_7_2569 แถวสรุป ERP ...0000):
 *   จัดกลุ่มด้วย ERP        → 1,988,000 / 1,999,010 / 3,999,573  ✓ ตรงทั้ง 3 แผน
 *   จัดกลุ่มด้วย initiative_id → knowledge เกิน 625,400 · workforce ขาด 625,400  ✗
 *
 * ERP หลักที่ 12-14: 083=thrust · 084=knowledge · 085=workforce
 *
 * usage:  node supabase/fix-initiative-by-erp-2026-07-30.js            # dry-run
 *         node supabase/fix-initiative-by-erp-2026-07-30.js --commit
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
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const FY = 2569;
const MAP = { "083": "thrust", "084": "knowledge", "085": "workforce" };
const OFFICIAL = { thrust: 1988000, knowledge: 1999010, workforce: 3999573 };
const f = (n) => Number(n || 0).toLocaleString("en-US");
const erpInitiative = (id) => (/^\d{18,20}$/.test(String(id)) ? MAP[String(id).slice(11, 14)] : null);

(async () => {
  console.log(`\n🔧 แก้ initiative_id ให้ตรงรหัส ERP`);
  console.log(`Mode: ${COMMIT ? "🟢 COMMIT" : "🟡 DRY-RUN"}\n`);

  const { data: P, error } = await sb
    .from("projects").select("id, project_name, initiative_id, budget_total, status").eq("fiscal_year", FY);
  if (error) { console.error("❌", error.message); process.exit(1); }
  const active = P.filter((p) => p.status !== "cancelled");

  const plan = [];
  const skip = [];
  for (const p of active) {
    const want = erpInitiative(p.id);
    if (!want) { skip.push({ p, why: "ไม่ใช่รหัส ERP" }); continue; }
    if (want === p.initiative_id) continue;
    plan.push({ id: p.id, name: (p.project_name || "").slice(0, 48), from: p.initiative_id, to: want, budget: Number(p.budget_total) });
  }

  console.log(`ต้องแก้ ${plan.length} โครงการ · ข้าม ${skip.length} (ไม่มีรหัส ERP)\n`);
  plan.forEach((x, i) =>
    console.log(`  ${i + 1}. [${x.id}] ${x.name}\n     ${x.from} → ${x.to}  (งบ ${f(x.budget)})`));
  skip.forEach((s) => console.log(`  ⏭  [${s.p.id}] ${(s.p.project_name || "").slice(0, 45)} — ${s.why} (คงค่าเดิม ${s.p.initiative_id})`));

  // ตรวจว่าแก้แล้วยอดจะตรงเอกสารการเงิน
  const after = {};
  for (const p of active) {
    const k = erpInitiative(p.id) || p.initiative_id;
    after[k] = (after[k] || 0) + Number(p.budget_total);
  }
  console.log(`\nยอดงบราย ง8 หลังแก้ (เทียบไฟล์งบ 14/7/2569):`);
  let allOk = true;
  for (const k of ["thrust", "knowledge", "workforce"]) {
    const d = (after[k] || 0) - OFFICIAL[k];
    if (d !== 0) allOk = false;
    console.log(`  ${k.padEnd(10)} ${f(after[k] || 0).padStart(10)}  ${d === 0 ? "✓ ตรง" : "✗ ต่าง " + f(d)}`);
  }
  if (!allOk) { console.error("\n❌ ยอดไม่ตรงเอกสารการเงิน — ยกเลิก ไม่เขียน DB"); process.exit(1); }

  if (!COMMIT) { console.log(`\n🟡 DRY-RUN — รัน \`--commit\` เพื่อเขียนจริง`); return; }

  console.log(`\n🟢 Committing...\n`);
  let ok = 0, err = 0;
  for (const x of plan) {
    const { error } = await sb.from("projects").update({ initiative_id: x.to }).eq("id", x.id);
    if (error) { err++; console.log(`   ❌ [${x.id}] ${error.message}`); }
    else { ok++; console.log(`   ✅ [${x.id}] → ${x.to}`); }
  }
  console.log(`\n✅ Done: ${ok}/${plan.length} updated${err ? `, ${err} errors` : ""}`);

  const { data: V } = await sb.from("projects").select("initiative_id,budget_total,status").eq("fiscal_year", FY);
  const AV = V.filter((p) => p.status !== "cancelled");
  const cnt = {}, bud = {};
  AV.forEach((p) => { cnt[p.initiative_id] = (cnt[p.initiative_id] || 0) + 1; bud[p.initiative_id] = (bud[p.initiative_id] || 0) + Number(p.budget_total); });
  console.log(`\nยืนยันจาก DB:`);
  for (const k of ["thrust", "knowledge", "workforce"])
    console.log(`  ${k.padEnd(10)} ${String(cnt[k]).padStart(2)} โครงการ · ${f(bud[k]).padStart(10)}  ${bud[k] === OFFICIAL[k] ? "✓" : "✗"}`);
})();
