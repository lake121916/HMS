const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'hospital_management',
  user: 'postgres',
  password: '12345678'
});

async function updatePassword() {
  const password = 'admin123';
  const hash = await bcrypt.hash(password, 10);
  console.log('Generated hash:', hash);
  
  try {
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2',
      [hash, 'superadmin@hospital.com']
    );
    console.log('Password updated successfully');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

updatePassword();
