/**
 * Audit projects (fy=2569) vs Action plan 2569 master
 *
 * Checks:
 * 1. Every DB row has matching master row (and vice versa)
 * 2. Field-by-field comparison: faculty_id, initiative_id, budget, responsible
 * 3. Duplicate detection (very-similar names)
 * 4. Orphans (DB-only · master-only)
 *
 * Output: console report + write audit-report.md
 *
 * Usage: node supabase/audit-projects-2569.js
 */

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const root = path.join(__dirname, "..");
fs.readFileSync(path.join(root, ".env.local"), "utf-8")
  .split("\n")
  .forEach((l) => {
    const m = l.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (m) {
      let v = m[2].trim().replace(/^['"]|['"]$/g, "");
      if (!process.env[m[1]]) process.env[m[1]] = v;
    }
  });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const FACULTY_MAP = {
  "กลุ่มแผนงานใต้ร่มพระบารมี": "group-internal",
  "คณะวิศวกรรมศาสตร์": "eng",
  "คณะศิลปกรรมและสถาปัตยกรรมศาสตร์": "arch",
  "คณะบริหารธุรกิจและศิลปศาสตร์": "barts",
  "วิทยาลัยเทคโนโลยีและสหวิทยาการ": "vit",
  "สถาบันถ่ายทอดเทคโนโลยีสู่ชุมชน": "cttc",
  "สถาบันวิจัยเทคโนโลยีเกษตร": "agri-research",
  "มทร.พิษณุโลก": "rmutl-psl",
  "มทร.ล้านนา เชียงราย": "rmutl-cri",
  "มทร.ล้านนา น่าน": "rmutl-nan",
  "มทร.ล้านนา ตาก": "rmutl-tak",
  "มทร.ล้านนา พิษณุโลก": "rmutl-psl",
};
const INIT_MATCH = [
  { p: /ผลักดัน/, id: "thrust" },
  { p: /ขับเคลื่อน/, id: "knowledge" },
  { p: /พัฒนากำลังคน/, id: "workforce" },
];

function parseNum(s) {
  if (!s) return 0;
  const cleaned = s.toString().replace(/[,\s]/g, "").trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}
function normalize(s) {
  return (s || "")
    .replace(/\.(xlsx|pdf|docx)$/i, "")
    .replace(/^\d+\.\s*/, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
function similarity(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.length > 15 && b.includes(a.slice(0, 25))) return 0.9;
  if (b.length > 15 && a.includes(b.slice(0, 25))) return 0.9;
  const aGrams = new Set();
  for (let i = 0; i <= a.length - 6; i++) aGrams.add(a.slice(i, i + 6));
  let m = 0,
    t = 0;
  for (let i = 0; i <= b.length - 6; i++) {
    t++;
    if (aGrams.has(b.slice(i, i + 6))) m++;
  }
  return t > 0 ? m / t : 0;
}

function parseMaster() {
  const content = fs.readFileSync(
    path.join(root, "RPF_Researcher_Profile_vault/0_Inbox/action-plan-2569-mirror-2026-06-14.md"),
    "utf-8"
  );
  let stripped = content.replace(/^---[\s\S]*?---\n/, "").replace(/^# Action plan 2569.*\n/, "");
  const projects = [];
  let initId = null,
    facId = null,
    inSection2 = false;
  for (const line of stripped.split("\n")) {
    if (!line.includes("|")) continue;
    const cells = line.split("|").slice(1, -1).map((c) => c.trim());
    if (cells.length < 2 || !cells[0]) continue;
    const first = cells[0];
    const im = INIT_MATCH.find((m) => m.p.test(first));
    if (im && !first.match(/^\d+\.\s*โครงการ/)) {
      initId = im.id;
      facId = null;
      inSection2 = true;
      continue;
    }
    if (!inSection2) continue;
    const nonempty = cells.filter((c) => c).length;
    if (nonempty === 1 && FACULTY_MAP[first]) {
      facId = FACULTY_MAP[first];
      continue;
    }
    if (first.match(/^\d+\.\s*โครงการ|^โครงการ/)) {
      projects.push({
        name: first.replace(/^\d+\.\s*/, "").trim(),
        normalized: normalize(first),
        responsible: cells[1] || "",
        budget: parseNum(cells[2]),
        initiative_id: initId,
        faculty_id: facId,
      });
    }
  }
  return projects;
}

(async () => {
  console.log(`\n🔍 Audit projects (fy=2569)\n`);

  const master = parseMaster();
  const { data: db } = await sb
    .from("projects")
    .select("id, project_name, initiative_id, faculty_id, budget_total, responsible, tor_file_path, organization, main_program")
    .eq("fiscal_year", 2569);

  console.log(`DB: ${db.length} projects | Master: ${master.length} projects\n`);

  const dbNorm = db.map((d) => ({ ...d, normalized: normalize(d.project_name) }));

  // Match each master → DB
  const issues = {
    initiative_mismatch: [],
    faculty_mismatch: [],
    budget_mismatch: [],
    responsible_mismatch: [],
    master_only: [],
    db_only: [],
    likely_duplicates_db: [],
    no_tor: [],
  };

  const dbMatched = new Set();
  for (const m of master) {
    let best = null,
      bestScore = 0;
    for (const d of dbNorm) {
      const s = similarity(m.normalized, d.normalized);
      if (s > bestScore) {
        bestScore = s;
        best = d;
      }
    }
    if (bestScore < 0.6 || !best) {
      issues.master_only.push(m);
      continue;
    }
    dbMatched.add(best.id);

    // Compare fields
    if (m.initiative_id && m.initiative_id !== best.initiative_id) {
      issues.initiative_mismatch.push({ master: m, db: best });
    }
    if (m.faculty_id && m.faculty_id !== best.faculty_id) {
      issues.faculty_mismatch.push({ master: m, db: best });
    }
    if (m.budget > 0 && Math.abs(m.budget - Number(best.budget_total)) > 0.5) {
      issues.budget_mismatch.push({ master: m, db: best, diff: m.budget - Number(best.budget_total) });
    }
    if (m.responsible && best.responsible && normalize(m.responsible) !== normalize(best.responsible)) {
      issues.responsible_mismatch.push({ master: m, db: best });
    }
  }
  for (const d of db) {
    if (!dbMatched.has(d.id)) issues.db_only.push(d);
  }

  // Duplicate detection in DB
  for (let i = 0; i < dbNorm.length; i++) {
    for (let j = i + 1; j < dbNorm.length; j++) {
      const s = similarity(dbNorm[i].normalized, dbNorm[j].normalized);
      if (s >= 0.75) {
        issues.likely_duplicates_db.push({ a: dbNorm[i], b: dbNorm[j], score: s.toFixed(2) });
      }
    }
  }

  // TOR check
  for (const d of db) {
    if (!d.tor_file_path) issues.no_tor.push(d);
  }

  // Report
  console.log(`📋 ISSUES FOUND:`);
  console.log(`  🟠 Initiative mismatch:    ${issues.initiative_mismatch.length}`);
  console.log(`  🟠 Faculty mismatch:       ${issues.faculty_mismatch.length}`);
  console.log(`  🟠 Budget mismatch:        ${issues.budget_mismatch.length}`);
  console.log(`  🟠 Responsible mismatch:   ${issues.responsible_mismatch.length}`);
  console.log(`  🔴 Master-only (DB ขาด):   ${issues.master_only.length}`);
  console.log(`  🔴 DB-only (Master ขาด):   ${issues.db_only.length}`);
  console.log(`  🟡 Likely duplicates:      ${issues.likely_duplicates_db.length}`);
  console.log(`  ⚪ No TOR file:            ${issues.no_tor.length}\n`);

  // Show details for critical issues
  const print = (label, list, fn) => {
    if (list.length > 0) {
      console.log(`\n=== ${label} ===`);
      list.slice(0, 15).forEach((x, i) => console.log(`  ${i + 1}. ${fn(x)}`));
      if (list.length > 15) console.log(`  ... และอีก ${list.length - 15}`);
    }
  };

  print("Initiative mismatch", issues.initiative_mismatch, (x) =>
    `[${x.db.id}] ${x.master.name.slice(0, 50)} | DB=${x.db.initiative_id} → Master=${x.master.initiative_id}`
  );
  print("Faculty mismatch", issues.faculty_mismatch, (x) =>
    `[${x.db.id}] ${x.master.name.slice(0, 50)} | DB=${x.db.faculty_id} → Master=${x.master.faculty_id}`
  );
  print("Budget mismatch", issues.budget_mismatch, (x) =>
    `[${x.db.id}] ${x.master.name.slice(0, 40)} | DB=${x.db.budget_total} → Master=${x.master.budget} (Δ ${x.diff.toLocaleString()})`
  );
  print("Master-only", issues.master_only, (x) =>
    `[${x.initiative_id}/${x.faculty_id}] ${x.name.slice(0, 55)} (${x.budget.toLocaleString()})`
  );
  print("DB-only", issues.db_only, (x) =>
    `[${x.id}] ${(x.project_name || "").slice(0, 55)} | ${x.budget_total}`
  );
  print("Likely duplicates (DB)", issues.likely_duplicates_db, (x) =>
    `[${x.score}] [${x.a.id}] "${(x.a.project_name || "").slice(0, 40)}" ↔ [${x.b.id}] "${(x.b.project_name || "").slice(0, 40)}"`
  );

  // Write report
  const reportPath = path.join(root, "RPF_Researcher_Profile_vault/0_Inbox/audit-report-2026-06-14.md");
  let md = `---\ntitle: Audit Report — projects (fy=2569)\ndate: 2026-06-14\n---\n\n`;
  md += `# Audit Report — projects (fy=2569) vs Action plan 2569 master\n\n`;
  md += `- DB: **${db.length}** projects\n- Master: **${master.length}** projects\n\n`;
  md += `## Issues\n\n`;
  md += `| Type | Count |\n|---|---|\n`;
  md += `| Initiative mismatch | ${issues.initiative_mismatch.length} |\n`;
  md += `| Faculty mismatch | ${issues.faculty_mismatch.length} |\n`;
  md += `| Budget mismatch | ${issues.budget_mismatch.length} |\n`;
  md += `| Responsible mismatch | ${issues.responsible_mismatch.length} |\n`;
  md += `| Master-only | ${issues.master_only.length} |\n`;
  md += `| DB-only | ${issues.db_only.length} |\n`;
  md += `| Likely duplicates | ${issues.likely_duplicates_db.length} |\n`;
  md += `| No TOR file | ${issues.no_tor.length} |\n\n`;

  if (issues.likely_duplicates_db.length > 0) {
    md += `## Likely Duplicates (review needed)\n\n`;
    issues.likely_duplicates_db.forEach((x) => {
      md += `- [${x.score}] **[${x.a.id}]** "${x.a.project_name}" ↔ **[${x.b.id}]** "${x.b.project_name}"\n`;
    });
    md += `\n`;
  }
  if (issues.faculty_mismatch.length > 0) {
    md += `## Faculty Mismatches\n\n`;
    issues.faculty_mismatch.forEach((x) => {
      md += `- [${x.db.id}] ${x.master.name}: DB=\`${x.db.faculty_id}\` → Master=\`${x.master.faculty_id}\`\n`;
    });
    md += `\n`;
  }
  if (issues.initiative_mismatch.length > 0) {
    md += `## Initiative Mismatches\n\n`;
    issues.initiative_mismatch.forEach((x) => {
      md += `- [${x.db.id}] ${x.master.name}: DB=\`${x.db.initiative_id}\` → Master=\`${x.master.initiative_id}\`\n`;
    });
    md += `\n`;
  }
  if (issues.budget_mismatch.length > 0) {
    md += `## Budget Mismatches\n\n`;
    issues.budget_mismatch.forEach((x) => {
      md += `- [${x.db.id}] ${x.master.name}: DB=\`${x.db.budget_total}\` → Master=\`${x.master.budget}\` (Δ ${x.diff.toLocaleString()})\n`;
    });
    md += `\n`;
  }
  if (issues.db_only.length > 0) {
    md += `## DB-only (รอ verify · อาจ stale หรือเปลี่ยนชื่อ)\n\n`;
    issues.db_only.forEach((x) => {
      md += `- [${x.id}] ${x.project_name} (${x.budget_total})\n`;
    });
    md += `\n`;
  }
  if (issues.master_only.length > 0) {
    md += `## Master-only (master พบ · DB ขาด)\n\n`;
    issues.master_only.forEach((x) => {
      md += `- [${x.initiative_id}/${x.faculty_id}] ${x.name} (${x.budget.toLocaleString()})\n`;
    });
  }

  fs.writeFileSync(reportPath, md);
  console.log(`\n📄 Report saved: ${reportPath}`);
})();
