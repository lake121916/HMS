const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const patientController = require('../controllers/patientController');
const validate = require('../middleware/validation');
const { authenticate, authorize } = require('../middleware/auth');

const qrRoles = [
  'super_admin', 'admin', 'hospital_manager', 'receptionist',
  'doctor', 'nurse', 'lab_technician', 'pharmacist', 'cashier'
];
const qrScanLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many patient QR scans. Please try again later.' }
});
const patientViewRoles = [
  'super_admin', 'admin', 'hospital_manager', 'receptionist',
  'doctor', 'nurse', 'lab_technician'
];

router.get('/', authenticate, authorize(...patientViewRoles), patientController.getAllPatients);

// Identifier / Wristband lookup (must precede /:id)
router.post(
  '/lookup-by-identifier',
  authenticate,
  authorize(...patientViewRoles),
  patientController.lookupPatientByIdentifier
);

router.post(
  '/scan',
  authenticate,
  authorize(...qrRoles),
  qrScanLimiter,
  [body('qrContent').isString().trim().notEmpty().isLength({ max: 128 }).withMessage('Valid patient QR content is required')],
  validate,
  patientController.scanPatientQr
);

router.post(
  '/:id/qr/regenerate',
  authenticate,
  authorize('super_admin', 'admin'),
  patientController.regeneratePatientQr
);
router.get('/:id/qr', authenticate, authorize(...patientViewRoles), patientController.getPatientQr);
router.post('/:id/qr', authenticate, authorize(...patientViewRoles), patientController.getPatientQr);

router.get('/:id', authenticate, authorize(...patientViewRoles), patientController.getPatientById);
router.get('/:id/history', authenticate, authorize(...patientViewRoles), patientController.getPatientHistory);

// Record wristband printed event
router.post('/:id/wristband-printed', authenticate, authorize('receptionist', 'nurse', 'doctor', 'admin', 'super_admin'), patientController.recordWristbandPrinted);

router.post(
  '/',
  authenticate,
  authorize('receptionist', 'admin', 'super_admin', 'nurse'),
  [
    body('firstName').custom((value, { req }) => {
      const name = value || req.body.first_name;
      if (!name || !String(name).trim()) throw new Error('First name is required');
      return true;
    }),
    body('lastName').custom((value, { req }) => {
      const name = value || req.body.last_name;
      if (!name || !String(name).trim()) throw new Error('Last name is required');
      return true;
    }),
    body('dateOfBirth').custom((value, { req }) => {
      const dob = value || req.body.date_of_birth;
      if (!dob || isNaN(Date.parse(dob))) throw new Error('Valid date of birth is required');
      return true;
    }),
    body('gender').custom((value, { req }) => {
      const g = (value || req.body.gender || '').toLowerCase();
      if (!['male', 'female', 'other'].includes(g)) throw new Error('Valid gender is required');
      return true;
    }),
    body('email').custom((value, { req }) => {
      const em = value || req.body.email;
      if (em && String(em).trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(String(em).trim())) {
          throw new Error('Valid email address is required if provided');
        }
      }
      return true;
    })
  ],
  validate,
  patientController.registerPatient
);

router.put(
  '/:id',
  authenticate,
  authorize('admin', 'receptionist', 'doctor', 'nurse'),
  [
    body('firstName').optional().notEmpty().withMessage('First name cannot be empty').trim(),
    body('lastName').optional().notEmpty().withMessage('Last name cannot be empty').trim(),
    body('email').optional().isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('phone').optional().isMobilePhone('any').withMessage('Valid phone number is required'),
    body('dateOfBirth').optional().isISO8601().withMessage('Valid date of birth required'),
    body('gender').optional().isIn(['male', 'female', 'other']).withMessage('Invalid gender value'),
    body('bloodType').optional().isIn(['A+','A-','B+','B-','AB+','AB-','O+','O-','']).withMessage('Invalid blood type'),
    body('allergies').optional().isString().trim().isLength({ max: 500 }),
    body('medicalHistory').optional().isString().trim().isLength({ max: 2000 }),
  ],
  validate,
  patientController.updatePatient
);

router.delete(
  '/:id',
  authenticate,
  authorize('super_admin'),
  patientController.deletePatient
);

module.exports = router;
