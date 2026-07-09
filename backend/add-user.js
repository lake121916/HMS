const bcrypt = require('bcryptjs');
const readline = require('readline');
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'hospital_management',
  user: 'postgres',
  password: '12345678'
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const validRoles = [
  'super_admin',
  'admin',
  'receptionist',
  'doctor',
  'nurse',
  'lab_technician',
  'pharmacist',
  'cashier',
  'hospital_manager',
  'patient'
];

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function addUser() {
  try {
    console.log('\n=== Add New User ===\n');
    
    const email = await question('Enter email: ');
    const password = await question('Enter password: ');
    
    console.log('\nAvailable roles:');
    validRoles.forEach((role, index) => {
      console.log(`  ${index + 1}. ${role}`);
    });
    
    const roleIndex = await question('Select role (enter number): ');
    const role = validRoles[parseInt(roleIndex) - 1];
    
    if (!role) {
      console.log('Invalid role selected');
      return;
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    await pool.query(
      'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3)',
      [email, hashedPassword, role]
    );
    
    console.log('\n✓ User added successfully!');
    console.log(`  Email: ${email}`);
    console.log(`  Password: ${password}`);
    console.log(`  Role: ${role}\n`);
  } catch (err) {
    console.error('Error adding user:', err.message);
  } finally {
    await pool.end();
    rl.close();
  }
}

addUser();
