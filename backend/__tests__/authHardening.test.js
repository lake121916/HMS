const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../src/server');
const pool = require('../src/config/database');

describe('Phase 1 Security Hardening: Production Authentication', () => {
  const testEmail = 'security_audit_admin@hospital.com';
  const realPassword = 'RealSecretPassword2026!';
  let userId = null;

  beforeAll(async () => {
    // Create an explicit test user with a known bcrypt hash
    const hashedPassword = await bcrypt.hash(realPassword, 10);
    const res = await pool.query(
      `INSERT INTO users (email, password_hash, role, is_active)
       VALUES ($1, $2, 'admin', true)
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, is_active = true
       RETURNING id`,
      [testEmail, hashedPassword]
    );
    userId = res.rows[0].id;
  });

  afterAll(async () => {
    if (userId) {
      await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    }
  });

  it('rejects login with development fallback password "Hospital@2024"', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: 'Hospital@2024' });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/invalid email or password/i);
  });

  it('rejects login with development fallback password "admin123"', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: 'admin123' });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/invalid email or password/i);
  });

  it('successfully authenticates with legitimate bcrypt password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: realPassword });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data.user.email).toBe(testEmail);
    expect(res.body.data.user.role).toBe('admin');
  });

  it('blocks deactivated accounts even if the password is correct', async () => {
    await pool.query('UPDATE users SET is_active = false WHERE id = $1', [userId]);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: realPassword });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/deactivated/i);

    // Restore active status
    await pool.query('UPDATE users SET is_active = true WHERE id = $1', [userId]);
  });
});
