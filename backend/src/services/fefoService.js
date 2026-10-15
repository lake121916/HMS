/**
 * First Expired, First Out (FEFO) Inventory Allocation & Batch Management Service
 * Alem Ketema Enat Hospital Management System
 */

const pool = require('../config/database');

/**
 * Categorize batch expiry status
 * @param {string|Date} expiryDate 
 * @param {number} quantityAvailable 
 * @param {number} criticalThresholdDays 
 * @param {number} nearThresholdDays 
 */
function calculateBatchStatus(expiryDate, quantityAvailable, criticalThresholdDays = 30, nearThresholdDays = 90) {
  if (quantityAvailable <= 0) {
    return {
      status: 'OUT_OF_STOCK',
      daysUntilExpiry: 0,
      suggestedAction: 'Reorder stock immediately from pharmaceutical supplier'
    };
  }

  const now = new Date();
  const expiry = new Date(expiryDate);
  // Diff in UTC calendar days
  const diffTime = expiry.getTime() - now.getTime();
  const daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry <= 0) {
    return {
      status: 'EXPIRED',
      daysUntilExpiry,
      suggestedAction: 'QUARANTINE IMMEDIATELY: Do not dispense. Follow hospital expired disposal protocol.'
    };
  }

  if (daysUntilExpiry <= criticalThresholdDays) {
    return {
      status: 'CRITICAL_NEAR_EXPIRY',
      daysUntilExpiry,
      suggestedAction: 'CRITICAL PRIORITY: Dispense immediately via FEFO or notify clinical staff of low shelf life.'
    };
  }

  if (daysUntilExpiry <= nearThresholdDays) {
    return {
      status: 'NEAR_EXPIRY',
      daysUntilExpiry,
      suggestedAction: 'MONITOR: Ensure batch is positioned at front of pharmacy shelf for FEFO dispensing.'
    };
  }

  return {
    status: 'VALID',
    daysUntilExpiry,
    suggestedAction: 'Standard shelf storage. Safe for dispensing.'
  };
}

/**
 * Query eligible batches for a medication, ordered by earliest expiry (FEFO)
 */
async function getEligibleBatches(medicationId, dbClient = pool) {
  const result = await dbClient.query(`
    SELECT mb.*, m.name AS medication_name, m.generic_name
    FROM medication_batches mb
    JOIN medicines m ON m.id = mb.medication_id
    WHERE mb.medication_id = $1
      AND mb.status = 'active'
      AND mb.quantity_available > 0
      AND mb.expiry_date >= CURRENT_DATE
    ORDER BY mb.expiry_date ASC, mb.id ASC
  `, [medicationId]);

  return result.rows.map(batch => {
    const statusMeta = calculateBatchStatus(batch.expiry_date, batch.quantity_available);
    return {
      ...batch,
      ...statusMeta
    };
  });
}

/**
 * Execute FEFO allocation and dispense medication atomically
 * Row-level locking (FOR UPDATE) guarantees concurrency safety.
 */
