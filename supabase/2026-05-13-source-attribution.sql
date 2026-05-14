-- =============================================================================
--  Source Attribution Chain + Reporter Trust
--  แนวคิด: ทุกข้อความต้องตอบได้ "ใครรายงาน · ผ่านใคร · ต้นทาง · เกรดน่าเชื่อ"
-- =============================================================================

-- 1) research_briefs — เพิ่ม source_chain JSONB + verification_status + min_credibility
ALTER TABLE research_briefs
  ADD COLUMN IF NOT EXISTS source_chain JSONB DEFAULT '[]'::jsonb;

ALTER TABLE research_briefs
  ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending';

DO $$ BEGIN
  ALTER TABLE research_briefs
    ADD CONSTRAINT chk_briefs_verification
    CHECK (verification_status IN ('pending', 'verified', 'flagged'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE research_briefs
  ADD COLUMN IF NOT EXISTS min_credibility INT;

CREATE INDEX IF NOT EXISTS idx_briefs_verification
  ON research_briefs(verification_status);

CREATE INDEX IF NOT EXISTS idx_briefs_min_credibility
  ON research_briefs(min_credibility);


-- 2) reporter_trust — ความน่าเชื่อสะสมของผู้รายงาน (placeholder · ยังไม่ wire เข้า workflow)
CREATE TABLE IF NOT EXISTS reporter_trust (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_name TEXT NOT NULL,
    reporter_role TEXT,
    linked_researcher_id UUID,
    linked_team_member_id UUID,
    trust_score NUMERIC(3,1) DEFAULT 5.0
      CHECK (trust_score >= 0 AND trust_score <= 10),
    reports_total INT DEFAULT 0,
    reports_verified INT DEFAULT 0,
    reports_flagged INT DEFAULT 0,
    notes TEXT,
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_reporter_trust_name_lower
  ON reporter_trust (LOWER(reporter_name));
CREATE INDEX IF NOT EXISTS idx_reporter_trust_score
  ON reporter_trust(trust_score DESC);
CREATE INDEX IF NOT EXISTS idx_reporter_trust_role
  ON reporter_trust(reporter_role);

ALTER TABLE reporter_trust ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "anon select reporter_trust" ON reporter_trust FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "anon insert reporter_trust" ON reporter_trust FOR INSERT WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "anon update reporter_trust" ON reporter_trust FOR UPDATE USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "anon delete reporter_trust" ON reporter_trust FOR DELETE USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
