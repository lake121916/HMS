if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'patient-qr-test-secret';

const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/config/database', () => ({
  query: jest.fn(),
  connect: jest.fn(),
  on: jest.fn()
}));

const pool = require('../src/config/database');
const app = require('../src/server');
const qrClient = { query: jest.fn(), release: jest.fn() };

const tokenFor = role => jwt.sign({ id: 7, email: `${role}@hospital.test`, role }, process.env.JWT_SECRET);

describe('Patient QR routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    qrClient.query.mockReset();
    pool.connect.mockResolvedValue(qrClient);
  });

  test('returns only role-authorized identification fields to a cashier', async () => {
    qrClient.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        rows: [{
          identity_id: 31,
          id: 12,
          user_id: 44,
          first_name: 'Lake',
          last_name: 'Awraris',
          date_of_birth: '1990-01-01',
          gender: 'female',
          blood_type: 'O+',
          allergies: 'Penicillin',
          phone: '555-0100',
          created_at: new Date('2026-01-02T00:00:00Z')
        }]
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({});

    const response = await request(app)
      .post('/api/patients/scan')
      .set('Authorization', `Bearer ${tokenFor('cashier')}`)
      .send({ qrContent: `AKEH:PATIENT:${'c'.repeat(43)}` });

    expect(response.status).toBe(200);
    expect(response.body.data.patient).toMatchObject({
      id: 12,
      mrn: 'PAT-0012',
      first_name: 'Lake',
      last_name: 'Awraris'
    });
    expect(response.body.data.patient).not.toHaveProperty('allergies');
    expect(response.body.data.patient).not.toHaveProperty('blood_type');
    expect(response.body.data.patient).not.toHaveProperty('phone');
    expect(response.body.data.patient).not.toHaveProperty('date_of_birth');
    expect(response.body.data.patient).not.toHaveProperty('gender');
    expect(response.body.data.patient).not.toHaveProperty('patient_photo_user_id');
  });

  test('rejects unauthorized roles before querying patient records', async () => {
    const response = await request(app)
      .post('/api/patients/scan')
      .set('Authorization', `Bearer ${tokenFor('patient')}`)
      .send({ qrContent: `AKEH:PATIENT:${'c'.repeat(43)}` });

    expect(response.status).toBe(403);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('rejects malformed QR payloads and does not search for a patient', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const response = await request(app)
      .post('/api/patients/scan')
      .set('Authorization', `Bearer ${tokenFor('doctor')}`)
      .send({ qrContent: 'Lake Awraris, 555-0100' });

    expect(response.status).toBe(400);
    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(pool.query.mock.calls[0][0]).toContain('patient_qr_audit_logs');
  });

  test('rejects unknown, expired, or revoked tokens and audits the failed scan', async () => {
    qrClient.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({});

    const response = await request(app)
      .post('/api/patients/scan')
      .set('Authorization', `Bearer ${tokenFor('doctor')}`)
      .send({ qrContent: `AKEH:PATIENT:${'d'.repeat(43)}` });

    expect(response.status).toBe(404);
    expect(response.body.message).toMatch(/invalid, expired, or revoked/i);
    expect(qrClient.query.mock.calls[1][0]).toContain('i.is_active = true');
    expect(qrClient.query.mock.calls[1][0]).toContain('i.expires_at > CURRENT_TIMESTAMP');
    expect(qrClient.query.mock.calls[2][0]).toContain('patient_qr_audit_logs');
  });
});
