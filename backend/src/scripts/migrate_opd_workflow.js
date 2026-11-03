/**
 * Migration script for OPD Coordinator Assignment Workflow
 * Adds pain_score, bmi, abnormal_flags to vitals and triage_assessments.
 * Creates performance indexes.
 */
const pool = require('../config/database');

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Beginning OPD Workflow Migration...');
    await client.query('BEGIN');

    // 1. Add columns to vitals
    await client.query(`
      ALTER TABLE vitals
        ADD COLUMN IF NOT EXISTS pain_score INTEGER,
        ADD COLUMN IF NOT EXISTS bmi NUMERIC(5,2),
        ADD COLUMN IF NOT EXISTS abnormal_flags TEXT;
    `);
    console.log('✓ Updated vitals table columns');

    // 2. Add columns to triage_assessments
    await client.query(`
      ALTER TABLE triage_assessments
        ADD COLUMN IF NOT EXISTS pain_score INTEGER,
        ADD COLUMN IF NOT EXISTS bmi NUMERIC(5,2),
        ADD COLUMN IF NOT EXISTS abnormal_flags TEXT;
    `);
    console.log('✓ Updated triage_assessments table columns');

    // 3. Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_encounters_status ON patient_encounters (status);
      CREATE INDEX IF NOT EXISTS idx_encounters_patient_id ON patient_encounters (patient_id);
      CREATE INDEX IF NOT EXISTS idx_vitals_encounter_id ON vitals (encounter_id);
      CREATE INDEX IF NOT EXISTS idx_triage_encounter_id ON triage_assessments (encounter_id);
      CREATE INDEX IF NOT EXISTS idx_assignments_encounter_id ON encounter_assignments (encounter_id);
      CREATE INDEX IF NOT EXISTS idx_assignments_doctor_id ON encounter_assignments (doctor_id);
    `);
    console.log('✓ Created workflow performance indexes');

    await client.query('COMMIT');
    console.log('OPD Workflow Migration completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
