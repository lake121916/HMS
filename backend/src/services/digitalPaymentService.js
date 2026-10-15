// ============================================================================
// Alem Ketema Enat Hospital Management System (HMS)
// Service: Digital Payment Verification & Reference Uniqueness (Telebirr / CBE Birr)
// ============================================================================

const pool = require('../config/database');

/**
 * Normalizes payment provider code
 */
function normalizeProvider(method) {
  if (!method) return 'cash';
  const m = String(method).toLowerCase().trim();
  if (m === 'telebirr') return 'telebirr';
  if (m === 'cbe_birr' || m === 'cbe' || m === 'bank_transfer') return 'cbe_birr';
  if (m === 'card') return 'card';
  if (m === 'insurance') return 'insurance';
  return m;
}

/**
 * Validates provider reference format according to Ethiopian payment provider rules
 */
function validateProviderReference(provider, rawReference) {
  if (!rawReference || typeof rawReference !== 'string') {
    return { valid: false, message: 'Transaction reference is required for digital payments' };
  }

  const cleaned = rawReference.trim().toUpperCase();

  // Basic sanitization: alphanumeric and hyphens/slashes only
  if (!/^[A-Z0-9\-_/]+$/.test(cleaned)) {
    return {
      valid: false,
      message: 'Transaction reference contains invalid characters. Use only letters, numbers, and hyphens.'
    };
  }

  if (cleaned.length < 6 || cleaned.length > 35) {
    return {
      valid: false,
      message: `Transaction reference length (${cleaned.length}) is invalid. Expected between 6 and 35 characters.`
    };
  }

  if (provider === 'telebirr') {
    // Ethio Telecom Telebirr format validation:
    // Accept standard formats: TLB..., TB..., EB..., or alphanumeric transaction strings
    return {
      valid: true,
      normalizedReference: cleaned,
      providerName: 'Telebirr (Ethio Telecom)',
      merchantTill: '654321'
    };
  }

  if (provider === 'cbe_birr' || provider === 'cbe') {
    // Commercial Bank of Ethiopia (CBE Birr / Mobile Banking):
    // Accepts FT..., CBE..., TXN..., or numeric/alphanumeric reference codes
    return {
      valid: true,
      normalizedReference: cleaned,
      providerName: 'Commercial Bank of Ethiopia (CBE Birr)',
      accountNumber: '1000189922341'
    };
  }

  return {
    valid: true,
    normalizedReference: cleaned,
    providerName: provider.toUpperCase()
  };
}

/**
 * Checks database for duplicate provider reference
 */
async function checkDuplicateReference(clientOrPool, provider, reference, excludePaymentId = null) {
  const query = `
    SELECT p.id, p.receipt_number, p.payment_date, p.amount, p.verification_status,
           u.email AS cashier_email
    FROM payments p
    LEFT JOIN users u ON p.received_by = u.id
    WHERE p.payment_provider = $1
      AND UPPER(p.provider_reference) = UPPER($2)
      AND p.verification_status != 'REJECTED'
      ${excludePaymentId ? 'AND p.id != $3' : ''}
    LIMIT 1
  `;
  const params = excludePaymentId ? [provider, reference, excludePaymentId] : [provider, reference];
  const res = await clientOrPool.query(query, params);

  if (res.rows.length > 0) {
    const existing = res.rows[0];
    const dateStr = existing.payment_date ? new Date(existing.payment_date).toLocaleDateString() : 'earlier';
    return {
      isDuplicate: true,
      existingPayment: existing,
      message: `Duplicate payment reference detected: This reference (${reference}) was already recorded for receipt ${existing.receipt_number || ('ID #' + existing.id)} on ${dateStr} for ${existing.amount} ETB. Re-using digital references is strictly prohibited.`
    };
  }

  return { isDuplicate: false };
}

/**
 * Log financial audit event
 */
