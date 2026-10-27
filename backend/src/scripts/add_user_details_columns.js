const pool = require('../config/database');

async function migrate() {
  try {
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(20);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(100);
    `);
    console.log('Successfully added contact and profile columns to users table.');

    // Populate existing first_name and last_name from doctors, nurses, patients where available
    await pool.query(`
      UPDATE users u SET
        first_name = COALESCE(u.first_name, d.first_name, n.first_name, p.first_name, split_part(u.email, '@', 1)),
        last_name = COALESCE(u.last_name, d.last_name, n.last_name, p.last_name, ''),
        phone = COALESCE(u.phone, d.phone, n.phone, p.phone, '')
      FROM users u2
      LEFT JOIN doctors d ON d.user_id = u2.id
      LEFT JOIN nurses n ON n.user_id = u2.id
      LEFT JOIN patients p ON p.user_id = u2.id
      WHERE u.id = u2.id;
    `);
    console.log('Successfully backfilled user names and phones.');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

migrate();
