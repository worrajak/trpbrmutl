/**
 * Sync งบประมาณ "ปิดปีงบประมาณ 2569" จากไฟล์ Drive
 *   1_10_2569_งบประมาณกลุ่มแผนงานใต้ร่มพระบารมี ปีงบประมาณ2569.xlsx
 *   (file id 1478OGiFdFQI7hLbf3Yb5aPrMxIgILblV · แก้ไข 2 ต.ค. 2569 · โฟลเดอร์ทางการ "การใช้งบประมาณ")
 *   ชีต "กรอบแผนงบประมาณใต้ร่มฯ ปี2569" · ข้อมูล ณ 30 ก.ย. 2569
 *
 * ต่างจาก sync-budget-2026-08-04.js ตรงไหน
 *   - อ่านจาก supabase/data/budget-2569-final-2026-10-01.json (สกัดจาก xlsx แล้ว ตรวจยอดกับไฟล์ทางการครบ 3 ระดับ)
 *   - จำนวนรายการ 61 → 75 (มีรายการที่ตั้งเพิ่มระหว่างปี + รายการกันเงินเหลื่อมปี)
 *   - รองรับรหัสกันเงินเหลื่อมปีรูปแบบ 8301-691-1BG0656 (ไม่ใช่ ERP 20 หลัก)
 *   - insert รายการใหม่ได้ ไม่ใช่ update อย่างเดียว
 *   - เติม erp_code ให้แถวที่ยังว่าง โดยจับคู่จากชื่อโครงการ
 *
 * guard — ยกเลิกไม่เขียน DB ถ้าข้อใดข้อหนึ่งไม่ผ่าน
 *   เบิกจ่ายรวม = 7,446,794 · ราย ง8 = 1,836,240 / 1,894,933 / 3,715,621 · 75 รายการ
 *
 * usage:  node supabase/sync-budget-2026-10-01-final.js            # dry-run
 *         node supabase/sync-budget-2026-10-01-final.js --commit
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
const FY = 2569;
const SRC = require("./data/budget-2569-final-2026-10-01.json");

const FRAME = 8000000; // กรอบงบประมาณแผนงาน — ยอดรวมในระบบห้ามเกินค่านี้
const EXPECT = {
  rows: 75, spent: 7446794, g8_1: 1836240, g8_2: 1894933, g8_3: 3715621,
  transferred: 7992353, t_g8_1: 1999620, t_g8_2: 1998472, t_g8_3: 3994261,
};

// รายการที่อยู่ใน DB แต่ไม่ปรากฏในงบการเงินปิดปี 2569 และเบิกจ่าย 0 บาท
// -> ไม่ได้ดำเนินการจริงในปีงบประมาณนี้ ปิดสถานะเพื่อไม่ให้ยอดรวมในระบบเกินกรอบ 8,000,000
// ตาม CLAUDE.md: mark status='cancelled' ไม่ใช่ DELETE (เก็บประวัติ)
const CANCEL_IDS = [
  "16911210000085010001", // สำรวจผลผลิตทางการเกษตรโครงการหลวง (คณะบริหารธุรกิจและศิลปศาสตร์)
  "66916000000085010001", // คำขอสิ่งบ่งชี้ทางภูมิศาสตร์ (GI) กาแฟเลอตอ - ง8-3
  "66916000000084010001", // คำขอสิ่งบ่งชี้ทางภูมิศาสตร์ (GI) กาแฟเลอตอ - ง8-2
];

// รหัสกันเงินเหลื่อมปีขึ้นต้น 8301/8401/8501 = ง8-1/2/3 · ERP 20 หลักดูตำแหน่ง 12-14
const INI = { "083": "thrust", "084": "knowledge", "085": "workforce" };
const G8 = { thrust: "g8_1", knowledge: "g8_2", workforce: "g8_3" };
const MAIN = { thrust: "1.ผลักดันเทคโนโลยี", knowledge: "2.ขับเคลื่อนกลไก", workforce: "3.พัฒนากำลังคน" };
const initiativeOf = (erp) =>
  /^\d{20}$/.test(erp) ? INI[erp.slice(11, 14)] : INI[{ "8301": "083", "8401": "084", "8501": "085" }[erp.slice(0, 4)]];

// ตำแหน่ง 1-7 ของ ERP = หน่วยงาน (ดู memory erp-code-structure)
const FAC = {
  1691111: "group-internal", 1691110: "group-internal", 1691107: "pr-division",
  1691123: "eng", 1691124: "arch", 1691125: "vit", 1691160: "cttc",
  3691300: "agri-research", 4691400: "rmutl-nan", 5691500: "rmutl-cri",
  6691600: "rmutl-tak", 7691700: "rmutl-psl",
};
// รหัสกันเงินเหลื่อมปี (8301/8401/8501-691-1BGxxxx) เป็นรายการของกลุ่มแผนงานทั้งหมด
const facOf = (erp) => (/^\d{20}$/.test(erp) ? FAC[Number(erp.slice(0, 7))] || null : "group-internal");
const ORG = {
  "group-internal": "กลุ่มแผนงานใต้ร่มพระบารมี", "pr-division": "กองประชาสัมพันธ์ มทร.ล้านนา",
  eng: "คณะวิศวกรรมศาสตร์", arch: "คณะศิลปกรรมและสถาปัตยกรรมศาสตร์",
  vit: "วิทยาลัยเทคโนโลยีและสหวิทยาการ", cttc: "สถาบันถ่ายทอดเทคโนโลยีสู่ชุมชน",
  "agri-research": "สถาบันวิจัยเทคโนโลยีเกษตร", "rmutl-nan": "มทร.ล้านนา น่าน",
  "rmutl-cri": "มทร.ล้านนา เชียงราย", "rmutl-tak": "มทร.ล้านนา ตาก", "rmutl-psl": "มทร.ล้านนา พิษณุโลก",
};

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const f = (n) => Number(n || 0).toLocaleString("en-US");
const key = (s) => String(s || "").replace(/^\d+\.\s*/, "").replace(/[\s()"']/g, "").toLowerCase();

(async () => {
  console.log(`\n💰 Sync งบประมาณ ปิดปีงบประมาณ 2569 (ข้อมูล ณ 30 ก.ย. 2569)`);
  console.log(`Mode: ${COMMIT ? "🟢 COMMIT" : "🟡 DRY-RUN"}\n`);

  // ---------- guard: ตรวจไฟล์ต้นทางกับยอดทางการก่อนแตะ DB ----------
  const rows = SRC.rows;
  const sum = { g8_1: 0, g8_2: 0, g8_3: 0 };
  const tr = { g8_1: 0, g8_2: 0, g8_3: 0 };
  for (const r of rows) { sum[G8[initiativeOf(r.erp)]] += r.spent; tr[G8[initiativeOf(r.erp)]] += r.adjusted; }
  const spent = rows.reduce((s, r) => s + r.spent, 0);
  const transferred = rows.reduce((s, r) => s + r.adjusted, 0);
  const checks = [
    ["จำนวนรายการ", rows.length, EXPECT.rows],
    ["เบิกจ่ายรวม", spent, EXPECT.spent],
    ["เบิก ง8-1", sum.g8_1, EXPECT.g8_1],
    ["เบิก ง8-2", sum.g8_2, EXPECT.g8_2],
    ["เบิก ง8-3", sum.g8_3, EXPECT.g8_3],
    ["งบรวม", transferred, EXPECT.transferred],
    ["งบ ง8-1", tr.g8_1, EXPECT.t_g8_1],
    ["งบ ง8-2", tr.g8_2, EXPECT.t_g8_2],
    ["งบ ง8-3", tr.g8_3, EXPECT.t_g8_3],
  ];
  let bad = 0;
  for (const [label, got, want] of checks) {
    const ok = got === want;
    if (!ok) bad++;
    console.log(`  ${ok ? "✓" : "✗"} ${label.padEnd(14)} ${f(got).padStart(11)} / ${f(want)}`);
  }
  if (bad) { console.error(`\n❌ ยอดไม่ตรงเอกสารการเงิน ${bad} จุด — ยกเลิก ไม่เขียน DB`); process.exit(1); }
  if (transferred > FRAME) {
    console.error(`\n❌ งบรวม ${f(transferred)} เกินกรอบแผนงาน ${f(FRAME)} — ยกเลิก ไม่เขียน DB`); process.exit(1);
  }
  console.log(`✓ ตรงกับไฟล์ทางการครบทุกระดับ · งบรวมไม่เกินกรอบ ${f(FRAME)} (ต่ำกว่า ${f(FRAME - transferred)})\n`);

  // ---------- โหลด DB ----------
  const { data, error } = await sb.from("projects")
    .select("id, project_name, erp_code, main_program, organization, budget_total, budget_used, budget_remaining, initiative_id, faculty_id, status")
    .eq("fiscal_year", FY);
  if (error) { console.error("❌", error.message); process.exit(1); }

  const byId = new Map(data.map((p) => [String(p.id), p]));
  const byName = new Map(data.map((p) => [key(p.project_name), p]));

  const updates = [], inserts = [], erpFills = [];
  for (const r of rows) {
    const ini = initiativeOf(r.erp);
    // budget_total ใช้ "งปม.โอนเปลี่ยนแปลงระหว่างปี" (adjusted) มิใช่ "จัดสรรปี พ.ศ.2569" (allocated)
    // เพราะ allocated รวมกันได้ 8,665,538 ซึ่งเกินกรอบแผนงาน 8,000,000 (นับเงินก้อนเดียวซ้ำ
    // ตอนโอนเปลี่ยนแปลงและตั้งรายการกันเงินเหลื่อมปี) ส่วน adjusted รวมกันได้ 7,992,353
    // ตรงกับบรรทัด "รวมทั้งหมด" ของเอกสารทางการ และตรงราย ง8 ครบทั้งสามโครงการหลัก
    const target = { budget_total: r.adjusted, budget_used: r.spent, budget_remaining: r.adjusted - r.spent };
    let p = byId.get(r.erp);

    // แถวที่ DB ยังไม่มี id = ERP → ลองจับจากชื่อ (แถวที่ erp_code ยังว่าง)
    if (!p) {
      const hit = byName.get(key(r.name));
      if (hit && !hit.erp_code) { p = hit; erpFills.push({ id: hit.id, erp: r.erp, name: r.name.slice(0, 42) }); }
    }

    if (!p) {
      inserts.push({
        id: r.erp, erp_code: r.erp, project_name: r.name, responsible: r.owner || null,
        main_program: MAIN[ini], organization: ORG[facOf(r.erp)] || "กลุ่มแผนงานใต้ร่มพระบารมี",
        initiative_id: ini, faculty_id: facOf(r.erp), fiscal_year: FY,
        status: r.carryover ? "in_progress" : "completed", ...target,
      });
      continue;
    }
    const changed = Number(p.budget_total) !== target.budget_total || Number(p.budget_used) !== target.budget_used;
    if (changed || r.carryover) {
      updates.push({
        pk: p.id, erp: r.erp, name: (p.project_name || r.name).replace(/^\d+\.\s*/, "").slice(0, 42),
        fromU: Number(p.budget_used), ...target,
        status: r.carryover ? "in_progress" : "completed",
        initiative_id: p.initiative_id || ini, faculty_id: p.faculty_id || facOf(r.erp),
      });
    }
  }

  const inFile = new Set(rows.map((r) => r.erp));
  const orphans = data.filter((p) => !inFile.has(String(p.id)) &&
    !erpFills.some((e) => e.id === p.id) && p.status !== "cancelled");

  console.log(`📋 แผนการเขียน`);
  console.log(`   เพิ่มใหม่   ${String(inserts.length).padStart(3)} รายการ`);
  console.log(`   อัปเดต     ${String(updates.length).padStart(3)} รายการ`);
  console.log(`   เติม ERP   ${String(erpFills.length).padStart(3)} รายการ`);
  console.log(`   ไม่มีในไฟล์ ${String(orphans.length).padStart(3)} รายการ (ไม่แตะ — รอยืนยันกับทีม)\n`);

  if (inserts.length) {
    console.log(`➕ รายการใหม่`);
    inserts.forEach((x) => console.log(`   ${f(x.budget_total).padStart(9)} | ${f(x.budget_used).padStart(9)} | ${x.id} | ${x.project_name.slice(0, 46)}`));
  }
  if (erpFills.length) {
    console.log(`\n🔗 เติม erp_code (จับคู่จากชื่อโครงการ)`);
    erpFills.forEach((x) => console.log(`   ${x.erp} → ${x.name}`));
  }
  console.log(`\n📈 เบิกจ่ายเพิ่มสูงสุด`);
  updates.filter((x) => x.budget_used !== x.fromU).sort((a, b) => (b.budget_used - b.fromU) - (a.budget_used - a.fromU))
    .slice(0, 12).forEach((x) => console.log(`   +${f(x.budget_used - x.fromU).padStart(9)} | ${f(x.fromU)} → ${f(x.budget_used)} | ${x.name}`));
  if (orphans.length) {
    console.log(`\n⚠️  มีใน DB แต่ไม่มีในไฟล์ปิดปีงบ`);
    orphans.forEach((p) => console.log(`   ${String(p.id).slice(0, 22).padEnd(22)} | เบิก ${f(p.budget_used).padStart(9)} | ${(p.project_name || "").slice(0, 44)}`));
  }

  const before = data.filter((p) => p.status !== "cancelled").reduce((s, p) => s + Number(p.budget_used), 0);
  console.log(`\nยอดเบิกจ่ายรวม: ${f(before)} → ${f(spent)}  (+${f(spent - before)})`);
  console.log(`กรอบแผนงาน ${f(FRAME)} · งบหลังโอนเปลี่ยนแปลงรวม ${f(transferred)} (ต่ำกว่ากรอบ ${f(FRAME - transferred)})`);
  console.log(`เบิกจ่าย ${((spent / FRAME) * 100).toFixed(1)}% ของกรอบแผนงาน · ${((spent / transferred) * 100).toFixed(1)}% ของงบที่โอนจริง`);
  console.log(`ปิดสถานะรายการที่ไม่อยู่ในงบการเงินปิดปี ${CANCEL_IDS.length} รายการ`);

  if (!COMMIT) { console.log(`\n🟡 DRY-RUN — รัน \`--commit\` เพื่อเขียนจริง`); return; }

  console.log(`\n🟢 Committing...\n`);
  let ok = 0, err = 0;
  for (const id of CANCEL_IDS) {
    const p = byId.get(id);
    if (!p) continue;
    if (Number(p.budget_used) !== 0) { console.log(`   ⏭  ข้าม ${id} — มีการเบิกจ่าย ${f(p.budget_used)}`); continue; }
    const { error } = await sb.from("projects").update({ status: "cancelled", budget_remaining: 0 }).eq("id", id);
    if (error) { err++; console.log(`   ❌ cancel ${id}: ${error.message}`); } else ok++;
  }
  for (const x of erpFills) {
    const { error } = await sb.from("projects").update({ erp_code: x.erp }).eq("id", x.id);
    if (error) { err++; console.log(`   ❌ erp_code ${x.id}: ${error.message}`); } else ok++;
  }
  for (const x of updates) {
    const { error } = await sb.from("projects").update({
      budget_total: x.budget_total, budget_used: x.budget_used,
      budget_remaining: x.budget_remaining, status: x.status, erp_code: x.erp,
      initiative_id: x.initiative_id, faculty_id: x.faculty_id,
    }).eq("id", x.pk);
    if (error) { err++; console.log(`   ❌ update ${x.pk}: ${error.message}`); } else ok++;
  }
  for (const x of inserts) {
    const { error } = await sb.from("projects").insert(x);
    if (error) { err++; console.log(`   ❌ insert ${x.id}: ${error.message}`); } else ok++;
  }
  console.log(`✅ เขียนสำเร็จ ${ok} รายการ${err ? ` · ผิดพลาด ${err}` : ""}`);

  const { data: V } = await sb.from("projects").select("budget_total,budget_used,status").eq("fiscal_year", FY);
  const AV = V.filter((p) => p.status !== "cancelled");
  console.log(`\nยืนยันจาก DB: ${AV.length} รายการ · จัดสรร ${f(AV.reduce((s, p) => s + Number(p.budget_total), 0))} · เบิก ${f(AV.reduce((s, p) => s + Number(p.budget_used), 0))}`);
})();
