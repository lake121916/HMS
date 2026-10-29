const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const pool = require('../src/config/database');

const DEFAULT_PASSWORD = 'Hospital@2024';

const ACTORS = [
  {
    role: 'super_admin',
    primaryEmail: 'admin@hospital.com',
    aliases: ['superadmin@hospital.com', 'admin@hospital.et'],
    firstName: 'System',
    lastName: 'Administrator',
    phone: '+251 91 100 0001',
    gender: 'female',
    address: 'IT & System Admin Office, Alem Ketema Hospital',
    notes: 'Unified System & IT Administration (full root privileges, user management, audit logs)'
  },
  {
    role: 'hospital_manager',
    primaryEmail: 'manager@hospital.com',
    aliases: ['hospitalmanager@hospital.com'],
    firstName: 'Abebe',
    lastName: 'Bekele',
    phone: '+251 91 100 0003',
    gender: 'male',
    address: 'Operations & Management Office, Alem Ketema',
    notes: 'Hospital leadership, clinical KPIs, inpatient census & financial analytics'
  },
  {
    role: 'doctor',
    primaryEmail: 'doctor@hospital.com',
    aliases: [],
    firstName: 'Awoke',
    lastName: 'Desta',
    phone: '+251 91 100 0004',
    gender: 'male',
    address: 'Doctor Quarters, Alem Ketema',
    notes: 'Consultation room, EMR diagnosis, electronic prescriptions & lab requests',
    doctorProfile: {
      specialization: 'General Medicine',
      departmentId: 1, // General Medicine
      licenseNumber: 'DOC-ET-10001',
      qualification: 'MD, Internal Medicine',
      experienceYears: 8,
      consultationFee: 250.00
    }
  },
  {
    role: 'nurse',
    primaryEmail: 'nurse@hospital.com',
    aliases: ['nurse@gmail.com'],
    firstName: 'Tigist',
    lastName: 'Haile',
    phone: '+251 91 100 0005',
    gender: 'female',
    address: 'Emergency & Triage Wing, Alem Ketema',
    notes: 'Triage desk, patient vitals measurement, inpatient bed allocations',
    nurseProfile: {
      departmentId: 9, // Emergency
      licenseNumber: 'NUR-ET-20001',
      qualification: 'BSc Nursing, Critical Care',
      shift: 'morning'
    }
  },
  {
    role: 'receptionist',
    primaryEmail: 'reception@hospital.com',
    aliases: ['receptionist@hospital.com'],
    firstName: 'Hanna',
    lastName: 'Girma',
    phone: '+251 91 100 0006',
    gender: 'female',
    address: 'Main Entrance Reception Desk, Alem Ketema',
    notes: 'OPD registration, queue ticketing, appointment scheduling & check-in'
  },
  {
    role: 'cashier',
    primaryEmail: 'cashier@hospital.com',
    aliases: [],
    firstName: 'Mulugeta',
    lastName: 'Kassaye',
    phone: '+251 91 100 0007',
    gender: 'male',
    address: 'Cashier Booth 1 - Billing & POS, Alem Ketema',
    notes: 'Cashier POS, shift reconciliation, thermal receipt printing & payment collections'
  },
  {
    role: 'lab_technician',
    primaryEmail: 'labtech@hospital.com',
    aliases: ['lab@hospital.com'],
    firstName: 'Kidus',
    lastName: 'Daniel',
    phone: '+251 91 100 0008',
    gender: 'male',
    address: 'Central Diagnostic Laboratory, Alem Ketema',
    notes: 'Pathology investigations, specimen processing, test results validation'
  },
  {
    role: 'pharmacist',
    primaryEmail: 'pharmacist@hospital.com',
    aliases: ['pharmacy@hospital.com'],
    firstName: 'Selamawit',
    lastName: 'Alemu',
    phone: '+251 91 100 0009',
    gender: 'female',
    address: 'Central Pharmacy & Dispensation Counter, Alem Ketema',
    notes: 'Prescription dispensing, FEFO drug inventory, clinical safety validation'
  },
  {
    role: 'patient',
    primaryEmail: 'patient@hospital.com',
    aliases: [],
    firstName: 'Dawit',
    lastName: 'Kebede',
    phone: '+251 91 100 0010',
    gender: 'male',
    address: 'Kebele 03, Alem Ketema, Ethiopia',
    notes: 'Personal patient portal, appointment booking, lab results & prescriptions access',
    patientProfile: {
      dob: '1990-05-15',
      gender: 'male',
      bloodType: 'O+',
      allergies: 'Penicillin (mild rash)',
      emergencyContactName: 'Almaz Tessema',
      emergencyContactPhone: '+251 91 100 0099',
      insuranceNumber: 'ETH-INS-884920',
      medicalHistory: 'Hypertension managed on lifestyle and ACE inhibitor.'
    }
  }
];

