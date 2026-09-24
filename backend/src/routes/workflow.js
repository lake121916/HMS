const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const clinicalRoles = ['doctor', 'nurse', 'lab_technician', 'pharmacist', 'admin', 'super_admin', 'hospital_manager'];

router.post('/encounters', authenticate, authorize('doctor', 'admin', 'super_admin'), async (req, res) => {
  try {
    const { patient_id, appointment_id, chief_complaint, examination_notes, assessment, treatment_plan, status } = req.body;
    let doctorId = req.body.doctor_id;
    if (req.user.role === 'doctor') {
      const doctor = await pool.query('SELECT id FROM doctors WHERE user_id = $1', [req.user.id]);
      doctorId = doctor.rows[0]?.id;
    }
    if (!patient_id || !doctorId) return res.status(400).json({ success: false, message: 'patient_id and doctor are required' });
    const result = await pool.query(`INSERT INTO clinical_encounters (patient_id, doctor_id, appointment_id, chief_complaint, examination_notes, assessment, treatment_plan, status, signed_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`, [patient_id, doctorId, appointment_id || null, chief_complaint || null, examination_notes || null, assessment || null, treatment_plan || null, status === 'signed' ? 'signed' : 'draft', status === 'signed' ? new Date() : null]);
    res.status(201).json({ success: true, data: { encounter: result.rows[0] } });
  } catch (error) {
    console.error('Encounter error:', error);
    res.status(500).json({ success: false, message: 'Unable to save encounter' });
  }
});

router.get('/encounters/:patientId', authenticate, authorize(...clinicalRoles), async (req, res) => {
  try {
    const result = await pool.query(`SELECT ce.*, d.first_name || ' ' || d.last_name AS doctor_name FROM clinical_encounters ce LEFT JOIN doctors d ON d.id = ce.doctor_id WHERE ce.patient_id = $1 ORDER BY ce.created_at DESC`, [req.params.patientId]);
    res.json({ success: true, data: { encounters: result.rows } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unable to load encounters' });
  }
});

router.post('/referrals', authenticate, authorize('doctor', 'admin', 'super_admin', 'receptionist'), async (req, res) => {
  try {
    const { patient_id, referring_facility, referring_clinician, clinical_summary, urgency, receiving_department_id, assigned_doctor_id, attachment_url } = req.body;
    if (!patient_id || !clinical_summary) return res.status(400).json({ success: false, message: 'patient_id and clinical_summary are required' });
    const result = await pool.query(`INSERT INTO referrals (patient_id, referring_facility, referring_clinician, clinical_summary, urgency, receiving_department_id, assigned_doctor_id, attachment_url, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`, [patient_id, referring_facility || null, referring_clinician || null, clinical_summary, urgency || 'routine', receiving_department_id || null, assigned_doctor_id || null, attachment_url || null, req.user.id]);
    res.status(201).json({ success: true, data: { referral: result.rows[0] } });
  } catch (error) {
    console.error('Referral error:', error);
    res.status(500).json({ success: false, message: 'Unable to create referral' });
  }
});

router.get('/referrals', authenticate, authorize(...clinicalRoles, 'receptionist'), async (req, res) => {
  try {
    const result = await pool.query(`SELECT r.*, p.first_name || ' ' || p.last_name AS patient_name FROM referrals r JOIN patients p ON p.id = r.patient_id ORDER BY r.created_at DESC`);
    res.json({ success: true, data: { referrals: result.rows } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unable to load referrals' });
  }
});

router.post('/triage', authenticate, authorize('doctor', 'nurse', 'receptionist', 'admin', 'super_admin'), async (req, res) => {
  try {
    const { patient_id, patient_name, symptoms, triage_level, arrival_source, assigned_department_id, assigned_doctor_id, notes } = req.body;
    if (!patient_name || !symptoms || !triage_level) return res.status(400).json({ success: false, message: 'patient_name, symptoms, and triage_level are required' });
    const result = await pool.query(`INSERT INTO triage_cases (patient_id, patient_name, symptoms, triage_level, arrival_source, assigned_department_id, assigned_doctor_id, notes, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`, [patient_id || null, patient_name, symptoms, triage_level, arrival_source || 'walk_in', assigned_department_id || null, assigned_doctor_id || null, notes || null, req.user.id]);
    res.status(201).json({ success: true, data: { triageCase: result.rows[0] } });
  } catch (error) {
    console.error('Triage error:', error);
    res.status(500).json({ success: false, message: 'Unable to create triage case' });
  }
});

router.get('/triage', authenticate, authorize('doctor', 'nurse', 'receptionist', 'admin', 'super_admin'), async (req, res) => {
  try {
    const result = await pool.query(`SELECT tc.*, d.name AS department_name FROM triage_cases tc LEFT JOIN departments d ON d.id = tc.assigned_department_id WHERE tc.status NOT IN ('discharged', 'transferred') ORDER BY CASE tc.triage_level WHEN 'critical' THEN 1 WHEN 'urgent' THEN 2 WHEN 'standard' THEN 3 ELSE 4 END, tc.created_at`);
    res.json({ success: true, data: { triageCases: result.rows } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Unable to load triage queue' });
  }
});

module.exports = router;
