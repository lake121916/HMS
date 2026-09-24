/**
 * Radiology orders route — with automatic billing
 */
const express = require('express');
const router  = express.Router();
const pool    = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const billing = require('../services/billingService');

// GET all radiology orders
router.get('/', authenticate, async (req, res) => {
  try {
    const { patient_id, encounter_id, status } = req.query;
    let where = 'WHERE 1=1';
    const params = []; let idx = 1;

    if (req.user.role === 'doctor') {
      const doc = await pool.query('SELECT id FROM doctors WHERE user_id=$1', [req.user.id]);
      if (doc.rows.length) { where += ` AND ro.doctor_id=$${idx++}`; params.push(doc.rows[0].id); }
    } else if (patient_id) { where += ` AND ro.patient_id=$${idx++}`; params.push(patient_id); }
    if (encounter_id) { where += ` AND ro.encounter_id=$${idx++}`; params.push(encounter_id); }
    if (status) { where += ` AND ro.status=$${idx++}`; params.push(status); }

    const result = await pool.query(`
      SELECT ro.*,
             p.first_name||' '||p.last_name AS patient_name,
             d.first_name||' '||d.last_name AS doctor_name,
             u.email AS performed_by_email
      FROM radiology_orders ro
      JOIN patients p ON p.id = ro.patient_id
      LEFT JOIN doctors d ON d.id = ro.doctor_id
      LEFT JOIN users u ON u.id = ro.performed_by
      ${where}
      ORDER BY ro.created_at DESC
    `, params);

    res.json({ success: true, data: { orders: result.rows } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET single order
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ro.*, p.first_name||' '||p.last_name AS patient_name,
             d.first_name||' '||d.last_name AS doctor_name
      FROM radiology_orders ro
      JOIN patients p ON p.id = ro.patient_id
      LEFT JOIN doctors d ON d.id = ro.doctor_id
      WHERE ro.id = $1
    `, [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: { order: result.rows[0] } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST create radiology order (Doctor) — auto-bills
router.post('/', authenticate, authorize('doctor', 'admin', 'super_admin'), async (req, res) => {
  try {
    const { patient_id, encounter_id, study_type, body_part, clinical_indication, priority, notes } = req.body;
    if (!patient_id || !study_type) {
      return res.status(400).json({ success: false, message: 'patient_id and study_type are required' });
    }

    let doctorId = req.body.doctor_id;
    if (req.user.role === 'doctor') {
      const doc = await pool.query('SELECT id FROM doctors WHERE user_id=$1', [req.user.id]);
      doctorId = doc.rows[0]?.id;
    }

    const result = await pool.query(
      `INSERT INTO radiology_orders
         (patient_id, encounter_id, doctor_id, study_type, body_part, clinical_indication, priority, notes, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'ordered') RETURNING *`,
      [patient_id, encounter_id||null, doctorId, study_type, body_part||null, clinical_indication||null, priority||'routine', notes||null]
    );
    const order = result.rows[0];

    // ── Auto-billing ─────────────────────────────────────────
    const { alreadyExisted, invoice } = await billing.billRadiologyOrder({
      radiologyOrderId: order.id,
      patientId: patient_id,
      encounterId: encounter_id || null,
      doctorId,
      studyType: study_type,
      bodyPart: body_part,
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

// PUT update (status update + results) — radiology tech or admin
router.put('/:id', authenticate, authorize('lab_technician', 'admin', 'super_admin', 'doctor'), async (req, res) => {
  try {
    const { status, findings, impression, notes } = req.body;
    const existing = await pool.query('SELECT * FROM radiology_orders WHERE id = $1', [req.params.id]);
    if (!existing.rows.length) return res.status(404).json({ success: false, message: 'Not found' });

    const result = await pool.query(
      `UPDATE radiology_orders SET
         status = COALESCE($1, status),
         findings = COALESCE($2, findings),
         impression = COALESCE($3, impression),
         notes = COALESCE($4, notes),
         performed_by = CASE WHEN $1 = 'completed' THEN $5 ELSE performed_by END,
         performed_at = CASE WHEN $1 = 'completed' THEN NOW() ELSE performed_at END,
         updated_at = NOW()
       WHERE id = $6 RETURNING *`,
      [status||null, findings||null, impression||null, notes||null, req.user.id, req.params.id]
    );
    res.json({ success: true, data: { order: result.rows[0] } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE — admin only
router.delete('/:id', authenticate, authorize('admin', 'super_admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM radiology_orders WHERE id=$1', [req.params.id]);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
