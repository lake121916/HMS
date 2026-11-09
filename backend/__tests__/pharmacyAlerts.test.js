const request = require('supertest');
const app = require('../src/server');
const pool = require('../src/config/database');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

describe('Priority 3: Pharmacy Low-Stock & Expiry Alerts', () => {
  let pharmacistToken;
  let sampleMedId;
  let expiredBatchId;
  let nearExpiryBatchId;
  let createdAlertId;

  beforeAll(async () => {
    // Generate valid pharmacist JWT
    pharmacistToken = jwt.sign(
      { id: 1, role: 'pharmacist', email: 'pharmacist@alemketema.et' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 1. Create a test medicine
    const medRes = await pool.query(
      `INSERT INTO medicines (name, generic_name, category, unit, unit_price)
       VALUES ('Amoxicillin Test Alert', 'Amoxicillin Trihydrate', 'Antibiotics', 'Capsule', 15.00)
       RETURNING id`
    );
    sampleMedId = medRes.rows[0].id;

    // 2. Create an expired batch
    const expRes = await pool.query(
      `INSERT INTO medication_batches (
        medication_id, batch_number, quantity_received, quantity_available,
        expiry_date, status
      )
      VALUES ($1, 'BAT-EXP-001', 50, 20, CURRENT_DATE - INTERVAL '10 days', 'active')
      RETURNING id`,
      [sampleMedId]
    );
    expiredBatchId = expRes.rows[0].id;

    // 3. Create a near-expiry batch (expires in 20 days)
    const nearRes = await pool.query(
      `INSERT INTO medication_batches (
        medication_id, batch_number, quantity_received, quantity_available,
        expiry_date, status
      )
      VALUES ($1, 'BAT-NEAR-002', 100, 45, CURRENT_DATE + INTERVAL '20 days', 'active')
      RETURNING id`,
      [sampleMedId]
    );
    nearExpiryBatchId = nearRes.rows[0].id;
  });

  afterAll(async () => {
    if (sampleMedId) {
      await pool.query('DELETE FROM pharmacy_inventory_alerts WHERE medication_id = $1', [sampleMedId]);
      await pool.query('DELETE FROM inventory_ledger WHERE medication_id = $1', [sampleMedId]);
      await pool.query('DELETE FROM medication_batches WHERE medication_id = $1', [sampleMedId]);
      await pool.query('DELETE FROM medicines WHERE id = $1', [sampleMedId]);
    }
  });

  it('POST /api/pharmacy/inventory/evaluate-alerts — evaluates stock and generates persistent alerts', async () => {
    const res = await request(app)
      .post('/api/pharmacy/inventory/evaluate-alerts')
      .set('Authorization', `Bearer ${pharmacistToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.alertsCreated).toBeGreaterThanOrEqual(1);
  }, 15000);

  it('GET /api/pharmacy/inventory/alerts — retrieves active alerts with critical priorities', async () => {
    const res = await request(app)
      .get('/api/pharmacy/inventory/alerts')
      .set('Authorization', `Bearer ${pharmacistToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.alerts)).toBe(true);

    const testAlert = res.body.data.alerts.find(a => a.medication_id === sampleMedId);
    expect(testAlert).toBeDefined();
    expect(['expired', 'near_expiry', 'low_stock']).toContain(testAlert.alert_type);
    createdAlertId = testAlert.id;
  });

  it('PATCH /api/pharmacy/inventory/alerts/:id/acknowledge — acknowledges alert with user attribution', async () => {
    expect(createdAlertId).toBeDefined();

    const res = await request(app)
      .patch(`/api/pharmacy/inventory/alerts/${createdAlertId}/acknowledge`)
      .set('Authorization', `Bearer ${pharmacistToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.alert.is_acknowledged).toBe(true);
    expect(res.body.data.alert.acknowledged_by).toBe(1);
  });

  it('POST /api/pharmacy/inventory/batches/:id/quarantine — isolates expired batch and records in ledger', async () => {
    const res = await request(app)
      .post(`/api/pharmacy/inventory/batches/${expiredBatchId}/quarantine`)
      .set('Authorization', `Bearer ${pharmacistToken}`)
      .send({ reason: 'Routine safety audit identified past-expiration batch' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.quarantinedQuantity).toBe(20);

    // Verify batch is quarantined in DB
    const checkBatch = await pool.query('SELECT status, quantity_available FROM medication_batches WHERE id = $1', [expiredBatchId]);
    expect(checkBatch.rows[0].status).toBe('quarantined');
    expect(checkBatch.rows[0].quantity_available).toBe(0);
  });
});
