// Backfill projects.responsible จาก:
//   1) project_tokens.responsible_name (ถ้ามี token)
//   2) แยกชื่อจากวงเล็บท้าย project_name (ถ้าไม่มี token)
// run: node supabase/backfill-responsible.js

const { createClient } = require("@supabase/supabase-js");
const { readFileSync } = require("fs");
const { resolve } = require("path");

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

function extractFromName(name) {
  if (!name) return null;
  const m = name.match(/\(([^)]+)\)\s*$/);
  return m ? m[1].trim() : null;
}

(async () => {
  const { data: projects } = await sb
    .from("projects")
    .select("id, project_name, responsible");
  const { data: tokens } = await sb
    .from("project_tokens")
    .select("project_id, responsible_name");

  const tokenName = new Map();
  for (const t of tokens || []) {
    if (t.responsible_name && t.responsible_name !== "หัวหน้าโครงการ") {
      tokenName.set(t.project_id, t.responsible_name);
    }
  }

  const targets = (projects || []).filter((p) => !p.responsible?.trim());
  console.log(`โครงการทั้งหมด: ${projects.length}`);
  console.log(`responsible ว่าง: ${targets.length}\n`);

  let updated = 0;
  let skipped = 0;

  for (const p of targets) {
    // หาชื่อจาก 2 แหล่ง
    const fromToken = tokenName.get(p.id);
    const fromName = extractFromName(p.project_name);
    const chosen = fromToken || fromName;

    if (!chosen) {
      console.log(`⏭  ${p.id} — หาชื่อไม่ได้  (${p.project_name?.slice(0, 40)})`);
      skipped++;
      continue;
    }

    const source = fromToken ? "token" : "name()";
    const { error } = await sb
      .from("projects")
      .update({ responsible: chosen, updated_at: new Date().toISOString() })
      .eq("id", p.id);

    if (error) {
      console.log(`❌ ${p.id} — ${error.message}`);
      skipped++;
    } else {
      console.log(`✅ ${p.id}  →  ${chosen}  [${source}]`);
      updated++;
    }
  }

  console.log(`\n=== สรุป ===`);
  console.log(`อัปเดต: ${updated}`);
  console.log(`ข้าม: ${skipped}`);
})();
