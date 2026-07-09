const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

// GET all nurses
router.get('/', authenticate, async (req, res) => {
  try {
    const { department_id, shift, is_available, search } = req.query;

    let query = `
      SELECT n.*, dep.name AS department_name
      FROM nurses n
      LEFT JOIN departments dep ON n.department_id = dep.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (department_id) {
      query += ` AND n.department_id = $${idx++}`;
      params.push(department_id);
    }
    if (shift) {
      query += ` AND n.shift = $${idx++}`;
      params.push(shift);
    }
    if (is_available !== undefined) {
      query += ` AND n.is_available = $${idx++}`;
      params.push(is_available === 'true');
    }
    if (search) {
      query += ` AND (n.first_name ILIKE $${idx} OR n.last_name ILIKE $${idx} OR n.email ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }

    query += ' ORDER BY n.first_name, n.last_name';

    const result = await pool.query(query, params);
    res.json({ success: true, data: { nurses: result.rows } });
  } catch (error) {
    console.error('Error fetching nurses:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET single nurse
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT n.*, dep.name AS department_name
       FROM nurses n LEFT JOIN departments dep ON n.department_id = dep.id
       WHERE n.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Nurse not found' });
    }
    res.json({ success: true, data: { nurse: result.rows[0] } });
  } catch (error) {
    console.error('Error fetching nurse:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST create nurse
router.post('/', authenticate, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const { first_name, last_name, phone, email, department_id, license_number, qualification, shift } = req.body;

    if (!first_name || !last_name) {
      return res.status(400).json({ success: false, message: 'first_name and last_name are required' });
    }

    const result = await pool.query(
      `INSERT INTO nurses (first_name, last_name, phone, email, department_id, license_number, qualification, shift)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [first_name, last_name, phone || null, email || null,
       department_id || null, license_number || null, qualification || null, shift || null]
    );
    res.status(201).json({ success: true, data: { nurse: result.rows[0] } });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ success: false, message: 'License number already registered' });
    }
    console.error('Error creating nurse:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT update nurse
router.put('/:id', authenticate, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const { first_name, last_name, phone, email, department_id, license_number, qualification, shift, is_available } = req.body;

    const result = await pool.query(
      `UPDATE nurses SET
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        phone = COALESCE($3, phone),
        email = COALESCE($4, email),
        department_id = COALESCE($5, department_id),
        license_number = COALESCE($6, license_number),
        qualification = COALESCE($7, qualification),
        shift = COALESCE($8, shift),
        is_available = COALESCE($9, is_available),
        updated_at = NOW()
       WHERE id = $10 RETURNING *`,
      [first_name || null, last_name || null, phone || null, email || null,
       department_id || null, license_number || null, qualification || null,
       shift || null, is_available !== undefined ? is_available : null, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Nurse not found' });
    }
    res.json({ success: true, data: { nurse: result.rows[0] } });
  } catch (error) {
    console.error('Error updating nurse:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE nurse
router.delete('/:id', authenticate, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM nurses WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Nurse not found' });
    }
    res.json({ success: true, message: 'Nurse deleted' });
  } catch (error) {
    console.error('Error deleting nurse:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
