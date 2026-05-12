-- =============================================================================
--  rpf_research_areas: เพิ่ม usage_count + auto_imported สำหรับ auto-sync จาก brief
-- =============================================================================
--  Workflow:
--   1. AI gen brief → save brief
--   2. Helper sync skills → upsert rpf_research_areas
--      - ถ้ามีชื่อซ้ำ (case-insensitive) → bump usage_count
--      - ถ้าไม่มี → insert (auto_imported=true, category='expertise')
--   3. demand_level คำนวณจาก usage_count: 1=low · 2-3=medium · 4+=high
-- =============================================================================

ALTER TABLE rpf_research_areas
  ADD COLUMN IF NOT EXISTS usage_count INT DEFAULT 0;

ALTER TABLE rpf_research_areas
  ADD COLUMN IF NOT EXISTS auto_imported BOOLEAN DEFAULT FALSE;

ALTER TABLE rpf_research_areas
  ADD COLUMN IF NOT EXISTS first_brief_id UUID;  -- brief แรกที่ทำให้เกิด area นี้

-- Index สำหรับ lookup ชื่อ (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_rpf_areas_name_lower
  ON rpf_research_areas (LOWER(name));

CREATE INDEX IF NOT EXISTS idx_rpf_areas_usage
  ON rpf_research_areas (usage_count DESC);

CREATE INDEX IF NOT EXISTS idx_rpf_areas_auto
  ON rpf_research_areas (auto_imported) WHERE auto_imported = TRUE;

-- Backfill usage_count สำหรับ existing rows ที่อาจมี skill ใน briefs อยู่แล้ว
-- (รัน 1 ครั้ง — แต่ helper จะ recompute ทุกครั้งที่ sync ใหม่)
UPDATE rpf_research_areas a
SET usage_count = (
  SELECT COUNT(*)
  FROM research_briefs b
  WHERE EXISTS (
    SELECT 1
    FROM unnest(b.required_skills) AS s
    WHERE LOWER(s) = LOWER(a.name)
  )
);

-- Recompute demand_level จาก usage_count (1=low, 2-3=medium, 4+=high)
UPDATE rpf_research_areas
SET demand_level = CASE
  WHEN usage_count >= 4 THEN 'high'
  WHEN usage_count >= 2 THEN 'medium'
  WHEN usage_count >= 1 THEN 'low'
  ELSE demand_level  -- คงค่าเดิมถ้ายังไม่มี brief อ้างอิง (manual area)
END
WHERE usage_count > 0;
