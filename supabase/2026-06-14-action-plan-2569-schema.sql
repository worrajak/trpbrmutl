-- ============================================================
-- Migration: Action plan 2569 — Schema extensions
-- Date: 2026-06-14
-- Purpose: รองรับข้อมูลจาก Google Drive "Action plan 2569" + 61 โครงการ
-- Sources:
--   - https://docs.google.com/spreadsheets/d/1fIFQEAOup6CC-UG2_X3uXIjG0Aw26-7ueI0jA-wz8eA (Action plan master)
--   - https://docs.google.com/spreadsheets/d/1ANqPX8Ph3paP8-p3j6a4q5bEvK_Hec0DD4LPCL-H5No (KPI catalog)
--   - drive-download-20260612-โครงการใต้ร่มจำนวน 61 โครงการ (local folder)
--
-- Rules followed (per CLAUDE.md):
--   - Extend ไม่ทุบของเดิม (ALTER TABLE ADD COLUMN IF NOT EXISTS)
--   - Prefix rpf_ สำหรับ master tables ใหม่
--   - ไม่ใช้คำว่า "ใต้ร่มพระบารมี" ใน table/column
--   - RLS เปิด, policy anon ทำทุก op
-- ============================================================


-- ============================================================
-- 1. rpf_initiatives — 3 แผนงาน (initiative)
-- ============================================================
CREATE TABLE IF NOT EXISTS rpf_initiatives (
  id           TEXT PRIMARY KEY,                -- 'thrust','workforce','knowledge'
  number       INT NOT NULL UNIQUE,             -- 1, 2, 3
  name_th      TEXT NOT NULL,                   -- 'ผลักดันเทคโนโลยี'
  name_full    TEXT,                            -- ชื่อเต็มตาม TOR (รอ user fill)
  description  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE rpf_initiatives ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon all on rpf_initiatives" ON rpf_initiatives;
CREATE POLICY "anon all on rpf_initiatives" ON rpf_initiatives FOR ALL TO anon USING (TRUE) WITH CHECK (TRUE);


-- ============================================================
-- 2. rpf_faculties — หน่วยงานเจ้าของโครงการ (~10 หน่วย)
-- ============================================================
CREATE TABLE IF NOT EXISTS rpf_faculties (
  id          TEXT PRIMARY KEY,                 -- 'eng','arch','barts','vit','cttc','agri-research'
                                                -- 'group-internal','rmutl-cmu','rmutl-cri','rmutl-nan','rmutl-tak','rmutl-psl'
  name_th     TEXT NOT NULL,
  name_short  TEXT,                             -- 'eng','arch','สถช.'
  type        TEXT NOT NULL DEFAULT 'faculty'
    CHECK (type IN ('faculty','institute','college','group','campus')),
  campus      TEXT,                             -- 'เชียงใหม่','เชียงราย','น่าน','ตาก','พิษณุโลก'
  parent_id   TEXT REFERENCES rpf_faculties(id),-- nullable, สำหรับ sub-unit
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE rpf_faculties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon all on rpf_faculties" ON rpf_faculties;
CREATE POLICY "anon all on rpf_faculties" ON rpf_faculties FOR ALL TO anon USING (TRUE) WITH CHECK (TRUE);


-- ============================================================
-- 3. rpf_kpi_catalog — มทร. KPI master (6 ตัว)
-- ============================================================
CREATE TABLE IF NOT EXISTS rpf_kpi_catalog (
  code         TEXT PRIMARY KEY,                -- 'KPI-10','KPI-17','KPI-35','KPI-38','KPI-39','KPI-40'
  name_th      TEXT NOT NULL,
  description  TEXT,                            -- รายละเอียดเต็มจาก spreadsheet
  target_count INT,                             -- 50, 60, 400, 100, 60, 100
  target_unit  TEXT,                            -- 'เครือข่าย','ผลงาน','คน','สถานประกอบการ','องค์ความรู้'
  scope        TEXT NOT NULL DEFAULT 'rmutl'
    CHECK (scope IN ('rmutl','underroof')),    -- KPI-39 = underroof, อื่นๆ = rmutl
  fiscal_year  INT DEFAULT 2569,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE rpf_kpi_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon all on rpf_kpi_catalog" ON rpf_kpi_catalog;
CREATE POLICY "anon all on rpf_kpi_catalog" ON rpf_kpi_catalog FOR ALL TO anon USING (TRUE) WITH CHECK (TRUE);


-- ============================================================
-- 4. EXTEND projects — initiative_id, faculty_id, responsible_external,
--                      tor_file_path, approval_status (JSONB)
-- ============================================================
ALTER TABLE projects ADD COLUMN IF NOT EXISTS initiative_id        TEXT REFERENCES rpf_initiatives(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS faculty_id           TEXT REFERENCES rpf_faculties(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS responsible_external TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tor_file_path        TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tor_drive_file_id    TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS approval_status      JSONB DEFAULT '{}'::jsonb;
-- approval_status schema:
--   { "approved": bool, "in_review": bool, "editing": bool, "cancelled": bool }
-- ตัวอย่าง query: WHERE approval_status->>'approved' = 'true'

-- Index for faster lookup
CREATE INDEX IF NOT EXISTS projects_initiative_id_idx ON projects(initiative_id);
CREATE INDEX IF NOT EXISTS projects_faculty_id_idx    ON projects(faculty_id);
CREATE INDEX IF NOT EXISTS projects_approval_status_idx ON projects USING GIN (approval_status);


-- ============================================================
-- 5. EXTEND activities — parent_id (hierarchy), notes
-- ============================================================
ALTER TABLE activities ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES activities(id) ON DELETE CASCADE;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS notes     TEXT;
-- parent_id: null = top-level activity (1., 2., 3.)
-- parent_id: not null = sub-activity (4.1, 4.2 ใต้ activity 4.)
-- notes: คอลัมน์ "หมายเหตุ" จาก Action plan (status update text)

CREATE INDEX IF NOT EXISTS activities_parent_id_idx ON activities(parent_id);


-- ============================================================
-- 6. activity_monthly — planned vs actual ราย เดือน (ใหม่)
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_monthly (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id     UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  fiscal_month    DATE NOT NULL,                 -- '2026-03-01' = มี.ค. 2569
  planned_amount  DECIMAL(12,2) DEFAULT 0,
  actual_amount   DECIMAL(12,2) DEFAULT 0,
  note            TEXT,                          -- เช่น 'อัปเดต 2 พ.ค 69'
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(activity_id, fiscal_month)
);

CREATE INDEX IF NOT EXISTS activity_monthly_activity_id_idx ON activity_monthly(activity_id);
CREATE INDEX IF NOT EXISTS activity_monthly_fiscal_month_idx ON activity_monthly(fiscal_month);

ALTER TABLE activity_monthly ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon all on activity_monthly" ON activity_monthly;
CREATE POLICY "anon all on activity_monthly" ON activity_monthly FOR ALL TO anon USING (TRUE) WITH CHECK (TRUE);


-- ============================================================
-- 7. EXTEND kpi_targets — kpi_code (link to catalog)
-- ============================================================
ALTER TABLE kpi_targets ADD COLUMN IF NOT EXISTS kpi_code TEXT REFERENCES rpf_kpi_catalog(code);
-- kpi_code = null → custom KPI ตามที่ user เพิ่ม
-- kpi_code = 'KPI-10/17/35/38/39/40' → link กับ catalog

CREATE INDEX IF NOT EXISTS kpi_targets_kpi_code_idx ON kpi_targets(kpi_code);


-- ============================================================
-- DONE — โครงสร้างใหม่:
-- ✅ rpf_initiatives        (3 rows after seed)
-- ✅ rpf_faculties          (~12 rows after seed)
-- ✅ rpf_kpi_catalog        (6 rows after seed)
-- ✅ projects +5 cols       (initiative_id, faculty_id, responsible_external, tor_file_path, approval_status)
-- ✅ activities +2 cols     (parent_id, notes)
-- ✅ activity_monthly       (ใหม่)
-- ✅ kpi_targets +1 col     (kpi_code)
--
-- Next: รัน 2026-06-14-action-plan-2569-seed.sql เพื่อ seed master data
-- ============================================================
