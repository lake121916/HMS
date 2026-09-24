const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

// GET prescriptions
router.get('/', authenticate, async (req, res) => {
  try {
    const { patient_id, is_dispensed } = req.query;
    let query = `
      SELECT pr.*, p.first_name||' '||p.last_name AS patient_name,
        d.first_name||' '||d.last_name AS doctor_name
      FROM prescriptions pr
      JOIN patients p ON pr.patient_id = p.id
      JOIN doctors d ON pr.doctor_id = d.id
      WHERE 1=1
    `;
    const params = []; let idx = 1;

    // patients see only their own
    if (req.user.role === 'patient') {
      const pat = await pool.query('SELECT id FROM patients WHERE user_id=$1', [req.user.id]);
      if (!pat.rows.length) return res.json({ success: true, data: { prescriptions: [] } });
      query += ` AND pr.patient_id=$${idx++}`; params.push(pat.rows[0].id);
    } else if (req.user.role === 'doctor') {
      // doctors see their own prescriptions
      const doc = await pool.query('SELECT id FROM doctors WHERE user_id=$1', [req.user.id]);
      if (doc.rows.length) { query += ` AND pr.doctor_id=$${idx++}`; params.push(doc.rows[0].id); }
    } else if (patient_id) {
      query += ` AND pr.patient_id=$${idx++}`; params.push(patient_id);
    }
    if (is_dispensed !== undefined) { query += ` AND pr.is_dispensed=$${idx++}`; params.push(is_dispensed === 'true'); }
    query += ' ORDER BY pr.prescribed_date DESC';
    const result = await pool.query(query, params);
    res.json({ success: true, data: { prescriptions: result.rows } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST create — doctor only (auto-billing enabled)
router.post('/', authenticate, authorize('doctor', 'super_admin', 'admin'), async (req, res) => {
  try {
    const { patient_id, diagnosis_id, medication_name, dosage, frequency, duration, instructions,
            encounter_id, quantity = 1 } = req.body;
    let doctorId = req.body.doctor_id;
    if (req.user.role === 'doctor') {
      const doc = await pool.query('SELECT id FROM doctors WHERE user_id=$1', [req.user.id]);
      if (doc.rows.length) doctorId = doc.rows[0].id;
    }
    const result = await pool.query(
      `INSERT INTO prescriptions
         (patient_id, doctor_id, diagnosis_id, medication_name, dosage, frequency, duration, instructions, encounter_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [patient_id, doctorId, diagnosis_id||null, medication_name, dosage, frequency, duration, instructions||null, encounter_id||null]
    );
    const prescription = result.rows[0];

    // ── Auto-billing ─────────────────────────────────────────
    const billing = require('../services/billingService');
    const { alreadyExisted, invoice } = await billing.billPrescription({
      prescriptionId: prescription.id,
      patientId: patient_id,
      encounterId: encounter_id || null,
      doctorId,
      medicationName: medication_name,
      quantity: parseInt(quantity) || 1,
      createdBy: req.user.id
    }).catch(e => { console.error('Prescription billing error:', e.message); return { alreadyExisted: false, invoice: null }; });

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
      data: { prescription, invoiceBilled: !alreadyExisted, invoice }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT update — doctor updates content; pharmacist marks dispensed
router.put('/:id', authenticate, authorize('doctor', 'pharmacist', 'super_admin', 'admin'), async (req, res) => {
  try {
    const { medication_name, dosage, frequency, duration, instructions, is_dispensed } = req.body;
    const existing = await pool.query('SELECT workflow_status, patient_id FROM prescriptions WHERE id = $1', [req.params.id]);
    if (!existing.rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    // pharmacist can only mark dispensed
    if (req.user.role === 'pharmacist') {
      const result = await pool.query(
        `UPDATE prescriptions SET is_dispensed=true, workflow_status='dispensed', updated_at=NOW() WHERE id=$1 RETURNING *`,
        [req.params.id]
      );
      await pool.query(`INSERT INTO workflow_status_history (entity_type, entity_id, from_status, to_status, changed_by) VALUES ('prescription',$1,$2,'dispensed',$3)`, [req.params.id, existing.rows[0].workflow_status, req.user.id]);
      await pool.query(`INSERT INTO notifications (user_id, patient_id, type, title, message, channel) SELECT p.user_id, p.id, 'prescription', 'Prescription ready', 'Your prescription is ready for collection.', 'in_app' FROM patients p WHERE p.id = $1 AND p.user_id IS NOT NULL`, [existing.rows[0].patient_id]);
      return res.json({ success: true, data: { prescription: result.rows[0] } });
    }
    const workflowStatus = is_dispensed === true ? 'dispensed' : 'verified';
    const result = await pool.query(
      `UPDATE prescriptions SET
        medication_name=COALESCE($1,medication_name), dosage=COALESCE($2,dosage),
        frequency=COALESCE($3,frequency), duration=COALESCE($4,duration),
        instructions=COALESCE($5,instructions), is_dispensed=COALESCE($6,is_dispensed), workflow_status=$7, updated_at=NOW()
       WHERE id=$8 RETURNING *`,
      [medication_name||null, dosage||null, frequency||null, duration||null,
       instructions||null, is_dispensed!==undefined?is_dispensed:null, workflowStatus, req.params.id]
    );
    await pool.query(`INSERT INTO workflow_status_history (entity_type, entity_id, from_status, to_status, changed_by) VALUES ('prescription',$1,$2,$3,$4)`, [req.params.id, existing.rows[0].workflow_status, workflowStatus, req.user.id]);
    res.json({ success: true, data: { prescription: result.rows[0] } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE — doctor or admin
router.delete('/:id', authenticate, authorize('doctor', 'super_admin', 'admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM prescriptions WHERE id=$1', [req.params.id]);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
