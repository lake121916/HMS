const request = require('supertest');
const app = require('../src/server');
const pool = require('../src/config/database');
const jwt = require('jsonwebtoken');

describe('Workload Summary and Patient Deletion Security Tests', () => {
  let superAdminToken;
  let adminToken;
  let receptionistToken;
  let doctorToken;
  let cashierToken;
  let testPatientId;

  beforeAll(async () => {
    const jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
    
    superAdminToken = jwt.sign(
      { id: 1, email: 'superadmin@hospital.com', role: 'super_admin' },
      jwtSecret,
      { expiresIn: '1h' }
    );

    adminToken = jwt.sign(
      { id: 2, email: 'admin@hospital.com', role: 'admin' },
      jwtSecret,
      { expiresIn: '1h' }
    );

    receptionistToken = jwt.sign(
      { id: 3, email: 'reception@hospital.com', role: 'receptionist' },
      jwtSecret,
      { expiresIn: '1h' }
    );

    doctorToken = jwt.sign(
      { id: 4, email: 'doctor@hospital.com', role: 'doctor' },
      jwtSecret,
      { expiresIn: '1h' }
    );

    cashierToken = jwt.sign(
      { id: 5, email: 'cashier@hospital.com', role: 'cashier' },
      jwtSecret,
      { expiresIn: '1h' }
    );

    // Create a temporary test patient
    const res = await pool.query(
      `INSERT INTO patients (first_name, last_name, date_of_birth, gender, phone, blood_type)
       VALUES ('Security', 'TestPatient', '1995-05-15', 'male', '0947888999', 'O+')
       RETURNING id`
    );
    testPatientId = res.rows[0].id;
  });

  afterAll(async () => {
    if (testPatientId) {
      await pool.query('DELETE FROM patient_encounters WHERE patient_id = $1', [testPatientId]);
      await pool.query('DELETE FROM patients WHERE id = $1', [testPatientId]);
    }
    await pool.end();
  });

  describe('1. Workload Summary API (GET /api/workload/summary)', () => {
    it('should return live workload counts and duty status for authenticated staff', async () => {
      const res = await request(app)
        .get('/api/workload/summary')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('counts');
      expect(typeof res.body.data.counts.triage).toBe('number');
      expect(typeof res.body.data.counts.doctorQueue).toBe('number');
      expect(typeof res.body.data.counts.labPending).toBe('number');
      expect(typeof res.body.data.counts.pharmacyPending).toBe('number');
      expect(typeof res.body.data.counts.cashierPending).toBe('number');
      expect(res.body.data).toHaveProperty('dutyStatus');
      expect(typeof res.body.data.dutyStatus.isOnDuty).toBe('boolean');
    });

    it('should reject unauthenticated workload queries', async () => {
      await request(app)
        .get('/api/workload/summary')
        .expect(401);
    });
  });

  describe('2. Manual Invoice Creation Restrictions (POST /api/invoices)', () => {
    it('should forbid receptionist from manually creating invoices outside Cashier POS', async () => {
      const res = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({
          patient_id: testPatientId,
          subtotal: 250,
          notes: 'Unauthorized manual invoice attempt'
        })
        .expect(403);

      expect(res.body.success).toBe(false);
    });

    it('should allow cashier to access invoice creation in Cashier POS', async () => {
      const res = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          patient_id: testPatientId,
          subtotal: 150,
          tax: 0,
          discount: 0,
          notes: 'Authorized Cashier POS invoice'
        });

      // Status 201 indicates authorized creation
      expect([201, 200]).toContain(res.status);
      expect(res.body.success).toBe(true);
      if (res.body.data?.invoice?.id) {
        await pool.query('DELETE FROM invoices WHERE id = $1', [res.body.data.invoice.id]);
      }
    });
  });

  describe('3. Patient Record Deletion Restrictions (DELETE /api/patients/:id)', () => {
    it('should forbid non-super-admin (receptionist/admin) from deleting patients', async () => {
      await request(app)
        .delete(`/api/patients/${testPatientId}`)
        .set('Authorization', `Bearer ${receptionistToken}`)
        .expect(403);

      await request(app)
        .delete(`/api/patients/${testPatientId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });

    it('should prevent super-admin from deleting patients with linked clinical records', async () => {
      // Add a linked encounter
      const enc = await pool.query(
        `INSERT INTO patient_encounters (patient_id, encounter_type, status)
         VALUES ($1, 'outpatient', 'in_consultation') RETURNING id`,
        [testPatientId]
      );
      const encId = enc.rows[0].id;

      const res = await request(app)
        .delete(`/api/patients/${testPatientId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Cannot delete patient record: patient has linked clinical encounters/i);

      // Clean up linked encounter
      await pool.query('DELETE FROM patient_encounters WHERE id = $1', [encId]);
    });
  });
});
