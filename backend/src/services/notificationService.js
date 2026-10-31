/**
 * Notification Service & Durable Outbox Engine
 * Alem Ketema Enat Hospital Management System
 * 
 * Supports:
 * - Mock Provider (Testing / Default)
 * - Twilio SMS Provider
 * - Africa's Talking SMS Provider
 * - Telegram Bot API Provider
 * - Ethiopian Phone Number Normalization (+2519... / +2517...)
 * - Bilingual Templates (English & Amharic)
 * - Safe Health Privacy (Zero medical diagnoses or medication names in SMS/Telegram)
 * - Bounded Retries & Idempotency Protection
 */

const crypto = require('crypto');
const pool = require('../config/database');

// ── 1. Phone Number Normalization ─────────────────────────────────────────────
/**
 * Normalizes phone numbers to standard E.164.
 * Handles Ethiopian domestic formats:
 *   0911223344  -> +251911223344
 *   0711223344  -> +251711223344
 *   911223344   -> +251911223344
 *   251911223344 -> +251911223344
 * Preserves international numbers (+1..., +44...).
 */
function normalizePhoneNumber(rawPhone) {
  if (!rawPhone || typeof rawPhone !== 'string') return null;
  let cleaned = rawPhone.replace(/[^\d+]/g, '');

  // Ethiopian 10-digit domestic (09... or 07...)
  if (/^0[79]\d{8}$/.test(cleaned)) {
    return '+251' + cleaned.substring(1);
  }

  // Ethiopian 9-digit without leading 0 (9... or 7...)
  if (/^[79]\d{8}$/.test(cleaned)) {
    return '+251' + cleaned;
  }

  // Ethiopian with 251 prefix without +
  if (/^251[79]\d{8}$/.test(cleaned)) {
    return '+' + cleaned;
  }

  // Already has + prefix
  if (cleaned.startsWith('+')) {
    return cleaned;
  }

  return cleaned.length >= 9 ? `+${cleaned}` : null;
}

// ── 2. Bilingual Message Templates ────────────────────────────────────────────
// Note: In strict compliance with healthcare data privacy, NO confidential
// diagnoses or prescription drug names are ever transmitted in plaintext SMS/Telegram.
const MESSAGE_TEMPLATES = {
  appointment_booked: {
    en: (vars) => `Alem Ketema Enat Hospital: Hello ${vars.patient_name || 'Patient'}, your appointment with ${vars.doctor_name || 'your physician'} is confirmed for ${vars.appointment_time}. Location: OPD Clinic. Hospital line: +251 58 226 0111.`,
    am: (vars) => `ዓለም ከተማ እናት ሆስፒታል፡ ጤና ይስጥልን ${vars.patient_name || 'ታካሚ'}፣ ከ${vars.doctor_name || 'ሐኪምዎ'} ጋር ያደረጉት ቀጠሮ ለ${vars.appointment_time} ተይዟል። አድራሻ፡ የተመላላሽ ህክምና ክፍል (OPD)። ስልክ፡ +251 58 226 0111።`
  },
  appointment_rescheduled: {
    en: (vars) => `Alem Ketema Enat Hospital: Hello ${vars.patient_name || 'Patient'}, your appointment with ${vars.doctor_name || 'your physician'} has been rescheduled to ${vars.appointment_time}. For assistance, call +251 58 226 0111.`,
    am: (vars) => `ዓለም ከተማ እናት ሆስፒታል፡ ጤና ይስጥልን ${vars.patient_name || 'ታካሚ'}፣ ከ${vars.doctor_name || 'ሐኪምዎ'} ጋር ያደረጉት ቀጠሮ ወደ ${vars.appointment_time} ተዛውሯል። ለተጨማሪ መረጃ በ +251 58 226 0111 ይደውሉ።`
  },
  appointment_cancelled: {
    en: (vars) => `Alem Ketema Enat Hospital: Hello ${vars.patient_name || 'Patient'}, your appointment scheduled for ${vars.appointment_time} has been cancelled. Please visit reception or call +251 58 226 0111 to reschedule.`,
    am: (vars) => `ዓለም ከተማ እናት ሆስፒታል፡ ጤና ይስጥልን ${vars.patient_name || 'ታካሚ'}፣ ለ${vars.appointment_time} የነበረዎት ቀጠሮ ተሰርዟል። አዲስ ቀጠሮ ለመያዝ በአካል ወይም በ +251 58 226 0111 ይደውሉ።`
  },
  prescription_ready: {
    en: (vars) => `Alem Ketema Enat Hospital: Hello ${vars.patient_name || 'Patient'}, your prescription (Ref: ${vars.rx_ref || 'Central-Rx'}) is verified and ready for collection at the hospital central pharmacy. Please present your Patient ID.`,
    am: (vars) => `ዓለም ከተማ እናት ሆስፒታል፡ ጤና ይስጥልን ${vars.patient_name || 'ታካሚ'}፣ የታዘዘልዎ መድሃኒት (መለያ: ${vars.rx_ref || 'ማዘዣ'}) ተዘጋጅቶ በዋናው ፋርማሲ ይገኛል። እባክዎ የታካሚ መታወቂያዎን ይዘው ይምጡ።`
  }
};

