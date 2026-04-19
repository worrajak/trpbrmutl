-- ลบโครงการ seed เก่าที่ใช้ ERP code ซ้ำกับ kok-nong-na (โครงการโคกหนองนาโมเดล)
-- ERP 16911115000084010001 = "โครงการพัฒนาพื้นที่เรียนรู้ศาสตร์พระราชา" ตาม Excel ปี 2569
--
-- Projects ที่ลบ:
--   - nan-68-274      → ปรับอากาศและห้องเย็น (น่าน)    (งบ 200,000, เบิก 0, ไม่มี reports)
--   - chiangrai-68-273 → ปรับอากาศและห้องเย็น (เชียงราย) (งบ 200,000, เบิก 0, ไม่มี reports)
--
-- Projects ที่เก็บไว้:
--   - kok-nong-na → โครงการโคกหนองนาโมเดล (งบ 400,000, เบิก 211,850)

-- Run in: Supabase Dashboard → SQL Editor → paste → Run

BEGIN;

-- Preview ก่อน (optional) — รันแค่นี้ก่อนเพื่อดูว่าจะลบอะไร
SELECT id, project_name, budget_total, budget_used
FROM projects
WHERE id IN ('nan-68-274', 'chiangrai-68-273');

-- ลบโครงการ (CASCADE จะลบ activities, tokens, kpis, reports ที่เชื่อมโยงอัตโนมัติ)
DELETE FROM projects
WHERE id IN ('nan-68-274', 'chiangrai-68-273');

-- Verify ERP code นี้เหลือแค่ kok-nong-na
SELECT id, project_name, budget_total, budget_used
FROM projects
WHERE erp_code = '16911115000084010001';

COMMIT;
