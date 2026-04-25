-- =====================================================================
-- Sync งบประมาณ ใต้ร่มพระบารมี ปี 2569 (auto-generated, ไม่ใช้ AI)
-- Source: MarketPredict/20_4_2569_งบประมาณกลุ่มแผนงานใต้ร่มพระบารมี ปีงบประมาณ2569.xlsx
-- Generated: 2026-04-25T14:49:51.965Z
-- Projects: 55 โครงการ (leaf · ข้าม parent 3 แถว)
--
-- UPSERT logic:
--   - INSERT ใหม่: เติม project_name + responsible + main_program ครบ
--   - UPDATE เดิม: ทับ budget_total/used · คำนวณ remaining = total − max(used, budget_reported)
--                 · responsible/project_name เติมเฉพาะถ้า DB ว่าง (ไม่ทับชื่อที่ admin แก้)
-- =====================================================================

BEGIN;

-- 1.โครงการการวิจัย Plant profile ของผักในโรงเรือนอัจฉริยะ
INSERT INTO projects (
  id, erp_code, project_name, responsible, main_program, organization,
  budget_total, budget_used, budget_remaining, fiscal_year
) VALUES (
  '16911115000083010001', '16911115000083010001', '1.โครงการการวิจัย Plant profile ของผักในโรงเรือนอัจฉริยะ', 'นายวัชระ กิตติวรเชฏฐ์',
  'ใต้ร่มพระบารมี', '',
  200000, 43887, 153613, 2569
)
ON CONFLICT (id) DO UPDATE SET
  budget_total     = EXCLUDED.budget_total,
  budget_used      = EXCLUDED.budget_used,
  budget_remaining = GREATEST(0, EXCLUDED.budget_total - GREATEST(EXCLUDED.budget_used, COALESCE(projects.budget_reported, 0))),
  responsible      = COALESCE(NULLIF(TRIM(projects.responsible), ''), EXCLUDED.responsible),
  project_name     = COALESCE(NULLIF(TRIM(projects.project_name), ''), EXCLUDED.project_name),
  updated_at       = NOW();

-- 2.โครงการการวิจัยพัฒนาวิธีการจัดการกระบวนการผลิตผักเพื่อคุณภ…
INSERT INTO projects (
  id, erp_code, project_name, responsible, main_program, organization,
  budget_total, budget_used, budget_remaining, fiscal_year
) VALUES (
  '16911115000083010002', '16911115000083010002', '2.โครงการการวิจัยพัฒนาวิธีการจัดการกระบวนการผลิตผักเพื่อคุณภาพ', 'นายวัชระ กิตติวรเชฏฐ์',
  'ใต้ร่มพระบารมี', '',
  150000, 31492, 118508, 2569
)
ON CONFLICT (id) DO UPDATE SET
  budget_total     = EXCLUDED.budget_total,
  budget_used      = EXCLUDED.budget_used,
  budget_remaining = GREATEST(0, EXCLUDED.budget_total - GREATEST(EXCLUDED.budget_used, COALESCE(projects.budget_reported, 0))),
  responsible      = COALESCE(NULLIF(TRIM(projects.responsible), ''), EXCLUDED.responsible),
  project_name     = COALESCE(NULLIF(TRIM(projects.project_name), ''), EXCLUDED.project_name),
  updated_at       = NOW();

-- 3.โครงการพัฒนากระบวนการสกัดน้ำมันอะโวคาโดของศูนย์พัฒนาโครงกา…
INSERT INTO projects (
  id, erp_code, project_name, responsible, main_program, organization,
  budget_total, budget_used, budget_remaining, fiscal_year
) VALUES (
  '16911115000083010003', '16911115000083010003', '3.โครงการพัฒนากระบวนการสกัดน้ำมันอะโวคาโดของศูนย์พัฒนาโครงการหลวงห้วยเสี้ยวด้วยเทคโนโลยีการสกัดแบบไฮดรอลิก', 'นางสาวพิมลพรรณ เลิศบัวบาน',
  'ใต้ร่มพระบารมี', '',
  148500, 0, 118498, 2569
)
ON CONFLICT (id) DO UPDATE SET
  budget_total     = EXCLUDED.budget_total,
  budget_used      = EXCLUDED.budget_used,
  budget_remaining = GREATEST(0, EXCLUDED.budget_total - GREATEST(EXCLUDED.budget_used, COALESCE(projects.budget_reported, 0))),
  responsible      = COALESCE(NULLIF(TRIM(projects.responsible), ''), EXCLUDED.responsible),
  project_name     = COALESCE(NULLIF(TRIM(projects.project_name), ''), EXCLUDED.project_name),
  updated_at       = NOW();

-- 1.โครงการการพัฒนาตู้อบลมร้อนดอกเก๊กฮวยระบบปั๊มความร้อน เพื่อ…
INSERT INTO projects (
  id, erp_code, project_name, responsible, main_program, organization,
  budget_total, budget_used, budget_remaining, fiscal_year
) VALUES (
  '16911230000083010001', '16911230000083010001', '1.โครงการการพัฒนาตู้อบลมร้อนดอกเก๊กฮวยระบบปั๊มความร้อน เพื่อเพิ่มคุณภาพผลผลิตดอกเก๊กฮวยแห้ง ในพื้นที่สถานีเกษตรหลวงปางดะ', 'ผู้ช่วยศาสตราจารย์ไกรลาศ ดอนชัย',
  'ใต้ร่มพระบารมี', '',
  175000, 87500, 87500, 2569
)
ON CONFLICT (id) DO UPDATE SET
  budget_total     = EXCLUDED.budget_total,
  budget_used      = EXCLUDED.budget_used,
  budget_remaining = GREATEST(0, EXCLUDED.budget_total - GREATEST(EXCLUDED.budget_used, COALESCE(projects.budget_reported, 0))),
  responsible      = COALESCE(NULLIF(TRIM(projects.responsible), ''), EXCLUDED.responsible),
  project_name     = COALESCE(NULLIF(TRIM(projects.project_name), ''), EXCLUDED.project_name),
  updated_at       = NOW();

-- 2.โครงการพัฒนาเทคโนโลยีเครื่องล้างเมล็ดงาดำแบบกึ่งอัตโนมัติ …
INSERT INTO projects (
  id, erp_code, project_name, responsible, main_program, organization,
  budget_total, budget_used, budget_remaining, fiscal_year
) VALUES (
  '16911230000083010003', '16911230000083010003', '2.โครงการพัฒนาเทคโนโลยีเครื่องล้างเมล็ดงาดำแบบกึ่งอัตโนมัติ สำหรับศูนย์พัฒนาโครงการหลวงห้วยเสี้ยว ตำบลบ้านปง อำเภอหางดง จังหวัดเชียงใหม่', 'ผู้ช่วยศาสตราจารย์ขัติพงษ์ จิโนสุวัตร์',
  'ใต้ร่มพระบารมี', '',
  150000, 0, 8704, 2569
)
ON CONFLICT (id) DO UPDATE SET
  budget_total     = EXCLUDED.budget_total,
  budget_used      = EXCLUDED.budget_used,
  budget_remaining = GREATEST(0, EXCLUDED.budget_total - GREATEST(EXCLUDED.budget_used, COALESCE(projects.budget_reported, 0))),
  responsible      = COALESCE(NULLIF(TRIM(projects.responsible), ''), EXCLUDED.responsible),
  project_name     = COALESCE(NULLIF(TRIM(projects.project_name), ''), EXCLUDED.project_name),
  updated_at       = NOW();

-- 3.โครงการพัฒนาเทคโนโลยีต้นแบบเครื่องนวดงาขี้ม่อน(งาหอม) เพื่…
INSERT INTO projects (
  id, erp_code, project_name, responsible, main_program, organization,
  budget_total, budget_used, budget_remaining, fiscal_year
) VALUES (
  '16911230000083010004', '16911230000083010004', '3.โครงการพัฒนาเทคโนโลยีต้นแบบเครื่องนวดงาขี้ม่อน(งาหอม) เพื่อเพิ่มประสิทธิภาพการจัดเก็บเกี่ยวผลผลิตงาหอม  ศูนย์พัฒนาโครงการหลวงห้วยน้ำริน ตำบลแม่เจดีย์ใหม่ อำเภอเวียงป่าเป้า จังหวัดเชียงราย', 'ผู้ช่วยศาสตราจารย์วรเชษฐ์ หวานเสียง',
  'ใต้ร่มพระบารมี', '',
  175000, 0, 97108, 2569
)
ON CONFLICT (id) DO UPDATE SET
  budget_total     = EXCLUDED.budget_total,
  budget_used      = EXCLUDED.budget_used,
  budget_remaining = GREATEST(0, EXCLUDED.budget_total - GREATEST(EXCLUDED.budget_used, COALESCE(projects.budget_reported, 0))),
  responsible      = COALESCE(NULLIF(TRIM(projects.responsible), ''), EXCLUDED.responsible),
  project_name     = COALESCE(NULLIF(TRIM(projects.project_name), ''), EXCLUDED.project_name),
  updated_at       = NOW();

