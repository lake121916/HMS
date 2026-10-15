const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { body, param } = require('express-validator');
const validate = require('../middleware/validation');
const { authenticate, authorize } = require('../middleware/auth');

// ── Prescription validators ─────────────────────────────────────────────────
const prescriptionCreateRules = [
  body('patient_id').isInt({ min: 1 }).withMessage('Valid patient_id required'),
  body('medication_name').notEmpty().trim().isLength({ max: 200 }).withMessage('Medication name is required (max 200 chars)'),
  body('dosage').notEmpty().trim().isLength({ max: 100 }).withMessage('Dosage is required (max 100 chars)'),
  body('frequency').notEmpty().trim().isLength({ max: 100 }).withMessage('Frequency is required'),
  body('duration').notEmpty().trim().isLength({ max: 100 }).withMessage('Duration is required'),
  body('instructions').optional({ nullable: true }).isString().trim().isLength({ max: 1000 }),
  body('quantity').optional().isInt({ min: 1, max: 9999 }).withMessage('Quantity must be 1–9999'),
  body('encounter_id').optional({ nullable: true }).isInt({ min: 1 }),
  body('diagnosis_id').optional({ nullable: true }).isInt({ min: 1 }),
];

const prescriptionUpdateRules = [
  body('medication_name').optional().notEmpty().trim().isLength({ max: 200 }),
  body('dosage').optional().notEmpty().trim().isLength({ max: 100 }),
  body('frequency').optional().notEmpty().trim().isLength({ max: 100 }),
  body('duration').optional().notEmpty().trim().isLength({ max: 100 }),
  body('instructions').optional({ nullable: true }).isString().trim().isLength({ max: 1000 }),
  body('is_dispensed').optional().isBoolean().withMessage('is_dispensed must be a boolean'),
];

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

const allergySafetyService = require('../services/allergySafetyService');

// POST validate medication against patient allergies (Pre-check)
router.post('/validate', authenticate, async (req, res) => {
  try {
    const { patient_id, medication_name } = req.body;
    if (!patient_id || !medication_name) {
      return res.status(400).json({ success: false, message: 'patient_id and medication_name are required' });
    }
    const checkResult = await allergySafetyService.checkMedicationAllergy(patient_id, medication_name);
    res.json({ success: true, data: checkResult });
  } catch (err) {
    console.error('Allergy validation error:', err);
    res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// GET patient structured allergies
router.get('/patient/:patientId/allergies', authenticate, async (req, res) => {
  try {
    const allergies = await pool.query(
      'SELECT * FROM patient_allergies WHERE patient_id = $1 ORDER BY recorded_date DESC',
      [req.params.patientId]
    );
    res.json({ success: true, data: { allergies: allergies.rows } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST add patient allergy
router.post('/patient/:patientId/allergies', authenticate, authorize('doctor', 'nurse', 'super_admin', 'admin'), async (req, res) => {
  try {
    const { allergen_name, allergen_category, reaction_description, severity, verification_status, clinical_notes } = req.body;
    if (!allergen_name) {
      return res.status(400).json({ success: false, message: 'allergen_name is required' });
    }

    const result = await pool.query(`
      INSERT INTO patient_allergies
        (patient_id, allergen_name, allergen_category, reaction_description, severity, verification_status, recorded_by, clinical_notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      req.params.patientId,
      allergen_name.trim(),
      allergen_category || 'drug',
      reaction_description || null,
      severity || 'moderate',
      verification_status || 'verified',
      req.user.id,
      clinical_notes || null
    ]);

    // Also update legacy text field on patients for backward compatibility
    await pool.query(`
      UPDATE patients
      SET allergies = CASE 
        WHEN allergies IS NULL OR LENGTH(TRIM(allergies)) = 0 THEN $1
        ELSE allergies || ', ' || $1
      END
      WHERE id = $2
    `, [allergen_name.trim(), req.params.patientId]);

    res.status(201).json({ success: true, data: { allergy: result.rows[0] } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST create — doctor only (auto-billing & allergy safety enabled)
router.post('/', authenticate, authorize('doctor', 'super_admin', 'admin'), prescriptionCreateRules, validate, async (req, res) => {
  try {
    const { patient_id, diagnosis_id, medication_name, dosage, frequency, duration, instructions,
            encounter_id, quantity = 1, override_reason } = req.body;

    // ── 1. Clinical Allergy Safety Check ────────────────────
    const allergyCheck = await allergySafetyService.checkMedicationAllergy(patient_id, medication_name);
    if (allergyCheck.hasConflict) {
      if (!override_reason || override_reason.trim().length === 0) {
        return res.status(400).json({
          success: false,
          requiresOverride: true,
          hardBlocked: allergyCheck.hardBlocked,
          allergyAlerts: allergyCheck.alerts,
          message: `Clinical Allergy Warning: Conflict detected with patient allergy record. Prescriber must review and provide an authorized clinical override reason.`
        });
      }
    }

    let doctorId = req.body.doctor_id;
    if (req.user.role === 'doctor') {
      const doc = await pool.query('SELECT id FROM doctors WHERE user_id=$1', [req.user.id]);
      if (doc.rows.length) doctorId = doc.rows[0].id;
    }

    // ── 2. Create Prescription Record ────────────────────────
    const result = await pool.query(
      `INSERT INTO prescriptions
         (patient_id, doctor_id, diagnosis_id, medication_name, dosage, frequency, duration, instructions, encounter_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [patient_id, doctorId, diagnosis_id||null, medication_name, dosage, frequency, duration, instructions||null, encounter_id||null]
    );
    const prescription = result.rows[0];

    // ── 3. Record Allergy Override Audit if Conflict Existed ─
    if (allergyCheck.hasConflict && override_reason) {
      const primaryAlert = allergyCheck.alerts[0];
      await pool.query(`
        INSERT INTO prescription_allergy_overrides
          (prescription_id, patient_id, medication_name, allergen_name, allergy_severity, prescriber_id, override_reason)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        prescription.id,
        patient_id,
        medication_name,
        primaryAlert.recordedAllergen,
        primaryAlert.severity,
        req.user.id,
        override_reason.trim()
      ]);

      await pool.query(`
        INSERT INTO clinical_audit_events
          (patient_id, record_type, record_id, action_type, performed_by, reason, metadata)
        VALUES ($1, 'prescription', $2, 'OVERRIDE_RECORDED', $3, $4, $5)
      `, [
        patient_id,
        prescription.id,
        req.user.id,
        `Allergy warning overridden by prescriber: ${override_reason}`,
        JSON.stringify({ medication_name, allergen: primaryAlert.recordedAllergen, severity: primaryAlert.severity })
      ]);
    }

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
      data: { prescription, invoiceBilled: !alreadyExisted, invoice, allergyOverridden: allergyCheck.hasConflict }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT update — doctor updates content; pharmacist marks dispensed
router.put('/:id', authenticate, authorize('doctor', 'pharmacist', 'super_admin', 'admin'), prescriptionUpdateRules, validate, async (req, res) => {
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
