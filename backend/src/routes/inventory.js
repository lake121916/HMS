const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

// GET all inventory
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT inv.*, m.name AS medicine_name, m.generic_name, m.category, m.unit, m.unit_price
       FROM inventory inv
       JOIN medicines m ON inv.medicine_id = m.id
       ORDER BY inv.quantity ASC`
    );

    const lowStockRes = await pool.query(
      `SELECT COUNT(*) FROM inventory WHERE quantity <= reorder_level`
    );

    res.json({
      success: true,
      data: {
        inventory: result.rows,
        lowStockCount: parseInt(lowStockRes.rows[0].count)
      }
    });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST add inventory entry
router.post('/', authenticate, authorize('admin', 'pharmacist', 'super_admin'), async (req, res) => {
  try {
    const { medicine_id, quantity, reorder_level, batch_number, expiry_date, location } = req.body;
    const result = await pool.query(
      `INSERT INTO inventory (medicine_id, quantity, reorder_level, batch_number, expiry_date, location, last_restocked_date)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (medicine_id, batch_number) DO UPDATE
         SET quantity = inventory.quantity + EXCLUDED.quantity,
             last_restocked_date = NOW()
       RETURNING *`,
      [medicine_id, quantity, reorder_level || 10, batch_number || null, expiry_date || null, location || null]
    );
    res.status(201).json({ success: true, data: { inventory: result.rows[0] } });
  } catch (error) {
    console.error('Error adding inventory:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT update inventory quantity
router.put('/:id', authenticate, authorize('admin', 'pharmacist', 'super_admin'), async (req, res) => {
  try {
    const { quantity, reorder_level, location } = req.body;
    const result = await pool.query(
      `UPDATE inventory SET
         quantity = COALESCE($1, quantity),
         reorder_level = COALESCE($2, reorder_level),
         location = COALESCE($3, location),
         last_restocked_date = NOW(),
         updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [quantity ?? null, reorder_level ?? null, location || null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Inventory record not found' });
    res.json({ success: true, data: { inventory: result.rows[0] } });
  } catch (error) {
    console.error('Error updating inventory:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
