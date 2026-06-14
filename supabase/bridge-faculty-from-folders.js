/**
 * Bridge faculty + initiative จาก drive-download folder structure → existing projects
 *
 * Source: drive-download-20260612-โครงการใต้ร่มจำนวน 61 โครงการ/
 *   Layer 1 = initiative (ผลักดัน / พัฒนากำลังคน / ขับเคลื่อนองค์ความรู้)
 *   Layer 2 = faculty (คณะวิศวกรรม / สถช. / มทร. เชียงราย / ...)
 *   Layer 3 = project files (.xlsx + .pdf)
 *
 * Usage:
 *   node supabase/bridge-faculty-from-folders.js               # dry-run · preview
 *   node supabase/bridge-faculty-from-folders.js --commit      # UPDATE DB
 *   node supabase/bridge-faculty-from-folders.js --verbose     # log everything
 *
 * Output:
 *   - Preview: ตาราง { project_name, matched_in_db?, initiative_id, faculty_id }
 *   - On --commit: UPDATE projects SET initiative_id, faculty_id, tor_file_path WHERE id matches
 */

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

// Load .env.local
const ENV_PATH = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(ENV_PATH)) {
  fs.readFileSync(ENV_PATH, "utf-8")
    .split("\n")
    .forEach((l) => {
      const m = l.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
      if (m) {
        let v = m[2].trim().replace(/^['"]|['"]$/g, "");
        if (!process.env[m[1]]) process.env[m[1]] = v;
      }
    });
}

const COMMIT = process.argv.includes("--commit");
const VERBOSE = process.argv.includes("--verbose");

const DRIVE_FOLDER = path.join(
  __dirname,
  "..",
  "drive-download-20260612-โครงการใต้ร่มจำนวน 61 โครงการ"
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// ============================================================
// Mappings (folder name → master table id)
// ============================================================
const INITIATIVE_MAP = {
  ผลักดัน: "thrust",
  พัฒนากำลังคน: "workforce",
  ขับเคลื่อนองค์ความรู้: "knowledge",
};

const FACULTY_MAP = {
  กลุ่มแผนงานใต้ร่มพระบารมี: "group-internal",
  คณะวิศวกรรมศาสตร์: "eng",
  คณะศิลปกรรมและสถาปัตยกรรมศาสตร์: "arch",
  คณะบริหารธุรกิจและศิลปศาสตร์: "barts",
  วิทยาลัยเทคโนโลยีและสหวิทยาการ: "vit",
  สถาบันถ่ายทอดเทคโนโลยีสู่ชุมชน: "cttc",
  สถาบันวิจัยเทคโนโลยีเกษตร: "agri-research",
  "มทร.พิษณุโลก": "rmutl-psl",
  "มทร.ล้านนา เชียงราย": "rmutl-cri",
  "มทร.ล้านนา น่าน": "rmutl-nan",
  "มทร.ล้านนา ตาก": "rmutl-tak",
  "มทร.ล้านนา พิษณุโลก": "rmutl-psl",
};

// ============================================================
// Walk folder & build project map
// ============================================================
function walkDriveFolder() {
  const result = []; // [{ initiative_id, faculty_id, filename, normalized_name, ext, full_path }]

  if (!fs.existsSync(DRIVE_FOLDER)) {
    console.error(`❌ Drive folder not found: ${DRIVE_FOLDER}`);
    process.exit(1);
  }

  for (const initDir of fs.readdirSync(DRIVE_FOLDER)) {
    const initPath = path.join(DRIVE_FOLDER, initDir);
    if (!fs.statSync(initPath).isDirectory()) continue;

    const initiative_id = INITIATIVE_MAP[initDir] || null;
    if (!initiative_id) {
      console.warn(`⚠️ Unknown initiative folder: "${initDir}"`);
      continue;
    }

    for (const facDir of fs.readdirSync(initPath)) {
      const facPath = path.join(initPath, facDir);
      if (!fs.statSync(facPath).isDirectory()) continue;

      const faculty_id = FACULTY_MAP[facDir] || null;
      if (!faculty_id) {
        console.warn(`⚠️ Unknown faculty folder: "${facDir}" (in ${initDir})`);
        continue;
      }

      for (const fname of fs.readdirSync(facPath)) {
        const fpath = path.join(facPath, fname);
        if (fs.statSync(fpath).isFile()) {
          result.push({
            initiative_id,
            faculty_id,
            initiative_folder: initDir,
            faculty_folder: facDir,
            filename: fname,
            ext: path.extname(fname).toLowerCase(),
            full_path: path.relative(path.dirname(DRIVE_FOLDER), fpath),
            normalized_name: normalizeProjectName(fname),
          });
        }
      }
    }
  }

  return result;
}

// normalize project name for matching
function normalizeProjectName(rawName) {
  return (
    rawName
      // strip extension
      .replace(/\.(xlsx|pdf|docx)$/i, "")
      // strip "1." "2." "3." prefix
      .replace(/^\d+\.\s*/, "")
      // strip "Action plan" prefix
      .replace(/^Action plan[\s-_]*/i, "")
      // strip "69_แบบฟอร์ม" prefix
      .replace(/^69_แบบฟอร์ม\s*/i, "")
      // strip whitespace
      .trim()
  );
}

// fuzzy match — return score 0-1 (1 = exact, higher = better)
function similarity(a, b) {
  if (!a || !b) return 0;
  const an = normalizeProjectName(a).toLowerCase();
  const bn = normalizeProjectName(b).toLowerCase();
  if (an === bn) return 1;
  // substring match
  if (an.length > 10 && bn.includes(an.slice(0, 20))) return 0.85;
  if (bn.length > 10 && an.includes(bn.slice(0, 20))) return 0.85;
  // Count common 8-grams
  const aGrams = new Set();
  for (let i = 0; i <= an.length - 8; i++) aGrams.add(an.slice(i, i + 8));
  let matched = 0;
  for (let i = 0; i <= bn.length - 8; i++) {
    if (aGrams.has(bn.slice(i, i + 8))) matched++;
  }
  return matched / Math.max(an.length, bn.length, 1);
}

// ============================================================
// Main
// ============================================================
async function main() {
  console.log(`\n🌉 Bridge faculty/initiative — drive-download folder → existing DB`);
  console.log(`Mode: ${COMMIT ? "🟢 COMMIT" : "🟡 DRY-RUN"}\n`);

  // Step 1: Walk folder
  const files = walkDriveFolder();
  console.log(`📁 Files in drive-download: ${files.length}`);

  // Group xlsx (primary) + match pdf (TOR)
  const xlsxFiles = files.filter((f) => f.ext === ".xlsx");
  const pdfFiles = files.filter((f) => f.ext === ".pdf");
  console.log(`   📊 xlsx: ${xlsxFiles.length}   📕 pdf (TOR): ${pdfFiles.length}\n`);

  // Step 2: Dedup xlsx by initiative+faculty+normalized_name
  // (บางไฟล์มี "Action plan_..." duplicate)
  const projects = new Map();
  for (const f of xlsxFiles) {
    const key = `${f.initiative_id}|${f.faculty_id}|${f.normalized_name}`;
    if (!projects.has(key)) {
      projects.set(key, {
        ...f,
        tor_pdf: null,
      });
    }
  }
  // attach matching PDF
  for (const f of pdfFiles) {
    const key = `${f.initiative_id}|${f.faculty_id}|${f.normalized_name}`;
    if (projects.has(key)) {
      projects.get(key).tor_pdf = f.full_path;
    }
  }
  const projectList = Array.from(projects.values());
  console.log(`📦 Distinct projects (after dedup): ${projectList.length}\n`);

  // Step 3: Load existing 2569 projects
  const { data: existing, error } = await supabase
    .from("projects")
    .select("id, project_name, initiative_id, faculty_id, tor_file_path")
    .eq("fiscal_year", 2569);
  if (error) {
    console.error("❌ DB fetch failed:", error.message);
    process.exit(1);
  }
  console.log(`📌 Existing projects in DB (fy=2569): ${existing.length}\n`);

  // Step 4: Match each project to existing row
  const plan = { match: [], unmatched_folder: [], unmatched_db: [] };
  const matchedDbIds = new Set();

  for (const p of projectList) {
    let best = null;
    let bestScore = 0;
    for (const e of existing) {
      const s = similarity(p.normalized_name, e.project_name);
      if (s > bestScore) {
        bestScore = s;
        best = e;
      }
    }
    if (bestScore >= 0.5 && best) {
      plan.match.push({ folder: p, db: best, score: bestScore.toFixed(2) });
      matchedDbIds.add(best.id);
    } else {
      plan.unmatched_folder.push({ folder: p, best, score: bestScore.toFixed(2) });
    }
  }

  for (const e of existing) {
    if (!matchedDbIds.has(e.id)) {
      plan.unmatched_db.push(e);
    }
  }

  // Step 5: Report
  console.log(`📋 PLAN:`);
  console.log(`  ✅ Matched (folder ↔ DB):     ${plan.match.length}`);
  console.log(`  ⚠️ Folder-only (no DB match): ${plan.unmatched_folder.length}`);
  console.log(`  ⚠️ DB-only (no folder match): ${plan.unmatched_db.length}\n`);

  // Show matched samples
  console.log(`=== Matched preview (first 10) ===`);
  plan.match
    .sort((a, b) => parseFloat(b.score) - parseFloat(a.score))
    .slice(0, 10)
    .forEach((m, i) => {
      console.log(
        `  ${i + 1}. [score ${m.score}] ${m.folder.initiative_id}/${m.folder.faculty_id}`
      );
      console.log(`     folder: ${m.folder.normalized_name.slice(0, 60)}`);
      console.log(`     DB:     [${m.db.id}] ${(m.db.project_name || "").slice(0, 60)}`);
    });

  if (plan.unmatched_folder.length > 0) {
    console.log(`\n=== Unmatched folder files (first 10) ===`);
    plan.unmatched_folder.slice(0, 10).forEach((u, i) => {
      console.log(
        `  ${i + 1}. ${u.folder.initiative_id}/${u.folder.faculty_id}: "${u.folder.normalized_name.slice(0, 60)}"`
      );
      if (u.best && parseFloat(u.score) > 0.2) {
        console.log(`     (best guess: [${u.score}] ${(u.best.project_name || "").slice(0, 60)})`);
      }
    });
  }

  if (plan.unmatched_db.length > 0) {
    console.log(`\n=== DB rows with no folder match (first 10) ===`);
    plan.unmatched_db.slice(0, 10).forEach((u, i) => {
      console.log(`  ${i + 1}. [${u.id}] ${(u.project_name || "").slice(0, 60)}`);
    });
  }

  if (!COMMIT) {
    console.log(`\n🟡 DRY-RUN — รัน \`--commit\` เพื่อ UPDATE`);
    return;
  }

  // Step 6: COMMIT — UPDATE
  console.log(`\n🟢 Committing UPDATE...\n`);
  let ok = 0,
    err = 0;
  for (const m of plan.match) {
    const updates = {
      initiative_id: m.folder.initiative_id,
      faculty_id: m.folder.faculty_id,
    };
    if (m.folder.tor_pdf) updates.tor_file_path = m.folder.tor_pdf;

    const { error } = await supabase.from("projects").update(updates).eq("id", m.db.id);
    if (error) {
      err++;
      console.log(`   ❌ [${m.db.id}] ${error.message}`);
    } else {
      ok++;
      if (VERBOSE) console.log(`   ✅ [${m.db.id}] ${m.folder.normalized_name.slice(0, 50)}`);
    }
  }
  console.log(`\n✅ Done: ${ok}/${plan.match.length} updated, ${err} errors`);
}

main().catch((err) => {
  console.error("\n💥 Fatal:", err);
  process.exit(1);
});
