require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./src/config/database');

async function resetPasswords() {
  const newPassword = 'Hospital@2024';
  const hash = await bcrypt.hash(newPassword, 10);
  const result = await pool.query('UPDATE users SET password_hash = $1', [hash]);
  console.log(`✅ Reset passwords for ${result.rowCount} users.`);
  console.log(`📧 All accounts now use password: ${newPassword}`);
  
  // List all accounts
  const users = await pool.query('SELECT email, role FROM users ORDER BY role, email');
  console.log('\nAccount list:');
  users.rows.forEach(u => console.log(`  ${u.role.padEnd(20)} ${u.email}`));
  
  await pool.end();
}

resetPasswords().catch(e => { console.error('Error:', e.message); process.exit(1); });
