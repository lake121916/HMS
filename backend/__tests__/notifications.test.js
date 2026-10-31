const request = require('supertest');
const app = require('../src/server');
const jwt = require('jsonwebtoken');
const pool = require('../src/config/database');
const notificationService = require('../src/services/notificationService');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

describe('Priority 3: SMS and Telegram Patient Notifications Engine', () => {
  let adminToken;
  let testPatientId;
  let testDoctorId;

  beforeAll(async () => {
    // 1. Admin User
    const adminUser = await pool.query(`
      INSERT INTO users (email, password_hash, role, is_active, first_name, last_name)
      VALUES ('admin_notif@hospital.com', 'dummyhash', 'admin', true, 'System', 'Admin')
      ON CONFLICT (email) DO UPDATE SET role = 'admin'
      RETURNING id
    `);

    adminToken = jwt.sign(
      { id: adminUser.rows[0].id, email: 'admin_notif@hospital.com', role: 'admin' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 2. Doctor
    const docUser = await pool.query(`
      INSERT INTO users (email, password_hash, role, is_active, first_name, last_name)
      VALUES ('doc_notif@hospital.com', 'dummyhash', 'doctor', true, 'Dr. Berhanu', 'Nega')
      ON CONFLICT (email) DO UPDATE SET role = 'doctor'
      RETURNING id
    `);

    const docRow = await pool.query('SELECT id FROM doctors WHERE user_id = $1', [docUser.rows[0].id]);
    if (!docRow.rows.length) {
      const newDoc = await pool.query(`
        INSERT INTO doctors (user_id, first_name, last_name, specialization, license_number)
        VALUES ($1, 'Berhanu', 'Nega', 'General Medicine', 'ET-DOC-7721')
        ON CONFLICT (license_number) DO UPDATE SET user_id = $1
        RETURNING id
      `, [docUser.rows[0].id]);
      testDoctorId = newDoc.rows[0].id;
    } else {
      testDoctorId = docRow.rows[0].id;
    }

    // 3. Patient with Ethiopian phone
    const pat = await pool.query(`
      INSERT INTO patients (first_name, last_name, date_of_birth, gender, phone)
      VALUES ('Almaz', 'Ayana', '1991-11-21', 'female', '0912345678')
      RETURNING id
    `);
    testPatientId = pat.rows[0].id;
  });

  afterAll(async () => {
    try {
      if (testPatientId) {
        await pool.query('DELETE FROM notification_queue WHERE patient_id = $1', [testPatientId]);
        await pool.query('DELETE FROM patient_telegram_verifications WHERE patient_id = $1', [testPatientId]);
        await pool.query('DELETE FROM appointments WHERE patient_id = $1', [testPatientId]);
        await pool.query('DELETE FROM prescriptions WHERE patient_id = $1', [testPatientId]);
        await pool.query('DELETE FROM patients WHERE id = $1', [testPatientId]);
      }
    } catch (e) {
      console.error('Cleanup error:', e.message);
    }
  });

  describe('1. Ethiopian Phone Normalization Unit Tests', () => {
    it('normalizes Ethio Telecom 10-digit mobile (0911...) to international +251911...', () => {
      expect(notificationService.normalizePhoneNumber('0911223344')).toBe('+251911223344');
    });

    it('normalizes Safaricom 10-digit mobile (0711...) to international +251711...', () => {
      expect(notificationService.normalizePhoneNumber('0712345678')).toBe('+251712345678');
    });

    it('normalizes 9-digit without leading zero', () => {
      expect(notificationService.normalizePhoneNumber('911223344')).toBe('+251911223344');
    });

    it('preserves valid international format', () => {
      expect(notificationService.normalizePhoneNumber('+14155552671')).toBe('+14155552671');
    });
  });

  describe('2. Bilingual Templates & Healthcare Data Privacy', () => {
    it('renders English appointment notification without sensitive medical diagnoses', () => {
      const msg = notificationService.renderTemplate('appointment_booked', 'en', {
        patient_name: 'Almaz Ayana',
        doctor_name: 'Dr. Berhanu Nega',
        appointment_time: '04 Nov 2026, 09:30 AM'
      });

      expect(msg).toContain('Alem Ketema Enat Hospital');
      expect(msg).toContain('Almaz Ayana');
      expect(msg).toContain('Dr. Berhanu Nega');
      expect(msg).toContain('04 Nov 2026, 09:30 AM');
      // Must not leak private medical information
      expect(msg).not.toContain('diagnosis');
      expect(msg).not.toContain('HIV');
      expect(msg).not.toContain('cancer');
    });

    it('renders Amharic appointment notification with authentic phrasing', () => {
      const msg = notificationService.renderTemplate('appointment_booked', 'am', {
        patient_name: 'አልማዝ አያና',
        doctor_name: 'ዶክተር ብርሃኑ',
        appointment_time: 'ህዳር 4 ቀን 2026'
      });

      expect(msg).toContain('ዓለም ከተማ እናት ሆስፒታል');
      expect(msg).toContain('ቀጠሮ');
      expect(msg).toContain('+251 58 226 0111');
    });

    it('renders prescription pickup notice containing only reference ID and central pharmacy location', () => {
      const msg = notificationService.renderTemplate('prescription_ready', 'en', {
        patient_name: 'Almaz Ayana',
        rx_ref: 'RX-2026-00412'
      });

      expect(msg).toContain('RX-2026-00412');
      expect(msg).toContain('central pharmacy');
      // Drug name must NOT appear in plaintext SMS preview
      expect(msg).not.toContain('Amoxicillin');
    });
  });

  describe('3. Durable Outbox Queue & Mock Provider Execution', () => {
    it('queues notification with idempotency key and prevents duplicate sends', async () => {
      const item1 = await notificationService.queueNotification({
        entityType: 'appointment',
        entityId: 9991,
        patientId: testPatientId,
        templateKey: 'appointment_booked',
        variables: {
          patient_name: 'Almaz Ayana',
          patient_phone: '0912345678',
          doctor_name: 'Dr. Berhanu Nega',
          appointment_time: '05 Nov 2026, 10:00 AM'
        },
        language: 'am',
        channel: 'sms'
      });

      expect(item1).toBeDefined();
      expect(item1.recipient_phone).toBe('+251912345678');
      expect(item1.status).toBe('queued');

      // Attempting to queue identical event again should be idempotent (prevent duplicate SMS)
      const item2 = await notificationService.queueNotification({
        entityType: 'appointment',
        entityId: 9991,
        patientId: testPatientId,
        templateKey: 'appointment_booked',
        variables: {
          patient_name: 'Almaz Ayana',
          patient_phone: '0912345678',
          doctor_name: 'Dr. Berhanu Nega',
          appointment_time: '05 Nov 2026, 10:00 AM'
        },
        language: 'am',
        channel: 'sms'
      });

      // ON CONFLICT DO NOTHING returns undefined
      expect(item2).toBeUndefined();
    });

    it('processes outbox queue and records provider message ID and delivery timestamp', async () => {
      await notificationService.processNotificationQueue({ batchSize: 10 });

      const check = await pool.query(
        'SELECT * FROM notification_queue WHERE entity_type = $1 AND entity_id = $2',
        ['appointment', 9991]
      );

      expect(check.rows.length).toBe(1);
      const row = check.rows[0];
      expect(row.status).toBe('delivered');
      expect(row.attempts).toBe(1);
      expect(row.provider_message_id).toMatch(/^mock-sms-/);
      expect(row.sent_at).toBeDefined();
    });
  });

  describe('4. Telegram Bot Verification Flow', () => {
    let verificationCode;

    it('generates a 6-digit Telegram verification code for the patient', async () => {
      const res = await request(app)
        .post('/api/notifications/telegram/start')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ patient_id: testPatientId });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.verification_code).toMatch(/^\d{6}$/);
      verificationCode = res.body.data.verification_code;
    });

    it('verifies and links Telegram chat ID upon providing valid code', async () => {
      const res = await request(app)
        .post('/api/notifications/telegram/verify')
        .send({
          patient_id: testPatientId,
          verification_code: verificationCode,
          telegram_chat_id: '987654321',
          telegram_username: 'almaz_ayana'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const dbCheck = await pool.query(
        'SELECT * FROM patient_telegram_verifications WHERE patient_id = $1 AND is_verified = true',
        [testPatientId]
      );
      expect(dbCheck.rows.length).toBe(1);
      expect(dbCheck.rows[0].telegram_chat_id).toBe('987654321');
    });
  });

  describe('5. Outbox Queue Monitoring Endpoint: GET /api/notifications/queue', () => {
    it('allows administrators to monitor queued and delivered notifications', async () => {
      const res = await request(app)
        .get('/api/notifications/queue')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.queue).toBeDefined();
      expect(Array.isArray(res.body.data.queue)).toBe(true);
      expect(res.body.data.total).toBeGreaterThan(0);
    });
  });
});
