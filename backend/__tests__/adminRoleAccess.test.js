const request = require('supertest');
const app = require('../src/server');
const pool = require('../src/config/database');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

describe('Role Separation: super_admin vs admin', () => {
  let superAdminToken;
  let adminToken;
  let testUserId;
  let testSuperAdminId;

  beforeAll(async () => {
    // 1. Create a dummy super_admin user in DB if needed or use token
    const saRes = await pool.query(
      `INSERT INTO users (email, password_hash, role, is_active, first_name, last_name)
       VALUES ('test_superadmin@hospital.com', 'dummyhash', 'super_admin', true, 'Root', 'SuperAdmin')
       ON CONFLICT (email) DO UPDATE SET role = 'super_admin'
       RETURNING id`
    );
    testSuperAdminId = saRes.rows[0].id;
    superAdminToken = jwt.sign(
      { id: testSuperAdminId, email: 'test_superadmin@hospital.com', role: 'super_admin' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 2. Create a dummy admin user in DB
    const aRes = await pool.query(
      `INSERT INTO users (email, password_hash, role, is_active, first_name, last_name)
       VALUES ('test_admin@hospital.com', 'dummyhash', 'admin', true, 'Staff', 'Admin')
       ON CONFLICT (email) DO UPDATE SET role = 'admin'
       RETURNING id`
    );
    const testAdminId = aRes.rows[0].id;
    adminToken = jwt.sign(
      { id: testAdminId, email: 'test_admin@hospital.com', role: 'admin' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    if (testUserId) {
      await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
    }
    await pool.query("DELETE FROM users WHERE email IN ('test_superadmin@hospital.com', 'test_admin@hospital.com', 'new_doc@hospital.com', 'hacked_sa@hospital.com')");
  });

  it('allows admin to create standard clinical staff (e.g. doctor)', async () => {
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'new_doc@hospital.com',
        password: 'Password123!',
        role: 'doctor',
        firstName: 'Test',
        lastName: 'Doc',
        specialization: 'Pediatrics'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe('doctor');
    testUserId = res.body.data.user.id;
  });

  it('rejects admin from creating a super_admin account (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'hacked_sa@hospital.com',
        password: 'Password123!',
        role: 'super_admin',
        firstName: 'Hacked',
        lastName: 'Admin'
      });

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toMatch(/Only super administrators can create super admin accounts/i);
  });

  it('rejects admin from updating a user to super_admin (403 Forbidden)', async () => {
    const res = await request(app)
      .put(`/api/admin/users/${testUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        role: 'super_admin'
      });

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toMatch(/Only super administrators can manage super admin accounts/i);
  });

  it('rejects admin from accessing or exporting security audit logs (403 Forbidden)', async () => {
    const logRes = await request(app)
      .get('/api/admin/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`);
    expect([401, 403]).toContain(logRes.statusCode);

    const exportRes = await request(app)
      .get('/api/admin/audit-logs/export')
      .set('Authorization', `Bearer ${adminToken}`);
    expect([401, 403]).toContain(exportRes.statusCode);
  });

  it('rejects admin from permanently deleting user accounts (403 Forbidden)', async () => {
    const res = await request(app)
      .delete(`/api/admin/users/${testUserId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect([401, 403]).toContain(res.statusCode);
  });

  it('allows super_admin to access audit logs and delete user accounts', async () => {
    const logRes = await request(app)
      .get('/api/admin/audit-logs')
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(logRes.statusCode).toBe(200);

    const deleteRes = await request(app)
      .delete(`/api/admin/users/${testUserId}`)
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(deleteRes.statusCode).toBe(200);
    expect(deleteRes.body.success).toBe(true);
    testUserId = null;
  });
});
