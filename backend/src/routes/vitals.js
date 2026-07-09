const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

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
router.post('/', authenticate, authorize('nurse', 'doctor', 'super_admin', 'admin'), async (req, res) => {
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
    res.status(201).json({ success: true, data: { vital: result.rows[0] } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT update vitals — nurse or doctor who recorded it, or admin
router.put('/:id', authenticate, authorize('nurse', 'doctor', 'super_admin', 'admin'), async (req, res) => {
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
