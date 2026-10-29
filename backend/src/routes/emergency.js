const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const socketService = require('../services/socketService');

// Query helper to fetch fully hydrated alert record
async function getHydratedAlert(clientOrPool, alertId) {
  const query = `
    SELECT 
      ea.*,
      pe.encounter_number,
      pe.status AS encounter_status,
      p.first_name,
      p.last_name,
      p.date_of_birth,
      p.gender,
      p.phone,
      p.blood_type,
      d.name AS department_name,
      u_ack.first_name || ' ' || u_ack.last_name AS acknowledged_by_name,
      u_ass.first_name || ' ' || u_ass.last_name AS in_assessment_by_name,
      u_res.first_name || ' ' || u_res.last_name AS resolved_by_name,
      ta.temperature,
      ta.blood_pressure_systolic,
      ta.blood_pressure_diastolic,
      ta.heart_rate,
      ta.respiratory_rate,
      ta.oxygen_saturation,
      ta.chief_complaint,
      ta.preliminary_observations
    FROM emergency_alerts ea
    JOIN patient_encounters pe ON pe.id = ea.encounter_id
    JOIN patients p ON p.id = ea.patient_id
    LEFT JOIN departments d ON d.id = ea.department_id
    LEFT JOIN users u_ack ON u_ack.id = ea.acknowledged_by
    LEFT JOIN users u_ass ON u_ass.id = ea.in_assessment_by
    LEFT JOIN users u_res ON u_res.id = ea.resolved_by
    LEFT JOIN triage_assessments ta ON ta.encounter_id = ea.encounter_id
    WHERE ea.id = $1
  `;
  const res = await clientOrPool.query(query, [alertId]);
  return res.rows[0] || null;
}

// ── 1. GET /api/emergency/active ──────────────────────────────────────────────
router.get(
  '/active',
  authenticate,
  authorize('doctor', 'nurse', 'admin', 'super_admin', 'hospital_manager', 'receptionist'),
  async (req, res) => {
    try {
      // Auto-escalate alerts that have been unacknowledged for > 5 minutes
      const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
      const staleRes = await pool.query(
        `SELECT id FROM emergency_alerts 
         WHERE status = 'active' AND created_at < $1`,
        [fiveMinsAgo]
      );

      for (const row of staleRes.rows) {
        await pool.query(
          `UPDATE emergency_alerts 
           SET status = 'escalated', 
               escalation_level = escalation_level + 1,
               last_escalated_at = NOW(),
               updated_at = NOW()
           WHERE id = $1 AND status = 'active'`,
          [row.id]
        );
        await pool.query(
          `INSERT INTO emergency_audit_logs (alert_id, action, notes)
           VALUES ($1, 'escalated', 'System auto-escalation: unacknowledged for > 5 minutes')`,
          [row.id]
        );
      }

      const query = `
        SELECT 
          ea.*,
          pe.encounter_number,
          pe.status AS encounter_status,
          p.first_name,
          p.last_name,
          p.date_of_birth,
          p.gender,
          p.phone,
          p.blood_type,
          d.name AS department_name,
          u_ack.first_name || ' ' || u_ack.last_name AS acknowledged_by_name,
          u_ass.first_name || ' ' || u_ass.last_name AS in_assessment_by_name,
          ta.temperature,
          ta.blood_pressure_systolic,
          ta.blood_pressure_diastolic,
          ta.heart_rate,
          ta.respiratory_rate,
          ta.oxygen_saturation,
          ta.chief_complaint,
          ta.preliminary_observations
        FROM emergency_alerts ea
        JOIN patient_encounters pe ON pe.id = ea.encounter_id
        JOIN patients p ON p.id = ea.patient_id
        LEFT JOIN departments d ON d.id = ea.department_id
        LEFT JOIN users u_ack ON u_ack.id = ea.acknowledged_by
        LEFT JOIN users u_ass ON u_ass.id = ea.in_assessment_by
        LEFT JOIN triage_assessments ta ON ta.encounter_id = ea.encounter_id
        WHERE ea.status IN ('active', 'acknowledged', 'in_assessment', 'escalated')
        ORDER BY 
          CASE WHEN ea.priority = 'resuscitation' THEN 1
               WHEN ea.priority = 'emergency' THEN 2
               WHEN ea.priority = 'critical' THEN 3
               ELSE 4 END,
          ea.created_at ASC
      `;

      const result = await pool.query(query);
      res.json({
        success: true,
        count: result.rows.length,
        data: result.rows
      });
    } catch (err) {
      console.error('Error fetching active emergency alerts:', err);
      res.status(500).json({ success: false, message: 'Server error retrieving emergency queue' });
    }
  }
);

