require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Running Migration 009: Insurance & Claims Management...');
    const sqlPath = path.join(__dirname, '../migrations/009_insurance_claims_management.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');

    console.log('✓ Migration 009 executed successfully!');

    // Verify providers seeded
    const providers = await client.query('SELECT COUNT(*) FROM insurance_providers');
    console.log('✓ insurance_providers ready. Count:', providers.rows[0].count);

    // Verify new tables
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('insurance_providers','patient_insurance_policies','pre_authorization_requests','insurance_claim_items','insurance_claim_events')
      ORDER BY table_name
    `);
    console.log('✓ New tables created:', tables.rows.map(r => r.table_name).join(', '));

    // Verify enhanced columns on insurance_claims
    const cols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'insurance_claims'
        AND column_name IN ('provider_id','policy_id','pre_auth_id','claim_number','patient_copay','approved_amount','submitted_by')
    `);
    console.log('✓ insurance_claims extended columns:', cols.rows.map(r => r.column_name).join(', '));

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration 009 failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
