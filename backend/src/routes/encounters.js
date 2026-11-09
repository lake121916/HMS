/**
 * Encounters route — manages complete patient encounter lifecycle
 * Following the official Alem Ketema Enat Hospital OPD Workflow:
 * RECEPTION → TRIAGE → VITALS → OPD COORDINATOR → DEPARTMENT ASSIGNMENT → DOCTOR ASSIGNMENT → DOCTOR CONSULTATION
 *
 * Canonical Status Lifecycle:
 *   1. REGISTERED
 *   2. WAITING_FOR_TRIAGE
 *   3. IN_TRIAGE
 *   4. WAITING_FOR_VITALS
 *   5. RECORDING_VITALS
 *   6. VITALS_COMPLETED
 *   7. WAITING_FOR_OPD_COORDINATOR
 *   8. DEPARTMENT_ASSIGNED
 *   9. DOCTOR_ASSIGNED
 *  10. WAITING_FOR_CONSULTATION
 *  11. IN_CONSULTATION
 *  12. PENDING_INVESTIGATION
 *  13. REFERRED
 *  14. FOLLOW_UP_REQUIRED
 *  15. COMPLETED
 *  16. DISCHARGED
 */
const express = require('express');
const router  = express.Router();
const pool    = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const billing = require('../services/billingService');
const socketService = require('../services/socketService');
const patientAssignment = require('../services/patientAssignmentService');

// ─── Status Validation & Graph Definition ───────────────────────────
const CANONICAL_STATUSES = [
  'REGISTERED',
  'WAITING_FOR_TRIAGE',
  'IN_TRIAGE',
  'WAITING_FOR_VITALS',
  'RECORDING_VITALS',
  'VITALS_COMPLETED',
  'WAITING_FOR_OPD_COORDINATOR',
  'DEPARTMENT_ASSIGNED',
  'DOCTOR_ASSIGNED',
  'WAITING_FOR_CONSULTATION',
  'IN_CONSULTATION',
  'PENDING_INVESTIGATION',
  'REFERRED',
  'FOLLOW_UP_REQUIRED',
  'COMPLETED',
  'DISCHARGED'
];

const ALLOWED_TRANSITIONS = {
  'REGISTERED': ['WAITING_FOR_TRIAGE', 'IN_TRIAGE'],
  'WAITING_FOR_TRIAGE': ['IN_TRIAGE', 'WAITING_FOR_VITALS', 'WAITING_FOR_CONSULTATION', 'TRIAGE_COMPLETED'],
  'IN_TRIAGE': ['WAITING_FOR_VITALS', 'WAITING_FOR_CONSULTATION', 'TRIAGE_COMPLETED', 'WAITING_FOR_OPD_COORDINATOR'],
  'WAITING_FOR_VITALS': ['RECORDING_VITALS', 'VITALS_COMPLETED', 'WAITING_FOR_OPD_COORDINATOR'],
  'RECORDING_VITALS': ['VITALS_COMPLETED', 'WAITING_FOR_OPD_COORDINATOR'],
  'VITALS_COMPLETED': ['WAITING_FOR_OPD_COORDINATOR', 'DEPARTMENT_ASSIGNED', 'DOCTOR_ASSIGNED', 'WAITING_FOR_CONSULTATION'],
  'WAITING_FOR_OPD_COORDINATOR': ['DEPARTMENT_ASSIGNED', 'DOCTOR_ASSIGNED', 'WAITING_FOR_CONSULTATION'],
  'DEPARTMENT_ASSIGNED': ['DOCTOR_ASSIGNED', 'WAITING_FOR_CONSULTATION', 'WAITING_FOR_DOCTOR'],
  'DOCTOR_ASSIGNED': ['WAITING_FOR_CONSULTATION', 'WAITING_FOR_DOCTOR', 'IN_CONSULTATION'],
  'WAITING_FOR_CONSULTATION': ['IN_CONSULTATION', 'COMPLETED', 'DISCHARGED'],
  'WAITING_FOR_DOCTOR': ['IN_CONSULTATION', 'COMPLETED', 'DISCHARGED'], // legacy alias
  'IN_CONSULTATION': ['COMPLETED', 'PENDING_INVESTIGATION', 'REFERRED', 'FOLLOW_UP_REQUIRED', 'DISCHARGED', 'BILLING_GENERATED', 'SERVICES_ORDERED'],
  'PENDING_INVESTIGATION': ['IN_CONSULTATION', 'COMPLETED', 'REFERRED', 'FOLLOW_UP_REQUIRED', 'DISCHARGED'],
  'REFERRED': ['COMPLETED', 'DISCHARGED', 'BILLING_GENERATED', 'PAID'],
  'FOLLOW_UP_REQUIRED': ['COMPLETED', 'DISCHARGED', 'BILLING_GENERATED', 'PAID'],
  'COMPLETED': ['DISCHARGED', 'BILLING_GENERATED', 'PAID'],
  'DISCHARGED': ['PAID', 'COMPLETED'],
  'BILLING_GENERATED': ['PAID', 'COMPLETED'],
  'PAYMENT_PENDING': ['PAID', 'COMPLETED'],
  'PAID': ['COMPLETED', 'DISCHARGED']
};

function normalizeStatus(status) {
  if (!status) return null;
  const upper = String(status).trim().toUpperCase();
  if (upper === 'WAITING_FOR_DOCTOR') return 'WAITING_FOR_CONSULTATION';
  return upper;
}

function isValidTransition(fromStatus, toStatus) {
  if (!fromStatus) return true;
  const normFrom = normalizeStatus(fromStatus);
  const normTo = normalizeStatus(toStatus);
  if (normFrom === normTo) return true;
  const allowed = ALLOWED_TRANSITIONS[normFrom];
  if (!allowed) return true; // Legacy fallback
  return allowed.includes(normTo) || (normTo === 'WAITING_FOR_CONSULTATION' && allowed.includes('WAITING_FOR_DOCTOR'));
}

