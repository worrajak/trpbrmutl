// สร้าง token 6 หลักสำหรับโครงการที่ยังไม่มี
// run: node supabase/generate-missing-tokens.js
const { createClient } = require("@supabase/supabase-js");
const { readFileSync } = require("fs");
const { resolve } = require("path");
const { randomBytes } = require("crypto");

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

function genToken() {
  return randomBytes(3).toString("hex").toUpperCase().slice(0, 6);
}

function extractResponsible(p) {
  if (p.responsible?.trim()) return p.responsible.trim();
  const match = (p.project_name || "").match(/\(([^)]+)\)\s*$/);
  return match ? match[1].trim() : "หัวหน้าโครงการ";
}

(async () => {
  const { data: projects } = await sb
    .from("projects")
    .select("id, erp_code, project_name, responsible, main_program");
  const { data: tokens } = await sb
    .from("project_tokens")
    .select("project_id, token_code");

  const haveToken = new Set((tokens || []).map((t) => t.project_id));
  const usedCodes = new Set((tokens || []).map((t) => t.token_code));

  const missing = (projects || []).filter((p) => !haveToken.has(p.id));
  console.log(`จะสร้าง token ให้ ${missing.length} โครงการ\n`);

  const results = [];
  for (const p of missing) {
    const responsibleName = extractResponsible(p);

    // หา token ที่ไม่ซ้ำ
    let tokenCode = null;
    for (let i = 0; i < 20; i++) {
      const candidate = genToken();
      if (usedCodes.has(candidate)) continue;
      // double-check DB
      const { data: dup } = await sb
        .from("project_tokens")
        .select("token_code")
        .eq("token_code", candidate)
        .maybeSingle();
      if (dup) { usedCodes.add(candidate); continue; }
      tokenCode = candidate;
      usedCodes.add(candidate);
      break;
    }
    if (!tokenCode) {
      console.log(`❌ ${p.id} — หาเลขไม่ซ้ำไม่ได้`);
      continue;
    }

    const { error } = await sb.from("project_tokens").insert({
      project_id: p.id,
      token_code: tokenCode,
      responsible_name: responsibleName,
      is_active: true,
      created_at: new Date().toISOString(),
    });
    if (error) {
      console.log(`❌ ${p.id} — ${error.message}`);
      results.push({ ...p, error: error.message });
    } else {
      // init reward_balance (ignore error)
      await sb.from("reward_balance").insert({
        token_code: tokenCode,
        total_rpf: 0,
        report_count: 0,
        streak_count: 0,
      }).then(() => {}).catch(() => {});
      console.log(`✅ ${p.id}  →  token ${tokenCode}  (${responsibleName})`);
      results.push({ id: p.id, erp_code: p.erp_code, project_name: p.project_name, token: tokenCode, responsible: responsibleName });
    }
  }

  console.log(`\n=== สรุป ===`);
  console.log(`สร้างสำเร็จ: ${results.filter((r) => r.token).length} / ${missing.length}`);

  // แสดงตารางสำหรับ copy ไปแจก หน.
  const ok = results.filter((r) => r.token);
  if (ok.length) {
    console.log("\n=== ตาราง token ที่สร้าง (copy ไปแจก หน.โครงการ) ===");
    console.log("token\tproject_id\tชื่อย่อโครงการ");
    for (const r of ok) {
      console.log(`${r.token}\t${r.id}\t${(r.project_name || "").slice(0, 40)}`);
    }
  }
})();
