const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

// GET cashier dashboard statistics
router.get('/stats', authenticate, authorize('cashier', 'admin', 'super_admin'), async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const [todayPayments, todayTransactions, unpaidInvoices, paidInvoices, paymentMethods] = await Promise.all([
      pool.query(`SELECT COALESCE(SUM(py.amount), 0) AS total FROM payments py WHERE DATE(py.payment_date) = $1`, [today]),
      pool.query(`SELECT COUNT(*) AS count FROM payments py WHERE DATE(py.payment_date) = $1`, [today]),
      pool.query(`SELECT COUNT(*) AS count, COALESCE(SUM(total_amount), 0) AS amount FROM invoices WHERE status = 'UNPAID'`),
      pool.query(`SELECT COUNT(*) AS count FROM invoices WHERE status = 'PAID'`),
      pool.query(`
        SELECT 
          COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN amount ELSE 0 END), 0) AS cash,
          COALESCE(SUM(CASE WHEN payment_method = 'card' THEN amount ELSE 0 END), 0) AS card,
          COALESCE(SUM(CASE WHEN payment_method = 'telebirr' THEN amount ELSE 0 END), 0) AS telebirr,
          COALESCE(SUM(CASE WHEN payment_method = 'bank_transfer' THEN amount ELSE 0 END), 0) AS bank,
          COALESCE(SUM(CASE WHEN payment_method = 'insurance' THEN amount ELSE 0 END), 0) AS insurance
        FROM payments 
        WHERE DATE(payment_date) = $1
      `, [today])
    ]);

    res.json({
      success: true,
      data: {
        todayPayments: parseFloat(todayPayments.rows[0].total),
        todayTransactions: parseInt(todayTransactions.rows[0].count),
        unpaidInvoices: parseInt(unpaidInvoices.rows[0].count),
        paidInvoices: parseInt(paidInvoices.rows[0].count),
        outstandingAmount: parseFloat(unpaidInvoices.rows[0].amount),
        cashPayments: parseFloat(paymentMethods.rows[0].cash),
        cardPayments: parseFloat(paymentMethods.rows[0].card),
        telebirrPayments: parseFloat(paymentMethods.rows[0].telebirr),
        bankPayments: parseFloat(paymentMethods.rows[0].bank),
        insurancePayments: parseFloat(paymentMethods.rows[0].insurance),
      }
    });
  } catch (error) {
    console.error('Error fetching cashier stats:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET cashier unpaid invoices
router.get('/invoices/unpaid', authenticate, authorize('cashier', 'admin', 'super_admin'), async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const result = await pool.query(
      `SELECT i.*, 
        p.first_name || ' ' || p.last_name AS patient_name,
        p.account_number AS patient_id,
        COALESCE(SUM(py.amount), 0) AS amount_paid
      FROM invoices i
      JOIN patients p ON i.patient_id = p.id
      LEFT JOIN payments py ON py.invoice_id = i.id
      WHERE i.status IN ('UNPAID', 'PARTIAL')
      GROUP BY i.id, p.first_name, p.last_name, p.account_number
      ORDER BY i.invoice_date DESC
      LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json({ success: true, data: { invoices: result.rows } });
  } catch (error) {
    console.error('Error fetching unpaid invoices:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST process payment with receipt generation
router.post('/payments/process', authenticate, authorize('cashier', 'admin', 'super_admin'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { invoice_id, amount, payment_method, transaction_id, notes } = req.body;
    const allowedMethods = ['cash', 'card', 'telebirr', 'bank_transfer', 'insurance'];
    const numericAmount = Number(amount);

    // Validation
    if (!invoice_id || !Number.isFinite(numericAmount) || numericAmount <= 0 || !allowedMethods.includes(payment_method)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Invalid payment data' });
    }

    // Check invoice status and balance
    const invoiceRes = await client.query(
      `SELECT i.total_amount, COALESCE(SUM(p.amount), 0) AS amount_paid, i.status
       FROM invoices i LEFT JOIN payments p ON p.invoice_id = i.id
       WHERE i.id = $1 GROUP BY i.id`,
      [invoice_id]
    );
    
    if (!invoiceRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const invoice = invoiceRes.rows[0];
    const balance = Number(invoice.total_amount) - Number(invoice.amount_paid);
    
    if (invoice.status === 'PAID') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Invoice is already paid' });
    }

    if (numericAmount > balance + 0.01) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: `Payment exceeds remaining balance of ${balance.toFixed(2)}` });
    }

    // Generate receipt number
    const receiptNumber = `RCP-${String(Date.now()).slice(-6)}`;

    // Record payment
    const payRes = await client.query(
      `INSERT INTO payments (invoice_id, amount, payment_method, transaction_id, received_by, receipt_number, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [invoice_id, numericAmount, payment_method, transaction_id || null, req.user.id, receiptNumber, notes || null]
    );

    // Update invoice status
    const totalPaidRes = await client.query(
      'SELECT COALESCE(SUM(amount), 0) AS total_paid FROM payments WHERE invoice_id = $1',
      [invoice_id]
    );
    const totalPaid = parseFloat(totalPaidRes.rows[0].total_paid);
    const invoiceTotal = parseFloat(invoice.total_amount);

    let newStatus = 'PARTIAL';
    if (totalPaid >= invoiceTotal) {
      newStatus = 'PAID';
    }

    await client.query('UPDATE invoices SET status = $1, updated_at = NOW() WHERE id = $2', [newStatus, invoice_id]);
    
    await client.query('COMMIT');

    res.status(201).json({ 
      success: true, 
      data: { 
        payment: payRes.rows[0], 
        receipt_number: receiptNumber,
        new_invoice_status: newStatus 
      } 
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error processing payment:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    client.release();
  }
});

// GET payment history
router.get('/payments/history', authenticate, authorize('cashier', 'admin', 'super_admin'), async (req, res) => {
  try {
    const { limit = 50, offset = 0, patient_id } = req.query;
    let query = `
      SELECT py.*, 
        i.invoice_number,
        p.first_name || ' ' || p.last_name AS patient_name,
        p.account_number AS patient_id,
        u.email AS cashier_email
      FROM payments py
      JOIN invoices i ON py.invoice_id = i.id
      JOIN patients p ON i.patient_id = p.id
      LEFT JOIN users u ON py.received_by = u.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (patient_id) {
      query += ` AND p.account_number = $${idx++}`;
      params.push(patient_id);
    }

    query += ` ORDER BY py.payment_date DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.json({ success: true, data: { payments: result.rows } });
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET receipt details
router.get('/receipt/:receiptNumber', authenticate, authorize('cashier', 'admin', 'super_admin'), async (req, res) => {
  try {
    const { receiptNumber } = req.params;
    
    const result = await pool.query(
      `SELECT py.*, 
        i.invoice_number,
        i.total_amount AS invoice_total,
        p.first_name || ' ' || p.last_name AS patient_name,
        p.account_number AS patient_id,
        u.email AS cashier_email,
        u.first_name || ' ' || u.last_name AS cashier_name
      FROM payments py
      JOIN invoices i ON py.invoice_id = i.id
      JOIN patients p ON i.patient_id = p.id
      LEFT JOIN users u ON py.received_by = u.id
      WHERE py.receipt_number = $1`,
      [receiptNumber]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Receipt not found' });
    }

    // Get invoice items if available
    const itemsRes = await pool.query(
      `SELECT service, quantity, unit_price, total 
       FROM invoice_items 
       WHERE invoice_id = $1`,
      [result.rows[0].invoice_id]
    );

    res.json({ 
      success: true, 
      data: { 
        receipt: result.rows[0], 
        items: itemsRes.rows 
      } 
    });
  } catch (error) {
    console.error('Error fetching receipt:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;