function renderTemplate(templateKey, language = 'en', variables = {}) {
  const tpl = MESSAGE_TEMPLATES[templateKey];
  if (!tpl) {
    return `Alem Ketema Enat Hospital Notification. Hospital line: +251 58 226 0111.`;
  }
  const langKey = language === 'am' ? 'am' : 'en';
  const renderFn = tpl[langKey] || tpl.en;
  return renderFn(variables);
}

// ── 3. Notification Providers ─────────────────────────────────────────────────

// Provider 1: Mock Provider (Default)
const MockProvider = {
  name: 'mock',
  async sendSMS({ to, message }) {
    const mockId = `mock-sms-${crypto.randomUUID()}`;
    console.log(`[MOCK SMS] [TO: ${to}] [MSG: ${message}] [ID: ${mockId}]`);
    return {
      success: true,
      provider: 'mock',
      providerMessageId: mockId,
      status: 'delivered'
    };
  },
  async sendTelegram({ chatId, message }) {
    const mockId = `mock-tg-${crypto.randomUUID()}`;
    console.log(`[MOCK TELEGRAM] [CHAT: ${chatId}] [MSG: ${message}] [ID: ${mockId}]`);
    return {
      success: true,
      provider: 'mock',
      providerMessageId: mockId,
      status: 'delivered'
    };
  }
};

// Provider 2: Twilio SMS Provider
const TwilioProvider = {
  name: 'twilio',
  async sendSMS({ to, message }) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromPhone = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromPhone || accountSid.includes('your_')) {
      return MockProvider.sendSMS({ to, message });
    }

    const twilio = require('twilio');
    const client = twilio(accountSid, authToken);
    const result = await client.messages.create({
      body: message,
      from: fromPhone,
      to
    });

    return {
      success: true,
      provider: 'twilio',
      providerMessageId: result.sid,
      status: result.status === 'failed' ? 'failed' : 'sent'
    };
  }
};

// Provider 3: Africa's Talking SMS Provider (Ethiopian Local Gateway)
const AfricasTalkingProvider = {
  name: 'africastalking',
  async sendSMS({ to, message }) {
    const username = process.env.AFRICASTALKING_USERNAME;
    const apiKey = process.env.AFRICASTALKING_API_KEY;
    const senderId = process.env.AFRICASTALKING_SENDER_ID || 'ALEMKETEMA';

    if (!username || !apiKey || apiKey.includes('your_')) {
      return MockProvider.sendSMS({ to, message });
    }

    // Direct HTTP call to Africa's Talking REST endpoint
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('to', to);
    params.append('message', message);
    if (senderId) params.append('from', senderId);

    const response = await fetch('https://api.africastalking.com/version1/messaging', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'apiKey': apiKey
      },
      body: params.toString()
    });

    const data = await response.json();
    const recipientData = data?.SMSMessageData?.Recipients?.[0];

    return {
      success: recipientData?.status === 'Success',
      provider: 'africastalking',
      providerMessageId: recipientData?.messageId || `at-${crypto.randomUUID()}`,
      status: recipientData?.status === 'Success' ? 'sent' : 'failed'
    };
  }
};

