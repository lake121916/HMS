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
router.post('/', authenticate, authorize('receptionist', 'cashier', 'admin', 'super_admin'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { invoice_id, amount, payment_method, transaction_id, notes } = req.body;
    const allowedMethods = ['cash', 'card', 'insurance', 'online', 'check', 'mobile_money', 'bank_transfer'];
    const numericAmount = Number(amount);

    if (!invoice_id || !Number.isFinite(numericAmount) || numericAmount <= 0 || !allowedMethods.includes(payment_method)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'invoice_id, a positive amount, and a valid payment method are required' });
    }

    const invoiceRes = await client.query(
      `SELECT i.total_amount, COALESCE(SUM(p.amount), 0) AS amount_paid
       FROM invoices i LEFT JOIN payments p ON p.invoice_id = i.id
       WHERE i.id = $1 GROUP BY i.id`,
      [invoice_id]
    );
    if (!invoiceRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }
    const balance = Number(invoiceRes.rows[0].total_amount) - Number(invoiceRes.rows[0].amount_paid);
    if (numericAmount > balance + 0.01) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: `Payment exceeds the remaining invoice balance of ${balance.toFixed(2)}` });
    }

    const seqRes = await client.query(
      `SELECT ('RCP-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('receipt_number_seq')::text, 6, '0')) AS receipt_number`
    );
    const receiptNumber = seqRes.rows[0].receipt_number;

    const payRes = await client.query(
      `INSERT INTO payments (invoice_id, amount, payment_method, payment_provider, transaction_id, provider_reference, receipt_number, received_by, notes)
       VALUES ($1, $2, $3, $3, $4, $4, $5, $6, $7) RETURNING *`,
      [invoice_id, numericAmount, payment_method, transaction_id || null, receiptNumber, req.user.id, notes || null]
    );

    // Update invoice status based on total paid
    const invoiceTotalRes = await client.query('SELECT total_amount FROM invoices WHERE id = $1', [invoice_id]);
    const totalPaidRes = await client.query(
      'SELECT COALESCE(SUM(amount), 0) AS total_paid FROM payments WHERE invoice_id = $1',
      [invoice_id]
    );
    const totalPaid = parseFloat(totalPaidRes.rows[0].total_paid);
    const invoiceTotal = parseFloat(invoiceTotalRes.rows[0].total_amount);

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


// ── Dynamic Telebirr & CBE Birr QR Payment Checkout ───────────────────────
const dynamicQr = require('../services/dynamicQrPaymentService');

// POST /api/payments/qr — Generate dynamic QR payment request
router.post('/qr', authenticate, authorize('cashier', 'admin', 'super_admin', 'receptionist'), async (req, res) => {
  try {
    const { invoice_id, provider = 'telebirr', patient_id } = req.body;
    if (!invoice_id) {
      return res.status(400).json({ success: false, message: 'invoice_id is required' });
    }

    const qrData = await dynamicQr.createDynamicPaymentRequest({
      invoiceId: parseInt(invoice_id, 10),
      patientId: patient_id ? parseInt(patient_id, 10) : null,
      provider,
      createdBy: req.user.id
    });

    res.status(201).json({ success: true, data: qrData });
  } catch (error) {
    console.error('Error generating dynamic QR payment:', error);
    res.status(400).json({ success: false, message: error.message || 'Failed to generate QR payment' });
  }
});

// GET /api/payments/qr/:requestId/status — Polling / Checking status
router.get('/qr/:requestId/status', authenticate, async (req, res) => {
  try {
    const statusData = await dynamicQr.getPaymentRequestStatus(req.params.requestId);
    res.json({ success: true, data: statusData });
  } catch (error) {
    console.error('Error checking QR status:', error);
    res.status(404).json({ success: false, message: error.message || 'Payment request not found' });
  }
});

// POST /api/payments/qr/:requestId/confirm — Cashier / Staff verified confirmation
router.post('/qr/:requestId/confirm', authenticate, authorize('cashier', 'admin', 'super_admin'), async (req, res) => {
  try {
    const { transaction_id, amount, notes } = req.body;
    if (!transaction_id) {
      return res.status(400).json({ success: false, message: 'transaction_id is required to confirm payment' });
    }

    const result = await dynamicQr.processVerifiedPayment({
      requestId: req.params.requestId,
      transactionId: transaction_id,
      paidAmount: amount ? Number(amount) : null,
      verifierUser: req.user,
      notes
    });

    res.json({ success: true, message: result.message, data: result });
  } catch (error) {
    console.error('Error confirming QR payment:', error);
    res.status(400).json({ success: false, message: error.message || 'Failed to confirm payment' });
  }
});

// POST /api/payments/webhooks/:provider — Webhook for Telebirr / CBE Birr
router.post('/webhooks/:provider', async (req, res) => {
  try {
    const provider = req.params.provider.toLowerCase();
    const { requestId, transactionId, amount, currency } = req.body;

    if (!requestId || !transactionId) {
      return res.status(400).json({ success: false, message: 'Missing requestId or transactionId' });
    }

    const result = await dynamicQr.processVerifiedPayment({
      requestId,
      transactionId,
      paidAmount: amount ? Number(amount) : null,
      verifierUser: { id: 1, role: 'admin' }, // System webhook actor
      notes: `Webhook callback from ${provider.toUpperCase()} Gateway`
    });

    res.json({ success: true, message: 'Webhook processed', data: result });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
