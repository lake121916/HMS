const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const patientController = require('../controllers/patientController');
const validate = require('../middleware/validation');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, patientController.getAllPatients);
router.get('/:id', authenticate, patientController.getPatientById);
router.get('/:id/history', authenticate, patientController.getPatientHistory);

router.post(
  '/',
  authenticate,
  authorize('receptionist'),
  [
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
    body('dateOfBirth').isISO8601().withMessage('Valid date of birth is required'),
    body('gender').isIn(['male', 'female', 'other']).withMessage('Valid gender is required'),
    body('email').isEmail().withMessage('Valid email is required')
  ],
  validate,
  patientController.registerPatient
);

router.put(
  '/:id',
  authenticate,
  authorize('admin', 'receptionist', 'doctor', 'nurse'),
  patientController.updatePatient
);

router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  patientController.deletePatient
);

module.exports = router;
