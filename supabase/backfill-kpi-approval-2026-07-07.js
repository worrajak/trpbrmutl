/**
 * Backfill KPI targets + approval_status + responsible_external
 * จาก spreadsheet "จัดสรรแผนงาน งบประมาณ และตัวชี้วัด_ใต้ร่มพระบารมี 2569"
 * (file 1ANqPX8Ph3paP8-p3j6a4q5bEvK_Hec0DD4LPCL-H5No · modified 2026-07-07)
 *
 * Source sheets (allocation × 3): "ผลักดัน" · "ขับเคลื่อน" · "พัฒนาคน"
 *   col 0: hierarchy (leaf = X.X.X.X)
 *   col 1: งบประมาณ
 *   col 2: ผู้รับผิดชอบใน / col 3: ผู้รับผิดชอบนอก / col 4: พื้นที่
 *   col 5: อนุมัติโอนแล้ว (TRUE/FALSE)
 *   col 6: อยู่ในกระบวนการขออนุมัติ (TRUE/FALSE)
 *   col 7: ปรับแก้ไขโครงการ (TRUE/FALSE)
 *   col 8+: ตัวชี้วัดที่ N (dynamic — detect from header)
 *
 * Actions:
 *   1. Ensure KPI-36 in rpf_kpi_catalog
 *   2. UPDATE projects: approval_status JSONB + responsible_external
 *   3. INSERT kpi_targets (kpi_code linked) — skip duplicates
 *
 * Usage:
 *   node supabase/backfill-kpi-approval-2026-07-07.js           # dry-run
 *   node supabase/backfill-kpi-approval-2026-07-07.js --commit
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
  "/private/tmp/claude-501/-Users-worrajak-Library-CloudStorage-Dropbox-2012-02-08-TheRoyalProject-x-RPF-Researcher-Profile/4345c6c4-7eb8-4c99-aeec-fa371a7c8493/scratchpad/kpi-alloc-7-7-2569.xlsx";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const SHEETS = ["ผลักดัน", "ขับเคลื่อน", "พัฒนาคน"];

function n(v) {
  const num = parseFloat(String(v ?? "").replace(/[,\s]/g, ""));
  return isNaN(num) ? 0 : num;
}

function normalize(s) {
  return (s || "")
    .replace(/^\d+(\.\d+)*\.?\s*/, "") // strip 1.1.1.1 / 2. prefixes
    .replace(/\s*\([^)]*\)\s*$/, "") // strip trailing (...)
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function similarity(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.length > 15 && b.includes(a.slice(0, 25))) return 0.9;
  if (b.length > 15 && a.includes(b.slice(0, 25))) return 0.9;
  const g = new Set();
  for (let i = 0; i <= a.length - 6; i++) g.add(a.slice(i, i + 6));
  let m = 0,
    t = 0;
  for (let i = 0; i <= b.length - 6; i++) {
    t++;
    if (g.has(b.slice(i, i + 6))) m++;
  }
  return t > 0 ? m / t : 0;
}

// extract target number from Thai KPI text: "1 เครือข่าย (สพร.)" → 1 · "1 เทคโนโลยี และ 1 องค์ความรู้" → 2
function extractTarget(text) {
  const clean = String(text).replace(/[๐-๙]/g, (d) => String(d.charCodeAt(0) - 0x0e50));
  const nums = (clean.match(/\d+/g) || []).map(Number).filter((x) => x > 0 && x < 100);
  if (nums.length === 0) return 1; // text exists but no number → assume 1
  if (nums.length > 1 && / และ /.test(clean)) return nums.reduce((s, x) => s + x, 0);
  return nums[0];
}

