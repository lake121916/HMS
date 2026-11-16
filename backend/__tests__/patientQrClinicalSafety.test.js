if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'patient-qr-test-secret';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

jest.mock('../src/config/database', () => ({
  query: jest.fn(),
  connect: jest.fn(),
  on: jest.fn()
}));

const pool = require('../src/config/database');
const app = require('../src/server');
const patientQrService = require('../src/services/patientQrService');

const qrClient = {
  query: jest.fn(),
  release: jest.fn()
};

const tokenFor = role => jwt.sign({ id: 10, email: `${role}@hospital.test`, role }, process.env.JWT_SECRET);

describe('Patient QR Security & Two-Identifier Clinical Safety Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    qrClient.query.mockReset();
    pool.query.mockReset();
    pool.connect.mockResolvedValue(qrClient);
    pool.query.mockResolvedValue({ rows: [] });
    qrClient.query.mockResolvedValue({ rows: [] });
  });

  describe('Cryptographic Token Generation & Storage', () => {
    test('generates versioned v1 token with at least 256 bits of entropy', () => {
      const token = patientQrService.createToken();
      expect(token).toBeDefined();
      expect(token.length).toBeGreaterThanOrEqual(43);

      const payload = `${patientQrService.QR_PREFIX_V1}${token}`;
      expect(payload).toMatch(/^AKEH:PATIENT:v1:[A-Za-z0-9_-]+$/);

      // Verify SHA-256 hash is 64 hex characters
      const hash = patientQrService.hashToken(token);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    test('hashes token deterministically using SHA-256', () => {
      const testToken = 'random_secure_token_sample_abc123';
      const hash1 = patientQrService.hashToken(testToken);
      const hash2 = crypto.createHash('sha256').update(testToken).digest('hex');
      expect(hash1).toBe(hash2);
    });

    test('formats MRN correctly with PAT- prefix', () => {
      expect(patientQrService.formatMrn(1)).toBe('PAT-0001');
      expect(patientQrService.formatMrn(42)).toBe('PAT-0042');
      expect(patientQrService.formatMrn(10050)).toBe('PAT-10050');
    });

    test('formats temporary emergency MRN with TEMP- prefix', () => {
      const year = new Date().getFullYear();
      expect(patientQrService.formatTemporaryMrn(5, year)).toBe(`TEMP-${year}-00005`);
    });
  });

  describe('Token Verification & Status Rejection', () => {
    test('rejects revoked QR identity and logs audit rejection', async () => {
      qrClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [{
            identity_id: 88,
            id: 15,
            status: 'revoked',
            revocation_reason: 'Damaged wristband',
            first_name: 'Abebe',
            last_name: 'Kebede'
          }]
        })
        .mockResolvedValueOnce({}) // audit log write
        .mockResolvedValueOnce({}); // COMMIT

      const response = await request(app)
        .post('/api/patients/scan')
        .set('Authorization', `Bearer ${tokenFor('doctor')}`)
        .send({ qrContent: `AKEH:PATIENT:v1:${'r'.repeat(43)}` });

      expect([403, 404]).toContain(response.status);
      expect(response.body.message).toMatch(/revoked/i);
    });

    test('rejects expired QR identity', async () => {
      qrClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [{
            identity_id: 89,
            id: 16,
            status: 'expired',
            first_name: 'Sara',
            last_name: 'Haile'
          }]
        })
        .mockResolvedValueOnce({}) // audit log write
        .mockResolvedValueOnce({}); // COMMIT

      const response = await request(app)
        .post('/api/patients/scan')
        .set('Authorization', `Bearer ${tokenFor('nurse')}`)
        .send({ qrContent: `AKEH:PATIENT:v1:${'e'.repeat(43)}` });

      expect([404, 410]).toContain(response.status);
      expect(response.body.message).toMatch(/expired|invalid|revoked/i);
    });

    test('successfully verifies active token and returns authorized patient clinical summary', async () => {
      qrClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [{
            identity_id: 99,
            id: 25,
            user_id: 125,
            first_name: 'Dawit',
            last_name: 'Kebede',
            date_of_birth: '1985-05-12',
            gender: 'male',
            blood_type: 'B+',
            allergies: 'Penicillin',
            phone: '+251911223344',
            status: 'active'
          }]
        })
        .mockResolvedValueOnce({}) // audit log success
        .mockResolvedValueOnce({}); // COMMIT

      const response = await request(app)
        .post('/api/patients/scan')
        .set('Authorization', `Bearer ${tokenFor('doctor')}`)
        .send({ qrContent: `AKEH:PATIENT:v1:${'a'.repeat(43)}`, department: 'OPD' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.patient).toMatchObject({
        id: 25,
        first_name: 'Dawit',
        last_name: 'Kebede',
        allergies: 'Penicillin',
        blood_type: 'B+'
      });
    });
  });

  describe('Two-Identifier Verification & Mismatch Governance', () => {
    test('confirms two-identifier verification and logs verification record', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 77,
          patient_id: 25,
          verified_by: 10,
          identifiers_confirmed: ['full_name', 'dob'],
          verification_method: 'two_identifier_verbal',
          status: 'confirmed',
          verified_at: new Date()
        }]
      });

      const response = await request(app)
        .post('/api/patients/qr/confirm-verification')
        .set('Authorization', `Bearer ${tokenFor('nurse')}`)
        .send({
          patient_id: 25,
          department: 'Triage',
          identifiers_confirmed: ['full_name', 'dob'],
          verification_method: 'two_identifier_verbal'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.verification).toMatchObject({
        id: 77,
        patient_id: 25,
        status: 'confirmed'
      });
    });

    test('records identity mismatch alert and flags audit record', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 12,
          scanned_patient_id: 25,
          reported_by: 10,
          department: 'Doctor Consultation',
          mismatch_details: 'Patient responded to name Daniel Bekele, not Dawit Kebede. Wrong wristband suspected.',
          status: 'pending_review',
          created_at: new Date()
        }]
      });

      const response = await request(app)
        .post('/api/patients/qr/report-mismatch')
        .set('Authorization', `Bearer ${tokenFor('doctor')}`)
        .send({
          scanned_patient_id: 25,
          department: 'Doctor Consultation',
          mismatch_details: 'Patient responded to name Daniel Bekele, not Dawit Kebede. Wrong wristband suspected.'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.report.status).toBe('pending_review');
    });

    test('registers emergency unidentified patient with temporary MRN', async () => {
      qrClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // count for temp MRN
        .mockResolvedValueOnce({
          rows: [{
            id: 999,
            first_name: 'Unidentified',
            last_name: 'Emergency Male 1',
            gender: 'male',
            is_unidentified: true,
            temporary_mrn: 'TEMP-2026-00001',
            created_at: new Date()
          }]
        }) // patient insert
        .mockResolvedValueOnce({
          rows: [{
            id: 101,
            encounter_number: 'ENC-2026-00101',
            patient_id: 999
          }]
        }) // encounter insert
        .mockResolvedValueOnce({
          rows: [{
            id: 55,
            token_hash: 'a'.repeat(64),
            status: 'active'
          }]
        }) // QR identity insert
        .mockResolvedValueOnce({}) // audit log
        .mockResolvedValueOnce({}); // COMMIT

      const response = await request(app)
        .post('/api/patients/emergency-unidentified')
        .set('Authorization', `Bearer ${tokenFor('nurse')}`)
        .send({
          gender: 'male',
          estimated_age: 35,
          condition_description: 'Unconscious trauma admission',
          department_id: 1
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.patient.is_unidentified).toBe(true);
      expect(response.body.data.tempMrn).toMatch(/^TEMP-/);
    });
  });
});
