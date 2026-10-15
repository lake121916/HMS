const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const validate = require('../middleware/validation');
const { authenticate, authorize } = require('../middleware/auth');

// ── Public ──────────────────────────────────────────────────────────────────

// Patient self-registration (public — no auth required)
router.post(
  '/register',
  [
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('phone').notEmpty().withMessage('Phone number is required'),
    body('dateOfBirth').isISO8601().withMessage('Valid date of birth is required'),
    body('gender').isIn(['male', 'female', 'other']).withMessage('Valid gender is required'),
  ],
  validate,
  authController.registerPatient
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  authController.login
);

router.post(
  '/refresh',
  [body('refreshToken').notEmpty().withMessage('Refresh token is required')],
  validate,
  authController.refreshToken
);

router.post(
  '/reset-password',
  [body('email').isEmail().withMessage('Valid email is required')],
  validate,
  authController.resetPassword
);

// ── Authenticated ────────────────────────────────────────────────────────────

router.post('/logout', authenticate, authController.logout);

router.post(
  '/change-password',
  authenticate,
  [
    body('oldPassword').notEmpty().withMessage('Old password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  ],
  validate,
  authController.changePassword
);

// ── Admin only: create staff accounts ───────────────────────────────────────

router.post(
  '/create-staff',
  authenticate,
  authorize('super_admin', 'admin'),
  [
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role')
      .isIn(['admin', 'receptionist', 'doctor', 'nurse', 'lab_technician', 'pharmacist', 'cashier', 'hospital_manager'])
      .withMessage('Invalid staff role'),
  ],
  validate,
  authController.createStaff
);

// Change role (super_admin only)
router.put(
  '/role/:userId',
  authenticate,
  authorize('super_admin'),
  [body('role').notEmpty().withMessage('Role is required')],
  validate,
  authController.changeRole
);

// Toggle active status (super_admin / admin)
router.put(
  '/toggle-active/:userId',
  authenticate,
  authorize('super_admin', 'admin'),
  authController.toggleActive
);

// Inactivity lock & session verification
router.post('/unlock', authenticate, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ success: false, message: 'Password is required to unlock session' });
    }
    const userRes = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    if (!userRes.rows.length || !userRes.rows[0].is_active) {
      return res.status(401).json({ success: false, message: 'User not found or account deactivated' });
    }
    const user = userRes.rows[0];
    const bcrypt = require('bcryptjs');
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid password. Cannot unlock session.' });
    }
    res.json({
      success: true,
      message: 'Session unlocked successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

router.get('/verify-session', authenticate, async (req, res) => {
  try {
    const userRes = await pool.query('SELECT id, email, role, is_active FROM users WHERE id = $1', [req.user.id]);
    if (!userRes.rows.length || !userRes.rows[0].is_active) {
      return res.status(401).json({ success: false, message: 'Session invalid or account deactivated' });
    }
    res.json({ success: true, data: { user: userRes.rows[0] } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
