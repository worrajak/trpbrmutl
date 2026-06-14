/**
 * Import baseline 61 projects + KPI targets — Phase 1 (Hybrid)
 *
 * Source: vault/0_Inbox/google-drive-survey-2026-06-14.md (markdown mirror ของ Google Sheet)
 *
 * Usage:
 *   node supabase/import-projects-2569.js               # dry-run · preview เท่านั้น
 *   node supabase/import-projects-2569.js --commit      # commit ลง DB จริง
 *   node supabase/import-projects-2569.js --verbose     # log รายละเอียดทุก row
 *
 * Logic:
 * 1. Load existing projects from DB (เพื่อ match by name → skip duplicate)
 * 2. Load master tables (initiatives, faculties, kpi_catalog) — ใช้ map text → id
 * 3. Parse markdown table จาก mirror
 * 4. Group rows by sheet (6 sheets) → extract leaf projects เท่านั้น
 * 5. สำหรับแต่ละ project:
 *    - generate slug (ใช้ existing → ERP code → hash-fallback)
 *    - map main_program → initiative_id
 *    - map organization → faculty_id
 *    - extract approval_status from 3 flags
 *    - extract KPI targets from cols 9-14
 * 6. PLAN: list ของ {insert, update, skip}
 * 7. ถ้า --commit → upsert ลง DB
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

// Load .env.local manually (no dotenv dep needed)
const ENV_PATH = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(ENV_PATH)) {
  fs.readFileSync(ENV_PATH, "utf-8")
    .split("\n")
    .forEach((line) => {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
      if (m && !process.env[m[1]]) {
        let val = m[2].trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        process.env[m[1]] = val;
      }
    });
}

// ============================================================
// Config
// ============================================================
const COMMIT = process.argv.includes("--commit");
const VERBOSE = process.argv.includes("--verbose");

const MIRROR_PATH = path.join(
  __dirname,
  "..",
  "RPF_Researcher_Profile_vault",
  "0_Inbox",
  "google-drive-survey-2026-06-14.md"
);

// อ่าน env หรือ fallback to hardcoded (pattern เดียวกับ seed-data.js)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "❌ Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in env"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================================
// Helpers
// ============================================================
function slugFromHash(text) {
  const hash = crypto.createHash("md5").update(text).digest("hex").slice(0, 6);
  return `prj-2569-${hash}`;
}

// แปลง "16,500" → 16500 · "1,250,000" → 1250000 · "-" → 0
function parseNum(s) {
  if (!s) return 0;
  const cleaned = s.toString().replace(/[,\s]/g, "").trim();
  if (cleaned === "" || cleaned === "-") return 0;
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

// detect ยุทธศาสตร์ 1/2/3 row code → initiative_id
function detectInitiative(text) {
  if (!text) return null;
  // จาก "ผลักดัน" คำเฉพาะ
  if (text.match(/ผลักดัน|วิจัย.*เทคโนโลยี/i)) return "thrust";
  if (text.match(/พัฒนากำลังคน|ส่งเสริมอาชีพ/i)) return "workforce";
  if (text.match(/ยกระดับคุณภาพชีวิต|ขับเคลื่อนกลไก|ศาสตร์พระราชา|พัฒนาที่ยั่งยืน/i))
    return "knowledge";
  return null;
}

// detect faculty จากชื่อ (พื้นที่ดำเนินงาน / คณะ / "name + sigma")
function detectFaculty(area, responsible) {
  const combined = (area || "") + " " + (responsible || "");
  if (combined.match(/วิศวกรรม|engineering|eng\./i)) return "eng";
  if (combined.match(/ศิลปกรรม|สถาปัตยกรรม|arch/i)) return "arch";
  if (combined.match(/บริหารธุรกิจ|barts/i)) return "barts";
  if (combined.match(/วิทยาลัย|วทส\.|vit/i)) return "vit";
  if (combined.match(/สถช\.|ถ่ายทอดเทคโนโลยี/i)) return "cttc";
  if (combined.match(/สวก\.|วิจัยเทคโนโลยีเกษตร/i)) return "agri-research";
  if (combined.match(/เชียงราย/i)) return "rmutl-cri";
  if (combined.match(/น่าน/i)) return "rmutl-nan";
  if (combined.match(/ตาก/i)) return "rmutl-tak";
  if (combined.match(/พิษณุโลก/i)) return "rmutl-psl";
  return "group-internal"; // default
}

// ============================================================
// Markdown table parser
// ============================================================
function parseMarkdownTable(content) {
  // strip YAML frontmatter
  const stripped = content.replace(/^---[\s\S]*?---\n/, "");
  const lines = stripped.split("\n").filter((l) => l.trim().startsWith("|"));

  // skip separator rows (|:-:|...|)
  const dataLines = lines.filter((l) => !l.match(/^\|\s*:?[-:]+:?\s*\|/));

  return dataLines.map((line) => {
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());
    return cells;
  });
}

// ============================================================
// Extract leaf projects (มี code X.X.X.X หรือ TRUE/FALSE flag)
// ============================================================
function extractProjects(rows) {
  const projects = [];
  let currentInitiative = null;
  let currentMainProgram = null;
  let sheetNum = 0;
  let lastSheetEnd = -1;

  for (let i = 0; i < rows.length; i++) {
    const cells = rows[i];
    if (cells.length < 5) continue;

    const firstCell = cells[0] || "";

    // detect sheet boundary (เจอ row "รวมงบประมาณทั้งหมด")
    if (firstCell.includes("รวมงบประมาณ")) {
      sheetNum++;
      currentInitiative = null;
      currentMainProgram = null;
      lastSheetEnd = i;
      continue;
    }

    // ยุทธศาสตร์ N → set context
    if (firstCell.match(/^ยุทธศาสตร์\s+\d/)) {
      currentInitiative = detectInitiative(firstCell);
      continue;
    }

    // แผนงานที่ X.Y → set sub-context (เก็บไว้ใช้บอก program)
    if (firstCell.match(/^แผนงานที่/)) {
      currentMainProgram = firstCell.slice(0, 80);
      continue;
    }

    // โครงการหลัก X.X.X (ไม่ใช่ leaf · ข้าม)
    if (firstCell.match(/^\d+\.\d+\.\d+\s+/) && !firstCell.match(/^\d+\.\d+\.\d+\.\d+/)) {
      continue;
    }

    // Leaf project: X.X.X.X
    if (!firstCell.match(/^\d+\.\d+\.\d+\.\d+/)) continue;

    // ต้องมี TRUE/FALSE flag ใน col 5-7 ถึงเป็น leaf จริง
    const hasFlags =
      ["TRUE", "FALSE"].includes(cells[5]) ||
      ["TRUE", "FALSE"].includes(cells[6]) ||
      ["TRUE", "FALSE"].includes(cells[7]);
    if (!hasFlags) continue;

    const name = firstCell.replace(/^\d+\.\d+\.\d+\.\d+\s+/, "").trim();
    const budget = parseNum(cells[1]);
    const responsibleInternal = cells[2] || "";
    const responsibleExternal = cells[3] || "";
    const site = cells[4] || "";
    const approvedTransfer = cells[5] === "TRUE";
    const inReview = cells[6] === "TRUE";
    const editing = cells[7] === "TRUE";

    // KPI targets (cols 8-13 in 0-indexed, 9-14 in 1-indexed)
    const kpiTargets = {
      "KPI-10": cells[8] || "",
      "KPI-17": cells[9] || "",
      "KPI-35": parseNum(cells[10]),
      "KPI-38": cells[11] || "",
      "KPI-40": cells[12] || "",
      "KPI-39": cells[13] || "",
    };

    projects.push({
      sheet: sheetNum + 1,
      raw_name: firstCell,
      project_name: name,
      budget_total: budget,
      responsible: responsibleInternal,
      responsible_external: responsibleExternal,
      site: site,
      initiative_id: currentInitiative || "thrust", // fallback
      faculty_id: detectFaculty(site, responsibleInternal),
      approval_status: {
        approved: approvedTransfer,
        in_review: inReview,
        editing: editing,
        cancelled: false,
      },
      main_program: currentMainProgram,
      kpi_targets: kpiTargets,
    });
  }

  return projects;
}

// ============================================================
// Main
// ============================================================
async function main() {
  console.log(`\n📋 RPF Action plan 2569 — Import Projects Phase 1`);
  console.log(`Mode: ${COMMIT ? "🟢 COMMIT" : "🟡 DRY-RUN (preview only)"}`);
  console.log(`Mirror: ${MIRROR_PATH}\n`);

  // Step 1: Load existing projects + master tables
  const { data: existingProjects, error: e1 } = await supabase
    .from("projects")
    .select("id, project_name, fiscal_year")
    .eq("fiscal_year", 2569);

  if (e1) {
    console.error("❌ Failed to load existing projects:", e1.message);
    process.exit(1);
  }
  console.log(`📌 Existing projects (fy=2569) in DB: ${existingProjects.length}`);

  const { data: faculties } = await supabase.from("rpf_faculties").select("id, name_th");
  const { data: initiatives } = await supabase.from("rpf_initiatives").select("id, name_th");
  const { data: kpiCatalog } = await supabase.from("rpf_kpi_catalog").select("code, target_unit");
  console.log(
    `📌 Master: ${initiatives?.length || 0} initiatives, ${faculties?.length || 0} faculties, ${
      kpiCatalog?.length || 0
    } KPIs\n`
  );

  // Step 2: Parse markdown mirror
  if (!fs.existsSync(MIRROR_PATH)) {
    console.error(`❌ Mirror file not found: ${MIRROR_PATH}`);
    process.exit(1);
  }
  const content = fs.readFileSync(MIRROR_PATH, "utf-8");
  const rows = parseMarkdownTable(content);
  console.log(`📊 Parsed ${rows.length} table rows from mirror`);

  // Step 3: Extract projects
  const projects = extractProjects(rows);
  console.log(`✅ Extracted ${projects.length} leaf projects`);

  if (projects.length === 0) {
    console.error("❌ No projects extracted — check parser logic");
    process.exit(1);
  }

  // Step 4: Plan
  const existingNames = new Set(existingProjects.map((p) => p.project_name));
  const plan = {
    insert: [],
    update: [],
    duplicate_in_source: 0,
  };
  const seenInSource = new Map();

  for (const p of projects) {
    // Dedup within source by name (3 sheets อาจ list ซ้ำ)
    if (seenInSource.has(p.project_name)) {
      plan.duplicate_in_source++;
      continue;
    }
    seenInSource.set(p.project_name, p);

    // Generate slug
    p.id = slugFromHash(p.project_name);

    if (existingNames.has(p.project_name)) {
      plan.update.push(p);
    } else {
      plan.insert.push(p);
    }
  }

  // Step 5: Report
  console.log(`\n📋 PLAN:`);
  console.log(`  🟢 Insert ใหม่:           ${plan.insert.length}`);
  console.log(`  🔵 Update existing:      ${plan.update.length}`);
  console.log(`  ⚪ Duplicate in source:  ${plan.duplicate_in_source}`);

  if (VERBOSE || !COMMIT) {
    console.log(`\n=== Insert preview (first 5) ===`);
    plan.insert.slice(0, 5).forEach((p, i) => {
      console.log(
        `  ${i + 1}. [${p.id}] ${p.project_name.slice(0, 60)} | ${p.budget_total.toLocaleString()} | ${
          p.responsible || "(no internal)"
        } | ${p.faculty_id} | ${p.initiative_id}`
      );
      console.log(
        `     approval: ${JSON.stringify(p.approval_status)}, KPIs: ${Object.entries(p.kpi_targets)
          .filter(([_, v]) => v && v !== "" && v !== 0)
          .map(([k, v]) => `${k}=${v}`)
          .join(", ")}`
      );
    });
    if (plan.insert.length > 5) console.log(`  ... และอีก ${plan.insert.length - 5} โครงการ`);
  }

  if (!COMMIT) {
    console.log(`\n🟡 DRY-RUN — ไม่ได้เขียน DB · รัน \`--commit\` เพื่อทำจริง`);
    process.exit(0);
  }

  // Step 6: COMMIT
  console.log(`\n🟢 Committing to DB ...`);
  let successCount = 0;
  let kpiCount = 0;
  let errCount = 0;

  for (const p of plan.insert) {
    const { error: insertErr } = await supabase.from("projects").insert({
      id: p.id,
      main_program: p.main_program || p.initiative_id, // legacy column
      organization: p.faculty_id, // legacy column
      project_name: p.project_name,
      responsible: p.responsible || null,
      budget_total: p.budget_total,
      fiscal_year: 2569,
      site: p.site,
      initiative_id: p.initiative_id,
      faculty_id: p.faculty_id,
      responsible_external: p.responsible_external || null,
      approval_status: p.approval_status,
      status: p.approval_status.approved ? "approved" : "in_progress",
    });

    if (insertErr) {
      errCount++;
      console.log(`   ❌ ${p.project_name.slice(0, 50)} → ${insertErr.message}`);
      continue;
    }
    successCount++;

    // Insert KPI targets (เฉพาะที่มีค่า)
    for (const [code, value] of Object.entries(p.kpi_targets)) {
      if (!value || value === "" || value === 0) continue;
      const targetValue = typeof value === "number" ? value : parseNum(String(value));
      if (targetValue === 0 && typeof value !== "number") continue; // ข้ามที่ parse ไม่ได้

      await supabase.from("kpi_targets").insert({
        project_id: p.id,
        kpi_name: `${code} target`,
        kpi_code: code,
        target_value: targetValue || 1, // ถ้า text เช่น "1 องค์ความรู้" → 1
        unit: kpiCatalog?.find((k) => k.code === code)?.target_unit || "",
      });
      kpiCount++;
    }

    if (VERBOSE) console.log(`   ✅ ${p.project_name.slice(0, 60)}`);
  }

  console.log(`\n✅ DONE`);
  console.log(`   Projects inserted: ${successCount}/${plan.insert.length}`);
  console.log(`   KPI targets inserted: ${kpiCount}`);
  if (errCount > 0) console.log(`   ❌ Errors: ${errCount}`);
}

main().catch((err) => {
  console.error("\n💥 Fatal error:", err);
  process.exit(1);
});
