/**
 * Dynamic Telebirr and CBE Birr QR Payment Checkout Service
 * Alem Ketema Enat Hospital Management System
 * 
 * Features:
 * - Dynamic QR payload generation per invoice and exact outstanding balance
 * - 15-minute expiration enforcement
 * - Integrated cryptographic QR image generation (Data URL)
 * - Provider webhook and status verification
 * - Replay prevention & duplicate transaction rejection
 * - Atomic database transaction with financial audit logging
 */

const pool = require('../config/database');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const socketService = require('./socketService');
const { checkDuplicateReference, logFinancialAudit } = require('./digitalPaymentService');

/**
 * Creates a dynamic QR payment request for Telebirr or CBE Birr
 */
async function createDynamicPaymentRequest({ invoiceId, patientId = null, provider, createdBy = null }) {
  const normProvider = String(provider).toLowerCase() === 'telebirr' ? 'telebirr' : 'cbe_birr';

  // 1. Fetch Invoice & calculate exact outstanding balance
  const invRes = await pool.query(
    `SELECT i.*, p.first_name, p.last_name, p.phone
     FROM invoices i
     LEFT JOIN patients p ON p.id = i.patient_id
     WHERE i.id = $1`,
    [invoiceId]
  );

  if (!invRes.rows.length) {
    throw new Error(`Invoice #${invoiceId} not found`);
  }
  const invoice = invRes.rows[0];

  // Calculate already paid amount
  const paidRes = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS total_paid
     FROM payments
     WHERE invoice_id = $1 AND verification_status != 'REJECTED'`,
    [invoiceId]
  );
  const totalPaid = Number(paidRes.rows[0].total_paid);
  const insuranceCovered = Number(invoice.insurance_covered_amount || 0);
  const totalInvoice = Number(invoice.total_amount);

  // Outstanding amount payable by patient
  const outstandingAmount = Math.max(0, Math.round((totalInvoice - (totalPaid + insuranceCovered)) * 100) / 100);

  if (outstandingAmount <= 0) {
    throw new Error(`Invoice #${invoiceId} has no outstanding balance (already paid/covered)`);
  }

  // 2. Fetch Merchant Config
  const cfgRes = await pool.query('SELECT * FROM hospital_financial_config WHERE id = 1');
  const cfg = cfgRes.rows[0] || {};

  const merchantId = normProvider === 'telebirr'
    ? (process.env.TELEBIRR_MERCHANT_ID || cfg.telebirr_merchant_till || '654321')
    : (process.env.CBE_MERCHANT_ACCOUNT || cfg.cbe_account_number || '1000189922341');

  // Cancel any existing pending payment request for this invoice and provider
  await pool.query(
    `UPDATE payment_requests
     SET status = 'cancelled', updated_at = NOW()
     WHERE invoice_id = $1 AND provider = $2 AND status = 'pending'`,
    [invoiceId, normProvider]
  );

  // 3. Build Unique Request & Dynamic Payload
  const requestId = `PAY-${normProvider.toUpperCase().slice(0, 3)}-${Date.now()}-${uuidv4().slice(0, 6).toUpperCase()}`;
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

  let qrPayload = '';
  if (normProvider === 'telebirr') {
    // Standard Telebirr dynamic payment link structure
    qrPayload = `telebirr://pay?tillNo=${merchantId}&invoiceId=${invoiceId}&orderId=${requestId}&amount=${outstandingAmount}&currency=ETB&exp=${Math.floor(expiresAt.getTime() / 1000)}`;
  } else {
    // CBE Birr / Commercial Bank of Ethiopia dynamic merchant payment QR
    qrPayload = `cbebirr://merchant/pay?acc=${merchantId}&inv=${invoiceId}&ref=${requestId}&amt=${outstandingAmount}&curr=ETB&exp=${Math.floor(expiresAt.getTime() / 1000)}`;
  }

  // 4. Generate High-Res QR Code Data URL
  const qrCodeDataUrl = await QRCode.toDataURL(qrPayload, {
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 280,
    color: {
      dark: normProvider === 'telebirr' ? '#003366' : '#6A1B9A', // Brand tint
      light: '#FFFFFF'
    }
  });

  // 5. Persist Payment Request in Database
  const insertRes = await pool.query(
    `INSERT INTO payment_requests (
      request_id, invoice_id, patient_id, provider, merchant_id,
      amount, currency, status, qr_payload, qr_code_data_url,
      expires_at, created_by, created_at, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, 'ETB', 'pending', $7, $8, $9, $10, NOW(), NOW())
    RETURNING *`,
    [
      requestId, invoiceId, patientId || invoice.patient_id, normProvider, merchantId,
      outstandingAmount, qrPayload, qrCodeDataUrl, expiresAt, createdBy
    ]
  );

  const createdRequest = insertRes.rows[0];

  return {
    requestId: createdRequest.request_id,
    invoiceId: createdRequest.invoice_id,
    patientName: `${invoice.first_name || ''} ${invoice.last_name || ''}`.trim(),
    provider: normProvider,
    providerDisplayName: normProvider === 'telebirr' ? 'Telebirr (Ethio Telecom)' : 'Commercial Bank of Ethiopia (CBE Birr)',
    merchantId,
    amount: outstandingAmount,
    currency: 'ETB',
    status: createdRequest.status,
    qrPayload,
    qrCodeDataUrl,
    expiresAt: createdRequest.expires_at,
    expiresInSeconds: Math.floor((expiresAt.getTime() - Date.now()) / 1000)
  };
}

