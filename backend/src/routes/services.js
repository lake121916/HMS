/**
 * Services catalog route
 */
const express = require('express');
const router  = express.Router();
const pool    = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

// GET all services
router.get('/', authenticate, async (req, res) => {
  try {
    const { category, is_active } = req.query;
    let where = 'WHERE 1=1';
    const params = []; let idx = 1;
    if (category) { where += ` AND s.category=$${idx++}`; params.push(category); }
    if (is_active !== undefined) { where += ` AND s.is_active=$${idx++}`; params.push(is_active === 'true'); }

    const result = await pool.query(`
      SELECT s.*, d.name AS department_name
      FROM services s LEFT JOIN departments d ON d.id = s.department_id
      ${where}
      ORDER BY s.category, s.name
    `, params);
    res.json({ success: true, data: { services: result.rows } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST create service (Admin/Super Admin)
router.post('/', authenticate, authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const { name, category, description, unit_price, department_id, is_active = true } = req.body;
    if (!name || !category || unit_price == null) {
      return res.status(400).json({ success: false, message: 'name, category, unit_price required' });
    }
    const result = await pool.query(
      `INSERT INTO services (name, category, description, unit_price, department_id, is_active)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name, category, description||null, unit_price, department_id||null, is_active]
    );
    res.status(201).json({ success: true, data: { service: result.rows[0] } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT update service
router.put('/:id', authenticate, authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const { name, category, description, unit_price, department_id, is_active } = req.body;
    const result = await pool.query(
      `UPDATE services SET
         name = COALESCE($1, name), category = COALESCE($2, category),
         description = COALESCE($3, description), unit_price = COALESCE($4, unit_price),
         department_id = COALESCE($5, department_id), is_active = COALESCE($6, is_active),
         updated_at = NOW()
       WHERE id = $7 RETURNING *`,
      [name||null, category||null, description||null, unit_price||null, department_id||null, is_active!=null?is_active:null, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: { service: result.rows[0] } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE
router.delete('/:id', authenticate, authorize('admin', 'super_admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM services WHERE id=$1', [req.params.id]);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
