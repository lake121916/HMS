const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require('../src/config/database');

(async () => {
  const testSql = `
    CREATE TABLE IF NOT EXISTS migration_test (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    INSERT INTO migration_test (name) VALUES ('migration_test_row') ON CONFLICT DO NOTHING;
  `;

  try {
    console.log('Applying test migration...');
    await pool.query(testSql);
    const res = await pool.query('SELECT id, name, created_at FROM migration_test LIMIT 1');
    console.log('Test migration succeeded, sample row:', res.rows[0]);
    // Drop the test table after verification to keep the database clean
    console.log('Dropping test table...');
    await pool.query('DROP TABLE IF EXISTS migration_test;');
    console.log('Test table dropped.');
  } catch (err) {
    console.error('Test migration failed:', err);
    process.exit(1);
  } finally {
    try { await pool.end(); } catch(e){}
  }
})();
