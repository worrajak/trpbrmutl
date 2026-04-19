// scan โครงการที่ยังไม่มี token
// run: node supabase/check-missing-tokens.js
const { createClient } = require("@supabase/supabase-js");
const { readFileSync } = require("fs");
const { resolve } = require("path");

// โหลด .env.local (ถ้ายังไม่มี dotenv)
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
if (!url || !key) { console.error("missing env"); process.exit(1); }
const sb = createClient(url, key);

(async () => {
  const { data: projects, error: e1 } = await sb
    .from("projects")
    .select("id, erp_code, project_name, responsible, main_program");
  if (e1) { console.error(e1); process.exit(1); }

  const { data: tokens, error: e2 } = await sb
    .from("project_tokens")
    .select("project_id, token_code, is_active");
  if (e2) { console.error(e2); process.exit(1); }

  const tokenByProj = new Map();
  for (const t of tokens || []) tokenByProj.set(t.project_id, t);

  const missing = [];
  const inactive = [];
  const ok = [];

  for (const p of projects || []) {
    const t = tokenByProj.get(p.id);
    if (!t) missing.push(p);
    else if (!t.is_active) inactive.push({ ...p, token: t.token_code });
    else ok.push({ ...p, token: t.token_code });
  }

  // group by main_program
  const byProg = {};
  for (const p of missing) {
    const k = p.main_program || "(null)";
    (byProg[k] = byProg[k] || []).push(p);
  }

  console.log("\n=== สรุป ===");
  console.log(`โครงการทั้งหมด: ${projects.length}`);
  console.log(`มี token active:  ${ok.length}`);
  console.log(`มี token inactive: ${inactive.length}`);
  console.log(`ยังไม่มี token:   ${missing.length}`);

  if (missing.length) {
    console.log("\n=== โครงการที่ยังไม่มี token (แยกตาม main_program) ===");
    for (const [prog, list] of Object.entries(byProg)) {
      console.log(`\n[${prog}] ${list.length} โครงการ`);
      for (const p of list) {
        console.log(`  ${p.id}  erp=${p.erp_code || "-"}  ${p.project_name?.slice(0, 50) || ""}  รับผิดชอบ: ${p.responsible || "-"}`);
      }
    }
  }

  if (inactive.length) {
    console.log("\n=== โครงการที่ token ถูก deactivate ===");
    for (const p of inactive) {
      console.log(`  ${p.id}  token=${p.token}  ${p.project_name?.slice(0, 50) || ""}`);
    }
  }
})();
