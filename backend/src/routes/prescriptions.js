const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { body, param } = require('express-validator');
const validate = require('../middleware/validation');
const { authenticate, authorize } = require('../middleware/auth');
const allergySafetyService = require('../services/allergySafetyService');
const notificationService = require('../services/notificationService');
const billingService = require('../services/billingService');
const dispensingService = require('../services/dispensingService');
const socketService = require('../services/socketService');

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
  body('medication_id').optional({ nullable: true }).isInt({ min: 1 }),
  body('expiry_date').optional({ nullable: true }).isISO8601().withMessage('Valid expiry date required')
];

const prescriptionUpdateRules = [
  body('medication_name').optional().notEmpty().trim().isLength({ max: 200 }),
  body('dosage').optional().notEmpty().trim().isLength({ max: 100 }),
  body('frequency').optional().notEmpty().trim().isLength({ max: 100 }),
  body('duration').optional().notEmpty().trim().isLength({ max: 100 }),
  body('instructions').optional({ nullable: true }).isString().trim().isLength({ max: 1000 }),
  body('quantity').optional().isInt({ min: 1, max: 9999 }),
  body('is_dispensed').optional().isBoolean().withMessage('is_dispensed must be a boolean'),
];

// ── 1. GET all prescriptions (with rich stock availability, status filters & search) ─
router.get('/', authenticate, async (req, res) => {
  try {
    const { patient_id, is_dispensed, status, search } = req.query;

    // Periodically update expired pending prescriptions
    await pool.query(`
      UPDATE prescriptions
      SET status = 'Expired', workflow_status = 'expired', updated_at = NOW()
      WHERE status IN ('Pending', 'Partially Dispensed')
        AND expiry_date IS NOT NULL
        AND expiry_date < CURRENT_DATE
    `).catch(e => console.error('Auto-expire prescriptions error:', e.message));

    let query = `
      SELECT 
        pr.*,
        p.first_name || ' ' || p.last_name AS patient_name,
        'AKEH-' || LPAD(p.id::text, 4, '0') AS patient_mrn,
        p.gender AS patient_gender,
        p.phone AS patient_phone,
        p.date_of_birth AS patient_dob,
        d.first_name || ' ' || d.last_name AS doctor_name,
        COALESCE(dept.name, 'General OPD') AS doctor_department,
        m.id AS mapped_med_id,
        COALESCE(m.unit_price, 0) AS unit_price,
        COALESCE(m.unit, 'Unit') AS medication_unit,
        m.category AS medication_category,
        m.is_controlled,
        COALESCE(pr.quantity, 1) AS quantity,
        COALESCE(pr.quantity_dispensed, 0) AS quantity_dispensed,
        GREATEST(0, COALESCE(pr.quantity, 1) - COALESCE(pr.quantity_dispensed, 0)) AS remaining_quantity,
        COALESCE(stock_summary.available_stock, 0)::int AS stock_available,
        COALESCE(stock_summary.batch_count, 0)::int AS active_batch_count,
        inv.id AS invoice_id,
        inv.status AS invoice_status,
        inv.total_amount AS invoice_total,
        u_disp.email AS dispensed_by_name
      FROM prescriptions pr
      JOIN patients p ON pr.patient_id = p.id
      JOIN doctors d ON pr.doctor_id = d.id
      LEFT JOIN departments dept ON d.department_id = dept.id
      LEFT JOIN medicines m ON (
        pr.medication_id = m.id 
        OR LOWER(m.name) = LOWER(pr.medication_name) 
        OR LOWER(m.generic_name) = LOWER(pr.medication_name)
      )
      LEFT JOIN LATERAL (
        SELECT 
          COALESCE(SUM(mb.quantity_available), 0) AS available_stock,
          COUNT(mb.id) AS batch_count
        FROM medication_batches mb
        WHERE mb.medication_id = COALESCE(pr.medication_id, m.id)
          AND mb.status = 'active'
          AND mb.expiry_date >= CURRENT_DATE
      ) stock_summary ON true
      LEFT JOIN invoices inv ON inv.id = pr.invoice_id
      LEFT JOIN users u_disp ON u_disp.id = pr.dispensed_by
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    // Role-based scoping
    if (req.user.role === 'patient') {
      const pat = await pool.query('SELECT id FROM patients WHERE user_id=$1', [req.user.id]);
      if (!pat.rows.length) return res.json({ success: true, data: { prescriptions: [] } });
      query += ` AND pr.patient_id=$${idx++}`;
      params.push(pat.rows[0].id);
    } else if (req.user.role === 'doctor') {
      const doc = await pool.query('SELECT id FROM doctors WHERE user_id=$1', [req.user.id]);
      if (doc.rows.length) {
        query += ` AND pr.doctor_id=$${idx++}`;
        params.push(doc.rows[0].id);
      }
    } else if (patient_id) {
      query += ` AND pr.patient_id=$${idx++}`;
      params.push(patient_id);
    }

    // Filter by boolean is_dispensed (backward-compatibility)
    if (is_dispensed !== undefined && is_dispensed !== '') {
      query += ` AND pr.is_dispensed=$${idx++}`;
      params.push(is_dispensed === 'true');
    }

    // Filter by formal workflow status
    if (status && status !== 'all' && status !== '') {
      const normStatus = status.trim().toLowerCase();
      if (normStatus === 'pending') {
        query += ` AND (pr.status = 'Pending' OR (pr.status IS NULL AND pr.is_dispensed = false))`;
      } else if (normStatus === 'partially dispensed' || normStatus === 'partially_dispensed') {
        query += ` AND pr.status = 'Partially Dispensed'`;
      } else if (normStatus === 'dispensed') {
        query += ` AND (pr.status = 'Dispensed' OR pr.is_dispensed = true)`;
      } else if (normStatus === 'cancelled') {
        query += ` AND pr.status = 'Cancelled'`;
      } else if (normStatus === 'expired') {
        query += ` AND (pr.status = 'Expired' OR (pr.expiry_date < CURRENT_DATE AND pr.is_dispensed = false))`;
      } else {
        query += ` AND LOWER(pr.status) = LOWER($${idx++})`;
        params.push(status);
      }
    }

    // Search query across patient, doctor, and medication
    if (search && search.trim() !== '') {
      const s = `%${search.trim()}%`;
      query += ` AND (
        p.first_name ILIKE $${idx} OR p.last_name ILIKE $${idx} OR
        (p.first_name || ' ' || p.last_name) ILIKE $${idx} OR
        ('AKEH-' || LPAD(p.id::text, 4, '0')) ILIKE $${idx} OR
        d.first_name ILIKE $${idx} OR d.last_name ILIKE $${idx} OR
        (d.first_name || ' ' || d.last_name) ILIKE $${idx} OR
        pr.medication_name ILIKE $${idx}
      )`;
      params.push(s);
      idx++;
    }

    query += ' ORDER BY pr.prescribed_date DESC';
    const result = await pool.query(query, params);

    res.json({ success: true, data: { prescriptions: result.rows } });
  } catch (err) {
    console.error('Error fetching prescriptions:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── 2. GET dispensing audit history across the hospital ─────────────────────
router.get('/dispensations/history', authenticate, authorize('pharmacist', 'admin', 'super_admin', 'doctor'), async (req, res) => {
  try {
    const { page, limit, patientId, medicineId, pharmacistId, search } = req.query;
    const history = await dispensingService.getAllDispensations({
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 50,
      patientId: patientId ? parseInt(patientId, 10) : undefined,
      medicationId: medicineId ? parseInt(medicineId, 10) : undefined,
      pharmacistId: pharmacistId ? parseInt(pharmacistId, 10) : undefined,
      search
    });

    res.json({ success: true, data: { dispensations: history } });
  } catch (err) {
    console.error('Error fetching dispensing history:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── 3. GET detailed prescription view (with inventory batches & history) ───
router.get('/:id', authenticate, async (req, res) => {
  try {
    const details = await dispensingService.getPrescriptionDetails(req.params.id);
    res.json({ success: true, data: details });
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ success: false, message: err.message || 'Server error' });
  }
});

// ── 4. POST dispense prescription (Pharmacist only) ─────────────────────────
router.post('/:id/dispense', authenticate, authorize('pharmacist', 'admin', 'super_admin'), async (req, res) => {
  try {
    const { quantity_to_dispense, batch_id, notes } = req.body;

    const result = await dispensingService.dispensePrescription({
      prescriptionId: parseInt(req.params.id, 10),
      quantityToDispense: quantity_to_dispense !== undefined ? parseInt(quantity_to_dispense, 10) : undefined,
      batchId: batch_id ? parseInt(batch_id, 10) : undefined,
      notes: notes || null,
      userId: req.user.id
    });

    res.json({
      success: true,
      message: result.isFullyDispensed
        ? `Prescription fully dispensed (${result.quantityDispensedNow} units).`
        : `Prescription partially dispensed (${result.quantityDispensedNow} units). Remaining: ${result.remainingQuantity}.`,
      data: result
    });
  } catch (err) {
    console.error('Error dispensing prescription:', err);
    const status = err.statusCode || 400;
    res.status(status).json({ success: false, message: err.message || 'Failed to dispense prescription' });
  }
});

// ── 5. POST cancel prescription ─────────────────────────────────────────────
router.post('/:id/cancel', authenticate, authorize('doctor', 'pharmacist', 'admin', 'super_admin'), async (req, res) => {
  try {
    const { reason } = req.body;
    const cancelled = await dispensingService.cancelPrescription({
      prescriptionId: parseInt(req.params.id, 10),
      reason: reason || 'Cancelled by clinical staff',
      userId: req.user.id
    });

    res.json({
      success: true,
      message: 'Prescription cancelled successfully.',
      data: { prescription: cancelled }
    });
  } catch (err) {
    const status = err.statusCode || 400;
    res.status(status).json({ success: false, message: err.message || 'Failed to cancel prescription' });
  }
});

// ── 6. Allergy pre-check & verification ─────────────────────────────────────
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

// ── 7. POST create prescription — Doctors only ──────────────────────────────
router.post('/', authenticate, authorize('doctor', 'super_admin', 'admin'), prescriptionCreateRules, validate, async (req, res) => {
  try {
    // Pharmacist is strictly forbidden from creating doctor prescriptions
    if (req.user.role === 'pharmacist') {
      return res.status(403).json({
        success: false,
        message: 'Pharmacists are not authorized to create prescriptions. Prescriptions must be issued by a physician.'
      });
    }

    const { patient_id, diagnosis_id, medication_name, dosage, frequency, duration, instructions,
            encounter_id, quantity = 1, medication_id, expiry_date, override_reason, override_acknowledged } = req.body;

    // 1. Clinical Allergy & Drug-Interaction Safety Check
    const allergyCheck = await allergySafetyService.checkMedicationAllergy(patient_id, medication_name);

    if (allergyCheck.hardBlocked) {
      return res.status(403).json({
        success: false,
        hardBlocked: true,
        alerts: allergyCheck.alerts,
        message: 'CLINICAL HARD STOP: This medication is strictly contraindicated due to a recorded life-threatening anaphylactic reaction.'
      });
    }

    if (allergyCheck.hasConflict) {
      const isAcknowledged = override_acknowledged === true || override_acknowledged === 'true';
      if (!isAcknowledged || !override_reason || override_reason.trim().length < 5) {
        const primaryAlert = allergyCheck.alerts[0];
        return res.status(400).json({
          success: false,
          requiresOverride: true,
          hardBlocked: allergyCheck.hardBlocked,
          allergyAlerts: allergyCheck.alerts,
          drugInteractions: allergyCheck.drugInteractions,
          ruleVersion: allergyCheck.ruleVersion,
          message: primaryAlert?.alertMessage || "PATIENT ALLERGY ALERT: Potential cross-reactivity detected. Review the patient's allergy history and clinical risk before prescribing."
        });
      }
    }

    let doctorId = req.body.doctor_id;
    if (req.user.role === 'doctor') {
      const doc = await pool.query('SELECT id FROM doctors WHERE user_id=$1', [req.user.id]);
      if (doc.rows.length) {
        doctorId = doc.rows[0].id;
      } else {
        const anyDoc = await pool.query('SELECT id FROM doctors ORDER BY id ASC LIMIT 1');
        if (anyDoc.rows.length) doctorId = anyDoc.rows[0].id;
      }
    } else if (!doctorId) {
      const anyDoc = await pool.query('SELECT id FROM doctors ORDER BY id ASC LIMIT 1');
      if (anyDoc.rows.length) doctorId = anyDoc.rows[0].id;
    }

    // Resolve medication_id if not given
    let resolvedMedId = medication_id;
    if (!resolvedMedId) {
      const medRes = await pool.query(
        'SELECT id FROM medicines WHERE LOWER(name) = LOWER($1) OR LOWER(generic_name) = LOWER($1) LIMIT 1',
        [medication_name.trim()]
      );
      if (medRes.rows.length) resolvedMedId = medRes.rows[0].id;
    }

    // Expiry date defaults to 30 days from now
    const calcExpiry = expiry_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    // 2. Create Prescription Record
    const result = await pool.query(
      `INSERT INTO prescriptions
         (patient_id, doctor_id, diagnosis_id, medication_name, dosage, frequency, duration, instructions, 
          encounter_id, quantity, quantity_dispensed, status, workflow_status, is_dispensed, medication_id, expiry_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 0, 'Pending', 'pending', false, $11, $12) 
       RETURNING *`,
      [patient_id, doctorId, diagnosis_id || null, medication_name, dosage, frequency, duration, instructions || null, 
       encounter_id || null, parseInt(quantity, 10) || 1, resolvedMedId || null, calcExpiry]
    );
    const prescription = result.rows[0];

    // 3. Record Allergy / DDI Override Audit if Conflict Existed
    if (allergyCheck.hasConflict && override_reason) {
      const primaryAlert = allergyCheck.alerts[0];
      const allergenName = primaryAlert ? primaryAlert.recordedAllergen : (allergyCheck.drugInteractions[0]?.interactingMedication || 'Drug Interaction');
      const severity = primaryAlert ? primaryAlert.severity : (allergyCheck.drugInteractions[0]?.severity || 'moderate');

      await pool.query(`
        INSERT INTO prescription_allergy_overrides
          (prescription_id, patient_id, medication_name, allergen_name, allergy_severity, prescriber_id, override_reason)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        prescription.id,
        patient_id,
        medication_name,
        allergenName,
        severity,
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
        `Clinical safety warning overridden by prescriber: ${override_reason}`,
        JSON.stringify({
          medication_name,
          allergen: allergenName,
          severity,
          alerts: allergyCheck.alerts,
          drugInteractions: allergyCheck.drugInteractions,
          ruleVersion: allergyCheck.ruleVersion,
          timestamp: new Date().toISOString()
        })
      ]);
    }

    // 4. Auto-billing integration
    const { alreadyExisted, invoice } = await billingService.billPrescription({
      prescriptionId: prescription.id,
      patientId: patient_id,
      encounterId: encounter_id || null,
      doctorId,
      medicationName: medication_name,
      quantity: parseInt(quantity, 10) || 1,
      createdBy: req.user.id
    }).catch(e => {
      console.error('Prescription billing error:', e.message);
      return { alreadyExisted: false, invoice: null };
    });

    if (invoice?.id) {
      await pool.query('UPDATE prescriptions SET invoice_id = $1 WHERE id = $2', [invoice.id, prescription.id]);
    }

    // Update encounter status
    if (encounter_id) {
      await pool.query(
        `UPDATE patient_encounters SET status = 'services_ordered', updated_at = NOW()
         WHERE id = $1 AND status = 'in_consultation'`,
        [encounter_id]
      );
    }

    // Realtime notification to Pharmacy
    try {
      socketService.emitToRole('pharmacist', 'new-prescription-order', {
        prescription,
        patientId: patient_id,
        medicationName: medication_name,
        quantity: parseInt(quantity, 10) || 1,
        timestamp: new Date().toISOString()
      });
    } catch (sockErr) {
      console.warn('Pharmacy socket notification warning:', sockErr.message);
    }

    res.status(201).json({
      success: true,
      data: { prescription, invoiceBilled: !alreadyExisted, invoice, allergyOverridden: allergyCheck.hasConflict }
    });
  } catch (err) {
    console.error('Prescription creation error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── 8. PUT update prescription ──────────────────────────────────────────────
router.put('/:id', authenticate, authorize('doctor', 'pharmacist', 'super_admin', 'admin'), prescriptionUpdateRules, validate, async (req, res) => {
  try {
    const { medication_name, dosage, frequency, duration, instructions, quantity, is_dispensed } = req.body;
    const existing = await pool.query('SELECT * FROM prescriptions WHERE id = $1', [req.params.id]);
    if (!existing.rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    const rx = existing.rows[0];

    // Pharmacist permission check: Pharmacist cannot edit doctor prescription details
    if (req.user.role === 'pharmacist') {
      if (medication_name || dosage || frequency || duration || quantity) {
        return res.status(403).json({
          success: false,
          message: 'Pharmacists cannot modify doctor prescription clinical details (medication, dosage, frequency, duration).'
        });
      }

      // If pharmacist requested dispensing
      if (is_dispensed === true || req.body.dispense === true) {
        const dispResult = await dispensingService.dispensePrescription({
          prescriptionId: parseInt(req.params.id, 10),
          quantityToDispense: req.body.quantity_to_dispense,
          batchId: req.body.batch_id,
          notes: req.body.notes,
          userId: req.user.id
        });
        return res.json({ success: true, data: { prescription: dispResult.prescription, ...dispResult } });
      }

      return res.status(400).json({ success: false, message: 'No valid pharmacist action requested.' });
    }

    // Doctor/Admin update: cannot edit if already dispensed
    if (rx.status === 'Dispensed' || rx.is_dispensed) {
      return res.status(400).json({ success: false, message: 'Cannot edit a prescription that has already been dispensed.' });
    }

    const workflowStatus = is_dispensed === true ? 'dispensed' : 'verified';
    const statusVal = is_dispensed === true ? 'Dispensed' : 'Pending';

    const result = await pool.query(
      `UPDATE prescriptions SET
        medication_name=COALESCE($1,medication_name), 
        dosage=COALESCE($2,dosage),
        frequency=COALESCE($3,frequency), 
        duration=COALESCE($4,duration),
        instructions=COALESCE($5,instructions), 
        quantity=COALESCE($6,quantity),
        is_dispensed=COALESCE($7,is_dispensed), 
        status=$8,
        workflow_status=$9, 
        updated_at=NOW()
       WHERE id=$10 RETURNING *`,
      [medication_name || null, dosage || null, frequency || null, duration || null,
       instructions || null, quantity ? parseInt(quantity, 10) : null,
       is_dispensed !== undefined ? is_dispensed : null, statusVal, workflowStatus, req.params.id]
    );

    await pool.query(
      `INSERT INTO workflow_status_history (entity_type, entity_id, from_status, to_status, changed_by) 
       VALUES ('prescription', $1, $2, $3, $4)`,
      [req.params.id, rx.workflow_status, workflowStatus, req.user.id]
    );

    res.json({ success: true, data: { prescription: result.rows[0] } });
  } catch (err) {
    console.error('Prescription update error:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

// ── 9. DELETE prescription — Doctor or Admin only ────────────────────────────
router.delete('/:id', authenticate, authorize('doctor', 'super_admin', 'admin'), async (req, res) => {
  try {
    if (req.user.role === 'pharmacist') {
      return res.status(403).json({
        success: false,
        message: 'Pharmacists cannot delete doctor prescriptions.'
      });
    }

    const existing = await pool.query('SELECT status, is_dispensed FROM prescriptions WHERE id = $1', [req.params.id]);
    if (!existing.rows.length) {
      return res.status(404).json({ success: false, message: 'Prescription not found' });
    }

    if (existing.rows[0].status === 'Dispensed' || existing.rows[0].is_dispensed) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete a prescription that has already been dispensed.'
      });
    }

    await pool.query('DELETE FROM prescriptions WHERE id=$1', [req.params.id]);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    console.error('Prescription deletion error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
