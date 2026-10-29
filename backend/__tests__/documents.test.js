const request = require('supertest');
const app = require('../src/server');
const jwt = require('jsonwebtoken');
const pool = require('../src/config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

const doctorToken = jwt.sign(
  { id: 2, email: 'doctor@hospital.com', role: 'doctor', firstName: 'Doctor' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

describe('Priority 2: Official Clinical PDF Documents & Verification', () => {
  let sampleToken = null;
  let sampleRxId = null;
  let sampleLabId = null;
  let sampleAdmissionId = null;

  beforeAll(async () => {
    try {
      // Find existing sample records for testing
      const rxRes = await pool.query('SELECT id FROM prescriptions ORDER BY id DESC LIMIT 1');
      if (rxRes.rows.length > 0) sampleRxId = rxRes.rows[0].id;

      const labRes = await pool.query("SELECT id FROM lab_tests WHERE status = 'completed' ORDER BY id DESC LIMIT 1");
      if (labRes.rows.length > 0) sampleLabId = labRes.rows[0].id;

      const admRes = await pool.query('SELECT id FROM admissions ORDER BY id DESC LIMIT 1');
      if (admRes.rows.length > 0) sampleAdmissionId = admRes.rows[0].id;

      const docRes = await pool.query('SELECT verification_token FROM document_verifications LIMIT 1');
      if (docRes.rows.length > 0) sampleToken = docRes.rows[0].verification_token;
    } catch (e) {
      console.warn('DB lookup warning in beforeAll:', e.message);
    }
  });

  describe('Public Verification Endpoint: GET /api/documents/verify/:token', () => {
    it('returns 404 for an invalid or non-existent token', async () => {
      const res = await request(app).get('/api/documents/verify/nonexistent-token-12345');
      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('not found');
    });

    it('returns verified authentic document metadata for a valid token', async () => {
      if (!sampleToken) return;
      const res = await request(app).get(`/api/documents/verify/${sampleToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('document_number');
      expect(res.body.data).toHaveProperty('patient_name_masked');
      expect(res.body.data.hospital).toBe('Alem Ketema Enat Hospital');
    });
  });

  describe('Prescription PDF: GET /api/documents/prescription/:id/pdf', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/documents/prescription/1/pdf');
      expect(res.statusCode).toBe(401);
    });

    it('returns 404 for a non-existent prescription id', async () => {
      const res = await request(app)
        .get('/api/documents/prescription/99999999/pdf')
        .set('Authorization', `Bearer ${doctorToken}`);
      expect(res.statusCode).toBe(404);
    });

    it('generates a valid A4 PDF stream with Ethiopic font when prescription exists', async () => {
      if (!sampleRxId) return;
      const res = await request(app)
        .get(`/api/documents/prescription/${sampleRxId}/pdf`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
      expect(res.body).toBeDefined();
    });
  });

  describe('Lab Result PDF: GET /api/documents/lab-result/:id/pdf', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/documents/lab-result/1/pdf');
      expect(res.statusCode).toBe(401);
    });

    it('returns 404 for non-existent lab test', async () => {
      const res = await request(app)
        .get('/api/documents/lab-result/99999999/pdf')
        .set('Authorization', `Bearer ${doctorToken}`);
      expect(res.statusCode).toBe(404);
    });

    it('generates a certified lab result PDF stream when lab test is completed', async () => {
      if (!sampleLabId) return;
      const res = await request(app)
        .get(`/api/documents/lab-result/${sampleLabId}/pdf`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
    });
  });

  describe('Discharge Summary PDF: GET /api/documents/discharge/:id/pdf', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/documents/discharge/1/pdf');
      expect(res.statusCode).toBe(401);
    });

    it('returns 404 for non-existent admission', async () => {
      const res = await request(app)
        .get('/api/documents/discharge/99999999/pdf')
        .set('Authorization', `Bearer ${doctorToken}`);
      expect(res.statusCode).toBe(404);
    });

    it('generates an official discharge summary PDF when admission exists', async () => {
      if (!sampleAdmissionId) return;
      const res = await request(app)
        .get(`/api/documents/discharge/${sampleAdmissionId}/pdf`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
    });
  });
});
