/**
 * Comprehensive Test Suite for Full Pharmacy Services:
 * Direct OTC POS Sales, Controlled Substances Register, Prescription Labels, and Safety Checks
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');

const mockClient = {
  query: jest.fn(),
  release: jest.fn()
};

jest.mock('../src/config/database', () => ({
  query: jest.fn().mockResolvedValue({ rows: [] }),
  connect: jest.fn().mockResolvedValue(mockClient),
  on: jest.fn()
}));

jest.mock('../src/services/billingService', () => ({
  getOrCreateInvoice: jest.fn().mockResolvedValue({ id: 101 }),
  createBillingItem: jest.fn().mockResolvedValue({ id: 201 }),
  billConsultation: jest.fn().mockResolvedValue({ id: 301 }),
  getEncounterBilling: jest.fn().mockResolvedValue({ invoice: { id: 101 }, items: [] })
}));

jest.mock('../src/services/socketService', () => ({
  init: jest.fn(),
  broadcast: jest.fn(),
  emitToUser: jest.fn()
}));

const app = require('../src/server');
const pool = require('../src/config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const tokenFor = (role, id = 99) => jwt.sign({ id, email: `${role}@hospital.com`, role, username: role }, JWT_SECRET, { expiresIn: '1h' });

describe('Full Pharmacy Management Suite Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    pool.connect.mockResolvedValue(mockClient);
    pool.query.mockResolvedValue({ rows: [] });
    mockClient.query.mockResolvedValue({ rows: [] });
  });

  describe('Point of Sale (POS) & Walk-In OTC Sales', () => {
    it('GET /api/pharmacy/sales returns recent OTC sales with totals', async () => {
      const pharmacistToken = tokenFor('pharmacist', 101);

      pool.query
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            sale_receipt_number: 'POS-2026-0001',
            customer_name: 'Walk-in Customer (Almaz Kebede)',
            total_amount: 180.00,
            final_amount: 180.00,
            payment_method: 'telebirr',
            created_at: new Date().toISOString()
          }]
        })
        .mockResolvedValueOnce({
          rows: [{
            id: 10,
            sale_id: 1,
            medication_name: 'Paracetamol 500mg',
            unit_price: 15.00,
            quantity: 2,
            total_price: 30.00
          }]
        })
        .mockResolvedValueOnce({
          rows: [{
            total_sales_today: '1',
            total_revenue_today: '180.00'
          }]
        });

      const res = await request(app)
        .get('/api/pharmacy/sales')
        .set('Authorization', `Bearer ${pharmacistToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.sales).toHaveLength(1);
      expect(res.body.data.sales[0].items).toHaveLength(1);
      expect(res.body.data.summary.todayRevenueETB).toBe(180);
    });

    it('POST /api/pharmacy/sales records OTC sale and allocates earliest batch', async () => {
      const pharmacistToken = tokenFor('pharmacist', 101);

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ count: '2' }] }) // countRes
        .mockResolvedValueOnce({ rows: [{ id: 5, name: 'Amoxicillin 500mg', unit_price: 45.00 }] }) // medRes
        .mockResolvedValueOnce({ rows: [{ id: 12, batch_number: 'BATCH-2026', quantity_available: 50 }] }) // batchRes
        .mockResolvedValueOnce({}) // UPDATE batch
        .mockResolvedValueOnce({}) // INSERT inventory_ledger
        .mockResolvedValueOnce({ // INSERT pharmacy_sales
          rows: [{
            id: 8,
            sale_receipt_number: 'POS-2026-0003',
            customer_name: 'Walk-in Abebe',
            final_amount: 90.00
          }]
        })
        .mockResolvedValueOnce({}) // INSERT pharmacy_sale_items
        .mockResolvedValueOnce({}); // COMMIT

      const res = await request(app)
        .post('/api/pharmacy/sales')
        .set('Authorization', `Bearer ${pharmacistToken}`)
        .send({
          customer_name: 'Walk-in Abebe',
          items: [{ medication_id: 5, quantity: 2 }],
          payment_method: 'cbe_birr'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.sale.sale_receipt_number).toBe('POS-2026-0003');
    });
  });

  describe('Controlled Substances / Narcotics Register', () => {
    it('GET /api/pharmacy/controlled-substances returns narcotics logbook and safe stock', async () => {
      const doctorToken = tokenFor('doctor', 102);

      pool.query
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            log_number: 'CSL-2026-001',
            medication_name: 'Morphine Sulfate 10mg/mL',
            quantity_dispensed: 2,
            balance_remaining: 48,
            patient_name: 'Abebe Bikila',
            doctor_name: 'Dr. Awoke Desta'
          }]
        })
        .mockResolvedValueOnce({
          rows: [{
            id: 99,
            name: 'Morphine Sulfate 10mg/mL',
            safe_balance: '48'
          }]
        });

      const res = await request(app)
        .get('/api/pharmacy/controlled-substances')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.logs).toHaveLength(1);
      expect(res.body.data.safeInventory).toHaveLength(1);
    });

    it('POST /api/pharmacy/controlled-substances logs administration with witness', async () => {
      const pharmacistToken = tokenFor('pharmacist', 101);

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 99, name: 'Morphine Sulfate 10mg/mL' }] }) // medRes
        .mockResolvedValueOnce({ rows: [{ id: 4, batch_number: 'NARCO-4102', quantity_available: 50 }] }) // batchRes
        .mockResolvedValueOnce({}) // UPDATE batch
        .mockResolvedValueOnce({ rows: [{ count: '1' }] }) // countRes
        .mockResolvedValueOnce({ // INSERT controlled_substances_log
          rows: [{
            id: 2,
            log_number: 'CSL-2026-0002',
            medication_name: 'Morphine Sulfate 10mg/mL',
            balance_remaining: 48,
            witness_name: 'Sr. Bethlehem Yilma'
          }]
        })
        .mockResolvedValueOnce({}); // COMMIT

      const res = await request(app)
        .post('/api/pharmacy/controlled-substances')
        .set('Authorization', `Bearer ${pharmacistToken}`)
        .send({
          medication_id: 99,
          patient_name: 'Abebe Bikila',
          prescribing_doctor_id: 1,
          doctor_name: 'Dr. Awoke Desta',
          quantity_dispensed: 2,
          witness_name: 'Sr. Bethlehem Yilma',
          witness_role: 'ICU Charge Nurse'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.log.log_number).toBe('CSL-2026-0002');
      expect(res.body.data.log.balance_remaining).toBe(48);
    });
  });

  describe('Prescription Dispensing Label Generator', () => {
    it('GET /api/pharmacy/prescriptions/:id/label returns formatted label data', async () => {
      const nurseToken = tokenFor('nurse', 103);

      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 42,
          patient_name: 'Tigist Hailu',
          gender: 'female',
          medication_name: 'Amoxicillin 500mg',
          dosage: '500mg',
          frequency: 'TID',
          duration: '7 days',
          instructions: 'Take with food after meals',
          doctor_name: 'Alemayehu Tadesse',
          department_name: 'Pediatrics'
        }]
      });

      const res = await request(app)
        .get('/api/pharmacy/prescriptions/42/label')
        .set('Authorization', `Bearer ${nurseToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.prescriptionNumber).toBe('RX-000042');
      expect(res.body.data.instructionsAmharic).toBe('ከምግብ ጋር ይወሰድ');
    });
  });

  describe('Clinical Safety & Drug Allergy Checker', () => {
    it('POST /api/pharmacy/safety-check detects patient allergies and drug interactions', async () => {
      const doctorToken = tokenFor('doctor', 102);

      pool.query
        // 1. Allergies
        .mockResolvedValueOnce({
          rows: [{
            allergen: 'Penicillin',
            severity: 'severe',
            reaction: 'Anaphylaxis and hives'
          }]
        })
        // 2. Concurrent active meds
        .mockResolvedValueOnce({
          rows: [{
            medication_name: 'Warfarin 5mg'
          }]
        });

      const res = await request(app)
        .post('/api/pharmacy/safety-check')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          patient_id: 15,
          medication_name: 'Amoxicillin Penicillin Derivative'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.safe).toBe(false);
      expect(res.body.data.warnings[0].type).toBe('allergy');
      expect(res.body.data.warnings[0].message).toContain('Penicillin');
    });
  });
});
