-- ==========================================
-- Token Authentication + Reward System
-- ==========================================

-- 1. ตาราง project_tokens: token 6 หลักผูกกับ หน.โครงการ + TRON wallet
CREATE TABLE IF NOT EXISTS project_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    token_code TEXT NOT NULL UNIQUE,
    responsible_name TEXT NOT NULL,
    tron_wallet TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ
);

-- 2. ตาราง reward_log: บันทึกการให้ RPF coin
CREATE TABLE IF NOT EXISTS reward_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    report_id UUID REFERENCES activity_reports(id),
    token_code TEXT,
    reward_type TEXT CHECK (reward_type IN ('on_time', 'early_bonus', 'consistency_bonus', 'kpi_verified', 'kpi_exceeded')),
    rpf_amount DECIMAL(12,2) NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ตาราง reward_balance: ยอด RPF สะสมของแต่ละ token
CREATE TABLE IF NOT EXISTS reward_balance (
    token_code TEXT PRIMARY KEY,
    total_rpf DECIMAL(12,2) DEFAULT 0,
    report_count INT DEFAULT 0,
    streak_count INT DEFAULT 0,
    last_report_date DATE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tokens_project ON project_tokens(project_id);
CREATE INDEX IF NOT EXISTS idx_tokens_code ON project_tokens(token_code);
CREATE INDEX IF NOT EXISTS idx_reward_log_project ON reward_log(project_id);
CREATE INDEX IF NOT EXISTS idx_reward_balance_rpf ON reward_balance(total_rpf DESC);

-- RLS
ALTER TABLE project_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_balance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read project_tokens" ON project_tokens FOR SELECT USING (true);
CREATE POLICY "Allow public read reward_log" ON reward_log FOR SELECT USING (true);
CREATE POLICY "Allow public read reward_balance" ON reward_balance FOR SELECT USING (true);
CREATE POLICY "Allow anon insert project_tokens" ON project_tokens FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon insert reward_log" ON reward_log FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon insert reward_balance" ON reward_balance FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update project_tokens" ON project_tokens FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon update reward_log" ON reward_log FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon update reward_balance" ON reward_balance FOR UPDATE USING (true) WITH CHECK (true);