async function allocateAndDispenseFEFO({
  prescriptionId,
  medicationId,
  quantityRequested,
  dispensedBy,
  notes,
  client: externalClient
}) {
  const client = externalClient || await pool.connect();
  const shouldManageTransaction = !externalClient;

  try {
    if (shouldManageTransaction) {
      await client.query('BEGIN');
    }

    // 1. Fetch eligible batches with row locks (FOR UPDATE)
    const batchesRes = await client.query(`
      SELECT mb.*, m.name AS medication_name
      FROM medication_batches mb
      JOIN medicines m ON m.id = mb.medication_id
      WHERE mb.medication_id = $1
        AND mb.status = 'active'
        AND mb.expiry_date >= CURRENT_DATE
        AND mb.quantity_available > 0
      ORDER BY mb.expiry_date ASC, mb.id ASC
      FOR UPDATE OF mb
    `, [medicationId]);

    const eligibleBatches = batchesRes.rows;
    const totalAvailable = eligibleBatches.reduce((acc, b) => acc + parseInt(b.quantity_available, 10), 0);

    if (totalAvailable < quantityRequested) {
      throw new Error(
        `Insufficient non-expired stock available. Requested: ${quantityRequested}, Available non-expired: ${totalAvailable}`
      );
    }

    // 2. Perform FEFO allocation
    let remainingToAllocate = quantityRequested;
    const allocations = [];

    for (const batch of eligibleBatches) {
      if (remainingToAllocate <= 0) break;

      const takeQty = Math.min(parseInt(batch.quantity_available, 10), remainingToAllocate);
      const newAvailable = parseInt(batch.quantity_available, 10) - takeQty;
      const newStatus = newAvailable === 0 ? 'depleted' : 'active';

      // Update batch quantity
      await client.query(`
        UPDATE medication_batches
        SET quantity_available = $1,
            status = $2,
            updated_at = NOW()
        WHERE id = $3
      `, [newAvailable, newStatus, batch.id]);

      // Record batch dispensation record
      const dispRes = await client.query(`
        INSERT INTO batch_dispensations (prescription_id, batch_id, quantity, dispensed_by, notes)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [prescriptionId || null, batch.id, takeQty, dispensedBy, notes || null]);

      // Record in traceable inventory ledger
      await client.query(`
        INSERT INTO inventory_ledger
          (batch_id, medication_id, movement_type, quantity_change, quantity_after, reason, authorized_by, reference_id)
        VALUES ($1, $2, 'dispensed', $3, $4, $5, $6, $7)
      `, [
        batch.id,
        medicationId,
        -takeQty,
        newAvailable,
        `FEFO dispensation for Rx #${prescriptionId || 'OTC'} (Batch: ${batch.batch_number})`,
        dispensedBy,
        prescriptionId ? `RX-${prescriptionId}` : 'OTC'
      ]);

      allocations.push({
        batchId: batch.id,
        batchNumber: batch.batch_number,
        expiryDate: batch.expiry_date,
        quantityAllocated: takeQty,
        remainingInBatch: newAvailable,
        dispensationId: dispRes.rows[0].id
      });

      remainingToAllocate -= takeQty;
    }

    // 3. Sync legacy inventory record if it exists
    await client.query(`
      UPDATE inventory
      SET quantity = GREATEST(0, quantity - $1),
          updated_at = NOW()
      WHERE medicine_id = $2
    `, [quantityRequested, medicationId]);

    // 4. Update prescription status if prescriptionId was provided
    if (prescriptionId) {
      await client.query(`
        UPDATE prescriptions
        SET is_dispensed = true,
            workflow_status = 'dispensed',
            updated_at = NOW()
        WHERE id = $1
      `, [prescriptionId]);
    }

    if (shouldManageTransaction) {
      await client.query('COMMIT');
    }

    return {
      success: true,
      medicationId,
      quantityRequested,
      allocations
    };
  } catch (error) {
    if (shouldManageTransaction) {
      await client.query('ROLLBACK');
    }
    throw error;
  } finally {
    if (shouldManageTransaction) {
      client.release();
    }
  }
}

/**
 * Receive a new medication batch into pharmacy inventory
 */
