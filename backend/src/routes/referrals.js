/**
 * Referral Management Route (Internal and External Referrals)
 * Alem Ketema Enat Hospital Management System
 */

const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const socketService = require('../services/socketService');

const clinicalRoles = ['doctor', 'nurse', 'receptionist', 'admin', 'super_admin', 'hospital_manager'];

/**
 * 1. GET /api/referrals
 * List referrals with optional filtering by patient, department, status, or type
 */
router.get('/', authenticate, authorize(...clinicalRoles), async (req, res) => {
  try {
    const { patient_id, department_id, status, type, urgency } = req.query;
    let query = `
      SELECT r.*,
             p.first_name AS patient_first_name, p.last_name AS patient_last_name,
             p.phone AS patient_phone, p.date_of_birth, p.gender,
             doc.first_name || ' ' || doc.last_name AS referring_doctor_name,
             d.name AS receiving_department_name
      FROM opd_referrals r
      JOIN patients p ON p.id = r.patient_id
      LEFT JOIN doctors doc ON doc.id = r.referring_doctor_id
      LEFT JOIN departments d ON d.id = r.receiving_department_id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (patient_id) {
      query += ` AND r.patient_id = $${idx++}`;
      params.push(patient_id);
    }
    if (department_id) {
      query += ` AND r.receiving_department_id = $${idx++}`;
      params.push(department_id);
    }
    if (status) {
      query += ` AND r.status = $${idx++}`;
      params.push(status);
    }
    if (type) {
      query += ` AND r.referral_type = $${idx++}`;
      params.push(type);
    }
    if (urgency) {
      query += ` AND r.urgency = $${idx++}`;
      params.push(urgency);
    }

    query += ` ORDER BY
      CASE r.urgency WHEN 'emergency' THEN 1 WHEN 'urgent' THEN 2 ELSE 3 END,
      r.created_at DESC`;

    const result = await pool.query(query, params);
    res.json({ success: true, data: { referrals: result.rows } });
  } catch (error) {
    console.error('Error fetching referrals:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

/**
 * 2. POST /api/referrals
 * Create a new clinical referral (Internal or External)
 */
router.post('/', authenticate, authorize('doctor', 'admin', 'super_admin'), async (req, res) => {
  try {
    const {
      patient_id,
      encounter_id,
      referral_type = 'internal',
      urgency = 'routine',
      referring_doctor_id,
      receiving_department_id,
      receiving_facility,
      specialty,
      reason,
      clinical_summary,
      follow_up_date,
      notes
    } = req.body;

    if (!patient_id || !reason) {
      return res.status(400).json({ success: false, message: 'patient_id and reason are required' });
    }

    let doctorId = referring_doctor_id;
    if (!doctorId && req.user.role === 'doctor') {
      const docRes = await pool.query('SELECT id FROM doctors WHERE user_id = $1', [req.user.id]);
      doctorId = docRes.rows[0]?.id || null;
    }

    const insertRes = await pool.query(`
      INSERT INTO opd_referrals (
        patient_id, encounter_id, referral_type, urgency,
        referring_doctor_id, receiving_department_id, receiving_facility,
        specialty, reason, clinical_summary, follow_up_date, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      patient_id,
      encounter_id || null,
      referral_type,
      urgency,
      doctorId,
      receiving_department_id || null,
      receiving_facility || null,
      specialty || null,
      reason,
      clinical_summary || null,
      follow_up_date || null,
      notes || null,
      req.user.id
    ]);

    const created = insertRes.rows[0];

    // If linked to an encounter, optionally update status history
    if (encounter_id) {
      await pool.query(`
        INSERT INTO workflow_status_history (entity_type, entity_id, from_status, to_status, changed_by, notes)
        VALUES ('encounter', $1, NULL, 'REFERRED', $2, $3)
      `, [encounter_id, req.user.id, `Referral created: ${referral_type} to ${receiving_facility || 'Department ' + receiving_department_id}`]);
    }

    socketService.broadcast('opd-referral-created', {
      referralId: created.id,
      patientId: patient_id,
      referralType: referral_type,
      urgency
    });

    res.status(201).json({
      success: true,
      message: `${referral_type.toUpperCase()} referral recorded successfully`,
      data: { referral: created }
    });
  } catch (error) {
    console.error('Error creating referral:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

/**
 * 3. GET /api/referrals/stats
 * Aggregate referral statistics for OPD reporting
 */
router.get('/stats', authenticate, authorize(...clinicalRoles), async (req, res) => {
  try {
    const statsRes = await pool.query(`
      SELECT
        COUNT(*) AS total_referrals,
        COUNT(*) FILTER (WHERE referral_type = 'internal') AS internal_count,
        COUNT(*) FILTER (WHERE referral_type = 'external') AS external_count,
        COUNT(*) FILTER (WHERE urgency = 'emergency') AS emergency_count,
        COUNT(*) FILTER (WHERE status = 'pending') AS pending_count,
        COUNT(*) FILTER (WHERE status = 'completed') AS completed_count
      FROM opd_referrals
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    `);

    res.json({ success: true, data: { stats: statsRes.rows[0] } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * 4. PUT /api/referrals/:id/status
 * Update referral status (e.g. accepted, in_progress, completed, cancelled)
 */
router.put('/:id/status', authenticate, authorize('doctor', 'nurse', 'admin', 'super_admin'), async (req, res) => {
  try {
    const { status, notes } = req.body;
    if (!status) return res.status(400).json({ success: false, message: 'status is required' });

    const updateRes = await pool.query(`
      UPDATE opd_referrals
      SET status = $1,
          notes = COALESCE($2, notes),
          updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [status, notes || null, req.params.id]);

    if (!updateRes.rows.length) {
      return res.status(404).json({ success: false, message: 'Referral not found' });
    }

    res.json({ success: true, message: 'Referral status updated', data: { referral: updateRes.rows[0] } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