-- 4.โครงการประเมินสมบัติเชิงกลของเส้นใยกัญชงจากการอบแห้งด้วยเท…
INSERT INTO projects (
  id, erp_code, project_name, responsible, main_program, organization,
  budget_total, budget_used, budget_remaining, fiscal_year
) VALUES (
  '16911230000083010005', '16911230000083010005', '4.โครงการประเมินสมบัติเชิงกลของเส้นใยกัญชงจากการอบแห้งด้วยเทคโนโลยีอบลมร้อนเพื่อยกระดับมาตรฐานวัตถุดิบในพื้นที่ศูนย์พัฒนาโครงการหลวงห้วยน้ำริน ตำบลแม่เจดีย์ใหม่ อำเภอเวียงป่าเป้า จังหวัดเชียงราย', 'นายธีระยุทธ ขอดแก้ว',
  'ใต้ร่มพระบารมี', '',
  50000, 0, 25000, 2569
)
ON CONFLICT (id) DO UPDATE SET
  budget_total     = EXCLUDED.budget_total,
  budget_used      = EXCLUDED.budget_used,
  budget_remaining = GREATEST(0, EXCLUDED.budget_total - GREATEST(EXCLUDED.budget_used, COALESCE(projects.budget_reported, 0))),
  responsible      = COALESCE(NULLIF(TRIM(projects.responsible), ''), EXCLUDED.responsible),
  project_name     = COALESCE(NULLIF(TRIM(projects.project_name), ''), EXCLUDED.project_name),
  updated_at       = NOW();

-- 5.โครงการศึกษาความเหมาะสมของการนำเศษผักเหลือใช้มาผลิตเป็นถ่า…
INSERT INTO projects (
  id, erp_code, project_name, responsible, main_program, organization,
  budget_total, budget_used, budget_remaining, fiscal_year
) VALUES (
  '16911230000083010006', '16911230000083010006', '5.โครงการศึกษาความเหมาะสมของการนำเศษผักเหลือใช้มาผลิตเป็นถ่านอัดแท่งขนาดเล็ก', 'นายเมธัส ภัททิยธนี',
  'ใต้ร่มพระบารมี', '',
  100000, 0, 50000, 2569
)
ON CONFLICT (id) DO UPDATE SET
  budget_total     = EXCLUDED.budget_total,
  budget_used      = EXCLUDED.budget_used,
  budget_remaining = GREATEST(0, EXCLUDED.budget_total - GREATEST(EXCLUDED.budget_used, COALESCE(projects.budget_reported, 0))),
  responsible      = COALESCE(NULLIF(TRIM(projects.responsible), ''), EXCLUDED.responsible),
  project_name     = COALESCE(NULLIF(TRIM(projects.project_name), ''), EXCLUDED.project_name),
  updated_at       = NOW();

-- โครงการ Royal Rose Sensation Giftset ชุดผลิตภัณฑ์ต่อยอดคุณค่…
INSERT INTO projects (
  id, erp_code, project_name, responsible, main_program, organization,
  budget_total, budget_used, budget_remaining, fiscal_year
) VALUES (
  '16911250000083010001', '16911250000083010001', 'โครงการ Royal Rose Sensation Giftset ชุดผลิตภัณฑ์ต่อยอดคุณค่ากุหลาบจากสวนกุหลาบหลวงทุ่งเริง', 'นางสาวณัฐธินี สาลี',
  'ใต้ร่มพระบารมี', '',
  200000, 122509, 77491, 2569
)
ON CONFLICT (id) DO UPDATE SET
  budget_total     = EXCLUDED.budget_total,
  budget_used      = EXCLUDED.budget_used,
  budget_remaining = GREATEST(0, EXCLUDED.budget_total - GREATEST(EXCLUDED.budget_used, COALESCE(projects.budget_reported, 0))),
  responsible      = COALESCE(NULLIF(TRIM(projects.responsible), ''), EXCLUDED.responsible),
  project_name     = COALESCE(NULLIF(TRIM(projects.project_name), ''), EXCLUDED.project_name),
  updated_at       = NOW();

-- โครงการพัฒนากระบวนการผลิตและเครื่องมือการอบแห้งเคพกูสเบอร์รี…
INSERT INTO projects (
  id, erp_code, project_name, responsible, main_program, organization,
  budget_total, budget_used, budget_remaining, fiscal_year
) VALUES (
  '16911600000083010002', '16911600000083010002', 'โครงการพัฒนากระบวนการผลิตและเครื่องมือการอบแห้งเคพกูสเบอร์รี เพื่อเพิ่มขีดความสามารถในการแข่งขันของสินค้าเกษตรบนพื้นที่สูง', 'นายวธัญญู วรรณพรหม',
  'ใต้ร่มพระบารมี', '',
  100000, 0, 100000, 2569
)
ON CONFLICT (id) DO UPDATE SET
  budget_total     = EXCLUDED.budget_total,
  budget_used      = EXCLUDED.budget_used,
  budget_remaining = GREATEST(0, EXCLUDED.budget_total - GREATEST(EXCLUDED.budget_used, COALESCE(projects.budget_reported, 0))),
  responsible      = COALESCE(NULLIF(TRIM(projects.responsible), ''), EXCLUDED.responsible),
  project_name     = COALESCE(NULLIF(TRIM(projects.project_name), ''), EXCLUDED.project_name),
  updated_at       = NOW();

-- 1.โครงการประยุกต์ใช้เทคโนโลยีที่เหมาะสมเพื่อเพิ่มประสิทธิภาพ…
INSERT INTO projects (
  id, erp_code, project_name, responsible, main_program, organization,
  budget_total, budget_used, budget_remaining, fiscal_year
) VALUES (
  '76917000000083010001', '76917000000083010001', '1.โครงการประยุกต์ใช้เทคโนโลยีที่เหมาะสมเพื่อเพิ่มประสิทธิภาพการเลี้ยงปลาด้วยการพัฒนาสูตรอาหารปลาเสริมหนอนBSFโปรตีนสูงและพืชผักสมุนไพรท้องถิ่น', 'นางสาวอพิศรา หงส์หิรัญ',
  'ใต้ร่มพระบารมี', '',
  100000, 0, 180, 2569
)
ON CONFLICT (id) DO UPDATE SET
  budget_total     = EXCLUDED.budget_total,
  budget_used      = EXCLUDED.budget_used,
  budget_remaining = GREATEST(0, EXCLUDED.budget_total - GREATEST(EXCLUDED.budget_used, COALESCE(projects.budget_reported, 0))),
  responsible      = COALESCE(NULLIF(TRIM(projects.responsible), ''), EXCLUDED.responsible),
  project_name     = COALESCE(NULLIF(TRIM(projects.project_name), ''), EXCLUDED.project_name),
  updated_at       = NOW();

-- 2.โครงการพัฒนาเครื่องสลัดน้ำผักตามอัตลักษณ์ของศูนย์พัฒนาโครง…
INSERT INTO projects (
  id, erp_code, project_name, responsible, main_program, organization,
  budget_total, budget_used, budget_remaining, fiscal_year
) VALUES (
  '76917000000083010002', '76917000000083010002', '2.โครงการพัฒนาเครื่องสลัดน้ำผักตามอัตลักษณ์ของศูนย์พัฒนาโครงการหลวงทุ่งหลวง เพื่อสนับสนุนการพัฒนา กระบวนการผลิตผักใบที่มีความซับซ้อนและบอบบาง', 'ผู้ช่วยศาสตราจารย์เดือนแรม แพ่งเกี่ยว',
  'ใต้ร่มพระบารมี', '',
  81500, 0, 6270, 2569
)
ON CONFLICT (id) DO UPDATE SET
  budget_total     = EXCLUDED.budget_total,
  budget_used      = EXCLUDED.budget_used,
  budget_remaining = GREATEST(0, EXCLUDED.budget_total - GREATEST(EXCLUDED.budget_used, COALESCE(projects.budget_reported, 0))),
  responsible      = COALESCE(NULLIF(TRIM(projects.responsible), ''), EXCLUDED.responsible),
  project_name     = COALESCE(NULLIF(TRIM(projects.project_name), ''), EXCLUDED.project_name),
  updated_at       = NOW();

