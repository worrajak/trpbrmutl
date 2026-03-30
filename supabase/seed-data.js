const { createClient } = require('@supabase/supabase-js');
const ngor9 = require('../src/data/ngor9-projects.json');

const supabase = createClient(
  'https://vkiofmhddlzffgzstoml.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZraW9mbWhkZGx6ZmZnenN0b21sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDU2MzU4NSwiZXhwIjoyMDkwMTM5NTg1fQ.HuOoEzBnQbLzQhi28qlSOOMUK_oO-d7YRh5xr57tKCM'
);

// ERP codes mapping (จาก Google Sheets)
const erpMap = {
  'plant-profile': '16911115000083010001',
  'veg-production-process': '16911115000083010002',
  'chrysanthemum-dryer': '16911230000083010001',
  'hemp-hot-air-drying': '16911230000083010005',
  'sesame-thresher': '16911230000083010004',
  'seed-washer': '16911230000083010003',
  'bsf-fish-food': '76917000000083010001',
  'veg-spinner': '76917000000083010002',
  'biodegradable-pot': '56915000000083010003',
  'rose-products': '16911250000083010001',
  'cape-gooseberry': '16911600000083010002',
  'kok-nong-na': '16911115000084010001',
  'nan-68-274': '16911115000084010001',
  'chiangrai-68-273': '16911115000084010001',
  'management-upgrade': '16911115000085010007',
  'lora-mesh-wildfire': '16911600000085010011',
  'dust-rain-water': '16911600000085010012',
  'clean-energy-skill': '16911115000085010010',
  're-up-new-skill': '16911115000085010006',
  'water-irrigation-design': '16911115000085010009',
  'survey-agri-products': '16911210000085010001',
  'hom-textile': '16911240000085010002',
  'stone-lapping-fish': '46914000000085010002',
  'black-chicken-gi': '56915000000085010002',
  'community-research-dev': '56915000000085010001',
  'youth-innovation': '16911250000085010001',
  'hydro-pure': '16911600000085010009',
  'impact-assessment': '16911600000085010002',
  'mosquito-net-skill': '16911600000085010006',
  'green-building': '16911600000085010005',
  'block-tech-learning': '16911600000085010007',
  'ceramic-stoneware': '16911600000085010008',
  'market-plan-gin-dai': '16911600000085010003',
};

// Budget used mapping (จาก Google Sheets)
const budgetUsedMap = {
  'plant-profile': 35422,
  'veg-production-process': 31492,
  'chrysanthemum-dryer': 87500,
  'hemp-hot-air-drying': 0,
  'sesame-thresher': 0,
  'seed-washer': 0,
  'bsf-fish-food': 0,
  'veg-spinner': 0,
  'biodegradable-pot': 0,
  'rose-products': 122509,
  'cape-gooseberry': 0,
  'kok-nong-na': 211850,
  'management-upgrade': 29644,
  'lora-mesh-wildfire': 53600,
  'dust-rain-water': 57500,
  'clean-energy-skill': 27790,
  're-up-new-skill': 81520,
  'water-irrigation-design': 47806,
  'survey-agri-products': 0,
  'hom-textile': 0,
  'stone-lapping-fish': 0,
  'black-chicken-gi': 0,
  'community-research-dev': 4950,
  'youth-innovation': 70000,
  'hydro-pure': 3220,
  'impact-assessment': 91844,
  'mosquito-net-skill': 18275,
  'green-building': 90000,
  'block-tech-learning': 0,
  'ceramic-stoneware': 0,
  'market-plan-gin-dai': 0,
};

