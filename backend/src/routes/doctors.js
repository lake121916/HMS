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
  authorize('super_admin', 'admin', 'hospital_manager'),
  [
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
    body('specialization').notEmpty().withMessage('Specialization is required')
  ],
  validate,
  doctorController.createDoctor
);

router.put(
  '/:id',
  authenticate,
  authorize('super_admin', 'admin', 'hospital_manager'),
  doctorController.updateDoctor
);

router.delete(
  '/:id',
  authenticate,
  authorize('super_admin', 'admin', 'hospital_manager'),
  doctorController.deleteDoctor
);

module.exports = router;
