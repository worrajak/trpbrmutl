const { createClient } = require('@supabase/supabase-js');
const ngor9 = require('../src/data/ngor9-projects.json');

const supabase = createClient(
  'https://vkiofmhddlzffgzstoml.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZraW9mbWhkZGx6ZmZnenN0b21sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDU2MzU4NSwiZXhwIjoyMDkwMTM5NTg1fQ.HuOoEzBnQbLzQhi28qlSOOMUK_oO-d7YRh5xr57tKCM'
);

// สร้าง token 6 หลักที่ไม่ซ้ำกัน
function generateToken(index) {
  // ใช้ base จาก index + random เพื่อให้ไม่ซ้ำ
  const base = 100000 + index * 2731 + Math.floor(Math.random() * 100);
  return String(base).slice(0, 6).padStart(6, '0');
}

async function seedTokens() {
  console.log('=== Seeding Project Tokens ===\n');

  const usedTokens = new Set();
  const tokens = [];

  for (let i = 0; i < ngor9.length; i++) {
    const p = ngor9[i];
    let token;
    do {
      token = generateToken(i + Math.floor(Math.random() * 1000));
    } while (usedTokens.has(token));
    usedTokens.add(token);

    tokens.push({
      project_id: p.id,
      token_code: token,
      responsible_name: p.responsible || p.organization,
      tron_wallet: null, // จะผูกทีหลังเมื่อ deploy TRON contract
      is_active: true,
    });
  }

  // Insert tokens
  const { error: tokErr } = await supabase
    .from('project_tokens')
    .upsert(tokens, { onConflict: 'token_code' });

  if (tokErr) {
    console.error('❌ Token insert error:', tokErr.message);
    return;
  }

  // Init reward_balance for each token
  const balances = tokens.map(t => ({
    token_code: t.token_code,
    total_rpf: 0,
    report_count: 0,
    streak_count: 0,
    last_report_date: null,
  }));

  const { error: balErr } = await supabase
    .from('reward_balance')
    .upsert(balances, { onConflict: 'token_code' });

  if (balErr) {
    console.error('❌ Balance init error:', balErr.message);
    return;
  }

  console.log('✅ Tokens created for', tokens.length, 'projects\n');

  // Print token list
  console.log('=== Token List (สำหรับ Admin แจก) ===\n');
  console.log('Token  | โครงการ                                          | ผู้รับผิดชอบ');
  console.log('-------+--------------------------------------------------+---------------------------');
  for (const t of tokens) {
    const proj = ngor9.find(p => p.id === t.project_id);
    const name = (proj?.project_name || '').substring(0, 48).padEnd(48);
    const resp = (t.responsible_name || '-').substring(0, 25);
    console.log(`${t.token_code} | ${name} | ${resp}`);
  }
}

seedTokens().catch(console.error);
