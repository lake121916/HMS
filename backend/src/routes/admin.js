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
      u.phone, u.gender, u.address, u.emergency_contact,
      COALESCE(
        u.first_name || ' ' || u.last_name,
        (SELECT d.first_name || ' ' || d.last_name FROM doctors d WHERE d.user_id = u.id LIMIT 1),
        (SELECT n.first_name || ' ' || n.last_name FROM nurses n WHERE n.user_id = u.id LIMIT 1),
        (SELECT p.first_name || ' ' || p.last_name FROM patients p WHERE p.user_id = u.id LIMIT 1),
        split_part(u.email, '@', 1)
      ) AS full_name,
      COALESCE(
        u.first_name,
        (SELECT d.first_name FROM doctors d WHERE d.user_id = u.id LIMIT 1),
        (SELECT n.first_name FROM nurses n WHERE n.user_id = u.id LIMIT 1),
        split_part(u.email, '@', 1)
      ) AS first_name,
      COALESCE(
        u.last_name,
        (SELECT d.last_name FROM doctors d WHERE d.user_id = u.id LIMIT 1),
        (SELECT n.last_name FROM nurses n WHERE n.user_id = u.id LIMIT 1),
        ''
      ) AS last_name,
      COALESCE(
        (SELECT dep.name FROM doctors d JOIN departments dep ON dep.id = d.department_id WHERE d.user_id = u.id LIMIT 1),
        (SELECT dep.name FROM nurses n JOIN departments dep ON dep.id = n.department_id WHERE n.user_id = u.id LIMIT 1),
        NULL
      ) AS department_name,
      COALESCE(
        (SELECT d.department_id FROM doctors d WHERE d.user_id = u.id LIMIT 1),
        (SELECT n.department_id FROM nurses n WHERE n.user_id = u.id LIMIT 1),
        NULL
      ) AS department_id,
      (SELECT d.specialization FROM doctors d WHERE d.user_id = u.id LIMIT 1) AS specialization,
      (SELECT d.consultation_fee FROM doctors d WHERE d.user_id = u.id LIMIT 1) AS consultation_fee,
      (SELECT d.qualification FROM doctors d WHERE d.user_id = u.id LIMIT 1) AS qualification,
      (SELECT d.experience_years FROM doctors d WHERE d.user_id = u.id LIMIT 1) AS experience_years,
      (SELECT d.license_number FROM doctors d WHERE d.user_id = u.id LIMIT 1) AS license_number,
      COALESCE(u.phone, (SELECT d.phone FROM doctors d WHERE d.user_id = u.id LIMIT 1), (SELECT n.phone FROM nurses n WHERE n.user_id = u.id LIMIT 1)) AS phone
    FROM users u WHERE 1=1
  `;
  const params = [];
  let idx = 1;
  if (role) { q += ` AND u.role = $${idx++}`; params.push(role); }
  if (search) { q += ` AND (u.email ILIKE $${idx++} OR u.role ILIKE $${idx-1} OR u.first_name ILIKE $${idx-1} OR u.last_name ILIKE $${idx-1} OR u.phone ILIKE $${idx-1})`; params.push(`%${search}%`); }
  q += ' ORDER BY u.created_at DESC';

  const result = await pool.query(q, params);
  res.json({ success: true, data: { users: result.rows } });
}));

// GET single user
router.get('/users/:id', authenticate, authorize('super_admin', 'admin'), handleAsync(async (req, res) => {
  const result = await pool.query('SELECT id, email, role, is_active, first_name, last_name, phone, gender, address, emergency_contact, last_login, created_at FROM users WHERE id = $1', [req.params.id]);
  if (!result.rows.length) return sendError(res, 'User not found', 404);
  res.json({ success: true, data: { user: result.rows[0] } });
}));

// POST create new user
router.post('/users', authenticate, authorize('super_admin', 'admin'), handleAsync(async (req, res) => {
  const {
    email, password, role, is_active,
    firstName, lastName, phone, gender, address, emergencyContact,
    departmentId, specialization, licenseNumber, qualification, experienceYears, consultationFee
  } = req.body;
  if (!email || !password || !role) return sendError(res, 'Email, password, and role are required', 400);

  const cleanEmail = email.toLowerCase().trim();
  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [cleanEmail]);
  if (existing.rows.length > 0) return sendError(res, 'Email already in use', 409);

  const hashedPassword = await bcrypt.hash(password, 10);
  const result = await pool.query(
    `INSERT INTO users (email, password_hash, role, is_active, first_name, last_name, phone, gender, address, emergency_contact)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id, email, role, is_active, first_name, last_name, phone, gender, address, emergency_contact, created_at`,
    [
      cleanEmail, hashedPassword, role, is_active !== undefined ? is_active : true,
      firstName || null, lastName || null, phone || null, gender || 'other', address || null, emergencyContact || null
    ]
  );
  const newUser = result.rows[0];

  // If role is doctor, create or link doctor profile
  if (role === 'doctor') {
    const fName = firstName || cleanEmail.split('@')[0];
    const lName = lastName || 'Doctor';
    const spec = specialization || 'General Physician';
    const deptId = departmentId ? parseInt(departmentId) : null;
    const license = licenseNumber || `DOC-${Date.now().toString().slice(-6)}`;
    const fee = consultationFee ? parseFloat(consultationFee) : 250;
    const exp = experienceYears ? parseInt(experienceYears) : 1;

    const docCheck = await pool.query('SELECT id FROM doctors WHERE email = $1', [cleanEmail]);
    if (docCheck.rows.length > 0) {
      await pool.query(
        `UPDATE doctors SET
          user_id = $1, department_id = COALESCE($2, department_id), specialization = COALESCE($3, specialization),
          phone = COALESCE($4, phone), qualification = COALESCE($5, qualification), consultation_fee = COALESCE($6, consultation_fee)
         WHERE id = $7`,
        [newUser.id, deptId, spec, phone || null, qualification || null, fee, docCheck.rows[0].id]
      );
    } else {
      await pool.query(
        `INSERT INTO doctors (user_id, first_name, last_name, specialization, phone, email, department_id, license_number, qualification, experience_years, consultation_fee, is_available)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true)`,
        [newUser.id, fName, lName, spec, phone || '', cleanEmail, deptId, license, qualification || 'MD', exp, fee]
      );
    }
  } else if (role === 'nurse') {
    const fName = firstName || cleanEmail.split('@')[0];
    const lName = lastName || 'Nurse';
    const deptId = departmentId ? parseInt(departmentId) : null;
    const license = licenseNumber || `NUR-${Date.now().toString().slice(-6)}`;
    await pool.query(
      `INSERT INTO nurses (user_id, first_name, last_name, phone, email, department_id, license_number, is_available)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)
       ON CONFLICT (license_number) DO NOTHING`,
      [newUser.id, fName, lName, phone || '', cleanEmail, deptId, license]
    );
  }

  res.status(201).json({ success: true, data: { user: newUser } });
}));

// PUT update user role, status, or password
router.put('/users/:id', authenticate, authorize('super_admin', 'admin'), handleAsync(async (req, res) => {
  const {
    role, is_active, password,
    firstName, lastName, phone, gender, address, emergencyContact,
    departmentId, specialization, licenseNumber, qualification, experienceYears, consultationFee
  } = req.body;
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
      first_name = COALESCE($4, first_name),
      last_name = COALESCE($5, last_name),
      phone = COALESCE($6, phone),
      gender = COALESCE($7, gender),
      address = COALESCE($8, address),
      emergency_contact = COALESCE($9, emergency_contact),
      updated_at = NOW()
    WHERE id = $10 RETURNING id, email, role, is_active, first_name, last_name, phone, gender, address, emergency_contact`,
    [
      role || null, is_active !== undefined ? is_active : null, passwordHash,
      firstName || null, lastName || null, phone || null, gender || null, address || null, emergencyContact || null,
      req.params.id
    ]
  );
  if (!result.rows.length) return sendError(res, 'User not found', 404);
  const updatedUser = result.rows[0];

  // If role is doctor, update doctor record
  if (role === 'doctor' || updatedUser.role === 'doctor') {
    const deptId = departmentId ? parseInt(departmentId) : null;
    const fee = consultationFee ? parseFloat(consultationFee) : null;
    const docCheck = await pool.query('SELECT id FROM doctors WHERE user_id = $1', [req.params.id]);
    if (docCheck.rows.length > 0) {
      await pool.query(
        `UPDATE doctors SET
          first_name = COALESCE($1, first_name),
          last_name = COALESCE($2, last_name),
          department_id = COALESCE($3, department_id),
          specialization = COALESCE($4, specialization),
          phone = COALESCE($5, phone),
          qualification = COALESCE($6, qualification),
          license_number = COALESCE($7, license_number),
          consultation_fee = COALESCE($8, consultation_fee),
          updated_at = NOW()
        WHERE id = $9`,
        [firstName || null, lastName || null, deptId, specialization || null, phone || null, qualification || null, licenseNumber || null, fee, docCheck.rows[0].id]
      );
    } else if (role === 'doctor') {
      const fName = firstName || updatedUser.email.split('@')[0];
      const lName = lastName || 'Doctor';
      const license = licenseNumber || `DOC-${Date.now().toString().slice(-6)}`;
      await pool.query(
        `INSERT INTO doctors (user_id, first_name, last_name, specialization, phone, email, department_id, license_number, qualification, consultation_fee, is_available)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)`,
        [req.params.id, fName, lName, specialization || 'General Physician', phone || '', updatedUser.email, deptId, license, qualification || 'MD', fee || 250]
      );
    }
  }

  res.json({ success: true, data: { user: updatedUser } });
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

