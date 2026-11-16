const fs = require('fs');
const path = require('path');
const pool = require('../src/config/database');

async function run() {
  const sql = fs.readFileSync(path.join(__dirname, '../migrations/020_opd_department_tables.sql'), 'utf8');
  console.log('Running Migration 020...');
  await pool.query(sql);
  console.log('Migration 020 completed successfully!');
  process.exit(0);
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
