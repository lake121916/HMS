const pool = require('../config/database');

let twilioClient = null;
const hasTwilioConfig = /^AC[a-zA-Z0-9]+$/.test(process.env.TWILIO_ACCOUNT_SID || '')
  && Boolean(process.env.TWILIO_AUTH_TOKEN)
  && !process.env.TWILIO_AUTH_TOKEN.includes('your_');
if (hasTwilioConfig) {
  const twilio = require('twilio');
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

const createNotification = async ({ userId, patientId, type, title, message, channel = 'in_app' }) => {
  const result = await pool.query(
    `INSERT INTO notifications (user_id, patient_id, type, title, message, channel)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [userId || null, patientId || null, type, title, message, channel]
  );

  if (channel === 'sms' && twilioClient && process.env.TWILIO_PHONE_NUMBER && patientId) {
    const patient = await pool.query('SELECT phone FROM patients WHERE id = $1', [patientId]);
    const phone = patient.rows[0]?.phone;
    if (phone) {
      try {
        await twilioClient.messages.create({ body: message, from: process.env.TWILIO_PHONE_NUMBER, to: phone });
        await pool.query('UPDATE notifications SET sent_via_sms = true, delivered_at = NOW() WHERE id = $1', [result.rows[0].id]);
      } catch (error) {
        console.error('SMS delivery failed:', error.message);
      }
    }
  }

  return result.rows[0];
};

const sendAppointmentReminders = async () => {
  const appointments = await pool.query(`
    SELECT a.id, a.patient_id, a.appointment_date, p.user_id, d.first_name || ' ' || d.last_name AS doctor_name
    FROM appointments a
    JOIN patients p ON p.id = a.patient_id
    JOIN doctors d ON d.id = a.doctor_id
    WHERE a.status IN ('scheduled', 'confirmed')
      AND a.appointment_date BETWEEN NOW() + INTERVAL '23 hours' AND NOW() + INTERVAL '25 hours'
      AND NOT EXISTS (
        SELECT 1 FROM notifications n WHERE n.patient_id = a.patient_id
          AND n.type = 'appointment' AND n.title = 'Appointment reminder'
          AND n.created_at > NOW() - INTERVAL '48 hours'
      )
  `);

  for (const appointment of appointments.rows) {
    await createNotification({
      userId: appointment.user_id,
      patientId: appointment.patient_id,
      type: 'appointment',
      title: 'Appointment reminder',
      message: `Reminder: your appointment with Dr. ${appointment.doctor_name} is tomorrow at ${new Date(appointment.appointment_date).toLocaleString()}.`,
      channel: process.env.TWILIO_ACCOUNT_SID ? 'sms' : 'in_app',
    });
  }
};

module.exports = { createNotification, sendAppointmentReminders };
