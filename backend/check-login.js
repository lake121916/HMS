const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'hospital_management',
  user: 'postgres',
  password: '12345678'
});

async function testLogin() {
  try {
    const email = 'nurse@hospital.com';
    const password = 'nurse123';
    
    console.log('Testing login for:', email);
    
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      console.log('User not found');
      return;
    }
    
    const user = result.rows[0];
    console.log('User found:', user.email, 'role:', user.role, 'is_active:', user.is_active);
    
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    console.log('Password valid:', isPasswordValid);
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

testLogin();
