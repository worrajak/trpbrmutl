// เติมกิจกรรม + ประมาณการงบ แบบ "ไม่ลบของเดิม"
//
// Logic:
//   1. คลาสสิฟายกิจกรรมเดิมเป็น 5 stage (plan/survey/execute/monitor/report)
//      ด้วย keyword matching จากชื่อ+expected_output
//   2. ถ้ากิจกรรมเดิม ≥ 4 และครอบคลุม start(plan|survey) + middle(execute) + end(monitor|report) ครบ → ข้าม
//   3. Stage ไหนยังไม่ครอบคลุม → เพิ่มกิจกรรม template ต่อท้าย (activity_order += max+1)
//   4. กิจกรรมเดิมที่ budget=0/null → ประมาณการงบตามสัดส่วน stage
//   5. สูงสุดไม่เกิน 7 กิจกรรมต่อโครงการ
//   6. ข้ามโครงการที่มี activity_reports แล้ว (กัน conflict ข้อมูลรายงาน)
//
// run:
//   node supabase/supplement-activities.js --dry-run
//   node supabase/supplement-activities.js

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
const MAX_ACTIVITIES = 7;

// 5 stages มาตรฐาน + keywords สำหรับคลาสสิฟายกิจกรรมเดิม
const STAGES = [
  {
    key: "plan",
    name: "วางแผนและประสานงาน",
    desc: "ประชุมวางแผนการดำเนินงาน ประสานงานทุกฝ่ายที่เกี่ยวข้อง จัดทำปฏิทินการทำงาน",
    months: [1, 2], pct: 0.05,
    keywords: ["วางแผน", "ประชุม", "ประสาน", "ปฏิทิน", "เตรียมการ", "ออกแบบ", "กำหนด"]
  },
  {
    key: "survey",
    name: "สำรวจพื้นที่และจัดเตรียมวัสดุ",
    desc: "สำรวจพื้นที่เป้าหมาย จัดซื้อวัสดุ/อุปกรณ์ เตรียมความพร้อมก่อนลงพื้นที่",
    months: [2, 3, 4], pct: 0.25,
    keywords: ["สำรวจ", "จัดซื้อ", "วัสดุ", "อุปกรณ์", "จัดหา", "เตรียมพื้นที่", "เตรียมความพร้อม", "จัดเตรียม"]
  },
  {
    key: "execute",
    name: "ดำเนินกิจกรรมและลงพื้นที่",
    desc: "ลงพื้นที่ดำเนินกิจกรรมตามแผน ทดสอบ/สาธิต/ฝึกอบรม ถ่ายทอดองค์ความรู้กับกลุ่มเป้าหมาย",
    months: [3, 4, 5, 6, 7], pct: 0.45,
    keywords: ["ดำเนิน", "ลงพื้นที่", "ทดสอบ", "สาธิต", "ฝึก", "อบรม", "ปฏิบัติ", "ถ่ายทอด", "ติดตั้ง", "ผลิต", "พัฒนา", "ทดลอง", "สร้าง", "ปลูก", "เก็บข้อมูล"]
  },
  {
    key: "monitor",
    name: "ติดตามผลและประชุมสรุป",
    desc: "ติดตามและประเมินผลการดำเนินงาน ประชุมสรุปกับทีมงานและผู้มีส่วนได้ส่วนเสีย",
    months: [7, 8, 9], pct: 0.15,
    keywords: ["ติดตาม", "ประเมิน", "สรุปผล", "ถอดบทเรียน", "ทบทวน", "วิเคราะห์ผล"]
  },
  {
    key: "report",
    name: "จัดทำรายงานและเผยแพร่ผล",
    desc: "รวบรวมข้อมูล จัดทำรายงานฉบับสมบูรณ์ เผยแพร่ผลการดำเนินงาน",
    months: [9, 10, 11, 12], pct: 0.10,
    keywords: ["รายงาน", "เผยแพร่", "นำเสนอ", "จัดทำเอกสาร", "ตีพิมพ์", "เล่มสรุป"]
  },
];