-- 1.โครงการพัฒนาชุดทดสอบสารพาราควอตเบื้องต้น (Paraquat Test Ki…
INSERT INTO projects (
  id, erp_code, project_name, responsible, main_program, organization,
  budget_total, budget_used, budget_remaining, fiscal_year
) VALUES (
  '56915000000083010002', '56915000000083010002', '1.โครงการพัฒนาชุดทดสอบสารพาราควอตเบื้องต้น (Paraquat Test Kit) ที่เหมาะสมสำหรับ ใช้งานภาคสนาม', 'ผู้ช่วยศาสตราจารย์สุบิน ใจทา',
  'ใต้ร่มพระบารมี', '',
  150000, 0, 150000, 2569
)
ON CONFLICT (id) DO UPDATE SET
  budget_total     = EXCLUDED.budget_total,
  budget_used      = EXCLUDED.budget_used,
  budget_remaining = GREATEST(0, EXCLUDED.budget_total - GREATEST(EXCLUDED.budget_used, COALESCE(projects.budget_reported, 0))),
  responsible      = COALESCE(NULLIF(TRIM(projects.responsible), ''), EXCLUDED.responsible),
  project_name     = COALESCE(NULLIF(TRIM(projects.project_name), ''), EXCLUDED.project_name),
  updated_at       = NOW();

-- 2.โครงการนวัตกรรมเชิงพื้นที่ของกระถางเพาะเมล็ดชีวภาพย่อยสลาย…
INSERT INTO projects (
  id, erp_code, project_name, responsible, main_program, organization,
  budget_total, budget_used, budget_remaining, fiscal_year
) VALUES (
  '56915000000083010003', '56915000000083010003', '2.โครงการนวัตกรรมเชิงพื้นที่ของกระถางเพาะเมล็ดชีวภาพย่อยสลายได้จากของเหลือทิ้งทางการเกษตรที่เสริมแร่ธาตุด้วยไบโอชาร์เสริมแร่ธาตุ', 'ผู้ช่วยศาสตราจารย์อมรรัตน์ ปิ่นชัยมูล',
  'ใต้ร่มพระบารมี', '',
  100000, 0, 47232, 2569
)
ON CONFLICT (id) DO UPDATE SET
  budget_total     = EXCLUDED.budget_total,
  budget_used      = EXCLUDED.budget_used,
  budget_remaining = GREATEST(0, EXCLUDED.budget_total - GREATEST(EXCLUDED.budget_used, COALESCE(projects.budget_reported, 0))),
  responsible      = COALESCE(NULLIF(TRIM(projects.responsible), ''), EXCLUDED.responsible),
  project_name     = COALESCE(NULLIF(TRIM(projects.project_name), ''), EXCLUDED.project_name),
  updated_at       = NOW();

-- 1.โครงการพัฒนาพื้นที่เรียนรู้ศาสตร์พระราชา เพื่อยกระดับศักยภ…
INSERT INTO projects (
  id, erp_code, project_name, responsible, main_program, organization,
  budget_total, budget_used, budget_remaining, fiscal_year
) VALUES (
  '16911115000084010001', '16911115000084010001', '1.โครงการพัฒนาพื้นที่เรียนรู้ศาสตร์พระราชา เพื่อยกระดับศักยภาพพื้นที่ด้วยเทคโนโลยีที่เหมาะสมและขับเคลื่อนการมีส่วนร่วมของมหาวิทยาลัยและชุมชน', 'นายสามารถ สาลี',
  'ใต้ร่มพระบารมี', '',
  400000, 166850, 188150, 2569
)
ON CONFLICT (id) DO UPDATE SET
  budget_total     = EXCLUDED.budget_total,
  budget_used      = EXCLUDED.budget_used,
  budget_remaining = GREATEST(0, EXCLUDED.budget_total - GREATEST(EXCLUDED.budget_used, COALESCE(projects.budget_reported, 0))),
  responsible      = COALESCE(NULLIF(TRIM(projects.responsible), ''), EXCLUDED.responsible),
  project_name     = COALESCE(NULLIF(TRIM(projects.project_name), ''), EXCLUDED.project_name),
  updated_at       = NOW();

-- 1.โครงการสนับสนุนการดำเนินงานศูนย์พัฒนาพันธุ์พืชจักรพันธ์เพ็…
INSERT INTO projects (
  id, erp_code, project_name, responsible, main_program, organization,
  budget_total, budget_used, budget_remaining, fiscal_year
) VALUES (
  '56915000000084010002', '56915000000084010002', '1.โครงการสนับสนุนการดำเนินงานศูนย์พัฒนาพันธุ์พืชจักรพันธ์เพ็ญศิริ อ.แม่สาย จ.เชียงราย  ประจำปีงบประมาณ 2569', 'รองศาสตราจารย์วิเชษฐ์ ทิพย์ประเสริฐ',
  'ใต้ร่มพระบารมี', '',
  450000, 198035, 160445, 2569
)
ON CONFLICT (id) DO UPDATE SET
  budget_total     = EXCLUDED.budget_total,
  budget_used      = EXCLUDED.budget_used,
  budget_remaining = GREATEST(0, EXCLUDED.budget_total - GREATEST(EXCLUDED.budget_used, COALESCE(projects.budget_reported, 0))),
  responsible      = COALESCE(NULLIF(TRIM(projects.responsible), ''), EXCLUDED.responsible),
  project_name     = COALESCE(NULLIF(TRIM(projects.project_name), ''), EXCLUDED.project_name),
  updated_at       = NOW();

-- 2.โครงการพัฒนาแหล่งเรียนรู้เกษตรอันเนื่องมาจากพระราชดำริ วิถ…
INSERT INTO projects (
  id, erp_code, project_name, responsible, main_program, organization,
  budget_total, budget_used, budget_remaining, fiscal_year
) VALUES (
  '56915000000084010003', '56915000000084010003', '2.โครงการพัฒนาแหล่งเรียนรู้เกษตรอันเนื่องมาจากพระราชดำริ วิถีธรรมชาติ', 'รองศาสตราจารย์วิเชษฐ์ ทิพย์ประเสริฐ',
  'ใต้ร่มพระบารมี', '',
  118960, 0, 118960, 2569
)
ON CONFLICT (id) DO UPDATE SET
  budget_total     = EXCLUDED.budget_total,
  budget_used      = EXCLUDED.budget_used,
  budget_remaining = GREATEST(0, EXCLUDED.budget_total - GREATEST(EXCLUDED.budget_used, COALESCE(projects.budget_reported, 0))),
  responsible      = COALESCE(NULLIF(TRIM(projects.responsible), ''), EXCLUDED.responsible),
  project_name     = COALESCE(NULLIF(TRIM(projects.project_name), ''), EXCLUDED.project_name),
  updated_at       = NOW();

-- 1.โครงการประยุกต์ใช้การคำนวนสูตรอาหารไก่ไข่ต้นทุนต่ำด้วยโปรแ…
INSERT INTO projects (
  id, erp_code, project_name, responsible, main_program, organization,
  budget_total, budget_used, budget_remaining, fiscal_year
) VALUES (
  '76917000000084010001', '76917000000084010001', '1.โครงการประยุกต์ใช้การคำนวนสูตรอาหารไก่ไข่ต้นทุนต่ำด้วยโปรแกรมสำเร็จรูปร่วมกับวัตถุดิบในท้องถิ่น เพื่อสร้างมาตรฐานอาหารไก่ไข่ในชุมชน', 'นางสาวอุษณีย์ภรณ์ สร้อยเพ็ชร์',
  'ใต้ร่มพระบารมี', '',
  50000, 0, 24200, 2569
)
ON CONFLICT (id) DO UPDATE SET
  budget_total     = EXCLUDED.budget_total,
  budget_used      = EXCLUDED.budget_used,
  budget_remaining = GREATEST(0, EXCLUDED.budget_total - GREATEST(EXCLUDED.budget_used, COALESCE(projects.budget_reported, 0))),
  responsible      = COALESCE(NULLIF(TRIM(projects.responsible), ''), EXCLUDED.responsible),
  project_name     = COALESCE(NULLIF(TRIM(projects.project_name), ''), EXCLUDED.project_name),
  updated_at       = NOW();

-- 2.โครงการถ่ายทอดองค์ความรู้และนวัตกรรมการยกระดับวัสดุเพาะเห็…
INSERT INTO projects (
  id, erp_code, project_name, responsible, main_program, organization,
  budget_total, budget_used, budget_remaining, fiscal_year
) VALUES (
  '76917000000084010002', '76917000000084010002', '2.โครงการถ่ายทอดองค์ความรู้และนวัตกรรมการยกระดับวัสดุเพาะเห็ดเศรษฐกิจจากวัสดุเหลือใช้ทางการเกษตร เพื่อความยั่งยืนของเศรษฐกิจฐานราก', 'นายภควัต หุ่นฉัตร์',
  'ใต้ร่มพระบารมี', '',
  50000, 0, 70, 2569
)
ON CONFLICT (id) DO UPDATE SET
  budget_total     = EXCLUDED.budget_total,
  budget_used      = EXCLUDED.budget_used,
  budget_remaining = GREATEST(0, EXCLUDED.budget_total - GREATEST(EXCLUDED.budget_used, COALESCE(projects.budget_reported, 0))),
  responsible      = COALESCE(NULLIF(TRIM(projects.responsible), ''), EXCLUDED.responsible),
  project_name     = COALESCE(NULLIF(TRIM(projects.project_name), ''), EXCLUDED.project_name),
  updated_at       = NOW();

-- 3.โครงการเพิ่มมูลค่าสินค้าเกษตรและการพัฒนาสื่อด้วย AI พื้นที…
INSERT INTO projects (
  id, erp_code, project_name, responsible, main_program, organization,
  budget_total, budget_used, budget_remaining, fiscal_year
) VALUES (
  '76917000000084010003', '76917000000084010003', '3.โครงการเพิ่มมูลค่าสินค้าเกษตรและการพัฒนาสื่อด้วย AI พื้นที่เขตปฏิรูปที่ดิน ตำบลป่าแดง อำเภอชาติตระการ จังหวัดพิษณุโลก', 'ผู้ช่วยศาสตราจารย์สุริยาพร นิพรรัมย์',
  'ใต้ร่มพระบารมี', '',
  50000, 7680, 30920, 2569
)
ON CONFLICT (id) DO UPDATE SET
  budget_total     = EXCLUDED.budget_total,
  budget_used      = EXCLUDED.budget_used,
  budget_remaining = GREATEST(0, EXCLUDED.budget_total - GREATEST(EXCLUDED.budget_used, COALESCE(projects.budget_reported, 0))),
  responsible      = COALESCE(NULLIF(TRIM(projects.responsible), ''), EXCLUDED.responsible),
  project_name     = COALESCE(NULLIF(TRIM(projects.project_name), ''), EXCLUDED.project_name),
  updated_at       = NOW();

-- 1.โครงการการจัดนิทรรศการเพื่อน้อมถวายรายงานในการรับเสด็จสมเด…
INSERT INTO projects (
  id, erp_code, project_name, responsible, main_program, organization,
  budget_total, budget_used, budget_remaining, fiscal_year
) VALUES (
  '46914000000084010001', '46914000000084010001', '1.โครงการการจัดนิทรรศการเพื่อน้อมถวายรายงานในการรับเสด็จสมเด็จพระกนิษฐาธิราชเจ้า กรมสมเด็จพระเทพรัตนราชสุดาฯ สยามบรมราชกุมารี ณ มหาวิทยาลัยเทคโนโลยีราชมงคลล้านนา น่าน', 'นางสาวสุภัควดี พิมพ์มาศ',
  'ใต้ร่มพระบารมี', '',
  250000, 250000, 0, 2569
)
ON CONFLICT (id) DO UPDATE SET
  budget_total     = EXCLUDED.budget_total,
  budget_used      = EXCLUDED.budget_used,
  budget_remaining = GREATEST(0, EXCLUDED.budget_total - GREATEST(EXCLUDED.budget_used, COALESCE(projects.budget_reported, 0))),
  responsible      = COALESCE(NULLIF(TRIM(projects.responsible), ''), EXCLUDED.responsible),
  project_name     = COALESCE(NULLIF(TRIM(projects.project_name), ''), EXCLUDED.project_name),
  updated_at       = NOW();

-- 2.โครงการพัฒนาศักยภาพการเรียนรู้ ด้านการจัดการภูมิทัศน์ ผ่าน…
INSERT INTO projects (
  id, erp_code, project_name, responsible, main_program, organization,
  budget_total, budget_used, budget_remaining, fiscal_year
) VALUES (
  '46914000000084010002', '46914000000084010002', '2.โครงการพัฒนาศักยภาพการเรียนรู้ ด้านการจัดการภูมิทัศน์ ผ่านประสบการณ์จริงนอกห้องเรียน ในจังหวัดน่าน', 'นายภาณุพงศ์ สิทธิวุฒิ',
  'ใต้ร่มพระบารมี', '',
  129050, 113350, 15700, 2569
)
ON CONFLICT (id) DO UPDATE SET
  budget_total     = EXCLUDED.budget_total,
  budget_used      = EXCLUDED.budget_used,
  budget_remaining = GREATEST(0, EXCLUDED.budget_total - GREATEST(EXCLUDED.budget_used, COALESCE(projects.budget_reported, 0))),
  responsible      = COALESCE(NULLIF(TRIM(projects.responsible), ''), EXCLUDED.responsible),
  project_name     = COALESCE(NULLIF(TRIM(projects.project_name), ''), EXCLUDED.project_name),
  updated_at       = NOW();

-- 1.โครงการอบรมเชิงปฏิบัติการถ่ายทอดองค์ความรู้เทคนิคการสร้างแ…
INSERT INTO projects (
  id, erp_code, project_name, responsible, main_program, organization,
  budget_total, budget_used, budget_remaining, fiscal_year
) VALUES (
  '16911600000084010001', '16911600000084010001', '1.โครงการอบรมเชิงปฏิบัติการถ่ายทอดองค์ความรู้เทคนิคการสร้างแม่พิมพ์เพื่อการขึ้นรูปพัฒนาผลิตภัณฑ์เซรามิก', 'นายคเชนทร์ เครือสาร',
  'ใต้ร่มพระบารมี', '',
  50000, 0, 50000, 2569
)
ON CONFLICT (id) DO UPDATE SET
  budget_total     = EXCLUDED.budget_total,
  budget_used      = EXCLUDED.budget_used,
  budget_remaining = GREATEST(0, EXCLUDED.budget_total - GREATEST(EXCLUDED.budget_used, COALESCE(projects.budget_reported, 0))),
  responsible      = COALESCE(NULLIF(TRIM(projects.responsible), ''), EXCLUDED.responsible),
  project_name     = COALESCE(NULLIF(TRIM(projects.project_name), ''), EXCLUDED.project_name),
  updated_at       = NOW();

-- 2.โครงการการพัฒนาแหล่งเรียนรู้และถ่ายทอดองค์ความรู้ เทคโนโลย…
INSERT INTO projects (
  id, erp_code, project_name, responsible, main_program, organization,
  budget_total, budget_used, budget_remaining, fiscal_year
) VALUES (
  '16911600000084010002', '16911600000084010002', '2.โครงการการพัฒนาแหล่งเรียนรู้และถ่ายทอดองค์ความรู้ เทคโนโลยีการพัฒนาผลิตภัณฑ์เซรามิก', 'นายศรีธร อุปคำ',
  'ใต้ร่มพระบารมี', '',
  200000, 35900, 164100, 2569
)
ON CONFLICT (id) DO UPDATE SET
  budget_total     = EXCLUDED.budget_total,
  budget_used      = EXCLUDED.budget_used,
  budget_remaining = GREATEST(0, EXCLUDED.budget_total - GREATEST(EXCLUDED.budget_used, COALESCE(projects.budget_reported, 0))),
  responsible      = COALESCE(NULLIF(TRIM(projects.responsible), ''), EXCLUDED.responsible),
  project_name     = COALESCE(NULLIF(TRIM(projects.project_name), ''), EXCLUDED.project_name),
  updated_at       = NOW();

-- 1.โครงการบริหารจัดการโครงการผลิตเมล็ดพันธุ์และปรับปรุงพันธุ์…
INSERT INTO projects (
  id, erp_code, project_name, responsible, main_program, organization,
  budget_total, budget_used, budget_remaining, fiscal_year
) VALUES (
  '36913000000084010002', '36913000000084010002', '1.โครงการบริหารจัดการโครงการผลิตเมล็ดพันธุ์และปรับปรุงพันธุ์พืชให้กับศูนย์พัฒนาพันธุ์พืช จักรพันธ์เพ็ญศิริ อำเภอแม่สาย จังหวัดเชียงราย ประจำปี พ.ศ. 2569', 'นายศิริชัย แซ่ท้าว',
  'ใต้ร่มพระบารมี', '',
  100000, 10058, 39942, 2569
)
ON CONFLICT (id) DO UPDATE SET
  budget_total     = EXCLUDED.budget_total,
  budget_used      = EXCLUDED.budget_used,
  budget_remaining = GREATEST(0, EXCLUDED.budget_total - GREATEST(EXCLUDED.budget_used, COALESCE(projects.budget_reported, 0))),
  responsible      = COALESCE(NULLIF(TRIM(projects.responsible), ''), EXCLUDED.responsible),
  project_name     = COALESCE(NULLIF(TRIM(projects.project_name), ''), EXCLUDED.project_name),
  updated_at       = NOW();

-- 1.โครงการการถ่ายทอดองค์ความรู้เรื่องการจัดการขยะแบบยั่งยืน ร…
INSERT INTO projects (
  id, erp_code, project_name, responsible, main_program, organization,
  budget_total, budget_used, budget_remaining, fiscal_year
) VALUES (
  '16911230000084010001', '16911230000084010001', '1.โครงการการถ่ายทอดองค์ความรู้เรื่องการจัดการขยะแบบยั่งยืน ระดับชุมชนและระดับมหาวิทยาลัย', 'นางวนิดา สุริยานนท์',
  'ใต้ร่มพระบารมี', '',
  50000, 0, 25000, 2569
)
ON CONFLICT (id) DO UPDATE SET
  budget_total     = EXCLUDED.budget_total,
  budget_used      = EXCLUDED.budget_used,
  budget_remaining = GREATEST(0, EXCLUDED.budget_total - GREATEST(EXCLUDED.budget_used, COALESCE(projects.budget_reported, 0))),
  responsible      = COALESCE(NULLIF(TRIM(projects.responsible), ''), EXCLUDED.responsible),
  project_name     = COALESCE(NULLIF(TRIM(projects.project_name), ''), EXCLUDED.project_name),
  updated_at       = NOW();

-- 1.โครงการพัฒนาการบริหารจัดการฐานข้อมูลด้วยกลไกการติดตามและปร…
INSERT INTO projects (
  id, erp_code, project_name, responsible, main_program, organization,
  budget_total, budget_used, budget_remaining, fiscal_year
) VALUES (
  '16911115000085010005', '16911115000085010005', '1.โครงการพัฒนาการบริหารจัดการฐานข้อมูลด้วยกลไกการติดตามและประเมินผล โครงการ/กิจกรรม ภายใต้การสนับสนุนของกลุ่มแผนงานใต้ร่มพระบารมี', 'นางสาวพิมลพรรณ เลิศบัวบาน',
  'ใต้ร่มพระบารมี', '',
  500000, 223916, 148284, 2569
)
ON CONFLICT (id) DO UPDATE SET
  budget_total     = EXCLUDED.budget_total,
  budget_used      = EXCLUDED.budget_used,
  budget_remaining = GREATEST(0, EXCLUDED.budget_total - GREATEST(EXCLUDED.budget_used, COALESCE(projects.budget_reported, 0))),
  responsible      = COALESCE(NULLIF(TRIM(projects.responsible), ''), EXCLUDED.responsible),
  project_name     = COALESCE(NULLIF(TRIM(projects.project_name), ''), EXCLUDED.project_name),
  updated_at       = NOW();

-- 2.โครงการพัฒนาฐานข้อมูลด้านวิศวกรรมและยกระดับทักษะอาชีพในพื้…
INSERT INTO projects (
  id, erp_code, project_name, responsible, main_program, organization,
  budget_total, budget_used, budget_remaining, fiscal_year
) VALUES (
  '16911115000085010006', '16911115000085010006', '2.โครงการพัฒนาฐานข้อมูลด้านวิศวกรรมและยกระดับทักษะอาชีพในพื้นที่โครงการหลวง (Re-skill Up-skill & New-skill)', 'นายสามารถ สาลี',
  'ใต้ร่มพระบารมี', '',
  200000, 81520, 118480, 2569
)
ON CONFLICT (id) DO UPDATE SET
  budget_total     = EXCLUDED.budget_total,
  budget_used      = EXCLUDED.budget_used,
  budget_remaining = GREATEST(0, EXCLUDED.budget_total - GREATEST(EXCLUDED.budget_used, COALESCE(projects.budget_reported, 0))),
  responsible      = COALESCE(NULLIF(TRIM(projects.responsible), ''), EXCLUDED.responsible),
  project_name     = COALESCE(NULLIF(TRIM(projects.project_name), ''), EXCLUDED.project_name),
  updated_at       = NOW();

-- 3.โครงการยกระดับการบริหารจัดการ ระบบติดตามและเครือข่าย ความร…
INSERT INTO projects (
  id, erp_code, project_name, responsible, main_program, organization,
  budget_total, budget_used, budget_remaining, fiscal_year
) VALUES (
  '16911115000085010007', '16911115000085010007', '3.โครงการยกระดับการบริหารจัดการ ระบบติดตามและเครือข่าย ความร่วมมือกลุ่มแผนงานใต้ร่มพระบารมี มทร.ล้านนา', 'นายนริศ กำแพงแก้ว',
  'ใต้ร่มพระบารมี', '',
  500000, 29644, 470356, 2569
)
ON CONFLICT (id) DO UPDATE SET
  budget_total     = EXCLUDED.budget_total,
  budget_used      = EXCLUDED.budget_used,
  budget_remaining = GREATEST(0, EXCLUDED.budget_total - GREATEST(EXCLUDED.budget_used, COALESCE(projects.budget_reported, 0))),
  responsible      = COALESCE(NULLIF(TRIM(projects.responsible), ''), EXCLUDED.responsible),
  project_name     = COALESCE(NULLIF(TRIM(projects.project_name), ''), EXCLUDED.project_name),
  updated_at       = NOW();

-- 4.โครงการการจัดกิจกรรมการเรียนรู้ส่งเสริมงานวิจัยและบริการวิ…
INSERT INTO projects (
  id, erp_code, project_name, responsible, main_program, organization,
  budget_total, budget_used, budget_remaining, fiscal_year
) VALUES (
  '16911115000085010008', '16911115000085010008', '4.โครงการการจัดกิจกรรมการเรียนรู้ส่งเสริมงานวิจัยและบริการวิชาการ ด้านนวัตกรรม เทคโนโลยีและการแปรรูป มูลนิธิโครงการหลวง', 'นายวัชระ กิตติวรเชฏฐ์',
  'ใต้ร่มพระบารมี', '',
  60563, 60277, 286, 2569
)
ON CONFLICT (id) DO UPDATE SET
  budget_total     = EXCLUDED.budget_total,
  budget_used      = EXCLUDED.budget_used,
  budget_remaining = GREATEST(0, EXCLUDED.budget_total - GREATEST(EXCLUDED.budget_used, COALESCE(projects.budget_reported, 0))),
  responsible      = COALESCE(NULLIF(TRIM(projects.responsible), ''), EXCLUDED.responsible),
  project_name     = COALESCE(NULLIF(TRIM(projects.project_name), ''), EXCLUDED.project_name),
  updated_at       = NOW();

-- 5.โครงการการฝึกอบรมสร้างความสามารถการออกแบบระบบจ่ายน้ำในแปลง…
INSERT INTO projects (
  id, erp_code, project_name, responsible, main_program, organization,
  budget_total, budget_used, budget_remaining, fiscal_year
) VALUES (
  '16911115000085010009', '16911115000085010009', '5.โครงการการฝึกอบรมสร้างความสามารถการออกแบบระบบจ่ายน้ำในแปลงเกษตร', 'นายวัชระ กิตติวรเชฏฐ์',
  'ใต้ร่มพระบารมี', '',
  150000, 47806, 87194, 2569
)
ON CONFLICT (id) DO UPDATE SET
  budget_total     = EXCLUDED.budget_total,
  budget_used      = EXCLUDED.budget_used,
  budget_remaining = GREATEST(0, EXCLUDED.budget_total - GREATEST(EXCLUDED.budget_used, COALESCE(projects.budget_reported, 0))),
  responsible      = COALESCE(NULLIF(TRIM(projects.responsible), ''), EXCLUDED.responsible),
  project_name     = COALESCE(NULLIF(TRIM(projects.project_name), ''), EXCLUDED.project_name),
  updated_at       = NOW();

-- 6.โครงการพัฒนาทักษะอาชีพด้านพลังงานสะอาด
INSERT INTO projects (
  id, erp_code, project_name, responsible, main_program, organization,
  budget_total, budget_used, budget_remaining, fiscal_year
) VALUES (
  '16911115000085010010', '16911115000085010010', '6.โครงการพัฒนาทักษะอาชีพด้านพลังงานสะอาด', 'นายวธัญญู วรรณพรหม',
  'ใต้ร่มพระบารมี', '',
  100000, 27790, 72210, 2569
)
ON CONFLICT (id) DO UPDATE SET
  budget_total     = EXCLUDED.budget_total,
  budget_used      = EXCLUDED.budget_used,
  budget_remaining = GREATEST(0, EXCLUDED.budget_total - GREATEST(EXCLUDED.budget_used, COALESCE(projects.budget_reported, 0))),
  responsible      = COALESCE(NULLIF(TRIM(projects.responsible), ''), EXCLUDED.responsible),
  project_name     = COALESCE(NULLIF(TRIM(projects.project_name), ''), EXCLUDED.project_name),
  updated_at       = NOW();

-- 7.โครงการประยุกต์ใช้ lora mesh ชนิด multi-hope ในการส่งสัญญา…
INSERT INTO projects (
  id, erp_code, project_name, responsible, main_program, organization,
  budget_total, budget_used, budget_remaining, fiscal_year
) VALUES (
  '16911600000085010011', '16911600000085010011', '7.โครงการประยุกต์ใช้ lora mesh ชนิด multi-hope ในการส่งสัญญาณจากเซนเซอร์ตรวจจับความร้อนเพื่อป้องกันไฟป่าในพื้นที่การดำเนินโครงการตามพระราชดำริและมูลนิธิโครงการหลวง', 'นายณัฐวัฒน์ พัลวัล',
  'ใต้ร่มพระบารมี', '',
  100000, 53600, 46400, 2569
)
ON CONFLICT (id) DO UPDATE SET
  budget_total     = EXCLUDED.budget_total,
  budget_used      = EXCLUDED.budget_used,
  budget_remaining = GREATEST(0, EXCLUDED.budget_total - GREATEST(EXCLUDED.budget_used, COALESCE(projects.budget_reported, 0))),
  responsible      = COALESCE(NULLIF(TRIM(projects.responsible), ''), EXCLUDED.responsible),
  project_name     = COALESCE(NULLIF(TRIM(projects.project_name), ''), EXCLUDED.project_name),
  updated_at       = NOW();

-- 8.โครงการการประยุกต์ใช้เครือข่าย lora-mesh ชนิด multi-hops เ…
INSERT INTO projects (
  id, erp_code, project_name, responsible, main_program, organization,
  budget_total, budget_used, budget_remaining, fiscal_year
) VALUES (
  '16911600000085010012', '16911600000085010012', '8.โครงการการประยุกต์ใช้เครือข่าย lora-mesh ชนิด multi-hops เพื่อการส่งสัญญาณเตือนภัยธรรมชาติ 3 รูปแบบ  (ระดับน้ำ ฝุ่นควัน ปริมาณน้ำฝน) ในพื้นที่โครงการตามพระราชดำริและมูลนิธิโครงการหลวง', 'นายณัฐวัฒน์ พัลวัล',
  'ใต้ร่มพระบารมี', '',
  100000, 57500, 42500, 2569
)
ON CONFLICT (id) DO UPDATE SET
  budget_total     = EXCLUDED.budget_total,
  budget_used      = EXCLUDED.budget_used,
  budget_remaining = GREATEST(0, EXCLUDED.budget_total - GREATEST(EXCLUDED.budget_used, COALESCE(projects.budget_reported, 0))),
  responsible      = COALESCE(NULLIF(TRIM(projects.responsible), ''), EXCLUDED.responsible),
  project_name     = COALESCE(NULLIF(TRIM(projects.project_name), ''), EXCLUDED.project_name),
  updated_at       = NOW();

-- 9.โครงการพัฒนาและยกระดับสมรรถนะด้านการติดตั้งและบำรุงรักษาระ…
INSERT INTO projects (
  id, erp_code, project_name, responsible, main_program, organization,
  budget_total, budget_used, budget_remaining, fiscal_year
) VALUES (
  '16911600000085010013', '16911600000085010013', '9.โครงการพัฒนาและยกระดับสมรรถนะด้านการติดตั้งและบำรุงรักษาระบบเซลล์แสงอาทิตย์  ให้เป็นไปตามมาตรฐานฝีมือแรงงานแห่งชาติ สาขาโซล่าเซลล์ ระดับ 1', 'นายวธัญญู วรรณพรหม',
  'ใต้ร่มพระบารมี', '',
  18900, 18900, 0, 2569
)
ON CONFLICT (id) DO UPDATE SET
  budget_total     = EXCLUDED.budget_total,
  budget_used      = EXCLUDED.budget_used,
  budget_remaining = GREATEST(0, EXCLUDED.budget_total - GREATEST(EXCLUDED.budget_used, COALESCE(projects.budget_reported, 0))),
  responsible      = COALESCE(NULLIF(TRIM(projects.responsible), ''), EXCLUDED.responsible),
  project_name     = COALESCE(NULLIF(TRIM(projects.project_name), ''), EXCLUDED.project_name),
  updated_at       = NOW();

-- 10.โครงการจัดทำแผนความร่วมมือและสร้างกลไกการพัฒนาเครือข่ายใน…
INSERT INTO projects (
  id, erp_code, project_name, responsible, main_program, organization,
  budget_total, budget_used, budget_remaining, fiscal_year
) VALUES (
  '16911600000085010014', '16911600000085010014', '10.โครงการจัดทำแผนความร่วมมือและสร้างกลไกการพัฒนาเครือข่ายในการขับเคลื่อนงานวิจัย และบริการวิชาการเชิงพื้นที่ MOU MOA', 'นายวัชระ กิตติวรเชฏฐ์',
  'ใต้ร่มพระบารมี', '',
  100000, 0, 100000, 2569
)
ON CONFLICT (id) DO UPDATE SET
  budget_total     = EXCLUDED.budget_total,
  budget_used      = EXCLUDED.budget_used,
  budget_remaining = GREATEST(0, EXCLUDED.budget_total - GREATEST(EXCLUDED.budget_used, COALESCE(projects.budget_reported, 0))),
  responsible      = COALESCE(NULLIF(TRIM(projects.responsible), ''), EXCLUDED.responsible),
  project_name     = COALESCE(NULLIF(TRIM(projects.project_name), ''), EXCLUDED.project_name),
  updated_at       = NOW();

-- 11.โครงการวิจัยความเข้มแข็งทางสังคม ชุมชนในการวางแผนการใช้น้…
INSERT INTO projects (
  id, erp_code, project_name, responsible, main_program, organization,
  budget_total, budget_used, budget_remaining, fiscal_year
) VALUES (
  '16911600000085010015', '16911600000085010015', '11.โครงการวิจัยความเข้มแข็งทางสังคม ชุมชนในการวางแผนการใช้น้ำศูนย์พัฒนาโครงการหลวงขุนแปะ', 'นายวัชระ กิตติวรเชฏฐ์',
  'ใต้ร่มพระบารมี', '',
  100000, 0, 100000, 2569
)
ON CONFLICT (id) DO UPDATE SET
  budget_total     = EXCLUDED.budget_total,
  budget_used      = EXCLUDED.budget_used,
  budget_remaining = GREATEST(0, EXCLUDED.budget_total - GREATEST(EXCLUDED.budget_used, COALESCE(projects.budget_reported, 0))),
  responsible      = COALESCE(NULLIF(TRIM(projects.responsible), ''), EXCLUDED.responsible),
  project_name     = COALESCE(NULLIF(TRIM(projects.project_name), ''), EXCLUDED.project_name),
  updated_at       = NOW();

-- 1.โครงการประเมินผลกระทบของโครงการบริการวิชาการมหาวิทยาลัยเทค…
INSERT INTO projects (
  id, erp_code, project_name, responsible, main_program, organization,
  budget_total, budget_used, budget_remaining, fiscal_year
) VALUES (
  '16911600000085010002', '16911600000085010002', '1.โครงการประเมินผลกระทบของโครงการบริการวิชาการมหาวิทยาลัยเทคโนโลยีราชมงคลล้านนาต่อชุมชนบนพื้นที่สูงและพื้นที่พระราชดำริ', 'ผู้ช่วยศาสตราจารย์ธัญวดี สุจริตธรรม',
  'ใต้ร่มพระบารมี', '',
  142800, 20844, 50956, 2569
)
ON CONFLICT (id) DO UPDATE SET
  budget_total     = EXCLUDED.budget_total,
  budget_used      = EXCLUDED.budget_used,
  budget_remaining = GREATEST(0, EXCLUDED.budget_total - GREATEST(EXCLUDED.budget_used, COALESCE(projects.budget_reported, 0))),
  responsible      = COALESCE(NULLIF(TRIM(projects.responsible), ''), EXCLUDED.responsible),
  project_name     = COALESCE(NULLIF(TRIM(projects.project_name), ''), EXCLUDED.project_name),
  updated_at       = NOW();

-- 2.โครงการพัฒนาแผนการตลาดของกลุ่มวิสาหกิจชุมชนภายใต้แนวคิด “ก…
INSERT INTO projects (
  id, erp_code, project_name, responsible, main_program, organization,
  budget_total, budget_used, budget_remaining, fiscal_year
) VALUES (
  '16911600000085010003', '16911600000085010003', '2.โครงการพัฒนาแผนการตลาดของกลุ่มวิสาหกิจชุมชนภายใต้แนวคิด “กินได้ ใช้ได้ ขายได้”', 'ผู้ช่วยศาสตราจารย์ธัญวดี สุจริตธรรม',
  'ใต้ร่มพระบารมี', '',
  63000, 0, 63000, 2569
)
ON CONFLICT (id) DO UPDATE SET
  budget_total     = EXCLUDED.budget_total,
  budget_used      = EXCLUDED.budget_used,
  budget_remaining = GREATEST(0, EXCLUDED.budget_total - GREATEST(EXCLUDED.budget_used, COALESCE(projects.budget_reported, 0))),
  responsible      = COALESCE(NULLIF(TRIM(projects.responsible), ''), EXCLUDED.responsible),
  project_name     = COALESCE(NULLIF(TRIM(projects.project_name), ''), EXCLUDED.project_name),
  updated_at       = NOW();

-- 3.โครงการต้นแบบอาคารอนุรักษ์พลังงานในรูปแบบ (Green Building …
INSERT INTO projects (
  id, erp_code, project_name, responsible, main_program, organization,
  budget_total, budget_used, budget_remaining, fiscal_year
) VALUES (
  '16911600000085010005', '16911600000085010005', '3.โครงการต้นแบบอาคารอนุรักษ์พลังงานในรูปแบบ (Green Building & Green Office)', 'นายวธัญญู วรรณพรหม',
  'ใต้ร่มพระบารมี', '',
  250000, 30000, 160000, 2569
)
ON CONFLICT (id) DO UPDATE SET
  budget_total     = EXCLUDED.budget_total,
  budget_used      = EXCLUDED.budget_used,
  budget_remaining = GREATEST(0, EXCLUDED.budget_total - GREATEST(EXCLUDED.budget_used, COALESCE(projects.budget_reported, 0))),
  responsible      = COALESCE(NULLIF(TRIM(projects.responsible), ''), EXCLUDED.responsible),
  project_name     = COALESCE(NULLIF(TRIM(projects.project_name), ''), EXCLUDED.project_name),
  updated_at       = NOW();

-- 4.โครงการพัฒนาทักษะวิชาชีพให้กับเจ้าหน้าที่ ชาวบ้าน เยาวชน พ…
INSERT INTO projects (
  id, erp_code, project_name, responsible, main_program, organization,
  budget_total, budget_used, budget_remaining, fiscal_year
) VALUES (
  '16911600000085010006', '16911600000085010006', '4.โครงการพัฒนาทักษะวิชาชีพให้กับเจ้าหน้าที่ ชาวบ้าน เยาวชน พื้นที่โดยรอบสถานี/ศูนย์พัฒนาโครงการหลวง และโครงการพระราชดำริ ประจำปี 2569 (หลักสูตรการทำมุ้งลวด)', 'นายศราวุธ วรรณวิจิตร',
  'ใต้ร่มพระบารมี', '',
  100000, 0, 81725, 2569
)
ON CONFLICT (id) DO UPDATE SET
  budget_total     = EXCLUDED.budget_total,
  budget_used      = EXCLUDED.budget_used,
  budget_remaining = GREATEST(0, EXCLUDED.budget_total - GREATEST(EXCLUDED.budget_used, COALESCE(projects.budget_reported, 0))),
  responsible      = COALESCE(NULLIF(TRIM(projects.responsible), ''), EXCLUDED.responsible),
  project_name     = COALESCE(NULLIF(TRIM(projects.project_name), ''), EXCLUDED.project_name),
  updated_at       = NOW();

-- 6.โครงการพัฒนาต้นแบบชุดน้ำชาเซรามิกสโตนแวร์สำหรับยกระดับผลิต…
INSERT INTO projects (
  id, erp_code, project_name, responsible, main_program, organization,
  budget_total, budget_used, budget_remaining, fiscal_year
) VALUES (
  '16911600000085010008', '16911600000085010008', '6.โครงการพัฒนาต้นแบบชุดน้ำชาเซรามิกสโตนแวร์สำหรับยกระดับผลิตภัณฑ์ชาโครงการหลวง', 'นายสิงหล วิชายะ',
  'ใต้ร่มพระบารมี', '',
  100000, 0, 100000, 2569
)
ON CONFLICT (id) DO UPDATE SET
  budget_total     = EXCLUDED.budget_total,
  budget_used      = EXCLUDED.budget_used,
  budget_remaining = GREATEST(0, EXCLUDED.budget_total - GREATEST(EXCLUDED.budget_used, COALESCE(projects.budget_reported, 0))),
  responsible      = COALESCE(NULLIF(TRIM(projects.responsible), ''), EXCLUDED.responsible),
  project_name     = COALESCE(NULLIF(TRIM(projects.project_name), ''), EXCLUDED.project_name),
  updated_at       = NOW();

-- 7.โครงการการถ่ายทอดองค์ความรู้กระบวนการผลิตน้ำดื่มสะอาดด้วยร…
INSERT INTO projects (
  id, erp_code, project_name, responsible, main_program, organization,
  budget_total, budget_used, budget_remaining, fiscal_year
) VALUES (
  '16911600000085010009', '16911600000085010009', '7.โครงการการถ่ายทอดองค์ความรู้กระบวนการผลิตน้ำดื่มสะอาดด้วยระบบรถน้ำดื่ม Hydro Pure', 'นายเมธัส ภัททิยธนี',
  'ใต้ร่มพระบารมี', '',
  150000, 3220, 146780, 2569
)
ON CONFLICT (id) DO UPDATE SET
  budget_total     = EXCLUDED.budget_total,
  budget_used      = EXCLUDED.budget_used,
  budget_remaining = GREATEST(0, EXCLUDED.budget_total - GREATEST(EXCLUDED.budget_used, COALESCE(projects.budget_reported, 0))),
  responsible      = COALESCE(NULLIF(TRIM(projects.responsible), ''), EXCLUDED.responsible),
  project_name     = COALESCE(NULLIF(TRIM(projects.project_name), ''), EXCLUDED.project_name),
  updated_at       = NOW();

-- 8.โครงการพัฒนาทักษะวิชาชีพให้กับเจ้าหน้าที่ ชาวบ้าน เยาวชน พ…
INSERT INTO projects (
  id, erp_code, project_name, responsible, main_program, organization,
  budget_total, budget_used, budget_remaining, fiscal_year
) VALUES (
  '16911600000085010010', '16911600000085010010', '8.โครงการพัฒนาทักษะวิชาชีพให้กับเจ้าหน้าที่ ชาวบ้าน เยาวชน พื้นที่โดยรอบสถานี/ศูนย์พัฒนาโครงการหลวง และโครงการพระราชดำริ ประจำปี 2569 (หลักสูตรเครื่องยนต์เล็ก)', 'นายวธัญญู วรรณพรหม',
  'ใต้ร่มพระบารมี', '',
  100000, 0, 78050, 2569
)
ON CONFLICT (id) DO UPDATE SET
  budget_total     = EXCLUDED.budget_total,
  budget_used      = EXCLUDED.budget_used,
  budget_remaining = GREATEST(0, EXCLUDED.budget_total - GREATEST(EXCLUDED.budget_used, COALESCE(projects.budget_reported, 0))),
  responsible      = COALESCE(NULLIF(TRIM(projects.responsible), ''), EXCLUDED.responsible),
  project_name     = COALESCE(NULLIF(TRIM(projects.project_name), ''), EXCLUDED.project_name),
  updated_at       = NOW();

-- 9.โครงการส่งเสริมบำรุงรักษาระบบผลิตไฟฟ้าแบบผสมผสานระหว่างระบ…
INSERT INTO projects (
  id, erp_code, project_name, responsible, main_program, organization,
  budget_total, budget_used, budget_remaining, fiscal_year
) VALUES (
  '16911600000085010016', '16911600000085010016', '9.โครงการส่งเสริมบำรุงรักษาระบบผลิตไฟฟ้าแบบผสมผสานระหว่างระบบผลิตไฟฟ้าพลังน้ำ และระบบผลิตไฟฟ้าพลังงานแสงอาทิตย์ พื้นที่พระราชดำริ ตำบลแม่ตื่น อำเภออมก๋อย ปี ๒๕๖๙', 'นายศรีธร อุปคำ',
  'ใต้ร่มพระบารมี', '',
  49990, 0, 49990, 2569
)
ON CONFLICT (id) DO UPDATE SET
  budget_total     = EXCLUDED.budget_total,
  budget_used      = EXCLUDED.budget_used,
  budget_remaining = GREATEST(0, EXCLUDED.budget_total - GREATEST(EXCLUDED.budget_used, COALESCE(projects.budget_reported, 0))),
  responsible      = COALESCE(NULLIF(TRIM(projects.responsible), ''), EXCLUDED.responsible),
  project_name     = COALESCE(NULLIF(TRIM(projects.project_name), ''), EXCLUDED.project_name),
  updated_at       = NOW();

-- 10.โครงการพัฒนาทักษะวิชาชีพหลักสูตรการทำมุ้งลวดให้กับสามเณร …
INSERT INTO projects (
  id, erp_code, project_name, responsible, main_program, organization,
  budget_total, budget_used, budget_remaining, fiscal_year
) VALUES (
  '16911600000085010017', '16911600000085010017', '10.โครงการพัฒนาทักษะวิชาชีพหลักสูตรการทำมุ้งลวดให้กับสามเณร และเยาวชน พื้นที่จังหวัดเชียงรายและจังหวัดเชียงใหม่ ประจำปี ๒๕๖๙', 'นายวธัญญู วรรณพรหม',
  'ใต้ร่มพระบารมี', '',
  49860, 0, 49860, 2569
)
ON CONFLICT (id) DO UPDATE SET
  budget_total     = EXCLUDED.budget_total,
  budget_used      = EXCLUDED.budget_used,
  budget_remaining = GREATEST(0, EXCLUDED.budget_total - GREATEST(EXCLUDED.budget_used, COALESCE(projects.budget_reported, 0))),
  responsible      = COALESCE(NULLIF(TRIM(projects.responsible), ''), EXCLUDED.responsible),
  project_name     = COALESCE(NULLIF(TRIM(projects.project_name), ''), EXCLUDED.project_name),
  updated_at       = NOW();

-- 1.โครงการยกระดับมาตรฐานผลิตภัณฑ์ผ้าใยกัญชงวิสาหกิจชุมชนดาวม่…
INSERT INTO projects (
  id, erp_code, project_name, responsible, main_program, organization,
  budget_total, budget_used, budget_remaining, fiscal_year
) VALUES (
  '16911240000085010001', '16911240000085010001', '1.โครงการยกระดับมาตรฐานผลิตภัณฑ์ผ้าใยกัญชงวิสาหกิจชุมชนดาวม่างสู่ มผช. ด้วยหลักการ "เข้าใจ เข้าถึง พัฒนา"  เพื่อสร้างความเข้มแข็งและโอกาสทางการค้าอย่างยั่งยืน', 'ผศ.ญาณิศา โกมลสิริโชค',
  'ใต้ร่มพระบารมี', '',
  100000, 49644, 356, 2569
)
ON CONFLICT (id) DO UPDATE SET
  budget_total     = EXCLUDED.budget_total,
  budget_used      = EXCLUDED.budget_used,
  budget_remaining = GREATEST(0, EXCLUDED.budget_total - GREATEST(EXCLUDED.budget_used, COALESCE(projects.budget_reported, 0))),
  responsible      = COALESCE(NULLIF(TRIM(projects.responsible), ''), EXCLUDED.responsible),
  project_name     = COALESCE(NULLIF(TRIM(projects.project_name), ''), EXCLUDED.project_name),
  updated_at       = NOW();

-- 2.โครงการยกระดับห่วงโซ่คุณค่าห้อมพื้นถิ่น สู่ผลิตภัณฑ์ย้อมสี…
INSERT INTO projects (
  id, erp_code, project_name, responsible, main_program, organization,
  budget_total, budget_used, budget_remaining, fiscal_year
) VALUES (
  '16911240000085010002', '16911240000085010002', '2.โครงการยกระดับห่วงโซ่คุณค่าห้อมพื้นถิ่น สู่ผลิตภัณฑ์ย้อมสี ธรรมชาติสร้างสรรค์ ศูนย์พัฒนาโครงการหลวงปังค่า', 'ดร.จุฑามาศ ดอนอ่อนเบ้า',
  'ใต้ร่มพระบารมี', '',
  100000, 24900, 25100, 2569
)
ON CONFLICT (id) DO UPDATE SET
  budget_total     = EXCLUDED.budget_total,
  budget_used      = EXCLUDED.budget_used,
  budget_remaining = GREATEST(0, EXCLUDED.budget_total - GREATEST(EXCLUDED.budget_used, COALESCE(projects.budget_reported, 0))),
  responsible      = COALESCE(NULLIF(TRIM(projects.responsible), ''), EXCLUDED.responsible),
  project_name     = COALESCE(NULLIF(TRIM(projects.project_name), ''), EXCLUDED.project_name),
  updated_at       = NOW();

-- 1.โครงการการสำรวจผลผลิตทางการเกษตรโครงการหลวง เพื่อการประกอบ…
INSERT INTO projects (
  id, erp_code, project_name, responsible, main_program, organization,
  budget_total, budget_used, budget_remaining, fiscal_year
) VALUES (
  '16911210000085010001', '16911210000085010001', '1.โครงการการสำรวจผลผลิตทางการเกษตรโครงการหลวง เพื่อการประกอบอาหารและเผยแพร่การประกอบอาหารจากวัตถุดิบโครงการหลวง', 'นายวรัญญ์คมน์ รัตนะมงคลชัย',
  'ใต้ร่มพระบารมี', '',
  40000, 0, 40000, 2569
)
ON CONFLICT (id) DO UPDATE SET
  budget_total     = EXCLUDED.budget_total,
  budget_used      = EXCLUDED.budget_used,
  budget_remaining = GREATEST(0, EXCLUDED.budget_total - GREATEST(EXCLUDED.budget_used, COALESCE(projects.budget_reported, 0))),
  responsible      = COALESCE(NULLIF(TRIM(projects.responsible), ''), EXCLUDED.responsible),
  project_name     = COALESCE(NULLIF(TRIM(projects.project_name), ''), EXCLUDED.project_name),
  updated_at       = NOW();

-- 1.โครงการการพัฒนานวัตกรรมด้านการศึกษาเพื่อการพัฒนาศักยภาพเยา…
INSERT INTO projects (
  id, erp_code, project_name, responsible, main_program, organization,
  budget_total, budget_used, budget_remaining, fiscal_year
) VALUES (
  '16911250000085010001', '16911250000085010001', '1.โครงการการพัฒนานวัตกรรมด้านการศึกษาเพื่อการพัฒนาศักยภาพเยาวชนในโรงเรียนพระปริยัติธรรมแผนกสามัญศึกษา  ปี 2569', 'นายศุภกาล ตุ้ยเต็มวงศ์',
  'ใต้ร่มพระบารมี', '',
  149070, 25000, 4530, 2569
)
ON CONFLICT (id) DO UPDATE SET
  budget_total     = EXCLUDED.budget_total,
  budget_used      = EXCLUDED.budget_used,
  budget_remaining = GREATEST(0, EXCLUDED.budget_total - GREATEST(EXCLUDED.budget_used, COALESCE(projects.budget_reported, 0))),
  responsible      = COALESCE(NULLIF(TRIM(projects.responsible), ''), EXCLUDED.responsible),
  project_name     = COALESCE(NULLIF(TRIM(projects.project_name), ''), EXCLUDED.project_name),
  updated_at       = NOW();

-- 1.โครงส่งเสริมพัฒนาโจทย์วิจัยจากชุมชน
INSERT INTO projects (
  id, erp_code, project_name, responsible, main_program, organization,
  budget_total, budget_used, budget_remaining, fiscal_year
) VALUES (
  '56915000000085010001', '56915000000085010001', '1.โครงส่งเสริมพัฒนาโจทย์วิจัยจากชุมชน', 'รองศาสตราจารย์วิเชษฐ์ ทิพย์ประเสริฐ',
  'ใต้ร่มพระบารมี', '',
  100000, 4950, 95050, 2569
)
ON CONFLICT (id) DO UPDATE SET
  budget_total     = EXCLUDED.budget_total,
  budget_used      = EXCLUDED.budget_used,
  budget_remaining = GREATEST(0, EXCLUDED.budget_total - GREATEST(EXCLUDED.budget_used, COALESCE(projects.budget_reported, 0))),
  responsible      = COALESCE(NULLIF(TRIM(projects.responsible), ''), EXCLUDED.responsible),
  project_name     = COALESCE(NULLIF(TRIM(projects.project_name), ''), EXCLUDED.project_name),
  updated_at       = NOW();

-- 2.โครงการถ่ายทอดองค์ความรู้และนวัตกรรมเพื่อยกระดับมูลค่าไก่ด…
INSERT INTO projects (
  id, erp_code, project_name, responsible, main_program, organization,
  budget_total, budget_used, budget_remaining, fiscal_year
) VALUES (
  '56915000000085010002', '56915000000085010002', '2.โครงการถ่ายทอดองค์ความรู้และนวัตกรรมเพื่อยกระดับมูลค่าไก่ดำ (ไก่ฟ้าหลวง) สู่การพัฒนาต่อยอดการจดทะเบียนทรัพย์สินทางปัญญา (GI)', 'ผู้ช่วยศาสตราจารย์จิรพัฒน์พงษ์ เสนาบุตร',
  'ใต้ร่มพระบารมี', '',
  100000, 0, 100000, 2569
)
ON CONFLICT (id) DO UPDATE SET
  budget_total     = EXCLUDED.budget_total,
  budget_used      = EXCLUDED.budget_used,
  budget_remaining = GREATEST(0, EXCLUDED.budget_total - GREATEST(EXCLUDED.budget_used, COALESCE(projects.budget_reported, 0))),
  responsible      = COALESCE(NULLIF(TRIM(projects.responsible), ''), EXCLUDED.responsible),
  project_name     = COALESCE(NULLIF(TRIM(projects.project_name), ''), EXCLUDED.project_name),
  updated_at       = NOW();

-- 3.โครงการพัฒนาระบบติดตามข้อมูลภายใต้สถานีตรวจวัดสภาพอากาศเพื…
INSERT INTO projects (
  id, erp_code, project_name, responsible, main_program, organization,
  budget_total, budget_used, budget_remaining, fiscal_year
) VALUES (
  '56915000000085010003', '56915000000085010003', '3.โครงการพัฒนาระบบติดตามข้อมูลภายใต้สถานีตรวจวัดสภาพอากาศเพื่อป้องกันภัยพิบัติ', 'ผู้ช่วยศาสตราจารย์กิ่งกาญจน์  ปวนสุรินทร์',
  'ใต้ร่มพระบารมี', '',
  100000, 0, 50000, 2569
)
ON CONFLICT (id) DO UPDATE SET
  budget_total     = EXCLUDED.budget_total,
  budget_used      = EXCLUDED.budget_used,
  budget_remaining = GREATEST(0, EXCLUDED.budget_total - GREATEST(EXCLUDED.budget_used, COALESCE(projects.budget_reported, 0))),
  responsible      = COALESCE(NULLIF(TRIM(projects.responsible), ''), EXCLUDED.responsible),
  project_name     = COALESCE(NULLIF(TRIM(projects.project_name), ''), EXCLUDED.project_name),
  updated_at       = NOW();

-- 1.โครงการพัฒนาทักษะอาชีพและองค์ความรู้ด้านเกษตรและเทคโนโลยีอ…
INSERT INTO projects (
  id, erp_code, project_name, responsible, main_program, organization,
  budget_total, budget_used, budget_remaining, fiscal_year
) VALUES (
  '46914000000085010001', '46914000000085010001', '1.โครงการพัฒนาทักษะอาชีพและองค์ความรู้ด้านเกษตรและเทคโนโลยีอย่างยั่งยืน สำหรับสามเณรและเยาวชนในโรงเรียนพระปริยัติธรรมแผนกสามัญศึกษา', 'นายก้องเกียรติ ธนะมิตร',
  'ใต้ร่มพระบารมี', '',
  94000, 94000, 0, 2569
)
ON CONFLICT (id) DO UPDATE SET
  budget_total     = EXCLUDED.budget_total,
  budget_used      = EXCLUDED.budget_used,
  budget_remaining = GREATEST(0, EXCLUDED.budget_total - GREATEST(EXCLUDED.budget_used, COALESCE(projects.budget_reported, 0))),
  responsible      = COALESCE(NULLIF(TRIM(projects.responsible), ''), EXCLUDED.responsible),
  project_name     = COALESCE(NULLIF(TRIM(projects.project_name), ''), EXCLUDED.project_name),
  updated_at       = NOW();

-- 2.โครงการถ่ายทอดเทคโนโลยีการเพาะขยายพันธุ์ปลาเลียหินเพื่อการ…
INSERT INTO projects (
  id, erp_code, project_name, responsible, main_program, organization,
  budget_total, budget_used, budget_remaining, fiscal_year
) VALUES (
  '46914000000085010002', '46914000000085010002', '2.โครงการถ่ายทอดเทคโนโลยีการเพาะขยายพันธุ์ปลาเลียหินเพื่อการอนุรักษ์ปลาท้องถิ่นในจังหวัดน่าน', 'นายจุลทรรศน์  คีรีแลง',
  'ใต้ร่มพระบารมี', '',
  82400, 0, 41250, 2569
)
ON CONFLICT (id) DO UPDATE SET
  budget_total     = EXCLUDED.budget_total,
  budget_used      = EXCLUDED.budget_used,
  budget_remaining = GREATEST(0, EXCLUDED.budget_total - GREATEST(EXCLUDED.budget_used, COALESCE(projects.budget_reported, 0))),
  responsible      = COALESCE(NULLIF(TRIM(projects.responsible), ''), EXCLUDED.responsible),
  project_name     = COALESCE(NULLIF(TRIM(projects.project_name), ''), EXCLUDED.project_name),
  updated_at       = NOW();

-- ===== Verify =====
SELECT
  COUNT(*)                                AS total_projects,
  COUNT(*) FILTER (WHERE responsible IS NOT NULL AND responsible <> '') AS with_responsible,
  SUM(budget_total)                       AS sum_total,
  SUM(budget_used)                        AS sum_used,
  SUM(budget_remaining)                   AS sum_remaining
FROM projects
WHERE main_program = 'ใต้ร่มพระบารมี'
  AND erp_code IN (
    '16911115000083010001',
    '16911115000083010002',
    '16911115000083010003',
    '16911230000083010001',
    '16911230000083010003',
    '16911230000083010004',
    '16911230000083010005',
    '16911230000083010006',
    '16911250000083010001',
    '16911600000083010002',
    '76917000000083010001',
    '76917000000083010002',
    '56915000000083010002',
    '56915000000083010003',
    '16911115000084010001',
    '56915000000084010002',
    '56915000000084010003',
    '76917000000084010001',
    '76917000000084010002',
    '76917000000084010003',
    '46914000000084010001',
    '46914000000084010002',
    '16911600000084010001',
    '16911600000084010002',
    '36913000000084010002',
    '16911230000084010001',
    '16911115000085010005',
    '16911115000085010006',
    '16911115000085010007',
    '16911115000085010008',
    '16911115000085010009',
    '16911115000085010010',
    '16911600000085010011',
    '16911600000085010012',
    '16911600000085010013',
    '16911600000085010014',
    '16911600000085010015',
    '16911600000085010002',
    '16911600000085010003',
    '16911600000085010005',
    '16911600000085010006',
    '16911600000085010008',
    '16911600000085010009',
    '16911600000085010010',
    '16911600000085010016',
    '16911600000085010017',
    '16911240000085010001',
    '16911240000085010002',
    '16911210000085010001',
    '16911250000085010001',
    '56915000000085010001',
    '56915000000085010002',
    '56915000000085010003',
    '46914000000085010001',
    '46914000000085010002'
  );

COMMIT;
