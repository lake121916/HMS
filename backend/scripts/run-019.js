const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const sqlFile = path.join(__dirname, '..', 'migrations', '019_patient_qr_security_and_clinical_safety.sql');
  console.log('Running migration 019 from:', sqlFile);
  const sql = fs.readFileSync(sqlFile, 'utf8');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Migration 019 executed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration 019 failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
