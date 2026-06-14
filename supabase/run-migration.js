const { Client } = require('pg');
const fs = require('fs');

// Supabase PostgreSQL direct connection
// Format: postgresql://postgres.[ref]:[db_password]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
// OR use the service_role approach via transaction mode

const DATABASE_URL = `postgresql://postgres.vkiofmhddlzffgzstoml:${process.env.SUPABASE_DB_PASSWORD}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;

async function runMigration() {
  const sql = fs.readFileSync(__dirname + '/migration.sql', 'utf8');

  console.log('Connecting to Supabase PostgreSQL...');

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected! Running migration...\n');

    await client.query(sql);
    console.log('✅ Migration completed successfully!');

    // Verify tables
    const { rows } = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    console.log('\nTables in database:');
    rows.forEach(r => console.log('  - ' + r.table_name));

  } catch (err) {
    console.error('❌ Migration error:', err.message);
  } finally {
    await client.end();
  }
}

runMigration();
