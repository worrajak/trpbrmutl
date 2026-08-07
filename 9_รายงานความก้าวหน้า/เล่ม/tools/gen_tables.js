/**
 * สร้างตาราง LaTeX ของรายงาน จากฐานข้อมูล Supabase โดยตรง (กันพิมพ์ตัวเลขผิด)
 * ผลลัพธ์ -> เล่ม/data/tab-projects.tex · tab-kpi-projects.tex · tab-faculty.tex
 *
 * usage:  node tools/gen_tables.js
 *
 * หมายเหตุ: ความกว้างคอลัมน์ถูกปรับให้รวมแล้วไม่เกิน textwidth 14.79 cm
 *           (ถ้าแก้ ต้องคุมผลรวม p{} + tabcolsep×2×ncols <= 14.79 cm ไม่งั้นเกิด Overfull hbox)
 */
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const BOOK = path.join(__dirname, "..");
const ROOT = path.join(BOOK, "..", "..");            // project root
const OUT = path.join(BOOK, "data");
const FY = 2569;

// โหลด .env.local
fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").split("\n").forEach((l) => {
  const m = l.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
});
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const NL = "\\\\";
const esc = (s) => String(s || "").replace(/\\/g, "/").replace(/([&%$#_{}])/g, "\\$1")
  .replace(/\^/g, "").replace(/~/g, "-").replace(/\n/g, " ").trim();
const f = (n) => Number(n || 0).toLocaleString("en-US");
// ง8 group จากรหัส ERP หลักที่ 12-14 : 083=ผลักดัน · 084=ขับเคลื่อน · 085=พัฒนากำลังคน
const grp = (id) => (/^\d{18,20}$/.test(String(id)) ? String(id).slice(11, 14) : "other");
const G = {
  "083": "ง8-1 ผลักดันเทคโนโลยี นวัตกรรมสู่ชุมชน ตามเป้าหมายการพัฒนาอย่างยั่งยืน",
  "084": "ง8-2 ขับเคลื่อนกลไกการพัฒนาองค์ความรู้เพื่อยกระดับคุณภาพชีวิต",
  "085": "ง8-3 พัฒนากำลังคน สร้างอาชีพ ลดความเหลื่อมล้ำ บนพื้นที่สูง",
};

(async () => {
  const { data: P } = await sb.from("projects").select("*").eq("fiscal_year", FY);
  const { data: FA } = await sb.from("rpf_faculties").select("id,name_th");
  const { data: K } = await sb.from("kpi_targets").select("project_id,kpi_code,target_value").not("kpi_code", "is", null);
  const fn = {}; FA.forEach((x) => (fn[x.id] = x.name_th));
  const A = P.filter((p) => p.status !== "cancelled");

  // ---------- ภาคผนวก ก : รายชื่อโครงการ + การเบิกจ่าย ----------
  const HDR6 = `\\rowcolor{rpfnavy!12}\n\\textbf{ที่} & \\textbf{ชื่อโครงการ} & \\textbf{ผู้รับผิดชอบ} & \\textbf{หน่วยงาน} & \\textbf{จัดสรร} & \\textbf{เบิกจ่าย}${NL}\n`;
  let t = "{\\footnotesize\n\\setlength{\\tabcolsep}{3pt}\\renewcommand{\\arraystretch}{1.22}\n";
  t += "\\begin{longtable}{@{}p{0.42cm}p{4.55cm}p{2.15cm}p{2.45cm}"
     + ">{\\raggedleft\\arraybackslash}p{1.45cm}>{\\raggedleft\\arraybackslash}p{2.0cm}@{}}\n";
  t += `\\toprule\n${HDR6}\\midrule\n\\endfirsthead\n\\toprule\n${HDR6}\\midrule\n\\endhead\n`;
  for (const g of ["083", "084", "085"]) {
    const rows = A.filter((p) => grp(p.id) === g).sort((a, b) => a.id.localeCompare(b.id));
    t += `\\multicolumn{6}{@{}l}{\\cellcolor{rpfnavy!12}\\bfseries ${esc(G[g])} (${rows.length} โครงการ)}${NL}\n\\midrule\n`;
    rows.forEach((p, i) => {
      const pct = Number(p.budget_total) ? Math.round((Number(p.budget_used) / Number(p.budget_total)) * 100) : 0;
      t += `${i + 1} & ${esc((p.project_name || "").replace(/^\d+\./, "").slice(0, 70))} & `
         + `${esc((p.responsible || "-").slice(0, 24))} & ${esc(fn[p.faculty_id] || "-")} & `
         + `${f(p.budget_total)} & ${f(p.budget_used)} (${pct}\\%)${NL}\n`;
    });
    t += "\\midrule\n";
  }
  t += "\\bottomrule\n\\end{longtable}\n}\n";
  fs.writeFileSync(path.join(OUT, "tab-projects.tex"), t);

  // ---------- ภาคผนวก ข : ตัวชี้วัดรายโครงการ ----------
  const kb = {}; K.forEach((r) => (kb[r.project_id] = kb[r.project_id] || []).push(r));
  const HDR3 = `\\rowcolor{rpfnavy!12}\n\\textbf{ที่} & \\textbf{ชื่อโครงการ} & \\textbf{ตัวชี้วัดที่รับมา}${NL}\n`;
  let k2 = "{\\footnotesize\n\\setlength{\\tabcolsep}{3pt}\\renewcommand{\\arraystretch}{1.22}\n";
  k2 += "\\begin{longtable}{@{}p{0.42cm}p{8.3cm}p{4.75cm}@{}}\n";
  k2 += `\\toprule\n${HDR3}\\midrule\n\\endfirsthead\n\\toprule\n${HDR3}\\midrule\n\\endhead\n`;
  for (const g of ["083", "084", "085"]) {
    const rows = A.filter((p) => grp(p.id) === g && kb[p.id]).sort((a, b) => a.id.localeCompare(b.id));
    k2 += `\\multicolumn{3}{@{}l}{\\cellcolor{rpfnavy!12}\\bfseries ${esc(G[g])}}${NL}\n\\midrule\n`;
    rows.forEach((p, i) => {
      const s = kb[p.id].sort((a, b) => a.kpi_code.localeCompare(b.kpi_code))
        .map((r) => r.kpi_code.replace("KPI-", "") + ":" + r.target_value).join(" $\\cdot$ ");
      k2 += `${i + 1} & ${esc((p.project_name || "").replace(/^\d+\./, "").slice(0, 64))} & ${s}${NL}\n`;
    });
    k2 += "\\midrule\n";
  }
  k2 += "\\bottomrule\n\\end{longtable}\n}\n";
  fs.writeFileSync(path.join(OUT, "tab-kpi-projects.tex"), k2);

  // ---------- บทที่ 3 : งบประมาณรายหน่วยงาน ----------
  const fac = {};
  A.forEach((p) => {
    const k = p.faculty_id;
    fac[k] = fac[k] || { n: 0, t: 0, u: 0 };
    fac[k].n++; fac[k].t += +p.budget_total; fac[k].u += +p.budget_used;
  });
  let ft = "\\begin{center}\\small\n\\setlength{\\tabcolsep}{6pt}\\renewcommand{\\arraystretch}{1.3}\n";
  ft += "\\begin{tabular}{p{6.6cm}rrrr}\n\\toprule\n";
  ft += `\\rowcolor{rpfnavy!12}\n\\textbf{หน่วยงาน} & \\textbf{โครงการ} & \\textbf{งบจัดสรร} & \\textbf{เบิกจ่าย} & \\textbf{ร้อยละ}${NL}\n\\midrule\n`;
  Object.entries(fac).sort((a, b) => b[1].t - a[1].t).forEach(([k, v]) => {
    ft += `${esc(fn[k] || k)} & ${v.n} & ${f(v.t)} & ${f(v.u)} & ${Math.round((v.u / v.t) * 100)}\\%${NL}\n`;
  });
  const T = A.reduce((s, p) => s + +p.budget_total, 0);
  const U = A.reduce((s, p) => s + +p.budget_used, 0);
  ft += `\\midrule\n\\rowcolor{rpfgold!15}\n\\textbf{รวม} & \\textbf{${A.length}} & \\textbf{${f(T)}} & \\textbf{${f(U)}} & \\textbf{${Math.round((U / T) * 100)}\\%}${NL}\n`;
  ft += "\\bottomrule\n\\end{tabular}\n\\end{center}\n";
  fs.writeFileSync(path.join(OUT, "tab-faculty.tex"), ft);

  // ---------- สรุปตัวเลขสำคัญ (ไว้เทียบกับที่เขียนในเนื้อเรื่อง) ----------
  const byG = {};
  for (const g of ["083", "084", "085"]) {
    const rows = A.filter((p) => grp(p.id) === g);
    byG[g] = { n: rows.length, t: rows.reduce((s, p) => s + +p.budget_total, 0), u: rows.reduce((s, p) => s + +p.budget_used, 0) };
  }
  console.log("=== ตัวเลขที่ต้องตรงกับเนื้อเรื่องในบท ===");
  console.log(`รวม: ${A.length} โครงการ · จัดสรร ${f(T)} · เบิกจ่าย ${f(U)} (${Math.round((U / T) * 100)}%)`);
  for (const g of ["083", "084", "085"]) {
    console.log(`${G[g].slice(0, 8)}: ${byG[g].n} โครงการ · ${f(byG[g].t)} · เบิก ${f(byG[g].u)} (${Math.round((byG[g].u / byG[g].t) * 100)}%)`);
  }
  const kpiSum = {};
  const ids = new Set(A.map((p) => p.id));
  K.filter((r) => ids.has(r.project_id)).forEach((r) => (kpiSum[r.kpi_code] = (kpiSum[r.kpi_code] || 0) + Number(r.target_value || 0)));
  console.log("KPI commit:", JSON.stringify(kpiSum));
  console.log(`\n✓ เขียนตาราง 3 ไฟล์ลง ${OUT}`);
  console.log("  ถัดไป: xelatex main.tex ×2  แล้ว  python3 tools/sync_vault.py");
})();
