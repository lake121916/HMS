/**
 * Procedure orders route — with automatic billing
 */
const express = require('express');
const router  = express.Router();
const pool    = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const billing = require('../services/billingService');

// GET all procedure orders
router.get('/', authenticate, async (req, res) => {
  try {
    const { patient_id, encounter_id, status } = req.query;
    let where = 'WHERE 1=1';
    const params = []; let idx = 1;
    if (patient_id) { where += ` AND po.patient_id=$${idx++}`; params.push(patient_id); }
    if (encounter_id) { where += ` AND po.encounter_id=$${idx++}`; params.push(encounter_id); }
    if (status) { where += ` AND po.status=$${idx++}`; params.push(status); }

    const result = await pool.query(`
      SELECT po.*, p.first_name||' '||p.last_name AS patient_name,
             d.first_name||' '||d.last_name AS doctor_name
      FROM procedure_orders po
      JOIN patients p ON p.id = po.patient_id
      LEFT JOIN doctors d ON d.id = po.doctor_id
      ${where}
      ORDER BY po.created_at DESC
    `, params);
    res.json({ success: true, data: { orders: result.rows } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST create procedure (Doctor) — auto-bills
router.post('/', authenticate, authorize('doctor', 'admin', 'super_admin'), async (req, res) => {
  try {
    const { patient_id, encounter_id, procedure_name, description, priority, notes } = req.body;
    if (!patient_id || !procedure_name) {
      return res.status(400).json({ success: false, message: 'patient_id and procedure_name are required' });
    }

    let doctorId = req.body.doctor_id;
    if (req.user.role === 'doctor') {
      const doc = await pool.query('SELECT id FROM doctors WHERE user_id=$1', [req.user.id]);
      doctorId = doc.rows[0]?.id;
    }

    const result = await pool.query(
      `INSERT INTO procedure_orders
         (patient_id, encounter_id, doctor_id, procedure_name, description, priority, notes, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'ordered') RETURNING *`,
      [patient_id, encounter_id||null, doctorId, procedure_name, description||null, priority||'routine', notes||null]
    );
    const order = result.rows[0];

    // ── Auto-billing ─────────────────────────────────────────
    const { alreadyExisted, invoice } = await billing.billProcedure({
      procedureOrderId: order.id,
      patientId: patient_id,
      encounterId: encounter_id || null,
      doctorId,
      procedureName: procedure_name,
      createdBy: req.user.id
    });

    // Update encounter status
    if (encounter_id) {
      await pool.query(
        `UPDATE patient_encounters SET status = 'services_ordered', updated_at = NOW()
         WHERE id = $1 AND status = 'in_consultation'`,
        [encounter_id]
      );
    }

    res.status(201).json({
      success: true,
      data: { order, invoiceBilled: !alreadyExisted, invoice }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT update procedure status
router.put('/:id', authenticate, authorize('doctor', 'nurse', 'admin', 'super_admin'), async (req, res) => {
  try {
    const { status, notes } = req.body;
    const result = await pool.query(
      `UPDATE procedure_orders SET
         status = COALESCE($1, status),
         notes = COALESCE($2, notes),
         performed_by = CASE WHEN $1 = 'completed' THEN $3 ELSE performed_by END,
         performed_at = CASE WHEN $1 = 'completed' THEN NOW() ELSE performed_at END,
         updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [status||null, notes||null, req.user.id, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: { order: result.rows[0] } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
