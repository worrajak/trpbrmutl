/**
 * Sync projects จาก Action plan 2569 (master · 3.5MB) — source ล่าสุด 2026-06-12
 *
 * Logic:
 * - Parse section 2 (lines 333+) ของ master Action plan 2569
 * - Block markers: "โครงการผลักดันเทคโนโลยี" / "ขับเคลื่อนกลไก..." / "พัฒนากำลังคน..."
 * - Section markers: "กลุ่มแผนงานใต้ร่มพระบารมี" / "คณะวิศวกรรมศาสตร์" / etc.
 * - Project rows: "N.โครงการ..." | ผู้รับผิดชอบ | งบประมาณ
 *
 * Strategy:
 * 1. Build map { normalized_name → { initiative, faculty, responsible, budget } }
 * 2. Match กับ existing 56 projects ใน DB by name fuzzy
 * 3. UPDATE ทุก field ด้วย ค่าใหม่จาก master (source ล่าสุด)
 * 4. List unmatched → user manual
 *
 * Usage:
 *   node supabase/sync-from-action-plan-master.js          # dry-run
 *   node supabase/sync-from-action-plan-master.js --commit
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
const VERBOSE = process.argv.includes("--verbose");

const MIRROR = path.join(
  __dirname,
  "..",
  "RPF_Researcher_Profile_vault",
  "0_Inbox",
  "action-plan-2569-mirror-2026-06-14.md"
);

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// ============================================================
// Mappings
// ============================================================
const INITIATIVE_BY_HEADER = [
  { pattern: /ผลักดัน/, id: "thrust" },
  { pattern: /ขับเคลื่อนกลไก|ขับเคลื่อนองค์ความรู้/, id: "knowledge" },
  { pattern: /พัฒนากำลังคน/, id: "workforce" },
];

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
// Helpers
// ============================================================
function parseNum(s) {
  if (!s) return 0;
  const cleaned = s.toString().replace(/[,\s]/g, "").trim();
  if (cleaned === "" || cleaned === "-") return 0;
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function normalizeName(s) {
  return s
    .replace(/\.(xlsx|pdf|docx)$/i, "")
    .replace(/^\d+\.\s*/, "")
    .replace(/^Action plan[\s_-]*/i, "")
    .replace(/[\s​]+/g, " ") // collapse whitespace
    .trim()
    .toLowerCase();
}

function similarity(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.length > 15 && b.includes(a.slice(0, 25))) return 0.9;
  if (b.length > 15 && a.includes(b.slice(0, 25))) return 0.9;
  // 6-gram overlap
  const aGrams = new Set();
  for (let i = 0; i <= a.length - 6; i++) aGrams.add(a.slice(i, i + 6));
  let matched = 0;
  let totalB = 0;
  for (let i = 0; i <= b.length - 6; i++) {
    totalB++;
    if (aGrams.has(b.slice(i, i + 6))) matched++;
  }
  return totalB > 0 ? matched / totalB : 0;
}

// ============================================================
// Parser
// ============================================================
function parseMaster(content) {
  // strip frontmatter + title
  let stripped = content.replace(/^---[\s\S]*?---\n/, "");
  stripped = stripped.replace(/^# Action plan 2569.*\n/, "");
  const lines = stripped.split("\n");

  const projects = [];
  let currentInitiative = null;
  let currentFaculty = null;
  let inSection2 = false; // section 2 = "summary by faculty" lines 333+

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.includes("|")) continue;
    const cells = line.split("|").slice(1, -1).map((c) => c.trim());
    if (cells.length < 2) continue;
    const first = cells[0];
    if (!first) continue;

    const nonempty = cells.filter((c) => c).length;

    // section 2 starts when we see a row like "โครงการผลักดันเทคโนโลยี..."
    // (initiative block header — single text spanning + budget in col 2)
    const initiativeMatch = INITIATIVE_BY_HEADER.find((m) => m.pattern.test(first));
    if (initiativeMatch && !first.match(/^\d+\.\s*โครงการ/)) {
      currentInitiative = initiativeMatch.id;
      currentFaculty = null;
      inSection2 = true;
      if (VERBOSE) console.log(`  🎯 INITIATIVE @${i}: ${initiativeMatch.id} | ${first.slice(0, 50)}`);
      continue;
    }

    if (!inSection2) continue;

    // faculty section header (single cell row)
    if (nonempty === 1 && FACULTY_MAP[first]) {
      currentFaculty = FACULTY_MAP[first];
      if (VERBOSE) console.log(`  📂 FACULTY @${i}: ${first} → ${currentFaculty}`);
      continue;
    }

    // project row
    if (first.match(/^\d+\.\s*โครงการ/) || first.match(/^โครงการ/)) {
      const project_name = first.replace(/^\d+\.\s*/, "").trim();
      const responsible = cells[1] || "";
      const budget = parseNum(cells[2]);

      projects.push({
        line: i,
        project_name,
        normalized: normalizeName(project_name),
        responsible,
        budget,
        initiative_id: currentInitiative,
        faculty_id: currentFaculty,
        raw_first: first,
      });
    }
  }

  return projects;
}

