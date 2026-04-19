-- RLS policies สำหรับ storage bucket 'images'
-- path convention: reports/{project_id}/{timestamp}-{slot}.jpg

-- 1) อนุญาตให้ anon + authenticated upload เข้า reports/ เท่านั้น
DROP POLICY IF EXISTS "report_image_insert" ON storage.objects;
CREATE POLICY "report_image_insert"
  ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (
    bucket_id = 'images'
    AND (storage.foldername(name))[1] = 'reports'
  );

-- 2) อนุญาตให้อ่านรูป (bucket public อยู่แล้ว แต่ policy ชัดเจนช่วย audit)
DROP POLICY IF EXISTS "report_image_read" ON storage.objects;
CREATE POLICY "report_image_read"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'images');

-- 3) ไม่อนุญาต UPDATE / DELETE สำหรับ anon (ถ้าต้องการลบ — ทำผ่าน admin/service key)
-- (ไม่ต้อง CREATE policy — default deny)
