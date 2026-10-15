// ============================================================================
// Alem Ketema Enat Hospital Management System (HMS)
// Routes: Cashier Operations, Thermal Receipt Printing, Digital Payments,
//         Shifts, Z-Report Reconciliation & Financial Audit
// ============================================================================

const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const {
  normalizeProvider,
  validateProviderReference,
  checkDuplicateReference,
  logFinancialAudit,
  verifyDigitalPayment
} = require('../services/digitalPaymentService');
const {
  getActiveShift,
  openShift,
  calculateShiftSummary,
  closeShift,
  generateZReport,
  submitHandover,
  reviewHandover
} = require('../services/cashierShiftService');

// ── Hospital Financial Config ──────────────────────────────────────────────

// GET official hospital financial configuration
router.get('/config', authenticate, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM hospital_financial_config WHERE id = 1');
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching hospital config:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT update official hospital configuration (Admin only)
router.put('/config', authenticate, authorize('admin', 'super_admin'), async (req, res) => {
  try {
    const {
      hospital_name_en, hospital_name_am, address_en, address_am,
      telephone, tin_number, telebirr_merchant_till, cbe_account_number,
      cbe_account_name, cbe_branch, default_paper_width, variance_threshold
    } = req.body;

    const result = await pool.query(
      `UPDATE hospital_financial_config SET
        hospital_name_en = COALESCE($1, hospital_name_en),
        hospital_name_am = COALESCE($2, hospital_name_am),
        address_en = COALESCE($3, address_en),
        address_am = COALESCE($4, address_am),
        telephone = COALESCE($5, telephone),
        tin_number = COALESCE($6, tin_number),
        telebirr_merchant_till = COALESCE($7, telebirr_merchant_till),
        cbe_account_number = COALESCE($8, cbe_account_number),
        cbe_account_name = COALESCE($9, cbe_account_name),
        cbe_branch = COALESCE($10, cbe_branch),
        default_paper_width = COALESCE($11, default_paper_width),
        variance_threshold = COALESCE($12, variance_threshold),
        updated_at = NOW()
       WHERE id = 1 RETURNING *`,
      [
        hospital_name_en, hospital_name_am, address_en, address_am,
        telephone, tin_number, telebirr_merchant_till, cbe_account_number,
        cbe_account_name, cbe_branch, default_paper_width, variance_threshold
      ]
    );

    await logFinancialAudit(pool, {
      entityType: 'CONFIG',
      entityId: 1,
      action: 'CONFIG_UPDATED',
      actorId: req.user.id,
      metadata: req.body
    });

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating hospital config:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── Cashier Dashboard Stats ────────────────────────────────────────────────

// GET cashier dashboard statistics
router.get('/stats', authenticate, authorize('cashier', 'admin', 'super_admin', 'finance_officer'), async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [todayPayments, todayTransactions, unpaidInvoices, paidInvoices, paymentMethods, pendingDigital] = await Promise.all([
      pool.query(`SELECT COALESCE(SUM(py.amount), 0) AS total FROM payments py WHERE DATE(py.payment_date) = $1 AND py.verification_status != 'REJECTED'`, [today]),
      pool.query(`SELECT COUNT(*) AS count FROM payments py WHERE DATE(py.payment_date) = $1 AND py.verification_status != 'REJECTED'`, [today]),
      pool.query(`SELECT COUNT(*) AS count, COALESCE(SUM(total_amount), 0) AS amount FROM invoices WHERE LOWER(status) IN ('unpaid', 'pending', 'partial')`),
      pool.query(`SELECT COUNT(*) AS count FROM invoices WHERE LOWER(status) = 'paid'`),
      pool.query(`
        SELECT 
          COALESCE(SUM(CASE WHEN LOWER(payment_method) = 'cash' THEN amount ELSE 0 END), 0) AS cash,
          COALESCE(SUM(CASE WHEN LOWER(payment_method) = 'card' THEN amount ELSE 0 END), 0) AS card,
          COALESCE(SUM(CASE WHEN LOWER(payment_method) = 'telebirr' AND verification_status = 'VERIFIED' THEN amount ELSE 0 END), 0) AS telebirr,
          COALESCE(SUM(CASE WHEN LOWER(payment_method) IN ('bank_transfer', 'cbe_birr') AND verification_status = 'VERIFIED' THEN amount ELSE 0 END), 0) AS bank,
          COALESCE(SUM(CASE WHEN LOWER(payment_method) = 'insurance' THEN amount ELSE 0 END), 0) AS insurance
        FROM payments 
        WHERE DATE(payment_date) = $1 AND verification_status != 'REJECTED'
      `, [today]),
      pool.query(`
        SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total
        FROM payments
        WHERE verification_status = 'PENDING'
      `)
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
        pendingDigitalCount: parseInt(pendingDigital.rows[0].count),
        pendingDigitalAmount: parseFloat(pendingDigital.rows[0].total)
      }
    });
  } catch (error) {
    console.error('Error fetching cashier stats:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── Invoices ───────────────────────────────────────────────────────────────

// GET cashier unpaid invoices
router.get('/invoices/unpaid', authenticate, authorize('cashier', 'admin', 'super_admin', 'receptionist'), async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const result = await pool.query(
      `SELECT i.*,
        ('INV-' || LPAD(i.id::text, 5, '0')) AS invoice_number,
        p.first_name || ' ' || p.last_name AS patient_name,
        ('PAT-' || p.id::text) AS patient_id,
        COALESCE(SUM(CASE WHEN py.verification_status != 'REJECTED' THEN py.amount ELSE 0 END), 0) AS amount_paid
      FROM invoices i
      JOIN patients p ON i.patient_id = p.id
      LEFT JOIN payments py ON py.invoice_id = i.id
      WHERE LOWER(i.status) IN ('unpaid', 'pending', 'partial')
      GROUP BY i.id, p.first_name, p.last_name, p.id
      ORDER BY i.created_at DESC
      LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json({ success: true, data: { invoices: result.rows } });
  } catch (error) {
    console.error('Error fetching unpaid invoices:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── Reference Pre-Verification ─────────────────────────────────────────────

// POST pre-validate payment reference (Telebirr / CBE Birr)
router.post('/payments/verify-reference', authenticate, authorize('cashier', 'admin', 'super_admin'), async (req, res) => {
  try {
    const { method, reference, amount } = req.body;
    const provider = normalizeProvider(method);

    if (!['telebirr', 'cbe_birr', 'cbe', 'bank_transfer'].includes(provider)) {
      return res.status(400).json({ success: false, message: 'Reference verification only applies to Telebirr or CBE Birr digital payments.' });
    }

    const validation = validateProviderReference(provider, reference);
    if (!validation.valid) {
      return res.status(400).json({ success: false, message: validation.message });
    }

    // Duplicate check
    const dupCheck = await checkDuplicateReference(pool, provider, validation.normalizedReference);
    if (dupCheck.isDuplicate) {
      // Record duplicate attempt in audit log
      await logFinancialAudit(pool, {
        entityType: 'PAYMENT',
        entityId: dupCheck.existingPayment.id,
        action: 'DUPLICATE_REFERENCE_ATTEMPT',
        actorId: req.user.id,
        reason: 'Attempted to verify already used transaction reference',
        metadata: { provider, reference: validation.normalizedReference, amount }
      });

      return res.status(409).json({
        success: false,
        isDuplicate: true,
        message: dupCheck.message
      });
    }

    return res.json({
      success: true,
      data: {
        verified: true,
        reference: validation.normalizedReference,
        provider: validation.providerName,
        status: 'READY_FOR_POSTING',
        amount: parseFloat(amount || 0),
        merchantTill: validation.merchantTill || null,
        accountNumber: validation.accountNumber || null,
        message: `Reference format valid and unique. Ready to post payment.`
      }
    });
  } catch (error) {
    console.error('Error verifying reference:', error);
    res.status(500).json({ success: false, message: 'Server error verifying reference' });
  }
});

// ── Payment Processing ─────────────────────────────────────────────────────

// POST process payment with atomic receipt numbering & shift association
router.post('/payments/process', authenticate, authorize('cashier', 'admin', 'super_admin', 'receptionist'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      invoice_id,
      amount,
      payment_method,
      transaction_id,
      notes,
      shift_id,
      register_id = 'REG-01',
      manual_verified = false,
      verification_evidence = ''
    } = req.body;

    const allowedMethods = ['cash', 'card', 'telebirr', 'cbe_birr', 'bank_transfer', 'insurance', 'online', 'check'];
    const numericAmount = Number(amount);

    if (!invoice_id || !Number.isFinite(numericAmount) || numericAmount <= 0 || !allowedMethods.includes(payment_method)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Invalid payment parameters. Positive amount and valid method required.' });
    }

    const provider = normalizeProvider(payment_method);
    const isDigital = ['telebirr', 'cbe_birr', 'bank_transfer'].includes(provider);

    // 1. Digital validation & duplicate reference prevention
    let normalizedRef = null;
    if (isDigital) {
      const valRes = validateProviderReference(provider, transaction_id);
      if (!valRes.valid) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: valRes.message });
      }
      normalizedRef = valRes.normalizedReference;

      // Uniqueness check inside transaction
      const dupCheck = await checkDuplicateReference(client, provider, normalizedRef);
      if (dupCheck.isDuplicate) {
        await logFinancialAudit(client, {
          entityType: 'PAYMENT',
          entityId: dupCheck.existingPayment.id,
          action: 'DUPLICATE_REFERENCE_ATTEMPT',
          actorId: req.user.id,
          reason: 'Attempted duplicate payment posting',
          metadata: { invoice_id, provider, reference: normalizedRef, amount: numericAmount }
        });
        await client.query('ROLLBACK');
        return res.status(409).json({ success: false, message: dupCheck.message });
      }
    }

    // 2. Resolve Active Cashier Shift
    let assignedShiftId = shift_id;
    if (!assignedShiftId) {
      const activeShift = await getActiveShift(req.user.id, register_id);
      if (activeShift) {
        assignedShiftId = activeShift.id;
      }
    }

    // 3. Invoice lock and balance validation
    const invoiceRes = await client.query(
      `SELECT i.total_amount,
              COALESCE(SUM(CASE WHEN p.verification_status != 'REJECTED' THEN p.amount ELSE 0 END), 0) AS amount_paid,
              i.status
       FROM invoices i 
       LEFT JOIN payments p ON p.invoice_id = i.id
       WHERE i.id = $1 
       GROUP BY i.id
       FOR UPDATE`,
      [invoice_id]
    );

    if (!invoiceRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const invoice = invoiceRes.rows[0];
    const balance = Number(invoice.total_amount) - Number(invoice.amount_paid);

    if (String(invoice.status).toLowerCase() === 'paid') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Invoice is already settled in full.' });
    }

    if (numericAmount > balance + 0.01) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: `Payment (${numericAmount.toFixed(2)} ETB) exceeds remaining balance of ${balance.toFixed(2)} ETB.` });
    }

    // 4. Generate Atomic Unique Receipt Number: RCP-YYYY-NNNNNN
    const seqRes = await client.query(
      `SELECT ('RCP-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('receipt_number_seq')::text, 6, '0')) AS receipt_number`
    );
    const receiptNumber = seqRes.rows[0].receipt_number;

    // 5. Verification status
    let verificationStatus = 'VERIFIED';
    let verifiedBy = null;
    let verifiedAt = null;
    let verificationMethod = 'DIRECT_CASH';
    let verificationEvidence = null;

    if (isDigital) {
      if (manual_verified && ['admin', 'super_admin', 'finance_officer'].includes(req.user.role)) {
        verificationStatus = 'VERIFIED';
        verifiedBy = req.user.id;
        verifiedAt = new Date();
        verificationMethod = 'MANUAL_MERCHANT_APP';
        verificationEvidence = verification_evidence || 'Supervisor instant verification';
      } else {
        // Digital payments require merchant app / statement reconciliation
        verificationStatus = 'PENDING';
        verificationMethod = 'PENDING_RECONCILIATION';
      }
    }

    // 6. Insert payment record
    const insertRes = await client.query(
      `INSERT INTO payments (
         invoice_id, amount, payment_method, payment_provider,
         transaction_id, provider_reference, receipt_number,
         verification_status, verified_by, verified_at, verification_method,
         verification_evidence_ref, shift_id, register_id, received_by, notes, currency
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'ETB')
       RETURNING *`,
      [
        invoice_id, numericAmount, payment_method, provider,
        normalizedRef, normalizedRef, receiptNumber,
        verificationStatus, verifiedBy, verifiedAt, verificationMethod,
        verificationEvidence, assignedShiftId || null, register_id, req.user.id, notes || null
      ]
    );

    const payment = insertRes.rows[0];

    // 7. Recalculate invoice status based on verified collections
    const totalPaidRes = await client.query(
      `SELECT COALESCE(SUM(amount), 0) AS total_paid 
       FROM payments 
       WHERE invoice_id = $1 AND verification_status != 'REJECTED'`,
      [invoice_id]
    );
    const totalPaid = parseFloat(totalPaidRes.rows[0].total_paid);
    const invoiceTotal = parseFloat(invoice.total_amount);

    let newStatus = totalPaid >= invoiceTotal ? 'paid' : 'partial';

    await client.query('UPDATE invoices SET status = $1, updated_at = NOW() WHERE id = $2', [newStatus, invoice_id]);

    // 8. Record financial audit event
    await logFinancialAudit(client, {
      entityType: 'PAYMENT',
      entityId: payment.id,
      action: 'PAYMENT_RECORDED',
      actorId: req.user.id,
      metadata: {
        invoice_id,
        receipt_number: receiptNumber,
        amount: numericAmount,
        payment_method,
        provider_reference: normalizedRef,
        shift_id: assignedShiftId,
        verification_status: verificationStatus
      }
    });

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      data: {
        payment,
        receipt_number: receiptNumber,
        new_invoice_status: newStatus,
        verification_status: verificationStatus
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error processing payment:', error);
    if (error.code === '23505') {
      return res.status(409).json({ success: false, message: 'Duplicate payment reference or receipt number detected.' });
    }
    res.status(500).json({ success: false, message: error.message || 'Server error processing payment' });
  } finally {
    client.release();
  }
});

// ── Payment Verification & Dispute ─────────────────────────────────────────

// POST verify digital payment (Mode B / Authorized manual reconciliation)
router.post('/payments/:id/verify', authenticate, authorize('cashier', 'admin', 'super_admin', 'finance_officer'), async (req, res) => {
  try {
    const paymentId = parseInt(req.params.id, 10);
    const { verification_method = 'MANUAL_MERCHANT_APP', evidence_ref = 'Verified in merchant portal', reason } = req.body;

    const result = await verifyDigitalPayment({
      paymentId,
      verifierUser: req.user,
      verificationMethod: verification_method,
      evidenceRef: evidence_ref,
      action: 'VERIFY',
      reason
    });

    res.json({ success: true, message: 'Payment successfully verified', data: result });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST reject unconfirmed digital payment
router.post('/payments/:id/reject', authenticate, authorize('admin', 'super_admin', 'finance_officer'), async (req, res) => {
  try {
    const paymentId = parseInt(req.params.id, 10);
    const { reason = 'Unconfirmed transaction on merchant statement', evidence_ref = 'Statement mismatch' } = req.body;

    const result = await verifyDigitalPayment({
      paymentId,
      verifierUser: req.user,
      verificationMethod: 'MANUAL_AUDIT',
      evidenceRef: evidence_ref,
      action: 'REJECT',
      reason
    });

    res.json({ success: true, message: 'Payment rejected and removed from confirmed funds', data: result });
  } catch (error) {
    console.error('Error rejecting payment:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// ── Payment History ────────────────────────────────────────────────────────

// GET payment history with verification status & shift ID
router.get('/payments/history', authenticate, authorize('cashier', 'admin', 'super_admin', 'finance_officer'), async (req, res) => {
  try {
    const { limit = 50, offset = 0, shift_id, verification_status } = req.query;
    let query = `
      SELECT py.*, 
        COALESCE(py.receipt_number, ('RCP-' || LPAD(py.id::text, 6, '0'))) AS receipt_number,
        ('INV-' || LPAD(i.id::text, 5, '0')) AS invoice_number,
        p.first_name || ' ' || p.last_name AS patient_name,
        ('PAT-' || p.id::text) AS patient_id,
        u.email AS cashier_email,
        INITCAP(REPLACE(split_part(u.email, '@', 1), '.', ' ')) AS cashier_name,
        py.payment_date AS payment_date
      FROM payments py
      JOIN invoices i ON py.invoice_id = i.id
      JOIN patients p ON i.patient_id = p.id
      LEFT JOIN users u ON py.received_by = u.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (shift_id) {
      query += ` AND py.shift_id = $${idx++}`;
      params.push(shift_id);
    }

    if (verification_status) {
      query += ` AND py.verification_status = $${idx++}`;
      params.push(verification_status);
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

// ── Receipt Lookup & Thermal Printing ──────────────────────────────────────

// GET receipt details with hospital configuration & itemized billing
router.get('/receipt/:receiptIdentifier', authenticate, authorize('cashier', 'admin', 'super_admin', 'finance_officer', 'receptionist'), async (req, res) => {
  try {
    const { receiptIdentifier } = req.params;
    const isNumeric = /^\d+$/.test(receiptIdentifier);

    let query = `
      SELECT py.*, 
        COALESCE(py.receipt_number, ('RCP-' || LPAD(py.id::text, 6, '0'))) AS receipt_number,
        ('INV-' || LPAD(i.id::text, 5, '0')) AS invoice_number,
        i.total_amount AS invoice_total,
        i.subtotal AS invoice_subtotal,
        i.discount AS invoice_discount,
        i.tax AS invoice_tax,
        p.first_name || ' ' || p.last_name AS patient_name,
        ('PAT-' || p.id::text) AS patient_id,
        p.phone AS patient_phone,
        u.email AS cashier_email,
        INITCAP(REPLACE(split_part(u.email, '@', 1), '.', ' ')) AS cashier_name
      FROM payments py
      JOIN invoices i ON py.invoice_id = i.id
      JOIN patients p ON i.patient_id = p.id
      LEFT JOIN users u ON py.received_by = u.id
      WHERE ${isNumeric ? 'py.id = $1' : 'py.receipt_number = $1'}
    `;

    const result = await pool.query(query, [receiptIdentifier]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Receipt not found' });
    }

    const receipt = result.rows[0];

    // Fetch hospital configuration
    const configRes = await pool.query('SELECT * FROM hospital_financial_config WHERE id = 1');
    const hospitalConfig = configRes.rows[0];

    // Fetch itemized services for the invoice
    const itemsRes = await pool.query(
      `SELECT id, 
              COALESCE(description, 'Medical Consultation & Service') AS service,
              COALESCE(quantity, 1) AS quantity,
              COALESCE(unit_price, 0) AS unit_price,
              COALESCE(subtotal, 0) AS total
       FROM invoice_items 
       WHERE invoice_id = $1 
       ORDER BY id ASC`,
      [receipt.invoice_id]
    );

    // If no line items exist in invoice_items, provide fallback structured line
    const items = itemsRes.rows.length > 0 ? itemsRes.rows : [
      {
        id: 1,
        service: 'General Hospital Clinical Services',
        quantity: 1,
        unit_price: parseFloat(receipt.amount),
        total: parseFloat(receipt.amount)
      }
    ];

    res.json({
      success: true,
      data: {
        receipt,
        hospital: hospitalConfig,
        items
      }
    });
  } catch (error) {
    console.error('Error fetching receipt:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST reprint receipt with audit trail & authorization
router.post('/receipts/:id/reprint', authenticate, authorize('cashier', 'admin', 'super_admin', 'finance_officer'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const paymentId = parseInt(req.params.id, 10);
    const { reason = 'Patient requested additional copy' } = req.body;

    const payRes = await client.query('SELECT * FROM payments WHERE id = $1 FOR UPDATE', [paymentId]);
    if (payRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Receipt not found' });
    }

    const currentCount = parseInt(payRes.rows[0].reprint_count || 0, 10) + 1;

    const updateRes = await client.query(
      `UPDATE payments
       SET reprint_count = $1,
           last_reprinted_at = NOW(),
           last_reprinted_by = $2
       WHERE id = $3
       RETURNING *`,
      [currentCount, req.user.id, paymentId]
    );

    await logFinancialAudit(client, {
      entityType: 'RECEIPT',
      entityId: paymentId,
      action: 'RECEIPT_REPRINTED',
      actorId: req.user.id,
      reason,
      metadata: {
        receipt_number: updateRes.rows[0].receipt_number,
        reprint_count: currentCount
      }
    });

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Reprint authorized (Copy #${currentCount})`,
      data: {
        payment: updateRes.rows[0],
        reprint_count: currentCount,
        is_reprint: true
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error reprinting receipt:', error);
    res.status(500).json({ success: false, message: 'Server error during reprint' });
  } finally {
    client.release();
  }
});

// ── Cashier Shift Management ───────────────────────────────────────────────

// GET current active shift for cashier
router.get('/shifts/current', authenticate, authorize('cashier', 'admin', 'super_admin', 'finance_officer'), async (req, res) => {
  try {
    const { register_id = 'REG-01' } = req.query;
    const shift = await getActiveShift(req.user.id, register_id);

    if (!shift) {
      return res.json({ success: true, data: null, message: 'No active shift' });
    }

    const summary = await calculateShiftSummary(shift.id);
    res.json({ success: true, data: { shift, summary } });
  } catch (error) {
    console.error('Error fetching current shift:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST open new shift
router.post('/shifts/open', authenticate, authorize('cashier', 'admin', 'super_admin'), async (req, res) => {
  try {
    const { register_id = 'REG-01', opening_cash = 0, notes = '' } = req.body;
    const shift = await openShift({
      cashierId: req.user.id,
      registerId: register_id,
      openingCash: parseFloat(opening_cash || 0),
      notes
    });

    res.status(201).json({ success: true, data: shift, message: 'Shift successfully opened' });
  } catch (error) {
    console.error('Error opening shift:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET shift summary
router.get('/shifts/:id/summary', authenticate, authorize('cashier', 'admin', 'super_admin', 'finance_officer'), async (req, res) => {
  try {
    const shiftId = parseInt(req.params.id, 10);
    const summary = await calculateShiftSummary(shiftId);
    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('Error calculating shift summary:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST close shift & calculate variance
router.post('/shifts/:id/close', authenticate, authorize('cashier', 'admin', 'super_admin'), async (req, res) => {
  try {
    const shiftId = parseInt(req.params.id, 10);
    const { closing_cash_counted, closing_notes = '', variance_reason = '' } = req.body;

    const result = await closeShift({
      shiftId,
      cashierId: req.user.id,
      closingCashCounted: parseFloat(closing_cash_counted || 0),
      closingNotes: closing_notes,
      varianceReason: variance_reason
    });

    res.json({ success: true, message: 'Shift closed successfully', data: result });
  } catch (error) {
    console.error('Error closing shift:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET official Z-Report
router.get('/shifts/:id/z-report', authenticate, authorize('cashier', 'admin', 'super_admin', 'finance_officer'), async (req, res) => {
  try {
    const shiftId = parseInt(req.params.id, 10);
    const zReport = await generateZReport(shiftId);
    res.json({ success: true, data: zReport });
  } catch (error) {
    console.error('Error generating Z-Report:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST submit shift handover to finance
router.post('/shifts/:id/handover', authenticate, authorize('cashier', 'admin', 'super_admin'), async (req, res) => {
  try {
    const shiftId = parseInt(req.params.id, 10);
    const { handed_over_to, notes = '' } = req.body;

    const handover = await submitHandover({
      shiftId,
      cashierId: req.user.id,
      handedOverTo: handed_over_to ? parseInt(handed_over_to, 10) : null,
      notes
    });

    res.json({ success: true, message: 'Shift handover submitted to finance', data: handover });
  } catch (error) {
    console.error('Error submitting handover:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// ── Finance Reconciliation & Review ────────────────────────────────────────

// GET all closed/handed-over shifts for finance review
router.get('/finance/shifts', authenticate, authorize('admin', 'super_admin', 'finance_officer'), async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    let query = `
      SELECT cs.*,
             INITCAP(REPLACE(split_part(u.email, '@', 1), '.', ' ')) AS cashier_name,
             u.email AS cashier_email,
             COALESCE(h.finance_status, 'PENDING_REVIEW') AS finance_status,
             h.id AS handover_id,
             h.handed_over_at,
             h.review_notes AS finance_notes
      FROM cashier_shifts cs
      JOIN users u ON cs.cashier_id = u.id
      LEFT JOIN shift_handovers h ON h.shift_id = cs.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (status) {
      query += ` AND cs.status = $${idx++}`;
      params.push(status);
    }

    query += ` ORDER BY cs.opened_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    res.json({ success: true, data: { shifts: result.rows } });
  } catch (error) {
    console.error('Error fetching finance shifts:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST finance review & handover sign-off (Accept or Dispute)
router.post('/finance/handovers/:id/review', authenticate, authorize('admin', 'super_admin', 'finance_officer'), async (req, res) => {
  try {
    const handoverId = parseInt(req.params.id, 10);
    const { status, review_notes = '' } = req.body;

    if (!['ACCEPTED', 'DISPUTED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be ACCEPTED or DISPUTED' });
    }

    const result = await reviewHandover({
      handoverId,
      financeUserId: req.user.id,
      status,
      reviewNotes: review_notes
    });

    res.json({ success: true, message: `Handover ${status.toLowerCase()} successfully`, data: result });
  } catch (error) {
    console.error('Error reviewing handover:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET financial audit trail
router.get('/finance/audit-trail', authenticate, authorize('admin', 'super_admin', 'finance_officer'), async (req, res) => {
  try {
    const { limit = 50, offset = 0, entity_type, action } = req.query;
    let query = `
      SELECT fa.*,
             COALESCE(INITCAP(REPLACE(split_part(u.email, '@', 1), '.', ' ')), 'System') AS actor_name,
             u.role AS actor_role
      FROM financial_audit_events fa
      LEFT JOIN users u ON fa.actor_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (entity_type) {
      query += ` AND fa.entity_type = $${idx++}`;
      params.push(entity_type);
    }
    if (action) {
      query += ` AND fa.action = $${idx++}`;
      params.push(action);
    }

    query += ` ORDER BY fa.timestamp DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    res.json({ success: true, data: { events: result.rows } });
  } catch (error) {
    console.error('Error fetching financial audit trail:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PATCH verify / reject a single digital payment (cashier / admin only)
router.patch('/payments/:id/verify', authenticate, authorize('cashier', 'admin', 'super_admin', 'finance_officer'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const paymentId = parseInt(req.params.id, 10);
    const { status, method = 'MANUAL_MERCHANT_APP', reason = '' } = req.body;

    if (!['VERIFIED', 'REJECTED'].includes(status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Status must be VERIFIED or REJECTED' });
    }

    const payRes = await client.query('SELECT * FROM payments WHERE id = $1 FOR UPDATE', [paymentId]);
    if (!payRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    const updateRes = await client.query(
      `UPDATE payments
       SET verification_status = $1,
           verified_by = $2,
           verified_at = NOW(),
           verification_method = $3
       WHERE id = $4
       RETURNING *`,
      [status, req.user.id, method, paymentId]
    );

    await logFinancialAudit(client, {
      entityType: 'PAYMENT',
      entityId: paymentId,
      action: status === 'VERIFIED' ? 'PAYMENT_VERIFIED' : 'PAYMENT_REJECTED',
      actorId: req.user.id,
      reason: reason || `Cashier ${status.toLowerCase()} digital payment`,
      metadata: { receipt_number: updateRes.rows[0].receipt_number, method, status }
    });

    await client.query('COMMIT');
    res.json({ success: true, data: updateRes.rows[0], message: `Payment ${status.toLowerCase()} successfully` });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error verifying payment:', error);
    res.status(500).json({ success: false, message: 'Server error during verification' });
  } finally {
    client.release();
  }
});

module.exports = router;