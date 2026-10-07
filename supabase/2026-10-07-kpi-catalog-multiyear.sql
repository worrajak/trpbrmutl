-- ============================================================================
-- รองรับตัวชี้วัดหลายปีงบประมาณ
-- สร้าง 7 ตุลาคม 2569 · รันใน Supabase SQL Editor
-- ============================================================================
--
-- ปัญหา
--   rpf_kpi_catalog ใช้ code เป็น PRIMARY KEY ทำให้เก็บ "KPI-39" ได้ปีเดียว
--   พอจะเพิ่มชุดปี 2570 (เป้าเท่าเดิมแต่เป็นคนละรอบประเมิน) จึงชนคีย์
--   และ kpi_targets ไม่มีคอลัมน์ปีงบ ทำให้แยกไม่ออกว่าค่าที่โครงการรับมาเป็นของปีไหน
--
-- สิ่งที่ทำ
--   1. เพิ่ม fiscal_year ใน kpi_targets แล้ว backfill จากปีงบของโครงการที่สังกัด
--   2. เปลี่ยน PRIMARY KEY ของ rpf_kpi_catalog เป็น (code, fiscal_year)
--   3. สร้าง FOREIGN KEY ใหม่เป็นคู่ (kpi_code, fiscal_year)
--
-- ปลอดภัยกับข้อมูลเดิม: ทุกแถวที่มีอยู่เป็นปี 2569 อยู่แล้ว ค่า default จึงตรง
-- รันซ้ำได้ (idempotent)
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. kpi_targets: เพิ่มปีงบ แล้ว backfill จากโครงการ
-- ---------------------------------------------------------------------------
ALTER TABLE kpi_targets ADD COLUMN IF NOT EXISTS fiscal_year INT;

UPDATE kpi_targets t
   SET fiscal_year = p.fiscal_year
  FROM projects p
 WHERE t.project_id = p.id
   AND t.fiscal_year IS DISTINCT FROM p.fiscal_year;

-- แถวที่ไม่มีโครงการผูกอยู่ (ถ้ามี) ให้เป็นปีตั้งต้น
UPDATE kpi_targets SET fiscal_year = 2569 WHERE fiscal_year IS NULL;

ALTER TABLE kpi_targets ALTER COLUMN fiscal_year SET DEFAULT 2569;
ALTER TABLE kpi_targets ALTER COLUMN fiscal_year SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_kpi_targets_fy ON kpi_targets(fiscal_year);

-- ---------------------------------------------------------------------------
-- 2. rpf_kpi_catalog: PRIMARY KEY -> (code, fiscal_year)
-- ---------------------------------------------------------------------------
-- ต้องถอด FK ที่อ้าง code เดี่ยวก่อน ไม่งั้นถอด PK ไม่ได้
ALTER TABLE kpi_targets DROP CONSTRAINT IF EXISTS kpi_targets_kpi_code_fkey;

ALTER TABLE rpf_kpi_catalog ALTER COLUMN fiscal_year SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'rpf_kpi_catalog'::regclass
       AND contype = 'p'
       AND array_length(conkey, 1) = 1
  ) THEN
    ALTER TABLE rpf_kpi_catalog DROP CONSTRAINT rpf_kpi_catalog_pkey;
    ALTER TABLE rpf_kpi_catalog ADD PRIMARY KEY (code, fiscal_year);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. FK ใหม่: (kpi_code, fiscal_year) -> (code, fiscal_year)
-- ---------------------------------------------------------------------------
-- ใช้ MATCH SIMPLE: ถ้า kpi_code เป็น NULL (ยังไม่ map เข้า catalog) จะไม่ถูกบังคับ
ALTER TABLE kpi_targets
  ADD CONSTRAINT kpi_targets_kpi_code_fy_fkey
  FOREIGN KEY (kpi_code, fiscal_year)
  REFERENCES rpf_kpi_catalog(code, fiscal_year)
  ON UPDATE CASCADE;

COMMIT;

-- ============================================================================
-- ตรวจหลังรัน — ควรได้ fiscal_year ครบทุกแถว และ PK เป็นสองคอลัมน์
-- ============================================================================
-- SELECT fiscal_year, COUNT(*) FROM kpi_targets GROUP BY 1 ORDER BY 1;
-- SELECT fiscal_year, COUNT(*) FROM rpf_kpi_catalog GROUP BY 1 ORDER BY 1;
-- SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
--  WHERE conrelid = 'rpf_kpi_catalog'::regclass AND contype = 'p';
