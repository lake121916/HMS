const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const appointmentController = require('../controllers/appointmentController');
const validate = require('../middleware/validation');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, appointmentController.getAllAppointments);
router.get('/available-slots', authenticate, appointmentController.getAvailableSlots);
router.get('/:id', authenticate, appointmentController.getAppointmentById);

router.post(
  '/',
  authenticate,
  authorize('admin', 'receptionist', 'patient', 'doctor'),
  [
    body('patientId').notEmpty().withMessage('Patient ID is required'),
    body('doctorId').notEmpty().withMessage('Doctor ID is required'),
    body('appointmentDate').isISO8601().withMessage('Valid appointment date is required')
  ],
  validate,
  appointmentController.bookAppointment
);

router.put(
  '/:id/reschedule',
  authenticate,
  authorize('admin', 'receptionist', 'patient', 'doctor'),
  [
    body('newDate').isISO8601().withMessage('Valid new date is required')
  ],
  validate,
  appointmentController.rescheduleAppointment
);

router.put(
  '/:id/cancel',
  authenticate,
  authorize('admin', 'receptionist', 'patient', 'doctor'),
  appointmentController.cancelAppointment
);

module.exports = router;
