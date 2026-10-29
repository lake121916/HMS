const request = require('supertest');
const app = require('../src/server');
const pool = require('../src/config/database');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

describe('Priority 7: PWA Offline Resilience & Idempotent Synchronization', () => {
  let userToken;
  let createdPatientId;
  const testOpId = `SYNC-REG-TEST-${Date.now()}`;

  beforeAll(async () => {
    userToken = jwt.sign(
      { id: 1, email: 'reception@hospital.com', role: 'receptionist' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    await pool.query('DELETE FROM offline_sync_logs WHERE operation_id = $1', [testOpId]);
    if (createdPatientId) {
      await pool.query('DELETE FROM patients WHERE id = $1', [createdPatientId]);
    }
  });

  it('POST /api/sync/pending-operations — applies offline patient registration draft', async () => {
    const payload = {
      first_name: 'Worku',
      last_name: 'Desta',
      gender: 'male',
      date_of_birth: '1995-08-20',
      phone: '+251911223344',
      email: 'worku.offline@alemketema.et'
    };

    const res = await request(app)
      .post('/api/sync/pending-operations')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        operations: [
          {
            operation_id: testOpId,
            operation_type: 'patient_registration',
            payload,
            client_timestamp: new Date().toISOString()
          }
        ]
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.applied).toBe(1);

    const result = res.body.data.results[0];
    expect(result.operation_id).toBe(testOpId);
    expect(result.status).toBe('applied');
    expect(result.server_entity_id).toBeDefined();
    createdPatientId = result.server_entity_id;

    // Verify patient actually exists in database
    const dbPat = await pool.query('SELECT * FROM patients WHERE id = $1', [createdPatientId]);
    expect(dbPat.rows.length).toBe(1);
    expect(dbPat.rows[0].first_name).toBe('Worku');
  });

  it('POST /api/sync/pending-operations — enforces idempotency and prevents duplicate patient creation', async () => {
    const initialPatientCount = await pool.query('SELECT COUNT(*) FROM patients WHERE phone = $1', ['+251911223344']);

    // Replay identical operation_id
    const res = await request(app)
      .post('/api/sync/pending-operations')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        operations: [
          {
            operation_id: testOpId,
            operation_type: 'patient_registration',
            payload: {
              first_name: 'Worku',
              last_name: 'Desta'
            }
          }
        ]
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    const result = res.body.data.results[0];
    expect(result.is_duplicate).toBe(true);
    expect(result.server_entity_id).toBe(createdPatientId);

    // Ensure no second patient row was inserted
    const finalPatientCount = await pool.query('SELECT COUNT(*) FROM patients WHERE phone = $1', ['+251911223344']);
    expect(finalPatientCount.rows[0].count).toBe(initialPatientCount.rows[0].count);
  });
});
