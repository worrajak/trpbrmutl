/**
 * อ่าน Excel งบประมาณ 2569 → สร้าง SQL UPSERT (ไม่ใช้ AI)
 *
 * Usage:
 *   node supabase/generate-budget-2569-sql.js
 * Output: supabase/sync-budget-2569-04-20.sql
 *
 * Schema ที่ใช้:
 * - id (PK, text)               = erp_code
 * - erp_code                    = ตัวเลข 18-20 หลัก (ข้ามที่ลงท้าย 0000)
 * - project_name                = ชื่อโครงการ (ตัดวงเล็บท้ายออก)
 * - responsible                 = ชื่อในวงเล็บท้ายชื่อโครงการ (เฉพาะที่ขึ้นต้นด้วยคำนำหน้าชื่อ)
 * - main_program                = 'ใต้ร่มพระบารมี'
 * - budget_total / budget_used / budget_remaining
 *
 * UPSERT logic:
 * - INSERT ใหม่: ใส่ทุก field ครบ
 * - UPDATE: budget_total/used = ค่าใหม่ · budget_remaining = total − max(used, budget_reported)
 *           responsible/project_name: COALESCE — เติมเฉพาะถ้า DB ว่าง (ไม่ทับชื่อที่ admin แก้)
 */
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

const EXCEL_PATH = path.join(
  __dirname,
  "..",
  "MarketPredict",
  "20_4_2569_งบประมาณกลุ่มแผนงานใต้ร่มพระบารมี ปีงบประมาณ2569.xlsx"
);
const OUT_PATH = path.join(__dirname, "sync-budget-2569-04-20.sql");

const ERP_REGEX = /^\d{18,20}$/;
const PERSON_PREFIX_REGEX =
  /^(นาย|นาง|นางสาว|ดร\.|ผศ\.|รศ\.|ศ\.|อาจารย์|ผู้ช่วยศาสตราจารย์|รองศาสตราจารย์|ศาสตราจารย์)/;

function toNumber(val) {
  if (val === null || val === undefined || val === "") return 0;
  const n = Number(String(val).replace(/,/g, "").trim());
  return isNaN(n) ? 0 : n;
}

function splitNameAndResponsible(raw) {
  const m = raw.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (m) {
    const responsible = m[2].trim();
    if (PERSON_PREFIX_REGEX.test(responsible)) {
      return { name: m[1].trim(), responsible };
    }
  }
  return { name: raw, responsible: "" };
}

// SQL string escape — ' → ''
const sq = (s) => `'${String(s).replace(/'/g, "''")}'`;

