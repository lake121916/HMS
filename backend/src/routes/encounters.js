/**
 * Encounters route — manages patient encounter lifecycle
 * from REGISTERED through COMPLETED
 *
 * RBAC:
 *   Receptionist: create encounter, send to triage
 *   Triage Nurse:  view waiting_for_triage, record assessment
 *   Admin:         assign department + doctor
 *   Doctor:        consult, complete
 *   Others:        view their relevant queues
 */
const express = require('express');
const router  = express.Router();
const pool    = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const billing = require('../services/billingService');

// ─── Helper: update encounter status + log history ──────────
async function transitionStatus(client, encounterId, toStatus, userId, notes = null) {
  const cur = await client.query('SELECT status FROM patient_encounters WHERE id = $1', [encounterId]);
  const fromStatus = cur.rows[0]?.status;
  await client.query(
    `UPDATE patient_encounters SET status = $1, updated_at = NOW() WHERE id = $2`,
    [toStatus, encounterId]
  );
  await client.query(
    `INSERT INTO workflow_status_history (entity_type, entity_id, from_status, to_status, changed_by, notes)
     VALUES ('encounter', $1, $2, $3, $4, $5)`,
    [encounterId, fromStatus, toStatus, userId, notes]
  );
}

// ══════════════════════════════════════════════════════════════
// 1. CREATE ENCOUNTER  (Receptionist)
// ══════════════════════════════════════════════════════════════
router.post('/', authenticate, authorize('receptionist', 'admin', 'super_admin'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { patient_id, encounter_type = 'outpatient' } = req.body;
    if (!patient_id) return res.status(400).json({ success: false, message: 'patient_id is required' });

    // Verify patient exists
    const pat = await client.query('SELECT id, first_name, last_name FROM patients WHERE id = $1', [patient_id]);
    if (!pat.rows.length) return res.status(404).json({ success: false, message: 'Patient not found' });

    // Create encounter
    const enc = await client.query(
      `INSERT INTO patient_encounters (patient_id, encounter_type, status, created_by)
       VALUES ($1, $2, 'registered', $3) RETURNING *`,
      [patient_id, encounter_type, req.user.id]
    );
    const encounter = enc.rows[0];

    // Set encounter number (trigger may have done it)
    if (!encounter.encounter_number) {
      await client.query(
        `UPDATE patient_encounters SET encounter_number = $1 WHERE id = $2`,
        [`ENC-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(encounter.id).padStart(4,'0')}`, encounter.id]
      );
    }

    await client.query(
      `INSERT INTO workflow_status_history (entity_type, entity_id, from_status, to_status, changed_by, notes)
       VALUES ('encounter', $1, NULL, 'registered', $2, 'Encounter created by receptionist')`,
      [encounter.id, req.user.id]
    );

    await client.query('COMMIT');
    res.status(201).json({ success: true, data: { encounter: enc.rows[0] } });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create encounter error:', err);
    res.status(500).json({ success: false, message: 'Unable to create encounter' });
  } finally { client.release(); }
});

