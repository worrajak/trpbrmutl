/**
 * Sync งบประมาณ จาก 7_7_2569_งบประมาณกลุ่มแผนงานใต้ร่มพระบารมี.xlsx
 * Google Drive file: 1478OGiFdFQI7hLbf3Yb5aPrMxIgILblV
 * Modified:          2026-07-07
 * Owner:             watanapongcttc@gmail.com
 *
 * Data columns (Sheet "กรอบแผนงบประมาณใต้ร่มฯ ปี2569"):
 *   col 0: รายชื่อโครงการ
 *   col 1: รหัสโครงการ (ERP 20 หลัก) ← match key
 *   col 2: โอนงบประมาณ 50% (date, Buddhist year)
 *   col 3: โอนงบประมาณ 100% (date, Buddhist year)
 *   col 4: จัดสรรปี 2569
 *   col 5: งปม.โอนเปลี่ยนแปลงระหว่างปี (โอนจริง)
 *   col 6: % งบที่ได้รับจริง
 *   col 7: ขอจองเงิน
 *   col 8: ใบสั่งซื้อ/สัญญา (PO)
 *   col 9: เบิกจ่ายสะสม (spent)
 *   col 10: รวม (PO + spent)
 *   col 11: ร้อยละใช้
 *   col 12: คงเหลือ (remaining)
 *   col 13: คืนงบประมาณ (returned)
 *
 * Mapping ลง DB (projects table):
 *   budget_used  ← เบิกจ่ายสะสม (col 9)
 *   budget_remaining ← คงเหลือ (col 12)
 *   budget_total ← ตรวจว่าตรง จัดสรร (col 4)
 *
 * Usage:
 *   node supabase/sync-budget-2026-07-07.js          # dry-run · preview
 *   node supabase/sync-budget-2026-07-07.js --commit
 */

const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
const { createClient } = require("@supabase/supabase-js");

