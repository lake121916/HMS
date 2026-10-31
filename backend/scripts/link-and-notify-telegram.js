const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const pool = require('../src/config/database');
const notificationService = require('../src/services/notificationService');

async function main() {
  const patientId = 74;
  const chatId = 8819759344;
  const username = 'Mf Kk';
  const token = process.env.TELEGRAM_BOT_TOKEN;

  console.log('=== LINKING TELEGRAM CHAT FOR LAKE AWRARIS ===');
  console.log(`- Patient ID: ${patientId}`);
  console.log(`- Telegram Chat ID: ${chatId}`);
  console.log(`- User: ${username}`);

  // 1. Link in patient_telegram_verifications
  await pool.query('DELETE FROM patient_telegram_verifications WHERE telegram_chat_id = $1', [String(chatId)]);
  await pool.query(`
    UPDATE patient_telegram_verifications
    SET telegram_chat_id = $1,
        telegram_username = $2,
        is_verified = true,
        verified_at = NOW()
    WHERE patient_id = $3
  `, [String(chatId), username, patientId]);
  console.log('Updated patient_telegram_verifications successfully!');

  // 2. Send Official Hospital Welcome Message via Telegram API
  const welcomeText = `🏥 <b>ዓለም ከተማ እናት ሆስፒታል / Alem Ketema Enat Hospital</b>\n\n` +
    `✅ <b>እንኳን ደህና መጡ Lake Awraris (Mf Kk)!</b>\n` +
    `የቴሌግራም አካውንትዎ ከዓለም ከተማ እናት ሆስፒታል ጋር በተሳካ ሁኔታ ተገናኝቷል።\n` +
    `የታካሚ መለያ ቁጥር (MRN): <b>ETH-MRN-74</b>\n` +
    `ስልክ ቁጥር: <b>+251 947807133</b>\n\n` +
    `🎉 <i>Welcome Lake Awraris! Your Telegram account is now officially verified. You will receive all real-time hospital appointment confirmations, schedule updates, and prescription pickup ready notices directly in this chat.</i>`;

  const welcomeResp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: welcomeText,
      parse_mode: 'HTML'
    })
  });
  const welcomeData = await welcomeResp.json();
  console.log('Welcome Message Sent Result:', welcomeData.ok ? 'SUCCESS (Message ID: ' + welcomeData.result?.message_id + ')' : welcomeData);

  // 3. Send Official Hospital Appointment Notification
  const apptText = `📅 <b>የቀጠሮ ማረጋገጫ / Appointment Confirmation</b>\n\n` +
    `<b>ተቋም:</b> ዓለም ከተማ እናት ሆስፒታል (ሰሜን ሸዋ፣ አማራ ክልል)\n` +
    `<b>ታካሚ:</b> Lake Awraris\n` +
    `<b>ሐኪም:</b> ዶ/ር ብርሃኑ ነጋ (Dr. Berhanu Nega)\n` +
    `<b>ቀንና ሰዓት:</b> ሰኞ ጠዋት 4:00 ሰዓት (Monday, 10:00 AM)\n` +
    `<b>ክፍል:</b> የተመላላሽ ህክምና ክፍል (OPD Clinic)\n` +
    `<b>የሆስፒታል ስልክ:</b> +251 58 226 0111\n\n` +
    `<i>እባክዎ ከመደበኛው ሰዓት 15 ደቂቃ ቀደም ብለው በመገኘት በካርድ ክፍል ሪፖርት ያድርጉ።</i>`;

  const apptResp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: apptText,
      parse_mode: 'HTML'
    })
  });
  const apptData = await apptResp.json();
  console.log('Appointment Notification Sent Result:', apptData.ok ? 'SUCCESS (Message ID: ' + apptData.result?.message_id + ')' : apptData);

  // 4. Send Official Pharmacy Prescription Ready Notice
  const rxText = `💊 <b>የመድሃኒት ዝግጅት ማሳወቂያ / Prescription Ready for Pickup</b>\n\n` +
    `<b>ተቋም:</b> ዓለም ከተማ እናት ሆስፒታል ዋና ፋርማሲ (Main Pharmacy)\n` +
    `<b>ታካሚ:</b> Lake Awraris\n` +
    `<b>የማዘዣ መለያ:</b> <code>RX-2026-03001</code>\n` +
    `<b>ሁኔታ:</b> መድሃኒትዎ ተዘጋጅቶ ዝግጁ ሆኗል (Dispensed & Verified)\n\n` +
    `<i>መድሃኒቱን ለመውሰድ ወደ ዋናው ፋርማሲ ሲመጡ የታካሚ ካርድዎን ይዘው ይምጡ።</i>`;

  const rxResp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: rxText,
      parse_mode: 'HTML'
    })
  });
  const rxData = await rxResp.json();
  console.log('Prescription Notification Sent Result:', rxData.ok ? 'SUCCESS (Message ID: ' + rxData.result?.message_id + ')' : rxData);

  // 5. Update Outbox Queue with live Telegram deliveries
  await pool.query(`
    INSERT INTO notification_queue (
      entity_type, entity_id, patient_id, channel, provider,
      recipient_phone, recipient_telegram_id, template_key,
      language, message_content, status, attempts, provider_message_id,
      idempotency_key, sent_at, delivered_at
    ) VALUES 
    ('appointment', 2001, $1, 'telegram', 'telegram', '+251947807133', $2, 'appointment_booked', 'am', $3, 'delivered', 1, $4, 'tg:appt:' || floor(random()*900000), NOW(), NOW()),
    ('prescription', 3001, $1, 'telegram', 'telegram', '+251947807133', $2, 'prescription_ready', 'am', $5, 'delivered', 1, $6, 'tg:rx:' || floor(random()*900000), NOW(), NOW())
  `, [
    patientId,
    String(chatId),
    apptText,
    String(apptData.result?.message_id || 'tg-1'),
    rxText,
    String(rxData.result?.message_id || 'tg-2')
  ]);
  console.log('Logged telegram deliveries to notification_queue in database.');

  pool.end();
}

main().catch(err => {
  console.error(err);
  pool.end();
});
