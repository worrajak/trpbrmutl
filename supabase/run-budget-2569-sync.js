/**
 * รัน UPSERT งบประมาณ 2569 ตรงไปที่ Supabase (ไม่ผ่าน AI · ไม่ผ่าน admin UI)
 *
 * เทียบเท่ากับการรัน supabase/sync-budget-2569-04-20.sql ใน Dashboard
 * แต่ใช้ supabase-js + ANON key เพื่อให้รันจาก terminal ได้เลย
 *
 * Usage: node supabase/run-budget-2569-sync.js
 */
const { createClient } = require("@supabase/supabase-js");
const { readFileSync } = require("fs");
const { resolve } = require("path");
const XLSX = require("xlsx");

// ===== Load .env.local =====
try {
  const envText = readFileSync(resolve(__dirname, "../.env.local"), "utf8");
  for (const line of envText.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/i);
    if (!m) continue;
    const [, k, vRaw] = m;
    const v = vRaw.replace(/^["']|["']$/g, "");
    if (!process.env[k]) process.env[k] = v;
  }
} catch {}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error("✗ missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}
const sb = createClient(url, key);

// ===== Excel parsing (เหมือน generate-budget-2569-sql.js) =====
const EXCEL_PATH = resolve(
  __dirname,
  "..",
  "MarketPredict",
  "20_4_2569_งบประมาณกลุ่มแผนงานใต้ร่มพระบารมี ปีงบประมาณ2569.xlsx"
);
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
  if (m && PERSON_PREFIX_REGEX.test(m[2].trim())) {
    return { name: m[1].trim(), responsible: m[2].trim() };
  }
  return { name: raw, responsible: "" };
}

function parseExcel() {
  const wb = XLSX.read(readFileSync(EXCEL_PATH), { type: "buffer", cellDates: true });
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {
    header: 1,
    defval: null,
  });
  const out = [];
  for (const r of rows) {
    const erpRaw = r[1];
    if (!erpRaw) continue;
    const erp = String(erpRaw).replace(/\.0$/, "").trim();
    if (!ERP_REGEX.test(erp)) continue;
    if (erp.endsWith("0000")) continue;

    const fullName = String(r[0] ?? "").replace(/\n/g, " ").trim();
    const { name, responsible } = splitNameAndResponsible(fullName);
    const total = toNumber(r[4]);
    const used = toNumber(r[9]);
    const remain = toNumber(r[12]) || Math.max(0, total - used);

    out.push({
      id: erp,
      erp_code: erp,
      project_name: name,
      responsible: responsible || null,
      main_program: "ใต้ร่มพระบารมี",
      organization: "",
      budget_total: total,
      budget_used: used,
      budget_remaining: remain,
      fiscal_year: 2569,
    });
  }
  return out;
}

// ===== Sync logic (เทียบเท่า ON CONFLICT DO UPDATE จาก SQL) =====
async function syncOne(p) {
  const { data: existing, error: fetchErr } = await sb
    .from("projects")
    .select("id, project_name, responsible, budget_reported")
    .eq("id", p.id)
    .maybeSingle();

  if (fetchErr) return { erp: p.id, status: "error", msg: `fetch: ${fetchErr.message}` };

  if (!existing) {
    const { error: insErr } = await sb.from("projects").insert(p);
    if (insErr) return { erp: p.id, status: "error", msg: `insert: ${insErr.message}` };
    return { erp: p.id, status: "created", name: p.project_name.substring(0, 50) };
  }

  // UPDATE — งบทับใหม่ · responsible/project_name เติมเฉพาะถ้า DB ว่าง
  const reported = Number(existing.budget_reported || 0);
  const effectiveUsed = Math.max(p.budget_used, reported);
  const payload = {
    budget_total: p.budget_total,
    budget_used: p.budget_used,
    budget_remaining: Math.max(0, p.budget_total - effectiveUsed),
  };
  const trim = (s) => (typeof s === "string" ? s.trim() : s);
  if (p.responsible && !trim(existing.responsible)) {
    payload.responsible = p.responsible;
  }
  if (p.project_name && !trim(existing.project_name)) {
    payload.project_name = p.project_name;
  }

  const { error: updErr } = await sb.from("projects").update(payload).eq("id", p.id);
  if (updErr) return { erp: p.id, status: "error", msg: `update: ${updErr.message}` };
  return {
    erp: p.id,
    status: "updated",
    filled: Object.keys(payload).filter((k) => !["budget_total", "budget_used", "budget_remaining"].includes(k)),
  };
}

// ===== Main =====
(async () => {
  const projects = parseExcel();
  console.log(`▸ ${projects.length} โครงการจาก Excel`);
  console.log(`▸ มี responsible: ${projects.filter((p) => p.responsible).length}/${projects.length}`);
  console.log("");

  let created = 0, updated = 0, errors = 0;
  const errorLog = [];

  for (const p of projects) {
    const r = await syncOne(p);
    if (r.status === "created") {
      created++;
      console.log(`+ NEW  ${r.erp}  ${r.name}`);
    } else if (r.status === "updated") {
      updated++;
      const fillNote = r.filled && r.filled.length ? `  (เติม: ${r.filled.join(", ")})` : "";
      console.log(`✓ UPD  ${r.erp}${fillNote}`);
    } else {
      errors++;
      console.log(`✗ ERR  ${r.erp}  ${r.msg}`);
      errorLog.push(r);
    }
  }

  console.log("\n========== SUMMARY ==========");
  console.log(`Created:  ${created}`);
  console.log(`Updated:  ${updated}`);
  console.log(`Errors:   ${errors}`);
  if (errors) {
    console.log("\nErrors:");
    errorLog.forEach((e) => console.log(`  ${e.erp}: ${e.msg}`));
  }

  // Verify totals
  const { data: verify, error: vErr } = await sb
    .from("projects")
    .select("budget_total, budget_used, budget_remaining, responsible")
    .in(
      "id",
      projects.map((p) => p.id)
    );
  if (!vErr && verify) {
    const sum = (k) => verify.reduce((s, r) => s + Number(r[k] || 0), 0);
    const withResp = verify.filter((r) => r.responsible && r.responsible.trim()).length;
    console.log("\n========== VERIFY (จาก DB) ==========");
    console.log(`Records found:    ${verify.length}/${projects.length}`);
    console.log(`มี responsible:   ${withResp}/${verify.length}`);
    console.log(`รวมงบ:            ${sum("budget_total").toLocaleString("th-TH")} บาท`);
    console.log(`เบิกจ่าย:         ${sum("budget_used").toLocaleString("th-TH")} บาท`);
    console.log(`คงเหลือ:          ${sum("budget_remaining").toLocaleString("th-TH")} บาท`);
  }

  process.exit(errors ? 1 : 0);
})();
