const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { body, param, query: qv } = require('express-validator');
const validate = require('../middleware/validation');
const { authenticate, authorize } = require('../middleware/auth');
const socketService = require('../services/socketService');

function evaluateVitalAbnormalities(v) {
  const alerts = [];
  const temp = Number(v.temperature);
  const sys = Number(v.blood_pressure_systolic);
  const hr = Number(v.heart_rate);
  const rr = Number(v.respiratory_rate);
  const spo2 = Number(v.oxygen_saturation);

  if (v.temperature !== null && !isNaN(temp)) {
    if (temp >= 39.5) alerts.push({ type: 'temperature', value: temp, severity: 'critical', message: `Hyperpyrexia (${temp}°C)` });
    else if (temp >= 38.3) alerts.push({ type: 'temperature', value: temp, severity: 'urgent', message: `High Fever (${temp}°C)` });
    else if (temp < 35.0) alerts.push({ type: 'temperature', value: temp, severity: 'critical', message: `Hypothermia (${temp}°C)` });
  }

  if (v.blood_pressure_systolic !== null && !isNaN(sys)) {
    if (sys >= 180) alerts.push({ type: 'blood_pressure', value: sys, severity: 'critical', message: `Hypertensive Crisis (${sys} mmHg)` });
    else if (sys < 90) alerts.push({ type: 'blood_pressure', value: sys, severity: 'urgent', message: `Hypotension (${sys} mmHg)` });
  }

  if (v.heart_rate !== null && !isNaN(hr)) {
    if (hr > 130) alerts.push({ type: 'heart_rate', value: hr, severity: 'critical', message: `Severe Tachycardia (${hr} bpm)` });
    else if (hr < 50) alerts.push({ type: 'heart_rate', value: hr, severity: 'critical', message: `Severe Bradycardia (${hr} bpm)` });
  }

  if (v.oxygen_saturation !== null && !isNaN(spo2)) {
    if (spo2 < 90) alerts.push({ type: 'oxygen_saturation', value: spo2, severity: 'critical', message: `Severe Hypoxemia (SpO₂: ${spo2}%)` });
    else if (spo2 < 94) alerts.push({ type: 'oxygen_saturation', value: spo2, severity: 'urgent', message: `Low SpO₂ (${spo2}%)` });
  }

  if (v.respiratory_rate !== null && !isNaN(rr)) {
    if (rr > 30) alerts.push({ type: 'respiratory_rate', value: rr, severity: 'urgent', message: `Tachypnea (${rr}/min)` });
    else if (rr < 8) alerts.push({ type: 'respiratory_rate', value: rr, severity: 'critical', message: `Bradypnea / Respiratory Depression (${rr}/min)` });
  }

  return alerts;
}

// ── Reusable vital field validators ────────────────────────────────────────
const vitalFields = [
  body('patient_id').isInt({ min: 1 }).withMessage('Valid patient_id is required'),
  body('temperature').optional({ nullable: true })
    .isFloat({ min: 30, max: 45 }).withMessage('Temperature must be between 30–45 °C'),
  body('blood_pressure_systolic').optional({ nullable: true })
    .isInt({ min: 60, max: 300 }).withMessage('Systolic BP must be 60–300 mmHg'),
  body('blood_pressure_diastolic').optional({ nullable: true })
    .isInt({ min: 40, max: 200 }).withMessage('Diastolic BP must be 40–200 mmHg'),
  body('heart_rate').optional({ nullable: true })
    .isInt({ min: 20, max: 300 }).withMessage('Heart rate must be 20–300 bpm'),
  body('respiratory_rate').optional({ nullable: true })
    .isInt({ min: 5, max: 60 }).withMessage('Respiratory rate must be 5–60 /min'),
  body('oxygen_saturation').optional({ nullable: true })
    .isFloat({ min: 50, max: 100 }).withMessage('SpO₂ must be 50–100%'),
  body('weight').optional({ nullable: true })
    .isFloat({ min: 0.5, max: 500 }).withMessage('Weight must be 0.5–500 kg'),
  body('height').optional({ nullable: true })
    .isFloat({ min: 20, max: 300 }).withMessage('Height must be 20–300 cm'),
  body('blood_glucose').optional({ nullable: true })
    .isFloat({ min: 1, max: 100 }).withMessage('Blood glucose must be 1–100 mmol/L'),
  body('notes').optional({ nullable: true })
    .isString().trim().isLength({ max: 1000 }).withMessage('Notes must be ≤ 1000 characters'),
];

const vitalUpdateFields = vitalFields.slice(1); // patient_id not required on update


