/**
 * Merge slug-only projects → ERP-coded projects (จาก Excel 2026-07-07)
 *
 * Discovery: Excel ล่าสุดใส่ ERP code ให้ 5-6 projects ที่ตอน session ก่อนยังไม่มี
 * ผมเคย insert เป็น slug (prj-2569-*) — ตอนนี้ merge เข้า ERP row
 *
 * Explicit mappings (verified by name + budget + responsible):
 *   prj-2569-8cb5ac81   → 16911115000083010004  (ยกระดับเทคโนโลยี, สามารถ, 52K)
 *   prj-2569-bc8ade83   → 16911600000083010003  (พัฒนาหลักสูตรชุมชน, ไพโรจน์, 68K→34K)
 *   prj-2569-d5cf0b1a   → 66916000000084010002  (โคก หนอง นา, ทนงศักดิ์, 65K→32.5K)
 *   prj-2569-be4f8681   → 66916000000085010001  (GI กาแฟ 149K, ทนงศักดิ์, workforce)
 *   prj-2569-7de21532   → 66916000000084010001  (GI กาแฟ 36K typo variant, knowledge)
 *   proj-moekf6fc       → 16911115000085010011  (SkillChain นำร่อง, พิมลพรรณ, 100K)
 *
 * Truly missing (INSERT from Excel):
 *   36913000000085010001 (ขับเคลื่อนภาษาไทย แม่สะเรียง, รัตนพล)
 *
 * Logic per slug:
 * 1. Read metadata จาก slug row (initiative_id, faculty_id, responsible, etc)
 * 2. INSERT new ERP row (copy metadata + Excel budget data)
 * 3. DELETE slug row
 *
 * Usage:
 *   node supabase/merge-slug-to-erp-2026-07-07.js          # dry-run
 *   node supabase/merge-slug-to-erp-2026-07-07.js --commit
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

const XLSX_PATH =
  "/private/tmp/claude-501/-Users-worrajak-Library-CloudStorage-Dropbox-2012-02-08-TheRoyalProject-x-RPF-Researcher-Profile/4345c6c4-7eb8-4c99-aeec-fa371a7c8493/scratchpad/budget-7-7-2569.xlsx";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Explicit mappings (slug → ERP)
const MAPPINGS = [
  { slug: "prj-2569-8cb5ac81", erp: "16911115000083010004" },
  { slug: "prj-2569-bc8ade83", erp: "16911600000083010003" },
  { slug: "prj-2569-d5cf0b1a", erp: "66916000000084010002" },
  { slug: "prj-2569-be4f8681", erp: "66916000000085010001" },
  { slug: "prj-2569-7de21532", erp: "66916000000084010001" },
  { slug: "proj-moekf6fc",     erp: "16911115000085010011" },
];

// Truly missing (INSERT from scratch with Excel data)
const INSERTS = [
  { erp: "36913000000085010001", initiative_id: "workforce", faculty_id: "agri-research" },
];

function n(v) {
  if (v === "" || v === null || v === undefined) return 0;
  const num = typeof v === "number" ? v : parseFloat(String(v).replace(/[,\s]/g, ""));
  return isNaN(num) ? 0 : num;
}

async function main() {
  console.log(`\n🔀 Merge slug → ERP  (Excel 2026-07-07)`);
  console.log(`Mode: ${COMMIT ? "🟢 COMMIT" : "🟡 DRY-RUN"}\n`);

  // Load Excel data
  const wb = XLSX.readFile(XLSX_PATH, { cellDates: true });
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {
    header: 1,
    defval: "",
    blankrows: false,
    raw: true,
  });
  const excelById = new Map();
  for (const row of rows) {
    const id = String(row[1] || "").trim();
    if (!/^\d{20}$/.test(id) || id.endsWith("0000")) continue;
    excelById.set(id, {
      name: String(row[0] || "").trim(),
      allocated: n(row[4]),
      po: n(row[8]),
      spent: n(row[9]),
      remaining: n(row[12]),
    });
  }
  console.log(`📊 Excel leaf projects: ${excelById.size}\n`);

  // Load DB
  const { data: dbAll } = await sb.from("projects").select("*").eq("fiscal_year", 2569);
  const dbById = new Map(dbAll.map((r) => [r.id, r]));

  console.log(`📋 Plan preview:\n`);

  // Analyze mappings
  const merges = [];
  for (const m of MAPPINGS) {
    const slug = dbById.get(m.slug);
    const excel = excelById.get(m.erp);
    const erpExists = dbById.has(m.erp);
    if (!slug) {
      console.log(`  ⚠️  ${m.slug} not in DB → skip`);
      continue;
    }
    if (!excel) {
      console.log(`  ⚠️  ${m.erp} not in Excel → skip`);
      continue;
    }
    if (erpExists) {
      console.log(`  ⚠️  ${m.erp} already in DB → skip (would duplicate)`);
      continue;
    }
    console.log(`  🔀 ${m.slug} → ${m.erp}`);
    console.log(`     name: ${slug.project_name.slice(0, 55)}`);
    console.log(
      `     init/fac: ${slug.initiative_id}/${slug.faculty_id} | responsible: ${slug.responsible || "?"}`
    );
    console.log(
      `     budget: allocated=${excel.allocated.toLocaleString()} · spent=${excel.spent.toLocaleString()} · remaining=${excel.remaining.toLocaleString()}`
    );
    merges.push({ slug, excel, newErp: m.erp });
  }

  console.log(``);
  const inserts = [];
  for (const i of INSERTS) {
    const excel = excelById.get(i.erp);
    if (!excel) {
      console.log(`  ⚠️  INSERT ${i.erp} — not in Excel → skip`);
      continue;
    }
    if (dbById.has(i.erp)) {
      console.log(`  ⚠️  INSERT ${i.erp} — already in DB → skip`);
      continue;
    }
    // Parse responsible from name "(...)"
    const respMatch = excel.name.match(/\(([^)]+)\)\s*$/);
    const responsible = respMatch ? respMatch[1].trim() : "";
    const cleanName = excel.name.replace(/\s*\([^)]+\)\s*$/, "").trim();
    console.log(`  🆕 INSERT ${i.erp}`);
    console.log(`     name: ${cleanName.slice(0, 55)}`);
    console.log(`     init/fac: ${i.initiative_id}/${i.faculty_id} | responsible: ${responsible}`);
    console.log(
      `     budget: allocated=${excel.allocated.toLocaleString()} · spent=${excel.spent.toLocaleString()} · remaining=${excel.remaining.toLocaleString()}`
    );
    inserts.push({ ...i, excel, cleanName, responsible });
  }

  console.log(`\nTotals: ${merges.length} merge · ${inserts.length} insert`);

  if (!COMMIT) {
    console.log(`\n🟡 DRY-RUN — รัน \`--commit\``);
    return;
  }

  console.log(`\n🟢 Committing...\n`);
  let ok = 0,
    err = 0;

  for (const m of merges) {
    // 1. INSERT ERP row with combined data
    const respMatch = m.excel.name.match(/\(([^)]+)\)\s*$/);
    const excelResp = respMatch ? respMatch[1].trim() : "";
    const cleanName = m.excel.name.replace(/\s*\([^)]+\)\s*$/, "").trim();

    const newRow = {
      id: m.newErp,
      main_program: m.slug.main_program,
      organization: m.slug.organization,
      project_name: cleanName || m.slug.project_name,
      responsible: excelResp || m.slug.responsible,
      responsible_external: m.slug.responsible_external,
      budget_total: m.excel.allocated,
      budget_used: m.excel.spent,
      budget_remaining: m.excel.remaining,
      fiscal_year: 2569,
      site: m.slug.site,
      status: m.slug.status || "approved",
      initiative_id: m.slug.initiative_id,
      faculty_id: m.slug.faculty_id,
      approval_status: m.slug.approval_status,
      tor_file_path: m.slug.tor_file_path,
    };

    const { error: iErr } = await sb.from("projects").insert(newRow);
    if (iErr) {
      err++;
      console.log(`   ❌ INSERT ${m.newErp}: ${iErr.message}`);
      continue;
    }

    // 2. DELETE slug row
    const { error: dErr } = await sb.from("projects").delete().eq("id", m.slug.id);
    if (dErr) {
      err++;
      console.log(`   ❌ DELETE ${m.slug.id}: ${dErr.message}`);
    } else {
      ok++;
      console.log(`   ✅ ${m.slug.id} → ${m.newErp}`);
    }
  }

  for (const i of inserts) {
    const { error: iErr } = await sb.from("projects").insert({
      id: i.erp,
      main_program: i.initiative_id === "thrust" ? "ใต้ร่มพระบารมี" : (i.initiative_id === "knowledge" ? "2.ขับเคลื่อนกลไก" : "3.พัฒนากำลังคน"),
      organization: "กลุ่มแผนงานใต้ร่มพระบารมี",
      project_name: i.cleanName,
      responsible: i.responsible,
      budget_total: i.excel.allocated,
      budget_used: i.excel.spent,
      budget_remaining: i.excel.remaining,
      fiscal_year: 2569,
      status: "approved",
      initiative_id: i.initiative_id,
      faculty_id: i.faculty_id,
    });
    if (iErr) {
      err++;
      console.log(`   ❌ INSERT ${i.erp}: ${iErr.message}`);
    } else {
      ok++;
      console.log(`   ✅ INSERT ${i.erp} ${i.cleanName.slice(0, 40)}`);
    }
  }

  console.log(`\n✅ Done: ${ok} success, ${err} errors`);
}

main().catch((e) => {
  console.error("💥", e);
  process.exit(1);
});
