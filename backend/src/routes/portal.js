const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const getPatientId = async (userId) => {
  const result = await pool.query('SELECT id FROM patients WHERE user_id = $1', [userId]);
  return result.rows[0]?.id || null;
};

router.get('/me', authenticate, authorize('patient'), async (req, res) => {
  try {
    const patientId = await getPatientId(req.user.id);
    if (!patientId) return res.status(404).json({ success: false, message: 'Patient profile not found' });

    const [patient, appointments, diagnoses, prescriptions, labTests, invoices, notifications] = await Promise.all([
      pool.query('SELECT id, first_name, last_name, date_of_birth, gender, phone, email, blood_type, allergies, emergency_contact_name, emergency_contact_phone FROM patients WHERE id = $1', [patientId]),
      pool.query(`SELECT a.id, a.appointment_date, a.status, a.reason, d.first_name || ' ' || d.last_name AS doctor_name, d.specialization FROM appointments a JOIN doctors d ON d.id = a.doctor_id WHERE a.patient_id = $1 ORDER BY a.appointment_date DESC LIMIT 20`, [patientId]),
      pool.query(`SELECT id, diagnosis_date, disease_name, icd_code, severity, notes FROM diagnoses WHERE patient_id = $1 ORDER BY diagnosis_date DESC LIMIT 20`, [patientId]),
      pool.query(`SELECT id, prescribed_date, medication_name, dosage, frequency, duration, instructions, is_dispensed, workflow_status FROM prescriptions WHERE patient_id = $1 ORDER BY prescribed_date DESC LIMIT 20`, [patientId]),
      pool.query(`SELECT lt.id, lt.requested_date, lt.test_name, lt.test_type, lt.status, lt.workflow_status, lr.results, lr.is_abnormal, lr.result_date FROM lab_tests lt LEFT JOIN lab_results lr ON lr.lab_test_id = lt.id WHERE lt.patient_id = $1 ORDER BY lt.requested_date DESC LIMIT 20`, [patientId]),
      pool.query(`SELECT id, invoice_date, due_date, total_amount, status FROM invoices WHERE patient_id = $1 ORDER BY invoice_date DESC LIMIT 20`, [patientId]),
      pool.query(`SELECT id, type, title, message, is_read, created_at FROM notifications WHERE patient_id = $1 OR user_id = $2 ORDER BY created_at DESC LIMIT 20`, [patientId, req.user.id]),
    ]);

    res.json({ success: true, data: { patient: patient.rows[0], appointments: appointments.rows, diagnoses: diagnoses.rows, prescriptions: prescriptions.rows, labTests: labTests.rows, invoices: invoices.rows, notifications: notifications.rows } });
  } catch (error) {
    console.error('Patient portal error:', error);
    res.status(500).json({ success: false, message: 'Unable to load patient portal' });
  }
});

module.exports = router;
