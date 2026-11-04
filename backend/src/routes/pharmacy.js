/**
 * Pharmacy & Batch Inventory Routes
 * Alem Ketema Enat Hospital Management System
 */

const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const fefoService = require('../services/fefoService');
const dispensingService = require('../services/dispensingService');

// ── 1. GET all batches (with filters for medication, status, expiry) ──────────
router.get('/batches', authenticate, async (req, res) => {
  try {
    const { medication_id, status, filter } = req.query;
    let query = `
      SELECT mb.*, m.name AS medication_name, m.generic_name, m.category, m.unit, m.unit_price
      FROM medication_batches mb
      JOIN medicines m ON m.id = mb.medication_id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (medication_id) {
      query += ` AND mb.medication_id = $${idx++}`;
      params.push(medication_id);
    }
    if (status) {
      query += ` AND mb.status = $${idx++}`;
      params.push(status);
    }

    query += ' ORDER BY mb.expiry_date ASC, mb.batch_number ASC';

    const result = await pool.query(query, params);
    
    // Enrich with dynamic FEFO status
    let batches = result.rows.map(b => {
      const statusMeta = fefoService.calculateBatchStatus(b.expiry_date, b.quantity_available);
      return { ...b, ...statusMeta };
    });

    // Optional frontend filter
    if (filter === 'expired') {
      batches = batches.filter(b => b.status === 'EXPIRED');
    } else if (filter === 'near_expiry') {
      batches = batches.filter(b => b.status === 'CRITICAL_NEAR_EXPIRY' || b.status === 'NEAR_EXPIRY');
    } else if (filter === 'out_of_stock') {
      batches = batches.filter(b => b.status === 'OUT_OF_STOCK');
    } else if (filter === 'valid') {
      batches = batches.filter(b => b.status === 'VALID');
    }

    res.json({ success: true, data: { batches } });
  } catch (error) {
    console.error('Error fetching batches:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// ── 2. GET single batch details & history ─────────────────────────────────────
router.get('/batches/:id', authenticate, async (req, res) => {
  try {
    const batchRes = await pool.query(`
      SELECT mb.*, m.name AS medication_name, m.generic_name, m.category, m.unit, m.unit_price
      FROM medication_batches mb
      JOIN medicines m ON m.id = mb.medication_id
      WHERE mb.id = $1
    `, [req.params.id]);

    if (!batchRes.rows.length) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }

    const batch = batchRes.rows[0];
    const statusMeta = fefoService.calculateBatchStatus(batch.expiry_date, batch.quantity_available);

    // Fetch dispensation history
    const dispRes = await pool.query(`
      SELECT bd.*, u.email AS dispensed_by_email,
             p.first_name || ' ' || p.last_name AS patient_name
      FROM batch_dispensations bd
      LEFT JOIN users u ON u.id = bd.dispensed_by
      LEFT JOIN prescriptions pr ON pr.id = bd.prescription_id
      LEFT JOIN patients p ON p.id = pr.patient_id
      WHERE bd.batch_id = $1
      ORDER BY bd.dispensed_at DESC
    `, [req.params.id]);

    // Fetch ledger movements
    const ledgerRes = await pool.query(`
      SELECT il.*, u.email AS authorized_by_email
      FROM inventory_ledger il
      LEFT JOIN users u ON u.id = il.authorized_by
      WHERE il.batch_id = $1
      ORDER BY il.created_at DESC
    `, [req.params.id]);

    res.json({
      success: true,
      data: {
        batch: { ...batch, ...statusMeta },
        dispensations: dispRes.rows,
        ledger: ledgerRes.rows
      }
    });
  } catch (error) {
    console.error('Error fetching batch details:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── 3. POST receive new medication batch ──────────────────────────────────────
router.post('/batches', authenticate, authorize('pharmacist', 'admin', 'super_admin'), async (req, res) => {
  try {
    const {
      medication_id,
      batch_number,
      quantity,
      manufacture_date,
      expiry_date,
      supplier_name,
      unit_cost,
      storage_location
    } = req.body;

    if (!medication_id || !batch_number || !quantity || !expiry_date) {
      return res.status(400).json({
        success: false,
        message: 'medication_id, batch_number, quantity, and expiry_date are required'
      });
    }

    const batch = await fefoService.receiveBatch({
      medicationId: parseInt(medication_id, 10),
      batchNumber: batch_number.trim(),
      quantity: parseInt(quantity, 10),
      manufactureDate: manufacture_date || null,
      expiryDate: expiry_date,
      supplierName: supplier_name || null,
      unitCost: parseFloat(unit_cost) || 0,
      storageLocation: storage_location || 'Main Pharmacy',
      receivedBy: req.user.id
    });

    res.status(201).json({
      success: true,
      message: `Batch ${batch.batch_number} received successfully with ${batch.quantity_available} units.`,
      data: { batch }
    });
  } catch (error) {
    console.error('Error receiving batch:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// ── 4. POST dispense medication using FEFO ────────────────────────────────────
router.post('/dispense', authenticate, authorize('pharmacist', 'admin', 'super_admin'), async (req, res) => {
  try {
    const { prescription_id, medication_id, quantity, batch_id, notes } = req.body;

    if (prescription_id) {
      const dispResult = await dispensingService.dispensePrescription({
        prescriptionId: parseInt(prescription_id, 10),
        quantityToDispense: quantity !== undefined ? parseInt(quantity, 10) : undefined,
        batchId: batch_id ? parseInt(batch_id, 10) : undefined,
        notes: notes || null,
        userId: req.user.id
      });

      return res.json({
        success: true,
        message: dispResult.isFullyDispensed
          ? `Prescription fully dispensed (${dispResult.quantityDispensedNow} units).`
          : `Prescription partially dispensed (${dispResult.quantityDispensedNow} units). Remaining: ${dispResult.remainingQuantity}.`,
        data: dispResult
      });
    }

    if (!medication_id) {
      return res.status(400).json({ success: false, message: 'medication_id or prescription_id is required' });
    }

    const allocationResult = await fefoService.allocateAndDispenseFEFO({
      prescriptionId: null,
      medicationId: parseInt(medication_id, 10),
      quantityRequested: parseInt(quantity, 10) || 1,
      dispensedBy: req.user.id,
      notes: notes || null
    });

    res.json({
      success: true,
      message: 'Medication dispensed successfully via FEFO.',
      data: allocationResult
    });
  } catch (error) {
    console.error('Error dispensing medication:', error);
    const status = error.statusCode || 400;
    res.status(status).json({ success: false, message: error.message });
  }
});

// ── 5. POST adjust batch stock ────────────────────────────────────────────────
router.post('/stock-adjustments', authenticate, authorize('pharmacist', 'admin', 'super_admin'), async (req, res) => {
  try {
    const { batch_id, quantity_change, reason, movement_type } = req.body;

    if (!batch_id || quantity_change === undefined || !reason) {
      return res.status(400).json({
        success: false,
        message: 'batch_id, quantity_change, and reason are required'
      });
    }

    const updatedBatch = await fefoService.adjustBatchStock({
      batchId: parseInt(batch_id, 10),
      quantityChange: parseInt(quantity_change, 10),
      reason: reason.trim(),
      movementType: movement_type || 'adjusted',
      authorizedBy: req.user.id
    });

    res.json({
      success: true,
      message: 'Stock adjusted successfully.',
      data: { batch: updatedBatch }
    });
  } catch (error) {
    console.error('Error adjusting stock:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// ── 6. GET expiry alerts dashboard ───────────────────────────────────────────
router.get('/expiry-alerts', authenticate, async (req, res) => {
  try {
    const criticalDays = parseInt(req.query.critical_days, 10) || 30;
    const nearDays = parseInt(req.query.near_days, 10) || 90;

    const alerts = await fefoService.getExpiryAlerts({ criticalDays, nearDays });
    res.json({ success: true, data: alerts });
  } catch (error) {
    console.error('Error fetching expiry alerts:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── 7. GET inventory movement ledger ─────────────────────────────────────────
router.get('/ledger', authenticate, authorize('pharmacist', 'admin', 'super_admin', 'auditor'), async (req, res) => {
  try {
    const { medication_id, limit = 100 } = req.query;
    let query = `
      SELECT il.*, m.name AS medication_name, mb.batch_number, u.email AS authorized_by_email
      FROM inventory_ledger il
      JOIN medicines m ON m.id = il.medication_id
      LEFT JOIN medication_batches mb ON mb.id = il.batch_id
      LEFT JOIN users u ON u.id = il.authorized_by
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (medication_id) {
      query += ` AND il.medication_id = $${idx++}`;
      params.push(medication_id);
    }

    query += ` ORDER BY il.created_at DESC LIMIT $${idx++}`;
    params.push(limit);

    const result = await pool.query(query, params);
    res.json({ success: true, data: { ledger: result.rows } });
  } catch (error) {
    console.error('Error fetching ledger:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── 8. Pharmacy Persistent Alerts & Quarantine Routes ─────────────────────────
const alertService = require('../services/pharmacyAlertService');

// GET /api/pharmacy/inventory/alerts
router.get('/inventory/alerts', authenticate, async (req, res) => {
  try {
    const { severity, alert_type, unacknowledged_only } = req.query;
    const alerts = await alertService.getActiveAlerts({
      severity,
      alertType: alert_type,
      unacknowledgedOnly: unacknowledged_only === 'true'
    });
    res.json({ success: true, data: { alerts, total: alerts.length } });
  } catch (error) {
    console.error('Error fetching inventory alerts:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/pharmacy/inventory/evaluate-alerts — Trigger fresh evaluation
router.post('/inventory/evaluate-alerts', authenticate, authorize('pharmacist', 'admin', 'super_admin'), async (req, res) => {
  try {
    const summary = await alertService.evaluateInventoryAlerts();
    res.json({ success: true, message: 'Inventory alert evaluation complete', data: summary });
  } catch (error) {
    console.error('Error evaluating inventory alerts:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/pharmacy/inventory/alerts/:id/acknowledge — Acknowledge an alert
router.patch('/inventory/alerts/:id/acknowledge', authenticate, authorize('pharmacist', 'admin', 'super_admin'), async (req, res) => {
  try {
    const alertId = parseInt(req.params.id, 10);
    const updatedAlert = await alertService.acknowledgeAlert(alertId, req.user.id);
    res.json({ success: true, message: 'Alert acknowledged', data: { alert: updatedAlert } });
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/pharmacy/inventory/batches/:id/quarantine — Quarantine expired batch
router.post('/inventory/batches/:id/quarantine', authenticate, authorize('pharmacist', 'admin', 'super_admin'), async (req, res) => {
  try {
    const batchId = parseInt(req.params.id, 10);
    const { reason } = req.body;
    const result = await alertService.quarantineExpiredBatch({
      batchId,
      userId: req.user.id,
      reason
    });
    res.json(result);
  } catch (error) {
    console.error('Error quarantining batch:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// ── 9. Point of Sale (POS) & Walk-In OTC Dispensing ─────────────────────────
// GET /api/pharmacy/sales
router.get('/sales', authenticate, async (req, res) => {
  try {
    const { limit = 50, date } = req.query;
    let dateFilter = '';
    const params = [limit];

    if (date) {
      dateFilter = 'WHERE DATE(s.created_at) = $2';
      params.push(date);
    }

    const salesRes = await pool.query(`
      SELECT s.*, u.first_name || ' ' || u.last_name AS dispensed_by_name
      FROM pharmacy_sales s
      LEFT JOIN users u ON u.id = s.dispensed_by
      ${dateFilter}
      ORDER BY s.created_at DESC
      LIMIT $1
    `, params);

    const sales = salesRes.rows;
    // Attach items
    if (sales.length) {
      const saleIds = sales.map(s => s.id);
      const itemsRes = await pool.query(`
        SELECT * FROM pharmacy_sale_items WHERE sale_id = ANY($1)
      `, [saleIds]);

      const itemsBySale = {};
      itemsRes.rows.forEach(item => {
        if (!itemsBySale[item.sale_id]) itemsBySale[item.sale_id] = [];
        itemsBySale[item.sale_id].push(item);
      });

      sales.forEach(s => {
        s.items = itemsBySale[s.id] || [];
      });
    }

    // Summary stats
    const statsRes = await pool.query(`
      SELECT
        COUNT(*) AS total_sales_today,
        COALESCE(SUM(final_amount), 0) AS total_revenue_today
      FROM pharmacy_sales
      WHERE DATE(created_at) = CURRENT_DATE
    `);

    res.json({
      success: true,
      data: {
        sales,
        summary: {
          todaySalesCount: parseInt(statsRes.rows[0].total_sales_today, 10),
          todayRevenueETB: parseFloat(statsRes.rows[0].total_revenue_today)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching pharmacy sales:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/pharmacy/sales — Process Direct OTC Sale
router.post('/sales', authenticate, authorize('pharmacist', 'cashier', 'admin', 'super_admin'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const {
      customer_name,
      customer_phone,
      patient_id,
      items, // [{ medication_id, quantity }]
      payment_method = 'cash',
      dispensed_counter = 'Pharmacy 1',
      notes
    } = req.body;

    if (!customer_name || !items || !items.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'customer_name and at least one item are required' });
    }

    // Generate unique receipt number
    const countRes = await client.query('SELECT COUNT(*) FROM pharmacy_sales WHERE DATE(created_at) = CURRENT_DATE');
    const seq = parseInt(countRes.rows[0].count, 10) + 1;
    const year = new Date().getFullYear();
    const receiptNumber = `POS-${year}-${String(seq).padStart(4, '0')}`;

    let totalAmount = 0;
    const processedItems = [];

    for (const item of items) {
      const medRes = await client.query('SELECT * FROM medicines WHERE id = $1', [item.medication_id]);
      if (!medRes.rows.length) {
        throw new Error(`Medicine with ID ${item.medication_id} not found.`);
      }
      const med = medRes.rows[0];
      const unitPrice = parseFloat(med.unit_price) || 0;
      const qty = parseInt(item.quantity, 10) || 1;
      const lineTotal = unitPrice * qty;
      totalAmount += lineTotal;

      // Find earliest available batch via FEFO
      const batchRes = await client.query(`
        SELECT * FROM medication_batches
        WHERE medication_id = $1 AND status = 'active' AND expiry_date > CURRENT_DATE AND quantity_available > 0
        ORDER BY expiry_date ASC
        LIMIT 1 FOR UPDATE
      `, [item.medication_id]);

      let batchId = null;
      if (batchRes.rows.length) {
        const batch = batchRes.rows[0];
        batchId = batch.id;
        const newAvailable = Math.max(0, batch.quantity_available - qty);
        await client.query(`
          UPDATE medication_batches
          SET quantity_available = $1,
              status = CASE WHEN $1 = 0 THEN 'depleted' ELSE status END,
              updated_at = NOW()
          WHERE id = $2
        `, [newAvailable, batch.id]);

        // Record in inventory_ledger
        await client.query(`
          INSERT INTO inventory_ledger
            (medication_id, batch_id, movement_type, quantity, reference_id, authorized_by, notes)
          VALUES
            ($1, $2, 'dispensed', $3, $4, $5, 'Direct OTC Walk-in Sale')
        `, [med.id, batch.id, -qty, receiptNumber, req.user.id]);
      }

      processedItems.push({
        medication_id: med.id,
        batch_id: batchId,
        medication_name: med.name,
        unit_price: unitPrice,
        quantity: qty,
        total_price: lineTotal
      });
    }

    // Insert sales record
    const saleInsert = await client.query(`
      INSERT INTO pharmacy_sales
        (sale_receipt_number, customer_name, customer_phone, patient_id, total_amount, discount_amount,
         final_amount, payment_method, payment_status, dispensed_by, dispensed_counter, notes)
      VALUES
        ($1, $2, $3, $4, $5, 0, $5, $6, 'paid', $7, $8, $9)
      RETURNING *
    `, [
      receiptNumber,
      customer_name,
      customer_phone || null,
      patient_id || null,
      totalAmount,
      payment_method,
      req.user.id,
      dispensed_counter,
      notes || null
    ]);

    const createdSale = saleInsert.rows[0];

    // Insert sale items
    for (const pi of processedItems) {
      await client.query(`
        INSERT INTO pharmacy_sale_items
          (sale_id, medication_id, batch_id, medication_name, unit_price, quantity, total_price)
        VALUES
          ($1, $2, $3, $4, $5, $6, $7)
      `, [createdSale.id, pi.medication_id, pi.batch_id, pi.medication_name, pi.unit_price, pi.quantity, pi.total_price]);
    }

    await client.query('COMMIT');

    createdSale.items = processedItems;

    res.status(201).json({
      success: true,
      message: `Direct sale ${receiptNumber} completed successfully.`,
      data: { sale: createdSale }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error processing pharmacy sale:', error);
    res.status(400).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
});

// ── 10. Controlled Substances / Narcotics Register ───────────────────────────
// GET /api/pharmacy/controlled-substances
router.get('/controlled-substances', authenticate, authorize('pharmacist', 'doctor', 'admin', 'super_admin'), async (req, res) => {
  try {
    const logsRes = await pool.query(`
      SELECT csl.*, u.first_name || ' ' || u.last_name AS dispensed_by_name
      FROM controlled_substances_log csl
      LEFT JOIN users u ON u.id = csl.dispensed_by
      ORDER BY csl.dispensed_at DESC
      LIMIT 100
    `);

    // Safe inventory summary of controlled medicines
    const safeRes = await pool.query(`
      SELECT m.id, m.name, m.generic_name, m.unit,
             COALESCE(SUM(mb.quantity_available), 0) AS safe_balance
      FROM medicines m
      LEFT JOIN medication_batches mb ON mb.medication_id = m.id AND mb.status = 'active'
      WHERE m.is_controlled = true
      GROUP BY m.id, m.name, m.generic_name, m.unit
      ORDER BY m.name ASC
    `);

    res.json({
      success: true,
      data: {
        logs: logsRes.rows,
        safeInventory: safeRes.rows
      }
    });
  } catch (error) {
    console.error('Error fetching controlled substances:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/pharmacy/controlled-substances — Log Administration / Dispensation
router.post('/controlled-substances', authenticate, authorize('pharmacist', 'doctor', 'admin', 'super_admin'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const {
      medication_id,
      patient_id,
      patient_name,
      patient_mrn,
      prescribing_doctor_id,
      doctor_name,
      doctor_license_number,
      indication,
      quantity_prescribed,
      quantity_dispensed,
      unit = 'ampoules',
      witness_name,
      witness_role,
      notes
    } = req.body;

    if (!medication_id || !patient_name || !quantity_dispensed || !doctor_name) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'medication, patient, doctor, and quantity are required' });
    }

    const medRes = await client.query('SELECT * FROM medicines WHERE id = $1', [medication_id]);
    if (!medRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Medicine not found' });
    }
    const med = medRes.rows[0];

    // Find batch
    const batchRes = await client.query(`
      SELECT * FROM medication_batches
      WHERE medication_id = $1 AND status = 'active' AND quantity_available > 0
      ORDER BY expiry_date ASC
      LIMIT 1 FOR UPDATE
    `, [medication_id]);

    const batch = batchRes.rows[0];
    const qty = parseFloat(quantity_dispensed);
    let balanceRemaining = 0;
    let batchNumber = 'SAFE-STOCK';
    let batchId = null;

    if (batch) {
      batchId = batch.id;
      batchNumber = batch.batch_number;
      balanceRemaining = Math.max(0, batch.quantity_available - qty);
      await client.query(`
        UPDATE medication_batches
        SET quantity_available = $1,
            status = CASE WHEN $1 = 0 THEN 'depleted' ELSE status END,
            updated_at = NOW()
        WHERE id = $2
      `, [balanceRemaining, batch.id]);
    }

    // Generate unique log number
    const countRes = await client.query('SELECT COUNT(*) FROM controlled_substances_log');
    const logNumber = `CSL-${new Date().getFullYear()}-${String(parseInt(countRes.rows[0].count, 10) + 1).padStart(4, '0')}`;

    const insertRes = await client.query(`
      INSERT INTO controlled_substances_log
        (log_number, medication_id, medication_name, batch_id, batch_number, patient_id, patient_name,
         patient_mrn, prescribing_doctor_id, doctor_name, doctor_license_number, indication,
         quantity_prescribed, quantity_dispensed, unit, balance_remaining, dispensed_by,
         witness_name, witness_role, status, notes)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, 'dispensed', $20)
      RETURNING *
    `, [
      logNumber,
      med.id,
      med.name,
      batchId,
      batchNumber,
      patient_id || null,
      patient_name,
      patient_mrn || 'AKEH-GEN',
      prescribing_doctor_id || null,
      doctor_name,
      doctor_license_number || 'ETH-MD-ACTIVE',
      indication || 'Severe Clinical Pain / Trauma',
      parseFloat(quantity_prescribed || quantity_dispensed),
      qty,
      unit,
      balanceRemaining,
      req.user.id,
      witness_name || 'Senior Nurse On Duty',
      witness_role || 'Witness Clinical Staff',
      notes || null
    ]);

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: `Controlled substance recorded under ${logNumber}.`,
      data: { log: insertRes.rows[0] }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error logging controlled substance:', error);
    res.status(400).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
});

// ── 11. Prescription Dispensing Label Generator ──────────────────────────────
// GET /api/pharmacy/prescriptions/:id/label
router.get('/prescriptions/:id/label', authenticate, async (req, res) => {
  try {
    const rxRes = await pool.query(`
      SELECT pr.*, 
             p.first_name || ' ' || p.last_name AS patient_name,
             p.date_of_birth, p.gender,
             doc.first_name || ' ' || doc.last_name AS doctor_name,
             doc.specialization,
             d.name AS department_name
      FROM prescriptions pr
      JOIN patients p ON p.id = pr.patient_id
      LEFT JOIN doctors doc ON doc.id = pr.doctor_id
      LEFT JOIN departments d ON d.id = doc.department_id
      WHERE pr.id = $1
    `, [req.params.id]);

    if (!rxRes.rows.length) {
      return res.status(404).json({ success: false, message: 'Prescription not found' });
    }

    const rx = rxRes.rows[0];

    // Label formatted data
    const labelData = {
      hospitalName: 'Alem Ketema Enat Hospital',
      pharmacyName: 'Central Dispensary & Outpatient Pharmacy',
      phone: '+251 11 681 2044',
      prescriptionNumber: `RX-${String(rx.id).padStart(6, '0')}`,
      date: new Date().toLocaleDateString('en-GB'),
      patientName: rx.patient_name,
      gender: rx.gender,
      medicationName: rx.medication_name,
      dosage: rx.dosage,
      frequency: rx.frequency,
      duration: rx.duration,
      instructions: rx.instructions,
      instructionsAmharic: rx.instructions ? (
        rx.instructions.toLowerCase().includes('food') ? 'ከምግብ ጋር ይወሰድ' :
        rx.instructions.toLowerCase().includes('night') ? 'ማታ ከመኝታ በፊት ይወሰድ' :
        'እንደ ሀኪሙ ትዕዛዝ በጥንቃቄ ይወሰድ'
      ) : 'እንደ ሀኪሙ ትዕዛዝ በጥንቃቄ ይወሰድ',
      doctorName: rx.doctor_name ? `Dr. ${rx.doctor_name}` : 'Attending Physician',
      dispensedBy: req.user.username || 'Authorized Pharmacist',
      precautions: 'Keep out of reach of children. Store in a cool, dry place away from direct sunlight.',
      counterStation: 'Pharmacy Counter 1'
    };

    res.json({ success: true, data: labelData });
  } catch (error) {
    console.error('Error generating prescription label:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── 12. Clinical Safety & Drug-Drug / Allergy Checker ────────────────────────
// POST /api/pharmacy/safety-check
router.post('/safety-check', authenticate, async (req, res) => {
  try {
    const { patient_id, medication_name } = req.body;
    const warnings = [];

    if (patient_id && medication_name) {
      // 1. Check patient allergies
      const allergyRes = await pool.query(`
        SELECT allergen, severity, reaction
        FROM patient_allergies
        WHERE patient_id = $1 AND (
          LOWER(allergen) LIKE LOWER($2) OR LOWER($2) LIKE '%' || LOWER(allergen) || '%'
        )
      `, [patient_id, `%${medication_name}%`]);

      if (allergyRes.rows.length) {
        allergyRes.rows.forEach(a => {
          warnings.push({
            type: 'allergy',
            severity: a.severity || 'high',
            message: `CRITICAL ALLERGY: Patient has recorded allergy to "${a.allergen}" (${a.severity}). Reaction: ${a.reaction || 'Unknown'}.`
          });
        });
      }

      // 2. Check active concurrent prescriptions for interactions
      const concurrentRes = await pool.query(`
        SELECT medication_name FROM prescriptions
        WHERE patient_id = $1 AND is_dispensed = true AND prescribed_date >= CURRENT_DATE - INTERVAL '14 days'
      `, [patient_id]);

      const activeMeds = concurrentRes.rows.map(r => r.medication_name.toLowerCase());
      const lowerMed = medication_name.toLowerCase();

      // Common significant interaction pairs
      if (lowerMed.includes('warfarin') && activeMeds.some(m => m.includes('aspirin') || m.includes('ibuprofen'))) {
        warnings.push({
          type: 'interaction',
          severity: 'high',
          message: 'MAJOR DRUG INTERACTION: Warfarin with NSAIDs (Aspirin/Ibuprofen) significantly increases bleeding risk.'
        });
      }
      if (lowerMed.includes('ciprofloxacin') && activeMeds.some(m => m.includes('theophylline') || m.includes('antacid'))) {
        warnings.push({
          type: 'interaction',
          severity: 'moderate',
          message: 'MODERATE INTERACTION: Ciprofloxacin absorption reduced by concurrent cation antacids.'
        });
      }
      if (lowerMed.includes('metronidazole') && activeMeds.some(m => m.includes('alcohol') || m.includes('warfarin'))) {
        warnings.push({
          type: 'interaction',
          severity: 'high',
          message: 'SEVERE INTERACTION: Metronidazole potentiates anticoagulant effects of Warfarin.'
        });
      }
    }

    res.json({
      success: true,
      data: {
        safe: warnings.length === 0,
        warningsCount: warnings.length,
        warnings
      }
    });
  } catch (error) {
    console.error('Safety check error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
