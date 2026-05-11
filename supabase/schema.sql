-- =============================================================================
--  TRPB RMUTL - ระบบติดตามโครงการใต้ร่มพระบารมี (ปีงบประมาณ 2569)
--  SUPABASE UNIFIED SCHEMA
--
--  รวมตารางทั้งหมด (projects, activities, kpi_targets, activity_reports,
--  kpi_contributions, notifications, budget_transactions, project_tokens,
--  reward_log, reward_balance, participants, kpi_evidence) พร้อม:
--    - คอลัมน์ทั้งหมดที่โค้ดปัจจุบันใช้ (รวมที่เพิ่มภายหลัง)
--    - Indexes + RLS policies (public read, anon insert/update)
--
--  วิธีใช้: Copy ทั้งไฟล์นี้ไปวางใน Supabase Dashboard → SQL Editor → Run
--  (รันซ้ำได้ เพราะใช้ IF NOT EXISTS / ADD COLUMN IF NOT EXISTS)
--
--  อ้างอิงไฟล์เก่า: supabase/old-migrations/ (01-core, 02-token, 03-participants)
-- =============================================================================

-- ==========================================
-- 1. PROJECTS — โครงการย่อย (จาก ง9 + Excel งบประมาณ ERP)
-- ==========================================
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,                          -- slug เช่น 'lora-mesh-wildfire' หรือ erp_code
    main_program TEXT NOT NULL,                   -- โครงการหลัก 1-3
    organization TEXT NOT NULL,                   -- หน่วยงาน (คณะ/สถาบัน)
    project_name TEXT NOT NULL,
    erp_code TEXT,                                -- รหัส ERP 20 หลัก
    responsible TEXT,                             -- หัวหน้าโครงการ
    responsible_title TEXT,                       -- ตำแหน่ง
    phone TEXT,
    budget_total DECIMAL(12,2) DEFAULT 0,         -- งบที่ได้รับจัดสรร
    budget_used DECIMAL(12,2) DEFAULT 0,          -- ยอดเบิกจริงจาก ERP (source of truth จาก Excel)
    budget_reported DECIMAL(12,2) DEFAULT 0,      -- ยอดที่ หน.โครงการรายงานสะสม
    budget_advance DECIMAL(12,2) DEFAULT 0,       -- ยอดที่ หน.ออกเงินเองก่อน (reported > used)
    budget_remaining DECIMAL(12,2) DEFAULT 0,     -- งบคงเหลือ = total − max(used, reported)
    fiscal_year INT DEFAULT 2569,
    project_period TEXT,                          -- ช่วงเวลาดำเนินโครงการ
    site TEXT,                                    -- พื้นที่ดำเนินงาน
    sdg_tags INT[],                               -- SDG goals ที่โครงการสนับสนุน (1-17)
    status TEXT DEFAULT 'approved'
      CHECK (status IN ('approved','in_progress','completed','delayed','cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ADD COLUMN (สำหรับกรณีรันซ้ำบน DB เก่าที่มีตารางอยู่แล้ว)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS budget_reported DECIMAL(12,2) DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS budget_advance  DECIMAL(12,2) DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS sdg_tags         INT[];


-- ==========================================
-- 2. ACTIVITIES — กิจกรรมใต้โครงการ (จาก ง9 section 10.1)
-- ==========================================
CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    activity_order INT NOT NULL,
    activity_name TEXT NOT NULL,
    budget DECIMAL(12,2) DEFAULT 0,
    planned_months INT[] NOT NULL,                -- เดือนที่วางแผน [10,11,12,...]
    expected_output TEXT,
    status TEXT DEFAULT 'not_started'
      CHECK (status IN ('not_started','in_progress','completed','delayed','cancelled')),
    actual_start DATE,
    actual_end DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, activity_order)
);


