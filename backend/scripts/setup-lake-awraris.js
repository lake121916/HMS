const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const pool = require('../src/config/database');
const notificationService = require('../src/services/notificationService');
const allergySafetyService = require('../src/services/allergySafetyService');
const pdfService = require('../src/services/pdfService');
const crypto = require('crypto');

async function setup() {
  console.log('=== SETTING UP PATIENT: LAKE AWRARIS (0947807133) ===');

  // 1. Ensure Patient Record
  let patientRes = await pool.query(
    `SELECT id, first_name, last_name, phone FROM patients WHERE phone LIKE '%47807133%'`
  );

  let patientId;
  if (patientRes.rows.length > 0) {
    patientId = patientRes.rows[0].id;
    await pool.query(
      `UPDATE patients SET first_name = 'Lake', last_name = 'Awraris', phone = '0947807133' WHERE id = $1`,
      [patientId]
    );
    console.log(`Updated existing patient #${patientId} to Lake Awraris (0947807133)`);
  } else {
    const insert = await pool.query(
      `INSERT INTO patients (first_name, last_name, phone, gender, date_of_birth)
       VALUES ('Lake', 'Awraris', '0947807133', 'male', '1998-05-15')
       RETURNING id`
    );
    patientId = insert.rows[0].id;
    console.log(`Created new patient #${patientId}: Lake Awraris (0947807133)`);
  }

  // 2. Priority 1: Add Documented Penicillin Allergy
  console.log('\n--- Priority 1: Clinical Allergy Setup ---');
  // Check patient_allergies or allergies table
  const allergyTableCheck = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'patient_allergies'`
  );
  console.log('patient_allergies columns:', allergyTableCheck.rows.map(r => r.column_name));

  await pool.query('DELETE FROM patient_allergies WHERE patient_id = $1', [patientId]);
  await pool.query(`
    INSERT INTO patient_allergies (patient_id, allergen_name, allergen_category, severity, reaction_description, verification_status)
    VALUES ($1, 'Penicillin', 'drug', 'severe', 'Anaphylaxis and respiratory distress', 'verified')
  `, [patientId]);
  console.log(`Added allergy: "Penicillin" (Severity: severe, Reaction: Anaphylaxis) for Lake Awraris`);

  // Test Allergy Safety Service Check for Amoxicillin
  const allergyCheck = await allergySafetyService.checkMedicationAllergy(patientId, 'Amoxicillin');
  console.log('\nAllergy Safety Engine Check Result for Amoxicillin:');
  console.log(JSON.stringify(allergyCheck, null, 2));

  // 3. Priority 2: Create Medical Certificate & Discharge Summary
  console.log('\n--- Priority 2: Printable Medical Certificate & Discharge Summary ---');
  // Find doctor user ID
  const docUser = await pool.query(
    `SELECT id, email FROM users WHERE role IN ('doctor', 'super_admin') LIMIT 1`
  );
  const clinicianId = docUser.rows[0]?.id || 1;

  // Create Medical Certificate for Lake Awraris
  const certNumber = `MC-2026-${String(Math.floor(10000 + Math.random()*90000))}`;
  const certRes = await pool.query(`
    INSERT INTO medical_certificates (
      certificate_number, patient_id, encounter_id, clinician_id,
      examination_date, medical_statement, diagnosis_summary,
      sick_leave_recommended, sick_leave_start_date, sick_leave_end_date, sick_leave_days,
      fit_for_work, issue_date, status
    ) VALUES (
      $1, $2, null, $3,
      CURRENT_DATE,
      'Patient Lake Awraris presented with acute respiratory symptoms requiring clinical intervention and structured bed rest.',
      'Acute Upper Respiratory Infection (URI) - Penicillin-Allergic',
      true, CURRENT_DATE, CURRENT_DATE + INTERVAL '5 days', 5,
      false, CURRENT_DATE, 'valid'
    ) RETURNING *
  `, [certNumber, patientId, clinicianId]);
  const cert = certRes.rows[0];
  console.log(`Created Medical Certificate #${certNumber} for Lake Awraris (Sick Leave: 5 days)`);

  // Insert into document_verifications
  const verificationToken = crypto.randomBytes(24).toString('hex');
  await pool.query(`
    INSERT INTO document_verifications 
       (verification_token, document_type, document_number, entity_id, patient_id, issued_by, status)
    VALUES ($1, 'medical_certificate', $2, $3, $4, $5, 'active')
  `, [verificationToken, certNumber, cert.id, patientId, clinicianId]);
  console.log(`Registered QR Verification Token: ${verificationToken}`);
  console.log(`Public Verification URL: http://localhost:5000/api/documents/verify/${verificationToken}`);

  // Generate the official PDF for Lake Awraris
  const certPdfBuffer = await pdfService.generateMedicalCertificatePdf({
    ...cert,
    patient: { first_name: 'Lake', last_name: 'Awraris', date_of_birth: '1998-05-15', gender: 'male', medical_record_number: 'MRN-ETH-7401' },
    clinician: { first_name: 'Berhanu', last_name: 'Nega', specialization: 'Internal Medicine', license_number: 'ET-MED-44821' }
  }, {
    verificationToken,
    verificationUrl: `http://localhost:5000/api/documents/verify/${verificationToken}`
  });
  console.log(`Generated Medical Certificate PDF with QR verification (${certPdfBuffer.length} bytes)`);

  // 4. Priority 3: Notifications Outbox & Telegram for Lake Awraris
  console.log('\n--- Priority 3: Notifications Outbox & Telegram ---');
  // Clear old and queue fresh notifications
  await pool.query('DELETE FROM notification_queue WHERE patient_id = $1', [patientId]);
  
  // A. Appointment SMS (Normalized to +251947807133)
  const apptNotif = await notificationService.queueNotification({
    entityType: 'appointment',
    entityId: 2001,
    patientId: patientId,
    templateKey: 'appointment_booked',
    language: 'en',
    channel: 'sms',
    variables: {
      patient_name: 'Lake Awraris',
      patient_phone: '+251947807133',
      doctor_name: 'Dr. Berhanu Nega',
      appointment_time: 'Monday, 10:00 AM'
    }
  });

  // B. Prescription Ready SMS (Amharic)
  const rxNotif = await notificationService.queueNotification({
    entityType: 'prescription',
    entityId: 3001,
    patientId: patientId,
    templateKey: 'prescription_ready',
    language: 'am',
    channel: 'sms',
    variables: {
      patient_name: 'Lake Awraris',
      patient_phone: '+251947807133',
      rx_reference: 'RX-2026-03001',
      pickup_location: 'ዓለም ከተማ እናት ሆስፒታል ዋና ፋርማሲ'
    }
  });

  // C. Generate Telegram 6-Digit Verification Code for Lake Awraris
  const tgCode = String(Math.floor(100000 + Math.random() * 900000));
  await pool.query('DELETE FROM patient_telegram_verifications WHERE patient_id = $1', [patientId]);
  await pool.query(`
    INSERT INTO patient_telegram_verifications (patient_id, verification_code, is_verified)
    VALUES ($1, $2, false)
  `, [patientId, tgCode]);

  console.log(`Queued Appointment SMS ID: ${apptNotif.id}`);
  console.log(`Queued Prescription SMS ID: ${rxNotif.id}`);
  console.log(`Generated Telegram Linking Code for Lake Awraris: ${tgCode}`);

  // Dispatch queue
  await notificationService.processNotificationQueue({ batchSize: 10 });
  console.log('Outbox queue processed and dispatched!');

  pool.end();
}

setup().catch(err => {
  console.error('Setup error:', err);
  pool.end();
});
