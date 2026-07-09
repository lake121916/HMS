const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'hospital_management',
  user: 'postgres',
  password: '12345678'
});

async function checkUser() {
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      ['superadmin@hospital.com']
    );
    
    if (result.rows.length > 0) {
      console.log('User found:', result.rows[0]);
    } else {
      console.log('User not found');
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

checkUser();
