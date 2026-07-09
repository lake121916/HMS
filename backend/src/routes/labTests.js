const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

// GET lab tests
router.get('/', authenticate, async (req, res) => {
  try {
    const { patient_id, status } = req.query;
    let query = `
      SELECT lt.*, p.first_name||' '||p.last_name AS patient_name,
        d.first_name||' '||d.last_name AS doctor_name,
        lr.results, lr.is_abnormal, lr.result_date
      FROM lab_tests lt
      JOIN patients p ON lt.patient_id = p.id
      LEFT JOIN doctors d ON lt.doctor_id = d.id
      LEFT JOIN lab_results lr ON lr.lab_test_id = lt.id
      WHERE 1=1
    `;
    const params = []; let idx = 1;
    if (req.user.role === 'patient') {
      const pat = await pool.query('SELECT id FROM patients WHERE user_id=$1', [req.user.id]);
      if (!pat.rows.length) return res.json({ success: true, data: { labTests: [] } });
      query += ` AND lt.patient_id=$${idx++}`; params.push(pat.rows[0].id);
    } else if (req.user.role === 'doctor') {
      const doc = await pool.query('SELECT id FROM doctors WHERE user_id=$1', [req.user.id]);
      if (doc.rows.length) { query += ` AND lt.doctor_id=$${idx++}`; params.push(doc.rows[0].id); }
    } else if (patient_id) {
      query += ` AND lt.patient_id=$${idx++}`; params.push(patient_id);
    }
    if (status) { query += ` AND lt.status=$${idx++}`; params.push(status); }
    query += ' ORDER BY lt.requested_date DESC';
    const result = await pool.query(query, params);
    res.json({ success: true, data: { labTests: result.rows } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST order test — doctor orders; lab_technician cannot order
router.post('/', authenticate, authorize('doctor', 'super_admin', 'admin'), async (req, res) => {
  try {
    const { patient_id, test_name, test_type, priority, notes } = req.body;
    let doctorId = req.body.doctor_id;
    if (req.user.role === 'doctor') {
      const doc = await pool.query('SELECT id FROM doctors WHERE user_id=$1', [req.user.id]);
      if (doc.rows.length) doctorId = doc.rows[0].id;
    }
    const result = await pool.query(
      `INSERT INTO lab_tests (patient_id, doctor_id, test_name, test_type, priority, notes, status)
       VALUES ($1,$2,$3,$4,$5,$6,'pending') RETURNING *`,
      [patient_id, doctorId||null, test_name, test_type||null, priority||'normal', notes||null]
    );
    res.status(201).json({ success: true, data: { labTest: result.rows[0] } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT update test status — lab_technician updates status; doctor can cancel
router.put('/:id', authenticate, authorize('lab_technician', 'doctor', 'super_admin', 'admin'), async (req, res) => {
  try {
    const { status, notes } = req.body;
    const result = await pool.query(
      `UPDATE lab_tests SET status=COALESCE($1,status), notes=COALESCE($2,notes), updated_at=NOW()
       WHERE id=$3 RETURNING *`,
      [status||null, notes||null, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: { labTest: result.rows[0] } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST upload result — lab_technician only
router.post('/:id/result', authenticate, authorize('lab_technician', 'super_admin', 'admin'), async (req, res) => {
  try {
    const { results, reference_range, is_abnormal, notes } = req.body;
    const resResult = await pool.query(
      `INSERT INTO lab_results (lab_test_id, technician_id, results, reference_range, is_abnormal, notes)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.params.id, req.user.id, results, reference_range||null, is_abnormal||false, notes||null]
    );
    await pool.query(`UPDATE lab_tests SET status='completed', updated_at=NOW() WHERE id=$1`, [req.params.id]);
    res.status(201).json({ success: true, data: { result: resResult.rows[0] } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE — admin only
router.delete('/:id', authenticate, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM lab_tests WHERE id=$1', [req.params.id]);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
