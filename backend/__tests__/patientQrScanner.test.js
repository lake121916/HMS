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

const tokenFor = role => jwt.sign({ id: 10, email: `${role}@hospital.test`, role }, process.env.JWT_SECRET);

describe('Dual-Device Patient QR Scanner Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    qrClient.query.mockReset();
    pool.connect.mockResolvedValue(qrClient);
  });

  const mockDbPatient = {
    identity_id: 88,
    id: 42,
    first_name: 'Solomon',
    last_name: 'Desta',
    date_of_birth: '1985-04-12',
    gender: 'male',
    blood_type: 'B+',
    allergies: 'Ciprofloxacin, NSAIDs',
    phone: '+251-911-334455'
  };

  test('Laptop webcam scanning: validates standard prefix format AKEH:PATIENT:<token>', async () => {
    qrClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [mockDbPatient] }) // SELECT
      .mockResolvedValueOnce({ rows: [] }) // audit log
      .mockResolvedValueOnce({}); // COMMIT

    const validLaptopToken = 'L'.repeat(43);
    const response = await request(app)
      .post('/api/patients/scan')
      .set('Authorization', `Bearer ${tokenFor('doctor')}`)
      .send({ qrContent: `AKEH:PATIENT:${validLaptopToken}` });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.patient.id).toBe(42);
    expect(response.body.data.patient.mrn).toBe('PAT-0042');
    expect(response.body.data.patient.first_name).toBe('Solomon');
    expect(response.body.data.patient.last_name).toBe('Desta');
    expect(response.body.data.patient.allergies).toBe('Ciprofloxacin, NSAIDs');
    expect(response.body.data.patient.blood_type).toBe('B+');
  });

  test('Desktop external webcam scanning: validates token with correct clinical scoping for nurse', async () => {
    qrClient.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [mockDbPatient] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({});

    const desktopToken = 'D'.repeat(43);
    const response = await request(app)
      .post('/api/patients/scan')
      .set('Authorization', `Bearer ${tokenFor('nurse')}`)
      .send({ qrContent: `AKEH:PATIENT:${desktopToken}` });

    expect(response.status).toBe(200);
    expect(response.body.data.patient).toMatchObject({
      id: 42,
      mrn: 'PAT-0042',
      gender: 'male',
      allergies: 'Ciprofloxacin, NSAIDs',
      blood_type: 'B+'
    });
  });

  test('Android rear camera scanning: handles both prefixed and bare 43-character token', async () => {
    // 1. Bare token (no prefix)
    qrClient.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [mockDbPatient] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({});

    const androidToken = 'A'.repeat(43);
    const response = await request(app)
      .post('/api/patients/scan')
      .set('Authorization', `Bearer ${tokenFor('doctor')}`)
      .send({ qrContent: androidToken });

    expect(response.status).toBe(200);
    expect(response.body.data.patient.mrn).toBe('PAT-0042');

    // 2. Prefixed token from camera
    qrClient.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [mockDbPatient] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({});

    const responsePrefixed = await request(app)
      .post('/api/patients/scan')
      .set('Authorization', `Bearer ${tokenFor('doctor')}`)
      .send({ qrContent: `AKEH:PATIENT:${androidToken}` });

    expect(responsePrefixed.status).toBe(200);
    expect(responsePrefixed.body.data.patient.id).toBe(42);
  });

  test('iPhone mobile browser scanning: successfully identifies patient and provides role-scoped data', async () => {
    qrClient.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [mockDbPatient] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({});

    const iPhoneToken = 'i'.repeat(43);
    const response = await request(app)
      .post('/api/patients/scan')
      .set('Authorization', `Bearer ${tokenFor('receptionist')}`)
      .send({ qrContent: `AKEH:PATIENT:${iPhoneToken}` });

    expect(response.status).toBe(200);
    expect(response.body.data.patient.mrn).toBe('PAT-0042');
    expect(response.body.data.patient.phone).toBe('+251-911-334455');
    // Receptionist must not see sensitive clinical data
    expect(response.body.data.patient).not.toHaveProperty('blood_type');
    expect(response.body.data.patient).not.toHaveProperty('allergies');
  });

  test('Pharmacist role scoping: receives allergies and demographics for dispensing safety, no blood type', async () => {
    qrClient.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [mockDbPatient] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({});

    const response = await request(app)
      .post('/api/patients/scan')
      .set('Authorization', `Bearer ${tokenFor('pharmacist')}`)
      .send({ qrContent: `AKEH:PATIENT:${'p'.repeat(43)}` });

    expect(response.status).toBe(200);
    expect(response.body.data.patient.allergies).toBe('Ciprofloxacin, NSAIDs');
    expect(response.body.data.patient.date_of_birth).toBe('1985-04-12');
    expect(response.body.data.patient).not.toHaveProperty('blood_type');
  });

  test('Laboratory technician role scoping: receives demographics for sample reference ranges, no clinical allergies or phone', async () => {
    qrClient.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [mockDbPatient] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({});

    const response = await request(app)
      .post('/api/patients/scan')
      .set('Authorization', `Bearer ${tokenFor('lab_technician')}`)
      .send({ qrContent: `AKEH:PATIENT:${'k'.repeat(43)}` });

    expect(response.status).toBe(200);
    expect(response.body.data.patient.gender).toBe('male');
    expect(response.body.data.patient.date_of_birth).toBe('1985-04-12');
    expect(response.body.data.patient).not.toHaveProperty('allergies');
    expect(response.body.data.patient).not.toHaveProperty('blood_type');
    expect(response.body.data.patient).not.toHaveProperty('phone');
  });

  test('Cashier role scoping: receives strictly non-clinical billing identification (id, mrn, full name)', async () => {
    qrClient.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [mockDbPatient] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({});

    const response = await request(app)
      .post('/api/patients/scan')
      .set('Authorization', `Bearer ${tokenFor('cashier')}`)
      .send({ qrContent: `AKEH:PATIENT:${'c'.repeat(43)}` });

    expect(response.status).toBe(200);
    expect(response.body.data.patient).toEqual({
      id: 42,
      mrn: 'PAT-0042',
      first_name: 'Solomon',
      last_name: 'Desta'
    });
  });

  test('Rejects unauthorized staff: patient role cannot scan QR codes (403 Forbidden)', async () => {
    const response = await request(app)
      .post('/api/patients/scan')
      .set('Authorization', `Bearer ${tokenFor('patient')}`)
      .send({ qrContent: `AKEH:PATIENT:${'x'.repeat(43)}` });

    expect(response.status).toBe(403);
    expect(pool.connect).not.toHaveBeenCalled();
  });

  test('Rejects unauthenticated requests (401 Unauthorized)', async () => {
    const response = await request(app)
      .post('/api/patients/scan')
      .send({ qrContent: `AKEH:PATIENT:${'x'.repeat(43)}` });

    expect(response.status).toBe(401);
  });

  test('Rejects invalid QR code content with 400 Bad Request and logs rejected scan audit', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const response = await request(app)
      .post('/api/patients/scan')
      .set('Authorization', `Bearer ${tokenFor('doctor')}`)
      .send({ qrContent: 'https://malicious-site.example.com/steal-data' });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/invalid patient qr code/i);
    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(pool.query.mock.calls[0][0]).toContain('patient_qr_audit_logs');
    expect(pool.query.mock.calls[0][1]).toContain('scan_rejected');
  });

  test('Rejects unknown patient / non-existent token with 404 Not Found and logs rejected scan audit', async () => {
    qrClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [] }) // SELECT -> not found
      .mockResolvedValueOnce({ rows: [] }) // audit log insert
      .mockResolvedValueOnce({}); // COMMIT

    const response = await request(app)
      .post('/api/patients/scan')
      .set('Authorization', `Bearer ${tokenFor('doctor')}`)
      .send({ qrContent: `AKEH:PATIENT:${'0'.repeat(43)}` });

    expect(response.status).toBe(404);
    expect(response.body.message).toMatch(/invalid, expired, or revoked/i);
    expect(qrClient.query.mock.calls[2][0]).toContain('patient_qr_audit_logs');
    expect(qrClient.query.mock.calls[2][1]).toContain('scan_rejected');
  });

  test('Rejects revoked or inactive token (is_active = false) with 404 Not Found', async () => {
    qrClient.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [] }) // Query has WHERE is_active = true, so returns 0 rows
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({});

    const response = await request(app)
      .post('/api/patients/scan')
      .set('Authorization', `Bearer ${tokenFor('doctor')}`)
      .send({ qrContent: `AKEH:PATIENT:${'r'.repeat(43)}` });

    expect(response.status).toBe(404);
    expect(response.body.message).toMatch(/invalid, expired, or revoked/i);
  });

  test('Wristband 1D barcode or MRN scanning: validates PAT-0042', async () => {
    qrClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [mockDbPatient] }) // SELECT patient by ID
      .mockResolvedValueOnce({ rows: [{ id: 88 }] }) // SELECT active identity
      .mockResolvedValueOnce({ rows: [] }) // audit log
      .mockResolvedValueOnce({}); // COMMIT

    const response = await request(app)
      .post('/api/patients/scan')
      .set('Authorization', `Bearer ${tokenFor('doctor')}`)
      .send({ qrContent: 'PAT-0042' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.patient.id).toBe(42);
    expect(response.body.data.patient.mrn).toBe('PAT-0042');
  });

  test('Barcode scanner with asterisks: validates *PAT-0042*', async () => {
    qrClient.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [mockDbPatient] })
      .mockResolvedValueOnce({ rows: [{ id: 88 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({});

    const response = await request(app)
      .post('/api/patients/scan')
      .set('Authorization', `Bearer ${tokenFor('receptionist')}`)
      .send({ qrContent: '*PAT-0042*' });

    expect(response.status).toBe(200);
    expect(response.body.data.patient.id).toBe(42);
  });
});