// ══════════════════════════════════════════════════════════════
// 2. SEND TO TRIAGE  (Receptionist)
// ══════════════════════════════════════════════════════════════
router.post('/:id/send-to-triage', authenticate, authorize('receptionist', 'admin', 'super_admin'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const enc = await client.query('SELECT * FROM patient_encounters WHERE id = $1', [req.params.id]);
    if (!enc.rows.length) return res.status(404).json({ success: false, message: 'Encounter not found' });
    if (enc.rows[0].status !== 'registered') {
      return res.status(400).json({ success: false, message: `Cannot send to triage from status: ${enc.rows[0].status}` });
    }
    await transitionStatus(client, req.params.id, 'waiting_for_triage', req.user.id, 'Sent to triage by receptionist');
    await client.query('COMMIT');
    res.json({ success: true, message: 'Patient sent to triage queue' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally { client.release(); }
});

// ══════════════════════════════════════════════════════════════
// 3. TRIAGE QUEUE  (Nurse, Doctor, Admin) - Supports 3 Triage Stages
// ══════════════════════════════════════════════════════════════
router.get('/triage-queue', authenticate,
  authorize('nurse', 'doctor', 'admin', 'super_admin', 'receptionist'), async (req, res) => {
  try {
    const { status } = req.query;
    let statusFilter = "pe.status IN ('waiting_for_triage', 'in_triage')";
    const params = [];

    if (status === 'waiting') {
      statusFilter = "pe.status = 'waiting_for_triage'";
    } else if (status === 'in_triage') {
      statusFilter = "pe.status = 'in_triage'";
    } else if (status === 'completed') {
      statusFilter = "pe.status IN ('triage_completed', 'department_assigned', 'doctor_assigned', 'waiting_for_doctor', 'in_consultation')";
    } else if (status === 'all') {
      statusFilter = "pe.status IN ('waiting_for_triage', 'in_triage', 'triage_completed', 'department_assigned', 'doctor_assigned', 'waiting_for_doctor', 'in_consultation')";
    }

    const result = await pool.query(`
      SELECT pe.*, p.first_name, p.last_name, p.date_of_birth, p.gender, p.phone, p.blood_type, p.allergies,
             ta.temperature, ta.blood_pressure_systolic, ta.blood_pressure_diastolic,
             ta.heart_rate, ta.respiratory_rate, ta.oxygen_saturation, ta.weight, ta.height,
             ta.priority, ta.chief_complaint, ta.preliminary_observations, ta.assessed_at,
             d.name AS department_name,
             doc.first_name || ' ' || doc.last_name AS doctor_name
      FROM patient_encounters pe
      JOIN patients p ON p.id = pe.patient_id
      LEFT JOIN triage_assessments ta ON ta.encounter_id = pe.id
      LEFT JOIN encounter_assignments ea ON ea.encounter_id = pe.id
      LEFT JOIN departments d ON d.id = ea.department_id
      LEFT JOIN doctors doc ON doc.id = ea.doctor_id
      WHERE ${statusFilter}
      ORDER BY
        CASE COALESCE(ta.priority,'normal')
          WHEN 'emergency' THEN 1 WHEN 'urgent' THEN 2 ELSE 3
        END,
        pe.created_at ASC
    `, params);

    res.json({ success: true, data: { encounters: result.rows } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// START TRIAGE ASSESSMENT (Nurse starts triaging patient → status becomes in_triage)
router.post('/:id/start-triage', authenticate, authorize('nurse', 'admin', 'super_admin'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const enc = await client.query('SELECT * FROM patient_encounters WHERE id = $1', [req.params.id]);
    if (!enc.rows.length) return res.status(404).json({ success: false, message: 'Encounter not found' });
    
    if (enc.rows[0].status !== 'waiting_for_triage' && enc.rows[0].status !== 'in_triage') {
      return res.status(400).json({ success: false, message: `Cannot start triage from status: ${enc.rows[0].status}` });
    }

    await transitionStatus(client, req.params.id, 'in_triage', req.user.id, 'Nurse started active triage assessment');
    await client.query('COMMIT');
    res.json({ success: true, message: 'Triage assessment started' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally { client.release(); }
});

// ══════════════════════════════════════════════════════════════
// 4. COMPLETE TRIAGE  (Nurse, Admin)
// ══════════════════════════════════════════════════════════════
router.post('/:id/triage', authenticate, authorize('nurse', 'admin', 'super_admin', 'receptionist'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const enc = await client.query('SELECT * FROM patient_encounters WHERE id = $1', [req.params.id]);
    if (!enc.rows.length) return res.status(404).json({ success: false, message: 'Encounter not found' });
    if (enc.rows[0].status !== 'waiting_for_triage' && enc.rows[0].status !== 'in_triage') {
      return res.status(400).json({ success: false, message: `Cannot triage from status: ${enc.rows[0].status}` });
    }

    const {
      temperature, blood_pressure_systolic, blood_pressure_diastolic,
      heart_rate, respiratory_rate, oxygen_saturation, weight, height,
      chief_complaint, preliminary_observations, priority = 'normal',
      department_id, doctor_id
    } = req.body;

    if (!chief_complaint) return res.status(400).json({ success: false, message: 'chief_complaint is required' });

    // Upsert triage assessment
    const existing = await client.query('SELECT id FROM triage_assessments WHERE encounter_id = $1', [req.params.id]);
    if (existing.rows.length) {
      await client.query(
        `UPDATE triage_assessments SET
          temperature=$1, blood_pressure_systolic=$2, blood_pressure_diastolic=$3,
          heart_rate=$4, respiratory_rate=$5, oxygen_saturation=$6, weight=$7, height=$8,
          chief_complaint=$9, preliminary_observations=$10, priority=$11,
          assessed_by=$12, assessed_at=NOW(), updated_at=NOW()
         WHERE encounter_id=$13`,
        [temperature, blood_pressure_systolic, blood_pressure_diastolic,
         heart_rate, respiratory_rate, oxygen_saturation, weight, height,
         chief_complaint, preliminary_observations, priority, req.user.id, req.params.id]
      );
    } else {
      await client.query(
        `INSERT INTO triage_assessments
          (encounter_id, patient_id, temperature, blood_pressure_systolic, blood_pressure_diastolic,
           heart_rate, respiratory_rate, oxygen_saturation, weight, height,
           chief_complaint, preliminary_observations, priority, assessed_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [req.params.id, enc.rows[0].patient_id,
         temperature, blood_pressure_systolic, blood_pressure_diastolic,
         heart_rate, respiratory_rate, oxygen_saturation, weight, height,
         chief_complaint, preliminary_observations, priority, req.user.id]
      );
    }

    // Also save vitals to legacy vitals table
    await client.query(
      `INSERT INTO vitals
        (patient_id, encounter_id, temperature, blood_pressure_systolic, blood_pressure_diastolic,
         heart_rate, respiratory_rate, oxygen_saturation, weight, height, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [enc.rows[0].patient_id, req.params.id,
       temperature, blood_pressure_systolic, blood_pressure_diastolic,
       heart_rate, respiratory_rate, oxygen_saturation, weight, height,
       `Triage assessment. Priority: ${priority}. Complaint: ${chief_complaint}`]
    );

    await transitionStatus(client, req.params.id, 'triage_completed', req.user.id, 'Triage completed by nurse');

    // Optional direct department/doctor assignment during triage
    if (department_id || doctor_id) {
      let resolvedDeptId = department_id ? parseInt(department_id) : null;
      let resolvedDocId  = doctor_id ? parseInt(doctor_id) : null;

      if (resolvedDocId) {
        const docRes = await client.query('SELECT id, first_name, last_name, is_available, department_id FROM doctors WHERE id = $1', [resolvedDocId]);
        if (!docRes.rows.length) {
          await client.query('ROLLBACK');
          return res.status(404).json({ success: false, message: 'Selected doctor not found' });
        }
        const doc = docRes.rows[0];

        // Validate doctor belongs to the target department
        if (resolvedDeptId && doc.department_id && Number(doc.department_id) !== Number(resolvedDeptId)) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            success: false,
            message: `Dr. ${doc.first_name} ${doc.last_name} belongs to a different department. Please select a doctor from the selected department.`
          });
        }

        // If department wasn't explicitly provided, set from doctor's profile
        if (!resolvedDeptId && doc.department_id) {
          resolvedDeptId = doc.department_id;
        }
      }

      await client.query(
        `INSERT INTO encounter_assignments (encounter_id, patient_id, department_id, doctor_id, assigned_by, notes)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (encounter_id) DO UPDATE SET
           department_id = COALESCE(EXCLUDED.department_id, encounter_assignments.department_id),
           doctor_id     = COALESCE(EXCLUDED.doctor_id, encounter_assignments.doctor_id),
           assigned_by   = EXCLUDED.assigned_by,
           notes         = EXCLUDED.notes,
           assigned_at   = NOW()`,
        [req.params.id, enc.rows[0].patient_id, resolvedDeptId, resolvedDocId, req.user.id, 'Assigned during triage assessment']
      );

      if (resolvedDeptId) {
        await transitionStatus(client, req.params.id, 'department_assigned', req.user.id, `Dept ID: ${resolvedDeptId}`);
      }

      if (resolvedDocId) {
        await transitionStatus(client, req.params.id, 'doctor_assigned', req.user.id, `Doctor ID: ${resolvedDocId}`);
        await transitionStatus(client, req.params.id, 'waiting_for_doctor', req.user.id, 'Assigned during triage');

        // Auto bill consultation fee using billing service
        try {
          await billing.createBillingItem({
            patientId: enc.rows[0].patient_id,
            encounterId: req.params.id,
            doctorId: resolvedDocId,
            sourceType: 'consultation',
            sourceId: req.params.id,
            description: 'Standard Doctor Consultation Fee',
            unitPrice: 500,
            quantity: 1,
            createdBy: req.user.id
          });
        } catch (bErr) {
          console.error('Consultation billing warning:', bErr);
        }
      }
    }

    await client.query('COMMIT');
    res.json({
      success: true,
      message: doctor_id
        ? 'Triage completed and patient assigned to doctor queue.'
        : department_id
          ? 'Triage completed and patient routed to department.'
          : 'Triage assessment completed.'
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Triage error:', err);
    res.status(500).json({ success: false, message: 'Server error: ' + (err.message || 'Triage failed') });
  } finally { client.release(); }
});

// ══════════════════════════════════════════════════════════════
// 5. ASSIGNMENT QUEUE  (Admin, Nurse, Receptionist)
// ══════════════════════════════════════════════════════════════
router.get('/assignment-queue', authenticate, authorize('admin', 'super_admin', 'nurse', 'receptionist'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT pe.*,
             p.first_name, p.last_name, p.date_of_birth, p.gender, p.phone,
             ta.priority, ta.chief_complaint, ta.preliminary_observations,
             ta.temperature, ta.blood_pressure_systolic, ta.blood_pressure_diastolic,
             ta.heart_rate, ta.respiratory_rate, ta.oxygen_saturation,
             ta.weight, ta.height
      FROM patient_encounters pe
      JOIN patients p ON p.id = pe.patient_id
      LEFT JOIN triage_assessments ta ON ta.encounter_id = pe.id
      WHERE pe.status = 'triage_completed'
      ORDER BY
        CASE COALESCE(ta.priority,'normal') WHEN 'emergency' THEN 1 WHEN 'urgent' THEN 2 ELSE 3 END,
        pe.updated_at ASC
    `);
    res.json({ success: true, data: { encounters: result.rows } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ══════════════════════════════════════════════════════════════
// 6. ASSIGN DEPARTMENT + DOCTOR  (Admin, Nurse, Receptionist)
// ══════════════════════════════════════════════════════════════
router.post('/:id/assign', authenticate, authorize('admin', 'super_admin', 'nurse', 'receptionist'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { department_id, doctor_id, notes } = req.body;
    if (!department_id || !doctor_id) {
      return res.status(400).json({ success: false, message: 'department_id and doctor_id are required' });
    }

    const enc = await client.query('SELECT * FROM patient_encounters WHERE id = $1', [req.params.id]);
    if (!enc.rows.length) return res.status(404).json({ success: false, message: 'Encounter not found' });
    if (enc.rows[0].status !== 'triage_completed' && enc.rows[0].status !== 'department_assigned') {
      return res.status(400).json({ success: false, message: `Cannot assign from status: ${enc.rows[0].status}` });
    }

    // Check doctor is active and available
    const docRes = await client.query(
      'SELECT id, first_name, last_name, is_available, department_id FROM doctors WHERE id = $1', [doctor_id]
    );
    if (!docRes.rows.length) return res.status(404).json({ success: false, message: 'Doctor not found' });
    const doc = docRes.rows[0];
    if (!doc.is_available) {
      return res.status(400).json({ success: false, message: 'Doctor is not available' });
    }

    // Doctor department validation
    if (doc.department_id && Number(doc.department_id) !== Number(department_id)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Dr. ${doc.first_name} ${doc.last_name} belongs to a different department. Please select a doctor from the selected department.`
      });
    }

    // Upsert assignment
    await client.query(
      `INSERT INTO encounter_assignments (encounter_id, patient_id, department_id, doctor_id, assigned_by, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (encounter_id) DO UPDATE SET
         department_id = EXCLUDED.department_id,
         doctor_id     = EXCLUDED.doctor_id,
         assigned_by   = EXCLUDED.assigned_by,
         notes         = EXCLUDED.notes,
         assigned_at   = NOW()`,
      [req.params.id, enc.rows[0].patient_id, department_id, doctor_id, req.user.id, notes]
    );

    // Status: department_assigned → doctor_assigned → waiting_for_doctor
    await transitionStatus(client, req.params.id, 'department_assigned', req.user.id, `Dept ID: ${department_id}`);
    await transitionStatus(client, req.params.id, 'doctor_assigned', req.user.id, `Doctor ID: ${doctor_id}`);
    await transitionStatus(client, req.params.id, 'waiting_for_doctor', req.user.id, notes);

    // Auto bill consultation fee
    try {
      await billing.createBillingItem({
        patientId: enc.rows[0].patient_id,
        encounterId: req.params.id,
        doctorId: doctor_id,
        sourceType: 'consultation',
        sourceId: req.params.id,
        description: 'Standard Doctor Consultation Fee',
        unitPrice: 500,
        quantity: 1,
        createdBy: req.user.id
      });
    } catch (bErr) {
      console.error('Consultation billing warning:', bErr);
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'Assignment completed. Patient in doctor queue.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Assignment error:', err);
    res.status(500).json({ success: false, message: 'Server error: ' + (err.message || 'Assignment failed') });
  } finally { client.release(); }
});

// ══════════════════════════════════════════════════════════════
// 7. DOCTOR QUEUE  (Doctor)
// ══════════════════════════════════════════════════════════════
router.get('/doctor-queue', authenticate, authorize('doctor', 'admin', 'super_admin'), async (req, res) => {
  try {
    let doctorId = req.query.doctor_id;
    if (req.user.role === 'doctor') {
      const doc = await pool.query('SELECT id FROM doctors WHERE user_id = $1', [req.user.id]);
      doctorId = doc.rows[0]?.id;
    }
    if (!doctorId) return res.json({ success: true, data: { encounters: [] } });

    const result = await pool.query(`
      SELECT pe.*,
             p.first_name, p.last_name, p.date_of_birth, p.gender, p.phone,
             p.allergies, p.blood_type, p.medical_history,
             ta.priority, ta.chief_complaint, ta.preliminary_observations,
             ta.temperature, ta.blood_pressure_systolic, ta.blood_pressure_diastolic,
             ta.heart_rate, ta.respiratory_rate, ta.oxygen_saturation,
             d.name AS department_name
      FROM patient_encounters pe
      JOIN patients p ON p.id = pe.patient_id
      LEFT JOIN triage_assessments ta ON ta.encounter_id = pe.id
      LEFT JOIN encounter_assignments ea ON ea.encounter_id = pe.id
      LEFT JOIN departments d ON d.id = ea.department_id
      WHERE pe.status IN ('waiting_for_doctor','in_consultation')
        AND ea.doctor_id = $1
      ORDER BY
        CASE COALESCE(ta.priority,'normal') WHEN 'emergency' THEN 1 WHEN 'urgent' THEN 2 ELSE 3 END,
        pe.updated_at ASC
    `, [doctorId]);

    res.json({ success: true, data: { encounters: result.rows } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ══════════════════════════════════════════════════════════════
// 8. START CONSULTATION  (Doctor)
// ══════════════════════════════════════════════════════════════
router.post('/:id/start-consultation', authenticate, authorize('doctor', 'admin', 'super_admin'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const enc = await client.query('SELECT * FROM patient_encounters WHERE id = $1', [req.params.id]);
    if (!enc.rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    if (enc.rows[0].status !== 'waiting_for_doctor') {
      return res.status(400).json({ success: false, message: `Cannot start consultation from: ${enc.rows[0].status}` });
    }

    let doctorId = req.body.doctor_id;
    if (req.user.role === 'doctor') {
      const doc = await client.query('SELECT id FROM doctors WHERE user_id = $1', [req.user.id]);
      doctorId = doc.rows[0]?.id;
    }

    // Create consultation record
    await client.query(
      `INSERT INTO doctor_consultations (encounter_id, patient_id, doctor_id, status)
       VALUES ($1, $2, $3, 'in_progress')
       ON CONFLICT (encounter_id) DO NOTHING`,
      [req.params.id, enc.rows[0].patient_id, doctorId]
    );

    await transitionStatus(client, req.params.id, 'in_consultation', req.user.id, 'Doctor started consultation');
    await client.query('COMMIT');
    res.json({ success: true, message: 'Consultation started' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally { client.release(); }
});

// ══════════════════════════════════════════════════════════════
// 9. COMPLETE CONSULTATION  (Doctor)
// ══════════════════════════════════════════════════════════════
router.post('/:id/complete-consultation', authenticate, authorize('doctor', 'admin', 'super_admin'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const enc = await client.query('SELECT * FROM patient_encounters WHERE id = $1', [req.params.id]);
    if (!enc.rows.length) return res.status(404).json({ success: false, message: 'Not found' });

    const { consultation_notes, diagnosis, icd_code, treatment_plan, follow_up_instructions } = req.body;

    let doctorId;
    if (req.user.role === 'doctor') {
      const doc = await client.query('SELECT id FROM doctors WHERE user_id = $1', [req.user.id]);
      doctorId = doc.rows[0]?.id;
    }

    // Update consultation
    const consult = await client.query(
      `UPDATE doctor_consultations SET
         consultation_notes = $1, diagnosis = $2, icd_code = $3,
         treatment_plan = $4, follow_up_instructions = $5,
         status = 'completed', completed_at = NOW(), updated_at = NOW()
       WHERE encounter_id = $6 RETURNING *`,
      [consultation_notes, diagnosis, icd_code, treatment_plan, follow_up_instructions, req.params.id]
    );

    // Auto-bill consultation
    if (consult.rows.length) {
      await billing.billConsultation({
        consultationId: consult.rows[0].id,
        patientId: enc.rows[0].patient_id,
        encounterId: enc.rows[0].id,
        doctorId,
        createdBy: req.user.id
      }).catch(e => console.error('Consultation billing error:', e.message));
    }

    // Transition status
    const newStatus = enc.rows[0].status === 'in_consultation' ? 'services_ordered' : enc.rows[0].status;
    await transitionStatus(client, req.params.id, 'billing_generated', req.user.id, 'Consultation completed + billed');

    await client.query('COMMIT');
    res.json({ success: true, message: 'Consultation completed and billed' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally { client.release(); }
});

// ══════════════════════════════════════════════════════════════
// 10. GET SINGLE ENCOUNTER (full detail)
// ══════════════════════════════════════════════════════════════
router.get('/:id', authenticate, async (req, res) => {
  try {
    const enc = await pool.query(`
      SELECT pe.*,
             p.first_name, p.last_name, p.date_of_birth, p.gender, p.phone, p.email,
             p.blood_type, p.allergies, p.medical_history,
             ta.priority, ta.chief_complaint, ta.preliminary_observations,
             ta.temperature, ta.blood_pressure_systolic, ta.blood_pressure_diastolic,
             ta.heart_rate, ta.respiratory_rate, ta.oxygen_saturation, ta.weight, ta.height,
             ta.assessed_at,
             ea.department_id, d.name AS department_name,
             ea.doctor_id, dr.first_name||' '||dr.last_name AS doctor_name,
             dc.consultation_notes, dc.diagnosis, dc.icd_code, dc.treatment_plan, dc.follow_up_instructions,
             dc.status AS consultation_status
      FROM patient_encounters pe
      JOIN patients p ON p.id = pe.patient_id
      LEFT JOIN triage_assessments ta ON ta.encounter_id = pe.id
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

    if (status) { where += ` AND pe.status = $${idx++}`; params.push(status); }
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
      LEFT JOIN triage_assessments ta ON ta.encounter_id = pe.id
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
      LEFT JOIN triage_assessments ta ON ta.encounter_id = pe.id
      LEFT JOIN invoices i ON i.encounter_id = pe.id
      LEFT JOIN (
        SELECT invoice_id, SUM(amount) AS amount_paid
        FROM payments GROUP BY invoice_id
      ) paid ON paid.invoice_id = i.id
      WHERE pe.status IN ('billing_generated','payment_pending')
        AND i.id IS NOT NULL
      ORDER BY
        CASE COALESCE(ta.priority,'normal') WHEN 'emergency' THEN 1 WHEN 'urgent' THEN 2 ELSE 3 END,
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
    await transitionStatus(client, req.params.id, 'paid', req.user.id, 'Payment received by cashier');
    await client.query('COMMIT');
    res.json({ success: true, message: 'Encounter marked as paid' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: 'Server error' });
  } finally { client.release(); }
});

module.exports = router;
