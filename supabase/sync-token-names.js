// sync project_tokens.responsible_name ← projects.responsible
// (เผื่อชื่อใน projects ถูกแก้แล้ว แต่ token ยังเก็บชื่อเก่า)
//
// run:
//   node supabase/sync-token-names.js --dry-run
//   node supabase/sync-token-names.js

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
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const DRY_RUN = process.argv.includes("--dry-run");

(async () => {
  const [projRes, tokRes] = await Promise.all([
    sb.from("projects").select("id, project_name, responsible"),
    sb.from("project_tokens").select("token_code, project_id, responsible_name"),
  ]);
  const projById = new Map((projRes.data || []).map((p) => [p.id, p]));

  const diffs = [];
  for (const t of tokRes.data || []) {
    const p = projById.get(t.project_id);
    if (!p) continue;
    const projName = (p.responsible || "").trim();
    const tokName = (t.responsible_name || "").trim();
    // skip ถ้า projects.responsible ว่าง (จะทำให้ token ว่างตาม — ไม่ sync)
    if (!projName) continue;
    // skip ถ้า token เป็น fallback placeholder "หัวหน้าโครงการ" (ไม่ล้ม — ถือว่าชื่อเฉพาะใน projects ดีกว่า)
    if (projName === tokName) continue;
    diffs.push({
      token: t.token_code,
      projId: t.project_id,
      projName: (p.project_name || "").slice(0, 40),
      oldName: tokName,
      newName: projName,
    });
  }

  console.log(`โหมด: ${DRY_RUN ? "DRY-RUN" : "APPLY"}`);
  console.log(`พบ ${diffs.length} token ที่ชื่อไม่ตรงกับ projects.responsible\n`);

  for (const d of diffs) {
    console.log(`[${d.token}] ${d.projId.padEnd(25)} ${d.projName}`);
    console.log(`   OLD: "${d.oldName}"`);
    console.log(`   NEW: "${d.newName}"`);
  }

  if (!DRY_RUN && diffs.length) {
    console.log(`\nกำลัง update...`);
    let ok = 0, err = 0;
    for (const d of diffs) {
      const { error } = await sb
        .from("project_tokens")
        .update({ responsible_name: d.newName })
        .eq("token_code", d.token);
      if (error) { console.log(`❌ ${d.token}: ${error.message}`); err++; }
      else ok++;
    }
    console.log(`\nสำเร็จ ${ok} / ล้มเหลว ${err}`);
  } else if (DRY_RUN) {
    console.log(`\n(dry-run — ยังไม่ update)`);
  }
})();