-- ==========================================
-- 3. KPI_TARGETS — ตัวชี้วัดคาดหวัง (จาก ง9 section 11)
-- ==========================================
CREATE TABLE IF NOT EXISTS kpi_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    kpi_name TEXT NOT NULL,
    kpi_type TEXT DEFAULT 'quantitative'
      CHECK (kpi_type IN ('quantitative','qualitative','time','budget')),
    target_value DECIMAL(12,2) DEFAULT 0,
    actual_value DECIMAL(12,2) DEFAULT 0,
    unit TEXT,
    verified BOOLEAN DEFAULT FALSE,
    is_additional BOOLEAN DEFAULT FALSE,          -- true = หน.โครงการเพิ่มเองภายหลัง
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE kpi_targets ADD COLUMN IF NOT EXISTS is_additional BOOLEAN DEFAULT FALSE;


-- ==========================================
-- 4. ACTIVITY_REPORTS — รายงานผลกิจกรรม (หน.โครงการส่ง)
-- ==========================================
CREATE TABLE IF NOT EXISTS activity_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
    report_description TEXT,
    evidence_url TEXT,                            -- ลิงก์หลักฐานหลัก
    evidence_files JSONB,                         -- [{name, url, type}] หลักฐานหลายรายการ
    budget_spent DECIMAL(12,2) DEFAULT 0,         -- ยอดที่ใช้ในรายงานนี้
    sdg_tags INT[],                               -- SDG ที่รายงานนี้สนับสนุน
    submitted_by TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    approval_status TEXT DEFAULT 'pending'
      CHECK (approval_status IN ('pending','approved','rejected')),
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    tx_hash TEXT                                  -- (สำหรับ blockchain reward - อนาคต)
);

ALTER TABLE activity_reports ADD COLUMN IF NOT EXISTS budget_spent   DECIMAL(12,2) DEFAULT 0;
ALTER TABLE activity_reports ADD COLUMN IF NOT EXISTS sdg_tags       INT[];
ALTER TABLE activity_reports ADD COLUMN IF NOT EXISTS evidence_files JSONB;


-- ==========================================
-- 5. KPI_CONTRIBUTIONS — การตอบตัวชี้วัดจากแต่ละรายงาน
-- ==========================================
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


-- ==========================================
-- 6. NOTIFICATIONS — แจ้งเตือน
-- ==========================================
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


-- ==========================================
-- 7. BUDGET_TRANSACTIONS — ธุรกรรมงบประมาณ (sync จาก Excel/Google Sheets)
-- ==========================================
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


-- ==========================================
-- 8. PROJECT_TOKENS — Token 6 หลักผูกกับ หน.โครงการ
-- ==========================================
CREATE TABLE IF NOT EXISTS project_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    token_code TEXT NOT NULL UNIQUE,
    responsible_name TEXT NOT NULL,
    tron_wallet TEXT,                             -- (สำหรับ blockchain reward - อนาคต)
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ
);


-- ==========================================
-- 9. REWARD_LOG — บันทึก RPF coin ที่ให้แต่ละรายงาน
-- ==========================================
CREATE TABLE IF NOT EXISTS reward_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    report_id UUID REFERENCES activity_reports(id),
    token_code TEXT,
    reward_type TEXT
      CHECK (reward_type IN ('on_time','early_bonus','consistency_bonus','kpi_verified','kpi_exceeded')),
    rpf_amount DECIMAL(12,2) NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ==========================================