// Provider 4: Telegram Bot API Provider
const TelegramProvider = {
  name: 'telegram',
  async sendTelegram({ chatId, message }) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken || botToken.includes('your_')) {
      return MockProvider.sendTelegram({ chatId, message });
    }

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      })
    });

    const data = await response.json();
    if (!data.ok) {
      throw new Error(data.description || 'Telegram API error');
    }

    return {
      success: true,
      provider: 'telegram',
      providerMessageId: String(data.result?.message_id),
      status: 'sent'
    };
  }
};

// Provider selector
function getSmsProvider() {
  const configured = (process.env.NOTIFICATION_PROVIDER || 'mock').toLowerCase();
  if (configured === 'twilio' && process.env.TWILIO_ACCOUNT_SID) return TwilioProvider;
  if (configured === 'africastalking' && process.env.AFRICASTALKING_API_KEY) return AfricasTalkingProvider;
  return MockProvider;
}

function getTelegramProvider() {
  if (process.env.TELEGRAM_BOT_TOKEN && !process.env.TELEGRAM_BOT_TOKEN.includes('your_')) {
    return TelegramProvider;
  }
  return MockProvider;
}

// ── 4. Outbox Queue & Dispatch Engine ─────────────────────────────────────────

/**
 * Queue a patient notification in the durable outbox.
 * Never blocks clinical workflow.
 */
async function queueNotification({
  entityType,
  entityId,
  patientId,
  templateKey,
  variables = {},
  language = 'en',
  channel = 'sms'
}) {
  try {
    // 1. Fetch patient contact details if not fully provided
    let phone = variables.patient_phone || null;
    let telegramChatId = null;

    if (patientId) {
      const pRes = await pool.query(
        'SELECT phone FROM patients WHERE id = $1',
        [patientId]
      );
      if (pRes.rows.length && !phone) {
        phone = pRes.rows[0].phone;
      }

      // Check for verified Telegram link
      const tgRes = await pool.query(
        'SELECT telegram_chat_id FROM patient_telegram_verifications WHERE patient_id = $1 AND is_verified = true',
        [patientId]
      );
      if (tgRes.rows.length) {
        telegramChatId = tgRes.rows[0].telegram_chat_id;
      }
    }

    const normalizedPhone = normalizePhoneNumber(phone);
    const content = renderTemplate(templateKey, language, variables);

    // Smart Multi-Channel Routing:
    // If patient has NO verified Telegram, the system MUST route directly to SMS!
    let targetChannel = channel;
    if ((targetChannel === 'telegram' || targetChannel === 'auto') && !telegramChatId) {
      targetChannel = 'sms';
    }

    const providerName = targetChannel === 'telegram' ? 'telegram' : (process.env.NOTIFICATION_PROVIDER || 'mock');

    // Idempotency key prevents duplicate sends for the exact same event
    const recipientKey = targetChannel === 'telegram' ? (telegramChatId || 'unknown') : (normalizedPhone || 'unknown');
    const idempotencyKey = `${entityType}:${entityId}:${templateKey}:${targetChannel}:${recipientKey}`;

    const queueRes = await pool.query(`
      INSERT INTO notification_queue (
        entity_type, entity_id, patient_id, channel, provider,
        recipient_phone, recipient_telegram_id, template_key,
        language, message_content, status, idempotency_key, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'queued', $11, $12)
      ON CONFLICT (idempotency_key) DO NOTHING
      RETURNING *
    `, [
      entityType,
      entityId,
      patientId || null,
      targetChannel,
      providerName,
      normalizedPhone,
      telegramChatId,
      templateKey,
      language || 'en',
      content,
      idempotencyKey,
      JSON.stringify(variables)
    ]);

    const queuedItem = queueRes.rows[0];

    // If patient HAS verified Telegram and target was SMS, also queue Telegram message
    if (targetChannel === 'sms' && telegramChatId) {
      const tgIdempotencyKey = `${entityType}:${entityId}:${templateKey}:telegram:${telegramChatId}`;
      await pool.query(`
        INSERT INTO notification_queue (
          entity_type, entity_id, patient_id, channel, provider,
          recipient_phone, recipient_telegram_id, template_key, language, message_content,
          status, idempotency_key, metadata
        ) VALUES ($1, $2, $3, 'telegram', 'telegram', $4, $5, $6, $7, $8, 'queued', $9, $10)
        ON CONFLICT (idempotency_key) DO NOTHING
      `, [
        entityType,
        entityId,
        patientId,
        normalizedPhone,
        telegramChatId,
        templateKey,
        language || 'en',
        content,
        tgIdempotencyKey,
        JSON.stringify(variables)
      ]);
    }

    // Trigger asynchronous queue processor immediately
    setImmediate(() => {
      processNotificationQueue().catch(err => {
        console.error('Async notification queue processor error:', err.message);
      });
    });

    return queuedItem;
  } catch (err) {
    console.error('Failed to queue patient notification:', err);
    // Non-blocking: returns null so parent business action does not fail
    return null;
  }
}

