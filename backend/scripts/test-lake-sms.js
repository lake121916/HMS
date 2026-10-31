const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const pool = require('../src/config/database');
const notificationService = require('../src/services/notificationService');

async function testLakeSms() {
  const patientId = 74;
  const phone = '0947807133';
  const normalizedPhone = '+251947807133';

  console.log('================================================================');
  console.log(`  HOW TO TEST SMS FOR: LAKE AWRARIS (${phone})`);
  console.log('================================================================\n');

  console.log('[SCENARIO A] Forcing SMS Delivery Channel for Lake Awraris:');
  const smsItem = await notificationService.queueNotification({
    entityType: 'appointment',
    entityId: 4401,
    patientId: patientId,
    templateKey: 'appointment_booked',
    language: 'am',
    channel: 'sms',
    variables: {
      patient_name: 'Lake Awraris',
      patient_phone: normalizedPhone,
      doctor_name: 'ዶ/ር ብርሃኑ ነጋ',
      appointment_time: 'ማክሰኞ ጠዋት 3:00 ሰዓት'
    }
  });

  console.log(`- Queued Item ID: ${smsItem?.id}`);
  console.log(`- Channel: ${smsItem?.channel.toUpperCase()}`);
  console.log(`- Recipient: ${smsItem?.recipient_phone}`);
  console.log(`- Message Content: "${smsItem?.message_content}"\n`);

  console.log('[SCENARIO B] Testing Automatic SMS Fallback (Simulating Telegram Offline):');
  // Queue a telegram message with an invalid chat to trigger instant automatic SMS fallback
  const fallbackItem = await pool.query(`
    INSERT INTO notification_queue (
      entity_type, entity_id, patient_id, channel, provider,
      recipient_phone, recipient_telegram_id, template_key,
      language, message_content, status, idempotency_key, metadata
    ) VALUES (
      'prescription', 5501, $1, 'telegram', 'telegram',
      $2, null, 'prescription_ready',
      'am', 'ዓለም ከተማ እናት ሆስፒታል፡ ጤና ይስጥልን Lake Awraris፣ መድሃኒትዎ በዋናው ፋርማሲ ተዘጋጅቶ ይገኛል።',
      'queued', 'test:fallback:' || floor(random()*900000), '{"test":true}'
    ) RETURNING *
  `, [patientId, normalizedPhone]);

  console.log(`- Queued item #${fallbackItem.rows[0].id} had channel='telegram' but NO Telegram Chat ID.`);
  console.log(`- Dispatcher will automatically detect this and switch to SMS!\n`);

  console.log('[SCENARIO C] Dispatching Outbox Worker (Sending SMS):');
  await notificationService.processNotificationQueue({ batchSize: 5 });

  console.log('\n[RESULT] Final State in Database Outbox Table:');
  const results = await pool.query(`
    SELECT id, patient_id, channel, recipient_phone, status, attempts, provider, provider_message_id, last_error, sent_at
    FROM notification_queue
    WHERE patient_id = $1 AND (id = $2 OR id = $3)
    ORDER BY id ASC
  `, [patientId, smsItem?.id, fallbackItem.rows[0]?.id]);

  console.table(results.rows);

  pool.end();
}

testLakeSms().catch(err => {
  console.error(err);
  pool.end();
});