const ROOT = path.join(__dirname, "..");
fs.readFileSync(path.join(ROOT, ".env.local"), "utf-8")
  .split("\n")
  .forEach((l) => {
    const m = l.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (m) {
      let v = m[2].trim().replace(/^['"]|['"]$/g, "");
      if (!process.env[m[1]]) process.env[m[1]] = v;
    }
  });

const COMMIT = process.argv.includes("--commit");
const VERBOSE = process.argv.includes("--verbose");

const XLSX_PATH =
  "/private/tmp/claude-501/-Users-worrajak-Library-CloudStorage-Dropbox-2012-02-08-TheRoyalProject-x-RPF-Researcher-Profile/4345c6c4-7eb8-4c99-aeec-fa371a7c8493/scratchpad/budget-7-7-2569.xlsx";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// convert Buddhist year Date → CE ISO string (or null)
function bdDate(v) {
  if (!v || !(v instanceof Date)) return null;
  // xlsx returns dates with Buddhist year: 2568 = 2025 CE (offset -543)
  const buddhistYear = v.getUTCFullYear();
  const ceYear = buddhistYear - 543;
  const yyyy = ceYear.toString().padStart(4, "0");
  const mm = (v.getUTCMonth() + 1).toString().padStart(2, "0");
  const dd = v.getUTCDate().toString().padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function n(v) {
  if (v === "" || v === null || v === undefined) return 0;
  const num = typeof v === "number" ? v : parseFloat(String(v).replace(/[,\s]/g, ""));
  return isNaN(num) ? 0 : num;
}

async function main() {
  console.log(`\n💰 Sync งบประมาณ 2026-07-07`);
  console.log(`Mode: ${COMMIT ? "🟢 COMMIT" : "🟡 DRY-RUN"}\n`);

  // 1. Parse xlsx
  const wb = XLSX.readFile(XLSX_PATH, { cellDates: true });
  const sh = wb.Sheets["กรอบแผนงบประมาณใต้ร่มฯ ปี2569"];
  const rows = XLSX.utils.sheet_to_json(sh, { header: 1, defval: "", blankrows: false, raw: true });

  // 2. Extract leaf projects
  const projects = [];
  for (const row of rows) {
    const id = String(row[1] || "").trim();
    if (!/^\d{20}$/.test(id) || id.endsWith("0000")) continue;
    projects.push({
      id,
      name: String(row[0] || "").trim(),
      transfer_50: bdDate(row[2]),
      transfer_100: bdDate(row[3]),
      allocated: n(row[4]),
      allocated_actual: n(row[5]),
      reserved: n(row[7]),
      po: n(row[8]),
      spent: n(row[9]),
      total_used: n(row[10]),
      remaining: n(row[12]),
      returned: n(row[13]),
    });
  }
  console.log(`📊 Parsed ${projects.length} leaf projects from xlsx\n`);

  // 3. Load DB current state
  const { data: dbRows, error } = await sb
    .from("projects")
    .select("id, project_name, budget_total, budget_used, budget_reported, budget_remaining")
    .eq("fiscal_year", 2569);
  if (error) {
    console.error("❌", error.message);
    process.exit(1);
  }
  const dbMap = new Map(dbRows.map((r) => [r.id, r]));
  console.log(`📌 DB projects (fy=2569): ${dbRows.length}\n`);

  // 4. Compute diff
  const plan = { changed: [], unchanged: [], missing_in_db: [], extra_in_db: [] };
  const seen = new Set();

  for (const p of projects) {
    seen.add(p.id);
    const db = dbMap.get(p.id);
    if (!db) {
      plan.missing_in_db.push(p);
      continue;
    }
    const oldTotal = n(db.budget_total);
    const oldUsed = n(db.budget_used);
    const oldRemaining = n(db.budget_remaining);

    // NEW values (source of truth = Excel 7-Jul-2026)
    const newTotal = p.allocated; // จัดสรร
    const newUsed = p.spent; // เบิกจ่ายสะสม
    const newRemaining = p.remaining; // คงเหลือ

    const diffs = [];
    if (Math.abs(oldTotal - newTotal) > 0.5)
      diffs.push(`total: ${oldTotal.toLocaleString()} → ${newTotal.toLocaleString()}`);
    if (Math.abs(oldUsed - newUsed) > 0.5)
      diffs.push(`used: ${oldUsed.toLocaleString()} → ${newUsed.toLocaleString()}`);
    if (Math.abs(oldRemaining - newRemaining) > 0.5)
      diffs.push(`remaining: ${oldRemaining.toLocaleString()} → ${newRemaining.toLocaleString()}`);

    if (diffs.length === 0) plan.unchanged.push(p);
    else plan.changed.push({ p, db, diffs, newTotal, newUsed, newRemaining });
  }
  for (const r of dbRows) {
    if (!seen.has(r.id)) plan.extra_in_db.push(r);
  }

  // 5. Report
  console.log(`📋 PLAN:`);
  console.log(`  🟠 Will change:       ${plan.changed.length}`);
  console.log(`  ⚪ Unchanged:         ${plan.unchanged.length}`);
  console.log(`  🔴 Missing in DB:     ${plan.missing_in_db.length}`);
  console.log(`  🔵 Extra in DB:       ${plan.extra_in_db.length}\n`);

  console.log(`=== Changes preview (top 15) ===`);
  plan.changed.slice(0, 15).forEach((x, i) => {
    console.log(`  ${i + 1}. [${x.p.id}] ${x.p.name.slice(0, 60)}`);
    x.diffs.forEach((d) => console.log(`      ${d}`));
  });
  if (plan.changed.length > 15) console.log(`  ... และอีก ${plan.changed.length - 15} เปลี่ยน`);

  if (plan.missing_in_db.length > 0) {
    console.log(`\n=== Missing in DB (Excel มี · DB ไม่มี) ===`);
    plan.missing_in_db.forEach((p) =>
      console.log(`  [${p.id}] ${p.name.slice(0, 60)}`)
    );
  }
  if (plan.extra_in_db.length > 0) {
    console.log(`\n=== Extra in DB (DB มี · Excel ไม่มี) ===`);
    plan.extra_in_db.forEach((r) => console.log(`  [${r.id}] ${(r.project_name || "").slice(0, 60)}`));
  }

  // Grand totals
  const totalAllocated = projects.reduce((s, p) => s + p.allocated, 0);
  const totalSpent = projects.reduce((s, p) => s + p.spent, 0);
  const totalRemaining = projects.reduce((s, p) => s + p.remaining, 0);
  const totalPo = projects.reduce((s, p) => s + p.po, 0);
  console.log(`\n=== Grand totals (Excel 7-Jul-2026) ===`);
  console.log(`  จัดสรร:           ${totalAllocated.toLocaleString()}`);
  console.log(`  PO:              ${totalPo.toLocaleString()}`);
  console.log(`  เบิกจ่ายสะสม:      ${totalSpent.toLocaleString()}  (${((totalSpent / totalAllocated) * 100).toFixed(1)}%)`);
  console.log(`  คงเหลือ:          ${totalRemaining.toLocaleString()}  (${((totalRemaining / totalAllocated) * 100).toFixed(1)}%)`);

  if (!COMMIT) {
    console.log(`\n🟡 DRY-RUN — รัน \`--commit\` เพื่อ UPDATE`);
    return;
  }

  // 6. COMMIT
  console.log(`\n🟢 Committing UPDATE...`);
  let ok = 0,
    err = 0;
  for (const c of plan.changed) {
    const { error } = await sb
      .from("projects")
      .update({
        budget_total: c.newTotal,
        budget_used: c.newUsed,
        budget_remaining: c.newRemaining,
      })
      .eq("id", c.p.id);
    if (error) {
      err++;
      console.log(`   ❌ [${c.p.id}] ${error.message}`);
    } else {
      ok++;
      if (VERBOSE) console.log(`   ✅ [${c.p.id}]`);
    }
  }
  console.log(`\n✅ Done: ${ok}/${plan.changed.length} updated, ${err} errors`);
}

main().catch((e) => {
  console.error("💥", e);
  process.exit(1);
});
