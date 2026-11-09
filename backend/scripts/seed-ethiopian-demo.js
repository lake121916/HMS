/**
 * Alem Ketema Enat Hospital Management System
 * Comprehensive Ethiopian Demonstration Database Seeder
 * Candidate: Lake Awraris | Debre Berhan University | Department of Information Technology
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const pool = require('../src/config/database');

const DEMO_PASSWORD = process.env.DEMO_USER_PASSWORD || 'Hospital@2024';

const createToken = () => crypto.randomBytes(32).toString('base64url');

async function seedEthiopianDemoDatabase() {
  console.log('========================================================================');
  console.log(' ALEM KETEMA ENAT HOSPITAL MANAGEMENT SYSTEM - DEMO DATABASE SEEDER');
  console.log(' Candidate: Lake Awraris | Debre Berhan University');
  console.log('========================================================================\n');

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    console.log('Transaction started.');

    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

    // ── 1. CLEAN CONFIRMED BAD TEST DATA ────────────────────────────────────
    console.log('\n--- Step 1: Cleaning Confirmed Test Records ---');
    // Clean test patients like "TestSafety Patient" or "asdf"
    const cleanedPatients = await client.query(`
      UPDATE patients
      SET first_name = 'Almaz', last_name = 'Tessema', phone = '0911223344', address = 'Kebele 02, Alem Ketema',
          allergies = 'Sulfa drugs (mild rash)'
      WHERE first_name ILIKE '%test%' OR last_name ILIKE '%patient%'
      RETURNING id, first_name, last_name
    `);
    if (cleanedPatients.rows.length > 0) {
      console.log(`Cleaned ${cleanedPatients.rows.length} test patient records -> Almaz Tessema`);
    }

    // Clean test doctor like "Test Doc"
    const cleanedDocs = await client.query(`
      UPDATE doctors
      SET first_name = 'Hana', last_name = 'Girma', specialization = 'Dermatologist'
      WHERE first_name ILIKE '%test%' OR last_name ILIKE '%doc%'
      RETURNING id, first_name, last_name
    `);
    if (cleanedDocs.rows.length > 0) {
      console.log(`Cleaned ${cleanedDocs.rows.length} test doctor records -> Dr. Hana Girma`);
    }

    // ── 2. HOSPITAL DEPARTMENTS (10 Standard Hospital Departments) ──────────
    console.log('\n--- Step 2: Seeding 10 Standard Hospital Departments ---');
    const departmentsData = [
      { name: 'General Medicine', description: 'Comprehensive primary care, routine consultations, and preventive medicine.' },
      { name: 'Cardiology', description: 'Cardiovascular diagnostics, ECG, hypertension, and heart disease management.' },
      { name: 'Pediatrics', description: 'Comprehensive child healthcare, neonatal care, growth monitoring, and pediatric immunization.' },
      { name: 'Gynecology and Obstetrics', description: 'Maternal health, antenatal care, safe deliveries, and women\'s reproductive wellness.' },
      { name: 'Surgery', description: 'General surgery, minor procedures, pre-operative evaluations, and wound management.' },
      { name: 'Emergency Department', description: '24/7 critical trauma stabilization, acute triage, and emergency resuscitation.' },
      { name: 'Laboratory', description: 'Diagnostic pathology, hematology, clinical chemistry, urinalysis, and microbiology.' },
      { name: 'Pharmacy', description: 'Medication dispensing, FEFO batch control, prescription safety, and patient counseling.' },
      { name: 'Radiology', description: 'Diagnostic imaging, digital radiography (X-ray), and diagnostic ultrasound.' },
      { name: 'Dentistry', description: 'Oral healthcare, dental hygiene, restorations, extractions, and maxillofacial consultations.' }
    ];

    const departmentIdMap = {};
    for (const d of departmentsData) {
      // Check if existing by name or prefix (e.g. 'Emergency' vs 'Emergency Department')
      let res = await client.query('SELECT id FROM departments WHERE name = $1 OR name ILIKE $2', [d.name, d.name.split(' ')[0] + '%']);
      let deptId;
      if (res.rows.length > 0) {
        deptId = res.rows[0].id;
        await client.query(`
          UPDATE departments SET name = $1, description = $2, updated_at = CURRENT_TIMESTAMP
          WHERE id = $3
        `, [d.name, d.description, deptId]);
      } else {
        const ins = await client.query(`
          INSERT INTO departments (name, description, updated_at)
          VALUES ($1, $2, CURRENT_TIMESTAMP)
          RETURNING id
        `, [d.name, d.description]);
        deptId = ins.rows[0].id;
      }
      departmentIdMap[d.name] = deptId;
    }
    console.log(`Seeded/verified ${departmentsData.length} hospital departments.`);

    // ── 3. ETHIOPIAN DOCTORS (At least 8 Profiles) ─────────────────────────
    console.log('\n--- Step 3: Seeding Ethiopian Doctor Profiles ---');
    const doctorsData = [
      {
        email: 'dr.dawit@hospital.com',
        firstName: 'Dawit',
        lastName: 'Kebede',
        gender: 'male',
        phone: '+251 91 123 4501',
        deptId: 1, // General Medicine
        specialization: 'General Practitioner',
        qualification: 'MD, General Medicine (Addis Ababa University)',
        experienceYears: 9,
        consultationFee: 200.00,
        licenseNumber: 'DOC-ET-10001'
      },
      {
        email: 'dr.henok@hospital.com',
        firstName: 'Henok',
        lastName: 'Alemu',
        gender: 'male',
        phone: '+251 91 123 4502',
        deptId: 1, // General Medicine / Internal
        specialization: 'Internal Medicine',
        qualification: 'MD, Specialist in Internal Medicine (Jimma University)',
        experienceYears: 11,
        consultationFee: 280.00,
        licenseNumber: 'DOC-ET-10002'
      },
      {
        email: 'dr.meron@hospital.com',
        firstName: 'Meron',
        lastName: 'Tesfaye',
        gender: 'female',
        phone: '+251 91 123 4503',
        deptId: 3, // Pediatrics
        specialization: 'Pediatrician',
        qualification: 'MD, Pediatrics & Child Health (Hawassa University)',
        experienceYears: 8,
        consultationFee: 250.00,
        licenseNumber: 'DOC-ET-10003'
      },
      {
        email: 'dr.bethlehem@hospital.com',
        firstName: 'Bethlehem',
        lastName: 'Getachew',
        gender: 'female',
        phone: '+251 91 123 4504',
        deptId: 4, // Gynecology
        specialization: 'Gynecologist',
        qualification: 'MD, Obstetrics & Gynecology (Gondar University)',
        experienceYears: 12,
        consultationFee: 300.00,
        licenseNumber: 'DOC-ET-10004'
      },
      {
        email: 'dr.samuel@hospital.com',
        firstName: 'Samuel',
        lastName: 'Abebe',
        gender: 'male',
        phone: '+251 91 123 4505',
        deptId: 5, // Surgery
        specialization: 'Surgeon',
        qualification: 'MD, General Surgery (St. Paul Hospital Millennium Medical College)',
        experienceYears: 14,
        consultationFee: 350.00,
        licenseNumber: 'DOC-ET-10005'
      },
      {
        email: 'dr.rahel@hospital.com',
        firstName: 'Rahel',
        lastName: 'Mekonnen',
        gender: 'female',
        phone: '+251 91 123 4506',
        deptId: 6, // Emergency
        specialization: 'Emergency Medicine',
        qualification: 'MD, Emergency Medicine & Critical Care (AAU)',
        experienceYears: 7,
        consultationFee: 250.00,
        licenseNumber: 'DOC-ET-10006'
      },
      {
        email: 'dr.yonas@hospital.com',
        firstName: 'Yonas',
        lastName: 'Tadesse',
        gender: 'male',
        phone: '+251 91 123 4507',
        deptId: 2, // Cardiology
        specialization: 'Cardiologist',
        qualification: 'MD, Cardiology Fellowship (Black Lion Specialized Hospital)',
        experienceYears: 13,
        consultationFee: 350.00,
        licenseNumber: 'DOC-ET-10007'
      },
      {
        email: 'dr.hana@hospital.com',
        firstName: 'Hana',
        lastName: 'Girma',
        gender: 'female',
        phone: '+251 91 123 4508',
        deptId: 1, // Dermatology / General
        specialization: 'Dermatologist',
        qualification: 'MD, Clinical Dermatology (ALERT Center / AAU)',
        experienceYears: 6,
        consultationFee: 240.00,
        licenseNumber: 'DOC-ET-10008'
      }
    ];

    const doctorMap = {}; // email -> doc record
    for (const d of doctorsData) {
      // Upsert User
      let uRes = await client.query('SELECT id FROM users WHERE email = $1', [d.email]);
      let userId;
      if (uRes.rows.length > 0) {
        userId = uRes.rows[0].id;
        await client.query(`
          UPDATE users SET first_name = $1, last_name = $2, phone = $3, gender = $4,
                           password_hash = $5, role = 'doctor', is_active = true, updated_at = CURRENT_TIMESTAMP
          WHERE id = $6
        `, [d.firstName, d.lastName, d.phone, d.gender, passwordHash, userId]);
      } else {
        const ins = await client.query(`
          INSERT INTO users (email, password_hash, role, is_active, first_name, last_name, phone, gender, address)
          VALUES ($1, $2, 'doctor', true, $3, $4, $5, $6, 'Alem Ketema Hospital Quarters')
          RETURNING id
        `, [d.email, passwordHash, d.firstName, d.lastName, d.phone, d.gender]);
        userId = ins.rows[0].id;
      }

      // Upsert Doctor record
      let docRes = await client.query('SELECT id FROM doctors WHERE user_id = $1', [userId]);
      let docId;
      if (docRes.rows.length > 0) {
        docId = docRes.rows[0].id;
        await client.query(`
          UPDATE doctors SET first_name = $1, last_name = $2, phone = $3, email = $4, department_id = $5,
                             specialization = $6, qualification = $7, experience_years = $8,
                             consultation_fee = $9, license_number = $10, is_available = true, updated_at = CURRENT_TIMESTAMP
          WHERE id = $11
        `, [d.firstName, d.lastName, d.phone, d.email, d.deptId, d.specialization, d.qualification, d.experienceYears, d.consultationFee, d.licenseNumber, docId]);
      } else {
        const insDoc = await client.query(`
          INSERT INTO doctors (user_id, first_name, last_name, phone, email, department_id, specialization,
                               qualification, experience_years, consultation_fee, license_number, is_available)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true)
          RETURNING id
        `, [userId, d.firstName, d.lastName, d.phone, d.email, d.deptId, d.specialization, d.qualification, d.experienceYears, d.consultationFee, d.licenseNumber]);
        docId = insDoc.rows[0].id;
      }
      doctorMap[d.email] = { docId, userId, ...d };
    }
    console.log(`Seeded ${doctorsData.length} Ethiopian doctors.`);

    // ── 4. ETHIOPIAN NURSES (At least 10 Profiles) ─────────────────────────
    console.log('\n--- Step 4: Seeding 10 Ethiopian Nurse Profiles ---');
    const nursesData = [
      { email: 'nurse.selamawit@hospital.com', firstName: 'Selamawit', lastName: 'Tadesse', gender: 'female', phone: '+251 92 201 0001', deptId: 6, shift: 'morning', qual: 'BSc in Nursing, Emergency & Trauma' },
      { email: 'nurse.bethlehem@hospital.com', firstName: 'Bethlehem', lastName: 'Bekele', gender: 'female', phone: '+251 92 201 0002', deptId: 1, shift: 'morning', qual: 'BSc in Clinical Nursing' },
      { email: 'nurse.tigist@hospital.com', firstName: 'Tigist', lastName: 'Alemu', gender: 'female', phone: '+251 92 201 0003', deptId: 3, shift: 'evening', qual: 'BSc in Pediatric Nursing' },
      { email: 'nurse.hana@hospital.com', firstName: 'Hana', lastName: 'Worku', gender: 'female', phone: '+251 92 201 0004', deptId: 4, shift: 'night', qual: 'BSc in Midwifery & Neonatal Care' },
      { email: 'nurse.kalkidan@hospital.com', firstName: 'Kalkidan', lastName: 'Girma', gender: 'female', phone: '+251 92 201 0005', deptId: 5, shift: 'morning', qual: 'BSc in Perioperative Surgical Nursing' },
      { email: 'nurse.abebe@hospital.com', firstName: 'Abebe', lastName: 'Tesfaye', gender: 'male', phone: '+251 92 201 0006', deptId: 6, shift: 'night', qual: 'BSc in Emergency Critical Care' },
      { email: 'nurse.mihret@hospital.com', firstName: 'Mihret', lastName: 'Getachew', gender: 'female', phone: '+251 92 201 0007', deptId: 1, shift: 'evening', qual: 'Diploma in Comprehensive Nursing' },
      { email: 'nurse.rahel@hospital.com', firstName: 'Rahel', lastName: 'Kebede', gender: 'female', phone: '+251 92 201 0008', deptId: 2, shift: 'morning', qual: 'BSc in Cardiac Critical Care' },
      { email: 'nurse.meseret@hospital.com', firstName: 'Meseret', lastName: 'Abebe', gender: 'female', phone: '+251 92 201 0009', deptId: 3, shift: 'morning', qual: 'BSc in Child Healthcare' },
      { email: 'nurse.yared@hospital.com', firstName: 'Yared', lastName: 'Mekonnen', gender: 'male', phone: '+251 92 201 0010', deptId: 6, shift: 'evening', qual: 'BSc in Emergency & Disaster Care' }
    ];

    const nurseMap = [];
    let nurseIndex = 1;
    for (const n of nursesData) {
      let uRes = await client.query('SELECT id FROM users WHERE email = $1', [n.email]);
      let userId;
      if (uRes.rows.length > 0) {
        userId = uRes.rows[0].id;
        await client.query(`
          UPDATE users SET first_name = $1, last_name = $2, phone = $3, gender = $4,
                           password_hash = $5, role = 'nurse', is_active = true, updated_at = CURRENT_TIMESTAMP
          WHERE id = $6
        `, [n.firstName, n.lastName, n.phone, n.gender, passwordHash, userId]);
      } else {
        const ins = await client.query(`
          INSERT INTO users (email, password_hash, role, is_active, first_name, last_name, phone, gender, address)
          VALUES ($1, $2, 'nurse', true, $3, $4, $5, $6, 'Alem Ketema Hospital Nursing Wing')
          RETURNING id
        `, [n.email, passwordHash, n.firstName, n.lastName, n.phone, n.gender]);
        userId = ins.rows[0].id;
      }

      let nRes = await client.query('SELECT id FROM nurses WHERE user_id = $1', [userId]);
      let nurseId;
      const license = `NUR-ET-${String(20000 + nurseIndex)}`;
      if (nRes.rows.length > 0) {
        nurseId = nRes.rows[0].id;
        await client.query(`
          UPDATE nurses SET first_name = $1, last_name = $2, phone = $3, email = $4, department_id = $5,
                            qualification = $6, shift = $7, license_number = $8, is_available = true, updated_at = CURRENT_TIMESTAMP
          WHERE id = $9
        `, [n.firstName, n.lastName, n.phone, n.email, n.deptId, n.qual, n.shift, license, nurseId]);
      } else {
        const insN = await client.query(`
          INSERT INTO nurses (user_id, first_name, last_name, phone, email, department_id, qualification, shift, license_number, is_available)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
          RETURNING id
        `, [userId, n.firstName, n.lastName, n.phone, n.email, n.deptId, n.qual, n.shift, license]);
        nurseId = insN.rows[0].id;
      }
      nurseMap.push({ nurseId, userId, ...n });
      nurseIndex++;
    }
    console.log(`Seeded ${nursesData.length} Ethiopian nurses.`);

    // ── 5. ETHIOPIAN PATIENTS (At least 30 Profiles) ───────────────────────
    console.log('\n--- Step 5: Seeding 32 Realistic Ethiopian Patients ---');
    const patientsData = [
      { firstName: 'Lake', lastName: 'Awraris', dob: '1998-05-15', gender: 'male', phone: '0947807133', blood: 'O+', allergies: 'Penicillin (severe anaphylaxis)', address: 'Kebele 01, Alem Ketema, Amhara', notes: 'Academic Project Lead & Demonstrator. Known Penicillin hypersensitivity.' },
      { firstName: 'Azanaw', lastName: 'Nega', dob: '1987-11-20', gender: 'male', phone: '0948826388', blood: 'A+', allergies: 'NSAIDs (gastric distress)', address: 'Kebele 02, Alem Ketema, Amhara', notes: 'Primary demonstration patient for reception & clinical flow.' },
      { firstName: 'Abebe', lastName: 'Kebede', dob: '1975-03-12', gender: 'male', phone: '0911445566', blood: 'B+', allergies: 'None documented', address: 'Kebele 03, Alem Ketema, Amhara', notes: 'Hypertension follow-up.' },
      { firstName: 'Selamawit', lastName: 'Tesfaye', dob: '1992-08-25', gender: 'female', phone: '0922334455', blood: 'O+', allergies: 'Ciprofloxacin', address: 'Kebele 01, Alem Ketema, Amhara', notes: 'Antenatal care & routine screening.' },
      { firstName: 'Bethlehem', lastName: 'Tadesse', dob: '1989-04-18', gender: 'female', phone: '0933445566', blood: 'AB+', allergies: 'Sulfa drugs', address: 'Kebele 04, Alem Ketema, Amhara', notes: 'Post-operative recovery.' },
      { firstName: 'Henok', lastName: 'Mekonnen', dob: '1982-12-05', gender: 'male', phone: '0911556677', blood: 'A-', allergies: 'None documented', address: 'Woreda 02, North Shewa, Amhara', notes: 'Type 2 diabetes management.' },
      { firstName: 'Meron', lastName: 'Getachew', dob: '1995-07-30', gender: 'female', phone: '0944556677', blood: 'O-', allergies: 'Aspirin', address: 'Kebele 02, Alem Ketema, Amhara', notes: 'Seasonal asthma & allergic rhinitis.' },
      { firstName: 'Dawit', lastName: 'Alemu', dob: '2001-09-14', gender: 'male', phone: '0955667788', blood: 'B+', allergies: 'None documented', address: 'Kebele 03, Alem Ketema, Amhara', notes: 'Acute febrile illness (Malaria).' },
      { firstName: 'Rahel', lastName: 'Abebe', dob: '1984-06-22', gender: 'female', phone: '0966778899', blood: 'A+', allergies: 'Latex', address: 'Kebele 01, Alem Ketema, Amhara', notes: 'Migraine with aura.' },
      { firstName: 'Yonas', lastName: 'Girma', dob: '1978-02-17', gender: 'male', phone: '0977889900', blood: 'O+', allergies: 'None documented', address: 'Kebele 04, Alem Ketema, Amhara', notes: 'Cardiovascular risk evaluation.' },
      { firstName: 'Kalkidan', lastName: 'Worku', dob: '1996-10-10', gender: 'female', phone: '0911990011', blood: 'B-', allergies: 'Penicillin', address: 'Kebele 02, Alem Ketema, Amhara', notes: 'Urinary tract infection.' },
      { firstName: 'Mihret', lastName: 'Bekele', dob: '1980-01-28', gender: 'female', phone: '0922001122', blood: 'AB-', allergies: 'None documented', address: 'Kebele 03, Alem Ketema, Amhara', notes: 'Iron deficiency anemia.' },
      { firstName: 'Samuel', lastName: 'Tadesse', dob: '1990-11-03', gender: 'male', phone: '0933112233', blood: 'O+', allergies: 'None documented', address: 'Woreda 01, North Shewa, Amhara', notes: 'Sports injury, right knee sprain.' },
      { firstName: 'Tigist', lastName: 'Kebede', dob: '1986-05-09', gender: 'female', phone: '0944223344', blood: 'A+', allergies: 'Metformin (gastrointestinal)', address: 'Kebele 01, Alem Ketema, Amhara', notes: 'Endocrine consultation.' },
      { firstName: 'Hana', lastName: 'Mekonnen', dob: '1993-03-27', gender: 'female', phone: '0955334455', blood: 'B+', allergies: 'None documented', address: 'Kebele 04, Alem Ketema, Amhara', notes: 'Acute gastroenteritis.' },
      { firstName: 'Meseret', lastName: 'Alemu', dob: '1973-08-16', gender: 'female', phone: '0966445566', blood: 'O+', allergies: 'None documented', address: 'Kebele 02, Alem Ketema, Amhara', notes: 'Chronic osteoarthritis.' },
      { firstName: 'Biniam', lastName: 'Haile', dob: '1985-09-19', gender: 'male', phone: '0911667788', blood: 'A-', allergies: 'None documented', address: 'Kebele 03, Alem Ketema, Amhara', notes: 'Typhoid fever recovery.' },
      { firstName: 'Sara', lastName: 'Yilma', dob: '1999-12-01', gender: 'female', phone: '0922778899', blood: 'O+', allergies: 'Codeine', address: 'Kebele 01, Alem Ketema, Amhara', notes: 'Upper respiratory tract infection.' },
      { firstName: 'Solomon', lastName: 'Desta', dob: '1968-04-12', gender: 'male', phone: '0933889900', blood: 'B+', allergies: 'Ciprofloxacin, NSAIDs', address: 'Woreda 03, North Shewa, Amhara', notes: 'Hypertensive heart disease.' },
      { firstName: 'Hiwot', lastName: 'Gebre', dob: '1991-07-07', gender: 'female', phone: '0944990011', blood: 'A+', allergies: 'None documented', address: 'Kebele 04, Alem Ketema, Amhara', notes: 'Routine prenatal follow-up.' },
      { firstName: 'Yohannes', lastName: 'Kassahun', dob: '1983-10-24', gender: 'male', phone: '0955001122', blood: 'O+', allergies: 'Sulfa drugs', address: 'Kebele 02, Alem Ketema, Amhara', notes: 'Bacterial pneumonia.' },
      { firstName: 'Almaz', lastName: 'Tessema', dob: '1979-05-14', gender: 'female', phone: '0911223344', blood: 'B+', allergies: 'Sulfa drugs (mild rash)', address: 'Kebele 02, Alem Ketema, Amhara', notes: 'Preventive check-up and vitals.' },
      { firstName: 'Tadesse', lastName: 'Worku', dob: '1965-02-18', gender: 'male', phone: '0977223344', blood: 'A+', allergies: 'None documented', address: 'Kebele 03, Alem Ketema, Amhara', notes: 'Cataract preoperative assessment.' },
      { firstName: 'Kidus', lastName: 'Daniel', dob: '2004-06-11', gender: 'male', phone: '0988334455', blood: 'O+', allergies: 'None documented', address: 'Kebele 01, Alem Ketema, Amhara', notes: 'Pediatric infectious disease check.' },
      { firstName: 'Mulugeta', lastName: 'Kassaye', dob: '1971-11-29', gender: 'male', phone: '0999445566', blood: 'AB+', allergies: 'None documented', address: 'Kebele 04, Alem Ketema, Amhara', notes: 'Chronic low back pain.' },
      { firstName: 'Chala', lastName: 'Deressa', dob: '1994-01-15', gender: 'male', phone: '0912349988', blood: 'O+', allergies: 'None documented', address: 'Kebele 02, Alem Ketema, Amhara', notes: 'Routine employer medical examination.' },
      { firstName: 'Fikru', lastName: 'Tefera', dob: '1988-03-08', gender: 'male', phone: '0923456789', blood: 'B+', allergies: 'None documented', address: 'Kebele 01, Alem Ketema, Amhara', notes: 'Peptic ulcer disease.' },
      { firstName: 'Genet', lastName: 'Assefa', dob: '1997-09-23', gender: 'female', phone: '0934567890', blood: 'A-', allergies: 'Penicillin', address: 'Kebele 03, Alem Ketema, Amhara', notes: 'Dermatitis and eczema.' },
      { firstName: 'Tariku', lastName: 'Demisse', dob: '1976-12-14', gender: 'male', phone: '0945678901', blood: 'O+', allergies: 'None documented', address: 'Woreda 02, North Shewa, Amhara', notes: 'Type 2 diabetes with peripheral neuropathy.' },
      { firstName: 'Aster', lastName: 'Bedaso', dob: '1981-08-04', gender: 'female', phone: '0956789012', blood: 'AB-', allergies: 'None documented', address: 'Kebele 04, Alem Ketema, Amhara', notes: 'Thyroid nodule evaluation.' },
      { firstName: 'Birhanu', lastName: 'Ayele', dob: '1962-07-17', gender: 'male', phone: '0967890123', blood: 'O+', allergies: 'Aspirin', address: 'Kebele 02, Alem Ketema, Amhara', notes: 'Benign prostatic hyperplasia (BPH).' },
      { firstName: 'Emebet', lastName: 'Shiferaw', dob: '2000-04-29', gender: 'female', phone: '0978901234', blood: 'A+', allergies: 'None documented', address: 'Kebele 01, Alem Ketema, Amhara', notes: 'Acute tonsillitis.' }
    ];

    const seededPatients = [];
    for (const p of patientsData) {
      let ptRes = await client.query(
        'SELECT id FROM patients WHERE phone = $1 OR (first_name = $2 AND last_name = $3)',
        [p.phone, p.firstName, p.lastName]
      );

      let patientId;
      if (ptRes.rows.length > 0) {
        patientId = ptRes.rows[0].id;
        await client.query(`
          UPDATE patients SET first_name = $1, last_name = $2, date_of_birth = $3, gender = $4,
                             phone = $5, blood_type = $6, allergies = $7, address = $8,
                             medical_history = $9, emergency_contact_name = 'Family Contact',
                             emergency_contact_phone = '+251 91 199 0000', insurance_number = $10,
                             updated_at = CURRENT_TIMESTAMP
          WHERE id = $11
        `, [p.firstName, p.lastName, p.dob, p.gender, p.phone, p.blood, p.allergies, p.address, p.notes, `ETH-INS-${1000 + patientId}`, patientId]);
      } else {
        const insP = await client.query(`
          INSERT INTO patients (first_name, last_name, date_of_birth, gender, phone, blood_type,
                                allergies, address, medical_history, emergency_contact_name, emergency_contact_phone, insurance_number)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Family Contact', '+251 91 199 0000', $10)
          RETURNING id
        `, [p.firstName, p.lastName, p.dob, p.gender, p.phone, p.blood, p.allergies, p.address, p.notes, `ETH-INS-${Math.floor(100000 + Math.random()*900000)}`]);
        patientId = insP.rows[0].id;
      }

      // Ensure active cryptographic QR token exists
      let qrRes = await client.query('SELECT id, token FROM patient_qr_identities WHERE patient_id = $1 AND is_active = true', [patientId]);
      if (qrRes.rows.length === 0) {
        await client.query(`
          INSERT INTO patient_qr_identities (patient_id, token, is_active, created_by)
          VALUES ($1, $2, true, 1)
        `, [patientId, createToken()]);
      }

      seededPatients.push({ id: patientId, ...p });
    }
    console.log(`Seeded/verified ${seededPatients.length} Ethiopian patients with active cryptographic QR tokens.`);

    // ── 6. REALISTIC MEDICATIONS CATALOG (In ETB) ──────────────────────────
    console.log('\n--- Step 6: Seeding Medications & Inventory Catalog ---');
    const medsData = [
      { name: 'Paracetamol 500mg', generic: 'Paracetamol', mfr: 'EPHARM (Ethiopian Pharmaceuticals)', cat: 'Analgesics / Antipyretics', price: 15.00, reorder: 500, stock: 3200, unit: 'Tablets', desc: 'First-line pain and fever relief.' },
      { name: 'Amoxicillin 500mg', generic: 'Amoxicillin Trihydrate', mfr: 'Cadila Pharmaceuticals Ethiopia', cat: 'Antibiotics / Penicillins', price: 35.00, reorder: 400, stock: 2100, unit: 'Capsules', desc: 'Broad-spectrum beta-lactam antibiotic.' },
      { name: 'Coartem (Artemether-Lumefantrine)', generic: 'Artemether 20mg / Lumefantrine 120mg', mfr: 'Novartis / MoH Ethiopia', cat: 'Antimalarials', price: 65.00, reorder: 300, stock: 1850, unit: 'Tablets', desc: 'First-line ACT for uncomplicated Plasmodium falciparum malaria.' },
      { name: 'Metformin 500mg', generic: 'Metformin Hydrochloride', mfr: 'Medtech Ethiopia', cat: 'Antidiabetics', price: 28.00, reorder: 350, stock: 2400, unit: 'Tablets', desc: 'Biguanide antihyperglycemic agent for Type 2 Diabetes.' },
      { name: 'Amlodipine 5mg', generic: 'Amlodipine Besylate', mfr: 'Julphar Pharmaceuticals Ethiopia', cat: 'Antihypertensives', price: 32.00, reorder: 250, stock: 1600, unit: 'Tablets', desc: 'Dihydropyridine calcium channel blocker for hypertension.' },
      { name: 'Oral Rehydration Salts (ORS)', generic: 'Sodium Chloride, Glucose, Potassium, Citrate', mfr: 'EPHARM', cat: 'Electrolytes & Fluid Replacement', price: 18.00, reorder: 600, stock: 4500, unit: 'Sachets', desc: 'WHO-formula electrolyte replacement for acute diarrhea.' },
      { name: 'Omeprazole 20mg', generic: 'Omeprazole', mfr: 'Cadila Ethiopia', cat: 'Gastrointestinal / PPI', price: 42.00, reorder: 300, stock: 1950, unit: 'Capsules', desc: 'Proton pump inhibitor for peptic ulcer and GERD.' },
      { name: 'Salbutamol Inhaler 100mcg', generic: 'Salbutamol Sulfate', mfr: 'GlaxoSmithKline', cat: 'Respiratory / Bronchodilators', price: 160.00, reorder: 80, stock: 420, unit: 'Canisters', desc: 'Short-acting beta-2 agonist for acute bronchospasm & asthma.' },
      { name: 'Ferrous Sulfate + Folic Acid', generic: 'Dried Ferrous Sulfate 200mg + Folic Acid 0.4mg', mfr: 'EPHARM', cat: 'Hematinics / Antianemics', price: 22.00, reorder: 400, stock: 3100, unit: 'Tablets', desc: 'Iron supplement for iron deficiency anemia and maternal care.' },
      { name: 'Ciprofloxacin 500mg', generic: 'Ciprofloxacin Hydrochloride', mfr: 'Medtech Ethiopia', cat: 'Antibiotics / Fluoroquinolones', price: 48.00, reorder: 200, stock: 1450, unit: 'Tablets', desc: 'Broad-spectrum fluoroquinolone for UTI and enteric infections.' },
      { name: 'Ceftriaxone 1g Injection', generic: 'Ceftriaxone Sodium', mfr: 'Sandoz / Ethiopian Med Supplies', cat: 'Injectable Antibiotics / Cephalosporins', price: 120.00, reorder: 150, stock: 890, unit: 'Vials', desc: 'Third-generation cephalosporin for severe hospital infections.' },
      { name: 'Ibuprofen 400mg', generic: 'Ibuprofen', mfr: 'EPHARM', cat: 'NSAIDs', price: 20.00, reorder: 400, stock: 2800, unit: 'Tablets', desc: 'Anti-inflammatory and analgesic for musculoskeletal pain.' }
    ];

    const seededMeds = [];
    for (const m of medsData) {
      let mRes = await client.query('SELECT id FROM medicines WHERE name = $1', [m.name]);
      let medId;
      if (mRes.rows.length > 0) {
        medId = mRes.rows[0].id;
        await client.query(`
          UPDATE medicines SET generic_name = $1, manufacturer = $2, category = $3,
                               unit_price = $4, reorder_level = $5, unit = $6, description = $7,
                               updated_at = CURRENT_TIMESTAMP
          WHERE id = $8
        `, [m.generic, m.mfr, m.cat, m.price, m.reorder, m.unit, m.desc, medId]);
      } else {
        const insM = await client.query(`
          INSERT INTO medicines (name, generic_name, manufacturer, category, unit_price, reorder_level, unit, description)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING id
        `, [m.name, m.generic, m.mfr, m.cat, m.price, m.reorder, m.unit, m.desc]);
        medId = insM.rows[0].id;
      }

      // Upsert into inventory
      const batchNum = `BATCH-ET-${Math.floor(1000 + Math.random()*9000)}`;
      await client.query(`
        INSERT INTO inventory (medicine_id, quantity, reorder_level, batch_number, expiry_date, location, updated_at)
        VALUES ($1, $2, $3, $4, CURRENT_DATE + INTERVAL '2 years', 'Main Pharmacy Shelf A', CURRENT_TIMESTAMP)
        ON CONFLICT DO NOTHING
      `, [medId, m.stock, m.reorder, batchNum]);

      seededMeds.push({ id: medId, ...m });
    }
    console.log(`Seeded ${seededMeds.length} medications and inventory items.`);

    // ── 7. HOSPITAL BEDS & WARDS ───────────────────────────────────────────
    console.log('\n--- Step 7: Seeding Hospital Inpatient Beds ---');
    const wards = [
      { name: 'Medical Ward A', type: 'general' },
      { name: 'Surgical Ward B', type: 'general' },
      { name: 'Pediatric Ward C', type: 'pediatric' },
      { name: 'Maternity Ward D', type: 'general' },
      { name: 'Emergency Observation', type: 'emergency' }
    ];
    for (let wIdx = 0; wIdx < wards.length; wIdx++) {
      const ward = wards[wIdx];
      for (let bNum = 1; bNum <= 4; bNum++) {
        const bedCode = `BED-${ward.name.substring(0, 3).toUpperCase()}-${String(bNum).padStart(2, '0')}`;
        await client.query(`
          INSERT INTO beds (ward, bed_number, bed_type, status, daily_rate)
          VALUES ($1, $2, $3, 'available', 150.00)
          ON CONFLICT DO NOTHING
        `, [ward.name, bedCode, ward.type]);
      }
    }
    console.log('Seeded 20 hospital inpatient beds across 5 wards.');

    // ── 8. CLINICAL ENCOUNTERS, APPOINTMENTS, TRIAGE & DIAGNOSES ──────────
    console.log('\n--- Step 8: Seeding Appointments, Encounters, Triage & Diagnoses ---');
    const clinicalScenarios = [
      { disease: 'Acute Plasmodium Falciparum Malaria', icd: 'B50.9', severity: 'moderate', complaint: 'High fever, rigors, headache, and profuse sweating for 3 days.', priority: 'urgent', temp: 39.2, bpS: 118, bpD: 76, hr: 104, rr: 20, spo2: 97, med: 'Coartem (Artemether-Lumefantrine)', lab: 'Blood Film for Malaria Parasites (BF)', labRes: 'P. falciparum trophozoites (ring stage) observed; 3+ positive' },
      { disease: 'Typhoid Fever (Enteric Fever)', icd: 'A01.0', severity: 'moderate', complaint: 'Step-ladder fever, persistent headache, abdominal pain, and constipation.', priority: 'normal', temp: 38.8, bpS: 110, bpD: 70, hr: 88, rr: 18, spo2: 98, med: 'Ciprofloxacin 500mg', lab: 'Widal Agglutination Test / Blood Culture', labRes: 'S. typhi O titer 1:320, H titer 1:160 (Diagnostic positive)' },
      { disease: 'Acute Bacterial Pneumonia', icd: 'J18.9', severity: 'severe', complaint: 'Productive cough with rust-colored sputum, right pleuritic chest pain, dyspnea.', priority: 'emergency', temp: 39.4, bpS: 130, bpD: 82, hr: 112, rr: 26, spo2: 92, med: 'Ceftriaxone 1g Injection', lab: 'Complete Blood Count (CBC) & Chest X-Ray', labRes: 'Leukocytosis: WBC 16,800/uL with 86% neutrophils; Consolidation right lower lobe' },
      { disease: 'Acute Gastroenteritis with Moderate Dehydration', icd: 'A09', severity: 'moderate', complaint: 'Watery diarrhea > 6 times in 24 hours, vomiting, and dry mouth.', priority: 'urgent', temp: 37.8, bpS: 102, bpD: 64, hr: 98, rr: 20, spo2: 98, med: 'Oral Rehydration Salts (ORS)', lab: 'Stool Microscopy & Routine Examination', labRes: 'Stool Exam: Pus cells 5-8/HPF, RBCs 2-4/HPF, no ova or parasites detected' },
      { disease: 'Essential Hypertension (Stage 2)', icd: 'I10', severity: 'moderate', complaint: 'Occipital throbbing headache and intermittent dizziness upon standing.', priority: 'normal', temp: 36.8, bpS: 164, bpD: 102, hr: 82, rr: 16, spo2: 99, med: 'Amlodipine 5mg', lab: 'Serum Creatinine & Lipid Panel', labRes: 'Creatinine 0.9 mg/dL (Normal); Total Cholesterol 224 mg/dL' },
      { disease: 'Type 2 Diabetes Mellitus (Uncontrolled)', icd: 'E11.9', severity: 'moderate', complaint: 'Polyuria, polydipsia, unexplained weight loss of 4 kg over two months.', priority: 'normal', temp: 36.9, bpS: 128, bpD: 80, hr: 78, rr: 16, spo2: 98, med: 'Metformin 500mg', lab: 'Fasting Blood Glucose (FBG) & HbA1c', labRes: 'Fasting Plasma Glucose 198 mg/dL; HbA1c 8.6% (Uncontrolled)' },
      { disease: 'Iron Deficiency Anemia', icd: 'D50.9', severity: 'mild', complaint: 'Chronic generalized fatigue, pale conjunctiva, and exertional shortness of breath.', priority: 'normal', temp: 36.7, bpS: 108, bpD: 68, hr: 86, rr: 18, spo2: 98, med: 'Ferrous Sulfate + Folic Acid', lab: 'Complete Blood Count (CBC)', labRes: 'Hemoglobin 8.8 g/dL (Moderate Anemia); Microcytic hypochromic indices' },
      { disease: 'Acute Cystitis (Urinary Tract Infection)', icd: 'N30.0', severity: 'mild', complaint: 'Dysuria, urinary frequency, urgency, and suprapubic discomfort.', priority: 'normal', temp: 37.4, bpS: 114, bpD: 72, hr: 76, rr: 16, spo2: 99, med: 'Ciprofloxacin 500mg', lab: 'Urinalysis Complete Dipstick & Microscopy', labRes: 'Urine: Leukocyte esterase +++, Nitrite positive, WBC > 50/HPF' },
      { disease: 'Bronchial Asthma (Acute Exacerbation)', icd: 'J45.901', severity: 'severe', complaint: 'Sudden onset expiratory wheezing, chest tightness, and tachypnea.', priority: 'emergency', temp: 37.1, bpS: 126, bpD: 78, hr: 110, rr: 28, spo2: 91, med: 'Salbutamol Inhaler 100mcg', lab: 'Peak Expiratory Flow Rate & Blood Gas', labRes: 'PEFR 45% of predicted; Marked expiratory wheezes bilaterally' },
      { disease: 'Acute Upper Respiratory Tract Infection (Common Cold)', icd: 'J06.9', severity: 'mild', complaint: 'Rhinorrhea, sneezing, sore throat, and mild low-grade fever.', priority: 'normal', temp: 37.6, bpS: 116, bpD: 74, hr: 74, rr: 16, spo2: 99, med: 'Paracetamol 500mg', lab: 'Rapid Streptococcal Antigen Screening', labRes: 'Negative for Group A Streptococcus; Viral etiology suspected' }
    ];

    const primaryDoc = Object.values(doctorMap)[0] || { docId: 1, userId: 1 };
    const primaryNurse = nurseMap[0] || { nurseId: 1, userId: 1 };

    let appointmentCount = 0;
    let encounterCount = 0;
    let triageCount = 0;
    let labTestCount = 0;
    let labResultCount = 0;
    let prescriptionCount = 0;
    let invoiceCount = 0;
    let paymentCount = 0;

    for (let i = 0; i < seededPatients.length; i++) {
      const patient = seededPatients[i];
      const scenario = clinicalScenarios[i % clinicalScenarios.length];
      const doctor = Object.values(doctorMap)[i % Object.keys(doctorMap).length] || primaryDoc;
      const nurse = nurseMap[i % nurseMap.length] || primaryNurse;

      // 1. Create Appointment (At least 20+)
      const apptRes = await client.query(`
        INSERT INTO appointments (patient_id, doctor_id, appointment_date, status, reason, notes)
        VALUES ($1, $2, CURRENT_TIMESTAMP - ($3 || ' days')::INTERVAL, 'completed', $4, $5)
        RETURNING id
      `, [patient.id, doctor.docId, i % 14, scenario.complaint, `Consultation with Dr. ${doctor.firstName} ${doctor.lastName}`]);
      const apptId = apptRes.rows[0].id;
      appointmentCount++;

      // 2. Create Patient Encounter (At least 15+)
      if (i < 24) {
        const encNum = `ENC-${new Date().getFullYear()}-${String(1000 + i)}`;
        const encRes = await client.query(`
          INSERT INTO patient_encounters (patient_id, encounter_number, encounter_type, status, created_by)
          VALUES ($1, $2, 'outpatient', 'completed', $3)
          RETURNING id
        `, [patient.id, encNum, doctor.userId]);
        const encId = encRes.rows[0].id;
        encounterCount++;

        // 3. Create Triage Assessment
        await client.query(`
          INSERT INTO triage_assessments (
            encounter_id, patient_id, temperature, blood_pressure_systolic, blood_pressure_diastolic,
            heart_rate, respiratory_rate, oxygen_saturation, weight, height, chief_complaint,
            priority, assessed_by, assessed_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 64.5, 168.0, $9, $10, $11, CURRENT_TIMESTAMP - ($12 || ' days')::INTERVAL)
        `, [
          encId, patient.id, scenario.temp, scenario.bpS, scenario.bpD,
          scenario.hr, scenario.rr, scenario.spo2, scenario.complaint,
          scenario.priority, nurse.userId, i % 14
        ]);
        triageCount++;

        // 4. Create Diagnosis
        const diagRes = await client.query(`
          INSERT INTO diagnoses (
            patient_id, doctor_id, appointment_id, encounter_id, diagnosis_date,
            disease_name, icd_code, severity, symptoms, notes, is_chronic
          ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP - ($5 || ' days')::INTERVAL, $6, $7, $8, $9, $10, $11)
          RETURNING id
        `, [
          patient.id, doctor.docId, apptId, encId, i % 14,
          scenario.disease, scenario.icd, scenario.severity, scenario.complaint,
          `Clinical examination confirms ${scenario.disease}. Follow standard national treatment protocol.`,
          scenario.disease.includes('Hypertension') || scenario.disease.includes('Diabetes')
        ]);
        const diagId = diagRes.rows[0].id;

        // 5. Create Lab Test (At least 15+)
        let labTestId = null;
        if (i < 18) {
          const labPriority = scenario.priority === 'emergency' ? 'urgent' : (scenario.priority === 'urgent' ? 'high' : 'normal');
          const labRes = await client.query(`
            INSERT INTO lab_tests (patient_id, doctor_id, encounter_id, test_name, test_type, requested_date, status, priority, notes)
            VALUES ($1, $2, $3, $4, 'Diagnostic Investigation', CURRENT_TIMESTAMP - ($5 || ' days')::INTERVAL, 'completed', $6, $7)
            RETURNING id
          `, [patient.id, doctor.docId, encId, scenario.lab, i % 14, labPriority, 'Stat diagnostic laboratory order.']);
          labTestId = labRes.rows[0].id;
          labTestCount++;

          // 6. Create Lab Result (At least 10+)
          if (i < 14) {
            await client.query(`
              INSERT INTO lab_results (lab_test_id, technician_id, result_date, results, reference_range, is_abnormal, notes)
              VALUES ($1, $2, CURRENT_TIMESTAMP - ($3 || ' days')::INTERVAL, $4, 'Standard Hospital Reference Range', $5, $6)
            `, [labTestId, 1, i % 14, scenario.labRes, scenario.severity !== 'mild', 'Verified by Central Diagnostic Laboratory Supervisor.']);
            labResultCount++;
          }
        }

        // 7. Create Prescription (At least 15+)
        const matchedMed = seededMeds.find(m => m.name.includes(scenario.med.split(' ')[0])) || seededMeds[0];
        const rxRes = await client.query(`
          INSERT INTO prescriptions (
            patient_id, doctor_id, diagnosis_id, encounter_id, medication_id,
            medication_name, dosage, frequency, duration, instructions, is_dispensed,
            quantity, quantity_dispensed, status, workflow_status
          ) VALUES ($1, $2, $3, $4, $5, $6, '1 tab', 'TDS (3x daily)', '5 days', 'Take after meals with plenty of water.', true, 15, 15, 'dispensed', 'dispensed')
          RETURNING id
        `, [patient.id, doctor.docId, diagId, encId, matchedMed.id, matchedMed.name]);
        const rxId = rxRes.rows[0].id;
        prescriptionCount++;

        // 8. Create Invoices & Payments in ETB (At least 10+)
        if (i < 15) {
          const consultationFee = doctor.consultationFee || 200.00;
          const medPrice = matchedMed.price * 2;
          const labFee = 150.00;
          const totalAmt = consultationFee + medPrice + labFee;

          const invRes = await client.query(`
            INSERT INTO invoices (patient_id, encounter_id, doctor_id, invoice_date, due_date, subtotal, tax, discount, total_amount, status, notes)
            VALUES ($1, $2, $3, CURRENT_TIMESTAMP - ($4 || ' days')::INTERVAL, CURRENT_DATE, $5, 0, 0, $5, 'paid', 'Standard Outpatient Consultation, Diagnostics & Pharmacy')
            RETURNING id
          `, [patient.id, encId, doctor.docId, i % 14, totalAmt]);
          const invId = invRes.rows[0].id;
          invoiceCount++;

          // Invoice Items (subtotal is GENERATED ALWAYS AS (quantity * unit_price))
          await client.query(`
            INSERT INTO invoice_items (invoice_id, patient_id, encounter_id, description, quantity, unit_price, source_type, source_id)
            VALUES ($1, $2, $3, 'Medical Consultation Fee', 1, $4, 'consultation', $3),
                   ($1, $2, $3, $5, 2, $6, 'prescription', $7),
                   ($1, $2, $3, 'Laboratory Diagnostic Investigation', 1, 150.00, 'lab_order', $8)
          `, [invId, patient.id, encId, consultationFee, matchedMed.name, matchedMed.price, rxId, labTestId || encId]);

          // Payment record
          const pMethods = ['cash', 'telebirr', 'cbe_birr'];
          const chosenMethod = pMethods[i % pMethods.length];
          const receiptNo = `REC-ETH-${new Date().getFullYear()}-${String(2000 + i)}`;

          await client.query(`
            INSERT INTO payments (
              invoice_id, payment_date, amount, payment_method, transaction_id,
              received_by, receipt_number, payment_provider, verification_status, currency
            ) VALUES ($1, CURRENT_TIMESTAMP - ($2 || ' days')::INTERVAL, $3, $4, $5, 1, $6, $7, 'VERIFIED', 'ETB')
          `, [
            invId, i % 14, totalAmt, chosenMethod,
            `TXN-ET-${Math.floor(10000000 + Math.random()*90000000)}`,
            receiptNo, chosenMethod === 'cash' ? 'Hospital Cash Desk' : chosenMethod.toUpperCase()
          ]);
          paymentCount++;
        }
      }
    }

    console.log(`Seeded:
      - Appointments: ${appointmentCount}
      - Clinical Encounters: ${encounterCount}
      - Triage Assessments: ${triageCount}
      - Laboratory Orders: ${labTestCount}
      - Laboratory Results: ${labResultCount}
      - Prescriptions: ${prescriptionCount}
      - Invoices: ${invoiceCount} (in ETB)
      - Payments: ${paymentCount} (with Telebirr & CBE Birr receipts)`);

    // ── 9. DEMO ACCOUNTS AUDIT & ROLE ALIGNMENT ───────────────────────────
    console.log('\n--- Step 9: Verifying Dedicated Defense Demo User Accounts ---');
    const demoAccounts = [
      { role: 'super_admin', email: 'admin@hospital.com', name: 'System Administrator (IT Root)' },
      { role: 'hospital_manager', email: 'manager@hospital.com', name: 'Abebe Bekele (Hospital Manager)' },
      { role: 'doctor', email: 'doctor@hospital.com', name: 'Dr. Dawit Kebede (General Practitioner)' },
      { role: 'nurse', email: 'nurse@hospital.com', name: 'Nurse Selamawit Tadesse (Triage Nurse)' },
      { role: 'receptionist', email: 'reception@hospital.com', name: 'Hanna Girma (Receptionist)' },
      { role: 'cashier', email: 'cashier@hospital.com', name: 'Mulugeta Kassaye (Billing Cashier)' },
      { role: 'lab_technician', email: 'labtech@hospital.com', name: 'Kidus Daniel (Lab Technician)' },
      { role: 'pharmacist', email: 'pharmacist@hospital.com', name: 'Selamawit Alemu (Lead Pharmacist)' },
      { role: 'patient', email: 'patient@hospital.com', name: 'Lake Awraris (Patient Demonstrator)' }
    ];

    for (const a of demoAccounts) {
      await client.query(`
        INSERT INTO users (email, password_hash, role, is_active, first_name, last_name, phone, gender, address)
        VALUES ($1, $2, $3, true, $4, 'Demo', '+251 91 100 0000', 'other', 'Alem Ketema Enat Hospital')
        ON CONFLICT (email) DO UPDATE
        SET role = EXCLUDED.role, password_hash = EXCLUDED.password_hash, is_active = true, updated_at = CURRENT_TIMESTAMP
      `, [a.email, passwordHash, a.role, a.name.split(' ')[0]]);
    }
    console.log(`Verified ${demoAccounts.length} core role credentials with password: "${DEMO_PASSWORD}"`);

    await client.query('COMMIT');
    console.log('\n========================================================================');
    console.log(' DATABASE SEEDING COMPLETED SUCCESSFULLY WITH 100% ETHIOPIAN HOSPITAL DATA');
    console.log('========================================================================');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\nDatabase Seeding Failed! Transaction Rolled Back:', err);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  seedEthiopianDemoDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = seedEthiopianDemoDatabase;
