require('dotenv').config();
const pool = require('../src/config/database');

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Starting Prescription Management migration...');
    await client.query('BEGIN');

    // 1. Add columns to prescriptions table if they don't exist
    await client.query(`
      ALTER TABLE prescriptions
      ADD COLUMN IF NOT EXISTS medication_id INTEGER REFERENCES medicines(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1,
      ADD COLUMN IF NOT EXISTS quantity_dispensed INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Pending',
      ADD COLUMN IF NOT EXISTS workflow_status VARCHAR(50) DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS expiry_date DATE,
      ADD COLUMN IF NOT EXISTS invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS invoice_item_id INTEGER REFERENCES invoice_items(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS dispensed_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS dispensed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS notes TEXT;
    `);

    // Backfill prescription status based on is_dispensed and prescribed_date
    await client.query(`
      UPDATE prescriptions
      SET status = CASE
        WHEN is_dispensed = true THEN 'Dispensed'
        WHEN prescribed_date < CURRENT_DATE - INTERVAL '30 days' THEN 'Expired'
        ELSE COALESCE(status, 'Pending')
      END,
      workflow_status = CASE
        WHEN is_dispensed = true THEN 'dispensed'
        WHEN prescribed_date < CURRENT_DATE - INTERVAL '30 days' THEN 'expired'
        ELSE COALESCE(workflow_status, 'pending')
      END,
      quantity = COALESCE(quantity, 1),
      quantity_dispensed = CASE
        WHEN is_dispensed = true AND (quantity_dispensed IS NULL OR quantity_dispensed = 0) THEN COALESCE(quantity, 1)
        ELSE COALESCE(quantity_dispensed, 0)
      END,
      expiry_date = COALESCE(expiry_date, (prescribed_date + INTERVAL '30 days')::date)
      WHERE status IS NULL OR status = 'Pending' OR status = 'Dispensed';
    `);

    // Backfill medication_id on prescriptions by matching name
    await client.query(`
      UPDATE prescriptions p
      SET medication_id = m.id
      FROM medicines m
      WHERE p.medication_id IS NULL
        AND (LOWER(p.medication_name) = LOWER(m.name) OR LOWER(p.medication_name) = LOWER(m.generic_name));
    `);

    // 2. Add columns to batch_dispensations table if they don't exist
    await client.query(`
      ALTER TABLE batch_dispensations
      ADD COLUMN IF NOT EXISTS patient_id INTEGER REFERENCES patients(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS medication_id INTEGER REFERENCES medicines(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS batch_number VARCHAR(100),
      ADD COLUMN IF NOT EXISTS quantity_prescribed INTEGER DEFAULT 1,
      ADD COLUMN IF NOT EXISTS quantity_dispensed INTEGER,
      ADD COLUMN IF NOT EXISTS invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS invoice_item_id INTEGER REFERENCES invoice_items(id) ON DELETE SET NULL;
    `);

    // Backfill batch_dispensations with batch_number, medication_id, patient_id
    await client.query(`
      UPDATE batch_dispensations bd
      SET batch_number = mb.batch_number,
          medication_id = mb.medication_id
      FROM medication_batches mb
      WHERE bd.batch_id = mb.id
        AND (bd.batch_number IS NULL OR bd.medication_id IS NULL);
    `);

    await client.query(`
      UPDATE batch_dispensations bd
      SET patient_id = p.patient_id,
          quantity_prescribed = COALESCE(p.quantity, 1),
          quantity_dispensed = COALESCE(bd.quantity, 1)
      FROM prescriptions p
      WHERE bd.prescription_id = p.id
        AND bd.patient_id IS NULL;
    `);

    // Backfill invoice link from invoice_items if available
    await client.query(`
      UPDATE prescriptions pr
      SET invoice_id = ii.invoice_id,
          invoice_item_id = ii.id
      FROM invoice_items ii
      WHERE ii.source_type = 'prescription'
        AND ii.source_id = pr.id
        AND pr.invoice_id IS NULL;
    `);

    // 3. Ensure indexes for high performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id);
      CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor ON prescriptions(doctor_id);
      CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON prescriptions(status);
      CREATE INDEX IF NOT EXISTS idx_prescriptions_med_id ON prescriptions(medication_id);
      CREATE INDEX IF NOT EXISTS idx_batch_dispensations_rx ON batch_dispensations(prescription_id);
      CREATE INDEX IF NOT EXISTS idx_batch_dispensations_med ON batch_dispensations(medication_id);
      CREATE INDEX IF NOT EXISTS idx_batch_dispensations_patient ON batch_dispensations(patient_id);
    `);

    await client.query('COMMIT');
    console.log('Prescription Management migration completed successfully!');
    process.exit(0);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
  }
}

migrate();