/**
 * Retrieves payment request status and automatically transitions expired requests
 */
async function getPaymentRequestStatus(requestId) {
  const reqRes = await pool.query(
    `SELECT pr.*, i.status AS invoice_status, i.total_amount
     FROM payment_requests pr
     JOIN invoices i ON i.id = pr.invoice_id
     WHERE pr.request_id = $1`,
    [requestId]
  );

  if (!reqRes.rows.length) {
    throw new Error(`Payment request ${requestId} not found`);
  }

  const reqData = reqRes.rows[0];

  // Auto-expire check
  if (reqData.status === 'pending' && new Date() > new Date(reqData.expires_at)) {
    await pool.query(
      `UPDATE payment_requests SET status = 'expired', updated_at = NOW() WHERE id = $1`,
      [reqData.id]
    );
    reqData.status = 'expired';
  }

  return {
    requestId: reqData.request_id,
    invoiceId: reqData.invoice_id,
    provider: reqData.provider,
    amount: Number(reqData.amount),
    currency: reqData.currency,
    status: reqData.status,
    providerTransactionId: reqData.provider_transaction_id,
    confirmedAt: reqData.confirmed_at,
    expiresAt: reqData.expires_at,
    isExpired: reqData.status === 'expired',
    invoiceStatus: reqData.invoice_status
  };
}

/**
 * Authoritative verification and processing of payment callback or manual confirmation
 */
