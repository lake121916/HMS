const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const {
  createPaymentIntent,
  confirmPayment,
  downloadReceipt,
  getPaymentStatus,
  refundPayment,
  handleWebhook
} = require('../controllers/paymentController');

// GET all payments
router.get('/', authenticate, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const result = await pool.query(
      `SELECT py.*, 
        i.total_amount AS invoice_total,
        p.first_name || ' ' || p.last_name AS patient_name,
        u.email AS received_by_email
       FROM payments py
       JOIN invoices i ON py.invoice_id = i.id
       JOIN patients p ON i.patient_id = p.id
       LEFT JOIN users u ON py.received_by = u.id
       ORDER BY py.payment_date DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countRes = await pool.query('SELECT COUNT(*) FROM payments');
    res.json({ success: true, data: { payments: result.rows, total: parseInt(countRes.rows[0].count) } });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST record payment
router.post('/', authenticate, authorize('receptionist'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { invoice_id, amount, payment_method, transaction_id, notes } = req.body;

    const payRes = await client.query(
      `INSERT INTO payments (invoice_id, amount, payment_method, transaction_id, received_by, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [invoice_id, amount, payment_method, transaction_id || null, req.user.id, notes || null]
    );

    // Update invoice status based on total paid
    const invoiceRes = await client.query('SELECT total_amount FROM invoices WHERE id = $1', [invoice_id]);
    const totalPaidRes = await client.query(
      'SELECT COALESCE(SUM(amount), 0) AS total_paid FROM payments WHERE invoice_id = $1',
      [invoice_id]
    );
    const totalPaid = parseFloat(totalPaidRes.rows[0].total_paid);
    const invoiceTotal = parseFloat(invoiceRes.rows[0].total_amount);

    let newStatus = 'partial';
    if (totalPaid >= invoiceTotal) newStatus = 'paid';

    await client.query('UPDATE invoices SET status = $1, updated_at = NOW() WHERE id = $2', [newStatus, invoice_id]);
    await client.query('COMMIT');

    res.status(201).json({ success: true, data: { payment: payRes.rows[0] } });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error recording payment:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    client.release();
  }
});

// GET payment summary / stats
router.get('/stats', authenticate, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const [todayRes, monthRes, pendingRes] = await Promise.all([
      pool.query(`SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE DATE(payment_date) = $1`, [today]),
      pool.query(`SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE DATE_TRUNC('month', payment_date) = DATE_TRUNC('month', NOW())`),
      pool.query(`SELECT COUNT(*) AS count, COALESCE(SUM(total_amount), 0) AS amount FROM invoices WHERE status IN ('pending', 'overdue')`)
    ]);
    res.json({
      success: true,
      data: {
        todayCollection: parseFloat(todayRes.rows[0].total),
        monthCollection: parseFloat(monthRes.rows[0].total),
        pendingCount: parseInt(pendingRes.rows[0].count),
        pendingAmount: parseFloat(pendingRes.rows[0].amount)
      }
    });
  } catch (error) {
    console.error('Error fetching payment stats:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Stripe Payment Integration Routes

// Create Payment Intent
router.post('/create-intent', authenticate, createPaymentIntent);

// Confirm Payment
router.post('/confirm', authenticate, confirmPayment);

// Get Payment Status
router.get('/status/:paymentIntentId', authenticate, getPaymentStatus);

// Download Receipt
router.get('/receipt/:paymentIntentId', authenticate, downloadReceipt);

// Refund Payment
router.post('/refund', authenticate, authorize('admin', 'cashier', 'super_admin'), refundPayment);

// Stripe Webhook
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

module.exports = router;