/**
 * Worker processor: Dispatches queued notifications with bounded retries.
 */
async function processNotificationQueue({ batchSize = 10 } = {}) {
  const client = await pool.connect();
  try {
    // Select batch of pending or retryable failed notifications
    const items = await client.query(`
      SELECT * FROM notification_queue
      WHERE status IN ('queued', 'failed')
        AND attempts < max_attempts
      ORDER BY id ASC
      LIMIT $1
    `, [batchSize]);

    for (const item of items.rows) {
      let dispatchResult = null;
      let errorMsg = null;

      try {
        if (item.channel === 'telegram') {
          // If no telegram ID, automatically fall back to SMS
          if (!item.recipient_telegram_id) {
            if (item.recipient_phone) {
              const smsProvider = getSmsProvider();
              dispatchResult = await smsProvider.sendSMS({
                to: item.recipient_phone,
                message: item.message_content
              });
              await client.query(`
                UPDATE notification_queue
                SET status = $1,
                    channel = 'sms',
                    provider_message_id = $2,
                    last_error = 'Delivered via SMS (no Telegram linked)',
                    attempts = attempts + 1,
                    sent_at = NOW(),
                    delivered_at = NOW(),
                    updated_at = NOW()
                WHERE id = $3
              `, [
                dispatchResult.status || 'delivered',
                dispatchResult.providerMessageId,
                item.id
              ]);
              continue;
            } else {
              throw new Error('Missing recipient_telegram_id and no recipient_phone for SMS fallback');
            }
          }

          // Try sending via Telegram
          try {
            const provider = getTelegramProvider();
            dispatchResult = await provider.sendTelegram({
              chatId: item.recipient_telegram_id,
              message: item.message_content
            });
          } catch (tgErr) {
            // Telegram dispatch failed -> Automatically fall back to SMS!
            console.warn(`[Notification Engine] Telegram send failed for #${item.id} (${tgErr.message}). Automatically falling back to SMS.`);
            if (item.recipient_phone) {
              const smsProvider = getSmsProvider();
              dispatchResult = await smsProvider.sendSMS({
                to: item.recipient_phone,
                message: item.message_content
              });
              await client.query(`
                UPDATE notification_queue
                SET status = $1,
                    channel = 'sms',
                    provider_message_id = $2,
                    last_error = $3,
                    attempts = attempts + 1,
                    sent_at = NOW(),
                    delivered_at = NOW(),
                    updated_at = NOW()
                WHERE id = $4
              `, [
                dispatchResult.status || 'delivered',
                dispatchResult.providerMessageId,
                `Delivered via SMS fallback (Telegram error: ${tgErr.message})`,
                item.id
              ]);
              continue;
            }
            throw tgErr;
          }
        } else {
          // SMS Channel
          if (!item.recipient_phone) {
            throw new Error('Missing or unparseable recipient_phone for SMS channel');
          }
          const provider = getSmsProvider();
          dispatchResult = await provider.sendSMS({
            to: item.recipient_phone,
            message: item.message_content
          });
        }

        // Update successful dispatch
        await client.query(`
          UPDATE notification_queue
          SET status = $1,
              provider_message_id = $2,
              attempts = attempts + 1,
              sent_at = NOW(),
              delivered_at = NOW(),
              updated_at = NOW()
          WHERE id = $3
        `, [
          dispatchResult.status || 'delivered',
          dispatchResult.providerMessageId,
          item.id
        ]);
      } catch (err) {
        errorMsg = err.message || 'Notification send failure';
        const nextAttempts = item.attempts + 1;
        const newStatus = nextAttempts >= item.max_attempts ? 'failed' : 'queued';

        await client.query(`
          UPDATE notification_queue
          SET status = $1,
              attempts = $2,
              last_error = $3,
              updated_at = NOW()
          WHERE id = $4
        `, [newStatus, nextAttempts, errorMsg, item.id]);
      }
    }
  } finally {
    client.release();
  }
}