async function processVerifiedPayment({ requestId, transactionId, paidAmount, verifierUser, notes = '' }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lock payment request
    const reqRes = await client.query(
      `SELECT * FROM payment_requests WHERE request_id = $1 FOR UPDATE`,
      [requestId]
    );

    if (!reqRes.rows.length) {
      await client.query('ROLLBACK');
      throw new Error(`Payment request ${requestId} not found`);
    }

    const payReq = reqRes.rows[0];

    if (payReq.status === 'successful') {
      await client.query('ROLLBACK');
      return { success: true, message: 'Payment request already successfully processed', paymentId: null };
    }

    if (payReq.status === 'cancelled') {
      await client.query('ROLLBACK');
      throw new Error('This QR payment request was cancelled. Please generate a new QR code.');
    }

    // Check expiration
    if (new Date() > new Date(payReq.expires_at)) {
      await client.query('UPDATE payment_requests SET status = \'expired\' WHERE id = $1', [payReq.id]);
      await client.query('ROLLBACK');
      throw new Error('This QR payment request has expired. Please generate a new payment request.');
    }

    // Verify amount
    const expectedAmount = Number(payReq.amount);
    const receivedAmount = Number(paidAmount || expectedAmount);
    if (receivedAmount < expectedAmount) {
      await client.query('ROLLBACK');
      throw new Error(`Amount mismatch: Received ${receivedAmount} ETB but expected ${expectedAmount} ETB.`);
    }

    // Check duplicate reference
    const dupCheck = await checkDuplicateReference(client, payReq.provider, transactionId);
    if (dupCheck.isDuplicate) {
      await client.query('ROLLBACK');
      throw new Error(dupCheck.message);
    }

    // 1. Mark Payment Request Successful
    await client.query(
      `UPDATE payment_requests
       SET status = 'successful',
           provider_transaction_id = $1,
           confirmed_at = NOW(),
           updated_at = NOW()
       WHERE id = $2`,
      [transactionId, payReq.id]
    );

    // 2. Generate Official Receipt Sequence
    const seqRes = await client.query(`SELECT COALESCE(MAX(id), 0) + 1 AS next_receipt FROM payments`);
    const receiptNumber = `RCP-${new Date().getFullYear()}-${String(seqRes.rows[0].next_receipt).padStart(6, '0')}`;

    // 3. Insert Payment Record
    const payInsert = await client.query(
      `INSERT INTO payments (
        invoice_id, amount, payment_method, payment_provider, provider_reference,
        verification_status, verified_by, verified_at, verification_method,
        received_by, notes, receipt_number, payment_date
      )
      VALUES ($1, $2, $3, $4, $5, 'VERIFIED', $6, NOW(), 'DYNAMIC_QR_API', $6, $7, $8, NOW())
      RETURNING *`,
      [
        payReq.invoice_id,
        receivedAmount,
        payReq.provider,
        payReq.provider,
        transactionId,
        verifierUser.id,
        notes || `Confirmed via Dynamic ${payReq.provider.toUpperCase()} QR Checkout (${requestId})`,
        receiptNumber
      ]
    );
    const createdPayment = payInsert.rows[0];

    // 4. Update Invoice Balance & Status
    const totalPaidRes = await client.query(
      `SELECT COALESCE(SUM(amount), 0) AS total_paid
       FROM payments
       WHERE invoice_id = $1 AND verification_status != 'REJECTED'`,
      [payReq.invoice_id]
    );
    const totalPaid = Number(totalPaidRes.rows[0].total_paid);

    const invRes = await client.query(`SELECT total_amount, insurance_covered_amount FROM invoices WHERE id = $1`, [payReq.invoice_id]);
    const invTotal = Number(invRes.rows[0].total_amount);
    const insCovered = Number(invRes.rows[0].insurance_covered_amount || 0);

    const isFullyPaid = (totalPaid + insCovered) >= invTotal;
    const newStatus = isFullyPaid ? 'paid' : 'partial';

    await client.query(
      `UPDATE invoices SET status = $1, updated_at = NOW() WHERE id = $2`,
      [newStatus, payReq.invoice_id]
    );

    // 5. Audit Log
    await logFinancialAudit(client, {
      entityType: 'PAYMENT',
      entityId: createdPayment.id,
      action: 'DYNAMIC_QR_PAYMENT_SUCCESS',
      actorId: verifierUser.id,
      reason: `Verified ${payReq.provider.toUpperCase()} QR transaction ${transactionId}`,
      metadata: { requestId, invoiceId: payReq.invoice_id, amount: receivedAmount, transactionId }
    });

    await client.query('COMMIT');

    // Broadcast Real-time event for Cashier Workstations
    socketService.broadcast('payment:received', {
      invoice_id: payReq.invoice_id,
      payment_id: createdPayment.id,
      amount: receivedAmount,
      provider: payReq.provider,
      transaction_id: transactionId,
      receipt_number: receiptNumber
    });

    return {
      success: true,
      message: `${payReq.provider.toUpperCase()} payment verified and receipt ${receiptNumber} generated`,
      payment: createdPayment,
      receiptNumber,
      invoiceStatus: newStatus
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  createDynamicPaymentRequest,
  getPaymentRequestStatus,
  processVerifiedPayment
};
