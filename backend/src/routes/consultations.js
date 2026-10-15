/**
 * Clinical Consultations, Addenda, and Medical Audit Routes
 * Alem Ketema Enat Hospital Management System
 * Preserves finalized medical records with immutable addenda & event audit
 */

const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

// ── 1. GET consultation details with addenda and audit history ──────────────
router.get('/:id/history', authenticate, async (req, res) => {
  try {
    // Look up by consultation id or encounter id
    let consultRes = await pool.query(`
      SELECT dc.*,
             p.first_name || ' ' || p.last_name AS patient_name,
             p.date_of_birth, p.gender, p.blood_type,
             d.first_name || ' ' || d.last_name AS doctor_name,
             d.specialization
      FROM doctor_consultations dc
      JOIN patients p ON p.id = dc.patient_id
      JOIN doctors d ON d.id = dc.doctor_id
      WHERE dc.id = $1 OR dc.encounter_id = $1
    `, [req.params.id]);

    if (!consultRes.rows.length) {
      return res.status(404).json({ success: false, message: 'Consultation not found' });
    }

    const consult = consultRes.rows[0];

    // Fetch all linked addenda
    const addendaRes = await pool.query(`
      SELECT ca.*,
             d.first_name || ' ' || d.last_name AS doctor_name,
             u.email AS doctor_email
      FROM consultation_addenda ca
      JOIN doctors d ON d.id = ca.doctor_id
      LEFT JOIN users u ON u.id = d.user_id
      WHERE ca.consultation_id = $1
      ORDER BY ca.created_at ASC
    `, [consult.id]);

    // Fetch related clinical audit trail
    const auditRes = await pool.query(`
      SELECT cae.*, u.email AS performed_by_email
      FROM clinical_audit_events cae
      LEFT JOIN users u ON u.id = cae.performed_by
      WHERE (cae.record_type = 'consultation' AND cae.record_id = $1)
         OR (cae.consultation_id = $1)
      ORDER BY cae.created_at ASC
    `, [consult.id]);

    res.json({
      success: true,
      data: {
        consultation: consult,
        isFinalized: consult.status === 'completed',
        addenda: addendaRes.rows,
        auditTrail: auditRes.rows
      }
    });
  } catch (error) {
    console.error('Error fetching consultation history:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// ── 2. POST addendum to a finalized consultation ────────────────────────────
router.post('/:id/addenda', authenticate, authorize('doctor', 'admin', 'super_admin'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { addendum_text, reason, clinical_effective_time } = req.body;

    if (!addendum_text || addendum_text.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Addendum text is required' });
    }
    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'A documented clinical reason for the correction is mandatory' });
    }

    // Find original consultation
    const consultRes = await client.query(`
      SELECT * FROM doctor_consultations
      WHERE id = $1 OR encounter_id = $1
    `, [req.params.id]);

    if (!consultRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Original consultation record not found' });
    }

    const consult = consultRes.rows[0];

    // Verify consultation is completed/finalized
    if (consult.status !== 'completed') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Addenda are only applicable to finalized consultations. Current status is in-progress.'
      });
    }

    // Determine clinician doctor_id
    let doctorId = consult.doctor_id;
    if (req.user.role === 'doctor') {
      const doc = await client.query('SELECT id FROM doctors WHERE user_id = $1', [req.user.id]);
      if (doc.rows.length) doctorId = doc.rows[0].id;
    }

    // Insert new addendum record — original consultation remains completely untouched!
    const addendumRes = await client.query(`
      INSERT INTO consultation_addenda
        (consultation_id, encounter_id, patient_id, doctor_id, addendum_text, reason, clinical_effective_time)
      VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, NOW()))
      RETURNING *
    `, [
      consult.id,
      consult.encounter_id,
      consult.patient_id,
      doctorId,
      addendum_text.trim(),
      reason.trim(),
      clinical_effective_time || null
    ]);

    const newAddendum = addendumRes.rows[0];

    // Record immutable audit event
    await client.query(`
      INSERT INTO clinical_audit_events
        (patient_id, consultation_id, record_type, record_id, action_type, performed_by, reason, metadata)
      VALUES ($1, $2, 'consultation', $3, 'ADDENDUM_ADDED', $4, $5, $6)
    `, [
      consult.patient_id,
      consult.id,
      newAddendum.id,
      req.user.id,
      `Clinical Addendum by Dr: ${reason.trim()}`,
      JSON.stringify({
        addendumId: newAddendum.id,
        consultationId: consult.id,
        encounterId: consult.encounter_id,
        effectiveTime: newAddendum.clinical_effective_time
      })
    ]);

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Medical addendum saved to patient record with audit verification.',
      data: { addendum: newAddendum }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adding consultation addendum:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  } finally {
    client.release();
  }
});

// ── 3. GET clinical audit trail with rich filters (Auditor / Admin) ─────────
router.get('/audit/trail', authenticate, authorize('admin', 'super_admin', 'hospital_manager', 'doctor'), async (req, res) => {
  try {
    const { patient_id, action_type, record_type, start_date, end_date, limit = 100 } = req.query;
    let query = `
      SELECT cae.*,
             u.email AS performed_by_email,
             p.first_name || ' ' || p.last_name AS patient_name
      FROM clinical_audit_events cae
      LEFT JOIN users u ON u.id = cae.performed_by
      LEFT JOIN patients p ON p.id = cae.patient_id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (patient_id) {
      query += ` AND cae.patient_id = $${idx++}`;
      params.push(patient_id);
    }
    if (action_type) {
      query += ` AND cae.action_type = $${idx++}`;
      params.push(action_type);
    }
    if (record_type) {
      query += ` AND cae.record_type = $${idx++}`;
      params.push(record_type);
    }
    if (start_date) {
      query += ` AND cae.created_at >= $${idx++}`;
      params.push(start_date);
    }
    if (end_date) {
      query += ` AND cae.created_at <= $${idx++}`;
      params.push(end_date);
    }

    query += ` ORDER BY cae.created_at DESC LIMIT $${idx++}`;
    params.push(limit);

    const result = await pool.query(query, params);
    res.json({ success: true, data: { auditEvents: result.rows } });
  } catch (error) {
    console.error('Error fetching clinical audit trail:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
