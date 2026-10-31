require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const pool = require('../src/config/database');

async function runMigration() {
  const sqlPath = path.resolve(__dirname, '../migrations/013_clinical_safety_certificates_notifications.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  console.log('Running Migration 013: Clinical Safety, Medical Certificates & Notifications Outbox...');
  await pool.query(sql);
  console.log('Migration 013 applied successfully!');
  await pool.end();
}

runMigration().catch(err => {
  console.error('Migration 013 failed:', err);
  process.exit(1);
});