// ── 5. High-Level Business Event Helpers ───────────────────────────────────────

/**
 * Triggered on appointment booked, rescheduled, or cancelled.
 */
async function sendAppointmentNotification(appointment, eventType = 'appointment_booked') {
  try {
    // Fetch patient and doctor names
    const info = await pool.query(`
      SELECT 
        p.id AS patient_id,
        p.first_name || ' ' || p.last_name AS patient_name,
        p.phone AS patient_phone,
        d.first_name || ' ' || d.last_name AS doctor_name
      FROM appointments a
      JOIN patients p ON p.id = a.patient_id
      LEFT JOIN doctors d ON d.id = a.doctor_id
      WHERE a.id = $1
    `, [appointment.id]);

    if (!info.rows.length) return null;
    const row = info.rows[0];

    const formattedTime = new Date(appointment.appointment_date).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return await queueNotification({
      entityType: 'appointment',
      entityId: appointment.id,
      patientId: row.patient_id,
      templateKey: eventType,
      language: 'en',
      channel: 'sms',
      variables: {
        patient_name: row.patient_name,
        patient_phone: row.patient_phone,
        doctor_name: row.doctor_name ? `Dr. ${row.doctor_name}` : 'Attending Physician',
        appointment_time: formattedTime
      }
    });
  } catch (err) {
    console.error('Error in sendAppointmentNotification:', err.message);
    return null;
  }
}

/**
 * Triggered when prescription is confirmed ready for pickup at central pharmacy.
 */
async function sendPrescriptionReadyNotification(prescription) {
  try {
    const info = await pool.query(`
      SELECT 
        p.id AS patient_id,
        p.first_name || ' ' || p.last_name AS patient_name,
        p.phone AS patient_phone,
        pr.id AS rx_id
      FROM prescriptions pr
      JOIN patients p ON p.id = pr.patient_id
      WHERE pr.id = $1
    `, [prescription.id]);

    if (!info.rows.length) return null;
    const row = info.rows[0];

    const rxRef = `RX-${new Date().getFullYear()}-${String(row.rx_id).padStart(5, '0')}`;

    return await queueNotification({
      entityType: 'prescription',
      entityId: prescription.id,
      patientId: row.patient_id,
      templateKey: 'prescription_ready',
      language: 'en',
      channel: 'sms',
      variables: {
        patient_name: row.patient_name,
        patient_phone: row.patient_phone,
        rx_ref: rxRef
      }
    });
  } catch (err) {
    console.error('Error in sendPrescriptionReadyNotification:', err.message);
    return null;
  }
}

/**
 * Verifies and links patient Telegram account.
 */
async function verifyTelegramChat(patientId, verificationCode, chatId, username) {
  const result = await pool.query(`
    SELECT * FROM patient_telegram_verifications
    WHERE patient_id = $1 AND verification_code = $2 AND is_verified = false
  `, [patientId, verificationCode]);

  if (!result.rows.length) {
    return { success: false, message: 'Invalid or expired Telegram verification code' };
  }

  await pool.query(`
    UPDATE patient_telegram_verifications
    SET telegram_chat_id = $1,
        telegram_username = $2,
        is_verified = true,
        verified_at = NOW()
    WHERE id = $3
  `, [chatId, username || null, result.rows[0].id]);

  return { success: true, message: 'Telegram account successfully linked and verified' };
}

// ── 5. Live Telegram Bot Polling Listener ──────────────────────────────────────
let telegramPollingActive = false;
let lastUpdateId = 0;

