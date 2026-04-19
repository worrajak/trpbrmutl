// Apply storage-rls.sql to Supabase (RLS policies for 'images' bucket)
// ต้องมี SUPABASE_DB_PASSWORD ใน env (หาใน Supabase Dashboard > Settings > Database)
//
// run:
//   SUPABASE_DB_PASSWORD=xxx node supabase/apply-storage-rls.js

const { Client } = require("pg");
const { readFileSync } = require("fs");
const { resolve } = require("path");

// โหลด env
try {
  const envText = readFileSync(resolve(__dirname, "../.env.local"), "utf8");
  for (const line of envText.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/i);
    if (!m) continue;
    const [, k, vRaw] = m;
    if (!process.env[k]) process.env[k] = vRaw.replace(/^["']|["']$/g, "");
  }
} catch {}

const PROJECT_REF = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").match(
  /https:\/\/([^.]+)\.supabase\.co/
)?.[1];

if (!PROJECT_REF) {
  console.error("❌ หา project ref จาก NEXT_PUBLIC_SUPABASE_URL ไม่ได้");
  process.exit(1);
}
if (!process.env.SUPABASE_DB_PASSWORD) {
  console.error(
    "❌ ไม่มี SUPABASE_DB_PASSWORD ใน env\n" +
      "   หาได้จาก Supabase Dashboard > Settings > Database > Connection string > password\n" +
      "   หรือรันตรงใน Dashboard SQL Editor โดยคัดลอกเนื้อหาจาก supabase/storage-rls.sql"
  );
  process.exit(1);
}

const DATABASE_URL = `postgresql://postgres.${PROJECT_REF}:${process.env.SUPABASE_DB_PASSWORD}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;

(async () => {
  const sql = readFileSync(resolve(__dirname, "storage-rls.sql"), "utf8");
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  try {
    await client.connect();
    console.log("✓ Connected to Supabase DB");
    await client.query(sql);
    console.log("✅ Storage RLS policies applied successfully");

    // verify
    const { rows } = await client.query(`
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname IN ('report_image_insert', 'report_image_read')
      ORDER BY policyname
    `);
    console.log("\nPolicies on storage.objects:");
    for (const r of rows) console.log(`  ✓ ${r.policyname}`);
  } catch (e) {
    console.error("❌ Error:", e.message);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