async function receiveBatch({
  medicationId,
  batchNumber,
  quantity,
  manufactureDate,
  expiryDate,
  supplierName,
  unitCost,
  storageLocation,
  receivedBy
}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Reject already expired batches
    const now = new Date();
    const expiry = new Date(expiryDate);
    if (expiry <= now) {
      throw new Error('Cannot receive an expired batch. Expiry date must be in the future.');
    }

    if (quantity <= 0) {
      throw new Error('Quantity received must be greater than zero.');
    }

    // Check if batch number already exists for this medication
    const existing = await client.query(`
      SELECT id, quantity_available FROM medication_batches
      WHERE medication_id = $1 AND batch_number = $2
    `, [medicationId, batchNumber]);

    let batchRecord;
    if (existing.rows.length) {
      // Add quantity to existing batch
      const updated = await client.query(`
        UPDATE medication_batches
        SET quantity_received = quantity_received + $1,
            quantity_available = quantity_available + $1,
            unit_cost = COALESCE($2, unit_cost),
            storage_location = COALESCE($3, storage_location),
            supplier_name = COALESCE($4, supplier_name),
            status = 'active',
            updated_at = NOW()
        WHERE id = $5
        RETURNING *
      `, [quantity, unitCost || null, storageLocation || null, supplierName || null, existing.rows[0].id]);
      batchRecord = updated.rows[0];
    } else {
      // Insert new batch
      const inserted = await client.query(`
        INSERT INTO medication_batches (
          medication_id, batch_number, quantity_received, quantity_available,
          manufacture_date, expiry_date, received_date, supplier_name,
          unit_cost, storage_location, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, $7, $8, $9, 'active')
        RETURNING *
      `, [
        medicationId, batchNumber, quantity, quantity,
        manufactureDate || null, expiryDate,
        supplierName || null, unitCost || 0.00, storageLocation || null
      ]);
      batchRecord = inserted.rows[0];
    }

    // Record in inventory ledger
    await client.query(`
      INSERT INTO inventory_ledger
        (batch_id, medication_id, movement_type, quantity_change, quantity_after, reason, authorized_by, reference_id)
      VALUES ($1, $2, 'received', $3, $4, $5, $6, $7)
    `, [
      batchRecord.id,
      medicationId,
      quantity,
      batchRecord.quantity_available,
      `Batch received: ${batchNumber} (${supplierName || 'Standard supplier'})`,
      receivedBy,
      `BATCH-${batchNumber}`
    ]);

    // Update legacy inventory table
    await client.query(`
      INSERT INTO inventory (medicine_id, quantity, reorder_level, batch_number, expiry_date, location, last_restocked_date)
      VALUES ($1, $2, 10, $3, $4, $5, NOW())
      ON CONFLICT (medicine_id, batch_number) DO UPDATE
        SET quantity = inventory.quantity + EXCLUDED.quantity,
            last_restocked_date = NOW()
    `, [medicationId, quantity, batchNumber, expiryDate, storageLocation || 'Main Pharmacy']);

    await client.query('COMMIT');
    return batchRecord;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Adjust stock of a batch with an authorized audit reason
 */
async function adjustBatchStock({
  batchId,
  quantityChange, // can be positive or negative
  reason,
  movementType = 'adjusted', // 'adjusted', 'damaged', 'expired', 'quarantined', 'returned'
  authorizedBy
}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const batchRes = await client.query(`
      SELECT * FROM medication_batches WHERE id = $1 FOR UPDATE
    `, [batchId]);

    if (!batchRes.rows.length) {
      throw new Error(`Batch ID ${batchId} not found.`);
    }

    const batch = batchRes.rows[0];
    const newQuantity = batch.quantity_available + quantityChange;

    if (newQuantity < 0) {
      throw new Error(`Adjustment would result in negative stock. Current: ${batch.quantity_available}, Change: ${quantityChange}`);
    }

    let newStatus = batch.status;
    if (newQuantity === 0) newStatus = 'depleted';
    if (movementType === 'quarantined' || movementType === 'expired') newStatus = 'quarantined';

    const updated = await client.query(`
      UPDATE medication_batches
      SET quantity_available = $1,
          status = $2,
          updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [newQuantity, newStatus, batchId]);

    // Record in ledger
    await client.query(`
      INSERT INTO inventory_ledger
        (batch_id, medication_id, movement_type, quantity_change, quantity_after, reason, authorized_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      batchId,
      batch.medication_id,
      movementType,
      quantityChange,
      newQuantity,
      reason,
      authorizedBy
    ]);

    await client.query('COMMIT');
    return updated.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get all expiry alerts and inventory categorization
 */
async function getExpiryAlerts({ criticalDays = 30, nearDays = 90 } = {}) {
  const result = await pool.query(`
    SELECT mb.*, m.name AS medication_name, m.generic_name, m.category, m.unit
    FROM medication_batches mb
    JOIN medicines m ON m.id = mb.medication_id
    ORDER BY mb.expiry_date ASC
  `);

  const categorized = {
    summary: {
      totalBatches: result.rows.length,
      expired: 0,
      criticalNearExpiry: 0,
      nearExpiry: 0,
      valid: 0,
      outOfStock: 0
    },
    batches: []
  };

  for (const batch of result.rows) {
    const meta = calculateBatchStatus(batch.expiry_date, batch.quantity_available, criticalDays, nearDays);
    const enriched = {
      ...batch,
      ...meta
    };

    if (meta.status === 'EXPIRED') categorized.summary.expired++;
    else if (meta.status === 'CRITICAL_NEAR_EXPIRY') categorized.summary.criticalNearExpiry++;
    else if (meta.status === 'NEAR_EXPIRY') categorized.summary.nearExpiry++;
    else if (meta.status === 'OUT_OF_STOCK') categorized.summary.outOfStock++;
    else categorized.summary.valid++;

    categorized.batches.push(enriched);
  }

  return categorized;
}

module.exports = {
  calculateBatchStatus,
  getEligibleBatches,
  allocateAndDispenseFEFO,
  receiveBatch,
  adjustBatchStock,
  getExpiryAlerts
};
