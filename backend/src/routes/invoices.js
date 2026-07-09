const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

// GET all invoices
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, patient_id, limit = 50, offset = 0 } = req.query;
    let query = `
      SELECT i.*, 
        p.first_name || ' ' || p.last_name AS patient_name,
        p.phone AS patient_phone,
        COALESCE(SUM(py.amount), 0) AS amount_paid
      FROM invoices i
      JOIN patients p ON i.patient_id = p.id
      LEFT JOIN payments py ON py.invoice_id = i.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (status) { query += ` AND i.status = $${idx++}`; params.push(status); }
    if (patient_id) { query += ` AND i.patient_id = $${idx++}`; params.push(patient_id); }

    query += ` GROUP BY i.id, p.first_name, p.last_name, p.phone ORDER BY i.invoice_date DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM invoices i WHERE 1=1${status ? ' AND i.status=$1' : ''}`,
      status ? [status] : []
    );

    res.json({ success: true, data: { invoices: result.rows, total: parseInt(countRes.rows[0].count) } });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET single invoice with payments
router.get('/:id', authenticate, async (req, res) => {
  try {
    const invoiceRes = await pool.query(
      `SELECT i.*, p.first_name || ' ' || p.last_name AS patient_name, p.phone AS patient_phone, p.email AS patient_email
       FROM invoices i JOIN patients p ON i.patient_id = p.id WHERE i.id = $1`,
      [req.params.id]
    );
    if (invoiceRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Invoice not found' });

    const paymentsRes = await pool.query(
      `SELECT py.*, u.email AS received_by_email FROM payments py
       LEFT JOIN users u ON py.received_by = u.id WHERE py.invoice_id = $1 ORDER BY py.payment_date DESC`,
      [req.params.id]
    );

    res.json({ success: true, data: { invoice: invoiceRes.rows[0], payments: paymentsRes.rows } });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST create invoice
router.post('/', authenticate, authorize('receptionist'), async (req, res) => {
  try {
    const { patient_id, admission_id, due_date, subtotal, tax = 0, discount = 0, notes, items } = req.body;
    const total_amount = parseFloat(subtotal) + parseFloat(tax) - parseFloat(discount);

    const result = await pool.query(
      `INSERT INTO invoices (patient_id, admission_id, due_date, subtotal, tax, discount, total_amount, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending') RETURNING *`,
      [patient_id, admission_id || null, due_date || null, subtotal, tax, discount, total_amount, notes || null]
    );

    res.status(201).json({ success: true, data: { invoice: result.rows[0] } });
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT update invoice
router.put('/:id', authenticate, authorize('admin', 'cashier', 'super_admin'), async (req, res) => {
  try {
    const { subtotal, tax, discount, status, notes, due_date } = req.body;
    const total_amount = subtotal && (parseFloat(subtotal) + parseFloat(tax || 0) - parseFloat(discount || 0));

    const result = await pool.query(
      `UPDATE invoices SET 
        subtotal = COALESCE($1, subtotal),
        tax = COALESCE($2, tax),
        discount = COALESCE($3, discount),
        total_amount = COALESCE($4, total_amount),
        status = COALESCE($5, status),
        notes = COALESCE($6, notes),
        due_date = COALESCE($7, due_date),
        updated_at = NOW()
       WHERE id = $8 RETURNING *`,
      [subtotal || null, tax || null, discount || null, total_amount || null, status || null, notes || null, due_date || null, req.params.id]
    );

    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true, data: { invoice: result.rows[0] } });
  } catch (error) {
    console.error('Error updating invoice:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE invoice
router.delete('/:id', authenticate, authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM invoices WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true, message: 'Invoice deleted' });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
