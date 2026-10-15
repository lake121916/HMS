/**
 * Pharmacy & Batch Inventory Routes
 * Alem Ketema Enat Hospital Management System
 */

const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const fefoService = require('../services/fefoService');

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
    const { prescription_id, medication_id, quantity, notes } = req.body;

    let targetMedicationId = medication_id;
    let targetQuantity = parseInt(quantity, 10) || 1;

    // If prescription_id is provided, verify prescription and get medication_id
    if (prescription_id) {
      const rxRes = await pool.query(`
        SELECT pr.*, m.id AS matched_med_id
        FROM prescriptions pr
        LEFT JOIN medicines m ON (LOWER(m.name) = LOWER(pr.medication_name) OR LOWER(m.generic_name) = LOWER(pr.medication_name))
        WHERE pr.id = $1
      `, [prescription_id]);

      if (!rxRes.rows.length) {
        return res.status(404).json({ success: false, message: 'Prescription not found' });
      }

      const rx = rxRes.rows[0];
      if (rx.is_dispensed) {
        return res.status(400).json({ success: false, message: 'This prescription has already been dispensed.' });
      }

      if (!targetMedicationId) {
        if (!rx.matched_med_id) {
          // Try to look up by name
          const medLookup = await pool.query(
            'SELECT id FROM medicines WHERE name ILIKE $1 OR generic_name ILIKE $1 LIMIT 1',
            [`%${rx.medication_name}%`]
          );
          if (medLookup.rows.length) {
            targetMedicationId = medLookup.rows[0].id;
          } else {
            return res.status(400).json({
              success: false,
              message: `No medicine catalog entry found matching "${rx.medication_name}". Please map medication first.`
            });
          }
        } else {
          targetMedicationId = rx.matched_med_id;
        }
      }
    }

    if (!targetMedicationId) {
      return res.status(400).json({ success: false, message: 'medication_id is required' });
    }

    const allocationResult = await fefoService.allocateAndDispenseFEFO({
      prescriptionId: prescription_id ? parseInt(prescription_id, 10) : null,
      medicationId: parseInt(targetMedicationId, 10),
      quantityRequested: targetQuantity,
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
    res.status(400).json({ success: false, message: error.message });
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

module.exports = router;