-- 10. REWARD_BALANCE — ยอด RPF สะสมของแต่ละ token
-- ==========================================
CREATE TABLE IF NOT EXISTS reward_balance (
    token_code TEXT PRIMARY KEY,
    total_rpf DECIMAL(12,2) DEFAULT 0,
    report_count INT DEFAULT 0,
    streak_count INT DEFAULT 0,
    last_report_date DATE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ==========================================
-- 11. PARTICIPANTS — ผู้เข้าร่วมกิจกรรม (บุคลากร/อาจารย์/นศ./ชาวบ้าน)
-- ==========================================
CREATE TABLE IF NOT EXISTS participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    report_id UUID REFERENCES activity_reports(id),
    full_name TEXT NOT NULL,
    participant_type TEXT
      CHECK (participant_type IN ('staff','lecturer','student','villager','other')),
    student_id TEXT,
    organization TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ==========================================
-- 12. KPI_EVIDENCE — หลักฐานประกอบ KPI (ไฟล์/รูป/ลิงก์)
-- ==========================================
CREATE TABLE IF NOT EXISTS kpi_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kpi_target_id UUID REFERENCES kpi_targets(id) ON DELETE CASCADE,
    report_id UUID REFERENCES activity_reports(id),
    evidence_type TEXT
      CHECK (evidence_type IN ('image','document','link','certificate','patent','other')),
    evidence_url TEXT NOT NULL,
    description TEXT,
    uploaded_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ==========================================
-- 13. TEAM_MEMBERS — คณะทำงานใต้ร่มพระบารมี (admin tier)
-- ==========================================
-- ใช้ token (alphanumeric 6-8 ตัว) + PIN 4 หลัก สำหรับ login
-- สิทธิ: read + edit ทุก project แต่ลบไม่ได้ (can_delete = false default)
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,           -- alphanumeric uppercase 6-8 chars (เช่น PIMOL01)
    pin_hash TEXT NOT NULL,                -- SHA-256(pin + token) - PIN 4 หลัก
    role TEXT DEFAULT 'team_member'
      CHECK (role IN ('team_member', 'team_lead')),
    email TEXT,
    phone TEXT,
    can_edit BOOLEAN DEFAULT TRUE,
    can_delete BOOLEAN DEFAULT FALSE,     -- C1 spec: read+edit only, ลบไม่ได้
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);


-- ==========================================
-- 15. RESEARCH_BRIEFS — โจทย์/ปัญหา ที่ต้องการนักวิจัยมารับ (Phase 2)
-- ==========================================
-- Use case: admin/team_lead สร้าง brief จากโจทย์พื้นที่ → match กับ researchers
-- mode: 'open' (ใครก็มาแสดงความสนใจได้) | 'assigned' (มอบให้คนใดคนหนึ่ง) | 'mentorship' (junior+senior คู่)
CREATE TABLE IF NOT EXISTS research_briefs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,                          -- ชื่อโจทย์
    problem_statement TEXT NOT NULL,              -- ปัญหา/ความต้องการ (paragraph)
    location TEXT,                                -- พื้นที่ (เช่น "ห้วยเสี้ยว", "ดอยอ่างขาง")
    target_audience TEXT,                         -- กลุ่มเป้าหมาย
    -- KPI ที่โจทย์นี้ตอบ — เป็น string codes เช่น ["19","40","7.1ก-3"] ผูกกับ excellence-kpi
    target_kpis TEXT[] DEFAULT '{}',
    -- Plan ที่ผูก — 1, 2, 3 (ตาม PDF) ใช้ map ผ่าน foundation.ts
    plan_number INT CHECK (plan_number IN (1, 2, 3)),
    -- Skill tags ที่ต้องการ — slug จาก researcher-tags
    required_skills TEXT[] DEFAULT '{}',
    -- งบประมาณกรอบ
    budget_min DECIMAL(12,2),
    budget_max DECIMAL(12,2),
    fiscal_year INT DEFAULT 2569,
    -- Mode
    mode TEXT DEFAULT 'open'
      CHECK (mode IN ('open', 'assigned', 'mentorship')),
    -- assigned researcher (ถ้า mode = assigned/mentorship) — ชี้ที่ rpf_researchers
    assigned_researcher_id UUID,
    -- mentor_researcher_id (สำหรับ mentorship) — ชี้ที่ rpf_researchers
    mentor_researcher_id UUID,
    -- Link ไปยัง catalog ของสาขาวิจัยที่ต้องการ (metadata)
    research_area_id UUID,
    -- Status
    status TEXT DEFAULT 'open'
      CHECK (status IN ('draft', 'open', 'matched', 'in_progress', 'closed', 'cancelled')),
    deadline DATE,
    -- meta
    created_by TEXT,                              -- name ของคนสร้าง (admin หรือ team)
    created_by_token TEXT,                        -- team_member token (audit)
    notes TEXT,
    -- AI generated ng9 draft (เมื่อ Phase 3)
    ai_ngor9_draft JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ตัวเชื่อม brief ↔ rpf_researchers ที่แสดงความสนใจ (mode = open)
