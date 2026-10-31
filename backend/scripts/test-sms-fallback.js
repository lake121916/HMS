const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const pool = require('../src/config/database');
const notificationService = require('../src/services/notificationService');

async function testSmsFallback() {
  console.log('========================================================================');
  console.log('  TESTING: IF PERSON DOES NOT HAVE TELEGRAM, MUST SEND VIA SMS');
  console.log('========================================================================\n');

  // 1. Create a test patient with NO Telegram account
  const testPhone = '0912349988';
  const normalizedPhone = '+251912349988';

  let pRes = await pool.query(`SELECT id FROM patients WHERE phone = $1`, [testPhone]);
  let patientId;
  if (pRes.rows.length) {
    patientId = pRes.rows[0].id;
  } else {
    const insertP = await pool.query(`
      INSERT INTO patients (first_name, last_name, phone, gender, date_of_birth)
      VALUES ('Chala', 'Deressa', $1, 'male', '1990-02-10')
      RETURNING id
    `, [testPhone]);
    patientId = insertP.rows[0].id;
  }

  // Ensure this patient has NO verified Telegram
  await pool.query('DELETE FROM patient_telegram_verifications WHERE patient_id = $1', [patientId]);
  console.log(`[TEST 1] Patient # ${patientId} (Chala Deressa) has phone: ${testPhone}`);
  console.log(`- Verified Telegram status: NONE (No Telegram account linked)\n`);

  // Clear previous test queue
  await pool.query('DELETE FROM notification_queue WHERE patient_id = $1', [patientId]);

  // 2. Queue Appointment Notification (Requested via 'auto' or 'telegram' channel)
  console.log(`[TEST 2] Queuing notification with requested channel: 'telegram'...`);
  const queuedItem = await notificationService.queueNotification({
    entityType: 'appointment',
    entityId: 9876,
    patientId: patientId,
    templateKey: 'appointment_booked',
    language: 'am',
    channel: 'telegram', // Even if telegram requested, patient has no telegram!
    variables: {
      patient_name: 'Chala Deressa',
      patient_phone: normalizedPhone,
      doctor_name: 'ዶ/ር ብርሃኑ ነጋ',
      appointment_time: 'ረቡዕ ጠዋት 3:30 ሰዓት'
    }
  });

  console.log(`- Resulting Queued Channel: ${queuedItem?.channel.toUpperCase()}`);
  console.log(`- Target Phone Recipient   : ${queuedItem?.recipient_phone}`);
  console.log(`- Message Content          : ${queuedItem?.message_content}\n`);

  if (queuedItem?.channel === 'sms') {
    console.log('✅ PASS: System detected no Telegram and automatically routed directly to SMS!');
  } else {
    console.error('❌ FAIL: Expected channel to be SMS');
  }

  // 3. Process the Outbox Queue
  console.log(`\n[TEST 3] Processing Outbox Worker...`);
  await notificationService.processNotificationQueue({ batchSize: 5 });

  const finalCheck = await pool.query(`
    SELECT id, patient_id, channel, recipient_phone, status, attempts, provider, provider_message_id, sent_at
    FROM notification_queue
    WHERE patient_id = $1
  `, [patientId]);

  console.table(finalCheck.rows);

  if (finalCheck.rows[0]?.status === 'delivered' && finalCheck.rows[0]?.channel === 'sms') {
    console.log(`✅ SUCCESS: Patient without Telegram was successfully delivered via SMS!`);
  }

  pool.end();
}

testSmsFallback().catch(err => {
  console.error(err);
  pool.end();
});
