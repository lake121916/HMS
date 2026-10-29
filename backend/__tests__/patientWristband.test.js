const request = require('supertest');
const app = require('../src/server');
const pool = require('../src/config/database');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

describe('Priority 6: Patient Wristband Printing and Scanner Lookup', () => {
  let receptionistToken;
  let doctorToken;
  let testPatientId;
  let testBarcode;

  beforeAll(async () => {
    receptionistToken = jwt.sign(
      { id: 3, email: 'receptionist@hospital.com', role: 'receptionist' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    doctorToken = jwt.sign(
      { id: 2, email: 'doctor@hospital.com', role: 'doctor' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Create a test patient
    const pRes = await pool.query(
      `INSERT INTO patients (first_name, last_name, date_of_birth, gender, email, phone, blood_type)
       VALUES ('Abebe', 'Bikila', '1990-05-15', 'male', 'abebe.test@alemketema.et', '+251911998877', 'O+')
       RETURNING id`
    );
    testPatientId = pRes.rows[0].id;
    testBarcode = `PAT-${String(testPatientId).padStart(4, '0')}`;
  });

  afterAll(async () => {
    if (testPatientId) {
      await pool.query('DELETE FROM patient_wristband_logs WHERE patient_id = $1', [testPatientId]);
      await pool.query('DELETE FROM patients WHERE id = $1', [testPatientId]);
    }
  });

  it('POST /api/patients/:id/wristband-printed — logs wristband printing event', async () => {
    const res = await request(app)
      .post(`/api/patients/${testPatientId}/wristband-printed`)
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({ barcode: testBarcode });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.log.wristband_barcode).toBe(testBarcode);

    // Verify persisted in database
    const dbLog = await pool.query(
      'SELECT * FROM patient_wristband_logs WHERE patient_id = $1',
      [testPatientId]
    );
    expect(dbLog.rows.length).toBeGreaterThanOrEqual(1);
    expect(dbLog.rows[0].printed_by).toBe(3);
  });

  it('POST /api/patients/lookup-by-identifier — looks up patient by barcode and audits scan', async () => {
    const res = await request(app)
      .post('/api/patients/lookup-by-identifier')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ identifier: testBarcode });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.patient.id).toBe(testPatientId);
    expect(res.body.data.patient.first_name).toBe('Abebe');
    expect(res.body.data.patient.blood_type).toBe('O+');

    // Verify verification audit count updated
    const auditRes = await pool.query(
      'SELECT verified_count FROM patient_wristband_logs WHERE patient_id = $1',
      [testPatientId]
    );
    expect(Number(auditRes.rows[0].verified_count)).toBeGreaterThan(0);
  });

  it('POST /api/patients/lookup-by-identifier — returns 404 for unknown identifier', async () => {
    const res = await request(app)
      .post('/api/patients/lookup-by-identifier')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ identifier: 'PAT-9999999' });

    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