// ============================================================
// Main
// ============================================================
async function main() {
  console.log(`\n🔄 Sync from Action plan 2569 (master)`);
  console.log(`Mode: ${COMMIT ? "🟢 COMMIT" : "🟡 DRY-RUN"}\n`);

  // Load mirror
  const content = fs.readFileSync(MIRROR, "utf-8");
  const projects = parseMaster(content);
  console.log(`📊 Parsed ${projects.length} projects from master\n`);

  if (projects.length === 0) {
    console.error("❌ No projects parsed");
    process.exit(1);
  }

  // Stats by initiative
  const byInit = {};
  const byFac = {};
  for (const p of projects) {
    byInit[p.initiative_id || "?"] = (byInit[p.initiative_id || "?"] || 0) + 1;
    byFac[p.faculty_id || "?"] = (byFac[p.faculty_id || "?"] || 0) + 1;
  }
  console.log("By initiative:", JSON.stringify(byInit));
  console.log("By faculty:   ", JSON.stringify(byFac), "\n");

  // Load existing DB
  const { data: existing, error } = await sb
    .from("projects")
    .select("id, project_name, initiative_id, faculty_id, responsible, budget_total")
    .eq("fiscal_year", 2569);
  if (error) {
    console.error("❌", error.message);
    process.exit(1);
  }
  console.log(`📌 DB existing: ${existing.length} projects\n`);

  // Match
  const dbNormalized = existing.map((e) => ({
    ...e,
    normalized: normalizeName(e.project_name || ""),
  }));

  const plan = { update: [], unmatched_master: [], unmatched_db: [] };
  const matchedDbIds = new Set();

  for (const p of projects) {
    let best = null,
      bestScore = 0;
    for (const e of dbNormalized) {
      const s = similarity(p.normalized, e.normalized);
      if (s > bestScore) {
        bestScore = s;
        best = e;
      }
    }
    if (bestScore >= 0.6 && best) {
      plan.update.push({ master: p, db: best, score: bestScore.toFixed(2) });
      matchedDbIds.add(best.id);
    } else {
      plan.unmatched_master.push({ master: p, score: bestScore.toFixed(2), best });
    }
  }
  for (const e of existing) {
    if (!matchedDbIds.has(e.id)) plan.unmatched_db.push(e);
  }

  console.log(`📋 PLAN:`);
  console.log(`  ✅ Master ↔ DB match: ${plan.update.length}`);
  console.log(`  ⚠️ Master-only:       ${plan.unmatched_master.length}`);
  console.log(`  ⚠️ DB-only:           ${plan.unmatched_db.length}\n`);

  // Show samples
  console.log(`=== Update preview (first 10) ===`);
  plan.update.slice(0, 10).forEach((m, i) => {
    const changes = [];
    if (m.master.initiative_id && m.master.initiative_id !== m.db.initiative_id)
      changes.push(`init: ${m.db.initiative_id || "?"} → ${m.master.initiative_id}`);
    if (m.master.faculty_id && m.master.faculty_id !== m.db.faculty_id)
      changes.push(`fac: ${m.db.faculty_id || "?"} → ${m.master.faculty_id}`);
    if (m.master.responsible && m.master.responsible !== m.db.responsible)
      changes.push(`resp: ${(m.db.responsible || "?").slice(0, 15)} → ${m.master.responsible.slice(0, 20)}`);
    if (m.master.budget > 0 && m.master.budget !== Number(m.db.budget_total))
      changes.push(`budget: ${m.db.budget_total} → ${m.master.budget}`);
    console.log(
      `  ${i + 1}. [${m.db.id}] ${m.master.project_name.slice(0, 40)} | ${changes.join(", ") || "(no change)"}`
    );
  });

  if (plan.unmatched_master.length > 0) {
    console.log(`\n=== Master-only (first 5) ===`);
    plan.unmatched_master.slice(0, 5).forEach((u, i) => {
      console.log(
        `  ${i + 1}. [${u.master.initiative_id}/${u.master.faculty_id}] ${u.master.project_name.slice(0, 60)}`
      );
    });
  }
  if (plan.unmatched_db.length > 0) {
    console.log(`\n=== DB-only (first 5) ===`);
    plan.unmatched_db.slice(0, 5).forEach((u, i) => {
      console.log(`  ${i + 1}. [${u.id}] ${(u.project_name || "").slice(0, 60)}`);
    });
  }

  if (!COMMIT) {
    console.log(`\n🟡 DRY-RUN — รัน \`--commit\` เพื่อ UPDATE`);
    return;
  }

  // COMMIT
  console.log(`\n🟢 Committing UPDATE...\n`);
  let ok = 0,
    err = 0,
    unchanged = 0;
  for (const m of plan.update) {
    const updates = {};
    if (m.master.initiative_id) updates.initiative_id = m.master.initiative_id;
    if (m.master.faculty_id) updates.faculty_id = m.master.faculty_id;
    if (m.master.responsible) updates.responsible = m.master.responsible;
    if (m.master.budget > 0) updates.budget_total = m.master.budget;

    if (Object.keys(updates).length === 0) {
      unchanged++;
      continue;
    }

    const { error: e } = await sb.from("projects").update(updates).eq("id", m.db.id);
    if (e) {
      err++;
      console.log(`   ❌ [${m.db.id}] ${e.message}`);
    } else {
      ok++;
      if (VERBOSE) console.log(`   ✅ [${m.db.id}] ${Object.keys(updates).join(",")}`);
    }
  }
  console.log(`\n✅ Done: ${ok}/${plan.update.length} updated, ${unchanged} unchanged, ${err} errors`);
}

main().catch((e) => {
  console.error("💥", e);
  process.exit(1);
});
