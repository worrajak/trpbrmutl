-- สร้าง table สำหรับเก็บ analytics events
-- รันใน Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)

CREATE TABLE IF NOT EXISTS analytics_events (
  id BIGSERIAL PRIMARY KEY,
  event TEXT NOT NULL,          -- 'page_view', 'link_click', 'news_click'
  page TEXT NOT NULL,           -- '/projects', '/regulations', '/'
  target TEXT,                  -- ชื่อลิงก์ที่คลิก (ถ้ามี)
  referrer TEXT,                -- URL ที่มาก่อนหน้า
  user_agent TEXT,              -- browser info
  ip_hash TEXT,                 -- hash ของ IP (ไม่เก็บ IP จริง)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index สำหรับ query ที่ใช้บ่อย
CREATE INDEX IF NOT EXISTS idx_analytics_event ON analytics_events(event);
CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_page ON analytics_events(page);

-- เปิด RLS (Row Level Security)
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Policy: อนุญาตให้ทุกคน INSERT ได้ (anonymous tracking)
CREATE POLICY "Allow anonymous insert" ON analytics_events
  FOR INSERT
  WITH CHECK (true);

-- Policy: อนุญาตให้ authenticated users อ่านได้ (สำหรับ admin dashboard)
-- หรือถ้าต้องการให้อ่านได้โดยไม่ต้อง login ใช้ policy ด้านล่าง
CREATE POLICY "Allow public read" ON analytics_events
  FOR SELECT
  USING (true);
