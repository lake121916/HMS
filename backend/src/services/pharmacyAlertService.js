/**
 * Automated Pharmacy Inventory & Expiry Alert Service
 * Alem Ketema Enat Hospital Management System
 */

const pool = require('../config/database');

/**
 * Evaluates active batches and medicine inventory levels, generating or updating persistent alerts
 */
async function evaluateInventoryAlerts(dbClient = pool) {
  let createdCount = 0;
  let updatedCount = 0;

  // 1. Evaluate Expiry on Active Medication Batches
  const batchRes = await dbClient.query(`
    SELECT mb.*, m.name AS medication_name, m.generic_name
    FROM medication_batches mb
    JOIN medicines m ON m.id = mb.medication_id
    WHERE mb.status = 'active' AND mb.quantity_available > 0
    ORDER BY mb.expiry_date ASC
  `);

  const now = new Date();

  for (const batch of batchRes.rows) {
    const expiry = new Date(batch.expiry_date);
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    let alertType = null;
    let severity = null;
    let message = '';
    let suggestedAction = '';

    if (diffDays <= 0) {
      alertType = 'expired';
      severity = 'critical';
      message = `Batch ${batch.batch_number} of ${batch.medication_name} expired on ${batch.expiry_date.toISOString().split('T')[0]} (${Math.abs(diffDays)} days ago) with ${batch.quantity_available} units remaining.`;
      suggestedAction = 'QUARANTINE IMMEDIATELY: Cease dispensing and move batch to quarantine disposal.';
    } else if (diffDays <= 60) {
      alertType = 'near_expiry';
      severity = diffDays <= 30 ? 'critical' : 'warning';
      message = `Batch ${batch.batch_number} of ${batch.medication_name} expires in ${diffDays} days (${batch.expiry_date.toISOString().split('T')[0]}) with ${batch.quantity_available} units on shelf.`;
      suggestedAction = 'Prioritize immediate FEFO dispensing or relocate to front shelf.';
    }

    if (alertType) {
      // Check for active unresolved alert
      const existing = await dbClient.query(
        `SELECT id FROM pharmacy_inventory_alerts 
         WHERE medication_id = $1 AND batch_id = $2 AND alert_type = $3 AND is_resolved = false
         ORDER BY id DESC LIMIT 1`,
        [batch.medication_id, batch.id, alertType]
      );

      if (existing.rows.length > 0) {
        await dbClient.query(
          `UPDATE pharmacy_inventory_alerts
           SET current_quantity = $1, days_until_expiry = $2, message = $3, suggested_action = $4, updated_at = NOW()
           WHERE id = $5`,
          [batch.quantity_available, diffDays, message, suggestedAction, existing.rows[0].id]
        );
        updatedCount++;
      } else {
        await dbClient.query(
          `INSERT INTO pharmacy_inventory_alerts (
            medication_id, batch_id, alert_type, severity, current_quantity,
            expiry_date, days_until_expiry, message, suggested_action
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            batch.medication_id,
            batch.id,
            alertType,
            severity,
            batch.quantity_available,
            batch.expiry_date,
            diffDays,
            message,
            suggestedAction
          ]
        );
        createdCount++;
      }
    }
  }

  // 2. Evaluate Low Stock Across Medicine Catalog
  const medRes = await dbClient.query(`
    SELECT m.id, m.name, m.generic_name,
           COALESCE(SUM(mb.quantity_available), 0) AS total_available,
           20 AS threshold
    FROM medicines m
    LEFT JOIN medication_batches mb ON mb.medication_id = m.id AND mb.status = 'active'
    GROUP BY m.id, m.name, m.generic_name
  `);

  for (const med of medRes.rows) {
    const stock = Number(med.total_available);
    const threshold = Number(med.threshold);

    let alertType = null;
    let severity = null;
    let message = '';
    let suggestedAction = '';

    if (stock <= 5) {
      alertType = 'low_stock';
      severity = 'critical';
      message = `Critical Shortage: ${med.name} stock level is ${stock} units (Critical minimum: 5).`;
      suggestedAction = 'Emergency pharmaceutical procurement requisition required immediately.';
    } else if (stock <= threshold) {
      alertType = 'low_stock';
      severity = 'warning';
      message = `Low Stock Alert: ${med.name} stock (${stock} units) is below minimum threshold (${threshold}).`;
      suggestedAction = 'Issue standard replenishment order to maintain clinical buffer.';
    }

    if (alertType) {
      const existing = await dbClient.query(
        `SELECT id FROM pharmacy_inventory_alerts 
         WHERE medication_id = $1 AND batch_id IS NULL AND alert_type = $2 AND is_resolved = false
         ORDER BY id DESC LIMIT 1`,
        [med.id, alertType]
      );

      if (existing.rows.length > 0) {
        await dbClient.query(
          `UPDATE pharmacy_inventory_alerts
           SET current_quantity = $1, threshold_quantity = $2, message = $3, suggested_action = $4, severity = $5, updated_at = NOW()
           WHERE id = $6`,
          [stock, threshold, message, suggestedAction, severity, existing.rows[0].id]
        );
        updatedCount++;
      } else {
        await dbClient.query(
          `INSERT INTO pharmacy_inventory_alerts (
            medication_id, batch_id, alert_type, severity, current_quantity,
            threshold_quantity, message, suggested_action
          )
          VALUES ($1, NULL, $2, $3, $4, $5, $6, $7)`,
          [med.id, alertType, severity, stock, threshold, message, suggestedAction]
        );
        createdCount++;
      }
    }
  }

  return {
    evaluatedCount: batchRes.rows.length + medRes.rows.length,
    alertsCreated: createdCount,
    alertsUpdated: updatedCount
  };
}

/**
 * Retrieve active pharmacy alerts with optional filtering
 */
async function getActiveAlerts({ severity, alertType, unacknowledgedOnly = false } = {}, dbClient = pool) {
  let query = `
    SELECT pia.*,
           m.name AS medication_name,
           m.generic_name,
           m.category,
           mb.batch_number,
           u.first_name || ' ' || u.last_name AS acknowledged_by_name
    FROM pharmacy_inventory_alerts pia
    LEFT JOIN medicines m ON m.id = pia.medication_id
    LEFT JOIN medication_batches mb ON mb.id = pia.batch_id
    LEFT JOIN users u ON u.id = pia.acknowledged_by
    WHERE pia.is_resolved = false
  `;
  const params = [];
  let idx = 1;

  if (severity) {
    query += ` AND pia.severity = $${idx++}`;
    params.push(severity);
  }
  if (alertType) {
    query += ` AND pia.alert_type = $${idx++}`;
    params.push(alertType);
  }
  if (unacknowledgedOnly) {
    query += ` AND pia.is_acknowledged = false`;
  }

  query += `
    ORDER BY 
      CASE pia.severity 
        WHEN 'critical' THEN 1 
        WHEN 'warning' THEN 2 
        ELSE 3 
      END ASC,
      pia.created_at DESC
  `;

  const res = await dbClient.query(query, params);
  return res.rows;
}

/**
 * Acknowledge an inventory alert by a pharmacist/admin user
 */
async function acknowledgeAlert(alertId, userId, dbClient = pool) {
  const res = await dbClient.query(
    `UPDATE pharmacy_inventory_alerts
     SET is_acknowledged = true,
         acknowledged_by = $1,
         acknowledged_at = NOW(),
         updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [userId, alertId]
  );

  if (res.rows.length === 0) {
    throw new Error(`Alert #${alertId} not found`);
  }
  return res.rows[0];
}

/**
 * Quarantine an expired or defective medication batch
 */
async function quarantineExpiredBatch({ batchId, userId, reason }, dbClient = pool) {
  const batchRes = await dbClient.query(
    `SELECT mb.*, m.name AS medication_name 
     FROM medication_batches mb 
     JOIN medicines m ON m.id = mb.medication_id
     WHERE mb.id = $1`,
    [batchId]
  );

  if (batchRes.rows.length === 0) {
    throw new Error(`Batch #${batchId} not found`);
  }

  const batch = batchRes.rows[0];
  const oldQty = batch.quantity_available;

  // 1. Mark batch quarantined
  await dbClient.query(
    `UPDATE medication_batches
     SET status = 'quarantined', quantity_available = 0, updated_at = NOW()
     WHERE id = $1`,
    [batchId]
  );

  // 2. Insert ledger movement if stock was removed
  if (oldQty > 0) {
    await dbClient.query(
      `INSERT INTO inventory_ledger (
        medication_id, batch_id, movement_type, quantity_change,
        quantity_after, reason, reference_id, authorized_by, created_at
      )
      VALUES ($1, $2, 'quarantined', $3, 0, $4, 'quarantine', $5, NOW())`,
      [
        batch.medication_id,
        batch.id,
        -oldQty,
        reason || 'Batch quarantined due to expiration/clinical safety hold',
        userId
      ]
    );
  }

  // 3. Mark existing alert resolved
  await dbClient.query(
    `UPDATE pharmacy_inventory_alerts
     SET is_resolved = true, updated_at = NOW()
     WHERE batch_id = $1 AND alert_type IN ('expired', 'near_expiry')`,
    [batchId]
  );

  // 4. Create quarantine notice alert
  await dbClient.query(
    `INSERT INTO pharmacy_inventory_alerts (
      medication_id, batch_id, alert_type, severity, current_quantity,
      message, suggested_action, is_acknowledged, acknowledged_by, acknowledged_at, is_resolved
    )
    VALUES ($1, $2, 'quarantined', 'info', 0, $3, 'Batch placed in physical quarantine bin pending safe disposal.', true, $4, NOW(), true)`,
    [
      batch.medication_id,
      batch.id,
      `Batch ${batch.batch_number} of ${batch.medication_name} quarantined (${oldQty} units removed from active inventory). Reason: ${reason || 'Expired'}.`,
      userId
    ]
  );

  return {
    success: true,
    batchId,
    batchNumber: batch.batch_number,
    quarantinedQuantity: oldQty,
    message: `Batch ${batch.batch_number} successfully quarantined`
  };
}

module.exports = {
  evaluateInventoryAlerts,
  getActiveAlerts,
  acknowledgeAlert,
  quarantineExpiredBatch
};