// ── 2. POST /api/emergency/alerts ─────────────────────────────────────────────
router.post(
  '/alerts',
  authenticate,
  authorize('nurse', 'doctor', 'admin', 'super_admin', 'hospital_manager', 'receptionist'),
  async (req, res) => {
    const { encounter_id, patient_id, department_id, priority = 'emergency', reason } = req.body;
    if (!encounter_id || !patient_id || !reason) {
      return res.status(400).json({
        success: false,
        message: 'encounter_id, patient_id, and reason are required'
      });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const encCheck = await client.query('SELECT id, patient_id FROM patient_encounters WHERE id = $1', [encounter_id]);
      if (!encCheck.rows.length) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, message: 'Encounter not found' });
      }

      // Check if active alert already exists for this encounter
      const existing = await client.query(
        `SELECT id FROM emergency_alerts 
         WHERE encounter_id = $1 AND status IN ('active', 'acknowledged', 'in_assessment', 'escalated')`,
        [encounter_id]
      );

      let alertId;
      if (existing.rows.length) {
        alertId = existing.rows[0].id;
        await client.query(
          `UPDATE emergency_alerts 
           SET priority = $1, reason = $2, updated_at = NOW() 
           WHERE id = $3`,
          [priority, reason, alertId]
        );
      } else {
        const ins = await client.query(
          `INSERT INTO emergency_alerts 
             (encounter_id, patient_id, department_id, priority, reason, status, created_by)
           VALUES ($1, $2, $3, $4, $5, 'active', $6)
           RETURNING id`,
          [encounter_id, patient_id, department_id || null, priority, reason, req.user.id]
        );
        alertId = ins.rows[0].id;
      }

      await client.query(
        `INSERT INTO emergency_audit_logs (alert_id, action, performed_by, notes)
         VALUES ($1, 'created', $2, $3)`,
        [alertId, req.user.id, `Emergency alert flagged: ${priority}. Reason: ${reason}`]
      );

      await client.query('COMMIT');

      const hydrated = await getHydratedAlert(pool, alertId);

      // Broadcast via socket
      const alertPayload = {
        type: 'emergency_alert',
        alert: hydrated,
        timestamp: new Date().toISOString()
      };
      socketService.emitToRole('doctor', 'emergency:alert', alertPayload);
      socketService.emitToRole('nurse', 'emergency:alert', alertPayload);
      socketService.emitToRole('super_admin', 'emergency:alert', alertPayload);
      socketService.emitToRole('admin', 'emergency:alert', alertPayload);
      socketService.emitToRole('hospital_manager', 'emergency:alert', alertPayload);
      socketService.broadcast('emergency:alert', alertPayload);

      res.status(201).json({
        success: true,
        message: 'Emergency alert created and broadcast to clinical team',
        data: hydrated
      });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error creating emergency alert:', err);
      res.status(500).json({ success: false, message: 'Server error creating emergency alert' });
    } finally {
      client.release();
    }
  }
);

// ── 3. PUT /api/emergency/alerts/:id/acknowledge ──────────────────────────────
router.put(
  '/alerts/:id/acknowledge',
  authenticate,
  authorize('doctor', 'nurse', 'admin', 'super_admin', 'hospital_manager'),
  async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const alertRes = await client.query('SELECT * FROM emergency_alerts WHERE id = $1 FOR UPDATE', [id]);
      if (!alertRes.rows.length) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, message: 'Emergency alert not found' });
      }

      const alert = alertRes.rows[0];
      if (alert.status === 'resolved') {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'Cannot acknowledge a resolved emergency alert' });
      }

      await client.query(
        `UPDATE emergency_alerts 
         SET status = 'acknowledged', 
             acknowledged_by = $1, 
             acknowledged_at = NOW(), 
             updated_at = NOW()
         WHERE id = $2`,
        [req.user.id, id]
      );

      await client.query(
        `INSERT INTO emergency_audit_logs (alert_id, action, performed_by, notes)
         VALUES ($1, 'acknowledged', $2, 'Emergency alert acknowledged by clinician')`,
        [id, req.user.id]
      );

      await client.query('COMMIT');

      const hydrated = await getHydratedAlert(pool, id);

      const payload = {
        type: 'emergency_acknowledged',
        alert: hydrated,
        acknowledgedBy: req.user.id,
        timestamp: new Date().toISOString()
      };
      socketService.broadcast('emergency:acknowledged', payload);

      res.json({
        success: true,
        message: 'Emergency acknowledged successfully',
        data: hydrated
      });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error acknowledging emergency alert:', err);
      res.status(500).json({ success: false, message: 'Server error acknowledging alert' });
    } finally {
      client.release();
    }
  }
);

