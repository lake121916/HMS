const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, async (req, res) => {
  try {
    const { patient_id } = req.query;
    let query = `
      SELECT diag.*, p.first_name||' '||p.last_name AS patient_name,
        d.first_name||' '||d.last_name AS doctor_name
      FROM diagnoses diag
      JOIN patients p ON diag.patient_id = p.id
      JOIN doctors d ON diag.doctor_id = d.id
      WHERE 1=1
    `;
    const params = []; let idx = 1;
    if (req.user.role === 'patient') {
      const pat = await pool.query('SELECT id FROM patients WHERE user_id=$1', [req.user.id]);
      if (!pat.rows.length) return res.json({ success: true, data: { diagnoses: [] } });
      query += ` AND diag.patient_id=$${idx++}`; params.push(pat.rows[0].id);
    } else if (patient_id) {
      query += ` AND diag.patient_id=$${idx++}`; params.push(patient_id);
    }
    query += ' ORDER BY diag.diagnosis_date DESC';
    const result = await pool.query(query, params);
    res.json({ success: true, data: { diagnoses: result.rows } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/', authenticate, authorize('doctor', 'super_admin', 'admin'), async (req, res) => {
  try {
    const { patient_id, appointment_id, disease_name, icd_code, severity, symptoms, notes, is_chronic } = req.body;
    let doctorId = req.body.doctor_id;
    if (req.user.role === 'doctor') {
      const doc = await pool.query('SELECT id FROM doctors WHERE user_id=$1', [req.user.id]);
      if (doc.rows.length) doctorId = doc.rows[0].id;
    }
    const result = await pool.query(
      `INSERT INTO diagnoses (patient_id, doctor_id, appointment_id, disease_name, icd_code, severity, symptoms, notes, is_chronic)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [patient_id, doctorId, appointment_id||null, disease_name, icd_code||null,
       severity||null, symptoms||null, notes||null, is_chronic||false]
    );
    res.status(201).json({ success: true, data: { diagnosis: result.rows[0] } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/:id', authenticate, authorize('doctor', 'super_admin', 'admin'), async (req, res) => {
  try {
    const { disease_name, severity, symptoms, notes, is_chronic } = req.body;
    const result = await pool.query(
      `UPDATE diagnoses SET disease_name=COALESCE($1,disease_name), severity=COALESCE($2,severity),
        symptoms=COALESCE($3,symptoms), notes=COALESCE($4,notes),
        is_chronic=COALESCE($5,is_chronic), updated_at=NOW()
       WHERE id=$6 RETURNING *`,
      [disease_name||null, severity||null, symptoms||null, notes||null, is_chronic!==undefined?is_chronic:null, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: { diagnosis: result.rows[0] } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/:id', authenticate, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM diagnoses WHERE id=$1', [req.params.id]);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
