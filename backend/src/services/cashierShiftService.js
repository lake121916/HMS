// ============================================================================
// Alem Ketema Enat Hospital Management System (HMS)
// Service: Cashier Shift Management, Z-Report Reconciliation & Handover
// ============================================================================

const pool = require('../config/database');
const { logFinancialAudit } = require('./digitalPaymentService');

/**
 * Retrieves the currently active shift for a cashier or register
 */
async function getActiveShift(cashierId, registerId = 'REG-01') {
  const res = await pool.query(
    `SELECT cs.*,
            u.email AS cashier_email,
            INITCAP(REPLACE(split_part(u.email, '@', 1), '.', ' ')) AS cashier_name
     FROM cashier_shifts cs
     JOIN users u ON cs.cashier_id = u.id
     WHERE cs.cashier_id = $1 AND cs.register_id = $2 AND cs.status IN ('OPEN', 'CLOSING')
     ORDER BY cs.opened_at DESC
     LIMIT 1`,
    [cashierId, registerId]
  );
  return res.rows.length > 0 ? res.rows[0] : null;
}

/**
 * Opens a new cashier shift with opening cash float
 */
async function openShift({ cashierId, registerId = 'REG-01', openingCash = 0, notes = '' }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Verify no active shift on this register
    const existing = await client.query(
      `SELECT id, shift_number, cashier_id, status FROM cashier_shifts
       WHERE register_id = $1 AND status IN ('OPEN', 'CLOSING')
       FOR UPDATE`,
      [registerId]
    );

    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      throw new Error(`Register ${registerId} already has an active shift (${existing.rows[0].shift_number}). It must be closed before opening a new one.`);
    }

    // 2. Generate unique shift number: SHIFT-YYYYMMDD-NNN
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const countRes = await client.query(
      `SELECT COUNT(*) FROM cashier_shifts WHERE shift_number LIKE $1`,
      [`SHIFT-${todayStr}-%`]
    );
    const seq = parseInt(countRes.rows[0].count, 10) + 1;
    const shiftNumber = `SHIFT-${todayStr}-${String(seq).padStart(3, '0')}`;

    // 3. Insert shift
    const insertRes = await client.query(
      `INSERT INTO cashier_shifts (shift_number, cashier_id, register_id, opening_cash, status, closing_notes)
       VALUES ($1, $2, $3, $4, 'OPEN', $5)
       RETURNING *`,
      [shiftNumber, cashierId, registerId, openingCash, notes || null]
    );

    const shift = insertRes.rows[0];

    // 4. Log audit event
    await logFinancialAudit(client, {
      entityType: 'SHIFT',
      entityId: shift.id,
      action: 'SHIFT_OPENED',
      actorId: cashierId,
      metadata: { register_id: registerId, opening_cash: openingCash, shift_number: shiftNumber }
    });

    await client.query('COMMIT');
    return shift;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Computes live financial summary for a shift
 */
async function calculateShiftSummary(shiftId) {
  const shiftRes = await pool.query(
    `SELECT cs.*,
            INITCAP(REPLACE(split_part(u.email, '@', 1), '.', ' ')) AS cashier_name
     FROM cashier_shifts cs
     JOIN users u ON cs.cashier_id = u.id
     WHERE cs.id = $1`,
    [shiftId]
  );

  if (shiftRes.rows.length === 0) {
    throw new Error('Shift not found');
  }

  const shift = shiftRes.rows[0];
  const openingCash = parseFloat(shift.opening_cash || 0);

  // Payments associated with this shift
  const paymentsRes = await pool.query(
    `SELECT 
       payment_method,
       payment_provider,
       verification_status,
       COUNT(*) AS tx_count,
       COALESCE(SUM(amount), 0) AS total_amount
     FROM payments
     WHERE shift_id = $1
     GROUP BY payment_method, payment_provider, verification_status`,
    [shiftId]
  );

  let cashCollections = 0;
  let telebirrCollections = 0;
  let cbeBirrCollections = 0;
  let cardCollections = 0;
  let bankCollections = 0;
  let insuranceCollections = 0;
  let otherCollections = 0;

  let totalTransactions = 0;
  let verifiedDigitalTotal = 0;
  let pendingDigitalTotal = 0;
  let pendingDigitalCount = 0;
  let rejectedDigitalTotal = 0;

  paymentsRes.rows.forEach(row => {
    const amount = parseFloat(row.total_amount);
    const count = parseInt(row.tx_count, 10);
    const method = String(row.payment_method || '').toLowerCase();
    const isVerified = row.verification_status === 'VERIFIED';
    const isPending = row.verification_status === 'PENDING';
    const isRejected = row.verification_status === 'REJECTED';

    totalTransactions += count;

    if (method === 'cash') {
      cashCollections += amount;
    } else if (method === 'telebirr') {
      if (isVerified) telebirrCollections += amount;
      if (isVerified) verifiedDigitalTotal += amount;
      if (isPending) { pendingDigitalTotal += amount; pendingDigitalCount += count; }
      if (isRejected) rejectedDigitalTotal += amount;
    } else if (method === 'cbe_birr' || method === 'bank_transfer') {
      if (isVerified) cbeBirrCollections += amount;
      if (isVerified) verifiedDigitalTotal += amount;
      if (isPending) { pendingDigitalTotal += amount; pendingDigitalCount += count; }
      if (isRejected) rejectedDigitalTotal += amount;
    } else if (method === 'card') {
      if (isVerified) cardCollections += amount;
      if (isVerified) verifiedDigitalTotal += amount;
    } else if (method === 'insurance') {
      insuranceCollections += amount;
    } else {
      otherCollections += amount;
    }
  });

  const cashRefunds = 0; // Configured for future cash out adjustments
  const expectedClosingCash = openingCash + cashCollections - cashRefunds;
  const totalConfirmedCollections = cashCollections + telebirrCollections + cbeBirrCollections + cardCollections + bankCollections + otherCollections;

  return {
    shift,
    openingCash,
    cashCollections,
    telebirrCollections,
    cbeBirrCollections,
    cardCollections,
    bankCollections,
    insuranceCollections,
    otherCollections,
    cashRefunds,
    expectedClosingCash,
    totalConfirmedCollections,
    digitalStatus: {
      verified: verifiedDigitalTotal,
      pending: pendingDigitalTotal,
      pendingCount: pendingDigitalCount,
      rejected: rejectedDigitalTotal
    },
    totalTransactions
  };
}

