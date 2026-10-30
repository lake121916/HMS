const request = require('supertest');
const app = require('../src/server');
const pool = require('../src/config/database');
const jwt = require('jsonwebtoken');

describe('Patient Registration Workflow', () => {
  let receptionistToken;
  let adminToken;
  let createdPatientIds = [];
  let createdUserIds = [];

  beforeAll(async () => {
    // Look up real receptionist and admin user IDs from database
    const recUser = await pool.query("SELECT id, email FROM users WHERE role = 'receptionist' LIMIT 1");
    const recId = recUser.rows.length > 0 ? recUser.rows[0].id : 5;
    const recEmail = recUser.rows.length > 0 ? recUser.rows[0].email : 'reception@hospital.com';

    const admUser = await pool.query("SELECT id, email FROM users WHERE role = 'admin' OR role = 'super_admin' LIMIT 1");
    const admId = admUser.rows.length > 0 ? admUser.rows[0].id : 1;
    const admEmail = admUser.rows.length > 0 ? admUser.rows[0].email : 'admin@hospital.com';

    // Generate valid tokens
    receptionistToken = jwt.sign(
      { id: recId, email: recEmail, role: 'receptionist' },
      process.env.JWT_SECRET || 'your_jwt_secret_key_change_this_in_production'
    );
    adminToken = jwt.sign(
      { id: admId, email: admEmail, role: 'admin' },
      process.env.JWT_SECRET || 'your_jwt_secret_key_change_this_in_production'
    );
  });

  afterAll(async () => {
    if (createdPatientIds.length > 0) {
      await pool.query('DELETE FROM invoices WHERE patient_id = ANY($1)', [createdPatientIds]);
      await pool.query('DELETE FROM patients WHERE id = ANY($1)', [createdPatientIds]);
    }
    if (createdUserIds.length > 0) {
      await pool.query('DELETE FROM users WHERE id = ANY($1)', [createdUserIds]);
    }
  });

  test('1. Registers patient with snake_case fields & without email (Receptionist Desk)', async () => {
    const res = await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({
        first_name: 'Almaz',
        last_name: 'Tadesse',
        date_of_birth: '1995-04-12',
        gender: 'female',
        phone: '+251911223344',
        blood_type: 'A+',
        allergies: 'Penicillin'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();

    // Verify both top-level and nested patient object exist
    const patientData = res.body.data.patient || res.body.data;
    expect(patientData.id).toBeDefined();
    expect(patientData.first_name).toBe('Almaz');
    expect(patientData.last_name).toBe('Tadesse');
    expect(patientData.blood_type).toBe('A+');
    expect(patientData.email).toContain('@hospital.local'); // Auto-generated internal email

    createdPatientIds.push(patientData.id);
    if (patientData.user_id) createdUserIds.push(patientData.user_id);
  });

  test('2. Registers patient with camelCase fields & valid email (Admin Portal)', async () => {
    const testEmail = `chala_${Date.now()}@example.com`;
    const res = await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'Chala',
        lastName: 'Bekele',
        dateOfBirth: '1988-11-20',
        gender: 'male',
        email: testEmail,
        phone: '+251922334455',
        bloodType: 'O+'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    const patientData = res.body.data.patient || res.body.data;
    expect(patientData.first_name).toBe('Chala');
    expect(patientData.last_name).toBe('Bekele');
    expect(patientData.email).toBe(testEmail);

    createdPatientIds.push(patientData.id);
    if (patientData.user_id) createdUserIds.push(patientData.user_id);
  });

  test('3. Rejects registration when mandatory fields are missing', async () => {
    const res = await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({
        phone: '+251911000000'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('4. Creates intake invoice with valid pending status', async () => {
    const patientId = createdPatientIds[0];
    const res = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({
        patient_id: patientId,
        subtotal: 50,
        tax: 0,
        discount: 0,
        notes: 'Patient registration fee',
        items: [{
          service: 'Patient Registration',
          quantity: 1,
          unit_price: 50,
          total: 50
        }]
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.invoice.status).toBe('pending');
    expect(Number(res.body.data.invoice.total_amount)).toBe(50);
  });

  test('5. Verifies registration invoice was created AUTOMATICALLY by backend without manual invoice request', async () => {
    const patientId = createdPatientIds[1]; // Chala Bekele
    const invRes = await pool.query('SELECT * FROM invoices WHERE patient_id = $1', [patientId]);
    expect(invRes.rows.length).toBeGreaterThan(0);
    const inv = invRes.rows[0];
    expect(inv.status).toBe('pending');
    expect(Number(inv.total_amount)).toBe(50);
    expect(inv.notes).toContain('Automatic Patient Registration Fee');

    // Also verify line item in invoice_items
    const itemRes = await pool.query('SELECT * FROM invoice_items WHERE invoice_id = $1', [inv.id]);
    expect(itemRes.rows.length).toBeGreaterThan(0);
    expect(itemRes.rows[0].description).toBe('Patient Registration Fee');
    expect(Number(itemRes.rows[0].unit_price)).toBe(50);
  });
});
