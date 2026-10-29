const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../src/config/database');

const PASSWORD = 'Hospital@2024';

const EXPECTED_ACTORS = [
  { role: 'super_admin', email: 'admin@hospital.com', title: 'System Administrator (Primary)' },
  { role: 'super_admin', email: 'superadmin@hospital.com', title: 'System Administrator (Alias)' },
  { role: 'super_admin', email: 'admin@hospital.et', title: 'System Administrator (Legacy Alias)' },
  { role: 'hospital_manager', email: 'manager@hospital.com', title: 'Hospital Manager (Operations)' },
  { role: 'doctor', email: 'doctor@hospital.com', title: 'Medical Doctor' },
  { role: 'nurse', email: 'nurse@hospital.com', title: 'Triage Nurse' },
  { role: 'nurse', email: 'nurse@gmail.com', title: 'Triage Nurse (Alias)' },
  { role: 'receptionist', email: 'reception@hospital.com', title: 'Receptionist' },
  { role: 'cashier', email: 'cashier@hospital.com', title: 'Cashier POS' },
  { role: 'lab_technician', email: 'labtech@hospital.com', title: 'Lab Technician' },
  { role: 'pharmacist', email: 'pharmacist@hospital.com', title: 'Pharmacist' },
  { role: 'patient', email: 'patient@hospital.com', title: 'Patient Portal' },
];

async function testAll() {
  console.log('================================================================');
  console.log('🧪 TESTING AUTHENTICATION & ACCESS FOR ALL 10 ACTORS');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  for (const actor of EXPECTED_ACTORS) {
    const res = await pool.query('SELECT * FROM users WHERE email = $1', [actor.email.toLowerCase().trim()]);
    if (!res.rows.length) {
      console.log(`❌ [FAILED] ${actor.role.padEnd(16)} | ${actor.email} -> USER NOT FOUND`);
      failed++;
      continue;
    }

    const user = res.rows[0];
    const passwordValid = await bcrypt.compare(PASSWORD, user.password_hash);
    if (!passwordValid) {
      console.log(`❌ [FAILED] ${actor.role.padEnd(16)} | ${actor.email} -> INVALID PASSWORD`);
      failed++;
      continue;
    }

    if (!user.is_active) {
      console.log(`❌ [FAILED] ${actor.role.padEnd(16)} | ${actor.email} -> USER INACTIVE`);
      failed++;
      continue;
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Profile check
    let profileInfo = '';
    if (user.role === 'doctor') {
      const doc = await pool.query('SELECT id, specialization, license_number FROM doctors WHERE user_id = $1', [user.id]);
      profileInfo = doc.rows[0] ? `Doctor ID #${doc.rows[0].id} (${doc.rows[0].specialization})` : 'NO DOCTOR PROFILE';
    } else if (user.role === 'nurse') {
      const nur = await pool.query('SELECT id, shift, license_number FROM nurses WHERE user_id = $1', [user.id]);
      profileInfo = nur.rows[0] ? `Nurse ID #${nur.rows[0].id} (Shift: ${nur.rows[0].shift})` : 'NO NURSE PROFILE';
    } else if (user.role === 'patient') {
      const pat = await pool.query('SELECT id, blood_type, insurance_number FROM patients WHERE user_id = $1', [user.id]);
      profileInfo = pat.rows[0] ? `Patient ID #${pat.rows[0].id} (Blood: ${pat.rows[0].blood_type}, Ins: ${pat.rows[0].insurance_number})` : 'NO PATIENT PROFILE';
    } else {
      profileInfo = `System Staff: ${user.first_name || ''} ${user.last_name || ''}`;
    }

    console.log(`✅ [PASSED] ${user.role.padEnd(16)} | ${user.email.padEnd(26)} | ${profileInfo}`);
    passed++;
  }

  console.log('\n================================================================');
  console.log(`SUMMARY: ${passed} Passed, ${failed} Failed out of ${EXPECTED_ACTORS.length} tested.`);
  console.log('================================================================');

  await pool.end();
  process.exit(failed > 0 ? 1 : 0);
}

testAll().catch(e => {
  console.error(e);
  process.exit(1);
});
