const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate, authorize('super_admin', 'admin', 'hospital_manager', 'doctor', 'nurse'));

router.get('/R4/Patient/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM patients WHERE id = $1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'not-found' }] });
    const patient = result.rows[0];
    res.type('application/fhir+json').json({ resourceType: 'Patient', id: String(patient.id), active: true, name: [{ family: patient.last_name, given: [patient.first_name] }], gender: patient.gender, birthDate: patient.date_of_birth, telecom: [{ system: 'phone', value: patient.phone }, { system: 'email', value: patient.email }].filter(item => item.value) });
  } catch (error) {
    res.status(500).json({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'exception' }] });
  }
});

router.get('/R4/Appointment/:id', async (req, res) => {
  try {
    const result = await pool.query(`SELECT a.*, p.first_name AS patient_first_name, p.last_name AS patient_last_name, d.first_name AS doctor_first_name, d.last_name AS doctor_last_name FROM appointments a JOIN patients p ON p.id = a.patient_id JOIN doctors d ON d.id = a.doctor_id WHERE a.id = $1`, [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'not-found' }] });
    const appointment = result.rows[0];
    res.type('application/fhir+json').json({ resourceType: 'Appointment', id: String(appointment.id), status: appointment.status === 'cancelled' ? 'cancelled' : appointment.status === 'completed' ? 'fulfilled' : 'booked', start: appointment.appointment_date, description: appointment.reason, participant: [{ actor: { reference: `Patient/${appointment.patient_id}`, display: `${appointment.patient_first_name} ${appointment.patient_last_name}` }, status: 'accepted' }, { actor: { reference: `Practitioner/${appointment.doctor_id}`, display: `${appointment.doctor_first_name} ${appointment.doctor_last_name}` }, status: 'accepted' }] });
  } catch (error) {
    res.status(500).json({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'exception' }] });
  }
});

module.exports = router;