router.get('/departments', authenticate, authorize('super_admin', 'admin', 'hospital_manager', 'receptionist', 'doctor', 'nurse'), handleAsync(async (req, res) => {
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

router.post('/departments', authenticate, authorize('super_admin', 'admin', 'hospital_manager'), handleAsync(async (req, res) => {
  const { name, description } = req.body;
  if (!name) return sendError(res, 'Department name is required', 400);
  const result = await pool.query(
    'INSERT INTO departments (name, description) VALUES ($1, $2) RETURNING *',
    [name, description || null]
  );
  res.status(201).json({ success: true, data: { department: result.rows[0] } });
}));

router.put('/departments/:id', authenticate, authorize('super_admin', 'admin', 'hospital_manager'), handleAsync(async (req, res) => {
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

router.delete('/departments/:id', authenticate, authorize('super_admin', 'admin', 'hospital_manager'), handleAsync(async (req, res) => {
  const result = await pool.query('DELETE FROM departments WHERE id = $1 RETURNING id', [req.params.id]);
  if (!result.rows.length) return sendError(res, 'Department not found', 404);
  res.json({ success: true, message: 'Department deleted' });
}));

// ── Audit Logs ────────────────────────────────────────────────────────────────

router.get('/audit-logs', authenticate, authorize('super_admin', 'admin', 'hospital_manager'), handleAsync(async (req, res) => {
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

router.get('/stats', authenticate, authorize('super_admin', 'admin', 'hospital_manager'), handleAsync(async (req, res) => {
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


// GET /api/admin/audit-logs/export — Secure CSV Export with Formula Injection Escaping
function sanitizeCsvCell(val) {
  if (val === null || val === undefined) return '';
  let str = typeof val === 'object' ? JSON.stringify(val) : String(val);
  // Formula injection defense: cells starting with =, +, -, @, \t, \r are prepended with '
  if (/^[=+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }
  // Standard CSV escaping: wrap in quotes if contains comma, quote, or newline
  if (/[",\n\r]/.test(str)) {
    str = '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

router.get('/audit-logs/export', authenticate, authorize('super_admin', 'admin', 'hospital_manager'), handleAsync(async (req, res) => {
  const { start_date, end_date, action, entity_type, user_id } = req.query;
  let query = `
    SELECT al.id, al.timestamp, al.user_id, u.email AS user_email, u.role AS user_role,
           al.action, al.entity_type, al.entity_id, al.ip_address,
           al.old_values, al.new_values
    FROM audit_logs al
    LEFT JOIN users u ON al.user_id = u.id
    WHERE 1=1
  `;
  const params = [];
  let idx = 1;

  if (start_date) {
    query += ` AND al.timestamp >= ${idx++}`;
    params.push(start_date);
  }
  if (end_date) {
    query += ` AND al.timestamp <= ${idx++}`;
    params.push(end_date);
  }
  if (action) {
    query += ` AND al.action ILIKE ${idx++}`;
    params.push(`%${action}%`);
  }
  if (entity_type) {
    query += ` AND al.entity_type ILIKE ${idx++}`;
    params.push(`%${entity_type}%`);
  }
  if (user_id) {
    query += ` AND al.user_id = ${idx++}`;
    params.push(parseInt(user_id, 10));
  }

  query += ' ORDER BY al.timestamp DESC LIMIT 10000';

  const result = await pool.query(query, params);
  const rows = result.rows;

  // Build CSV content
  const headers = [
    'Log ID',
    'Timestamp (UTC)',
    'User ID',
    'User Email',
    'User Role',
    'Action',
    'Entity Type',
    'Entity ID',
    'IP Address',
    'Old Values',
    'New Values'
  ];

  const csvLines = [headers.map(sanitizeCsvCell).join(',')];

  for (const row of rows) {
    const line = [
      row.id,
      row.timestamp ? new Date(row.timestamp).toISOString() : '',
      row.user_id || '',
      row.user_email || 'System',
      row.user_role || '',
      row.action,
      row.entity_type,
      row.entity_id || '',
      row.ip_address || '',
      row.old_values ? JSON.stringify(row.old_values) : '',
      row.new_values ? JSON.stringify(row.new_values) : ''
    ].map(sanitizeCsvCell).join(',');

    csvLines.push(line);
  }

  // Auditing the audit export event
  await pool.query(
    `INSERT INTO audit_logs (user_id, action, entity_type, ip_address, new_values, timestamp)
     VALUES ($1, 'EXPORT_AUDIT_LOG_CSV', 'audit_logs', $2, $3, NOW())`,
    [
      req.user.id,
      req.ip || '127.0.0.1',
      JSON.stringify({ rowCount: rows.length, filters: { start_date, end_date, action, entity_type } })
    ]
  );

  const filename = `hospital_audit_log_${new Date().toISOString().split('T')[0]}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.status(200).send(csvLines.join('\r\n'));
}));

module.exports = router;
