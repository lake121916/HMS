require('dotenv').config();
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL });

p.query("DELETE FROM schema_migrations WHERE filename = '002_add_encounter_columns.sql'")
  .then(r => {
    console.log('Reset:', r.rowCount, 'rows deleted');
    p.end();
  })
  .catch(e => { console.error(e); p.end(); });