// คลาสสิฟายกิจกรรมเดิมเป็น stage ไหน (ถ้าไม่เข้าเกณฑ์ใด → fallback ตาม activity_order)
function classifyActivity(act, totalActs) {
  const text = `${act.activity_name || ""} ${act.expected_output || ""}`.toLowerCase();
  // หา stage ที่มี keyword match มากที่สุด
  let best = null, bestScore = 0;
  for (const s of STAGES) {
    const score = s.keywords.filter((kw) => text.includes(kw)).length;
    if (score > bestScore) { best = s; bestScore = score; }
  }
  if (best) return best.key;
  // fallback: ใช้ activity_order หาร stage แบบสัดส่วน
  const idx = Math.min(
    STAGES.length - 1,
    Math.floor(((act.activity_order - 1) / Math.max(1, totalActs)) * STAGES.length)
  );
  return STAGES[idx].key;
}

function coveredPhases(stageSet) {
  return {
    hasStart: stageSet.has("plan") || stageSet.has("survey"),
    hasMiddle: stageSet.has("execute"),
    hasEnd: stageSet.has("monitor") || stageSet.has("report"),
  };
}

async function supplementOne(project, existing) {
  const total = Number(project.budget_total || 0);
  // คลาสสิฟาย
  const existingWithStage = existing.map((a) => ({
    ...a,
    _stage: classifyActivity(a, existing.length),
  }));
  const coveredStages = new Set(existingWithStage.map((a) => a._stage));
  const { hasStart, hasMiddle, hasEnd } = coveredPhases(coveredStages);
  const isComplete = hasStart && hasMiddle && hasEnd;

  // เงื่อนไข skip: ≥ 4 กิจกรรม + เวิร์กโฟลว์ครอบคลุมต้น-กลาง-ปลาย
  if (existing.length >= 4 && isComplete) {
    return { action: "SKIP_COMPLETE", reason: `มี ${existing.length} กิจกรรม ครอบคลุมครบ` };
  }

  // Stage ที่ยังไม่ครอบคลุม → ที่ต้องเพิ่ม
  let missingStages = STAGES.filter((s) => !coveredStages.has(s.key));

  // จำกัดให้รวมไม่เกิน MAX_ACTIVITIES
  const maxToAdd = Math.max(0, MAX_ACTIVITIES - existing.length);
  if (missingStages.length > maxToAdd) {
    // เลือกตาม priority: plan,report ก่อน (จำเป็น) → survey,monitor → execute
    const priority = { plan: 1, report: 1, survey: 2, monitor: 2, execute: 3 };
    missingStages = missingStages
      .sort((a, b) => priority[a.key] - priority[b.key])
      .slice(0, maxToAdd);
  }

  // กิจกรรมเดิมที่ budget=0/null → update ประมาณการ
  const emptyBudgetActs = existingWithStage.filter((a) => !a.budget || Number(a.budget) === 0);
  const filledBudgetSum = existingWithStage
    .filter((a) => a.budget && Number(a.budget) > 0)
    .reduce((s, a) => s + Number(a.budget), 0);

  // งบคงเหลือสำหรับ (empty existing + new)
  const remaining = Math.max(0, total - filledBudgetSum);
  // รวม weight ของทุก slot ที่ยังไม่มีงบ
  const slots = [
    ...emptyBudgetActs.map((a) => ({ kind: "update", act: a, pct: STAGES.find((s) => s.key === a._stage).pct })),
    ...missingStages.map((s) => ({ kind: "insert", stage: s, pct: s.pct })),
  ];
  const totalWeight = slots.reduce((s, x) => s + x.pct, 0);

  // คำนวน budget รายตัว
  for (const slot of slots) {
    slot.budget = totalWeight > 0 ? Math.round((remaining * slot.pct) / totalWeight) : 0;
  }

  // สร้าง rows สำหรับ update / insert
  const updates = slots.filter((s) => s.kind === "update").map((s) => ({
    id: s.act.id,
    budget: s.budget,
  }));

  const maxOrder = Math.max(0, ...existing.map((a) => a.activity_order || 0));
  const inserts = slots
    .filter((s) => s.kind === "insert")
    .map((slot, i) => ({
      project_id: project.id,
      activity_order: maxOrder + i + 1,
      activity_name: slot.stage.name,
      expected_output: slot.stage.desc,
      budget: slot.budget,
      planned_months: slot.stage.months,
      status: "not_started",
    }));

  // DB ops
  if (!DRY_RUN) {
    if (updates.length) {
      for (const u of updates) {
        const { error } = await sb.from("activities").update({ budget: u.budget }).eq("id", u.id);
        if (error) throw new Error(`update: ${error.message}`);
      }
    }
    if (inserts.length) {
      const { error } = await sb.from("activities").insert(inserts);
      if (error) throw new Error(`insert: ${error.message}`);
    }
  }

  return {
    action: "SUPPLEMENT",
    existing: existing.length,
    stageCoverage: [...coveredStages].join(","),
    missing: missingStages.map((s) => s.key),
    budgetUpdates: updates.length,
    budgetInserts: inserts.length,
    updates, inserts,
  };
}

