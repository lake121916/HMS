require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Running Migration 008: Cashier Shift, Thermal Receipts, Payment Verification...');
    const sqlPath = path.join(__dirname, '../migrations/008_cashier_reconciliation_thermal_receipts.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');

    console.log('✓ Migration 008 executed successfully!');

    // Verify cashier_shifts
    const shifts = await client.query("SELECT COUNT(*) FROM cashier_shifts");
    console.log('✓ cashier_shifts table ready. Count:', shifts.rows[0].count);

    // Verify config
    const config = await client.query("SELECT * FROM hospital_financial_config WHERE id = 1");
    console.log('✓ Hospital config initialized:', config.rows[0].hospital_name_en, 'TIN:', config.rows[0].tin_number);

    // Verify payments columns
    const payCols = await client.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'payments' AND column_name IN ('receipt_number', 'payment_provider', 'provider_reference', 'verification_status', 'shift_id', 'reprint_count')"
    );
    console.log('✓ Payments extended columns:', payCols.rows.map(r => r.column_name).join(', '));
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
