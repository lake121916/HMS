/**
 * Prescription Management & Dispensing Integration Test Suite
 * Alem Ketema Enat Hospital Management System
 */

const request = require('supertest');
const app = require('../src/server');
const pool = require('../src/config/database');
const jwt = require('jsonwebtoken');

describe('Pharmacist Prescription Management & Dispensing Suite', () => {
  let doctorToken, pharmacistToken, nurseToken, patientToken;
  let testPatientId, testDoctorId, testMedId, testBatchId;
  let testPrescriptionId;

  beforeAll(async () => {
    // Generate role tokens
    const secret = process.env.JWT_SECRET || 'hospital_jwt_secret_dev_key_2024';
    doctorToken = jwt.sign({ id: 1, email: 'dr.test@akeh.gov.et', role: 'doctor' }, secret);
    pharmacistToken = jwt.sign({ id: 4, email: 'pharm.test@akeh.gov.et', role: 'pharmacist' }, secret);
    nurseToken = jwt.sign({ id: 5, email: 'nurse.test@akeh.gov.et', role: 'nurse' }, secret);
    patientToken = jwt.sign({ id: 6, email: 'patient.test@akeh.gov.et', role: 'patient' }, secret);

    // Ensure doctor exists
    let docRes = await pool.query('SELECT id FROM doctors LIMIT 1');
    if (!docRes.rows.length) {
      docRes = await pool.query(`
        INSERT INTO doctors (user_id, first_name, last_name, specialty, phone)
        VALUES (1, 'Dr. Alemayehu', 'Mekonnen', 'Internal Medicine', '+251911223344')
        RETURNING id
      `);
    }
    testDoctorId = docRes.rows[0].id;

    // Ensure patient exists
    let patRes = await pool.query('SELECT id FROM patients LIMIT 1');
    if (!patRes.rows.length) {
      patRes = await pool.query(`
        INSERT INTO patients (first_name, last_name, date_of_birth, gender, phone)
        VALUES ('Tadesse', 'Bekele', '1985-04-12', 'male', '+251911998877')
        RETURNING id
      `);
    }
    testPatientId = patRes.rows[0].id;

    // Ensure medicine exists
    const medRes = await pool.query(`
      INSERT INTO medicines (name, generic_name, category, unit, unit_price, is_controlled, is_prescription_required)
      VALUES ('Azithromycin 500mg Test', 'Azithromycin', 'Antibiotic', 'Tablet', 45.00, false, true)
      RETURNING id
    `);
    testMedId = medRes.rows[0].id;

    // Create 2 batches: one near expiry (10 units), one longer expiry (50 units)
    const b1 = await pool.query(`
      INSERT INTO medication_batches 
        (medication_id, batch_number, quantity_received, quantity_available, expiry_date, storage_location, status)
      VALUES ($1, 'AZI-EARLY-01', 10, 10, CURRENT_DATE + INTERVAL '45 days', 'Shelf B1', 'active')
      RETURNING id
    `, [testMedId]);
    testBatchId = b1.rows[0].id;

    await pool.query(`
      INSERT INTO medication_batches 
        (medication_id, batch_number, quantity_received, quantity_available, expiry_date, storage_location, status)
      VALUES ($1, 'AZI-LATE-02', 50, 50, CURRENT_DATE + INTERVAL '300 days', 'Shelf B2', 'active')
    `, [testMedId]);
  });

  afterAll(async () => {
    // Clean up created test data
    if (testPrescriptionId) {
      await pool.query('DELETE FROM batch_dispensations WHERE prescription_id = $1', [testPrescriptionId]);
      await pool.query('DELETE FROM invoice_items WHERE source_type = $1 AND source_id = $2', ['prescription', testPrescriptionId]);
      await pool.query('DELETE FROM prescriptions WHERE id = $1', [testPrescriptionId]);
    }
    if (testMedId) {
      await pool.query('DELETE FROM medication_batches WHERE medication_id = $1', [testMedId]);
      await pool.query('DELETE FROM inventory_ledger WHERE medication_id = $1', [testMedId]);
      await pool.query('DELETE FROM medicines WHERE id = $1', [testMedId]);
    }
  });

  describe('1. Role Permissions Enforcement', () => {
    it('rejects pharmacist from creating doctor prescriptions with 403', async () => {
      const res = await request(app)
        .post('/api/prescriptions')
        .set('Authorization', `Bearer ${pharmacistToken}`)
        .send({
          patient_id: testPatientId,
          medication_name: 'Azithromycin 500mg Test',
          dosage: '500mg',
          frequency: 'Once daily',
          duration: '3 days',
          quantity: 3
        });
      expect(res.status).toBe(403);
    });

    it('rejects nurse from dispensing medicines with 403', async () => {
      const res = await request(app)
        .post('/api/prescriptions/1/dispense')
        .set('Authorization', `Bearer ${nurseToken}`)
        .send({ quantity_to_dispense: 1 });
      expect(res.status).toBe(403);
    });

    it('allows doctor to create a prescription with prescribed quantity', async () => {
      const res = await request(app)
        .post('/api/prescriptions')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          patient_id: testPatientId,
          medication_name: 'Azithromycin 500mg Test',
          dosage: '500mg',
          frequency: 'Once daily',
          duration: '5 days',
          instructions: 'Take 1 hour before meal with water',
          quantity: 5
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.prescription).toBeDefined();
      expect(res.body.data.prescription.quantity).toBe(5);
      expect(res.body.data.prescription.status).toBe('Pending');
      testPrescriptionId = res.body.data.prescription.id;
    });

    it('rejects pharmacist from editing doctor clinical details (dosage/frequency) with 403', async () => {
      const res = await request(app)
        .put(`/api/prescriptions/${testPrescriptionId}`)
        .set('Authorization', `Bearer ${pharmacistToken}`)
        .send({
          dosage: '1000mg',
          duration: '10 days'
        });
      expect(res.status).toBe(403);
    });

    it('rejects pharmacist from deleting a doctor prescription with 403', async () => {
      const res = await request(app)
        .delete(`/api/prescriptions/${testPrescriptionId}`)
        .set('Authorization', `Bearer ${pharmacistToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe('2. Detailed Prescription View & Inventory Check', () => {
    it('returns prescription details with available batches sorted by FEFO', async () => {
      const res = await request(app)
        .get(`/api/prescriptions/${testPrescriptionId}`)
        .set('Authorization', `Bearer ${pharmacistToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const data = res.body.data;
      expect(data.prescription.id).toBe(testPrescriptionId);
      expect(data.prescription.patient_name).toBeDefined();
      expect(data.prescription.patient_mrn).toBeDefined();
      expect(data.prescription.prescribedQuantity).toBe(5);
      expect(data.prescription.dispensedQuantity).toBe(0);
      expect(data.prescription.remainingQuantity).toBe(5);
      expect(data.totalStockAvailable).toBe(60); // 10 + 50
      expect(data.batches.length).toBe(2);
      expect(data.batches[0].batch_number).toBe('AZI-EARLY-01'); // Earliest expiry first (FEFO)
    });
  });

  describe('3. Partial Dispensing & Status Transition', () => {
    it('supports partial dispensing (dispensing 2 out of 5 units)', async () => {
      const res = await request(app)
        .post(`/api/prescriptions/${testPrescriptionId}/dispense`)
        .set('Authorization', `Bearer ${pharmacistToken}`)
        .send({
          quantity_to_dispense: 2,
          notes: 'Patient requested 2 days partial supply'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const data = res.body.data;
      expect(data.quantityDispensedNow).toBe(2);
      expect(data.totalQuantityDispensed).toBe(2);
      expect(data.remainingQuantity).toBe(3);
      expect(data.status).toBe('Partially Dispensed');
      expect(data.isFullyDispensed).toBe(false);

      // Verify batch stock was reduced from earliest batch (10 - 2 = 8)
      const bRes = await pool.query('SELECT quantity_available FROM medication_batches WHERE id = $1', [testBatchId]);
      expect(parseInt(bRes.rows[0].quantity_available, 10)).toBe(8);
    });

    it('rejects dispensing more than remaining quantity (e.g. trying to dispense 10 when 3 remain)', async () => {
      const res = await request(app)
        .post(`/api/prescriptions/${testPrescriptionId}/dispense`)
        .set('Authorization', `Bearer ${pharmacistToken}`)
        .send({
          quantity_to_dispense: 10
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/exceeds remaining/i);
    });
  });

  describe('4. Full Dispensing & Billing Integration', () => {
    it('dispenses remaining 3 units and marks prescription as Dispensed', async () => {
      const res = await request(app)
        .post(`/api/prescriptions/${testPrescriptionId}/dispense`)
        .set('Authorization', `Bearer ${pharmacistToken}`)
        .send({
          quantity_to_dispense: 3,
          notes: 'Dispensed balance of 3 tablets'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const data = res.body.data;
      expect(data.quantityDispensedNow).toBe(3);
      expect(data.totalQuantityDispensed).toBe(5);
      expect(data.remainingQuantity).toBe(0);
      expect(data.status).toBe('Dispensed');
      expect(data.isFullyDispensed).toBe(true);
    });

    it('prevents duplicate dispensing once already fully dispensed', async () => {
      const res = await request(app)
        .post(`/api/prescriptions/${testPrescriptionId}/dispense`)
        .set('Authorization', `Bearer ${pharmacistToken}`)
        .send({
          quantity_to_dispense: 1
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already been fully dispensed/i);
    });

    it('verifies that billing was integrated without duplicate invoice items', async () => {
      const items = await pool.query(
        'SELECT * FROM invoice_items WHERE source_type = $1 AND source_id = $2',
        ['prescription', testPrescriptionId]
      );
      // There should only be 1 invoice item for this prescription (no duplicate double charge)
      expect(items.rows.length).toBe(1);
    });
  });

  describe('5. Dispensing Audit History', () => {
    it('returns dispensing history with all required audit fields', async () => {
      const res = await request(app)
        .get('/api/prescriptions/dispensations/history')
        .set('Authorization', `Bearer ${pharmacistToken}`)
        .query({ search: 'Azithromycin' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const list = res.body.data.dispensations;
      expect(list.length).toBeGreaterThanOrEqual(2); // 2 partial dispenses

      const record = list[0];
      expect(record.prescription_id).toBeDefined();
      expect(record.patient_id).toBeDefined();
      expect(record.patient_name).toBeDefined();
      expect(record.pharmacist_id).toBeDefined();
      expect(record.batch_number).toBeDefined();
      expect(record.quantity_prescribed).toBe(5);
      expect(record.quantity_dispensed).toBeDefined();
      expect(record.dispensed_at).toBeDefined();
    });
  });
});
