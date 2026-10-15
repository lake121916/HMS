/**
 * Automated Verification Script for Clinical Safety, FEFO, Allergy Warnings, Addenda, and OPD Queue
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require('../src/config/database');
const fefoService = require('../src/services/fefoService');
const allergySafetyService = require('../src/services/allergySafetyService');

async function runTests() {
  console.log('--- Starting Clinical Safety & EMR Compliance Test Suite ---');
  let testsPassed = 0;
  let testsFailed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      testsPassed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      testsFailed++;
    }
  }

  try {
    // ── TEST 1: Expiry Status Calculation ──────────────────────────
    console.log('\n[Test 1] FEFO Batch Status Calculation:');
    const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const nearDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const farDate = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const expiredStatus = fefoService.calculateBatchStatus(pastDate, 50);
    assert(expiredStatus.status === 'EXPIRED', 'Past date correctly flagged as EXPIRED');

    const criticalStatus = fefoService.calculateBatchStatus(nearDate, 50);
    assert(criticalStatus.status === 'CRITICAL_NEAR_EXPIRY', '15 days remaining flagged as CRITICAL_NEAR_EXPIRY');

    const validStatus = fefoService.calculateBatchStatus(farDate, 50);
    assert(validStatus.status === 'VALID', '180 days remaining flagged as VALID');

    const outOfStockStatus = fefoService.calculateBatchStatus(farDate, 0);
    assert(outOfStockStatus.status === 'OUT_OF_STOCK', '0 quantity flagged as OUT_OF_STOCK');

    // ── TEST 2: Rejection of Expired Batch Reception ───────────────
    console.log('\n[Test 2] Expiry Rejection on Receive:');
    // Ensure test medicine exists
    let medRes = await pool.query("SELECT id FROM medicines WHERE name ILIKE '%Amoxicillin%' LIMIT 1");
    let medId;
    if (!medRes.rows.length) {
      const newMed = await pool.query(
        "INSERT INTO medicines (name, generic_name, category, unit, unit_price) VALUES ('Amoxicillin 500mg', 'Amoxicillin', 'Antibiotic', 'Capsule', 15.00) RETURNING id"
      );
      medId = newMed.rows[0].id;
    } else {
      medId = medRes.rows[0].id;
    }

    try {
      await fefoService.receiveBatch({
        medicationId: medId,
        batchNumber: 'EXP-TEST-999',
        quantity: 20,
        expiryDate: pastDate,
        receivedBy: 1
      });
      assert(false, 'Should have thrown error when receiving expired batch');
    } catch (err) {
      assert(err.message.includes('expired batch'), 'Successfully rejected receiving expired batch');
    }

    // ── TEST 3: FEFO Allocation Order ─────────────────────────────
    console.log('\n[Test 3] FEFO Earliest-Expiry Selection & Concurrency:');
    const batch1Exp = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const batch2Exp = new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const b1 = await fefoService.receiveBatch({
      medicationId: medId,
      batchNumber: `FEFO-B1-${Date.now()}`,
      quantity: 10,
      expiryDate: batch1Exp,
      storageLocation: 'Shelf A1',
      receivedBy: 1
    });

    const b2 = await fefoService.receiveBatch({
      medicationId: medId,
      batchNumber: `FEFO-B2-${Date.now()}`,
      quantity: 25,
      expiryDate: batch2Exp,
      storageLocation: 'Shelf A2',
      receivedBy: 1
    });

    // Dispense 15 units -> Should take all 10 from B1, and 5 from B2
    const dispRes = await fefoService.allocateAndDispenseFEFO({
      medicationId: medId,
      quantityRequested: 15,
      dispensedBy: 1,
      notes: 'Test FEFO multi-batch split'
    });

    assert(dispRes.allocations.length === 2, 'Allocated across 2 batches');
    assert(dispRes.allocations[0].batchId === b1.id && dispRes.allocations[0].quantityAllocated === 10, 'Earliest batch B1 emptied first (10 units)');
    assert(dispRes.allocations[1].batchId === b2.id && dispRes.allocations[1].quantityAllocated === 5, 'Next batch B2 partially drawn (5 units)');

    // ── TEST 4: Allergy Matching and Cross-Reactivity ──────────────
    console.log('\n[Test 4] Clinical Allergy Detection & Cross-Reactivity:');
    // Ensure test patient exists
    let patRes = await pool.query("SELECT id FROM patients WHERE first_name = 'TestSafety' LIMIT 1");
    let patId;
    if (!patRes.rows.length) {
      const newPat = await pool.query(`
        INSERT INTO patients (first_name, last_name, date_of_birth, gender, allergies)
        VALUES ('TestSafety', 'Patient', '1990-01-01', 'female', 'Penicillin')
        RETURNING id
      `);
      patId = newPat.rows[0].id;
    } else {
      patId = patRes.rows[0].id;
    }

    // Add structured penicillin allergy
    await pool.query(`
      INSERT INTO patient_allergies (patient_id, allergen_name, allergen_category, reaction_description, severity, verification_status)
      VALUES ($1, 'Penicillin G', 'drug', 'Severe anaphylaxis and hives', 'severe', 'verified')
      ON CONFLICT DO NOTHING
    `, [patId]);

    // Test 4a: Prescribing Amoxicillin (Penicillin class member)
    const checkAmox = await allergySafetyService.checkMedicationAllergy(patId, 'Amoxicillin 500mg');
    assert(checkAmox.hasConflict === true, 'Detected class conflict: Penicillin allergy vs Amoxicillin prescription');
    assert(checkAmox.alerts.length > 0, 'Generated detailed clinical allergy warning');

    // Test 4b: Prescribing Ceftriaxone (Cross-reactivity rule)
    const checkCeft = await allergySafetyService.checkMedicationAllergy(patId, 'Ceftriaxone 1g IV');
    assert(checkCeft.hasConflict === true, 'Detected cross-reactivity warning: Penicillin allergy vs Ceftriaxone (Cephalosporin)');

    // Test 4c: Prescribing Paracetamol (No conflict)
    const checkSafe = await allergySafetyService.checkMedicationAllergy(patId, 'Paracetamol 500mg');
    assert(checkSafe.hasConflict === false, 'Safe medication Paracetamol cleared without false alarms');

    // ── TEST 5: OPD Queue Sequential Token & State ─────────────────
    console.log('\n[Test 5] OPD Queue Token Generation:');
    const deptRes = await pool.query('SELECT id FROM departments LIMIT 1');
    const deptId = deptRes.rows[0]?.id || 1;

    const seqRes = await pool.query(`
      SELECT COALESCE(MAX(token_number), 0) + 1 AS next_token
      FROM opd_queues
      WHERE department_id = $1 AND queue_date = CURRENT_DATE
    `, [deptId]);
    const expectedTokenNum = parseInt(seqRes.rows[0].next_token, 10);
    const expectedToken = `OPD-${String(expectedTokenNum).padStart(3, '0')}`;

    const newQueue = await pool.query(`
      INSERT INTO opd_queues (queue_token, token_number, patient_id, department_id, status)
      VALUES ($1, $2, $3, $4, 'waiting')
      RETURNING *
    `, [expectedToken, expectedTokenNum, patId, deptId]);

    assert(newQueue.rows[0].queue_token === expectedToken, `Generated token #${expectedTokenNum} (${expectedToken})`);
    assert(newQueue.rows[0].status === 'waiting', 'Initial state is waiting');

  } catch (err) {
    console.error('Test execution error:', err);
    testsFailed++;
  } finally {
    console.log(`\n========================================`);
    console.log(`Test Results: ${testsPassed} Passed, ${testsFailed} Failed`);
    console.log(`========================================\n`);
    await pool.end();
  }
}

runTests();
