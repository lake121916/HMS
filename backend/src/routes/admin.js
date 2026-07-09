const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const { authenticate, authorize } = require('../middleware/auth');
const { sendSuccess, sendError, handleAsync } = require('../utils/response');

// ── Users ────────────────────────────────────────────────────────────────────

// GET all users (with optional role filter)
router.get('/users', authenticate, authorize('super_admin', 'admin'), handleAsync(async (req, res) => {
  const { role, search } = req.query;
  let q = `
    SELECT u.id, u.email, u.role, u.is_active, u.last_login, u.created_at,
      COALESCE(
        (SELECT d.first_name || ' ' || d.last_name FROM doctors d WHERE d.user_id = u.id LIMIT 1),
        (SELECT n.first_name || ' ' || n.last_name FROM nurses n WHERE n.user_id = u.id LIMIT 1),
        (SELECT p.first_name || ' ' || p.last_name FROM patients p WHERE p.user_id = u.id LIMIT 1),
        split_part(u.email, '@', 1)
      ) AS full_name
    FROM users u WHERE 1=1
  `;
  const params = [];
  let idx = 1;
  if (role) { q += ` AND u.role = $${idx++}`; params.push(role); }
  if (search) { q += ` AND (u.email ILIKE $${idx++})`; params.push(`%${search}%`); }
  q += ' ORDER BY u.created_at DESC';

  const result = await pool.query(q, params);
  res.json({ success: true, data: { users: result.rows } });
}));

// GET single user
router.get('/users/:id', authenticate, authorize('super_admin', 'admin'), handleAsync(async (req, res) => {
  const result = await pool.query('SELECT id, email, role, is_active, last_login, created_at FROM users WHERE id = $1', [req.params.id]);
  if (!result.rows.length) return sendError(res, 'User not found', 404);
  res.json({ success: true, data: { user: result.rows[0] } });
}));

// POST create new user
router.post('/users', authenticate, authorize('super_admin', 'admin'), handleAsync(async (req, res) => {
  const { email, password, role, is_active } = req.body;
  if (!email || !password || !role) return sendError(res, 'Email, password, and role are required', 400);

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
  if (existing.rows.length > 0) return sendError(res, 'Email already in use', 409);

  const hashedPassword = await bcrypt.hash(password, 10);
  const result = await pool.query(
    'INSERT INTO users (email, password_hash, role, is_active) VALUES ($1, $2, $3, $4) RETURNING id, email, role, is_active, created_at',
    [email.toLowerCase().trim(), hashedPassword, role, is_active !== undefined ? is_active : true]
  );
  res.status(201).json({ success: true, data: { user: result.rows[0] } });
}));

// PUT update user role, status, or password
router.put('/users/:id', authenticate, authorize('super_admin', 'admin'), handleAsync(async (req, res) => {
  const { role, is_active, password } = req.body;
  const validRoles = ['super_admin', 'admin', 'receptionist', 'doctor', 'nurse', 'lab_technician', 'pharmacist', 'cashier', 'hospital_manager', 'patient'];
  if (role && !validRoles.includes(role)) return sendError(res, 'Invalid role', 400);

  let passwordHash = null;
  if (password && password.length >= 6) {
    passwordHash = await bcrypt.hash(password, 10);
  } else if (password) {
    return sendError(res, 'Password must be at least 6 characters', 400);
  }

  const result = await pool.query(
    `UPDATE users SET
      role = COALESCE($1, role),
      is_active = COALESCE($2, is_active),
      password_hash = COALESCE($3, password_hash),
      updated_at = NOW()
    WHERE id = $4 RETURNING id, email, role, is_active`,
    [role || null, is_active !== undefined ? is_active : null, passwordHash, req.params.id]
  );
  if (!result.rows.length) return sendError(res, 'User not found', 404);
  res.json({ success: true, data: { user: result.rows[0] } });
}));

// DELETE user (super_admin only)
router.delete('/users/:id', authenticate, authorize('super_admin'), handleAsync(async (req, res) => {
  if (parseInt(req.params.id) === req.user.id) return sendError(res, 'Cannot delete your own account', 400);
  const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [req.params.id]);
  if (!result.rows.length) return sendError(res, 'User not found', 404);
  res.json({ success: true, message: 'User deleted' });
}));

