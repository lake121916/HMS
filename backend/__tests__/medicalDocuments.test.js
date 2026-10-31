const request = require('supertest');
const app = require('../src/server');
const jwt = require('jsonwebtoken');
const pool = require('../src/config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

describe('Priority 2: Medical Certificate, Discharge Summary & QR Verification', () => {
  let doctorToken;
  let receptionistToken;
  let testPatientId;
  let testEncounterId;
  let doctorUserId;
  let createdCertId;
  let verificationToken;

  beforeAll(async () => {
    // 1. Doctor User
    const docUser = await pool.query(`
      INSERT INTO users (email, password_hash, role, is_active, first_name, last_name)
      VALUES ('doc_cert@hospital.com', 'dummyhash', 'doctor', true, 'Dr. Samuel', 'Tadesse')
      ON CONFLICT (email) DO UPDATE SET role = 'doctor'
      RETURNING id
    `);
    doctorUserId = docUser.rows[0].id;

    // Doctor profile with license
    const docRow = await pool.query('SELECT id FROM doctors WHERE user_id = $1', [doctorUserId]);
    if (!docRow.rows.length) {
      await pool.query(`
        INSERT INTO doctors (user_id, first_name, last_name, specialization, license_number)
        VALUES ($1, 'Samuel', 'Tadesse', 'Occupational Medicine', 'ET-MOH-99214')
        ON CONFLICT (license_number) DO UPDATE SET user_id = $1
      `, [doctorUserId]);
    }

    doctorToken = jwt.sign(
      { id: doctorUserId, email: 'doc_cert@hospital.com', role: 'doctor' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 2. Receptionist User (Unauthorized for issuing clinical certificates)
    const recUser = await pool.query(`
      INSERT INTO users (email, password_hash, role, is_active, first_name, last_name)
      VALUES ('rec_cert@hospital.com', 'dummyhash', 'receptionist', true, 'Eden', 'Kassa')
      ON CONFLICT (email) DO UPDATE SET role = 'receptionist'
      RETURNING id
    `);
    receptionistToken = jwt.sign(
      { id: recUser.rows[0].id, email: 'rec_cert@hospital.com', role: 'receptionist' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 3. Test Patient
    const pat = await pool.query(`
      INSERT INTO patients (first_name, last_name, date_of_birth, gender, phone)
      VALUES ('Haile', 'Gebrselassie', '1973-04-18', 'male', '+251922334455')
      RETURNING id
    `);
    testPatientId = pat.rows[0].id;

    // 4. Test Encounter
    const enc = await pool.query(`
      INSERT INTO patient_encounters (patient_id, status, encounter_type)
      VALUES ($1, 'completed', 'outpatient')
      RETURNING id
    `, [testPatientId]);
    testEncounterId = enc.rows[0].id;
  });

  afterAll(async () => {
    try {
      if (testPatientId) {
        await pool.query('DELETE FROM medical_certificates WHERE patient_id = $1', [testPatientId]);
        await pool.query('DELETE FROM document_verifications WHERE patient_id = $1', [testPatientId]);
        await pool.query('DELETE FROM patient_encounters WHERE patient_id = $1', [testPatientId]);
        await pool.query('DELETE FROM patients WHERE id = $1', [testPatientId]);
      }
    } catch (e) {
      console.error('Cleanup error:', e.message);
    }
  });

  describe('Medical Certificate Issuance: POST /api/documents/medical-certificate', () => {
    it('rejects unauthorized staff (receptionist) with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/documents/medical-certificate')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({
          patient_id: testPatientId,
          medical_statement: 'Patient requires two days of bed rest.'
        });

      expect(res.status).toBe(403);
    });

    it('rejects issuance when required medical statement is missing or too brief', async () => {
      const res = await request(app)
        .post('/api/documents/medical-certificate')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          patient_id: testPatientId,
          medical_statement: 'sick' // Too short (< 5 chars)
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('successfully issues official medical certificate with sick leave and generates verification token', async () => {
      const res = await request(app)
        .post('/api/documents/medical-certificate')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          patient_id: testPatientId,
          encounter_id: testEncounterId,
          examination_date: '2026-10-31',
          medical_statement: 'The patient was examined at our outpatient clinic presenting with acute lumbar strain and is advised to refrain from heavy manual labor.',
          diagnosis_summary: 'Acute Lumbar Muscular Strain (ICD-10 M54.5)',
          sick_leave_recommended: true,
          sick_leave_days: 5,
          sick_leave_start_date: '2026-10-31',
          sick_leave_end_date: '2026-11-04',
          fit_for_work: false
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.certificate_number).toMatch(/^MC-\d{4}-\d{5}$/);
      expect(res.body.data.sick_leave_days).toBe(5);
      expect(res.body.verification_token).toBeDefined();

      createdCertId = res.body.data.id;
      verificationToken = res.body.verification_token;

      // Verify audit record was created
      const audit = await pool.query(
        `SELECT * FROM clinical_audit_events 
         WHERE record_type = 'medical_certificate' AND record_id = $1`,
        [createdCertId]
      );
      expect(audit.rows.length).toBeGreaterThan(0);
      expect(audit.rows[0].action_type).toBe('CERTIFICATE_ISSUED');
    });
  });

  describe('Medical Certificate PDF Generation: GET /api/documents/medical-certificate/:id/pdf', () => {
    it('generates valid binary A4 PDF document containing header, sick leave, and QR metadata', async () => {
      const res = await request(app)
        .get(`/api/documents/medical-certificate/${createdCertId}/pdf`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(Buffer.isBuffer(res.body)).toBe(true);
      // PDF standard file header starts with %PDF-
      const headerStr = res.body.slice(0, 5).toString('ascii');
      expect(headerStr).toBe('%PDF-');
    });
  });

  describe('Cryptographic Privacy-Preserving QR Verification: GET /api/documents/verify/:token', () => {
    it('returns minimal authenticity verification without exposing private clinical diagnosis', async () => {
      const res = await request(app)
        .get(`/api/documents/verify/${verificationToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.verified).toBe(true);
      expect(res.body.data.status).toBe('valid');
      expect(res.body.data.document_type).toBe('medical_certificate');
      expect(res.body.data.hospital).toBe('Alem Ketema Enat Hospital');
      // Patient name should be masked (e.g. "H. Gebrselassie") to preserve patient privacy
      expect(res.body.data.patient_name_masked).toBe('H. Gebrselassie');
      // Confidential clinical diagnosis must NEVER be exposed publicly in the QR response
      expect(res.body.data.diagnosis).toBeUndefined();
      expect(res.body.data.medical_statement).toBeUndefined();
    });

    it('rejects counterfeit or non-existent token with 404', async () => {
      const res = await request(app)
        .get('/api/documents/verify/non_existent_token_99999999');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.status).toBe('invalid');
    });
  });

  describe('Medical Certificate Revocation & Supersession: PUT /api/documents/medical-certificate/:id/revoke', () => {
    it('rejects revocation attempt without mandatory clinical reason', async () => {
      const res = await request(app)
        .put(`/api/documents/medical-certificate/${createdCertId}/revoke`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('successfully revokes medical certificate and reflects revocation in QR verification endpoint', async () => {
      const res = await request(app)
        .put(`/api/documents/medical-certificate/${createdCertId}/revoke`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          reason: 'Clinician updated assessment after secondary radiology findings confirmed no acute fracture; certificate replaced.'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('revoked');

      // Now verify public QR check reflects revocation immediately
      const verifyRes = await request(app)
        .get(`/api/documents/verify/${verificationToken}`);

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.data.status).toBe('revoked');
      expect(verifyRes.body.data.verified).toBe(false);
      expect(verifyRes.body.data.revoked_reason).toContain('radiology findings');
    });
  });

  describe('Discharge Summary PDF: GET /api/documents/discharge/encounter/:encounterId/pdf', () => {
    it('generates official certified discharge summary PDF for encounter with QR code', async () => {
      const res = await request(app)
        .get(`/api/documents/discharge/encounter/${testEncounterId}/pdf`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(Buffer.isBuffer(res.body)).toBe(true);
      expect(res.body.slice(0, 5).toString('ascii')).toBe('%PDF-');
    });
  });
});
