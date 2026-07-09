const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

// GET all admissions
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    let query = `
      SELECT a.*,
        p.first_name || ' ' || p.last_name AS patient_name,
        p.phone AS patient_phone,
        d.first_name || ' ' || d.last_name AS doctor_name,
        d.specialization,
        b.bed_number, b.ward, b.bed_type
      FROM admissions a
      JOIN patients p ON a.patient_id = p.id
      LEFT JOIN doctors d ON a.admitting_doctor_id = d.id
      LEFT JOIN beds b ON a.bed_id = b.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;
    if (status) { query += ` AND a.status = $${idx++}`; params.push(status); }
    query += ` ORDER BY a.admission_date DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    const countRes = await pool.query(`SELECT COUNT(*) FROM admissions${status ? ' WHERE status=$1' : ''}`, status ? [status] : []);

    res.json({ success: true, data: { admissions: result.rows, total: parseInt(countRes.rows[0].count) } });
  } catch (error) {
    console.error('Error fetching admissions:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET single admission
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, p.first_name || ' ' || p.last_name AS patient_name,
        d.first_name || ' ' || d.last_name AS doctor_name,
        b.bed_number, b.ward, b.bed_type
       FROM admissions a
       JOIN patients p ON a.patient_id = p.id
       LEFT JOIN doctors d ON a.admitting_doctor_id = d.id
       LEFT JOIN beds b ON a.bed_id = b.id
       WHERE a.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Admission not found' });
    res.json({ success: true, data: { admission: result.rows[0] } });
  } catch (error) {
    console.error('Error fetching admission:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST create admission
router.post('/', authenticate, authorize('admin', 'doctor', 'receptionist', 'super_admin', 'nurse'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { patient_id, bed_id, admitting_doctor_id, diagnosis, treatment_plan } = req.body;

    const result = await client.query(
      `INSERT INTO admissions (patient_id, bed_id, admitting_doctor_id, diagnosis, treatment_plan, status)
       VALUES ($1, $2, $3, $4, $5, 'admitted') RETURNING *`,
      [patient_id, bed_id || null, admitting_doctor_id || null, diagnosis || null, treatment_plan || null]
    );

    if (bed_id) {
      await client.query(`UPDATE beds SET status = 'occupied', updated_at = NOW() WHERE id = $1`, [bed_id]);
    }

    await client.query('COMMIT');
    res.status(201).json({ success: true, data: { admission: result.rows[0] } });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating admission:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    client.release();
  }
});

// PUT discharge patient
router.put('/:id/discharge', authenticate, authorize('admin', 'doctor', 'super_admin'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { discharge_summary, total_charges } = req.body;

    const admRes = await client.query('SELECT * FROM admissions WHERE id = $1', [req.params.id]);
    if (admRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Admission not found' });

    const result = await client.query(
      `UPDATE admissions SET status = 'discharged', discharge_date = NOW(),
        discharge_summary = $1, total_charges = $2, updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [discharge_summary || null, total_charges || 0, req.params.id]
    );

    if (admRes.rows[0].bed_id) {
      await client.query(`UPDATE beds SET status = 'available', updated_at = NOW() WHERE id = $1`, [admRes.rows[0].bed_id]);
    }

    await client.query('COMMIT');
    res.json({ success: true, data: { admission: result.rows[0] } });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error discharging patient:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    client.release();
  }
});

// PUT update admission
router.put('/:id', authenticate, authorize('admin', 'doctor', 'nurse', 'super_admin'), async (req, res) => {
  try {
    const { diagnosis, treatment_plan, bed_id } = req.body;
    const result = await pool.query(
      `UPDATE admissions SET
        diagnosis = COALESCE($1, diagnosis),
        treatment_plan = COALESCE($2, treatment_plan),
        bed_id = COALESCE($3, bed_id),
        updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [diagnosis || null, treatment_plan || null, bed_id || null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Admission not found' });
    res.json({ success: true, data: { admission: result.rows[0] } });
  } catch (error) {
    console.error('Error updating admission:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
