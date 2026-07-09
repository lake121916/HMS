const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require('../src/config/database');

(async () => {
  try {
    const sqlPath = path.join(__dirname, '..', 'database', 'schema.sql');
    if (!fs.existsSync(sqlPath)) {
      console.error('schema.sql not found at', sqlPath);
      process.exit(1);
    }
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('Applying schema.sql to database...');
    await pool.query(sql);
    console.log('Migrations applied successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    try { await pool.end(); } catch(e){}
  }
})();
