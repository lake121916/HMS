const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/server');
const pool = require('../src/config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

const cashierToken = jwt.sign(
  { id: 4, email: 'cashier@hospital.com', role: 'cashier', firstName: 'Cashier' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

const adminToken = jwt.sign(
  { id: 1, email: 'admin@hospital.com', role: 'admin', firstName: 'Admin' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

describe('Priorities 1 & 2: Insurance Co-pay, Pre-Auth & Dynamic QR Payments', () => {
  let samplePatientId = null;
  let sampleInvoiceId = null;
  let samplePolicyId = null;
  let createdPaymentRequestId = null;
  const testTxnId = `TXN-TELE-${Date.now()}`;

  beforeAll(async () => {
    // 1. Find or create a patient
    const patRes = await pool.query('SELECT id FROM patients ORDER BY id ASC LIMIT 1');
    if (patRes.rows.length) {
      samplePatientId = patRes.rows[0].id;
    }

    // 2. Ensure an active CBHI policy exists for this patient
    const cbhiProvider = await pool.query("SELECT id FROM insurance_providers WHERE code = 'CBHI' LIMIT 1");
    const providerId = cbhiProvider.rows[0]?.id || 1;

    const polRes = await pool.query(
      `INSERT INTO patient_insurance_policies (
        patient_id, provider_id, policy_number, membership_id, plan_name,
        plan_type, effective_date, expiry_date, annual_limit, remaining_benefit,
        copay_percentage, is_primary, is_active, verification_status
      )
      VALUES ($1, $2, 'POL-TEST-2026', 'MEM-9988', 'Standard CBHI Coverage',
              'inpatient_outpatient', '2026-01-01', '2026-12-31', 50000, 50000,
              15.00, true, true, 'verified')
      ON CONFLICT (patient_id, provider_id, policy_number) DO UPDATE
      SET is_active = true, remaining_benefit = 50000
      RETURNING id`,
      [samplePatientId, providerId]
    );
    samplePolicyId = polRes.rows[0].id;

    // 3. Create a fresh test invoice with items (total: 1000 ETB)
    const invRes = await pool.query(
      `INSERT INTO invoices (patient_id, invoice_date, subtotal, total_amount, status)
       VALUES ($1, NOW(), 1000.00, 1000.00, 'pending')
       RETURNING id`,
      [samplePatientId]
    );
    sampleInvoiceId = invRes.rows[0].id;

    await pool.query(
      `DELETE FROM invoice_items WHERE (source_type = 'consultation' AND source_id = 999901) OR (source_type = 'lab_order' AND source_id = 999902)`
    );

    await pool.query(
      `INSERT INTO invoice_items (invoice_id, patient_id, description, quantity, unit_price, source_type, source_id)
       VALUES 
         ($1, $2, 'Specialist Clinical Consultation', 1, 500.00, 'consultation', 999901),
         ($1, $2, 'Diagnostic CBC Lab Panel', 1, 500.00, 'lab_order', 999902)`,
      [sampleInvoiceId, samplePatientId]
    );
  });

  afterAll(async () => {
    if (sampleInvoiceId) {
      await pool.query('DELETE FROM invoice_items WHERE invoice_id = $1', [sampleInvoiceId]);
      await pool.query('DELETE FROM payments WHERE invoice_id = $1', [sampleInvoiceId]);
      await pool.query('DELETE FROM payment_requests WHERE invoice_id = $1', [sampleInvoiceId]);
      await pool.query('DELETE FROM invoices WHERE id = $1', [sampleInvoiceId]);
    }
    if (samplePolicyId) {
      await pool.query('DELETE FROM insurance_claims WHERE policy_id = $1', [samplePolicyId]);
      await pool.query('DELETE FROM patient_insurance_policies WHERE id = $1', [samplePolicyId]);
    }
  });

  describe('Priority 1: Insurance Co-pay Calculation & Claims', () => {
    it('GET /api/insurance/invoices/:id/copay-breakdown — calculates 85% CBHI and 15% co-pay', async () => {
      const res = await request(app)
        .get(`/api/insurance/invoices/${sampleInvoiceId}/copay-breakdown?policy_id=${samplePolicyId}`)
        .set('Authorization', `Bearer ${cashierToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalInvoiceAmount).toBe(1000.00);
      expect(res.body.data.approvedInsuranceContribution).toBe(850.00);
      expect(res.body.data.patientCoPay).toBe(150.00);
      expect(res.body.data.patientPayableBalance).toBe(150.00);
    });

    it('POST /api/insurance/invoices/:id/apply-copay — applies insurance split and generates claim', async () => {
      const res = await request(app)
        .post(`/api/insurance/invoices/${sampleInvoiceId}/apply-copay`)
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          policy_id: samplePolicyId,
          notes: 'Test cashier co-pay application'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.claim).toBeDefined();
      expect(res.body.data.claim.status).toBe('pending');
      expect(Number(res.body.data.claim.total_billed)).toBe(1000.00);
      expect(Number(res.body.data.claim.approved_amount)).toBe(850.00);
      expect(Number(res.body.data.claim.patient_copay)).toBe(150.00);
    });

    it('GET /api/insurance/reports/claims-summary — retrieves financial receivables summary', async () => {
      const res = await request(app)
        .get('/api/insurance/reports/claims-summary')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('totals');
      expect(res.body.data).toHaveProperty('byProvider');
      expect(Array.isArray(res.body.data.byProvider)).toBe(true);
    });
  });

  describe('Priority 2: Dynamic Telebirr & CBE Birr QR Checkout', () => {
    it('POST /api/payments/qr — generates dynamic Telebirr QR with exact patient balance', async () => {
      // Patient payable balance is 150 ETB after 850 ETB insurance coverage
      const res = await request(app)
        .post('/api/payments/qr')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          invoice_id: sampleInvoiceId,
          provider: 'telebirr',
          patient_id: samplePatientId
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('requestId');
      expect(res.body.data).toHaveProperty('qrPayload');
      expect(res.body.data).toHaveProperty('qrCodeDataUrl');
      expect(res.body.data.amount).toBe(150.00);
      expect(res.body.data.currency).toBe('ETB');
      expect(res.body.data.provider).toBe('telebirr');

      createdPaymentRequestId = res.body.data.requestId;
    });

    it('GET /api/payments/qr/:requestId/status — retrieves pending status', async () => {
      if (!createdPaymentRequestId) return;

      const res = await request(app)
        .get(`/api/payments/qr/${createdPaymentRequestId}/status`)
        .set('Authorization', `Bearer ${cashierToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('pending');
      expect(res.body.data.amount).toBe(150.00);
    });

    it('POST /api/payments/qr/:requestId/confirm — verifies transaction and issues receipt', async () => {
      if (!createdPaymentRequestId) return;

      const res = await request(app)
        .post(`/api/payments/qr/${createdPaymentRequestId}/confirm`)
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          transaction_id: testTxnId,
          amount: 150.00,
          notes: 'Telebirr dynamic QR payment confirmed'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('receiptNumber');
      expect(res.body.data.invoiceStatus).toBe('paid');
    });

    it('prevents replay / duplicate transaction reference rejection', async () => {
      if (!createdPaymentRequestId) return;

      // Create a second invoice
      const inv2Res = await pool.query(
        `INSERT INTO invoices (patient_id, invoice_date, subtotal, total_amount, status)
         VALUES ($1, NOW(), 200.00, 200.00, 'pending') RETURNING id`,
        [samplePatientId]
      );
      const inv2Id = inv2Res.rows[0].id;

      const qr2Res = await request(app)
        .post('/api/payments/qr')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({ invoice_id: inv2Id, provider: 'telebirr' });

      const req2Id = qr2Res.body.data.requestId;

      // Attempt to reuse testTxnId
      const replayRes = await request(app)
        .post(`/api/payments/qr/${req2Id}/confirm`)
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          transaction_id: testTxnId, // Duplicate reference
          amount: 200.00
        });

      expect(replayRes.statusCode).toBe(400);
      expect(replayRes.body.success).toBe(false);
      expect(replayRes.body.message).toContain('Duplicate payment reference');

      // Cleanup inv2
      await pool.query('DELETE FROM payment_requests WHERE invoice_id = $1', [inv2Id]);
      await pool.query('DELETE FROM invoices WHERE id = $1', [inv2Id]);
    });
  });
});
