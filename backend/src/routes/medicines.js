const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

// GET all medicines with inventory
router.get('/', authenticate, async (req, res) => {
  try {
    const { search, category, limit = 100, offset = 0 } = req.query;
    let query = `
      SELECT m.*, 
        COALESCE(SUM(inv.quantity), 0) AS stock_quantity,
        MIN(inv.expiry_date) AS nearest_expiry
      FROM medicines m
      LEFT JOIN inventory inv ON inv.medicine_id = m.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;
    if (search) { query += ` AND (m.name ILIKE $${idx++} OR m.generic_name ILIKE $${idx-1})`; params.push(`%${search}%`); }
    if (category) { query += ` AND m.category = $${idx++}`; params.push(category); }
    query += ` GROUP BY m.id ORDER BY m.name LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    res.json({ success: true, data: { medicines: result.rows } });
  } catch (error) {
    console.error('Error fetching medicines:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST create medicine
router.post('/', authenticate, authorize('admin', 'pharmacist', 'super_admin'), async (req, res) => {
  try {
    const { name, generic_name, manufacturer, category, description, unit, unit_price, expiry_date, storage_conditions, side_effects, contraindications } = req.body;
    const result = await pool.query(
      `INSERT INTO medicines (name, generic_name, manufacturer, category, description, unit, unit_price, expiry_date, storage_conditions, side_effects, contraindications)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [name, generic_name || null, manufacturer || null, category || null, description || null, unit || null, unit_price, expiry_date || null, storage_conditions || null, side_effects || null, contraindications || null]
    );
    res.status(201).json({ success: true, data: { medicine: result.rows[0] } });
  } catch (error) {
    console.error('Error creating medicine:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT update medicine
router.put('/:id', authenticate, authorize('admin', 'pharmacist', 'super_admin'), async (req, res) => {
  try {
    const { name, generic_name, manufacturer, category, unit_price, unit } = req.body;
    const result = await pool.query(
      `UPDATE medicines SET
        name = COALESCE($1, name),
        generic_name = COALESCE($2, generic_name),
        manufacturer = COALESCE($3, manufacturer),
        category = COALESCE($4, category),
        unit_price = COALESCE($5, unit_price),
        unit = COALESCE($6, unit),
        updated_at = NOW()
       WHERE id = $7 RETURNING *`,
      [name || null, generic_name || null, manufacturer || null, category || null, unit_price || null, unit || null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Medicine not found' });
    res.json({ success: true, data: { medicine: result.rows[0] } });
  } catch (error) {
    console.error('Error updating medicine:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE medicine
router.delete('/:id', authenticate, authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM medicines WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Medicine not found' });
    res.json({ success: true, message: 'Medicine deleted' });
  } catch (error) {
    console.error('Error deleting medicine:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
