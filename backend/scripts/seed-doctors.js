const pool = require('../src/config/database');
const bcrypt = require('bcryptjs');

async function seedDoctors() {
  try {
    const doctorList = [
      { deptId: 1, firstName: 'Alemayehu', lastName: 'Tadesse', spec: 'General Medicine', email: 'dr.alemayehu@hospital.et' },
      { deptId: 2, firstName: 'Biniam', lastName: 'Assefa', spec: 'Cardiologist', email: 'dr.biniam@hospital.et' },
      { deptId: 3, firstName: 'Sara', lastName: 'Mekonnen', spec: 'Neurologist', email: 'dr.sara@hospital.et' },
      { deptId: 4, firstName: 'Dawit', lastName: 'Haile', spec: 'Orthopedic Surgeon', email: 'dr.dawit@hospital.et' },
      { deptId: 5, firstName: 'Bethlehem', lastName: 'Yilma', spec: 'Pediatrician', email: 'dr.bethlehem@hospital.et' },
      { deptId: 6, firstName: 'Hiwot', lastName: 'Gebre', spec: 'Gynecologist', email: 'dr.hiwot@hospital.et' },
      { deptId: 7, firstName: 'Yonas', lastName: 'Kassahun', spec: 'Dermatologist', email: 'dr.yonas@hospital.et' },
      { deptId: 8, firstName: 'Tigist', lastName: 'Worku', spec: 'Ophthalmologist', email: 'dr.tigist@hospital.et' },
      { deptId: 9, firstName: 'Solomon', lastName: 'Desta', spec: 'Emergency Specialist', email: 'dr.solomon@hospital.et' },
      { deptId: 12, firstName: 'Meron', lastName: 'Alemu', spec: 'Radiologist', email: 'dr.meron@hospital.et' }
    ];

    const passHash = await bcrypt.hash('Doctor@123', 10);

    // Update existing doctor id=1 to General Medicine
    await pool.query('UPDATE doctors SET department_id = 1, specialization = $1 WHERE id = 1', ['General Medicine']);

    for (const d of doctorList) {
      // Check if user exists
      let userRes = await pool.query('SELECT id FROM users WHERE email = $1', [d.email]);
      let userId;
      if (!userRes.rows.length) {
        const newUser = await pool.query(
          'INSERT INTO users (email, password_hash, role, is_active) VALUES ($1, $2, $3, true) RETURNING id',
          [d.email, passHash, 'doctor']
        );
        userId = newUser.rows[0].id;
      } else {
        userId = userRes.rows[0].id;
      }

      // Check if doctor exists
      const docRes = await pool.query('SELECT id FROM doctors WHERE user_id = $1 OR email = $2', [userId, d.email]);
      if (!docRes.rows.length) {
        await pool.query(
          `INSERT INTO doctors (user_id, first_name, last_name, email, phone, specialization, is_available, department_id)
           VALUES ($1, $2, $3, $4, $5, $6, true, $7)`,
          [userId, d.firstName, d.lastName, d.email, `+251 91 100 00${d.deptId}`, d.spec, d.deptId]
        );
      } else {
        await pool.query(
          `UPDATE doctors SET first_name=$1, last_name=$2, specialization=$3, department_id=$4, is_available=true WHERE id=$5`,
          [d.firstName, d.lastName, d.spec, d.deptId, docRes.rows[0].id]
        );
      }
    }

    console.log('✅ Doctors for all departments seeded successfully.');

    // Fetch and display final mapping
    const result = await pool.query(`
      SELECT dep.id AS department_id, dep.name AS department_name,
             d.id AS doctor_id, d.first_name, d.last_name, d.specialization, d.email, d.is_available
      FROM departments dep
      LEFT JOIN doctors d ON d.department_id = dep.id
      ORDER BY dep.id, d.first_name
    `);

    console.log('\n--- DOCTORS BY DEPARTMENT ---');
    console.table(result.rows);

  } catch (err) {
    console.error('Seeding error:', err);
  } finally {
    await pool.end();
  }
}

seedDoctors();
