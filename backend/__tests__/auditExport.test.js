const request = require('supertest');
const app = require('../src/server');
const pool = require('../src/config/database');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

describe('Priority 5: Secure Audit Trail CSV Export', () => {
  let adminToken;
  let normalUserToken;
  let sampleAuditId;

  beforeAll(async () => {
    adminToken = jwt.sign(
      { id: 1, email: 'admin@hospital.com', role: 'super_admin' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    normalUserToken = jwt.sign(
      { id: 2, email: 'nurse@hospital.com', role: 'nurse' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Insert an audit row with potential formula injection payload
    const res = await pool.query(
      `INSERT INTO audit_logs (
        user_id, action, entity_type, ip_address, new_values, timestamp
      )
      VALUES (
        1, '=2+5*CMD|'' /C calc''!A0', 'patients', '192.168.1.50',
        '{"note": "+SUM(A1:B10), dangerous payload"}',
        NOW()
      )
      RETURNING id`
    );
    sampleAuditId = res.rows[0].id;
  });

  afterAll(async () => {
    if (sampleAuditId) {
      await pool.query('DELETE FROM audit_logs WHERE id = $1', [sampleAuditId]);
      await pool.query("DELETE FROM audit_logs WHERE action = 'EXPORT_AUDIT_LOG_CSV'");
    }
  });

  it('rejects unauthorized users from exporting audit trail', async () => {
    const res = await request(app)
      .get('/api/admin/audit-logs/export')
      .set('Authorization', `Bearer ${normalUserToken}`);

    expect([401, 403]).toContain(res.statusCode);
  });

  it('allows authorized super_admin to export CSV with correct headers and sanitization', async () => {
    const res = await request(app)
      .get('/api/admin/audit-logs/export')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.headers['content-disposition']).toMatch(/attachment; filename="hospital_audit_log_.*\.csv"/);

    const csvBody = res.text;
    expect(csvBody).toContain('Log ID,Timestamp (UTC),User ID,User Email');

    // Verify formula injection sanitization:
    // The formula starting with '=' should be prepended with a single quote "'"
    expect(csvBody).toContain("'=2+5*CMD");

    // Verify that the export event itself was recorded in audit_logs
    const auditCheck = await pool.query(
      "SELECT * FROM audit_logs WHERE action = 'EXPORT_AUDIT_LOG_CSV' ORDER BY id DESC LIMIT 1"
    );
    expect(auditCheck.rows.length).toBe(1);
    expect(auditCheck.rows[0].user_id).toBe(1);
  });
});
