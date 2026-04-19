// debug: ดู responsible ในฐานข้อมูลจริง vs ที่ sanitize แล้ว
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

function sanitize(responsible, organization) {
  if (!responsible || responsible.trim() === "") return null;
  if (organization && responsible.trim() === organization.trim()) return null;
  const orgKeywords = ["สถาบัน", "วิทยาลัย", "มหาวิทยาลัย", "ศูนย์", "สำนัก", "กอง", "ฝ่าย", "กลุ่ม", "สำนักงาน"];
  if (orgKeywords.some((kw) => responsible.trim().startsWith(kw))) return null;
  return responsible;
}

(async () => {
  const { data } = await sb.from("projects").select("id, organization, responsible").order("id");
  const kept = [], blanked = [];
  for (const p of data || []) {
    const san = sanitize(p.responsible, p.organization);
    (san ? kept : blanked).push({ id: p.id, org: p.organization, raw: p.responsible, san });
  }
  console.log(`=== แสดง responsible (${kept.length}) ===`);
  for (const r of kept.slice(0, 10)) console.log(`  ${r.id.slice(0,30).padEnd(30)} ${r.raw}`);
  console.log(`\n=== ถูก sanitize เป็น "-" (${blanked.length}) ===`);
  for (const r of blanked) {
    const why = !r.raw ? "ว่าง" : r.org === r.raw ? "ตรงกับ organization" : "ขึ้นต้นด้วย org keyword";
    console.log(`  ${r.id.padEnd(30)} raw="${r.raw}"  org="${r.org}"  → ${why}`);
  }
})();
