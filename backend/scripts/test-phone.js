const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = require('../src/config/database');
const notificationService = require('../src/services/notificationService');

async function main() {
  const phone = '0947807133';
  console.log(`\n================================================================`);
  console.log(`  COMPREHENSIVE TEST: PATIENT NOTIFICATIONS WITH PHONE ${phone}`);
  console.log(`================================================================`);

  // 1. Ethiopian Phone Normalization
  console.log(`\n[STEP 1] Phone Normalization Check:`);
  const normalized = notificationService.normalizePhoneNumber(phone);
  console.log(`- Input Phone (Domestic): ${phone}`);
  console.log(`- Normalized Phone (E.164): ${normalized}`);

  // 2. Patient Profile Lookup / Creation
  console.log(`\n[STEP 2] Database Patient Profile:`);
  let patients = await pool.query(
    `SELECT id, first_name, last_name, phone FROM patients WHERE phone LIKE $1`,
    [`%47807133%`]
  );

  let patient;
  if (patients.rows.length === 0) {
    console.log(`- No existing patient with ${phone}. Creating a new test patient profile...`);
    const insertRes = await pool.query(
      `INSERT INTO patients (first_name, last_name, phone, gender, date_of_birth)
       VALUES ('Lake', 'Mamo', $1, 'male', '1998-04-15')
       RETURNING id, first_name, last_name, phone`,
      [phone]
    );
    patient = insertRes.rows[0];
  } else {
    patient = patients.rows[0];
  }
  console.log(`- Patient Profile: ID ${patient.id}, Name: ${patient.first_name} ${patient.last_name}, Phone: ${patient.phone}`);

  // 3. Clear any past test messages for this phone to give a clean demonstration
  await pool.query(
    `DELETE FROM notification_queue WHERE recipient_phone = $1 OR recipient_phone = $2`,
    [phone, normalized]
  );

  // 4. Queue Notification 1: Appointment Booked (English)
  console.log(`\n[STEP 3] Queuing Appointment Booked SMS (English)...`);
  const apptEn = await notificationService.queueNotification({
    entityType: 'appointment',
    entityId: 101,
    patientId: patient.id,
    templateKey: 'appointment_booked',
    language: 'en',
    channel: 'sms',
    variables: {
      patient_name: `${patient.first_name} ${patient.last_name}`,
      patient_phone: normalized,
      doctor_name: 'Dr. Berhanu Nega',
      appointment_time: 'Tomorrow, Monday at 10:00 AM'
    }
  });
  console.log(`- Queued SMS #1 (ID: ${apptEn?.id}, Status: ${apptEn?.status})`);
  console.log(`  Content: "${apptEn?.message_content}"`);

  // 5. Queue Notification 2: Appointment Rescheduled (Amharic)
  console.log(`\n[STEP 4] Queuing Appointment Rescheduled SMS (Amharic)...`);
  const apptAm = await notificationService.queueNotification({
    entityType: 'appointment',
    entityId: 102,
    patientId: patient.id,
    templateKey: 'appointment_rescheduled',
    language: 'am',
    channel: 'sms',
    variables: {
      patient_name: `${patient.first_name} ${patient.last_name}`,
      patient_phone: normalized,
      doctor_name: 'ዶ/ር ብርሃኑ ነጋ',
      appointment_time: 'ሰኞ ጠዋት 4:00 ሰዓት'
    }
  });
  console.log(`- Queued SMS #2 (ID: ${apptAm?.id}, Status: ${apptAm?.status})`);
  console.log(`  Content: "${apptAm?.message_content}"`);

  // 6. Queue Notification 3: Prescription Ready for Pickup (Amharic)
  console.log(`\n[STEP 5] Queuing Prescription Pickup Notice (Amharic - Privacy Guarded)...`);
  const rxAm = await notificationService.queueNotification({
    entityType: 'prescription',
    entityId: 501,
    patientId: patient.id,
    templateKey: 'prescription_ready',
    language: 'am',
    channel: 'sms',
    variables: {
      patient_name: `${patient.first_name} ${patient.last_name}`,
      patient_phone: normalized,
      rx_reference: 'RX-2026-00501',
      pickup_location: 'ዓለም ከተማ እናት ሆስፒታል ዋና ፋርማሲ'
    }
  });
  console.log(`- Queued SMS #3 (ID: ${rxAm?.id}, Status: ${rxAm?.status})`);
  console.log(`  Content: "${rxAm?.message_content}"`);

  // 7. Verify Outbox Before Processing
  console.log(`\n[STEP 6] Inspecting notification_queue table (Before Dispatch):`);
  const pendingQueue = await pool.query(
    `SELECT id, recipient_phone, template_key, channel, status, attempts, created_at
     FROM notification_queue
     WHERE recipient_phone = $1
     ORDER BY id ASC`,
    [normalized]
  );
  console.table(pendingQueue.rows);

  // 8. Process Outbox Dispatcher
  console.log(`\n[STEP 7] Dispatching Outbox Worker (Process Queue):`);
  const dispatchResult = await notificationService.processNotificationQueue({ batchSize: 10 });
  console.log(`- Dispatcher Summary:`, dispatchResult);

  // 9. Verify Outbox After Processing
  console.log(`\n[STEP 8] Inspecting notification_queue table (After Dispatch):`);
  const finalQueue = await pool.query(
    `SELECT id, recipient_phone, template_key, status, attempts, provider, provider_message_id, sent_at
     FROM notification_queue
     WHERE recipient_phone = $1
     ORDER BY id ASC`,
    [normalized]
  );
  console.table(finalQueue.rows);

  // 10. Telegram Bot Verification Code Generation
  console.log(`\n[STEP 9] Generating Telegram Bot Linking Code:`);
  const tgCode = String(Math.floor(100000 + Math.random() * 900000));
  await pool.query('DELETE FROM patient_telegram_verifications WHERE patient_id = $1', [patient.id]);
  await pool.query(
    `INSERT INTO patient_telegram_verifications (patient_id, verification_code, is_verified)
     VALUES ($1, $2, false)`,
    [patient.id, tgCode]
  );
  console.log(`- Patient: ${patient.first_name} ${patient.last_name} (ID: ${patient.id})`);
  console.log(`- Telegram Linking Code: ${tgCode}`);
  console.log(`- Instructions: Patient opens Telegram, searches @AlemKetemaHospitalBot, and sends: /start ${tgCode}`);

  pool.end();
}

main().catch(err => {
  console.error('Fatal error:', err);
  pool.end();
});