async function handleTelegramIncomingMessage(msg) {
  const chatId = msg.chat?.id;
  const text = (msg.text || '').trim();
  const username = msg.from?.username || `${msg.from?.first_name || ''} ${msg.from?.last_name || ''}`.trim();

  if (!chatId) return;

  const match = text.match(/(?:\/start\s+)?(\d{6})/);
  if (match) {
    const code = match[1];
    const record = await pool.query(
      `SELECT pv.*, p.first_name, p.last_name
       FROM patient_telegram_verifications pv
       JOIN patients p ON p.id = pv.patient_id
       WHERE pv.verification_code = $1 AND pv.is_verified = false`,
      [code]
    );

    if (record.rows.length > 0) {
      const row = record.rows[0];
      await verifyTelegramChat(row.patient_id, code, String(chatId), username);

      const welcomeMsg = `🏥 <b>ዓለም ከተማ እናት ሆስፒታል / Alem Ketema Enat Hospital</b>\n\n` +
        `✅ <b>እንኳን ደህና መጡ ${row.first_name} ${row.last_name}!</b>\n` +
        `የቴሌግራም አካውንትዎ በተሳካ ሁኔታ ተገናኝቷል። የታካሚ መለያ: #${row.patient_id}\n\n` +
        `Welcome ${row.first_name} ${row.last_name}! Your Telegram account has been linked to your patient record (#${row.patient_id}). You will receive official appointment updates and prescription ready notices directly here.`;

      await TelegramProvider.sendTelegram({ chatId, message: welcomeMsg });
      await processNotificationQueue({ batchSize: 10 });
    } else {
      await TelegramProvider.sendTelegram({
        chatId,
        message: `⚠️ የገባው ባለ 6-አሃዝ ኮድ አልተገኘም ወይም አስቀድሞ ጥቅም ላይ ውሏል። እባክዎ ከሆስፒታል አዲስ ኮድ ያረጋግጡ።\n\nInvalid or expired 6-digit code. Please check your verification code on the hospital portal.`
      });
    }
  } else if (text.startsWith('/start')) {
    await TelegramProvider.sendTelegram({
      chatId,
      message: `🏥 <b>ዓለም ከተማ እናት ሆስፒታል / Alem Ketema Enat Hospital Bot</b>\n\n` +
        `ጤና ይስጥልን! አካውንትዎን ለማገናኘት ከሆስፒታሉ የተሰጠዎትን ባለ 6-አሃዝ ኮድ ይላኩ። (ምሳሌ፡ <code>/start 249321</code>)\n\n` +
        `Welcome! To link your patient record, please send your 6-digit code (e.g. <code>/start 249321</code>).`
    });
  }
}

async function startTelegramPolling() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || token.includes('your_')) {
    console.log('[Telegram Bot] No live TELEGRAM_BOT_TOKEN configured in .env (Mock mode active)');
    return;
  }

  if (telegramPollingActive) return;
  telegramPollingActive = true;
  console.log('[Telegram Bot] Live polling service active for hospital bot...');

  const pollLoop = async () => {
    if (!telegramPollingActive) return;
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates?offset=${lastUpdateId + 1}&timeout=20`);
      const data = await res.json();
      if (data.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          lastUpdateId = update.update_id;
          if (update.message && update.message.text) {
            await handleTelegramIncomingMessage(update.message);
          }
        }
      }
    } catch (err) {
      // Quietly wait before retrying on network timeout
    }
    setTimeout(pollLoop, 1500);
  };

  pollLoop();
}

// ── Legacy Compatibility ──────────────────────────────────────────────────────
const createNotification = async ({ userId, patientId, type, title, message, channel = 'in_app' }) => {
  const result = await pool.query(
    `INSERT INTO notifications (user_id, patient_id, type, title, message, channel)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [userId || null, patientId || null, type, title, message, channel]
  );
  return result.rows[0];
};

const sendAppointmentReminders = async () => {
  // Existing in-app appointment reminder cron support
};

module.exports = {
  normalizePhoneNumber,
  renderTemplate,
  queueNotification,
  processNotificationQueue,
  sendAppointmentNotification,
  sendPrescriptionReadyNotification,
  verifyTelegramChat,
  createNotification,
  sendAppointmentReminders,
  MockProvider,
  TwilioProvider,
  AfricasTalkingProvider,
  TelegramProvider,
  startTelegramPolling
};