// ── 4. PUT /api/emergency/alerts/:id/begin-assessment ─────────────────────────
router.put(
  '/alerts/:id/begin-assessment',
  authenticate,
  authorize('doctor', 'admin', 'super_admin'),
  async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const alertRes = await client.query('SELECT * FROM emergency_alerts WHERE id = $1 FOR UPDATE', [id]);
      if (!alertRes.rows.length) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, message: 'Emergency alert not found' });
      }

      await client.query(
        `UPDATE emergency_alerts 
         SET status = 'in_assessment', 
             in_assessment_by = $1, 
             in_assessment_at = NOW(),
             acknowledged_by = COALESCE(acknowledged_by, $1),
             acknowledged_at = COALESCE(acknowledged_at, NOW()),
             updated_at = NOW()
         WHERE id = $2`,
        [req.user.id, id]
      );

      await client.query(
        `INSERT INTO emergency_audit_logs (alert_id, action, performed_by, notes)
         VALUES ($1, 'assessment_started', $2, 'Doctor commenced immediate clinical assessment')`,
        [id, req.user.id]
      );

      await client.query('COMMIT');

      const hydrated = await getHydratedAlert(pool, id);

      const payload = {
        type: 'emergency_in_assessment',
        alert: hydrated,
        doctor: req.user.id,
        timestamp: new Date().toISOString()
      };
      socketService.broadcast('emergency:in_assessment', payload);

      res.json({
        success: true,
        message: 'Emergency assessment commenced',
        data: hydrated
      });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error starting emergency assessment:', err);
      res.status(500).json({ success: false, message: 'Server error commencing assessment' });
    } finally {
      client.release();
    }
  }
);

// ── 5. PUT /api/emergency/alerts/:id/escalate ─────────────────────────────────
router.put(
  '/alerts/:id/escalate',
  authenticate,
  authorize('doctor', 'nurse', 'admin', 'super_admin', 'hospital_manager'),
  async (req, res) => {
    const { id } = req.params;
    const { reason = 'Clinician escalated emergency call' } = req.body;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const alertRes = await client.query('SELECT * FROM emergency_alerts WHERE id = $1 FOR UPDATE', [id]);
      if (!alertRes.rows.length) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, message: 'Emergency alert not found' });
      }

      await client.query(
        `UPDATE emergency_alerts 
         SET status = 'escalated', 
             escalation_level = escalation_level + 1,
             last_escalated_at = NOW(),
             updated_at = NOW()
         WHERE id = $1`,
        [id]
      );

      await client.query(
        `INSERT INTO emergency_audit_logs (alert_id, action, performed_by, notes)
         VALUES ($1, 'escalated', $2, $3)`,
        [id, req.user.id, reason]
      );

      await client.query('COMMIT');

      const hydrated = await getHydratedAlert(pool, id);

      const payload = {
        type: 'emergency_escalated',
        alert: hydrated,
        escalatedBy: req.user.id,
        reason,
        timestamp: new Date().toISOString()
      };
      socketService.broadcast('emergency:escalated', payload);

      res.json({
        success: true,
        message: 'Emergency alert escalated',
        data: hydrated
      });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error escalating emergency alert:', err);
      res.status(500).json({ success: false, message: 'Server error escalating alert' });
    } finally {
      client.release();
    }
  }
);

// ── 6. PUT /api/emergency/alerts/:id/resolve ──────────────────────────────────
router.put(
  '/alerts/:id/resolve',
  authenticate,
  authorize('doctor', 'admin', 'super_admin', 'hospital_manager'),
  async (req, res) => {
    const { id } = req.params;
    const { resolution_notes } = req.body;

    if (!resolution_notes) {
      return res.status(400).json({ success: false, message: 'resolution_notes is required to close emergency' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const alertRes = await client.query('SELECT * FROM emergency_alerts WHERE id = $1 FOR UPDATE', [id]);
      if (!alertRes.rows.length) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, message: 'Emergency alert not found' });
      }

      await client.query(
        `UPDATE emergency_alerts 
         SET status = 'resolved', 
             resolved_by = $1, 
             resolved_at = NOW(),
             resolution_notes = $2,
             updated_at = NOW()
         WHERE id = $3`,
        [req.user.id, resolution_notes, id]
      );

      await client.query(
        `INSERT INTO emergency_audit_logs (alert_id, action, performed_by, notes)
         VALUES ($1, 'resolved', $2, $3)`,
        [id, req.user.id, `Resolution: ${resolution_notes}`]
      );

      await client.query('COMMIT');

      const hydrated = await getHydratedAlert(pool, id);

      const payload = {
        type: 'emergency_resolved',
        alert: hydrated,
        resolvedBy: req.user.id,
        timestamp: new Date().toISOString()
      };
      socketService.broadcast('emergency:resolved', payload);

      res.json({
        success: true,
        message: 'Emergency resolved and closed',
        data: hydrated
      });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error resolving emergency alert:', err);
      res.status(500).json({ success: false, message: 'Server error resolving alert' });
    } finally {
      client.release();
    }
  }
);

// ── 7. GET /api/emergency/alerts/:id/history ──────────────────────────────────
router.get(
  '/alerts/:id/history',
  authenticate,
  authorize('doctor', 'nurse', 'admin', 'super_admin', 'hospital_manager'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query(
        `SELECT 
           eal.*,
           u.first_name || ' ' || u.last_name AS performed_by_name,
           u.role AS performed_by_role
         FROM emergency_audit_logs eal
         LEFT JOIN users u ON u.id = eal.performed_by
         WHERE eal.alert_id = $1
         ORDER BY eal.created_at ASC`,
        [id]
      );

      res.json({
        success: true,
        data: result.rows
      });
    } catch (err) {
      console.error('Error retrieving emergency history:', err);
      res.status(500).json({ success: false, message: 'Server error retrieving emergency audit history' });
    }
  }
);

module.exports = router;
