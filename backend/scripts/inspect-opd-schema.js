const pool = require('../src/config/database');

async function inspect() {
  const tables = [
    'doctor_consultations',
    'consultation_addenda',
    'appointments',
    'opd_queues',
    'patient_encounters',
    'triage_assessments',
    'vitals'
  ];

  for (const table of tables) {
    const res = await pool.query(
      `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_name = $1
       ORDER BY ordinal_position`,
      [table]
    );
    console.log(`\n=== Table: ${table} ===`);
    console.log(res.rows.map(r => `${r.column_name} (${r.data_type})`).join(', '));
  }
  process.exit(0);
}

inspect().catch(err => {
  console.error(err);
  process.exit(1);
});