// PUT reset user password (admin)
router.put('/users/:id/reset-password', authenticate, authorize('super_admin', 'admin'), handleAsync(async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) return sendError(res, 'Password must be at least 6 characters', 400);
  const hash = await bcrypt.hash(newPassword, 10);
  await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, req.params.id]);
  res.json({ success: true, message: 'Password reset successfully' });
}));

// ── Departments ───────────────────────────────────────────────────────────────

router.get('/departments', authenticate, authorize('super_admin', 'admin', 'hospital_manager'), handleAsync(async (req, res) => {
  const result = await pool.query(
    `SELECT dep.*, 
      d.first_name || ' ' || d.last_name AS head_doctor_name,
      COUNT(DISTINCT doc.id) AS doctor_count
     FROM departments dep
     LEFT JOIN doctors d ON d.id = dep.head_doctor_id
     LEFT JOIN doctors doc ON doc.department_id = dep.id
     GROUP BY dep.id, d.first_name, d.last_name
     ORDER BY dep.name`
  );
  res.json({ success: true, data: { departments: result.rows } });
}));

router.post('/departments', authenticate, authorize('super_admin', 'admin'), handleAsync(async (req, res) => {
  const { name, description } = req.body;
  if (!name) return sendError(res, 'Department name is required', 400);
  const result = await pool.query(
    'INSERT INTO departments (name, description) VALUES ($1, $2) RETURNING *',
    [name, description || null]
  );
  res.status(201).json({ success: true, data: { department: result.rows[0] } });
}));

router.put('/departments/:id', authenticate, authorize('super_admin', 'admin'), handleAsync(async (req, res) => {
  const { name, description, head_doctor_id } = req.body;
  const result = await pool.query(
    `UPDATE departments SET
      name = COALESCE($1, name),
      description = COALESCE($2, description),
      head_doctor_id = COALESCE($3, head_doctor_id),
      updated_at = NOW()
    WHERE id = $4 RETURNING *`,
    [name || null, description || null, head_doctor_id || null, req.params.id]
  );
  if (!result.rows.length) return sendError(res, 'Department not found', 404);
  res.json({ success: true, data: { department: result.rows[0] } });
}));

router.delete('/departments/:id', authenticate, authorize('super_admin'), handleAsync(async (req, res) => {
  const result = await pool.query('DELETE FROM departments WHERE id = $1 RETURNING id', [req.params.id]);
  if (!result.rows.length) return sendError(res, 'Department not found', 404);
  res.json({ success: true, message: 'Department deleted' });
}));

// ── Audit Logs ────────────────────────────────────────────────────────────────

router.get('/audit-logs', authenticate, authorize('super_admin'), handleAsync(async (req, res) => {
  const { limit = 100, offset = 0 } = req.query;
  const result = await pool.query(
    `SELECT al.*, u.email AS user_email
     FROM audit_logs al
     LEFT JOIN users u ON al.user_id = u.id
     ORDER BY al.timestamp DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  const countRes = await pool.query('SELECT COUNT(*) FROM audit_logs');
  res.json({ success: true, data: { logs: result.rows, total: parseInt(countRes.rows[0].count) } });
}));

// ── System Stats ──────────────────────────────────────────────────────────────

router.get('/stats', authenticate, authorize('super_admin', 'admin'), handleAsync(async (req, res) => {
  const results = await Promise.all([
    pool.query('SELECT COUNT(*) FROM users'),
    pool.query('SELECT COUNT(*) FROM users WHERE is_active = true'),
    pool.query('SELECT role, COUNT(*) FROM users GROUP BY role ORDER BY COUNT(*) DESC'),
    pool.query('SELECT COUNT(*) FROM patients'),
    pool.query('SELECT COUNT(*) FROM doctors'),
    pool.query('SELECT COUNT(*) FROM departments'),
  ]);
  res.json({
    success: true,
    data: {
      totalUsers: parseInt(results[0].rows[0].count),
      activeUsers: parseInt(results[1].rows[0].count),
      byRole: results[2].rows,
      totalPatients: parseInt(results[3].rows[0].count),
      totalDoctors: parseInt(results[4].rows[0].count),
      totalDepartments: parseInt(results[5].rows[0].count),
    }
  });
}));

module.exports = router;