/**
 * Closes a cashier shift, verifies variance and threshold, generates Z-Report data
 */
async function closeShift({ shiftId, cashierId, closingCashCounted, closingNotes = '', varianceReason = '' }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const summary = await calculateShiftSummary(shiftId);
    if (summary.shift.cashier_id !== cashierId) {
      // Allow admin / super_admin to force close
      const userRes = await client.query('SELECT role FROM users WHERE id = $1', [cashierId]);
      const role = userRes.rows[0]?.role;
      if (!['admin', 'super_admin', 'finance_officer'].includes(role)) {
        throw new Error('Unauthorized to close another cashier’s shift');
      }
    }

    const countedCash = parseFloat(closingCashCounted || 0);
    const expectedCash = summary.expectedClosingCash;
    const variance = countedCash - expectedCash;

    // Retrieve threshold from config
    const configRes = await client.query('SELECT variance_threshold FROM hospital_financial_config WHERE id = 1');
    const threshold = parseFloat(configRes.rows[0]?.variance_threshold || 50);

    if (Math.abs(variance) > threshold && (!varianceReason || varianceReason.trim().length < 5)) {
      throw new Error(`Cash variance (${variance.toFixed(2)} ETB) exceeds the hospital tolerance threshold of ${threshold} ETB. A detailed explanation in the variance reason field is mandatory.`);
    }

    // Update shift record
    const updateRes = await client.query(
      `UPDATE cashier_shifts
       SET closed_at = NOW(),
           closing_cash_counted = $1,
           expected_closing_cash = $2,
           cash_variance = $3,
           status = 'CLOSED',
           closing_notes = $4,
           variance_reason = $5
       WHERE id = $6
       RETURNING *`,
      [countedCash, expectedCash, variance, closingNotes || null, varianceReason || null, shiftId]
    );

    const updatedShift = updateRes.rows[0];

    // Log financial audit event
    await logFinancialAudit(client, {
      entityType: 'SHIFT',
      entityId: shiftId,
      action: 'SHIFT_CLOSED',
      actorId: cashierId,
      reason: variance !== 0 ? `Closed with variance: ${variance.toFixed(2)} ETB` : 'Balanced closing',
      metadata: {
        opening_cash: summary.openingCash,
        cash_collections: summary.cashCollections,
        expected_cash: expectedCash,
        counted_cash: countedCash,
        variance,
        pending_digital_count: summary.digitalStatus.pendingCount,
        pending_digital_amount: summary.digitalStatus.pending
      }
    });

    await client.query('COMMIT');
    return { shift: updatedShift, summary };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Generates the official Z-Report payload
 */
async function generateZReport(shiftId) {
  const [summary, configRes, paymentsListRes] = await Promise.all([
    calculateShiftSummary(shiftId),
    pool.query('SELECT * FROM hospital_financial_config WHERE id = 1'),
    pool.query(
      `SELECT py.id, py.receipt_number, py.amount, py.payment_method, py.payment_provider,
              py.provider_reference, py.verification_status, py.payment_date, py.reprint_count,
              i.id AS invoice_id, ('INV-' || LPAD(i.id::text, 5, '0')) AS invoice_number,
              p.first_name || ' ' || p.last_name AS patient_name, ('PAT-' || p.id::text) AS patient_id
       FROM payments py
       JOIN invoices i ON py.invoice_id = i.id
       JOIN patients p ON i.patient_id = p.id
       WHERE py.shift_id = $1
       ORDER BY py.payment_date ASC`,
      [shiftId]
    )
  ]);

  const config = configRes.rows[0];
  const counted = summary.shift.closing_cash_counted !== null ? parseFloat(summary.shift.closing_cash_counted) : null;
  const variance = summary.shift.cash_variance !== null ? parseFloat(summary.shift.cash_variance) : null;

  return {
    hospital: {
      name_en: config.hospital_name_en,
      name_am: config.hospital_name_am,
      address_en: config.address_en,
      address_am: config.address_am,
      telephone: config.telephone,
      tin: config.tin_number,
      telebirrTill: config.telebirr_merchant_till,
      cbeAccount: config.cbe_account_number
    },
    shift: {
      id: summary.shift.id,
      shift_number: summary.shift.shift_number,
      register_id: summary.shift.register_id,
      cashier_id: summary.shift.cashier_id,
      cashier_name: summary.shift.cashier_name,
      opened_at: summary.shift.opened_at,
      closed_at: summary.shift.closed_at,
      status: summary.shift.status,
      closing_notes: summary.shift.closing_notes,
      variance_reason: summary.shift.variance_reason
    },
    openingCashFloat: summary.openingCash,
    paymentBreakdown: {
      cash: summary.cashCollections,
      telebirr: summary.telebirrCollections,
      cbeBirr: summary.cbeBirrCollections,
      card: summary.cardCollections,
      bankTransfer: summary.bankCollections,
      insurance: summary.insuranceCollections,
      other: summary.otherCollections,
      totalConfirmed: summary.totalConfirmedCollections
    },
    cashReconciliation: {
      openingCash: summary.openingCash,
      cashCollections: summary.cashCollections,
      cashRefunds: summary.cashRefunds,
      expectedClosingCash: summary.expectedClosingCash,
      actualCashCounted: counted,
      variance
    },
    digitalPaymentStatus: {
      verified: summary.digitalStatus.verified,
      pending: summary.digitalStatus.pending,
      pendingCount: summary.digitalStatus.pendingCount,
      rejected: summary.digitalStatus.rejected
    },
    metrics: {
      totalTransactions: summary.totalTransactions,
      payments: paymentsListRes.rows
    }
  };
}

/**
 * Submits shift handover to finance
 */
async function submitHandover({ shiftId, cashierId, handedOverTo = null, notes = '' }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const zReport = await generateZReport(shiftId);

    const handoverRes = await client.query(
      `INSERT INTO shift_handovers (shift_id, handed_over_by, received_by, cashier_summary, review_notes, finance_status)
       VALUES ($1, $2, $3, $4, $5, 'PENDING_REVIEW')
       RETURNING *`,
      [shiftId, cashierId, handedOverTo || null, JSON.stringify(zReport), notes || null]
    );

    await client.query(
      `UPDATE cashier_shifts
       SET status = 'HANDED_OVER',
           handed_over_to = $1,
           handed_over_at = NOW()
       WHERE id = $2`,
      [handedOverTo || null, shiftId]
    );

    await logFinancialAudit(client, {
      entityType: 'HANDOVER',
      entityId: handoverRes.rows[0].id,
      action: 'HANDOVER_SUBMITTED',
      actorId: cashierId,
      metadata: { shift_id: shiftId, handed_over_to: handedOverTo }
    });

    await client.query('COMMIT');
    return handoverRes.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Finance officer reviews and signs off on handover
 */
async function reviewHandover({ handoverId, financeUserId, status, reviewNotes = '' }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const handoverRes = await client.query(
      `SELECT * FROM shift_handovers WHERE id = $1 FOR UPDATE`,
      [handoverId]
    );

    if (handoverRes.rows.length === 0) {
      throw new Error('Handover record not found');
    }

    const handover = handoverRes.rows[0];

    await client.query(
      `UPDATE shift_handovers
       SET received_by = $1,
           finance_status = $2,
           review_notes = $3,
           approved_at = NOW()
       WHERE id = $4`,
      [financeUserId, status, reviewNotes || null, handoverId]
    );

    const shiftStatus = status === 'ACCEPTED' ? 'RECONCILED' : 'REQUIRES_REVIEW';
    await client.query(
      `UPDATE cashier_shifts
       SET status = $1,
           reconciled_by = $2,
           reconciled_at = NOW(),
           reconciliation_notes = $3
       WHERE id = $4`,
      [shiftStatus, financeUserId, reviewNotes || null, handover.shift_id]
    );

    await logFinancialAudit(client, {
      entityType: 'HANDOVER',
      entityId: handoverId,
      action: status === 'ACCEPTED' ? 'HANDOVER_ACCEPTED' : 'HANDOVER_DISPUTED',
      actorId: financeUserId,
      reason: reviewNotes || `Finance status updated to ${status}`,
      metadata: { shift_id: handover.shift_id, finance_status: status }
    });

    await client.query('COMMIT');
    return { success: true, finance_status: status, shift_status: shiftStatus };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  getActiveShift,
  openShift,
  calculateShiftSummary,
  closeShift,
  generateZReport,
  submitHandover,
  reviewHandover
};