function main() {
  const wb = XLSX.read(fs.readFileSync(EXCEL_PATH), { type: "buffer", cellDates: true });
  const sheetName = wb.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: null });

  const projects = [];
  let skippedParent = 0;

  for (const r of rows) {
    const erpRaw = r[1];
    if (!erpRaw) continue;
    const erp = String(erpRaw).replace(/\.0$/, "").trim();
    if (!ERP_REGEX.test(erp)) continue;
    if (erp.endsWith("0000")) {
      skippedParent++;
      continue;
    }

    const fullName = String(r[0] ?? "").replace(/\n/g, " ").trim();
    const { name, responsible } = splitNameAndResponsible(fullName);
    const budgetTotal = toNumber(r[4]);
    const budgetUsed = toNumber(r[9]);
    const budgetRemaining = toNumber(r[12]);

    projects.push({
      erp,
      name,
      responsible,
      budgetTotal,
      budgetUsed,
      // ถ้า remaining ว่าง คำนวณจาก total - used (clamp ≥ 0)
      budgetRemaining: budgetRemaining || Math.max(0, budgetTotal - budgetUsed),
    });
  }

  console.log(`Sheet:           ${sheetName}`);
  console.log(`Total rows:      ${rows.length}`);
  console.log(`Parent (ข้าม):   ${skippedParent}`);
  console.log(`Leaf projects:   ${projects.length}`);
  console.log(`มี responsible:  ${projects.filter((p) => p.responsible).length}/${projects.length}`);

  // -------- generate SQL --------
  const lines = [];
  lines.push("-- =====================================================================");
  lines.push("-- Sync งบประมาณ ใต้ร่มพระบารมี ปี 2569 (auto-generated, ไม่ใช้ AI)");
  lines.push(`-- Source: MarketPredict/20_4_2569_งบประมาณกลุ่มแผนงานใต้ร่มพระบารมี ปีงบประมาณ2569.xlsx`);
  lines.push(`-- Generated: ${new Date().toISOString()}`);
  lines.push(`-- Projects: ${projects.length} โครงการ (leaf · ข้าม parent ${skippedParent} แถว)`);
  lines.push("--");
  lines.push("-- UPSERT logic:");
  lines.push("--   - INSERT ใหม่: เติม project_name + responsible + main_program ครบ");
  lines.push("--   - UPDATE เดิม: ทับ budget_total/used · คำนวณ remaining = total − max(used, budget_reported)");
  lines.push("--                 · responsible/project_name เติมเฉพาะถ้า DB ว่าง (ไม่ทับชื่อที่ admin แก้)");
  lines.push("-- =====================================================================");
  lines.push("");
  lines.push("BEGIN;");
  lines.push("");

  for (const p of projects) {
    const responsibleSql = p.responsible ? sq(p.responsible) : "NULL";
    lines.push(`-- ${p.name.substring(0, 60)}${p.name.length > 60 ? "…" : ""}`);
    lines.push(`INSERT INTO projects (`);
    lines.push(`  id, erp_code, project_name, responsible, main_program, organization,`);
    lines.push(`  budget_total, budget_used, budget_remaining, fiscal_year`);
    lines.push(`) VALUES (`);
    lines.push(`  ${sq(p.erp)}, ${sq(p.erp)}, ${sq(p.name)}, ${responsibleSql},`);
    lines.push(`  'ใต้ร่มพระบารมี', '',`);
    lines.push(`  ${p.budgetTotal}, ${p.budgetUsed}, ${p.budgetRemaining}, 2569`);
    lines.push(`)`);
    lines.push(`ON CONFLICT (id) DO UPDATE SET`);
    lines.push(`  budget_total     = EXCLUDED.budget_total,`);
    lines.push(`  budget_used      = EXCLUDED.budget_used,`);
    lines.push(`  budget_remaining = GREATEST(0, EXCLUDED.budget_total - GREATEST(EXCLUDED.budget_used, COALESCE(projects.budget_reported, 0))),`);
    lines.push(`  responsible      = COALESCE(NULLIF(TRIM(projects.responsible), ''), EXCLUDED.responsible),`);
    lines.push(`  project_name     = COALESCE(NULLIF(TRIM(projects.project_name), ''), EXCLUDED.project_name),`);
    lines.push(`  updated_at       = NOW();`);
    lines.push("");
  }

  // Verify summary at the end
  lines.push("-- ===== Verify =====");
  lines.push("SELECT");
  lines.push("  COUNT(*)                                AS total_projects,");
  lines.push("  COUNT(*) FILTER (WHERE responsible IS NOT NULL AND responsible <> '') AS with_responsible,");
  lines.push("  SUM(budget_total)                       AS sum_total,");
  lines.push("  SUM(budget_used)                        AS sum_used,");
  lines.push("  SUM(budget_remaining)                   AS sum_remaining");
  lines.push("FROM projects");
  lines.push("WHERE main_program = 'ใต้ร่มพระบารมี'");
  lines.push("  AND erp_code IN (");
  lines.push(projects.map((p) => `    ${sq(p.erp)}`).join(",\n"));
  lines.push("  );");
  lines.push("");
  lines.push("COMMIT;");
  lines.push("");

  fs.writeFileSync(OUT_PATH, lines.join("\n"), "utf8");

  // Summary stats
  const totalSum = projects.reduce((s, p) => s + p.budgetTotal, 0);
  const usedSum = projects.reduce((s, p) => s + p.budgetUsed, 0);
  const remainSum = projects.reduce((s, p) => s + p.budgetRemaining, 0);

  console.log(`\n✓ SQL written → ${path.relative(process.cwd(), OUT_PATH)}`);
  console.log(`  รวมงบ:     ${totalSum.toLocaleString("th-TH")} บาท`);
  console.log(`  เบิกจ่าย:  ${usedSum.toLocaleString("th-TH")} บาท`);
  console.log(`  คงเหลือ:   ${remainSum.toLocaleString("th-TH")} บาท`);
  console.log(`\nวิธีรัน:`);
  console.log(`  1. เปิด Supabase Dashboard → SQL Editor`);
  console.log(`  2. paste เนื้อหาทั้งไฟล์ → Run`);
  console.log(`  หรือผ่าน CLI:`);
  console.log(`     psql "<DATABASE_URL>" -f supabase/sync-budget-2569-04-20.sql`);
}

main();
