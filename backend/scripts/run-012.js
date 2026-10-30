require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const pool = require('../src/config/database');

async function runMigration() {
  const sqlPath = path.resolve(__dirname, '../migrations/012_staff_shift_scheduling.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  console.log('Running Migration 012...');
  await pool.query(sql);
  console.log('Migration 012 completed successfully!');
  await pool.end();
}

runMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