// Parse KPI text to structured targets
function parseKPI(kpi, projectId) {
  const targets = [];
  if (!kpi) return targets;

  // Quantitative KPIs
  if (kpi.quantitative) {
    for (const q of kpi.quantitative) {
      // Try to extract number and unit
      const match = q.match(/(\d+)\s*(.*)/);
      let targetVal = 1;
      let unit = 'รายการ';
      let name = q;

      // Pattern: "≥30 คน" or "30 คน" or "1 ฉบับ"
      const numMatch = q.match(/[≥>]?\s*(\d+)\s+(คน|เครื่อง|ฉบับ|ชุด|ชุดข้อมูล|บทความ|หลักสูตร|แปลง|เครือข่าย|ผลิตภัณฑ์|ระบบ|ชิ้นงาน|ตัว|เมนู|ศูนย์|แบรนด์|กิจกรรม|ข้อเสนอ|โครงการ|ชุมชน|แห่ง|อาคาร|แผน|รูป|ราย|องค์ความรู้|เครื่อง)/);
      if (numMatch) {
        targetVal = parseInt(numMatch[1]);
        unit = numMatch[2];
      }

      targets.push({
        project_id: projectId,
        kpi_name: q,
        kpi_type: 'quantitative',
        target_value: targetVal,
        actual_value: 0,
        unit: unit,
        verified: false
      });
    }
  }

  // Qualitative KPIs
  if (kpi.qualitative) {
    for (const q of kpi.qualitative) {
      const pctMatch = q.match(/[≥>]?\s*(\d+)\s*%/);
      targets.push({
        project_id: projectId,
        kpi_name: q,
        kpi_type: 'qualitative',
        target_value: pctMatch ? parseInt(pctMatch[1]) : 80,
        actual_value: 0,
        unit: '%',
        verified: false
      });
    }
  }

  // Time target
  if (kpi.time_target) {
    const pctMatch = kpi.time_target.match(/(\d+)/);
    targets.push({
      project_id: projectId,
      kpi_name: kpi.time_target,
      kpi_type: 'time',
      target_value: pctMatch ? parseInt(pctMatch[1]) : 85,
      actual_value: 0,
      unit: '%',
      verified: false
    });
  }

  // Budget target
  if (kpi.budget_target) {
    const pctMatch = kpi.budget_target.match(/(\d+)/);
    targets.push({
      project_id: projectId,
      kpi_name: kpi.budget_target,
      kpi_type: 'budget',
      target_value: pctMatch ? parseInt(pctMatch[1]) : 95,
      actual_value: 0,
      unit: '%',
      verified: false
    });
  }

  return targets;
}

async function seed() {
  console.log('=== Seeding Supabase ===\n');

  // 1. Insert projects
  console.log('1. Inserting projects...');
  const projectRows = ngor9.map(p => ({
    id: p.id,
    main_program: p.main_program,
    organization: p.organization,
    project_name: p.project_name,
    erp_code: erpMap[p.id] || null,
    responsible: p.responsible || null,
    responsible_title: p.responsible_title || null,
    phone: p.phone || null,
    budget_total: p.budget_total,
    budget_used: budgetUsedMap[p.id] || 0,
    budget_remaining: p.budget_total - (budgetUsedMap[p.id] || 0),
    fiscal_year: p.fiscal_year,
    project_period: p.project_period || null,
    site: p.site || null,
    status: 'approved'
  }));

  const { data: projData, error: projErr } = await supabase
    .from('projects')
    .upsert(projectRows, { onConflict: 'id' });

  if (projErr) console.error('  ❌ Projects error:', projErr.message);
  else console.log(`  ✅ ${projectRows.length} projects inserted`);

  // 2. Insert activities
  console.log('\n2. Inserting activities...');
  let actCount = 0;
  for (const p of ngor9) {
    if (!p.activities || p.activities.length === 0) continue;

    const actRows = p.activities.map(a => ({
      project_id: p.id,
      activity_order: a.order,
      activity_name: a.name,
      budget: a.budget || 0,
      planned_months: a.planned_months,
      expected_output: a.output || null,
      status: 'not_started'
    }));

    const { error: actErr } = await supabase
      .from('activities')
      .upsert(actRows, { onConflict: 'project_id,activity_order' });

    if (actErr) console.error(`  ❌ Activities for ${p.id}:`, actErr.message);
    else actCount += actRows.length;
  }
  console.log(`  ✅ ${actCount} activities inserted`);

  // 3. Insert KPI targets
  console.log('\n3. Inserting KPI targets...');
  let kpiCount = 0;
  for (const p of ngor9) {
    const targets = parseKPI(p.kpi, p.id);
    if (targets.length === 0) continue;

    const { error: kpiErr } = await supabase
      .from('kpi_targets')
      .insert(targets);

    if (kpiErr) console.error(`  ❌ KPI for ${p.id}:`, kpiErr.message);
    else kpiCount += targets.length;
  }
  console.log(`  ✅ ${kpiCount} KPI targets inserted`);

  // 4. Summary
  console.log('\n=== Seed Complete ===');

  const { count: pc } = await supabase.from('projects').select('*', { count: 'exact', head: true });
  const { count: ac } = await supabase.from('activities').select('*', { count: 'exact', head: true });
  const { count: kc } = await supabase.from('kpi_targets').select('*', { count: 'exact', head: true });

  console.log(`Projects:   ${pc}`);
  console.log(`Activities: ${ac}`);
  console.log(`KPI Targets: ${kc}`);
}

seed().catch(console.error);
