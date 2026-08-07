/**
 * Sync งบประมาณจากไฟล์ Drive "4_8_2569_งบประมาณกลุ่มแผนงานใต้ร่มพระบารมี ปีงบประมาณ2569.xlsx"
 * (file id 1478OGiFdFQI7hLbf3Yb5aPrMxIgILblV · modified 2026-08-04 · โฟลเดอร์ทางการ "การใช้งบประมาณ")
 *
 * sheet 1 "กรอบแผนงบประมาณใต้ร่มฯ ปี2569"
 *   col1 = ERP (match key) · col4 = กรอบงบ · col9 = เบิกจ่ายสะสม · col12 = คงเหลือ
 *
 * ⚠️ ใช้เฉพาะแถว leaf (ERP ไม่ลงท้าย 0000)
 *    ไฟล์ฉบับนี้มีแถวสรุปซ้ำที่ยังไม่ได้ยืนยันกับทีม — ERP ...083010000 ปรากฏ 2 แถว
 *    กรอบ 3,487,000 และ 1,988,000 · "กลุ่มแผนงานใต้ร่มพระบารมี (4 โครงการ)" กรอบ 2,888,500
 *    (เดิม 550,500) จึงไม่แตะแถวสรุป และมี guard ว่ายอดกรอบรวม leaf ต้องไม่เปลี่ยน
 *
 * usage:  node supabase/sync-budget-2026-08-04.js            # dry-run
 *         node supabase/sync-budget-2026-08-04.js --commit
 */
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
const { createClient } = require("@supabase/supabase-js");

const ROOT = path.join(__dirname, "..");
fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").split("\n").forEach((l) => {
  const m = l.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
});

const COMMIT = process.argv.includes("--commit");
const XLSX_PATH =
  "/private/tmp/claude-501/-Users-worrajak-Library-CloudStorage-Dropbox-2012-02-08-TheRoyalProject-x-RPF-Researcher-Profile/4345c6c4-7eb8-4c99-aeec-fa371a7c8493/scratchpad/budget-4-8.xlsx";
const FY = 2569;
const EXPECTED_TOTAL = 7986583; // guard: กรอบงบรวมต้องเท่าเดิม ไม่งั้นแปลว่าโครงสร้างไฟล์เปลี่ยน

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const num = (s) => { const n = parseFloat(String(s || "").replace(/[,\s]/g, "")); return isNaN(n) ? 0 : n; };
const f = (n) => Number(n || 0).toLocaleString("en-US");

(async () => {
  console.log(`\n💰 Sync งบประมาณ ฉบับ 4/8/2569`);
  console.log(`Mode: ${COMMIT ? "🟢 COMMIT" : "🟡 DRY-RUN"}\n`);

  const wb = XLSX.readFile(XLSX_PATH, { cellDates: true });
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {
    header: 1, defval: "", raw: false, blankrows: false,
  });

  const xl = {};
  let skippedSummary = 0;
  for (const r of rows) {
    const erp = String(r[1] || "").trim();
    if (!/^\d{18,20}$/.test(erp)) continue;
    if (erp.endsWith("0000")) { skippedSummary++; continue; }  // แถวสรุป — ไม่ sync
    xl[erp] = { t: num(r[4]), u: num(r[9]), rem: num(r[12]) };
  }
  const leafTotal = Object.values(xl).reduce((s, x) => s + x.t, 0);
  const leafUsed = Object.values(xl).reduce((s, x) => s + x.u, 0);
  console.log(`leaf ในไฟล์: ${Object.keys(xl).length} · ข้ามแถวสรุป ${skippedSummary} แถว`);
  console.log(`กรอบงบรวม leaf: ${f(leafTotal)} · เบิกจ่ายรวม: ${f(leafUsed)} (${(leafUsed / leafTotal * 100).toFixed(1)}%)`);

  if (leafTotal !== EXPECTED_TOTAL) {
    console.error(`\n❌ กรอบงบรวมเปลี่ยนจาก ${f(EXPECTED_TOTAL)} → ${f(leafTotal)}`);
    console.error(`   โครงสร้างงบเปลี่ยน ต้องตรวจกับทีมก่อน — ยกเลิก ไม่เขียน DB`);
    process.exit(1);
  }
  console.log(`✓ กรอบงบรวมเท่าเดิม (${f(EXPECTED_TOTAL)}) — ปลอดภัยที่จะ sync\n`);

  const { data, error } = await sb
    .from("projects").select("id, project_name, budget_total, budget_used, budget_remaining, status").eq("fiscal_year", FY);
  if (error) { console.error("❌", error.message); process.exit(1); }
  const db = Object.fromEntries(data.map((p) => [p.id, p]));

  const plan = [];
  const notInDb = [];
  for (const [erp, x] of Object.entries(xl)) {
    const p = db[erp];
    if (!p) { notInDb.push(erp); continue; }
    const du = Number(p.budget_used || 0), dr = Number(p.budget_remaining || 0), dt = Number(p.budget_total || 0);
    if (Math.abs(du - x.u) < 0.5 && Math.abs(dr - x.rem) < 0.5 && Math.abs(dt - x.t) < 0.5) continue;
    plan.push({ erp, name: (p.project_name || "").replace(/^\d+\./, "").slice(0, 44), fromU: du, toU: x.u, diff: x.u - du, t: x.t, rem: x.rem });
  }

  console.log(`📋 ต้องอัปเดต ${plan.length} โครงการ${notInDb.length ? ` · ไม่มีใน DB ${notInDb.length}` : ""}\n`);
  plan.sort((a, b) => b.diff - a.diff).forEach((x) =>
    console.log(`  ${x.diff >= 0 ? "+" : ""}${f(x.diff).padStart(9)} | ${f(x.fromU)} → ${f(x.toU)} | ${x.name}`));

  const dbActive = data.filter((p) => p.status !== "cancelled");
  const before = dbActive.reduce((s, p) => s + Number(p.budget_used), 0);
  console.log(`\nยอดเบิกจ่ายรวม: ${f(before)} → ${f(leafUsed)}  (+${f(leafUsed - before)})`);

  if (!COMMIT) { console.log(`\n🟡 DRY-RUN — รัน \`--commit\` เพื่อเขียนจริง`); return; }

  console.log(`\n🟢 Committing...\n`);
  let ok = 0, err = 0;
  for (const x of plan) {
    const { error } = await sb.from("projects")
      .update({ budget_total: x.t, budget_used: x.toU, budget_remaining: x.rem })
      .eq("id", x.erp);
    if (error) { err++; console.log(`   ❌ [${x.erp}] ${error.message}`); } else ok++;
  }
  console.log(`✅ updated ${ok}/${plan.length}${err ? ` · ${err} errors` : ""}`);

  const { data: V } = await sb.from("projects").select("budget_total,budget_used,status").eq("fiscal_year", FY);
  const AV = V.filter((p) => p.status !== "cancelled");
  const T = AV.reduce((s, p) => s + Number(p.budget_total), 0);
  const U = AV.reduce((s, p) => s + Number(p.budget_used), 0);
  console.log(`\nยืนยันจาก DB: กรอบ ${f(T)} · เบิก ${f(U)} (${(U / T * 100).toFixed(1)}%)`);
})();
