const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { sendSuccess, sendError, handleAsync } = require('../utils/response');

const ACTOR_ROLES = [
  'super_admin', 'admin', 'receptionist', 'doctor', 'nurse',
  'lab_technician', 'pharmacist', 'cashier', 'hospital_manager', 'patient'
];

const getImageMimeType = (buffer) => {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return 'image/png';
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return 'image/webp';
  }
  return null;
};

const generateTokens = (user) => {
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'hms_jwt_secret_alem_ketema_enat_2024_change_in_production',
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET || 'hms_refresh_secret_alem_ketema_enat_2024_change_in_production',
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d' }
  );
  return { token, refreshToken };
};

// ── Patient self-registration (public) ──────────────────────────────────────
const registerPatient = handleAsync(async (req, res) => {
  const { firstName, lastName, email, password, phone, dateOfBirth, gender, address, bloodType } = req.body;

  // Check if email already taken
  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
  if (existing.rows.length > 0) {
    return sendError(res, 'An account with this email already exists', 409);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user account
    const userRes = await client.query(
      `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'patient') RETURNING id, email, role`,
      [email.toLowerCase().trim(), hashedPassword]
    );
    const user = userRes.rows[0];

    // Create patient profile
    await client.query(
      `INSERT INTO patients (user_id, first_name, last_name, email, phone, date_of_birth, gender, address, blood_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [user.id, firstName, lastName, email.toLowerCase().trim(), phone, dateOfBirth, gender, address || null, bloodType || null]
    );

    await client.query('COMMIT');

    const { token, refreshToken } = generateTokens(user);
    const userData = { id: user.id, email: user.email, role: 'patient', firstName, lastName };

    sendSuccess(res, { token, refreshToken, user: userData }, 'Registration successful. Welcome!', 201);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

// ── Admin creates a staff account ────────────────────────────────────────────
const createStaff = handleAsync(async (req, res) => {
  const { firstName, lastName, email, password, role, phone, specialization, licenseNumber, departmentId } = req.body;

  // Prevent creating super_admin via API
  if (role === 'super_admin') {
    return sendError(res, 'Cannot create super_admin accounts via API', 403);
  }

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
  if (existing.rows.length > 0) return sendError(res, 'Email already in use', 409);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const hashedPassword = await bcrypt.hash(password, 10);
    const userRes = await client.query(
      'INSERT INTO users (email, password_hash, role, must_change_password) VALUES ($1, $2, $3, true) RETURNING id, email, role',
      [email.toLowerCase().trim(), hashedPassword, role]
    );
    const user = userRes.rows[0];

    // Create role-specific profile
    if (role === 'doctor') {
      await client.query(
        `INSERT INTO doctors (user_id, first_name, last_name, email, phone, specialization, license_number, department_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [user.id, firstName, lastName, email.toLowerCase().trim(), phone || null,
         specialization || 'General Medicine', licenseNumber || null, departmentId || null]
      );
    } else if (role === 'nurse') {
      await client.query(
        `INSERT INTO nurses (user_id, first_name, last_name, email, phone, department_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [user.id, firstName, lastName, email.toLowerCase().trim(), phone || null, departmentId || null]
      );
    }

    await client.query('COMMIT');
    sendSuccess(res, { user: { id: user.id, email: user.email, role: user.role } }, 'Staff account created successfully', 201);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

// ── Login ────────────────────────────────────────────────────────────────────
const login = handleAsync(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return sendError(res, 'Email and password are required', 400);
  }

  const cleanEmail = email.toLowerCase().trim();
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [cleanEmail]);

  if (result.rows.length === 0) {
    return sendError(res, 'Invalid email or password', 401);
  }

  const user = result.rows[0];

  if (!user.is_active) {
    return sendError(res, 'Your account has been deactivated. Please contact the administrator.', 401);
  }

  // Account lockout check
  if (user.locked_until && new Date() < new Date(user.locked_until)) {
    const remainingMins = Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / (60 * 1000));
    return sendError(res, `Account is temporarily locked due to multiple failed login attempts. Please try again in ${remainingMins} minute(s).`, 423);
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    const attempts = (user.failed_login_attempts || 0) + 1;
    if (attempts >= 5) {
      await pool.query(
        "UPDATE users SET failed_login_attempts = $1, locked_until = NOW() + INTERVAL '15 minutes' WHERE id = $2",
        [attempts, user.id]
      );
      return sendError(res, 'Account locked for 15 minutes due to 5 consecutive failed login attempts.', 423);
    } else {
      await pool.query(
        "UPDATE users SET failed_login_attempts = $1 WHERE id = $2",
        [attempts, user.id]
      );
      return sendError(res, 'Invalid email or password', 401);
    }
  }

  // Reset failed login counter on success
  await pool.query(
    'UPDATE users SET last_login = CURRENT_TIMESTAMP, failed_login_attempts = 0, locked_until = NULL WHERE id = $1',
    [user.id]
  );

  const { token, refreshToken } = generateTokens(user);

  // Resolve first/last name
  let firstName = null;
  let lastName = null;
  try {
    const roleTableMap = { doctor: 'doctors', nurse: 'nurses', patient: 'patients' };
    const profileTable = roleTableMap[user.role];
    if (profileTable) {
      const profileRes = await pool.query(
        `SELECT first_name, last_name FROM ${profileTable} WHERE user_id = $1 LIMIT 1`,
        [user.id]
      );
      if (profileRes.rows.length > 0) {
        firstName = profileRes.rows[0].first_name;
        lastName = profileRes.rows[0].last_name;
      }
    }
  } catch (_) {}

  if (!firstName) {
    const prefix = user.email.split('@')[0];
    firstName = prefix.charAt(0).toUpperCase() + prefix.slice(1);
  }

  const mustChangePassword = Boolean(user.must_change_password);
  const userData = {
    id: user.id,
    email: user.email,
    role: user.role,
    firstName,
    lastName,
    mustChangePassword,
    profilePhotoUpdatedAt: user.profile_photo_updated_at || null
  };

  sendSuccess(res, { token, refreshToken, user: userData, mustChangePassword }, 'Login successful');
});

const updateProfilePhoto = handleAsync(async (req, res) => {
  if (!ACTOR_ROLES.includes(req.user.role)) {
    return sendError(res, 'This account cannot manage a profile photo', 403);
  }
  if (!req.file) {
    return sendError(res, 'Choose a profile photo to upload', 400);
  }

  const mimeType = getImageMimeType(req.file.buffer);
  if (!mimeType) {
    return sendError(res, 'Profile photo must be a valid JPEG, PNG, or WebP image', 400);
  }

  const result = await pool.query(
    `UPDATE users
     SET profile_photo = $1, profile_photo_mime_type = $2, profile_photo_updated_at = CURRENT_TIMESTAMP
     WHERE id = $3 AND role = ANY($4::varchar[])
     RETURNING profile_photo_updated_at`,
    [req.file.buffer, mimeType, req.user.id, ACTOR_ROLES]
  );
  if (!result.rows.length) {
    return sendError(res, 'Staff account not found', 404);
  }

  sendSuccess(res, {
    profilePhotoUpdatedAt: result.rows[0].profile_photo_updated_at
  }, 'Profile photo updated successfully');
});

const getProfilePhoto = handleAsync(async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId < 1) {
    return sendError(res, 'Invalid staff account ID', 400);
  }

  const result = await pool.query(
    `SELECT profile_photo, profile_photo_mime_type
     FROM users
     WHERE id = $1 AND role = ANY($2::varchar[])`,
    [userId, ACTOR_ROLES]
  );
  if (!result.rows.length || !result.rows[0].profile_photo) {
    return sendError(res, 'Profile photo not found', 404);
  }

  res.set({
    'Content-Type': result.rows[0].profile_photo_mime_type,
    'Cache-Control': 'private, max-age=300',
    'X-Content-Type-Options': 'nosniff'
  });
  res.send(result.rows[0].profile_photo);
});

// ── Logout ────────────────────────────────────────────────────────────────────
const logout = handleAsync(async (req, res) => {
  sendSuccess(res, null, 'Logged out successfully');
});

// ── Refresh token ─────────────────────────────────────────────────────────────
const refreshToken = handleAsync(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return sendError(res, 'Refresh token is required', 400);

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.id]);
    if (!result.rows.length) return sendError(res, 'User not found', 404);
    const tokens = generateTokens(result.rows[0]);
    sendSuccess(res, tokens, 'Token refreshed');
  } catch {
    return sendError(res, 'Invalid refresh token', 401);
  }
});

// ── Reset password (sends email in production) ────────────────────────────────
const resetPassword = handleAsync(async (req, res) => {
  const { email } = req.body;
  const result = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (!result.rows.length) return sendError(res, 'No account found with that email', 404);
  sendSuccess(res, null, 'Password reset instructions sent to your email');
});

// ── Change password (self) ─────────────────────────────────────────────────────
const changePassword = handleAsync(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return sendError(res, 'New password must be at least 6 characters long', 400);
  }

  const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
  if (!result.rows.length) return sendError(res, 'User not found', 404);

  const user = result.rows[0];
  const valid = await bcrypt.compare(oldPassword, user.password_hash);
  if (!valid) return sendError(res, 'Current password is incorrect', 400);

  const hash = await bcrypt.hash(newPassword, 10);
  await pool.query(
    'UPDATE users SET password_hash = $1, must_change_password = false, updated_at = NOW() WHERE id = $2',
    [hash, req.user.id]
  );
  sendSuccess(res, null, 'Password changed successfully');
});

// ── Change role (super_admin only) ───────────────────────────────────────────
const changeRole = handleAsync(async (req, res) => {
  const { role } = req.body;
  const validRoles = ['super_admin', 'admin', 'receptionist', 'doctor', 'nurse', 'lab_technician', 'pharmacist', 'cashier', 'hospital_manager', 'patient'];
  if (!validRoles.includes(role)) return sendError(res, 'Invalid role', 400);
  await pool.query('UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2', [role, req.params.userId]);
  sendSuccess(res, null, 'Role updated successfully');
});

// ── Toggle active status ──────────────────────────────────────────────────────
const toggleActive = handleAsync(async (req, res) => {
  if (parseInt(req.params.userId) === req.user.id) {
    return sendError(res, 'Cannot deactivate your own account', 400);
  }
  const result = await pool.query(
    'UPDATE users SET is_active = NOT is_active, updated_at = NOW() WHERE id = $1 RETURNING id, email, is_active',
    [req.params.userId]
  );
  if (!result.rows.length) return sendError(res, 'User not found', 404);
  const msg = result.rows[0].is_active ? 'Account activated' : 'Account deactivated';
  sendSuccess(res, { user: result.rows[0] }, msg);
});

// ── 1-Click Role Switcher Demo Mode (Academic Defense & Evaluation) ─────────
const demoSwitch = handleAsync(async (req, res) => {
  const { role } = req.body;
  const validRoles = [
    'super_admin', 'admin', 'hospital_manager', 'doctor', 'nurse',
    'receptionist', 'cashier', 'lab_technician', 'pharmacist', 'patient'
  ];

  if (!role || !validRoles.includes(role)) {
    return sendError(res, `Invalid role. Must be one of: ${validRoles.join(', ')}`, 400);
  }

  const roleEmailMap = {
    super_admin: 'superadmin@hospital.com',
    admin: 'admin@hospital.com',
    hospital_manager: 'manager@hospital.com',
    doctor: 'doctor@hospital.com',
    nurse: 'nurse@hospital.com',
    receptionist: 'receptionist@hospital.com',
    cashier: 'cashier@hospital.com',
    lab_technician: 'lab@hospital.com',
    pharmacist: 'pharmacist@hospital.com',
    patient: 'patient@hospital.com'
  };

  const primaryEmail = roleEmailMap[role];
  let userRes = await pool.query('SELECT * FROM users WHERE email = $1 AND is_active = true LIMIT 1', [primaryEmail]);

  if (!userRes.rows.length) {
    userRes = await pool.query('SELECT * FROM users WHERE role = $1 AND is_active = true ORDER BY id ASC LIMIT 1', [role]);
  }

  if (!userRes.rows.length) {
    return sendError(res, `No active account found for role "${role}"`, 404);
  }

  const user = userRes.rows[0];
  const { token, refreshToken } = generateTokens(user);

  let firstName = null;
  let lastName = null;
  try {
    const roleTableMap = { doctor: 'doctors', nurse: 'nurses', patient: 'patients' };
    const profileTable = roleTableMap[user.role];
    if (profileTable) {
      const profileRes = await pool.query(
        `SELECT first_name, last_name FROM ${profileTable} WHERE user_id = $1 LIMIT 1`,
        [user.id]
      );
      if (profileRes.rows.length > 0) {
        firstName = profileRes.rows[0].first_name;
        lastName = profileRes.rows[0].last_name;
      }
    }
  } catch (_) {}

  if (!firstName) {
    const prefix = user.email.split('@')[0];
    firstName = prefix.charAt(0).toUpperCase() + prefix.slice(1);
  }

  const userData = {
    id: user.id,
    email: user.email,
    role: user.role,
    firstName,
    lastName,
    mustChangePassword: false,
    profilePhotoUpdatedAt: user.profile_photo_updated_at || null
  };

  sendSuccess(res, { token, refreshToken, user: userData }, `Switched role to ${role}`);
});

module.exports = {
  registerPatient,
  createStaff,
  login,
  logout,
  refreshToken,
  resetPassword,
  changePassword,
  changeRole,
  toggleActive,
  updateProfilePhoto,
  getProfilePhoto,
  demoSwitch,
};
