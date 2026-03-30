-- ==========================================
-- RPF ง9 Project Tracking System
-- Migration SQL for Supabase
-- ==========================================

-- 1. ตารางโครงการ (จาก ง9 + Google Sheets)
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    main_program TEXT NOT NULL,
    organization TEXT NOT NULL,
    project_name TEXT NOT NULL,
    erp_code TEXT,
    responsible TEXT,
    responsible_title TEXT,
    phone TEXT,
    budget_total DECIMAL(12,2) DEFAULT 0,
    budget_used DECIMAL(12,2) DEFAULT 0,
    budget_remaining DECIMAL(12,2) DEFAULT 0,
    fiscal_year INT DEFAULT 2569,
    project_period TEXT,
    site TEXT,
    status TEXT DEFAULT 'approved' CHECK (status IN ('approved','in_progress','completed','delayed','cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ตารางกิจกรรม (จาก ง9 section 10.1)
CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    activity_order INT NOT NULL,
    activity_name TEXT NOT NULL,
    budget DECIMAL(12,2) DEFAULT 0,
    planned_months INT[] NOT NULL,
    expected_output TEXT,
    status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','completed','delayed','cancelled')),
    actual_start DATE,
    actual_end DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, activity_order)
);

-- 3. ตารางตัวชี้วัดคาดหวัง (จาก ง9 section 11)
CREATE TABLE IF NOT EXISTS kpi_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    kpi_name TEXT NOT NULL,
    kpi_type TEXT DEFAULT 'quantitative' CHECK (kpi_type IN ('quantitative','qualitative','time','budget')),
    target_value DECIMAL(12,2) DEFAULT 0,
    actual_value DECIMAL(12,2) DEFAULT 0,
    unit TEXT,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ตารางรายงานผลกิจกรรม (ผู้รับผิดชอบส่งรายงาน)
CREATE TABLE IF NOT EXISTS activity_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
    report_description TEXT,
    evidence_url TEXT,
    submitted_by TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending','approved','rejected')),
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    tx_hash TEXT
);

-- 5. ตารางการตอบตัวชี้วัด (สะสมจากแต่ละรายงาน)
CREATE TABLE IF NOT EXISTS kpi_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kpi_target_id UUID REFERENCES kpi_targets(id) ON DELETE CASCADE,
    report_id UUID REFERENCES activity_reports(id) ON DELETE CASCADE,
    contribution_value DECIMAL(12,2) NOT NULL,
    evidence TEXT,
    reported_by TEXT,
    reported_at TIMESTAMPTZ DEFAULT NOW(),
    tx_hash TEXT
);

-- 6. ตารางแจ้งเตือน
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    activity_id UUID REFERENCES activities(id),
    type TEXT CHECK (type IN ('upcoming','due_today','overdue','report_reminder','kpi_deadline')),
    message TEXT,
    target_user TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. ตาราง budget tracking (จาก Google Sheets realtime)
CREATE TABLE IF NOT EXISTS budget_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    erp_code TEXT,
    transaction_type TEXT CHECK (transaction_type IN ('allocation','disbursement','return')),
    amount DECIMAL(12,2) NOT NULL,
    description TEXT,
    transaction_date DATE,
    synced_from TEXT DEFAULT 'google_sheets',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_activities_project ON activities(project_id);
CREATE INDEX IF NOT EXISTS idx_activities_status ON activities(status);
CREATE INDEX IF NOT EXISTS idx_kpi_targets_project ON kpi_targets(project_id);
CREATE INDEX IF NOT EXISTS idx_kpi_contributions_kpi ON kpi_contributions(kpi_target_id);
CREATE INDEX IF NOT EXISTS idx_reports_project ON activity_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(target_user);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_budget_tx_project ON budget_transactions(project_id);

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow read for all, write for authenticated)
CREATE POLICY "Allow public read projects" ON projects FOR SELECT USING (true);
CREATE POLICY "Allow public read activities" ON activities FOR SELECT USING (true);
CREATE POLICY "Allow public read kpi_targets" ON kpi_targets FOR SELECT USING (true);
CREATE POLICY "Allow public read activity_reports" ON activity_reports FOR SELECT USING (true);
CREATE POLICY "Allow public read kpi_contributions" ON kpi_contributions FOR SELECT USING (true);
CREATE POLICY "Allow public read notifications" ON notifications FOR SELECT USING (true);
CREATE POLICY "Allow public read budget_transactions" ON budget_transactions FOR SELECT USING (true);

-- Allow anon to insert (for demo/dev - tighten in production)
CREATE POLICY "Allow anon insert projects" ON projects FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon insert activities" ON activities FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon insert kpi_targets" ON kpi_targets FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon insert activity_reports" ON activity_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon insert kpi_contributions" ON kpi_contributions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon insert notifications" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon insert budget_transactions" ON budget_transactions FOR INSERT WITH CHECK (true);

-- Allow anon to update
CREATE POLICY "Allow anon update projects" ON projects FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon update activities" ON activities FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon update kpi_targets" ON kpi_targets FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon update activity_reports" ON activity_reports FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon update notifications" ON notifications FOR UPDATE USING (true) WITH CHECK (true);