// GET vitals — doctors & nurses see all; patients see only their own
router.get('/', authenticate, async (req, res) => {
  try {
    const { patient_id, limit = 50 } = req.query;
    let query = `
      SELECT v.*, p.first_name || ' ' || p.last_name AS patient_name,
        n.first_name || ' ' || n.last_name AS nurse_name
      FROM vitals v
      JOIN patients p ON v.patient_id = p.id
      LEFT JOIN nurses n ON v.nurse_id = n.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;
    // patients can only see their own vitals
    if (req.user.role === 'patient') {
      const pat = await pool.query('SELECT id FROM patients WHERE user_id = $1', [req.user.id]);
      if (!pat.rows.length) return res.json({ success: true, data: { vitals: [] } });
      query += ` AND v.patient_id = $${idx++}`;
      params.push(pat.rows[0].id);
    } else if (patient_id) {
      query += ` AND v.patient_id = $${idx++}`;
      params.push(patient_id);
    }
    query += ` ORDER BY v.recorded_at DESC LIMIT $${idx}`;
    params.push(limit);
    const result = await pool.query(query, params);
    res.json({ success: true, data: { vitals: result.rows } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST record vitals — nurse and doctor only
router.post('/', authenticate, authorize('nurse', 'doctor', 'super_admin', 'admin'), vitalFields, validate, async (req, res) => {
  try {
    const { patient_id, temperature, blood_pressure_systolic, blood_pressure_diastolic,
      heart_rate, respiratory_rate, oxygen_saturation, weight, height, blood_glucose, notes } = req.body;
    // resolve nurse_id from user_id if role is nurse
    let nurseId = null;
    if (req.user.role === 'nurse') {
      const n = await pool.query('SELECT id FROM nurses WHERE user_id = $1', [req.user.id]);
      if (n.rows.length) nurseId = n.rows[0].id;
    }
    const result = await pool.query(
      `INSERT INTO vitals (patient_id, nurse_id, temperature, blood_pressure_systolic, blood_pressure_diastolic,
        heart_rate, respiratory_rate, oxygen_saturation, weight, height, blood_glucose, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [patient_id, nurseId, temperature||null, blood_pressure_systolic||null, blood_pressure_diastolic||null,
       heart_rate||null, respiratory_rate||null, oxygen_saturation||null, weight||null, height||null, blood_glucose||null, notes||null]
    );
    const vitalRow = result.rows[0];
    const alerts = evaluateVitalAbnormalities(vitalRow);

    if (alerts.length > 0) {
      try {
        const patientRes = await pool.query('SELECT first_name, last_name FROM patients WHERE id = $1', [patient_id]);
        const pName = patientRes.rows[0] ? `${patientRes.rows[0].first_name} ${patientRes.rows[0].last_name}` : `Patient #${patient_id}`;
        const primary = alerts.find(a => a.severity === 'critical') || alerts[0];

        const alertPayload = {
          type: 'critical_vitals',
          patientId: patient_id,
          patientName: pName,
          vitalType: primary.type,
          vitalValue: primary.value,
          severity: primary.severity,
          alerts,
          timestamp: new Date().toISOString(),
          message: `ABNORMAL VITALS ALERT: ${pName} - ${alerts.map(a => a.message).join(', ')}`
        };

        socketService.emitToRole('doctor', 'critical-alert', alertPayload);
        socketService.emitToRole('nurse', 'critical-alert', alertPayload);
        socketService.emitToRole('admin', 'critical-alert', alertPayload);
      } catch (alertErr) {
        console.error('Non-fatal vital alert notification error:', alertErr.message);
      }
    }

    res.status(201).json({ success: true, data: { vital: vitalRow, alerts } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT update vitals — nurse or doctor who recorded it, or admin
router.put('/:id', authenticate, authorize('nurse', 'doctor', 'super_admin', 'admin'), vitalUpdateFields, validate, async (req, res) => {
  try {
    const { temperature, blood_pressure_systolic, blood_pressure_diastolic,
      heart_rate, respiratory_rate, oxygen_saturation, weight, height, blood_glucose, notes } = req.body;
    const result = await pool.query(
      `UPDATE vitals SET temperature=COALESCE($1,temperature), blood_pressure_systolic=COALESCE($2,blood_pressure_systolic),
        blood_pressure_diastolic=COALESCE($3,blood_pressure_diastolic), heart_rate=COALESCE($4,heart_rate),
        respiratory_rate=COALESCE($5,respiratory_rate), oxygen_saturation=COALESCE($6,oxygen_saturation),
        weight=COALESCE($7,weight), height=COALESCE($8,height), blood_glucose=COALESCE($9,blood_glucose),
        notes=COALESCE($10,notes) WHERE id=$11 RETURNING *`,
      [temperature||null, blood_pressure_systolic||null, blood_pressure_diastolic||null,
       heart_rate||null, respiratory_rate||null, oxygen_saturation||null, weight||null,
       height||null, blood_glucose||null, notes||null, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Vital record not found' });
    res.json({ success: true, data: { vital: result.rows[0] } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE — admin/super_admin only
router.delete('/:id', authenticate, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM vitals WHERE id=$1', [req.params.id]);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