async function main() {
  console.log(`\n🎯 Backfill KPI targets + approval_status + responsible_external`);
  console.log(`Mode: ${COMMIT ? "🟢 COMMIT" : "🟡 DRY-RUN"}\n`);

  const wb = XLSX.readFile(XLSX_PATH);

  // 1. Parse all 3 allocation sheets
  const leaves = [];
  for (const shName of SHEETS) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[shName], {
      header: 1,
      defval: "",
      blankrows: false,
      raw: false,
    });
    // header row ต่างกันต่อ sheet: บาง sheet มี title row0 (header=row1), บาง sheet header=row0
    // หา row ที่ col0 = "ยุทธศาสตร์/แผนงาน/โครงการหลัก/โครงการย่อย"
    const hdrIdx = rows.findIndex(
      (r) => /ยุทธศาสตร์\/แผนงาน\/โครงการหลัก/.test(String(r[0] || ""))
    );
    const hdr = rows[hdrIdx >= 0 ? hdrIdx : 1] || [];
    const kpiCols = {}; // colIdx → 'KPI-10'
    let flagCols = { approved: -1, in_review: -1, editing: -1 };
    hdr.forEach((h, i) => {
      const s = String(h);
      const km = s.match(/ตัวชี้วัดที่\s*(\d+)/);
      if (km) kpiCols[i] = `KPI-${km[1]}`;
      if (/อนุมัติ.*โอนงบ/s.test(s)) flagCols.approved = i;
      if (/กระบวนการ.*ขออนุมัติ/s.test(s)) flagCols.in_review = i;
      if (/ปรับแก้ไข/.test(s)) flagCols.editing = i;
    });

    let count = 0;
    for (const row of rows) {
      const first = String(row[0] || "").trim();
      if (!/^\d+\.\d+\.\d+\.\d+\s/.test(first)) continue;
      const kpis = {};
      for (const [col, code] of Object.entries(kpiCols)) {
        const v = String(row[col] || "").trim();
        if (v && v !== "-") kpis[code] = v;
      }
      leaves.push({
        sheet: shName,
        raw_name: first,
        normalized: normalize(first),
        budget: n(row[1]),
        resp_internal: String(row[2] || "").trim(),
        resp_external: String(row[3] || "").trim(),
        site: String(row[4] || "").trim(),
        approved: String(row[flagCols.approved] || "").trim() === "TRUE",
        in_review: String(row[flagCols.in_review] || "").trim() === "TRUE",
        editing: String(row[flagCols.editing] || "").trim() === "TRUE",
        kpis,
      });
      count++;
    }
    console.log(`  📄 [${shName}] leaf projects: ${count} | KPI cols: ${Object.values(kpiCols).join(",")}`);
  }
  console.log(`  รวม leaves: ${leaves.length}\n`);

  // 2. Load DB
  const { data: projects } = await sb
    .from("projects")
    .select("id, project_name, approval_status, responsible_external, status")
    .eq("fiscal_year", 2569);
  const { data: catalog } = await sb.from("rpf_kpi_catalog").select("code, target_unit");
  const unitByCode = new Map(catalog.map((c) => [c.code, c.target_unit]));
  const { data: existingKpi } = await sb
    .from("kpi_targets")
    .select("project_id, kpi_code")
    .not("kpi_code", "is", null);
  const kpiExists = new Set(existingKpi.map((k) => `${k.project_id}|${k.kpi_code}`));

  const dbNorm = projects
    .filter((p) => p.status !== "cancelled")
    .map((p) => ({ ...p, normalized: normalize(p.project_name) }));
  console.log(`📌 DB active projects: ${dbNorm.length} | existing kpi_code rows: ${existingKpi.length}\n`);

  // 3. Match + plan
  const plan = { updates: [], kpiInserts: [], unmatched: [] };
  const matchedDb = new Set();
  for (const lf of leaves) {
    let best = null,
      score = 0;
    for (const p of dbNorm) {
      const s = similarity(lf.normalized, p.normalized);
      if (s > score) {
        score = s;
        best = p;
      }
    }
    if (score < 0.55 || !best) {
      plan.unmatched.push({ lf, score: score.toFixed(2), best });
      continue;
    }
    matchedDb.add(best.id);

    plan.updates.push({
      id: best.id,
      name: lf.normalized.slice(0, 50),
      approval_status: {
        approved: lf.approved,
        in_review: lf.in_review,
        editing: lf.editing,
        cancelled: false,
      },
      responsible_external: lf.resp_external || null,
    });

    for (const [code, text] of Object.entries(lf.kpis)) {
      if (kpiExists.has(`${best.id}|${code}`)) continue; // dedupe
      plan.kpiInserts.push({
        project_id: best.id,
        kpi_code: code,
        kpi_name: text.replace(/\n/g, " · ").slice(0, 300),
        target_value: extractTarget(text),
        unit: unitByCode.get(code) || "",
      });
    }
  }

  console.log(`📋 PLAN:`);
  console.log(`  ✅ Matched → UPDATE approval/external: ${plan.updates.length}`);
  console.log(`  🎯 KPI targets INSERT:                 ${plan.kpiInserts.length}`);
  console.log(`  ⚠️ Unmatched sheet rows:               ${plan.unmatched.length}\n`);

  // KPI breakdown
  const byCode = {};
  for (const k of plan.kpiInserts) byCode[k.kpi_code] = (byCode[k.kpi_code] || 0) + 1;
  console.log(`  KPI inserts by code:`, JSON.stringify(byCode));
  const flagStats = {
    approved: plan.updates.filter((u) => u.approval_status.approved).length,
    in_review: plan.updates.filter((u) => u.approval_status.in_review).length,
    editing: plan.updates.filter((u) => u.approval_status.editing).length,
    with_external: plan.updates.filter((u) => u.responsible_external).length,
  };
  console.log(`  Flags:`, JSON.stringify(flagStats), `\n`);

  console.log(`=== KPI insert samples (first 8) ===`);
  plan.kpiInserts.slice(0, 8).forEach((k, i) => {
    console.log(`  ${i + 1}. [${k.project_id}] ${k.kpi_code} target=${k.target_value} | ${k.kpi_name.slice(0, 70)}`);
  });

  if (plan.unmatched.length > 0) {
    console.log(`\n=== Unmatched (first 8) ===`);
    plan.unmatched.slice(0, 8).forEach((u, i) => {
      console.log(`  ${i + 1}. [${u.lf.sheet}] ${u.lf.raw_name.slice(0, 65)} (best ${u.score})`);
    });
  }

  if (!COMMIT) {
    console.log(`\n🟡 DRY-RUN — รัน \`--commit\``);
    return;
  }

  // 4. COMMIT
  console.log(`\n🟢 Committing...\n`);

  // 4a. Ensure KPI-36 in catalog
  const { error: k36err } = await sb.from("rpf_kpi_catalog").upsert(
    {
      code: "KPI-36",
      name_th: "แหล่งเรียนรู้ตลอดชีวิตของสังคม",
      description: "แหล่งเรียนรู้ตลอดชีวิตของสังคม ไม่น้อยกว่า 15 แหล่งเรียนรู้ตลอดชีวิต (นับซ้ำ)",
      target_count: 15,
      target_unit: "แหล่งเรียนรู้",
      scope: "rmutl",
      fiscal_year: 2569,
    },
    { onConflict: "code" }
  );
  console.log(k36err ? `  ❌ KPI-36: ${k36err.message}` : `  ✅ KPI-36 upserted to catalog`);

  // 4b. UPDATE projects
  let upOk = 0,
    upErr = 0;
  for (const u of plan.updates) {
    const { error } = await sb
      .from("projects")
      .update({ approval_status: u.approval_status, responsible_external: u.responsible_external })
      .eq("id", u.id);
    if (error) {
      upErr++;
      console.log(`  ❌ [${u.id}] ${error.message}`);
    } else upOk++;
  }
  console.log(`  ✅ projects updated: ${upOk}/${plan.updates.length} (${upErr} errors)`);

  // 4c. INSERT kpi_targets (batch 50)
  let kOk = 0,
    kErr = 0;
  for (let i = 0; i < plan.kpiInserts.length; i += 50) {
    const batch = plan.kpiInserts.slice(i, i + 50);
    const { error } = await sb.from("kpi_targets").insert(batch);
    if (error) {
      kErr += batch.length;
      console.log(`  ❌ batch ${i}: ${error.message}`);
    } else kOk += batch.length;
  }
  console.log(`  ✅ kpi_targets inserted: ${kOk}/${plan.kpiInserts.length} (${kErr} errors)`);
}

main().catch((e) => {
  console.error("💥", e);
  process.exit(1);
});
