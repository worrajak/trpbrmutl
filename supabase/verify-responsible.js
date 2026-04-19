// verify ว่าทุกโครงการมี responsible
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
(async () => {
  const { data } = await sb.from("projects").select("id, project_name, responsible");
  const empty = (data || []).filter((p) => !p.responsible?.trim());
  console.log(`ทั้งหมด ${data.length} โครงการ — ว่าง ${empty.length} โครงการ`);
  if (empty.length) {
    console.log("\nโครงการที่ยังไม่มี responsible:");
    for (const p of empty) console.log(`  ${p.id}  ${(p.project_name || "").slice(0, 50)}`);
  } else {
    console.log("\n✅ ทุกโครงการมี responsible ครบแล้ว");
  }
})();
