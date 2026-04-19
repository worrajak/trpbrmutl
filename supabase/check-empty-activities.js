// สแกนโครงการที่ activities น้อยหรือไม่มีเลย
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
  const [projRes, actRes, kpiRes] = await Promise.all([
    sb.from("projects").select("id, project_name, budget_total, main_program"),
    sb.from("activities").select("id, project_id"),
    sb.from("kpi_targets").select("id, project_id"),
  ]);

  const actCount = new Map();
  for (const a of actRes.data || []) actCount.set(a.project_id, (actCount.get(a.project_id) || 0) + 1);
  const kpiCount = new Map();
  for (const k of kpiRes.data || []) kpiCount.set(k.project_id, (kpiCount.get(k.project_id) || 0) + 1);

  const rows = (projRes.data || []).map((p) => ({
    ...p,
    acts: actCount.get(p.id) || 0,
    kpis: kpiCount.get(p.id) || 0,
  }));

  const buckets = { zero: [], few: [], ok: [] };
  for (const r of rows) {
    if (r.acts === 0) buckets.zero.push(r);
    else if (r.acts < 5) buckets.few.push(r);
    else buckets.ok.push(r);
  }

  console.log(`=== สรุป ${rows.length} โครงการ ===`);
  console.log(`  activities = 0:  ${buckets.zero.length}`);
  console.log(`  activities 1-4:  ${buckets.few.length}`);
  console.log(`  activities ≥ 5:  ${buckets.ok.length}`);

  for (const [label, list] of [["ไม่มีกิจกรรมเลย", buckets.zero], ["กิจกรรม 1-4 ขั้น", buckets.few]]) {
    if (list.length) {
      console.log(`\n=== ${label} (${list.length}) ===`);
      for (const r of list) {
        const budget = Number(r.budget_total || 0).toLocaleString();
        console.log(`  [acts=${r.acts} kpis=${r.kpis}] ${r.id.padEnd(24)} งบ ${budget}  ${(r.project_name || "").slice(0, 45)}`);
      }
    }
  }
})();
