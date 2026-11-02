const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function addNurseUser() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if user exists
    const existing = await client.query(
      'SELECT id FROM users WHERE email = $1',
      ['nurse@hospital.com']
    );

    if (existing.rows.length > 0) {
      console.log('User nurse@hospital.com already exists');
      await client.query('ROLLBACK');
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('nurse123', 10);

    // Create user
    const userRes = await client.query(
      `INSERT INTO users (email, password_hash, role, is_active) 
       VALUES ($1, $2, 'nurse', true) 
       RETURNING id, email, role`,
      ['nurse@hospital.com', hashedPassword]
    );

    const user = userRes.rows[0];
    console.log('Created user:', user);

    // Create nurse profile
    await client.query(
      `INSERT INTO nurses (user_id, first_name, last_name, email, phone, department_id)
       VALUES ($1, 'Nurse', 'Test', $2, '1234567890', NULL)`,
      [user.id, 'nurse@hospital.com']
    );

    await client.query('COMMIT');
    console.log('Nurse user created successfully in Neon database!');
    console.log('Email: nurse@hospital.com');
    console.log('Password: nurse123');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

addNurseUser();