CREATE TABLE IF NOT EXISTS brief_interests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brief_id UUID REFERENCES research_briefs(id) ON DELETE CASCADE,
    researcher_id UUID,                            -- ชี้ที่ rpf_researchers
    note TEXT,                                    -- ผู้สนใจเขียน proposal สั้น
    status TEXT DEFAULT 'submitted'
      CHECK (status IN ('submitted', 'shortlisted', 'rejected', 'accepted')),
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(brief_id, researcher_id)
);


-- ==========================================
-- 14. RPF_RESEARCHERS — นักวิจัย/นักบริการวิชาการ ของกลุ่มแผนงานใต้ร่มฯ
-- ==========================================
-- หมายเหตุ: ใช้ prefix rpf_ เพื่อไม่ทับ table 'researchers' ของระบบอื่นใน Supabase
-- expertise_tags ใช้ slug จาก src/lib/researcher-tags.ts (preset 20 + custom)
CREATE TABLE IF NOT EXISTS rpf_researchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    title TEXT,                                   -- ผศ.ดร. / นาย / ผู้ช่วยศาสตราจารย์
    faculty TEXT,                                 -- คณะ
    department TEXT,                              -- สาขาวิชา
    email TEXT,
    phone TEXT,
    expertise_tags TEXT[] NOT NULL DEFAULT '{}',  -- ['precision-ag', 'iot', ...]
    areas TEXT[] DEFAULT '{}',                    -- ['เชียงใหม่', 'หมู่บ้านสันป่าตอง']
    past_projects TEXT[] DEFAULT '{}',            -- ชื่อโครงการเก่า (string array)
    level TEXT DEFAULT 'mid'
      CHECK (level IN ('junior', 'mid', 'senior')),
    bio TEXT,                                     -- ข้อมูลย่อ 1-2 บรรทัด
    external_link TEXT,                           -- โปรไฟล์มหาวิทยาลัย / ORCID
    current_load INT DEFAULT 0,                   -- จำนวนโครงการที่กำลังทำ
    is_active BOOLEAN DEFAULT TRUE,
    -- ผูกกับ team_members ถ้ามีสิทธิ login
    linked_team_member_id UUID REFERENCES team_members(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 15B. RPF_RESEARCH_AREAS — Catalog "สาขางานวิจัยที่ต้องการ" (admin curate)
-- ==========================================
-- กลุ่มแผนงานใต้ร่มฯ ใช้ประกาศชัดเจนว่าอยากได้สาขาไหน
-- 4 categories:
--   research          — สาขาวิจัยหลัก
--   academic_service  — งานบริการวิชาการ
--   expertise         — ความถนัดเฉพาะทาง
--   other             — อื่นๆ
CREATE TABLE IF NOT EXISTS rpf_research_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,                           -- "เกษตรแม่นยำสำหรับพืชผลที่สูง"
    icon TEXT,                                    -- emoji 1 ตัว
    category TEXT NOT NULL DEFAULT 'research'
      CHECK (category IN ('research', 'academic_service', 'expertise', 'other')),
    description TEXT,                             -- รายละเอียด 1-2 บรรทัด
    related_skills TEXT[] DEFAULT '{}',           -- skill slug จาก researcher-tags
    related_kpis TEXT[] DEFAULT '{}',             -- KPI codes จาก excellence-kpi
    related_plans INT[] DEFAULT '{}',             -- แผน 1/2/3
    demand_level TEXT DEFAULT 'medium'
      CHECK (demand_level IN ('high', 'medium', 'low')),
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- =============================================================================
--  INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_activities_project         ON activities(project_id);
CREATE INDEX IF NOT EXISTS idx_activities_status          ON activities(status);
CREATE INDEX IF NOT EXISTS idx_kpi_targets_project        ON kpi_targets(project_id);
CREATE INDEX IF NOT EXISTS idx_kpi_contributions_kpi      ON kpi_contributions(kpi_target_id);
CREATE INDEX IF NOT EXISTS idx_reports_project            ON activity_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_reports_activity           ON activity_reports(activity_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user         ON notifications(target_user);
CREATE INDEX IF NOT EXISTS idx_notifications_unread       ON notifications(is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_budget_tx_project          ON budget_transactions(project_id);
CREATE INDEX IF NOT EXISTS idx_tokens_project             ON project_tokens(project_id);
CREATE INDEX IF NOT EXISTS idx_tokens_code                ON project_tokens(token_code);
CREATE INDEX IF NOT EXISTS idx_reward_log_project         ON reward_log(project_id);
CREATE INDEX IF NOT EXISTS idx_reward_balance_rpf         ON reward_balance(total_rpf DESC);
CREATE INDEX IF NOT EXISTS idx_participants_project       ON participants(project_id);
CREATE INDEX IF NOT EXISTS idx_participants_type          ON participants(participant_type);
CREATE INDEX IF NOT EXISTS idx_participants_name          ON participants(full_name);
CREATE INDEX IF NOT EXISTS idx_kpi_evidence_kpi           ON kpi_evidence(kpi_target_id);
CREATE INDEX IF NOT EXISTS idx_team_members_token         ON team_members(token);
CREATE INDEX IF NOT EXISTS idx_team_members_active        ON team_members(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_rpf_researchers_active     ON rpf_researchers(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_rpf_researchers_expertise  ON rpf_researchers USING GIN (expertise_tags);
CREATE INDEX IF NOT EXISTS idx_rpf_researchers_areas      ON rpf_researchers USING GIN (areas);
CREATE INDEX IF NOT EXISTS idx_rpf_areas_active           ON rpf_research_areas(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_rpf_areas_category         ON rpf_research_areas(category);
CREATE INDEX IF NOT EXISTS idx_rpf_areas_demand           ON rpf_research_areas(demand_level);
CREATE INDEX IF NOT EXISTS idx_rpf_areas_skills           ON rpf_research_areas USING GIN (related_skills);
CREATE INDEX IF NOT EXISTS idx_briefs_status              ON research_briefs(status);
CREATE INDEX IF NOT EXISTS idx_briefs_skills              ON research_briefs USING GIN (required_skills);
CREATE INDEX IF NOT EXISTS idx_briefs_kpis                ON research_briefs USING GIN (target_kpis);
CREATE INDEX IF NOT EXISTS idx_brief_interests_brief      ON brief_interests(brief_id);
CREATE INDEX IF NOT EXISTS idx_brief_interests_researcher ON brief_interests(researcher_id);
-- GIN index สำหรับค้นหา sdg_tags แบบ array-contains
CREATE INDEX IF NOT EXISTS idx_projects_sdg_tags          ON projects USING GIN (sdg_tags);
CREATE INDEX IF NOT EXISTS idx_reports_sdg_tags           ON activity_reports USING GIN (sdg_tags);


-- =============================================================================
--  ROW LEVEL SECURITY
--  Policy model: public read, anon insert/update (no DELETE via anon —
--  การลบต้องใช้ service_role key หรือ SQL Editor)
-- =============================================================================
ALTER TABLE projects            ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities          ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_targets         ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_reports    ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_contributions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_tokens      ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_log          ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_balance      ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants        ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_evidence        ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members        ENABLE ROW LEVEL SECURITY;
ALTER TABLE rpf_researchers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE rpf_research_areas  ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_briefs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE brief_interests     ENABLE ROW LEVEL SECURITY;

-- Public read
DO $$ BEGIN
  CREATE POLICY "public read projects"            ON projects            FOR SELECT USING (true);
  CREATE POLICY "public read activities"          ON activities          FOR SELECT USING (true);
  CREATE POLICY "public read kpi_targets"         ON kpi_targets         FOR SELECT USING (true);
  CREATE POLICY "public read activity_reports"    ON activity_reports    FOR SELECT USING (true);
  CREATE POLICY "public read kpi_contributions"   ON kpi_contributions   FOR SELECT USING (true);
  CREATE POLICY "public read notifications"       ON notifications       FOR SELECT USING (true);
  CREATE POLICY "public read budget_transactions" ON budget_transactions FOR SELECT USING (true);
  CREATE POLICY "public read project_tokens"      ON project_tokens      FOR SELECT USING (true);
  CREATE POLICY "public read reward_log"          ON reward_log          FOR SELECT USING (true);
  CREATE POLICY "public read reward_balance"      ON reward_balance      FOR SELECT USING (true);
  CREATE POLICY "public read participants"        ON participants        FOR SELECT USING (true);
  CREATE POLICY "public read kpi_evidence"        ON kpi_evidence        FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Anon insert
DO $$ BEGIN
  CREATE POLICY "anon insert projects"            ON projects            FOR INSERT WITH CHECK (true);
  CREATE POLICY "anon insert activities"          ON activities          FOR INSERT WITH CHECK (true);
  CREATE POLICY "anon insert kpi_targets"         ON kpi_targets         FOR INSERT WITH CHECK (true);
  CREATE POLICY "anon insert activity_reports"    ON activity_reports    FOR INSERT WITH CHECK (true);
  CREATE POLICY "anon insert kpi_contributions"   ON kpi_contributions   FOR INSERT WITH CHECK (true);
  CREATE POLICY "anon insert notifications"       ON notifications       FOR INSERT WITH CHECK (true);
  CREATE POLICY "anon insert budget_transactions" ON budget_transactions FOR INSERT WITH CHECK (true);
  CREATE POLICY "anon insert project_tokens"      ON project_tokens      FOR INSERT WITH CHECK (true);
  CREATE POLICY "anon insert reward_log"          ON reward_log          FOR INSERT WITH CHECK (true);
  CREATE POLICY "anon insert reward_balance"      ON reward_balance      FOR INSERT WITH CHECK (true);
  CREATE POLICY "anon insert participants"        ON participants        FOR INSERT WITH CHECK (true);
  CREATE POLICY "anon insert kpi_evidence"        ON kpi_evidence        FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Anon update
DO $$ BEGIN
  CREATE POLICY "anon update projects"            ON projects            FOR UPDATE USING (true) WITH CHECK (true);
  CREATE POLICY "anon update activities"          ON activities          FOR UPDATE USING (true) WITH CHECK (true);
  CREATE POLICY "anon update kpi_targets"         ON kpi_targets         FOR UPDATE USING (true) WITH CHECK (true);
  CREATE POLICY "anon update activity_reports"    ON activity_reports    FOR UPDATE USING (true) WITH CHECK (true);
  CREATE POLICY "anon update notifications"       ON notifications       FOR UPDATE USING (true) WITH CHECK (true);
  CREATE POLICY "anon update project_tokens"      ON project_tokens      FOR UPDATE USING (true) WITH CHECK (true);
  CREATE POLICY "anon update reward_log"          ON reward_log          FOR UPDATE USING (true) WITH CHECK (true);
  CREATE POLICY "anon update reward_balance"      ON reward_balance      FOR UPDATE USING (true) WITH CHECK (true);
  CREATE POLICY "anon update participants"        ON participants        FOR UPDATE USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Anon delete (สำหรับ /admin/projects · ลบโครงการ + cascade)
-- Production: ใช้ admin auth gate ใน API route + service_role key สำหรับงานที่ละเอียดอ่อน
--
-- หมายเหตุ: ต้องแยก DO $$ block ให้แต่ละ policy เป็นของตัวเอง
-- เพราะ EXCEPTION WHEN duplicate_object จะทำให้ block ออกทันทีตัวแรกที่ throw
-- → ตัวที่เหลือใน block เดียวกันจะไม่ถูกสร้าง (ปัญหาเก่าก่อนหน้านี้)
DO $$ BEGIN CREATE POLICY "anon delete projects"         ON projects         FOR DELETE USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "anon delete activities"       ON activities       FOR DELETE USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "anon delete kpi_targets"      ON kpi_targets      FOR DELETE USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "anon delete activity_reports" ON activity_reports FOR DELETE USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "anon delete project_tokens"   ON project_tokens   FOR DELETE USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "anon delete participants"     ON participants     FOR DELETE USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ===========================================================================
-- TEAM_MEMBERS policies — ระวัง! pin_hash sensitive
-- ===========================================================================
-- read: anon select ได้ (รวม pin_hash) เพราะ /api ใช้ anon key verify pin
-- ใน production จริง ควรใช้ service_role key + RPC แทน
DO $$ BEGIN CREATE POLICY "anon select team_members"     ON team_members     FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "anon insert team_members"     ON team_members     FOR INSERT WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "anon update team_members"     ON team_members     FOR UPDATE USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "anon delete team_members"     ON team_members     FOR DELETE USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ===========================================================================
-- RPF_RESEARCHERS + RPF_RESEARCH_AREAS policies — public read · admin gate ฝั่ง API
-- ===========================================================================
DO $$ BEGIN CREATE POLICY "anon select rpf_researchers"  ON rpf_researchers  FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "anon insert rpf_researchers"  ON rpf_researchers  FOR INSERT WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "anon update rpf_researchers"  ON rpf_researchers  FOR UPDATE USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "anon delete rpf_researchers"  ON rpf_researchers  FOR DELETE USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "anon select rpf_areas"        ON rpf_research_areas FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "anon insert rpf_areas"        ON rpf_research_areas FOR INSERT WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "anon update rpf_areas"        ON rpf_research_areas FOR UPDATE USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "anon delete rpf_areas"        ON rpf_research_areas FOR DELETE USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ===========================================================================
-- RESEARCH_BRIEFS + BRIEF_INTERESTS policies — public read · admin/team-gate ฝั่ง API
-- ===========================================================================
DO $$ BEGIN CREATE POLICY "anon select research_briefs"  ON research_briefs  FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "anon insert research_briefs"  ON research_briefs  FOR INSERT WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "anon update research_briefs"  ON research_briefs  FOR UPDATE USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "anon delete research_briefs"  ON research_briefs  FOR DELETE USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "anon select brief_interests"  ON brief_interests  FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "anon insert brief_interests"  ON brief_interests  FOR INSERT WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "anon update brief_interests"  ON brief_interests  FOR UPDATE USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "anon delete brief_interests"  ON brief_interests  FOR DELETE USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- =============================================================================
--  เสร็จสิ้น
--  ขั้นถัดไป:
--   1) Seed projects / activities / kpi_targets — ผ่าน /api/supabase/sync-excel
--      หรือ node supabase/seed-data.js
--   2) Seed tokens — node supabase/seed-tokens.js  (หรือ /api/admin → Generate tokens)
--   3) ถ้ามีโครงการ seed เก่าซ้ำ ERP → รัน supabase/cleanup-duplicate-erp.sql
-- =============================================================================
