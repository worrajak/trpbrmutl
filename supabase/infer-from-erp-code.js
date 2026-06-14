/**
 * Infer initiative_id + faculty_id จาก ERP code structure
 *
 * Discovery (ตาม pattern ที่ enriched 30 rows ยืนยัน):
 *   ERP code: 1691160000008401001A
 *             ┃     ┃   ┃
 *             ┃     ┃   ┗ 083=thrust · 084=knowledge · 085=workforce
 *             ┗━━━━━┻━━ prefix → faculty
 *
 * Usage:
 *   node supabase/infer-from-erp-code.js          # dry-run
 *   node supabase/infer-from-erp-code.js --commit
 */

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const ENV_PATH = path.join(__dirname, "..", ".env.local");
fs.readFileSync(ENV_PATH, "utf-8")
  .split("\n")
  .forEach((l) => {
    const m = l.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (m) {
      let v = m[2].trim().replace(/^['"]|['"]$/g, "");
      if (!process.env[m[1]]) process.env[m[1]] = v;
    }
  });

const COMMIT = process.argv.includes("--commit");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const PREFIX_FACULTY = {
  "1691111": "group-internal",
  "1691121": "group-internal", // ไม่แน่ใจ · default
  "1691123": "eng",
  "1691124": "arch",
  "1691125": "vit",
  "1691160": "cttc",
  "1691210": "barts", // เพิ่งเห็น 1 ตัว — guess from "1.โครงการการสำรวจผลผลิตทางการเกษตร...ประกอบ" → barts? not sure
  "1691240": "arch",
  "1691600": "cttc",
  "3691300": "agri-research",
  "4691400": "rmutl-psl", // 4 ตัว missing น่าจะเป็น พิษณุโลก (จากชื่อ "จัดนิทรรศการ", "พัฒนาทักษะอาชีพ")
  "5691500": "rmutl-cri",
  "7691700": "rmutl-psl",
};

const CODE_INITIATIVE = {
  "083": "thrust",
  "084": "knowledge",
  "085": "workforce",
};

async function main() {
  console.log(`\n🔍 Infer initiative_id + faculty_id from ERP code`);
  console.log(`Mode: ${COMMIT ? "🟢 COMMIT" : "🟡 DRY-RUN"}\n`);

  const { data, error } = await sb
    .from("projects")
    .select("id, project_name, initiative_id, faculty_id")
    .eq("fiscal_year", 2569);
  if (error) {
    console.error("❌", error.message);
    process.exit(1);
  }

  const missing = data.filter((p) => !p.initiative_id || !p.faculty_id);
  console.log(`📌 Projects missing initiative_id/faculty_id: ${missing.length}\n`);

  const updates = [];
  const skipped = [];

  for (const p of missing) {
    // ERP code ต้องเป็น 20 digits
    if (!/^\d{18,20}$/.test(p.id)) {
      skipped.push({ ...p, reason: "Not ERP code" });
      continue;
    }
    const prefix = p.id.slice(0, 7);
    const initCode = p.id.slice(11, 14);
    const faculty_id = PREFIX_FACULTY[prefix];
    const initiative_id = CODE_INITIATIVE[initCode];

    if (!faculty_id || !initiative_id) {
      skipped.push({
        ...p,
        reason: `prefix=${prefix} (${faculty_id || "?"}), initCode=${initCode} (${initiative_id || "?"})`,
      });
      continue;
    }

    updates.push({
      id: p.id,
      project_name: p.project_name,
      initiative_id,
      faculty_id,
      prefix,
      initCode,
    });
  }

  console.log(`✅ Inferable: ${updates.length}`);
  console.log(`⚠️ Skipped:   ${skipped.length}\n`);

  console.log(`=== Inferable preview ===`);
  updates.slice(0, 30).forEach((u, i) => {
    console.log(
      `  ${i + 1}. [${u.id}] ${(u.project_name || "").slice(0, 50)} → ${u.initiative_id}/${u.faculty_id}`
    );
  });

  if (skipped.length > 0) {
    console.log(`\n=== Skipped ===`);
    skipped.forEach((s, i) =>
      console.log(`  ${i + 1}. [${s.id}] ${(s.project_name || "").slice(0, 50)} (${s.reason})`)
    );
  }

  if (!COMMIT) {
    console.log(`\n🟡 DRY-RUN — รัน \`--commit\` เพื่อ UPDATE`);
    return;
  }

  console.log(`\n🟢 Committing...\n`);
  let ok = 0;
  for (const u of updates) {
    const { error } = await sb
      .from("projects")
      .update({ initiative_id: u.initiative_id, faculty_id: u.faculty_id })
      .eq("id", u.id);
    if (error) console.log(`   ❌ [${u.id}] ${error.message}`);
    else ok++;
  }
  console.log(`\n✅ Done: ${ok}/${updates.length} updated`);
}

main().catch((e) => {
  console.error("💥", e);
  process.exit(1);
});
