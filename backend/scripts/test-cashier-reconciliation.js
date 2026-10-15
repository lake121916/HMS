// ============================================================================
// Alem Ketema Enat Hospital Management System (HMS)
// Test Suite: Cashier, Thermal Receipts, Digital Payments, Shifts & Z-Report
// ============================================================================

require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const {
  validateProviderReference,
  checkDuplicateReference,
  verifyDigitalPayment,
  normalizeProvider
} = require('../src/services/digitalPaymentService');

const {
  openShift,
  calculateShiftSummary,
  closeShift,
  generateZReport,
  submitHandover,
  reviewHandover
} = require('../src/services/cashierShiftService');

async function runTests() {
  console.log('================================================================');
  console.log('ALEM KETEMA ENAT HOSPITAL - CASHIER & RECONCILIATION TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`✗ FAIL: ${testName} - ${details}`);
      failed++;
    }
  }

  const client = await pool.connect();
  try {
    // ------------------------------------------------------------------------
    // TEST 1: Provider Reference Validation Rules (Telebirr & CBE Birr)
    // ------------------------------------------------------------------------
    console.log('--- MODULE 2: DIGITAL PAYMENT REFERENCE VALIDATION ---');
    
    // Empty reference
    const emptyTelebirr = validateProviderReference('telebirr', '');
    assert(!emptyTelebirr.valid, 'Empty Telebirr reference rejected');

    // Invalid characters (spaces, special punctuation)
    const invalidChars = validateProviderReference('telebirr', 'TLB 992144 @#$');
    assert(!invalidChars.valid, 'Telebirr reference with invalid characters rejected');

    // Too short
    const shortRef = validateProviderReference('telebirr', 'TB1');
    assert(!shortRef.valid, 'Too short reference (< 6 chars) rejected');

    // Valid Telebirr references
    const validTlb1 = validateProviderReference('telebirr', 'tlb-99827361');
    assert(validTlb1.valid && validTlb1.normalizedReference === 'TLB-99827361', 'Telebirr reference normalized to uppercase with hyphens preserved');

    const validTlb2 = validateProviderReference('telebirr', 'EB8392019482');
    assert(validTlb2.valid && validTlb2.normalizedReference === 'EB8392019482', 'Telebirr alphanumeric 12-char reference accepted');

    // Valid CBE Birr references
    const validCbe1 = validateProviderReference('cbe_birr', 'cbe-88192039');
    assert(validCbe1.valid && validCbe1.normalizedReference === 'CBE-88192039', 'CBE Birr reference normalized to uppercase');

    const validCbe2 = validateProviderReference('cbe_birr', 'FT24285991823');
    assert(validCbe2.valid && validCbe2.accountNumber === '1000189922341', 'CBE Financial Transfer format accepted with hospital account');

    // ------------------------------------------------------------------------
    // TEST 2: Concurrent Atomic Receipt Number Generation
    // ------------------------------------------------------------------------
    console.log('\n--- MODULE 1: CONCURRENT ATOMIC RECEIPT NUMBERING ---');
    
    const seqPromises = Array.from({ length: 10 }).map(() =>
      pool.query("SELECT ('RCP-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('receipt_number_seq')::text, 6, '0')) AS receipt_number")
    );
    const seqResults = await Promise.all(seqPromises);
    const receiptNumbers = seqResults.map(r => r.rows[0].receipt_number);
    const uniqueReceipts = new Set(receiptNumbers);

    assert(uniqueReceipts.size === 10, '10 concurrent receipt requests generated 10 unique sequential numbers');
    assert(receiptNumbers[0].startsWith(`RCP-${new Date().getFullYear()}-`), `Receipt number format matches RCP-YYYY-NNNNNN (${receiptNumbers[0]})`);

    // ------------------------------------------------------------------------
    // TEST 3: Hospital Financial Configuration Verification
    // ------------------------------------------------------------------------
    console.log('\n--- MODULE 1.2: HOSPITAL CONFIGURATION VERIFICATION ---');
    const configRes = await pool.query('SELECT * FROM hospital_financial_config WHERE id = 1');
    const cfg = configRes.rows[0];

    assert(cfg.hospital_name_en === 'Alem Ketema Enat Hospital', 'Official hospital English name verified');
    assert(cfg.hospital_name_am === 'አለም ከተማ እናት ጠቅላላ ሆስፒታል', 'Official hospital Amharic name verified');
    assert(cfg.tin_number === '0012938475', 'Official Hospital TIN is valid');
    assert(cfg.telebirr_merchant_till === '654321', 'Official Telebirr Merchant Till verified (654321)');
    assert(cfg.cbe_account_number === '1000189922341', 'Official CBE Account Number verified (1000189922341)');

    // ------------------------------------------------------------------------
    // TEST 4: Cashier Shift Lifecycle, Register Uniqueness & Opening Float
    // ------------------------------------------------------------------------
    console.log('\n--- MODULE 3: CASHIER SHIFT MANAGEMENT & REGISTER ISOLATION ---');
    
    // Find a test user (cashier)
    const cashierRes = await pool.query("SELECT id FROM users WHERE role = 'cashier' LIMIT 1");
    const cashierId = cashierRes.rows.length > 0 ? cashierRes.rows[0].id : 3;

    // Clean any open test shifts on test register REG-TEST
    await pool.query("DELETE FROM payments WHERE register_id = 'REG-TEST'");
    await pool.query("DELETE FROM shift_handovers WHERE shift_id IN (SELECT id FROM cashier_shifts WHERE register_id = 'REG-TEST')");
    await pool.query("DELETE FROM cashier_shifts WHERE register_id = 'REG-TEST'");

    // Open shift on REG-TEST with 1500 ETB float
    const shift1 = await openShift({
      cashierId,
      registerId: 'REG-TEST',
      openingCash: 1500.00,
      notes: 'Automated test shift start'
    });

    assert(shift1.id && shift1.status === 'OPEN', `Shift opened with status OPEN (Shift #: ${shift1.shift_number})`);
    assert(parseFloat(shift1.opening_cash) === 1500.00, 'Opening cash float recorded accurately as 1500.00 ETB');

    // Attempt to open SECOND simultaneous active shift on same register -> MUST FAIL
    let duplicateShiftBlocked = false;
    try {
      await openShift({
        cashierId,
        registerId: 'REG-TEST',
        openingCash: 500.00
      });
    } catch (err) {
      duplicateShiftBlocked = true;
    }
    assert(duplicateShiftBlocked, 'Duplicate active shift on same register strictly blocked');

    // ------------------------------------------------------------------------
    // TEST 5: Payment Processing, Reference Uniqueness & Shift Association
    // ------------------------------------------------------------------------
    console.log('\n--- MODULE 2.3: DUPLICATE REFERENCE PREVENTION & ATOMIC POSTING ---');

    // Setup a test invoice with patient
    const patientRes = await pool.query('SELECT id FROM patients LIMIT 1');
    const patientId = patientRes.rows[0].id;

    const testInvRes = await pool.query(
      `INSERT INTO invoices (patient_id, subtotal, tax, discount, total_amount, status, notes)
       VALUES ($1, 2000.00, 0.00, 0.00, 2000.00, 'pending', 'Reconciliation Test Invoice')
       RETURNING id`,
      [patientId]
    );
    const testInvoiceId = testInvRes.rows[0].id;

    // Add itemized lines to invoice_items with unique source_ids
    const srcId = Math.floor(Date.now() / 1000);
    await pool.query(
      `INSERT INTO invoice_items (invoice_id, patient_id, description, quantity, unit_price, source_type, source_id)
       VALUES ($1, $2, 'Specialist Medical Consultation', 1, 500.00, 'consultation', $3),
              ($1, $2, 'Complete Blood Count (CBC)', 1, 350.00, 'lab_order', $4),
              ($1, $2, 'Abdominal Ultrasound Scan', 1, 1150.00, 'consultation', $5)`,
      [testInvoiceId, patientId, srcId, srcId + 1, srcId + 2]
    );

    // Unique Telebirr reference code for this test
    const testTelebirrRef = `TLB-TEST-${Date.now()}`;

    // Post Telebirr payment of 500 ETB
    const pay1Seq = await pool.query("SELECT ('RCP-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('receipt_number_seq')::text, 6, '0')) AS receipt_number");
    const pay1ReceiptNo = pay1Seq.rows[0].receipt_number;

    const pay1 = await pool.query(
      `INSERT INTO payments (
         invoice_id, amount, payment_method, payment_provider, transaction_id, provider_reference,
         receipt_number, verification_status, shift_id, register_id, received_by, notes, currency
       )
       VALUES ($1, 500.00, 'telebirr', 'telebirr', $2, $2, $3, 'PENDING', $4, 'REG-TEST', $5, 'Test payment 1', 'ETB')
       RETURNING *`,
      [testInvoiceId, testTelebirrRef, pay1ReceiptNo, shift1.id, cashierId]
    );
    assert(pay1.rows.length === 1 && pay1.rows[0].verification_status === 'PENDING', 'Telebirr payment posted with initial status PENDING');

    // Post cash payment of 1000 ETB
    const pay2Seq = await pool.query("SELECT ('RCP-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('receipt_number_seq')::text, 6, '0')) AS receipt_number");
    const pay2ReceiptNo = pay2Seq.rows[0].receipt_number;

    const pay2 = await pool.query(
      `INSERT INTO payments (
         invoice_id, amount, payment_method, payment_provider, transaction_id, provider_reference,
         receipt_number, verification_status, shift_id, register_id, received_by, notes, currency
       )
       VALUES ($1, 1000.00, 'cash', 'cash', null, null, $2, 'VERIFIED', $3, 'REG-TEST', $4, 'Test cash payment', 'ETB')
       RETURNING *`,
      [testInvoiceId, pay2ReceiptNo, shift1.id, cashierId]
    );
    assert(pay2.rows.length === 1 && pay2.rows[0].verification_status === 'VERIFIED', 'Cash payment posted with status VERIFIED and attached to shift');

    // Attempt DUPLICATE payment with same Telebirr reference -> MUST BE BLOCKED
    const dupCheck = await checkDuplicateReference(pool, 'telebirr', testTelebirrRef);
    assert(dupCheck.isDuplicate, `Duplicate reference check detected existing payment: ${dupCheck.message}`);

    let dbUniqueViolation = false;
    try {
      await pool.query(
        `INSERT INTO payments (
           invoice_id, amount, payment_method, payment_provider, transaction_id, provider_reference,
           receipt_number, verification_status, shift_id, register_id, received_by
         )
         VALUES ($1, 500.00, 'telebirr', 'telebirr', $2, $2, 'RCP-TEST-DUP', 'PENDING', $3, 'REG-TEST', $4)`,
        [testInvoiceId, testTelebirrRef, shift1.id, cashierId]
      );
    } catch (err) {
      dbUniqueViolation = true;
    }
    assert(dbUniqueViolation, 'Database unique constraint strictly blocked duplicate payment insertion');

    // ------------------------------------------------------------------------
    // TEST 6: Digital Payment Verification (Mode B Role Separation)
    // ------------------------------------------------------------------------
    console.log('\n--- MODULE 2.5: VERIFICATION MODE B & ROLE SEPARATION ---');

    // Cashier attempting to self-verify -> MUST FAIL
    let selfVerifyBlocked = false;
    try {
      await verifyDigitalPayment({
        paymentId: pay1.rows[0].id,
        verifierUser: { id: cashierId, role: 'cashier' },
        verificationMethod: 'MANUAL_MERCHANT_APP',
        action: 'VERIFY'
      });
    } catch (err) {
      selfVerifyBlocked = true;
    }
    assert(selfVerifyBlocked, 'Cashier self-approval blocked by role separation rule');

    // Finance Officer / Admin verifying -> MUST SUCCEED
    const adminUserRes = await pool.query("SELECT id, role FROM users WHERE role IN ('admin', 'super_admin') LIMIT 1");
    const adminUser = adminUserRes.rows[0];

    const verifySuccess = await verifyDigitalPayment({
      paymentId: pay1.rows[0].id,
      verifierUser: adminUser,
      verificationMethod: 'MANUAL_MERCHANT_APP',
      evidenceRef: 'Ethio Telecom Merchant portal transaction match'
    });
    assert(verifySuccess.success && verifySuccess.status === 'VERIFIED', 'Authorized finance officer verified digital payment');

    // ------------------------------------------------------------------------
    // TEST 7: Receipt Reprint Tracking (Reprint increments without creating new payment)
    // ------------------------------------------------------------------------
    console.log('\n--- MODULE 1.5: RECEIPT REPRINT INTEGRITY ---');

    const paymentCountBefore = await pool.query('SELECT COUNT(*) FROM payments WHERE invoice_id = $1', [testInvoiceId]);

    // Perform reprint on pay1
    const reprintRes = await pool.query(
      `UPDATE payments 
       SET reprint_count = reprint_count + 1,
           last_reprinted_at = NOW(),
           last_reprinted_by = $1
       WHERE id = $2 RETURNING reprint_count, receipt_number`,
      [cashierId, pay1.rows[0].id]
    );

    const paymentCountAfter = await pool.query('SELECT COUNT(*) FROM payments WHERE invoice_id = $1', [testInvoiceId]);

    assert(reprintRes.rows[0].reprint_count === 1, 'Reprint count successfully incremented to 1');
    assert(paymentCountBefore.rows[0].count === paymentCountAfter.rows[0].count, 'Reprint did not create a new payment or duplicate receipt');

    // ------------------------------------------------------------------------
    // TEST 8: Live Cash Reconciliation & Expected Cash Formula
    // ------------------------------------------------------------------------
    console.log('\n--- MODULE 4: EXPECTED CASH CALCULATION & CLOSING CONTROLS ---');

    // Expected closing cash = Opening Float (1500) + Cash Collections (1000) - Refunds (0) = 2500 ETB
    const summary = await calculateShiftSummary(shift1.id);
    assert(summary.openingCash === 1500, 'Opening cash float is 1500 ETB');
    assert(summary.cashCollections === 1000, 'Cash collections correctly identified as 1000 ETB (ignoring digital)');
    assert(summary.telebirrCollections === 500, 'Verified Telebirr collections identified as 500 ETB');
    assert(summary.expectedClosingCash === 2500, `Expected closing cash exactly 2500 ETB (${summary.expectedClosingCash} ETB)`);

    // Close with variance: actual cash counted = 2450 ETB (shortage of -50 ETB)
    const closeRes = await closeShift({
      shiftId: shift1.id,
      cashierId,
      closingCashCounted: 2450.00,
      closingNotes: 'Shift ended at 5:00 PM',
      varianceReason: 'Small change shortage in 50 ETB note denomination'
    });

    assert(closeRes.shift.status === 'CLOSED', 'Shift status updated to CLOSED');
    assert(parseFloat(closeRes.shift.cash_variance) === -50.00, 'Cash variance calculated correctly as -50.00 ETB');

    // ------------------------------------------------------------------------
    // TEST 9: Z-Report Generation
    // ------------------------------------------------------------------------
    console.log('\n--- MODULE 4.4: Z-REPORT GENERATION ---');

    const zReport = await generateZReport(shift1.id);

    assert(zReport.hospital.name_en === 'Alem Ketema Enat Hospital', 'Z-Report contains hospital English name');
    assert(zReport.hospital.tin === '0012938475', 'Z-Report contains hospital official TIN');
    assert(zReport.shift.shift_number === shift1.shift_number, 'Z-Report matches shift number');
    assert(zReport.paymentBreakdown.cash === 1000, 'Z-Report cash collections: 1000 ETB');
    assert(zReport.paymentBreakdown.telebirr === 500, 'Z-Report Telebirr collections: 500 ETB');
    assert(zReport.cashReconciliation.expectedClosingCash === 2500, 'Z-Report expected cash: 2500 ETB');
    assert(zReport.cashReconciliation.actualCashCounted === 2450, 'Z-Report counted cash: 2450 ETB');
    assert(zReport.cashReconciliation.variance === -50, 'Z-Report cash variance: -50 ETB');

    // ------------------------------------------------------------------------
    // TEST 10: Shift Handover to Finance & Reconciliation Sign-Off
    // ------------------------------------------------------------------------
    console.log('\n--- MODULE 4.7 & 5: HANDOVER & AUDIT TRAIL ---');

    const handover = await submitHandover({
      shiftId: shift1.id,
      cashierId,
      notes: 'Handover envelope handed to finance vault'
    });
    assert(handover.id && handover.finance_status === 'PENDING_REVIEW', 'Handover created in PENDING_REVIEW status');

    const review = await reviewHandover({
      handoverId: handover.id,
      financeUserId: adminUser.id,
      status: 'ACCEPTED',
      reviewNotes: 'Counted physical bills match envelope report.'
    });
    assert(review.success && review.finance_status === 'ACCEPTED' && review.shift_status === 'RECONCILED', 'Finance officer accepted handover and marked shift RECONCILED');

    // Verify Financial Audit Trail
    const auditRes = await pool.query(
      `SELECT action, entity_type FROM financial_audit_events 
       WHERE (entity_type = 'SHIFT' AND entity_id = $1)
          OR (entity_type = 'HANDOVER' AND entity_id = $2)
       ORDER BY id ASC`,
      [shift1.id, handover.id]
    );
    const actions = auditRes.rows.map(r => r.action);
    assert(actions.includes('SHIFT_OPENED'), 'Audit log contains SHIFT_OPENED');
    assert(actions.includes('SHIFT_CLOSED'), 'Audit log contains SHIFT_CLOSED');
    assert(actions.includes('HANDOVER_SUBMITTED'), 'Audit log contains HANDOVER_SUBMITTED');
    assert(actions.includes('HANDOVER_ACCEPTED'), 'Audit log contains HANDOVER_ACCEPTED');

    // Clean up test invoice & shift
    await pool.query('DELETE FROM payments WHERE invoice_id = $1', [testInvoiceId]);
    await pool.query('DELETE FROM invoice_items WHERE invoice_id = $1', [testInvoiceId]);
    await pool.query('DELETE FROM invoices WHERE id = $1', [testInvoiceId]);
    await pool.query('DELETE FROM shift_handovers WHERE shift_id = $1', [shift1.id]);
    await pool.query('DELETE FROM cashier_shifts WHERE id = $1', [shift1.id]);

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    client.release();
    await pool.end();
  }

  console.log('\n================================================================');
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