(async () => {
  const [projRes, actRes, repRes] = await Promise.all([
    sb.from("projects").select("id, project_name, budget_total"),
    sb.from("activities").select("*"),
    sb.from("activity_reports").select("project_id"),
  ]);

  const actByProj = new Map();
  for (const a of actRes.data || []) {
    if (!actByProj.has(a.project_id)) actByProj.set(a.project_id, []);
    actByProj.get(a.project_id).push(a);
  }
  const hasReports = new Set((repRes.data || []).map((r) => r.project_id));

  const sparse = (projRes.data || [])
    .map((p) => ({ ...p, acts: actByProj.get(p.id) || [] }))
    .filter((p) => p.acts.length >= 1 && p.acts.length <= 4);

  console.log(`โหมด: ${DRY_RUN ? "DRY-RUN (ไม่แตะ DB)" : "APPLY"}`);
  console.log(`โครงการ sparse (1-4 กิจกรรม): ${sparse.length}\n`);

  let supplement = 0, skipComplete = 0, skipReports = 0, err = 0;
  for (const p of sparse) {
    try {
      if (hasReports.has(p.id)) {
        console.log(`⏭  [SKIP-REPORTS] ${p.id.padEnd(25)} มีรายงานแล้ว — ไม่แตะ`);
        skipReports++;
        continue;
      }
      const r = await supplementOne(p, p.acts);
      if (r.action === "SKIP_COMPLETE") {
        console.log(`⏭  [SKIP-COMPLETE] ${p.id.padEnd(25)} ${r.reason}`);
        skipComplete++;
      } else {
        const updStr = r.updates.length ? `เติมงบ ${r.updates.length}` : "";
        const insStr = r.inserts.length ? `เพิ่ม ${r.inserts.length} กิจกรรม [${r.missing.join(",")}]` : "";
        const parts = [updStr, insStr].filter(Boolean).join(" + ");
        const total = Number(p.budget_total).toLocaleString().padStart(10);
        console.log(`✅ [SUP] ${p.id.padEnd(25)} งบ ${total}  มี ${r.existing} → ${parts}`);
        if (DRY_RUN) {
          if (r.updates.length) {
            for (const u of r.updates) {
              const ea = p.acts.find((x) => x.id === u.id);
              console.log(`      • update "${(ea?.activity_name || "").slice(0, 35)}" → ฿${u.budget.toLocaleString()}`);
            }
          }
          if (r.inserts.length) {
            for (const ins of r.inserts) {
              console.log(`      • insert #${ins.activity_order} "${ins.activity_name}" → ฿${ins.budget.toLocaleString()}`);
            }
          }
        }
        supplement++;
      }
    } catch (e) {
      console.log(`❌ ${p.id} — ${e.message}`);
      err++;
    }
  }

  console.log(`\n=== สรุป ===`);
  console.log(`เติมเพิ่ม: ${supplement}  |  ข้าม (ครอบคลุมครบ): ${skipComplete}  |  ข้าม (มีรายงาน): ${skipReports}  |  ล้มเหลว: ${err}`);
  console.log(DRY_RUN ? "(dry-run — ยังไม่มีการแก้ DB)" : "");
})();
