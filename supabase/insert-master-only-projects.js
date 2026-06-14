const fs = require("fs"), path = require("path");
const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

const root = "/Users/worrajak/Library/CloudStorage/Dropbox/2012-02-08_TheRoyalProject_x/RPF-Researcher-Profile";
fs.readFileSync(path.join(root, ".env.local"), "utf-8").split("\n").forEach(l => {
  const m = l.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
  if (m) { let v = m[2].trim().replace(/^['"]|['"]$/g, ""); if (!process.env[m[1]]) process.env[m[1]] = v; }
});

const COMMIT = process.argv.includes("--commit");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

(async () => {
  // Re-use same parser logic — simpler: inline parse + select master-only
  const content = fs.readFileSync(path.join(root, "RPF_Researcher_Profile_vault/0_Inbox/action-plan-2569-mirror-2026-06-14.md"), "utf-8");
  let stripped = content.replace(/^---[\s\S]*?---\n/, "").replace(/^# Action plan 2569.*\n/, "");
  
  const FACULTY_MAP = {
    "กลุ่มแผนงานใต้ร่มพระบารมี":"group-internal","คณะวิศวกรรมศาสตร์":"eng","คณะศิลปกรรมและสถาปัตยกรรมศาสตร์":"arch","คณะบริหารธุรกิจและศิลปศาสตร์":"barts","วิทยาลัยเทคโนโลยีและสหวิทยาการ":"vit","สถาบันถ่ายทอดเทคโนโลยีสู่ชุมชน":"cttc","สถาบันวิจัยเทคโนโลยีเกษตร":"agri-research","มทร.พิษณุโลก":"rmutl-psl","มทร.ล้านนา เชียงราย":"rmutl-cri","มทร.ล้านนา น่าน":"rmutl-nan","มทร.ล้านนา ตาก":"rmutl-tak","มทร.ล้านนา พิษณุโลก":"rmutl-psl",
  };
  const INIT_MATCH = [{p:/ผลักดัน/,id:"thrust"},{p:/ขับเคลื่อน/,id:"knowledge"},{p:/พัฒนากำลังคน/,id:"workforce"}];
  
  const projects = [];
  let initId = null, facId = null, inSection2 = false;
  for (const line of stripped.split("\n")) {
    if (!line.includes("|")) continue;
    const cells = line.split("|").slice(1,-1).map(c=>c.trim());
    if (cells.length < 2 || !cells[0]) continue;
    const first = cells[0];
    const im = INIT_MATCH.find(m=>m.p.test(first));
    if (im && !first.match(/^\d+\.\s*โครงการ/)) { initId = im.id; facId = null; inSection2 = true; continue; }
    if (!inSection2) continue;
    const nonempty = cells.filter(c=>c).length;
    if (nonempty === 1 && FACULTY_MAP[first]) { facId = FACULTY_MAP[first]; continue; }
    if (first.match(/^\d+\.\s*โครงการ|^โครงการ/)) {
      const name = first.replace(/^\d+\.\s*/, "").trim();
      const responsible = cells[1] || "";
      const budget = parseFloat((cells[2]||"0").replace(/[,\s]/g,"")) || 0;
      projects.push({ name, responsible, budget, initiative_id: initId, faculty_id: facId });
    }
  }

  // Load DB & find unmatched
  const { data: existing } = await sb.from("projects").select("project_name").eq("fiscal_year", 2569);
  const norm = (s) => (s||"").replace(/^\d+\.\s*/,"").replace(/\s+/g," ").trim().toLowerCase();
  const dbNames = new Set(existing.map(e => norm(e.project_name)));
  
  function fuzzy(a, b) {
    if (a === b) return 1;
    const aGrams = new Set();
    for (let i = 0; i <= a.length - 6; i++) aGrams.add(a.slice(i, i + 6));
    let m = 0, t = 0;
    for (let i = 0; i <= b.length - 6; i++) { t++; if (aGrams.has(b.slice(i, i + 6))) m++; }
    return t > 0 ? m / t : 0;
  }
  
  const missing = projects.filter(p => {
    const pn = norm(p.name);
    for (const dn of dbNames) {
      if (fuzzy(pn, dn) >= 0.6) return false;
    }
    return true;
  });
  
  console.log(`\n📌 Master-only projects to insert: ${missing.length}\n`);
  missing.forEach((p, i) => {
    const id = `prj-2569-${crypto.createHash("md5").update(p.name).digest("hex").slice(0,8)}`;
    console.log(`  ${i+1}. [${id}] ${p.name.slice(0,55)}`);
    console.log(`     ${p.initiative_id}/${p.faculty_id} | ${p.responsible} | ${p.budget.toLocaleString()}`);
  });
  
  if (!COMMIT) {
    console.log(`\n🟡 DRY-RUN — รัน \`--commit\` เพื่อ INSERT`);
    return;
  }
  
  console.log(`\n🟢 Committing INSERT...\n`);
  let ok = 0, err = 0;
  for (const p of missing) {
    const id = `prj-2569-${crypto.createHash("md5").update(p.name).digest("hex").slice(0,8)}`;
    const { error } = await sb.from("projects").insert({
      id,
      main_program: p.initiative_id === "thrust" ? "ใต้ร่มพระบารมี" : (p.initiative_id === "knowledge" ? "2.ขับเคลื่อนกลไก" : "3.พัฒนากำลังคน"),
      organization: "กลุ่มแผนงานใต้ร่มพระบารมี",
      project_name: p.name,
      responsible: p.responsible || null,
      budget_total: p.budget,
      fiscal_year: 2569,
      initiative_id: p.initiative_id,
      faculty_id: p.faculty_id,
      status: "approved",
    });
    if (error) { err++; console.log(`   ❌ ${p.name.slice(0,40)} → ${error.message}`); }
    else { ok++; console.log(`   ✅ [${id}] ${p.name.slice(0,55)}`); }
  }
  console.log(`\n✅ Done: ${ok}/${missing.length} inserted, ${err} errors`);
})();