async function logFinancialAudit(clientOrPool, { entityType, entityId, action, actorId, reason = null, metadata = {} }) {
  try {
    await clientOrPool.query(
      `INSERT INTO financial_audit_events (entity_type, entity_id, action, actor_id, reason, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [entityType, entityId, action, actorId || null, reason, JSON.stringify(metadata)]
    );
  } catch (err) {
    console.error('Error recording financial audit event:', err);
  }
}

/**
 * Verify digital payment (Mode A / Mode B)
 */
async function verifyDigitalPayment({ paymentId, verifierUser, verificationMethod, evidenceRef, action = 'VERIFY', reason = null }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const paymentRes = await client.query(
      `SELECT * FROM payments WHERE id = $1 FOR UPDATE`,
      [paymentId]
    );

    if (paymentRes.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new Error('Payment not found');
    }

    const payment = paymentRes.rows[0];

    // Role separation check: Cashier who created the payment cannot independently approve it
    // unless verifier has admin/finance_officer/super_admin privileges
    const isPrivileged = ['admin', 'super_admin', 'finance_officer'].includes(verifierUser.role);
    if (payment.received_by === verifierUser.id && !isPrivileged) {
      await client.query('ROLLBACK');
      throw new Error('Role separation violation: The cashier who received this payment cannot independently approve their own digital transaction. A supervisor or finance officer must verify.');
    }

    if (action === 'REJECT') {
      await client.query(
        `UPDATE payments
         SET verification_status = 'REJECTED',
             verified_by = $1,
             verified_at = NOW(),
             verification_method = $2,
             verification_evidence_ref = $3,
             notes = COALESCE(notes, '') || ' [REJECTED: ' || $4 || ']'
         WHERE id = $5`,
        [verifierUser.id, verificationMethod || 'MANUAL_AUDIT', evidenceRef || 'Discrepancy noted', reason || 'Rejected by finance', paymentId]
      );

      // Recalculate invoice status since rejected payment reduces paid amount
      const totalPaidRes = await client.query(
        `SELECT COALESCE(SUM(amount), 0) AS total_paid FROM payments 
         WHERE invoice_id = $1 AND verification_status != 'REJECTED'`,
        [payment.invoice_id]
      );
      const totalPaid = parseFloat(totalPaidRes.rows[0].total_paid);
      const invRes = await client.query(`SELECT total_amount FROM invoices WHERE id = $1`, [payment.invoice_id]);
      const invTotal = parseFloat(invRes.rows[0].total_amount);
      const newStatus = totalPaid >= invTotal ? 'paid' : (totalPaid > 0 ? 'partial' : 'unpaid');

      await client.query(`UPDATE invoices SET status = $1, updated_at = NOW() WHERE id = $2`, [newStatus, payment.invoice_id]);

      await logFinancialAudit(client, {
        entityType: 'PAYMENT',
        entityId: paymentId,
        action: 'PAYMENT_REJECTED',
        actorId: verifierUser.id,
        reason: reason || 'Digital payment unconfirmed / invalid transaction',
        metadata: { invoice_id: payment.invoice_id, amount: payment.amount, provider_reference: payment.provider_reference }
      });

      await client.query('COMMIT');
      return { success: true, status: 'REJECTED', newInvoiceStatus: newStatus };
    }

    // VERIFY
    await client.query(
      `UPDATE payments
       SET verification_status = 'VERIFIED',
           verified_by = $1,
           verified_at = NOW(),
           verification_method = $2,
           verification_evidence_ref = $3
       WHERE id = $4`,
      [verifierUser.id, verificationMethod || 'MANUAL_MERCHANT_APP', evidenceRef || 'Verified against hospital merchant statement', paymentId]
    );

    // Recalculate invoice status
    const totalPaidRes = await client.query(
      `SELECT COALESCE(SUM(amount), 0) AS total_paid FROM payments 
       WHERE invoice_id = $1 AND verification_status != 'REJECTED'`,
      [payment.invoice_id]
    );
    const totalPaid = parseFloat(totalPaidRes.rows[0].total_paid);
    const invRes = await client.query(`SELECT total_amount FROM invoices WHERE id = $1`, [payment.invoice_id]);
    const invTotal = parseFloat(invRes.rows[0].total_amount);
    const newStatus = totalPaid >= invTotal ? 'paid' : (totalPaid > 0 ? 'partial' : 'unpaid');

    await client.query(`UPDATE invoices SET status = $1, updated_at = NOW() WHERE id = $2`, [newStatus, payment.invoice_id]);

    await logFinancialAudit(client, {
      entityType: 'PAYMENT',
      entityId: paymentId,
      action: 'PAYMENT_VERIFIED',
      actorId: verifierUser.id,
      reason: reason || 'Confirmed against merchant portal/statement',
      metadata: { invoice_id: payment.invoice_id, amount: payment.amount, verification_method: verificationMethod, evidenceRef }
    });

    await client.query('COMMIT');
    return { success: true, status: 'VERIFIED', newInvoiceStatus: newStatus };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  normalizeProvider,
  validateProviderReference,
  checkDuplicateReference,
  logFinancialAudit,
  verifyDigitalPayment
};
