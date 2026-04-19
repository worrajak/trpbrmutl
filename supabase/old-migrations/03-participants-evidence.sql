-- ==========================================
-- Participants + KPI Evidence System
-- ==========================================

-- 1. ตารางผู้เข้าร่วมกิจกรรม (บุคลากร/อาจารย์/นศ./ชาวบ้าน)
CREATE TABLE IF NOT EXISTS participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    report_id UUID REFERENCES activity_reports(id),
    full_name TEXT NOT NULL,
    participant_type TEXT CHECK (participant_type IN ('staff','lecturer','student','villager','other')),
    student_id TEXT,
    organization TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ตารางหลักฐาน KPI (ไฟล์/รูป/ลิงก์ ต่อ KPI แต่ละตัว)
CREATE TABLE IF NOT EXISTS kpi_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kpi_target_id UUID REFERENCES kpi_targets(id) ON DELETE CASCADE,
    report_id UUID REFERENCES activity_reports(id),
    evidence_type TEXT CHECK (evidence_type IN ('image','document','link','certificate','patent','other')),
    evidence_url TEXT NOT NULL,
    description TEXT,
    uploaded_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_participants_project ON participants(project_id);
CREATE INDEX IF NOT EXISTS idx_participants_type ON participants(participant_type);
CREATE INDEX IF NOT EXISTS idx_participants_name ON participants(full_name);
CREATE INDEX IF NOT EXISTS idx_kpi_evidence_kpi ON kpi_evidence(kpi_target_id);

-- RLS
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read participants" ON participants FOR SELECT USING (true);
CREATE POLICY "Allow public read kpi_evidence" ON kpi_evidence FOR SELECT USING (true);
CREATE POLICY "Allow anon insert participants" ON participants FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon insert kpi_evidence" ON kpi_evidence FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update participants" ON participants FOR UPDATE USING (true) WITH CHECK (true);
