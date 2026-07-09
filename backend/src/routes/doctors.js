const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const doctorController = require('../controllers/doctorController');
const validate = require('../middleware/validation');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, doctorController.getAllDoctors);
router.get('/:id', authenticate, doctorController.getDoctorById);
router.get('/:id/schedule', authenticate, doctorController.getDoctorSchedule);

router.post(
  '/',
  authenticate,
  authorize('admin'),
  [
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
    body('specialization').notEmpty().withMessage('Specialization is required'),
    body('licenseNumber').notEmpty().withMessage('License number is required')
  ],
  validate,
  doctorController.createDoctor
);

router.put(
  '/:id',
  authenticate,
  authorize('admin'),
  doctorController.updateDoctor
);

router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  doctorController.deleteDoctor
);

module.exports = router;
