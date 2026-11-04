/**
 * Pharmacist Prescription Dispensing & Inventory Integration Service
 * Alem Ketema Enat Hospital Management System
 *
 * Implements:
 * 1. Safe transactional dispensing with row locks (FOR UPDATE)
 * 2. Inventory batch allocation (FEFO or manual batch selection)
 * 3. Partial dispensing support when stock is insufficient
 * 4. Automatic status transitions: Pending -> Partially Dispensed -> Dispensed / Cancelled / Expired
 * 5. Billing module integration with duplicate protection
 * 6. Full dispensing audit history
 */

const pool = require('../config/database');
const fefoService = require('./fefoService');
const billingService = require('./billingService');
const notificationService = require('./notificationService');

/**
 * Categorize days until expiry
 */
function getExpiryMeta(expiryDate) {
  if (!expiryDate) return { isExpired: false, daysRemaining: 999 };
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const exp = new Date(expiryDate);
  exp.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return {
    isExpired: diffDays < 0,
    daysRemaining: diffDays,
    isNearExpiry: diffDays >= 0 && diffDays <= 90,
    isCriticalExpiry: diffDays >= 0 && diffDays <= 30
  };
}

/**
 * Execute transactional prescription dispensing
 */
async function dispensePrescription({
  prescriptionId,
  quantityToDispense,
  batchId,
  notes,
  userId
}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch prescription with row lock
    const rxRes = await client.query(`
      SELECT pr.*, 
             p.first_name || ' ' || p.last_name AS patient_name,
             'AKEH-' || LPAD(p.id::text, 4, '0') AS patient_mrn,
             d.first_name || ' ' || d.last_name AS doctor_name
      FROM prescriptions pr
      JOIN patients p ON pr.patient_id = p.id
      JOIN doctors d ON pr.doctor_id = d.id
      WHERE pr.id = $1
      FOR UPDATE OF pr
    `, [prescriptionId]);

    if (!rxRes.rows.length) {
      const err = new Error('Prescription not found');
      err.statusCode = 404;
      throw err;
    }

    const rx = rxRes.rows[0];

    // Status validations
    if (rx.status === 'Cancelled' || rx.workflow_status === 'cancelled') {
      const err = new Error('Cannot dispense a cancelled prescription.');
      err.statusCode = 400;
      throw err;
    }

    if (rx.status === 'Dispensed' || rx.is_dispensed) {
      const err = new Error('This prescription has already been fully dispensed.');
      err.statusCode = 400;
      throw err;
    }

    // Check prescription expiry
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (rx.expiry_date && new Date(rx.expiry_date) < today) {
      await client.query(`
        UPDATE prescriptions 
        SET status = 'Expired', workflow_status = 'expired', updated_at = NOW() 
        WHERE id = $1
      `, [prescriptionId]);
      await client.query('COMMIT');
      const err = new Error('Prescription has expired and cannot be dispensed. Please request a fresh prescription from the doctor.');
      err.statusCode = 400;
      throw err;
    }

    const totalPrescribed = parseInt(rx.quantity, 10) || 1;
    const alreadyDispensed = parseInt(rx.quantity_dispensed, 10) || 0;
    const remainingToDispense = Math.max(0, totalPrescribed - alreadyDispensed);

    if (remainingToDispense <= 0) {
      const err = new Error('This prescription has already been fully dispensed.');
      err.statusCode = 400;
      throw err;
    }

    // Determine quantity to dispense in this call
    let qty = (quantityToDispense !== undefined && quantityToDispense !== null)
      ? parseInt(quantityToDispense, 10)
      : remainingToDispense;

    if (isNaN(qty) || qty <= 0) {
      const err = new Error('Quantity to dispense must be a positive integer.');
      err.statusCode = 400;
      throw err;
    }

    if (qty > remainingToDispense) {
      const err = new Error(`Requested quantity (${qty}) exceeds remaining prescribed quantity (${remainingToDispense}).`);
      err.statusCode = 400;
      throw err;
    }

    // 2. Resolve medication in hospital formulary
    let medicationId = rx.medication_id;
    if (!medicationId) {
      const medRes = await client.query(`
        SELECT id FROM medicines 
        WHERE LOWER(name) = LOWER($1) OR LOWER(generic_name) = LOWER($1)
           OR $1 ILIKE '%' || name || '%'
        ORDER BY id ASC LIMIT 1
      `, [rx.medication_name]);
      if (medRes.rows.length) {
        medicationId = medRes.rows[0].id;
        await client.query('UPDATE prescriptions SET medication_id = $1 WHERE id = $2', [medicationId, rx.id]);
      }
    }

    if (!medicationId) {
      const err = new Error(`Medication "${rx.medication_name}" does not match any entry in the pharmacy formulary. Please configure medication in catalog first.`);
      err.statusCode = 400;
      throw err;
    }

    // 3. Batch allocation & inventory deduction
    const allocations = [];

    if (batchId) {
      // Pharmacist manually selected a specific batch
      const batchRes = await client.query(`
        SELECT mb.*, m.name AS medication_name, m.unit_price
        FROM medication_batches mb
        JOIN medicines m ON m.id = mb.medication_id
        WHERE mb.id = $1 AND mb.medication_id = $2
        FOR UPDATE OF mb
      `, [batchId, medicationId]);

      if (!batchRes.rows.length) {
        const err = new Error('Selected batch does not exist or does not belong to this medication.');
        err.statusCode = 400;
        throw err;
      }

      const batch = batchRes.rows[0];

      if (batch.status !== 'active') {
        const err = new Error(`Batch ${batch.batch_number} is not active (status: ${batch.status}).`);
        err.statusCode = 400;
        throw err;
      }

      if (new Date(batch.expiry_date) < today) {
        const err = new Error(`Batch ${batch.batch_number} is expired (${new Date(batch.expiry_date).toISOString().slice(0,10)}) and cannot be dispensed.`);
        err.statusCode = 400;
        throw err;
      }

      if (batch.quantity_available < qty) {
        const err = new Error(`Insufficient stock in batch ${batch.batch_number}. Available: ${batch.quantity_available}, Requested: ${qty}. Choose another batch or enter a smaller partial quantity.`);
        err.statusCode = 400;
        throw err;
      }

      const newAvail = batch.quantity_available - qty;
      await client.query(`
        UPDATE medication_batches
        SET quantity_available = $1,
            status = CASE WHEN $1 = 0 THEN 'depleted' ELSE 'active' END,
            updated_at = NOW()
        WHERE id = $2
      `, [newAvail, batch.id]);

      const dispRes = await client.query(`
        INSERT INTO batch_dispensations 
          (prescription_id, batch_id, quantity, dispensed_by, notes, patient_id, medication_id, batch_number, quantity_prescribed, quantity_dispensed)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [rx.id, batch.id, qty, userId, notes || null, rx.patient_id, medicationId, batch.batch_number, totalPrescribed, qty]);

      await client.query(`
        INSERT INTO inventory_ledger
          (batch_id, medication_id, movement_type, quantity_change, quantity_after, reason, authorized_by, reference_id)
        VALUES ($1, $2, 'dispensed', $3, $4, $5, $6, $7)
      `, [
        batch.id,
        medicationId,
        -qty,
        newAvail,
        `Dispensed for Rx #${rx.id} (${rx.patient_name}, Batch: ${batch.batch_number})`,
        userId,
        `RX-${rx.id}`
      ]);

      allocations.push({
        batchId: batch.id,
        batchNumber: batch.batch_number,
        expiryDate: batch.expiry_date,
        quantityAllocated: qty,
        remainingInBatch: newAvail,
        dispensationId: dispRes.rows[0].id
      });
    } else {
      // Auto-allocation using First-Expired-First-Out (FEFO)
      const batchesRes = await client.query(`
        SELECT mb.*, m.name AS medication_name, m.unit_price
        FROM medication_batches mb
        JOIN medicines m ON m.id = mb.medication_id
        WHERE mb.medication_id = $1
          AND mb.status = 'active'
          AND mb.expiry_date >= CURRENT_DATE
          AND mb.quantity_available > 0
        ORDER BY mb.expiry_date ASC, mb.id ASC
        FOR UPDATE OF mb
      `, [medicationId]);

      const availableBatches = batchesRes.rows;
      const totalAvailable = availableBatches.reduce((sum, b) => sum + parseInt(b.quantity_available, 10), 0);

      if (totalAvailable <= 0) {
        const err = new Error(`Zero non-expired stock available for ${rx.medication_name}. Cannot dispense.`);
        err.statusCode = 400;
        throw err;
      }

      if (totalAvailable < qty) {
        const err = new Error(`Insufficient non-expired stock available. Available: ${totalAvailable}, Requested to dispense: ${qty}. You can dispense a partial quantity of up to ${totalAvailable}.`);
        err.statusCode = 400;
        throw err;
      }

      let remainingToDeduct = qty;
      for (const batch of availableBatches) {
        if (remainingToDeduct <= 0) break;
        const take = Math.min(parseInt(batch.quantity_available, 10), remainingToDeduct);
        const newAvail = parseInt(batch.quantity_available, 10) - take;

        await client.query(`
          UPDATE medication_batches
          SET quantity_available = $1,
              status = CASE WHEN $1 = 0 THEN 'depleted' ELSE 'active' END,
              updated_at = NOW()
          WHERE id = $2
        `, [newAvail, batch.id]);

        const dispRes = await client.query(`
          INSERT INTO batch_dispensations 
            (prescription_id, batch_id, quantity, dispensed_by, notes, patient_id, medication_id, batch_number, quantity_prescribed, quantity_dispensed)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING *
        `, [rx.id, batch.id, take, userId, notes || null, rx.patient_id, medicationId, batch.batch_number, totalPrescribed, take]);

        await client.query(`
          INSERT INTO inventory_ledger
            (batch_id, medication_id, movement_type, quantity_change, quantity_after, reason, authorized_by, reference_id)
          VALUES ($1, $2, 'dispensed', $3, $4, $5, $6, $7)
        `, [
          batch.id,
          medicationId,
          -take,
          newAvail,
          `FEFO dispensation for Rx #${rx.id} (${rx.patient_name}, Batch: ${batch.batch_number})`,
          userId,
          `RX-${rx.id}`
        ]);

        allocations.push({
          batchId: batch.id,
          batchNumber: batch.batch_number,
          expiryDate: batch.expiry_date,
          quantityAllocated: take,
          remainingInBatch: newAvail,
          dispensationId: dispRes.rows[0].id
        });

        remainingToDeduct -= take;
      }
    }

    // 4. Update legacy inventory table
    await client.query(`
      UPDATE inventory
      SET quantity = GREATEST(0, quantity - $1),
          updated_at = NOW()
      WHERE medicine_id = $2
    `, [qty, medicationId]);

    // 5. Update cumulative dispensed quantity & status
    const newTotalDispensed = alreadyDispensed + qty;
    const isFullyDispensed = newTotalDispensed >= totalPrescribed;
    const newStatus = isFullyDispensed ? 'Dispensed' : 'Partially Dispensed';
    const newWorkflowStatus = isFullyDispensed ? 'dispensed' : 'partially_dispensed';

    // 6. Billing Module Integration
    let invoiceId = rx.invoice_id;
    let invoiceItemId = rx.invoice_item_id;

    // Check if an invoice item for this prescription already exists
    const existingItemRes = await client.query(`
      SELECT ii.*, i.status AS invoice_status, i.total_amount
      FROM invoice_items ii
      JOIN invoices i ON ii.invoice_id = i.id
      WHERE ii.source_type = 'prescription' AND ii.source_id = $1
      ORDER BY ii.id ASC LIMIT 1
    `, [rx.id]);

    if (existingItemRes.rows.length) {
      // Already billed at prescription order time — DO NOT double charge!
      invoiceId = existingItemRes.rows[0].invoice_id;
      invoiceItemId = existingItemRes.rows[0].id;
    } else {
      // Not yet billed — auto-generate invoice item
      const priceRes = await client.query('SELECT unit_price FROM medicines WHERE id = $1', [medicationId]);
      const unitPrice = priceRes.rows.length ? parseFloat(priceRes.rows[0].unit_price) : 0;

      let targetInvoice;
      if (rx.encounter_id) {
        const invRes = await client.query('SELECT * FROM invoices WHERE encounter_id = $1 LIMIT 1', [rx.encounter_id]);
        if (invRes.rows.length) targetInvoice = invRes.rows[0];
      }
      if (!targetInvoice) {
        const newInv = await client.query(`
          INSERT INTO invoices (patient_id, encounter_id, doctor_id, subtotal, tax, discount, total_amount, status, notes)
          VALUES ($1, $2, $3, 0, 0, 0, 0, 'pending', 'Prescription dispensation invoice')
          RETURNING *
        `, [rx.patient_id, rx.encounter_id || null, rx.doctor_id || null]);
        targetInvoice = newInv.rows[0];
      }

      invoiceId = targetInvoice.id;
      const subtotal = unitPrice * qty;

      const newItem = await client.query(`
        INSERT INTO invoice_items 
          (invoice_id, patient_id, encounter_id, service_id, description, quantity, unit_price, subtotal, source_type, source_id)
        VALUES ($1, $2, $3, NULL, $4, $5, $6, $7, 'prescription', $8)
        RETURNING *
      `, [
        invoiceId,
        rx.patient_id,
        rx.encounter_id || null,
        `Prescription: ${rx.medication_name} (Qty: ${qty})`,
        qty,
        unitPrice,
        subtotal,
        rx.id
      ]);

      invoiceItemId = newItem.rows[0].id;

      // Recalculate invoice total
      await client.query(`
        UPDATE invoices
        SET subtotal = (SELECT COALESCE(SUM(subtotal), 0) FROM invoice_items WHERE invoice_id = $1),
            total_amount = (SELECT COALESCE(SUM(subtotal), 0) FROM invoice_items WHERE invoice_id = $1),
            updated_at = NOW()
        WHERE id = $1
      `, [invoiceId]);

      // Billing event audit
      await client.query(`
        INSERT INTO billing_events
          (encounter_id, patient_id, invoice_id, invoice_item_id, event_type, event_id, amount, description, created_by)
        VALUES ($1, $2, $3, $4, 'prescription', $5, $6, $7, $8)
      `, [
        rx.encounter_id || null,
        rx.patient_id,
        invoiceId,
        invoiceItemId,
        rx.id,
        subtotal,
        `Dispensation billing for ${rx.medication_name}`,
        userId
      ]);
    }

    // 7. Update prescription record
    const updatedRxRes = await client.query(`
      UPDATE prescriptions
      SET quantity_dispensed = $1,
          status = $2,
          workflow_status = $3,
          is_dispensed = $4,
          dispensed_at = NOW(),
          dispensed_by = $5,
          invoice_id = COALESCE(invoice_id, $6),
          invoice_item_id = COALESCE(invoice_item_id, $7),
          updated_at = NOW()
      WHERE id = $8
      RETURNING *
    `, [newTotalDispensed, newStatus, newWorkflowStatus, isFullyDispensed, userId, invoiceId, invoiceItemId, rx.id]);

    // Attach invoice link to the new batch dispensations
    for (const alloc of allocations) {
      await client.query(`
        UPDATE batch_dispensations
        SET invoice_id = $1, invoice_item_id = $2
        WHERE id = $3
      `, [invoiceId, invoiceItemId, alloc.dispensationId]);
    }

    // 8. Workflow history
    await client.query(`
      INSERT INTO workflow_status_history (entity_type, entity_id, from_status, to_status, changed_by)
      VALUES ('prescription', $1, $2, $3, $4)
    `, [rx.id, rx.workflow_status || 'pending', newWorkflowStatus, userId]);

    // 9. In-app notification on full dispensing
    if (isFullyDispensed) {
      try {
        await client.query(`
          INSERT INTO notifications (user_id, patient_id, type, title, message)
          SELECT p.user_id, p.id, 'prescription', 'Prescription Dispensed',
                 'Your prescription for ' || $2 || ' has been fully dispensed by the pharmacy.'
          FROM patients p WHERE p.id = $1 AND p.user_id IS NOT NULL
        `, [rx.patient_id, rx.medication_name]);
      } catch (nErr) {
        console.error('Notification insert error (non-fatal):', nErr.message);
      }
    }

    await client.query('COMMIT');

    return {
      success: true,
      prescription: updatedRxRes.rows[0],
      allocations,
      quantityDispensedNow: qty,
      totalQuantityDispensed: newTotalDispensed,
      remainingQuantity: Math.max(0, totalPrescribed - newTotalDispensed),
      status: newStatus,
      isFullyDispensed,
      invoiceId,
      invoiceItemId
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Get detailed prescription view including patient, doctor, stock availability,
 * inventory batches (FEFO ordered), invoice link, and dispensing history.
 */
async function getPrescriptionDetails(prescriptionId) {
  // 1. Fetch prescription with patient, doctor, and department
  const rxRes = await pool.query(`
    SELECT 
      pr.*,
      p.first_name || ' ' || p.last_name AS patient_name,
      'AKEH-' || LPAD(p.id::text, 4, '0') AS patient_mrn,
      p.gender AS patient_gender,
      p.phone AS patient_phone,
      p.date_of_birth AS patient_dob,
      p.allergies AS patient_allergies_text,
      d.first_name || ' ' || d.last_name AS doctor_name,
      COALESCE(dept.name, 'General OPD') AS doctor_department,
      d.license_number AS doctor_license,
      m.id AS mapped_med_id,
      COALESCE(m.unit_price, 0) AS unit_price,
      COALESCE(m.unit, 'Unit') AS medication_unit,
      m.category AS medication_category,
      m.is_controlled,
      m.is_prescription_required,
      inv.id AS invoice_id,
      inv.status AS invoice_status,
      inv.total_amount AS invoice_total,
      u_disp.email AS dispensed_by_name
    FROM prescriptions pr
    JOIN patients p ON pr.patient_id = p.id
    JOIN doctors d ON pr.doctor_id = d.id
    LEFT JOIN departments dept ON d.department_id = dept.id
    LEFT JOIN medicines m ON (
      pr.medication_id = m.id 
      OR LOWER(m.name) = LOWER(pr.medication_name) 
      OR LOWER(m.generic_name) = LOWER(pr.medication_name)
    )
    LEFT JOIN invoices inv ON inv.id = pr.invoice_id
    LEFT JOIN users u_disp ON u_disp.id = pr.dispensed_by
    WHERE pr.id = $1
  `, [prescriptionId]);

  if (!rxRes.rows.length) {
    const err = new Error('Prescription not found');
    err.statusCode = 404;
    throw err;
  }

  const rx = rxRes.rows[0];
  const medId = rx.medication_id || rx.mapped_med_id;

  // 2. Fetch available inventory batches
  let batches = [];
  let totalStock = 0;
  if (medId) {
    const batchRes = await pool.query(`
      SELECT mb.*, 
             m.name AS medication_name, m.generic_name, m.unit
      FROM medication_batches mb
      JOIN medicines m ON m.id = mb.medication_id
      WHERE mb.medication_id = $1
        AND mb.status = 'active'
        AND mb.quantity_available > 0
      ORDER BY mb.expiry_date ASC, mb.id ASC
    `, [medId]);

    batches = batchRes.rows.map(b => {
      const expMeta = getExpiryMeta(b.expiry_date);
      let shelfStatus = 'VALID';
      if (expMeta.isExpired) shelfStatus = 'EXPIRED';
      else if (expMeta.isCriticalExpiry) shelfStatus = 'CRITICAL_NEAR_EXPIRY';
      else if (expMeta.isNearExpiry) shelfStatus = 'NEAR_EXPIRY';

      return {
        ...b,
        isExpired: expMeta.isExpired,
        daysUntilExpiry: expMeta.daysRemaining,
        shelfStatus
      };
    });

    totalStock = batches
      .filter(b => !b.isExpired)
      .reduce((sum, b) => sum + parseInt(b.quantity_available, 10), 0);
  }

  // 3. Fetch structured patient allergies
  const allergiesRes = await pool.query(`
    SELECT allergen_name, allergen_category, reaction_description, severity, verification_status
    FROM patient_allergies
    WHERE patient_id = $1
    ORDER BY recorded_date DESC
  `, [rx.patient_id]);

  // 4. Fetch dispensing history for this prescription
  const dispRes = await pool.query(`
    SELECT bd.*,
           u.email AS pharmacist_email,
           mb.batch_number AS lot_number,
           mb.expiry_date AS batch_expiry,
           inv.status AS invoice_status,
           inv.total_amount AS invoice_total
    FROM batch_dispensations bd
    LEFT JOIN users u ON u.id = bd.dispensed_by
    LEFT JOIN medication_batches mb ON mb.id = bd.batch_id
    LEFT JOIN invoices inv ON inv.id = bd.invoice_id
    WHERE bd.prescription_id = $1
    ORDER BY bd.dispensed_at DESC
  `, [prescriptionId]);

  const totalPrescribed = parseInt(rx.quantity, 10) || 1;
  const totalDispensed = parseInt(rx.quantity_dispensed, 10) || 0;
  const remaining = Math.max(0, totalPrescribed - totalDispensed);

  return {
    prescription: {
      ...rx,
      prescribedQuantity: totalPrescribed,
      dispensedQuantity: totalDispensed,
      remainingQuantity: remaining,
      stockAvailable: totalStock,
      isStockSufficient: totalStock >= remaining,
      isExpired: rx.expiry_date ? new Date(rx.expiry_date) < new Date().setHours(0,0,0,0) : false
    },
    batches,
    totalStockAvailable: totalStock,
    allergies: allergiesRes.rows,
    dispensingHistory: dispRes.rows
  };
}

/**
 * Retrieve all dispensations (hospital-wide audit history)
 */
async function getAllDispensations({
  page = 1,
  limit = 50,
  patientId,
  medicationId,
  pharmacistId,
  search
} = {}) {
  let query = `
    SELECT 
      bd.id AS dispensation_id,
      bd.prescription_id,
      bd.patient_id,
      p.first_name || ' ' || p.last_name AS patient_name,
      'AKEH-' || LPAD(p.id::text, 4, '0') AS patient_mrn,
      d.first_name || ' ' || d.last_name AS doctor_name,
      bd.dispensed_by AS pharmacist_id,
      u.email AS pharmacist_name,
      bd.medication_id,
      COALESCE(m.name, pr.medication_name) AS medication_name,
      bd.batch_number,
      COALESCE(bd.quantity_prescribed, pr.quantity, 1) AS quantity_prescribed,
      bd.quantity AS quantity_dispensed,
      bd.dispensed_at,
      bd.notes,
      bd.invoice_id,
      inv.status AS invoice_status
    FROM batch_dispensations bd
    JOIN patients p ON bd.patient_id = p.id
    JOIN prescriptions pr ON bd.prescription_id = pr.id
    JOIN doctors d ON pr.doctor_id = d.id
    LEFT JOIN medicines m ON bd.medication_id = m.id
    LEFT JOIN users u ON bd.dispensed_by = u.id
    LEFT JOIN invoices inv ON bd.invoice_id = inv.id
    WHERE 1=1
  `;
  const params = [];
  let idx = 1;

  if (patientId) {
    query += ` AND bd.patient_id = $${idx++}`;
    params.push(patientId);
  }
  if (medicationId) {
    query += ` AND bd.medication_id = $${idx++}`;
    params.push(medicationId);
  }
  if (pharmacistId) {
    query += ` AND bd.dispensed_by = $${idx++}`;
    params.push(pharmacistId);
  }
  if (search) {
    query += ` AND (
      p.first_name ILIKE $${idx} OR p.last_name ILIKE $${idx} OR
      d.first_name ILIKE $${idx} OR d.last_name ILIKE $${idx} OR
      COALESCE(m.name, pr.medication_name) ILIKE $${idx} OR
      bd.batch_number ILIKE $${idx}
    )`;
    params.push(`%${search}%`);
    idx++;
  }

  query += ` ORDER BY bd.dispensed_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
  params.push(limit, (page - 1) * limit);

  const result = await pool.query(query, params);
  return result.rows;
}

/**
 * Cancel a pending prescription
 */
async function cancelPrescription({ prescriptionId, reason, userId }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const rxRes = await client.query(
      'SELECT * FROM prescriptions WHERE id = $1 FOR UPDATE',
      [prescriptionId]
    );
    if (!rxRes.rows.length) {
      const err = new Error('Prescription not found');
      err.statusCode = 404;
      throw err;
    }
    const rx = rxRes.rows[0];

    if (rx.status === 'Dispensed' || rx.is_dispensed) {
      const err = new Error('Cannot cancel a prescription that has already been fully dispensed.');
      err.statusCode = 400;
      throw err;
    }

    const updated = await client.query(`
      UPDATE prescriptions
      SET status = 'Cancelled',
          workflow_status = 'cancelled',
          notes = CASE 
            WHEN notes IS NULL OR LENGTH(notes) = 0 THEN $1
            ELSE notes || ' | Cancel reason: ' || $1
          END,
          updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [reason || 'Prescription cancelled', prescriptionId]);

    await client.query(`
      INSERT INTO workflow_status_history (entity_type, entity_id, from_status, to_status, changed_by)
      VALUES ('prescription', $1, $2, 'cancelled', $3)
    `, [prescriptionId, rx.workflow_status || 'pending', userId]);

    await client.query('COMMIT');
    return updated.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  dispensePrescription,
  getPrescriptionDetails,
  getAllDispensations,
  cancelPrescription,
  getExpiryMeta
};