async function seedUser(client, email, actor, passwordHash) {
  const cleanEmail = email.toLowerCase().trim();
  
  // Upsert user
  const existingUser = await client.query('SELECT id, role FROM users WHERE email = $1', [cleanEmail]);
  let userId;

  if (existingUser.rows.length > 0) {
    userId = existingUser.rows[0].id;
    await client.query(
      `UPDATE users SET 
        role = $1,
        password_hash = $2,
        first_name = $3,
        last_name = $4,
        phone = $5,
        gender = $6,
        address = $7,
        is_active = true,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $8`,
      [
        actor.role,
        passwordHash,
        actor.firstName,
        actor.lastName,
        actor.phone,
        actor.gender,
        actor.address,
        userId
      ]
    );
  } else {
    const insertRes = await client.query(
      `INSERT INTO users (email, password_hash, role, is_active, first_name, last_name, phone, gender, address)
       VALUES ($1, $2, $3, true, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        cleanEmail,
        passwordHash,
        actor.role,
        actor.firstName,
        actor.lastName,
        actor.phone,
        actor.gender,
        actor.address
      ]
    );
    userId = insertRes.rows[0].id;
  }

  // Handle role-specific profiles
  if (actor.doctorProfile && cleanEmail === actor.primaryEmail) {
    const dp = actor.doctorProfile;
    const docCheck = await client.query('SELECT id FROM doctors WHERE user_id = $1 OR email = $2', [userId, cleanEmail]);
    if (docCheck.rows.length > 0) {
      await client.query(
        `UPDATE doctors SET 
          user_id = $1,
          first_name = $2,
          last_name = $3,
          specialization = $4,
          phone = $5,
          email = $6,
          department_id = $7,
          qualification = $8,
          experience_years = $9,
          consultation_fee = $10,
          is_available = true,
          updated_at = CURRENT_TIMESTAMP
         WHERE id = $11`,
        [
          userId,
          actor.firstName,
          actor.lastName,
          dp.specialization,
          actor.phone,
          cleanEmail,
          dp.departmentId,
          dp.qualification,
          dp.experienceYears,
          dp.consultationFee,
          docCheck.rows[0].id
        ]
      );
    } else {
      await client.query(
        `INSERT INTO doctors (user_id, first_name, last_name, specialization, phone, email, department_id, license_number, qualification, experience_years, consultation_fee, is_available)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true)`,
        [
          userId,
          actor.firstName,
          actor.lastName,
          dp.specialization,
          actor.phone,
          cleanEmail,
          dp.departmentId,
          dp.licenseNumber,
          dp.qualification,
          dp.experienceYears,
          dp.consultationFee
        ]
      );
    }
  }

  if (actor.nurseProfile && cleanEmail === actor.primaryEmail) {
    const np = actor.nurseProfile;
    const nurseCheck = await client.query('SELECT id FROM nurses WHERE user_id = $1 OR email = $2', [userId, cleanEmail]);
    if (nurseCheck.rows.length > 0) {
      await client.query(
        `UPDATE nurses SET 
          user_id = $1,
          first_name = $2,
          last_name = $3,
          phone = $4,
          email = $5,
          department_id = $6,
          qualification = $7,
          shift = $8,
          is_available = true,
          updated_at = CURRENT_TIMESTAMP
         WHERE id = $9`,
        [
          userId,
          actor.firstName,
          actor.lastName,
          actor.phone,
          cleanEmail,
          np.departmentId,
          np.qualification,
          np.shift,
          nurseCheck.rows[0].id
        ]
      );
    } else {
      await client.query(
        `INSERT INTO nurses (user_id, first_name, last_name, phone, email, department_id, license_number, qualification, shift, is_available)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)`,
        [
          userId,
          actor.firstName,
          actor.lastName,
          actor.phone,
          cleanEmail,
          np.departmentId,
          np.licenseNumber,
          np.qualification,
          np.shift
        ]
      );
    }
  }

  if (actor.patientProfile && cleanEmail === actor.primaryEmail) {
    const pp = actor.patientProfile;
    const patientCheck = await client.query('SELECT id FROM patients WHERE user_id = $1 OR email = $2', [userId, cleanEmail]);
    let patientId;
    if (patientCheck.rows.length > 0) {
      patientId = patientCheck.rows[0].id;
      await client.query(
        `UPDATE patients SET 
          user_id = $1,
          first_name = $2,
          last_name = $3,
          date_of_birth = $4,
          gender = $5,
          phone = $6,
          email = $7,
          address = $8,
          blood_type = $9,
          allergies = $10,
          emergency_contact_name = $11,
          emergency_contact_phone = $12,
          insurance_number = $13,
          medical_history = $14,
          updated_at = CURRENT_TIMESTAMP
         WHERE id = $15`,
        [
          userId,
          actor.firstName,
          actor.lastName,
          pp.dob,
          pp.gender,
          actor.phone,
          cleanEmail,
          actor.address,
          pp.bloodType,
          pp.allergies,
          pp.emergencyContactName,
          pp.emergencyContactPhone,
          pp.insuranceNumber,
          pp.medicalHistory,
          patientId
        ]
      );
    } else {
      const pRes = await client.query(
        `INSERT INTO patients (user_id, first_name, last_name, date_of_birth, gender, phone, email, address, blood_type, allergies, emergency_contact_name, emergency_contact_phone, insurance_number, medical_history)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         RETURNING id`,
        [
          userId,
          actor.firstName,
          actor.lastName,
          pp.dob,
          pp.gender,
          actor.phone,
          cleanEmail,
          actor.address,
          pp.bloodType,
          pp.allergies,
          pp.emergencyContactName,
          pp.emergencyContactPhone,
          pp.insuranceNumber,
          pp.medicalHistory
        ]
      );
      patientId = pRes.rows[0].id;
    }

    // Ensure sample clinical records for the patient portal if none exist
    const aptCheck = await client.query('SELECT id FROM appointments WHERE patient_id = $1 LIMIT 1', [patientId]);
    if (!aptCheck.rows.length) {
      const doc = await client.query('SELECT id FROM doctors LIMIT 1');
      const docId = doc.rows[0]?.id;
      if (docId) {
        // Sample appointment
        const aptRes = await client.query(
          `INSERT INTO appointments (patient_id, doctor_id, appointment_date, status, reason, notes)
           VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL '1 day', 'confirmed', 'Routine Blood Pressure Follow-up', 'Patient advised to bring current medication log.')
           RETURNING id`,
          [patientId, docId]
        );
        const aptId = aptRes.rows[0].id;

        // Sample vitals
        await client.query(
          `INSERT INTO vitals (patient_id, temperature, blood_pressure_systolic, blood_pressure_diastolic, heart_rate, respiratory_rate, oxygen_saturation, weight, height, notes)
           VALUES ($1, 36.6, 125, 82, 72, 16, 98.5, 74.0, 175.0, 'Baseline healthy reading')`,
          [patientId]
        );

        // Sample diagnosis
        const diagRes = await client.query(
          `INSERT INTO diagnoses (patient_id, doctor_id, appointment_id, disease_name, icd_code, severity, symptoms, notes, is_chronic)
           VALUES ($1, $2, $3, 'Essential Primary Hypertension', 'I10', 'mild', 'Occasional mild morning headache', 'Well managed with lifestyle modifications.', true)
           RETURNING id`,
          [patientId, docId, aptId]
        );
        const diagId = diagRes.rows[0].id;

        // Sample prescription
        await client.query(
          `INSERT INTO prescriptions (patient_id, doctor_id, diagnosis_id, medication_name, dosage, frequency, duration, instructions, is_dispensed)
           VALUES ($1, $2, $3, 'Amlodipine 5mg', '5mg', 'Once daily (morning)', '30 days', 'Take with water before breakfast', false)`,
          [patientId, docId, diagId]
        );

        // Sample lab test
        const labRes = await client.query(
          `INSERT INTO lab_tests (patient_id, doctor_id, test_name, test_type, status, priority, notes)
           VALUES ($1, $2, 'Comprehensive Metabolic Panel (CMP)', 'Biochemistry', 'completed', 'normal', 'Annual health check')
           RETURNING id`,
          [patientId, docId]
        );
        
        await client.query(
          `INSERT INTO lab_results (lab_test_id, technician_id, results, reference_range, is_abnormal, notes)
           VALUES ($1, $2, 'Fasting Glucose: 92 mg/dL, Creatinine: 0.9 mg/dL, eGFR: >90', 'Glucose: 70-99 mg/dL, Creatinine: 0.7-1.3 mg/dL', false, 'All metabolic markers within normal parameters')`,
          [labRes.rows[0].id, userId]
        );

        // Sample invoice
        await client.query(
          `INSERT INTO invoices (patient_id, subtotal, total_amount, status, notes)
           VALUES ($1, 450.00, 450.00, 'paid', 'Consultation fee & routine lab tests')`,
          [patientId]
        );

        // Sample notification
        await client.query(
          `INSERT INTO notifications (user_id, patient_id, type, title, message)
           VALUES ($1, $2, 'system', 'Welcome to Patient Health Portal', 'You can now monitor your clinical appointments, lab test results, and prescriptions directly.')`,
          [userId, patientId]
        );
      }
    }
  }

  return userId;
}

async function main() {
  console.log('========================================================================');
  console.log('🏥  ALEM KETEMA ENAT HOSPITAL MANAGEMENT SYSTEM - ACTOR ACCOUNT SEEDER');
  console.log('========================================================================\n');
  console.log(`🔑 Master Password for all accounts: "${DEFAULT_PASSWORD}"\n`);

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const createdSummary = [];

    for (const actor of ACTORS) {
      // Seed primary email
      const primaryId = await seedUser(client, actor.primaryEmail, actor, passwordHash);
      createdSummary.push({
        role: actor.role,
        name: `${actor.firstName} ${actor.lastName}`,
        email: actor.primaryEmail,
        isPrimary: true,
        notes: actor.notes
      });

      // Seed aliases if any
      for (const aliasEmail of actor.aliases) {
        await seedUser(client, aliasEmail, actor, passwordHash);
        createdSummary.push({
          role: actor.role,
          name: `${actor.firstName} ${actor.lastName}`,
          email: aliasEmail,
          isPrimary: false,
          notes: `Alias for ${actor.primaryEmail}`
        });
      }
    }

    await client.query('COMMIT');

    console.log('✅ All actor accounts seeded successfully into the database!\n');
    console.log('------------------------------------------------------------------------');
    console.log('📋 CREATED & CONFIGURED ACTOR ACCOUNTS:');
    console.log('------------------------------------------------------------------------');
    createdSummary.forEach((acc, i) => {
      const tag = acc.isPrimary ? ' ⭐ Primary' : ' ↳ Alias  ';
      console.log(
        `${(i + 1).toString().padStart(2)}. [${acc.role.padEnd(16)}] ${tag} | Email: ${acc.email.padEnd(28)} | Name: ${acc.name}`
      );
    });
    console.log('------------------------------------------------------------------------\n');

    // Verification step: verify login ability for all accounts
    console.log('🔍 Verifying bcrypt password verification for every actor account...');
    let allValid = true;
    for (const acc of createdSummary) {
      const res = await client.query('SELECT password_hash, is_active FROM users WHERE email = $1', [acc.email]);
      if (!res.rows.length) {
        console.error(`❌ User missing: ${acc.email}`);
        allValid = false;
        continue;
      }
      const match = await bcrypt.compare(DEFAULT_PASSWORD, res.rows[0].password_hash);
      if (!match || !res.rows[0].is_active) {
        console.error(`❌ Password mismatch or inactive: ${acc.email}`);
        allValid = false;
      }
    }

    if (allValid) {
      console.log('✨ All 10 actor accounts + aliases verified 100% active and authenticable!\n');
    }

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding accounts:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
