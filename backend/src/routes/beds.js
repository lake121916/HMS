const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

// GET all beds
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, ward } = req.query;
    let query = `
      SELECT b.*,
        CASE WHEN b.status = 'occupied' THEN
          (SELECT p.first_name || ' ' || p.last_name FROM admissions a JOIN patients p ON a.patient_id = p.id
           WHERE a.bed_id = b.id AND a.status = 'admitted' LIMIT 1)
        ELSE NULL END AS current_patient
      FROM beds b WHERE 1=1
    `;
    const params = [];
    let idx = 1;
    if (status) { query += ` AND b.status = $${idx++}`; params.push(status); }
    if (ward) { query += ` AND b.ward = $${idx++}`; params.push(ward); }
    query += ' ORDER BY b.ward, b.bed_number';

    const result = await pool.query(query, params);

    // Get summary stats
    const statsRes = await pool.query(
      `SELECT status, COUNT(*) AS count FROM beds GROUP BY status`
    );
    const stats = {};
    statsRes.rows.forEach(r => { stats[r.status] = parseInt(r.count); });

    res.json({ success: true, data: { beds: result.rows, stats } });
  } catch (error) {
    console.error('Error fetching beds:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST create bed
router.post('/', authenticate, authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const { ward, bed_number, bed_type, daily_rate, hourly_rate } = req.body;
    const result = await pool.query(
      `INSERT INTO beds (ward, bed_number, bed_type, daily_rate, hourly_rate, status)
       VALUES ($1, $2, $3, $4, $5, 'available') RETURNING *`,
      [ward, bed_number, bed_type || 'general', daily_rate || 0, hourly_rate || 0]
    );
    res.status(201).json({ success: true, data: { bed: result.rows[0] } });
  } catch (error) {
    console.error('Error creating bed:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT update bed
router.put('/:id', authenticate, authorize('admin', 'super_admin', 'nurse'), async (req, res) => {
  try {
    const { status, ward, bed_number, bed_type, daily_rate } = req.body;
    const result = await pool.query(
      `UPDATE beds SET
        status = COALESCE($1, status),
        ward = COALESCE($2, ward),
        bed_number = COALESCE($3, bed_number),
        bed_type = COALESCE($4, bed_type),
        daily_rate = COALESCE($5, daily_rate),
        updated_at = NOW()
       WHERE id = $6 RETURNING *`,
      [status || null, ward || null, bed_number || null, bed_type || null, daily_rate || null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Bed not found' });
    res.json({ success: true, data: { bed: result.rows[0] } });
  } catch (error) {
    console.error('Error updating bed:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE bed
router.delete('/:id', authenticate, authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM beds WHERE id = $1 AND status != \'occupied\' RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(400).json({ success: false, message: 'Bed not found or is currently occupied' });
    res.json({ success: true, message: 'Bed deleted' });
  } catch (error) {
    console.error('Error deleting bed:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