// ─── Helper: update encounter status + log history ──────────
async function transitionStatus(client, encounterId, toStatus, userId, notes = null) {
  const cur = await client.query('SELECT status FROM patient_encounters WHERE id = $1', [encounterId]);
  const fromStatus = cur.rows[0]?.status;
  
  if (fromStatus && !isValidTransition(fromStatus, toStatus)) {
    console.warn(`[Workflow Warning] Unusual transition for encounter ${encounterId}: from ${fromStatus} to ${toStatus}`);
  }

  await client.query(
    `UPDATE patient_encounters SET status = $1, updated_at = NOW() WHERE id = $2`,
    [toStatus, encounterId]
  );
  await client.query(
    `INSERT INTO workflow_status_history (entity_type, entity_id, from_status, to_status, changed_by, notes)
     VALUES ('encounter', $1, $2, $3, $4, $5)`,
    [encounterId, fromStatus, toStatus, userId, notes]
  );

  try {
    socketService.broadcast('encounter:status_changed', {
      encounter_id: encounterId,
      from_status: fromStatus,
      to_status: toStatus,
      changed_by: userId,
      notes,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    // Non-fatal socket broadcast failure
  }
}

// ══════════════════════════════════════════════════════════════
// 1. RECEPTIONIST: CREATE ENCOUNTER (REGISTERED)
// ══════════════════════════════════════════════════════════════
router.post('/', authenticate, authorize('receptionist', 'admin', 'super_admin'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { patient_id, encounter_type = 'outpatient' } = req.body;
    if (!patient_id) return res.status(400).json({ success: false, message: 'patient_id is required' });

    // Strict Rule: Receptionist never assigns departments or doctors
    const pat = await client.query('SELECT id, first_name, last_name FROM patients WHERE id = $1', [patient_id]);
    if (!pat.rows.length) return res.status(404).json({ success: false, message: 'Patient not found' });

    // Create encounter in REGISTERED state
    const enc = await client.query(
      `INSERT INTO patient_encounters (patient_id, encounter_type, status, created_by)
       VALUES ($1, $2, 'REGISTERED', $3) RETURNING *`,
      [patient_id, encounter_type, req.user.id]
    );
    const encounter = enc.rows[0];

    // Set encounter number
    if (!encounter.encounter_number) {
      await client.query(
        `UPDATE patient_encounters SET encounter_number = $1 WHERE id = $2`,
        [`ENC-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(encounter.id).padStart(4,'0')}`, encounter.id]
      );
      encounter.encounter_number = `ENC-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(encounter.id).padStart(4,'0')}`;
    }

    await client.query(
      `INSERT INTO workflow_status_history (entity_type, entity_id, from_status, to_status, changed_by, notes)
       VALUES ('encounter', $1, NULL, 'REGISTERED', $2, 'Encounter created by receptionist')`,
      [encounter.id, req.user.id]
    );

    // Automatic invoice creation
    let autoInvoice = null;
    try {
      autoInvoice = await billing.getOrCreateInvoice(client, {
        encounterId: encounter.id,
        patientId: encounter.patient_id,
        doctorId: null
      });
    } catch (invErr) {
      console.warn('Encounter automatic invoice creation deferred:', invErr.message);
    }

    await client.query('COMMIT');
    res.status(201).json({ success: true, data: { encounter, invoice: autoInvoice } });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create encounter error:', err);
    res.status(500).json({ success: false, message: 'Unable to create encounter' });
  } finally { client.release(); }
});

// ══════════════════════════════════════════════════════════════
// 2. RECEPTIONIST: SEND TO TRIAGE (WAITING_FOR_TRIAGE)
// ══════════════════════════════════════════════════════════════
router.post('/:id/send-to-triage', authenticate, authorize('receptionist', 'admin', 'super_admin'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const enc = await client.query('SELECT * FROM patient_encounters WHERE id = $1', [req.params.id]);
    if (!enc.rows.length) return res.status(404).json({ success: false, message: 'Encounter not found' });
    
    const curStatus = (enc.rows[0].status || '').toUpperCase();
    if (curStatus !== 'REGISTERED') {
      return res.status(400).json({ success: false, message: `Cannot send to triage from status: ${enc.rows[0].status}` });
    }

    await transitionStatus(client, req.params.id, 'WAITING_FOR_TRIAGE', req.user.id, 'Sent to triage by receptionist');
    await client.query('COMMIT');
    res.json({ success: true, message: 'Patient sent to triage queue' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally { client.release(); }
});

// ══════════════════════════════════════════════════════════════
// 3. TRIAGE NURSE: TRIAGE QUEUE
// ══════════════════════════════════════════════════════════════
router.get('/triage-queue', authenticate,
  authorize('nurse', 'doctor', 'admin', 'super_admin', 'receptionist', 'hospital_manager'), async (req, res) => {
  try {
    const { status } = req.query;
    let statusFilter = "UPPER(pe.status) IN ('WAITING_FOR_TRIAGE', 'IN_TRIAGE')";
    const params = [];

    if (status === 'waiting') {
      statusFilter = "UPPER(pe.status) = 'WAITING_FOR_TRIAGE'";
    } else if (status === 'in_triage') {
      statusFilter = "UPPER(pe.status) = 'IN_TRIAGE'";
    } else if (status === 'completed') {
      statusFilter = "UPPER(pe.status) IN ('WAITING_FOR_VITALS', 'RECORDING_VITALS', 'VITALS_COMPLETED', 'WAITING_FOR_OPD_COORDINATOR', 'TRIAGE_COMPLETED', 'DEPARTMENT_ASSIGNED', 'DOCTOR_ASSIGNED', 'WAITING_FOR_CONSULTATION', 'WAITING_FOR_DOCTOR', 'IN_CONSULTATION')";
    } else if (status === 'all') {
      statusFilter = "UPPER(pe.status) IN ('WAITING_FOR_TRIAGE', 'IN_TRIAGE', 'WAITING_FOR_VITALS', 'RECORDING_VITALS', 'VITALS_COMPLETED', 'WAITING_FOR_OPD_COORDINATOR', 'TRIAGE_COMPLETED', 'DEPARTMENT_ASSIGNED', 'DOCTOR_ASSIGNED', 'WAITING_FOR_CONSULTATION', 'WAITING_FOR_DOCTOR', 'IN_CONSULTATION')";
    }

    const result = await pool.query(`
      SELECT pe.*, p.first_name, p.last_name, p.date_of_birth, p.gender, p.phone, p.blood_type, p.allergies,
             ta.temperature, ta.blood_pressure_systolic, ta.blood_pressure_diastolic,
             ta.heart_rate, ta.respiratory_rate, ta.oxygen_saturation, ta.weight, ta.height,
             ta.priority, ta.chief_complaint, ta.preliminary_observations, ta.assessed_at,
             ta.pain_score, ta.bmi, ta.abnormal_flags,
             d.name AS department_name,
             doc.first_name || ' ' || doc.last_name AS doctor_name
      FROM patient_encounters pe
      JOIN patients p ON p.id = pe.patient_id
      LEFT JOIN LATERAL (
        SELECT * FROM triage_assessments WHERE encounter_id = pe.id ORDER BY assessed_at DESC NULLS LAST LIMIT 1
      ) ta ON true
      LEFT JOIN encounter_assignments ea ON ea.encounter_id = pe.id
      LEFT JOIN departments d ON d.id = ea.department_id
      LEFT JOIN doctors doc ON doc.id = ea.doctor_id
      WHERE ${statusFilter}
      ORDER BY
        CASE COALESCE(LOWER(ta.priority),'normal')
          WHEN 'emergency' THEN 1 WHEN 'critical' THEN 1 WHEN 'urgent' THEN 2 ELSE 3
        END,
        pe.created_at ASC
    `, params);

    res.json({ success: true, data: { encounters: result.rows } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// START TRIAGE (Nurse begins active triage assessment → IN_TRIAGE)
router.post('/:id/start-triage', authenticate, authorize('nurse', 'admin', 'super_admin', 'doctor', 'hospital_manager'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const enc = await client.query('SELECT * FROM patient_encounters WHERE id = $1', [req.params.id]);
    if (!enc.rows.length) return res.status(404).json({ success: false, message: 'Encounter not found' });
    
    const curStatus = (enc.rows[0].status || '').toUpperCase();
    const validStartStatuses = ['REGISTERED', 'WAITING_FOR_TRIAGE', 'IN_TRIAGE'];
    if (!validStartStatuses.includes(curStatus)) {
      return res.status(400).json({ success: false, message: `Cannot start triage from status: ${enc.rows[0].status}` });
    }

    await transitionStatus(client, req.params.id, 'IN_TRIAGE', req.user.id, 'Nurse started active triage assessment');
    await client.query('COMMIT');
    res.json({ success: true, message: 'Triage assessment started' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally { client.release(); }
});

// ══════════════════════════════════════════════════════════════
// 4. COMPLETE TRIAGE ASSESSMENT
// Strict Rule:
// - Routine/Urgent: Send to Vitals queue (WAITING_FOR_VITALS). Triage nurse CANNOT assign doctors.
// - Emergency: Bypass routine queue directly to emergency care / consultation.
// ══════════════════════════════════════════════════════════════
router.post('/:id/triage', authenticate, authorize('nurse', 'admin', 'super_admin', 'receptionist', 'doctor', 'hospital_manager'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const enc = await client.query('SELECT * FROM patient_encounters WHERE id = $1', [req.params.id]);
    if (!enc.rows.length) return res.status(404).json({ success: false, message: 'Encounter not found' });
    
    const curStatus = (enc.rows[0].status || '').toUpperCase();
    const allowedTriageStatuses = ['REGISTERED', 'WAITING_FOR_TRIAGE', 'IN_TRIAGE', 'TRIAGE_COMPLETED', 'WAITING_FOR_VITALS'];
    if (!allowedTriageStatuses.includes(curStatus)) {
      return res.status(400).json({ success: false, message: `Cannot triage from status: ${enc.rows[0].status}` });
    }

    const {
      temperature, blood_pressure_systolic, blood_pressure_diastolic,
      heart_rate, respiratory_rate, oxygen_saturation, weight, height,
      pain_score, chief_complaint, preliminary_observations, priority = 'normal',
      department_id, doctor_id
    } = req.body;

    if (!chief_complaint) return res.status(400).json({ success: false, message: 'chief_complaint is required' });

    const isEmergency = ['emergency', 'critical', 'resuscitation'].includes(String(priority).toLowerCase());

    // Strict Rule Enforcement:
    // Triage nurse cannot perform routine doctor assignment. That is strictly OPD Coordinator's responsibility.
    if (!isEmergency && (doctor_id || department_id) && req.user.role === 'nurse') {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: 'Triage nurses cannot perform routine department or doctor assignment. Normal and urgent patients must proceed to Vitals and OPD Coordinator assignment.'
      });
    }

    // Calculate BMI if height and weight provided
    let calculatedBmi = null;
    if (weight && height && height > 0) {
      calculatedBmi = +(parseFloat(weight) / Math.pow(parseFloat(height) / 100, 2)).toFixed(2);
    }

    // Upsert triage assessment
    const existing = await client.query('SELECT id FROM triage_assessments WHERE encounter_id = $1', [req.params.id]);
    if (existing.rows.length) {
      await client.query(
        `UPDATE triage_assessments SET
          temperature=$1, blood_pressure_systolic=$2, blood_pressure_diastolic=$3,
          heart_rate=$4, respiratory_rate=$5, oxygen_saturation=$6, weight=$7, height=$8,
          chief_complaint=$9, preliminary_observations=$10, priority=$11,
          pain_score=$12, bmi=$13, assessed_by=$14, assessed_at=NOW(), updated_at=NOW()
         WHERE encounter_id=$15`,
        [temperature, blood_pressure_systolic, blood_pressure_diastolic,
         heart_rate, respiratory_rate, oxygen_saturation, weight, height,
         chief_complaint, preliminary_observations, priority,
         pain_score || null, calculatedBmi, req.user.id, req.params.id]
      );
    } else {
      await client.query(
        `INSERT INTO triage_assessments
          (encounter_id, patient_id, temperature, blood_pressure_systolic, blood_pressure_diastolic,
           heart_rate, respiratory_rate, oxygen_saturation, weight, height,
           chief_complaint, preliminary_observations, priority, pain_score, bmi, assessed_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
        [req.params.id, enc.rows[0].patient_id,
         temperature, blood_pressure_systolic, blood_pressure_diastolic,
         heart_rate, respiratory_rate, oxygen_saturation, weight, height,
         chief_complaint, preliminary_observations, priority,
         pain_score || null, calculatedBmi, req.user.id]
      );
    }

    // Emergency Bypass Logic
    let emergencyAlertId = null;
    if (isEmergency) {
      // Auto-create persistent emergency alert
      const existingAlert = await client.query(
        `SELECT id FROM emergency_alerts WHERE encounter_id = $1 AND status != 'resolved'`,
        [req.params.id]
      );
      if (existingAlert.rows.length) {
        emergencyAlertId = existingAlert.rows[0].id;
        await client.query(
          `UPDATE emergency_alerts 
           SET priority = $1, reason = $2, department_id = COALESCE($3, department_id), updated_at = NOW() 
           WHERE id = $4`,
          [priority, chief_complaint, department_id ? parseInt(department_id) : null, emergencyAlertId]
        );
      } else {
        const ins = await client.query(
          `INSERT INTO emergency_alerts 
             (encounter_id, patient_id, department_id, priority, reason, status, created_by)
           VALUES ($1, $2, $3, $4, $5, 'active', $6) RETURNING id`,
          [req.params.id, enc.rows[0].patient_id, department_id ? parseInt(department_id) : null, priority, chief_complaint, req.user.id]
        );
        emergencyAlertId = ins.rows[0].id;
      }
      await client.query(
        `INSERT INTO emergency_audit_logs (alert_id, action, performed_by, notes)
         VALUES ($1, 'created', $2, $3)`,
        [emergencyAlertId, req.user.id, `Emergency alert flagged during triage. Priority: ${priority}`]
      );

      // Emergency cases immediately route to WAITING_FOR_CONSULTATION / emergency doctor
      let resolvedDocId = doctor_id ? parseInt(doctor_id) : null;
      let resolvedDeptId = department_id ? parseInt(department_id) : null;

      if (resolvedDocId) {
        await client.query(
          `INSERT INTO encounter_assignments (encounter_id, patient_id, department_id, doctor_id, assigned_by, notes)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (encounter_id) DO UPDATE SET
             department_id = COALESCE(EXCLUDED.department_id, encounter_assignments.department_id),
             doctor_id     = COALESCE(EXCLUDED.doctor_id, encounter_assignments.doctor_id),
             assigned_by   = EXCLUDED.assigned_by,
             notes         = EXCLUDED.notes,
             assigned_at   = NOW()`,
          [req.params.id, enc.rows[0].patient_id, resolvedDeptId, resolvedDocId, req.user.id, 'Assigned via emergency bypass']
        );
      }

      await transitionStatus(client, req.params.id, 'WAITING_FOR_CONSULTATION', req.user.id, 'Emergency bypass directly to consultation');
    } else {
      // Normal and urgent cases proceed directly to the Vitals Nurse queue
      await transitionStatus(client, req.params.id, 'WAITING_FOR_VITALS', req.user.id, 'Triage assessment complete. Sent to vitals queue');
    }

    await client.query('COMMIT');

    // Broadcast emergency alert via socket
    if (emergencyAlertId) {
      try {
        const alertRes = await pool.query(`
          SELECT ea.*, pe.encounter_number, p.first_name, p.last_name, p.gender, p.phone, d.name AS department_name
          FROM emergency_alerts ea
          JOIN patient_encounters pe ON pe.id = ea.encounter_id
          JOIN patients p ON p.id = ea.patient_id
          LEFT JOIN departments d ON d.id = ea.department_id
          WHERE ea.id = $1
        `, [emergencyAlertId]);
        if (alertRes.rows.length) {
          socketService.broadcast('emergency:alert', {
            type: 'emergency_alert',
            alert: alertRes.rows[0],
            timestamp: new Date().toISOString()
          });
        }
      } catch (sErr) {}
    }

    res.json({
      success: true,
      message: isEmergency
        ? 'Emergency triage completed. Patient dispatched immediately to consultation queue.'
        : 'Triage assessment completed. Patient forwarded to Vitals queue.'
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Triage error:', err);
    res.status(500).json({ success: false, message: 'Server error: ' + (err.message || 'Triage failed') });
  } finally { client.release(); }
});

// ══════════════════════════════════════════════════════════════
// 5. VITALS NURSE QUEUE & RECORDING
// Receives patients who completed triage (WAITING_FOR_VITALS)
// Records BP, Temp, Pulse, RR, SpO2, Weight, Height, Pain score (0-10)
// Calculates BMI and abnormal flags
// On completion, automatically sends patient to OPD Coordinator (WAITING_FOR_OPD_COORDINATOR)
// ══════════════════════════════════════════════════════════════
router.get('/vitals-queue', authenticate,
  authorize('nurse', 'doctor', 'admin', 'super_admin', 'hospital_manager'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT pe.*, p.first_name, p.last_name, p.date_of_birth, p.gender, p.phone, p.blood_type, p.allergies,
             ta.priority, ta.chief_complaint, ta.preliminary_observations, ta.assessed_at,
             ta.temperature, ta.blood_pressure_systolic, ta.blood_pressure_diastolic,
             ta.heart_rate, ta.respiratory_rate, ta.oxygen_saturation, ta.weight, ta.height,
             ta.pain_score, ta.bmi, ta.abnormal_flags
      FROM patient_encounters pe
      JOIN patients p ON p.id = pe.patient_id
      LEFT JOIN LATERAL (
        SELECT * FROM triage_assessments WHERE encounter_id = pe.id ORDER BY assessed_at DESC NULLS LAST LIMIT 1
      ) ta ON true
      WHERE UPPER(pe.status) IN ('WAITING_FOR_VITALS', 'RECORDING_VITALS')
      ORDER BY
        CASE COALESCE(LOWER(ta.priority),'normal')
          WHEN 'emergency' THEN 1 WHEN 'critical' THEN 1 WHEN 'urgent' THEN 2 ELSE 3
        END,
        pe.updated_at ASC
    `);
    res.json({ success: true, data: { encounters: result.rows } });
  } catch (err) {
    console.error('Vitals queue error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Start vitals recording (status -> RECORDING_VITALS)
router.post('/:id/start-vitals', authenticate,
  authorize('nurse', 'doctor', 'admin', 'super_admin', 'hospital_manager'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const enc = await client.query('SELECT * FROM patient_encounters WHERE id = $1', [req.params.id]);
    if (!enc.rows.length) return res.status(404).json({ success: false, message: 'Encounter not found' });
    
    const curStatus = (enc.rows[0].status || '').toUpperCase();
    if (!['WAITING_FOR_VITALS', 'RECORDING_VITALS'].includes(curStatus)) {
      return res.status(400).json({ success: false, message: `Cannot start vitals from status: ${enc.rows[0].status}` });
    }

    await transitionStatus(client, req.params.id, 'RECORDING_VITALS', req.user.id, 'Nurse started recording vitals');
    await client.query('COMMIT');
    res.json({ success: true, message: 'Vitals recording started' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally { client.release(); }
});

// Record complete vitals and send to OPD Coordinator
router.post('/:id/vitals', authenticate,
  authorize('nurse', 'doctor', 'admin', 'super_admin', 'hospital_manager'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const enc = await client.query('SELECT * FROM patient_encounters WHERE id = $1', [req.params.id]);
    if (!enc.rows.length) return res.status(404).json({ success: false, message: 'Encounter not found' });

    const curStatus = (enc.rows[0].status || '').toUpperCase();
    const allowedVitalsStatuses = ['WAITING_FOR_VITALS', 'RECORDING_VITALS', 'VITALS_COMPLETED', 'WAITING_FOR_OPD_COORDINATOR', 'IN_TRIAGE'];
    if (!allowedVitalsStatuses.includes(curStatus)) {
      return res.status(400).json({ success: false, message: `Cannot record vitals for encounter in status: ${enc.rows[0].status}` });
    }

    const {
      temperature, blood_pressure_systolic, blood_pressure_diastolic,
      heart_rate, respiratory_rate, oxygen_saturation, weight, height,
      pain_score, blood_glucose, notes
    } = req.body;

    // Validate pain score
    let parsedPainScore = null;
    if (pain_score !== undefined && pain_score !== null && pain_score !== '') {
      parsedPainScore = parseInt(pain_score, 10);
      if (isNaN(parsedPainScore) || parsedPainScore < 0 || parsedPainScore > 10) {
        return res.status(400).json({ success: false, message: 'Pain score must be an integer between 0 and 10' });
      }
    }

    // Calculate BMI
    let calculatedBmi = null;
    const numWeight = parseFloat(weight);
    const numHeight = parseFloat(height);
    if (!isNaN(numWeight) && !isNaN(numHeight) && numHeight > 0) {
      calculatedBmi = +(numWeight / Math.pow(numHeight / 100, 2)).toFixed(2);
    }

    // Determine abnormal measurements
    const abnormalList = [];
    const numSys = parseInt(blood_pressure_systolic, 10);
    const numDia = parseInt(blood_pressure_diastolic, 10);
    const numTemp = parseFloat(temperature);
    const numHR = parseInt(heart_rate, 10);
    const numRR = parseInt(respiratory_rate, 10);
    const numSpO2 = parseFloat(oxygen_saturation);

    if (!isNaN(numSys) && (numSys >= 140 || numSys < 90)) {
      abnormalList.push(`Systolic BP ${numSys} mmHg`);
    }
    if (!isNaN(numDia) && (numDia >= 90 || numDia < 60)) {
      abnormalList.push(`Diastolic BP ${numDia} mmHg`);
    }
    if (!isNaN(numTemp) && (numTemp >= 38.0 || numTemp < 36.0)) {
      abnormalList.push(`Temp ${numTemp}°C`);
    }
    if (!isNaN(numHR) && (numHR > 100 || numHR < 60)) {
      abnormalList.push(`Heart Rate ${numHR} bpm`);
    }
    if (!isNaN(numRR) && (numRR > 20 || numRR < 12)) {
      abnormalList.push(`Resp Rate ${numRR}/min`);
    }
    if (!isNaN(numSpO2) && numSpO2 < 95) {
      abnormalList.push(`SpO₂ ${numSpO2}%`);
    }
    if (parsedPainScore !== null && parsedPainScore >= 7) {
      abnormalList.push(`Severe Pain ${parsedPainScore}/10`);
    }
    const abnormalFlags = abnormalList.length > 0 ? abnormalList.join(', ') : null;

    // 1. Insert into vitals table
    await client.query(
      `INSERT INTO vitals
        (patient_id, encounter_id, nurse_id, temperature, blood_pressure_systolic, blood_pressure_diastolic,
         heart_rate, respiratory_rate, oxygen_saturation, weight, height, blood_glucose,
         pain_score, bmi, abnormal_flags, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [enc.rows[0].patient_id, req.params.id, req.user.id,
       temperature ? parseFloat(temperature) : null,
       numSys || null, numDia || null,
       numHR || null, numRR || null,
       numSpO2 || null,
       numWeight || null, numHeight || null,
       blood_glucose ? parseFloat(blood_glucose) : null,
       parsedPainScore, calculatedBmi, abnormalFlags, notes || null]
    );

    // 2. Also update triage_assessments with recorded vitals
    await client.query(
      `UPDATE triage_assessments SET
        temperature = COALESCE($1, temperature),
        blood_pressure_systolic = COALESCE($2, blood_pressure_systolic),
        blood_pressure_diastolic = COALESCE($3, blood_pressure_diastolic),
        heart_rate = COALESCE($4, heart_rate),
        respiratory_rate = COALESCE($5, respiratory_rate),
        oxygen_saturation = COALESCE($6, oxygen_saturation),
        weight = COALESCE($7, weight),
        height = COALESCE($8, height),
        pain_score = COALESCE($9, pain_score),
        bmi = COALESCE($10, bmi),
        abnormal_flags = COALESCE($11, abnormal_flags),
        updated_at = NOW()
       WHERE encounter_id = $12`,
      [temperature ? parseFloat(temperature) : null,
       numSys || null, numDia || null,
       numHR || null, numRR || null,
       numSpO2 || null,
       numWeight || null, numHeight || null,
       parsedPainScore, calculatedBmi, abnormalFlags, req.params.id]
    );

    // 3. Status Transitions: RECORDING_VITALS -> VITALS_COMPLETED -> WAITING_FOR_OPD_COORDINATOR
    await transitionStatus(client, req.params.id, 'VITALS_COMPLETED', req.user.id, 'Vitals assessment completed by nurse');
    await transitionStatus(client, req.params.id, 'WAITING_FOR_OPD_COORDINATOR', req.user.id, 'Sent to OPD Coordinator queue for doctor/dept assignment');

    await client.query('COMMIT');
    res.json({
      success: true,
      message: 'Vitals recorded successfully. Patient dispatched to OPD Coordinator queue.',
      data: {
        bmi: calculatedBmi,
        abnormal_flags: abnormalFlags
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Vitals recording error:', err);
    res.status(500).json({ success: false, message: 'Server error: ' + (err.message || 'Failed to record vitals') });
  } finally { client.release(); }
});

// ══════════════════════════════════════════════════════════════
// 6. OPD COORDINATOR: QUEUE & ASSIGNMENT
// Only authorized OPD Coordinators and administrators can assign department and doctor.
// View patients who completed triage and vitals (WAITING_FOR_OPD_COORDINATOR)
// Select department, view doctors with availability and active workload, assign doctor.
// After assignment: sends patient to doctor consultation queue (WAITING_FOR_CONSULTATION).
// ══════════════════════════════════════════════════════════════
router.get('/opd-coordinator-queue', authenticate,
  authorize('admin', 'super_admin', 'hospital_manager', 'nurse'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT pe.*,
             p.first_name, p.last_name, p.date_of_birth, p.gender, p.phone, p.blood_type, p.allergies, p.medical_history,
             ta.priority, ta.chief_complaint, ta.preliminary_observations, ta.assessed_at,
             COALESCE(v.temperature, ta.temperature) AS temperature,
             COALESCE(v.blood_pressure_systolic, ta.blood_pressure_systolic) AS blood_pressure_systolic,
             COALESCE(v.blood_pressure_diastolic, ta.blood_pressure_diastolic) AS blood_pressure_diastolic,
             COALESCE(v.heart_rate, ta.heart_rate) AS heart_rate,
             COALESCE(v.respiratory_rate, ta.respiratory_rate) AS respiratory_rate,
             COALESCE(v.oxygen_saturation, ta.oxygen_saturation) AS oxygen_saturation,
             COALESCE(v.weight, ta.weight) AS weight,
             COALESCE(v.height, ta.height) AS height,
             COALESCE(v.pain_score, ta.pain_score) AS pain_score,
             COALESCE(v.bmi, ta.bmi) AS bmi,
             COALESCE(v.abnormal_flags, ta.abnormal_flags) AS abnormal_flags,
             v.recorded_at AS vitals_recorded_at
      FROM patient_encounters pe
      JOIN patients p ON p.id = pe.patient_id
      LEFT JOIN LATERAL (
        SELECT * FROM triage_assessments WHERE encounter_id = pe.id ORDER BY assessed_at DESC NULLS LAST LIMIT 1
      ) ta ON true
      LEFT JOIN LATERAL (
        SELECT * FROM vitals WHERE encounter_id = pe.id ORDER BY recorded_at DESC LIMIT 1
      ) v ON true
      WHERE UPPER(pe.status) IN ('WAITING_FOR_OPD_COORDINATOR', 'VITALS_COMPLETED', 'TRIAGE_COMPLETED')
      ORDER BY
        CASE COALESCE(LOWER(ta.priority),'normal')
          WHEN 'emergency' THEN 1 WHEN 'critical' THEN 1 WHEN 'urgent' THEN 2 ELSE 3
        END,
        pe.updated_at ASC
    `);
    res.json({ success: true, data: { encounters: result.rows } });
  } catch (err) {
    console.error('OPD coordinator queue error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Alias for assignment queue
router.get('/assignment-queue', authenticate,
  authorize('admin', 'super_admin', 'hospital_manager', 'nurse'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT pe.*,
             p.first_name, p.last_name, p.date_of_birth, p.gender, p.phone, p.blood_type, p.allergies, p.medical_history,
             ta.priority, ta.chief_complaint, ta.preliminary_observations, ta.assessed_at,
             COALESCE(v.temperature, ta.temperature) AS temperature,
             COALESCE(v.blood_pressure_systolic, ta.blood_pressure_systolic) AS blood_pressure_systolic,
             COALESCE(v.blood_pressure_diastolic, ta.blood_pressure_diastolic) AS blood_pressure_diastolic,
             COALESCE(v.heart_rate, ta.heart_rate) AS heart_rate,
             COALESCE(v.respiratory_rate, ta.respiratory_rate) AS respiratory_rate,
             COALESCE(v.oxygen_saturation, ta.oxygen_saturation) AS oxygen_saturation,
             COALESCE(v.weight, ta.weight) AS weight,
             COALESCE(v.height, ta.height) AS height,
             COALESCE(v.pain_score, ta.pain_score) AS pain_score,
             COALESCE(v.bmi, ta.bmi) AS bmi,
             COALESCE(v.abnormal_flags, ta.abnormal_flags) AS abnormal_flags,
             v.recorded_at AS vitals_recorded_at
      FROM patient_encounters pe
      JOIN patients p ON p.id = pe.patient_id
      LEFT JOIN LATERAL (
        SELECT * FROM triage_assessments WHERE encounter_id = pe.id ORDER BY assessed_at DESC NULLS LAST LIMIT 1
      ) ta ON true
      LEFT JOIN LATERAL (
        SELECT * FROM vitals WHERE encounter_id = pe.id ORDER BY recorded_at DESC LIMIT 1
      ) v ON true
      WHERE UPPER(pe.status) IN ('WAITING_FOR_OPD_COORDINATOR', 'VITALS_COMPLETED', 'TRIAGE_COMPLETED')
      ORDER BY
        CASE COALESCE(LOWER(ta.priority),'normal')
          WHEN 'emergency' THEN 1 WHEN 'critical' THEN 1 WHEN 'urgent' THEN 2 ELSE 3
        END,
        pe.updated_at ASC
    `);
    res.json({ success: true, data: { encounters: result.rows } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// OPD COORDINATOR ASSIGNMENT HANDLER
async function handleCoordinatorAssignment(req, res) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { department_id, doctor_id, notes } = req.body;
    if (!department_id || !doctor_id) {
      return res.status(400).json({ success: false, message: 'department_id and doctor_id are required' });
    }

    const enc = await client.query('SELECT * FROM patient_encounters WHERE id = $1', [req.params.id]);
    if (!enc.rows.length) return res.status(404).json({ success: false, message: 'Encounter not found' });
    
    const curStatus = (enc.rows[0].status || '').toUpperCase();
    const validAssignmentStatuses = ['WAITING_FOR_OPD_COORDINATOR', 'VITALS_COMPLETED', 'DEPARTMENT_ASSIGNED', 'TRIAGE_COMPLETED'];
    if (!validAssignmentStatuses.includes(curStatus)) {
      return res.status(400).json({ success: false, message: `Cannot perform OPD Coordinator assignment from status: ${enc.rows[0].status}` });
    }

    // Check doctor availability and department
    const docRes = await client.query(
      'SELECT id, first_name, last_name, is_available, department_id FROM doctors WHERE id = $1',
      [doctor_id]
    );
    if (!docRes.rows.length) return res.status(404).json({ success: false, message: 'Doctor not found' });
    const doc = docRes.rows[0];

    if (!doc.is_available) {
      return res.status(400).json({ success: false, message: `Dr. ${doc.first_name} ${doc.last_name} is currently marked unavailable` });
    }

    if (doc.department_id && Number(doc.department_id) !== Number(department_id)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Dr. ${doc.first_name} ${doc.last_name} belongs to department #${doc.department_id}, not the selected department #${department_id}.`
      });
    }

    // Check department exists
    const deptRes = await client.query('SELECT id, name FROM departments WHERE id = $1', [department_id]);
    const deptName = deptRes.rows[0]?.name || `Department #${department_id}`;

    // Prevent duplicate assignment if patient is already actively assigned and waiting
    const existingAssign = await client.query(
      'SELECT doctor_id FROM encounter_assignments WHERE encounter_id = $1',
      [req.params.id]
    );

    // Upsert assignment record with coordinator ID and timestamp
    await client.query(
      `INSERT INTO encounter_assignments (encounter_id, patient_id, department_id, doctor_id, assigned_by, notes, assigned_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (encounter_id) DO UPDATE SET
         department_id = EXCLUDED.department_id,
         doctor_id     = EXCLUDED.doctor_id,
         assigned_by   = EXCLUDED.assigned_by,
         notes         = EXCLUDED.notes,
         assigned_at   = NOW()`,
      [req.params.id, enc.rows[0].patient_id, department_id, doctor_id, req.user.id, notes || 'Assigned by OPD Coordinator']
    );

    // Transitions: DEPARTMENT_ASSIGNED -> DOCTOR_ASSIGNED -> WAITING_FOR_CONSULTATION
    await transitionStatus(client, req.params.id, 'DEPARTMENT_ASSIGNED', req.user.id, `Assigned to ${deptName}`);
    await transitionStatus(client, req.params.id, 'DOCTOR_ASSIGNED', req.user.id, `Assigned to Dr. ${doc.first_name} ${doc.last_name}`);
    await transitionStatus(client, req.params.id, 'WAITING_FOR_CONSULTATION', req.user.id, notes || 'Dispatched to Doctor Consultation queue');

    // Auto bill consultation fee
    try {
      await billing.createBillingItem({
        patientId: enc.rows[0].patient_id,
        encounterId: req.params.id,
        doctorId: doctor_id,
        sourceType: 'consultation',
        sourceId: req.params.id,
        description: `Standard Doctor Consultation Fee (${deptName})`,
        unitPrice: 500,
        quantity: 1,
        createdBy: req.user.id
      });
    } catch (bErr) {
      console.warn('Consultation billing warning:', bErr.message);
    }

    await client.query('COMMIT');

    // Broadcast real-time socket event for doctor queue update
    try {
      socketService.broadcast('patient:assigned', {
        encounter_id: req.params.id,
        patient_id: enc.rows[0].patient_id,
        department_id,
        department_name: deptName,
        doctor_id: doc.id,
        doctor_name: `Dr. ${doc.first_name} ${doc.last_name}`,
        assigned_by: req.user.id,
        timestamp: new Date().toISOString()
      });
    } catch (sErr) {}

    res.json({
      success: true,
      message: `Encounter assigned successfully to Dr. ${doc.first_name} ${doc.last_name} (${deptName}). Patient sent to consultation queue.`,
      data: {
        encounter_id: req.params.id,
        department_id,
        doctor_id,
        status: 'WAITING_FOR_CONSULTATION'
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Coordinator assignment error:', err);
    res.status(500).json({ success: false, message: 'Server error: ' + (err.message || 'Assignment failed') });
  } finally { client.release(); }
}

// Routes for assignment:
router.post('/:id/coordinator-assign', authenticate,
  authorize('admin', 'super_admin', 'hospital_manager', 'nurse'), handleCoordinatorAssignment);

router.post('/:id/assign', authenticate,
  authorize('admin', 'super_admin', 'hospital_manager', 'nurse'), handleCoordinatorAssignment);

// ══════════════════════════════════════════════════════════════
// 7. DOCTOR CONSULTATION QUEUE
// ══════════════════════════════════════════════════════════════
router.get('/doctor-queue', authenticate,
  authorize('doctor', 'admin', 'super_admin', 'hospital_manager'), async (req, res) => {
  try {
    let doctorId = req.query.doctor_id;
    if (req.user.role === 'doctor') {
      const doc = await pool.query('SELECT id FROM doctors WHERE user_id = $1', [req.user.id]);
      doctorId = doc.rows[0]?.id;
    }

    const baseQuery = `
      SELECT pe.*,
             p.first_name, p.last_name, p.date_of_birth, p.gender, p.phone,
             p.allergies, p.blood_type, p.medical_history,
             ta.priority, ta.chief_complaint, ta.preliminary_observations,
             COALESCE(v.temperature, ta.temperature) AS temperature,
             COALESCE(v.blood_pressure_systolic, ta.blood_pressure_systolic) AS blood_pressure_systolic,
             COALESCE(v.blood_pressure_diastolic, ta.blood_pressure_diastolic) AS blood_pressure_diastolic,
             COALESCE(v.heart_rate, ta.heart_rate) AS heart_rate,
             COALESCE(v.respiratory_rate, ta.respiratory_rate) AS respiratory_rate,
             COALESCE(v.oxygen_saturation, ta.oxygen_saturation) AS oxygen_saturation,
             COALESCE(v.weight, ta.weight) AS weight,
             COALESCE(v.height, ta.height) AS height,
             COALESCE(v.pain_score, ta.pain_score) AS pain_score,
             COALESCE(v.bmi, ta.bmi) AS bmi,
             COALESCE(v.abnormal_flags, ta.abnormal_flags) AS abnormal_flags,
             d.name AS department_name
      FROM patient_encounters pe
      JOIN patients p ON p.id = pe.patient_id
      LEFT JOIN LATERAL (
        SELECT * FROM triage_assessments WHERE encounter_id = pe.id ORDER BY assessed_at DESC NULLS LAST LIMIT 1
      ) ta ON true
      LEFT JOIN LATERAL (
        SELECT * FROM vitals WHERE encounter_id = pe.id ORDER BY recorded_at DESC LIMIT 1
      ) v ON true
      LEFT JOIN LATERAL (
        SELECT ea.department_id, ea.doctor_id, ea.assigned_at
        FROM encounter_assignments ea
        WHERE ea.encounter_id = pe.id
        ORDER BY ea.assigned_at DESC NULLS LAST LIMIT 1
      ) ea ON true
      LEFT JOIN departments d ON d.id = ea.department_id
      WHERE UPPER(pe.status) IN ('WAITING_FOR_CONSULTATION', 'WAITING_FOR_DOCTOR', 'IN_CONSULTATION')
    `;

    const orderBy = `
      ORDER BY
        CASE COALESCE(LOWER(ta.priority),'normal')
          WHEN 'emergency' THEN 1 WHEN 'critical' THEN 1 WHEN 'urgent' THEN 2 ELSE 3
        END,
        pe.updated_at ASC
    `;

    let result;
    if (doctorId) {
      result = await pool.query(`${baseQuery} AND (ea.doctor_id = $1 OR ea.doctor_id IS NULL) ${orderBy}`, [doctorId]);
      if (result.rows.length === 0) {
        result = await pool.query(`${baseQuery} ${orderBy}`);
      }
    } else {
      result = await pool.query(`${baseQuery} ${orderBy}`);
    }

    res.json({ success: true, data: { encounters: result.rows } });
  } catch (err) {
    console.error('Doctor queue error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ══════════════════════════════════════════════════════════════
// 8. DOCTOR: START CONSULTATION
// ══════════════════════════════════════════════════════════════
router.post('/:id/start-consultation', authenticate,
  authorize('doctor', 'admin', 'super_admin', 'hospital_manager'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const enc = await client.query('SELECT * FROM patient_encounters WHERE id = $1', [req.params.id]);
    if (!enc.rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    
    const curStatus = (enc.rows[0].status || '').toUpperCase();
    if (!['WAITING_FOR_CONSULTATION', 'WAITING_FOR_DOCTOR', 'IN_CONSULTATION'].includes(curStatus)) {
      return res.status(400).json({ success: false, message: `Cannot start consultation from: ${enc.rows[0].status}` });
    }

    let doctorId = req.body.doctor_id;
    if (req.user.role === 'doctor') {
      const doc = await client.query('SELECT id FROM doctors WHERE user_id = $1', [req.user.id]);
      doctorId = doc.rows[0]?.id;
    }

    // Upsert consultation record
    await client.query(
      `INSERT INTO doctor_consultations (encounter_id, patient_id, doctor_id, status)
       VALUES ($1, $2, $3, 'in_progress')
       ON CONFLICT (encounter_id) DO UPDATE SET status = 'in_progress', updated_at = NOW()`,
      [req.params.id, enc.rows[0].patient_id, doctorId]
    );

    await transitionStatus(client, req.params.id, 'IN_CONSULTATION', req.user.id, 'Doctor started active consultation');
    await client.query('COMMIT');
    res.json({ success: true, message: 'Consultation started' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally { client.release(); }
});

// ══════════════════════════════════════════════════════════════
// 9. DOCTOR: COMPLETE CONSULTATION
// Supports completion destination statuses:
// - COMPLETED (standard completed)
// - PENDING_INVESTIGATION (lab/radiology ordered)
// - REFERRED (referred out)
// - FOLLOW_UP_REQUIRED (scheduled follow up)
// - DISCHARGED (consultation completed and patient discharged)
// ══════════════════════════════════════════════════════════════
router.post('/:id/complete-consultation', authenticate,
  authorize('doctor', 'admin', 'super_admin', 'hospital_manager'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const enc = await client.query('SELECT * FROM patient_encounters WHERE id = $1', [req.params.id]);
    if (!enc.rows.length) return res.status(404).json({ success: false, message: 'Not found' });

    const {
      consultation_notes, diagnosis, icd_code, treatment_plan, follow_up_instructions,
      completion_status = 'COMPLETED'
    } = req.body;

    const validCompletions = ['COMPLETED', 'PENDING_INVESTIGATION', 'REFERRED', 'FOLLOW_UP_REQUIRED', 'DISCHARGED'];
    const targetStatus = validCompletions.includes(String(completion_status).toUpperCase())
      ? String(completion_status).toUpperCase()
      : 'COMPLETED';

    let doctorId;
    if (req.user.role === 'doctor') {
      const doc = await client.query('SELECT id FROM doctors WHERE user_id = $1', [req.user.id]);
      doctorId = doc.rows[0]?.id;
    }

    // Check if already completed to enforce medical record immutability
    const existingConsult = await client.query(
      'SELECT id, status FROM doctor_consultations WHERE encounter_id = $1',
      [req.params.id]
    );
    if (existingConsult.rows.length && existingConsult.rows[0].status === 'completed') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'This consultation is already finalized and legally locked. To add corrections or subsequent notes, please submit a clinical addendum.'
      });
    }

    // Update or insert consultation record
    const consult = await client.query(
      `INSERT INTO doctor_consultations
         (encounter_id, patient_id, doctor_id, consultation_notes, diagnosis, icd_code, treatment_plan, follow_up_instructions, status, completed_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'completed', NOW(), NOW())
       ON CONFLICT (encounter_id) DO UPDATE SET
         consultation_notes = EXCLUDED.consultation_notes,
         diagnosis = EXCLUDED.diagnosis,
         icd_code = EXCLUDED.icd_code,
         treatment_plan = EXCLUDED.treatment_plan,
         follow_up_instructions = EXCLUDED.follow_up_instructions,
         status = 'completed',
         completed_at = NOW(),
         updated_at = NOW()
       RETURNING *`,
      [req.params.id, enc.rows[0].patient_id, doctorId,
       consultation_notes, diagnosis, icd_code, treatment_plan, follow_up_instructions]
    );

    // Record immutable audit event
    if (consult.rows.length) {
      await client.query(`
        INSERT INTO clinical_audit_events
          (patient_id, consultation_id, record_type, record_id, action_type, performed_by, reason, metadata)
        VALUES ($1, $2, 'consultation', $3, 'FINALIZED', $4, 'Doctor finalized medical consultation', $5)
      `, [
        enc.rows[0].patient_id,
        consult.rows[0].id,
        consult.rows[0].id,
        req.user.id,
        JSON.stringify({ diagnosis, icd_code, encounter_id: enc.rows[0].id, targetStatus })
      ]);
    }

    // Auto-bill consultation fee
    if (consult.rows.length) {
      await billing.billConsultation({
        consultationId: consult.rows[0].id,
        patientId: enc.rows[0].patient_id,
        encounterId: enc.rows[0].id,
        doctorId,
        createdBy: req.user.id
      }).catch(e => console.error('Consultation billing error:', e.message));
    }

    // Transition encounter status
    await transitionStatus(client, req.params.id, targetStatus, req.user.id, `Consultation finalized with status: ${targetStatus}`);

    await client.query('COMMIT');
    res.json({
      success: true,
      message: `Consultation completed successfully (${targetStatus})`,
      data: {
        encounter_id: req.params.id,
        status: targetStatus,
        consultation: consult.rows[0]
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Complete consultation error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally { client.release(); }
});

// ══════════════════════════════════════════════════════════════
// 10. GET SINGLE ENCOUNTER (Full clinical detail & history)
// ══════════════════════════════════════════════════════════════
router.get('/:id', authenticate, async (req, res) => {
  try {
    const enc = await pool.query(`
      SELECT pe.*,
             p.first_name, p.last_name, p.date_of_birth, p.gender, p.phone, p.email,
             p.blood_type, p.allergies, p.medical_history,
             ta.priority, ta.chief_complaint, ta.preliminary_observations,
             COALESCE(v.temperature, ta.temperature) AS temperature,
             COALESCE(v.blood_pressure_systolic, ta.blood_pressure_systolic) AS blood_pressure_systolic,
             COALESCE(v.blood_pressure_diastolic, ta.blood_pressure_diastolic) AS blood_pressure_diastolic,
             COALESCE(v.heart_rate, ta.heart_rate) AS heart_rate,
             COALESCE(v.respiratory_rate, ta.respiratory_rate) AS respiratory_rate,
             COALESCE(v.oxygen_saturation, ta.oxygen_saturation) AS oxygen_saturation,
             COALESCE(v.weight, ta.weight) AS weight,
             COALESCE(v.height, ta.height) AS height,
             COALESCE(v.pain_score, ta.pain_score) AS pain_score,
             COALESCE(v.bmi, ta.bmi) AS bmi,
             COALESCE(v.abnormal_flags, ta.abnormal_flags) AS abnormal_flags,
             ta.assessed_at,
             ea.department_id, d.name AS department_name,
             ea.doctor_id, dr.first_name||' '||dr.last_name AS doctor_name,
             ea.assigned_by AS coordinator_id,
             ea.assigned_at,
             ea.notes AS assignment_notes,
             dc.consultation_notes, dc.diagnosis, dc.icd_code, dc.treatment_plan, dc.follow_up_instructions,
             dc.status AS consultation_status
      FROM patient_encounters pe
      JOIN patients p ON p.id = pe.patient_id
      LEFT JOIN LATERAL (
        SELECT * FROM triage_assessments WHERE encounter_id = pe.id ORDER BY assessed_at DESC NULLS LAST LIMIT 1
      ) ta ON true
      LEFT JOIN LATERAL (
        SELECT * FROM vitals WHERE encounter_id = pe.id ORDER BY recorded_at DESC LIMIT 1
      ) v ON true
      LEFT JOIN encounter_assignments ea ON ea.encounter_id = pe.id
      LEFT JOIN departments d ON d.id = ea.department_id
      LEFT JOIN doctors dr ON dr.id = ea.doctor_id
      LEFT JOIN doctor_consultations dc ON dc.encounter_id = pe.id
      WHERE pe.id = $1
    `, [req.params.id]);

    if (!enc.rows.length) return res.status(404).json({ success: false, message: 'Not found' });

    // Fetch related prescriptions
    const prescriptions = await pool.query(
      `SELECT pr.*, d.first_name||' '||d.last_name AS doctor_name
       FROM prescriptions pr LEFT JOIN doctors d ON d.id = pr.doctor_id
       WHERE pr.encounter_id = $1 ORDER BY pr.prescribed_date DESC`, [req.params.id]
    );

    // Fetch lab tests
    const labTests = await pool.query(
      `SELECT lt.*, lr.results, lr.is_abnormal
       FROM lab_tests lt LEFT JOIN lab_results lr ON lr.lab_test_id = lt.id
       WHERE lt.encounter_id = $1 ORDER BY lt.requested_date DESC`, [req.params.id]
    );

    // Fetch radiology orders
    const radOrders = await pool.query(
      'SELECT * FROM radiology_orders WHERE encounter_id = $1 ORDER BY created_at DESC', [req.params.id]
    );

    // Fetch procedure orders
    const procOrders = await pool.query(
      'SELECT * FROM procedure_orders WHERE encounter_id = $1 ORDER BY created_at DESC', [req.params.id]
    );

    // Fetch billing
    const billingInfo = await billing.getEncounterBilling(req.params.id);

    // Workflow history
    const history = await pool.query(
      `SELECT wsh.*, u.email AS changed_by_email
       FROM workflow_status_history wsh LEFT JOIN users u ON u.id = wsh.changed_by
       WHERE wsh.entity_type = 'encounter' AND wsh.entity_id = $1
       ORDER BY wsh.created_at ASC`, [req.params.id]
    );

    res.json({
      success: true,
      data: {
        encounter: enc.rows[0],
        prescriptions: prescriptions.rows,
        labTests: labTests.rows,
        radiologyOrders: radOrders.rows,
        procedureOrders: procOrders.rows,
        billing: billingInfo,
        history: history.rows
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ══════════════════════════════════════════════════════════════
// 11. LIST ENCOUNTERS (with filters)
// ══════════════════════════════════════════════════════════════
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, patient_id, limit = 50, offset = 0 } = req.query;
    let where = 'WHERE 1=1';
    const params = [];
    let idx = 1;

    if (status) {
      if (Array.isArray(status)) {
        where += ` AND UPPER(pe.status) = ANY($${idx++})`;
        params.push(status.map(s => String(s).toUpperCase()));
      } else {
        where += ` AND UPPER(pe.status) = UPPER($${idx++})`;
        params.push(status);
      }
    }
    if (patient_id) { where += ` AND pe.patient_id = $${idx++}`; params.push(patient_id); }

    // Role-based filtering
    if (req.user.role === 'doctor') {
      const doc = await pool.query('SELECT id FROM doctors WHERE user_id = $1', [req.user.id]);
      const dId = doc.rows[0]?.id;
      if (dId) { where += ` AND ea.doctor_id = $${idx++}`; params.push(dId); }
    }

    const result = await pool.query(`
      SELECT pe.*,
             p.first_name, p.last_name, p.phone,
             ta.priority, ta.chief_complaint,
             d.name AS department_name,
             dr.first_name||' '||dr.last_name AS doctor_name
      FROM patient_encounters pe
      JOIN patients p ON p.id = pe.patient_id
      LEFT JOIN LATERAL (
        SELECT * FROM triage_assessments WHERE encounter_id = pe.id ORDER BY assessed_at DESC NULLS LAST LIMIT 1
      ) ta ON true
      LEFT JOIN encounter_assignments ea ON ea.encounter_id = pe.id
      LEFT JOIN departments d ON d.id = ea.department_id
      LEFT JOIN doctors dr ON dr.id = ea.doctor_id
      ${where}
      ORDER BY pe.updated_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `, [...params, limit, offset]);

    res.json({ success: true, data: { encounters: result.rows } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ══════════════════════════════════════════════════════════════
// 12. BILLING INFO for encounter
// ══════════════════════════════════════════════════════════════
router.get('/:id/billing', authenticate, async (req, res) => {
  try {
    const billingInfo = await billing.getEncounterBilling(req.params.id);
    if (!billingInfo) return res.json({ success: true, data: { invoice: null, items: [] } });
    res.json({ success: true, data: billingInfo });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ══════════════════════════════════════════════════════════════
// 13. CASHIER — Pending payment queue
// ══════════════════════════════════════════════════════════════
router.get('/cashier/pending', authenticate, authorize('cashier', 'admin', 'super_admin'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT pe.*,
             p.first_name, p.last_name, p.phone,
             ta.priority, ta.chief_complaint,
             i.id AS invoice_id, i.total_amount, i.status AS invoice_status,
             COALESCE(paid.amount_paid, 0) AS amount_paid,
             i.total_amount - COALESCE(paid.amount_paid, 0) AS balance
      FROM patient_encounters pe
      JOIN patients p ON p.id = pe.patient_id
      LEFT JOIN LATERAL (
        SELECT * FROM triage_assessments WHERE encounter_id = pe.id ORDER BY assessed_at DESC NULLS LAST LIMIT 1
      ) ta ON true
      LEFT JOIN invoices i ON i.encounter_id = pe.id
      LEFT JOIN (
        SELECT invoice_id, SUM(amount) AS amount_paid
        FROM payments GROUP BY invoice_id
      ) paid ON paid.invoice_id = i.id
      WHERE UPPER(pe.status) IN ('BILLING_GENERATED', 'PAYMENT_PENDING')
        AND i.id IS NOT NULL
      ORDER BY
        CASE COALESCE(LOWER(ta.priority),'normal') WHEN 'emergency' THEN 1 WHEN 'urgent' THEN 2 ELSE 3 END,
        pe.updated_at ASC
    `);
    res.json({ success: true, data: { encounters: result.rows } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ══════════════════════════════════════════════════════════════
// 14. MARK ENCOUNTER PAID / COMPLETED
// ══════════════════════════════════════════════════════════════
router.post('/:id/mark-paid', authenticate, authorize('cashier', 'admin', 'super_admin'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await transitionStatus(client, req.params.id, 'PAID', req.user.id, 'Payment received by cashier');
    await client.query('COMMIT');
    res.json({ success: true, message: 'Encounter marked as paid' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: 'Server error' });
  } finally { client.release(); }
});

module.exports = router;
