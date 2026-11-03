const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const {
  generateBirthCertificatePdf,
  generateDeathCertificatePdf
} = require('../services/boardPdfService');

// ── Administrative Audit Logger Helper ─────────────────────────────────────────
async function logAdminAudit(clientOrPool, {
  module,
  action,
  entity_type,
  entity_id,
  performed_by,
  reason = null,
  old_values = null,
  new_values = null,
  ip_address = null
}) {
  try {
    await clientOrPool.query(
      `INSERT INTO administrative_audit_logs 
        (module, action, entity_type, entity_id, performed_by, reason, old_values, new_values, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        module,
        action,
        entity_type,
        entity_id,
        performed_by,
        reason,
        old_values ? JSON.stringify(old_values) : null,
        new_values ? JSON.stringify(new_values) : null,
        ip_address
      ]
    );
  } catch (err) {
    console.error('Administrative audit log error:', err.message);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. BIRTH CERTIFICATE MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/board/birth-certificates
router.get('/birth-certificates', authenticate, async (req, res) => {
  try {
    const { status, search, date_from, date_to, page = 1, limit = 25 } = req.query;
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const params = [];
    let whereClauses = ['1=1'];

    if (status && status !== 'all') {
      params.push(status);
      whereClauses.push(`br.certificate_status = $${params.length}`);
    }

    if (search) {
      params.push(`%${search.trim()}%`);
      whereClauses.push(`(
        br.baby_name ILIKE $${params.length} OR 
        br.registration_number ILIKE $${params.length} OR 
        br.certificate_number ILIKE $${params.length} OR 
        br.mother_name ILIKE $${params.length} OR
        br.father_name ILIKE $${params.length}
      )`);
    }

    if (date_from) {
      params.push(date_from);
      whereClauses.push(`br.date_of_birth >= $${params.length}`);
    }

    if (date_to) {
      params.push(date_to);
      whereClauses.push(`br.date_of_birth <= $${params.length}`);
    }

    const whereStr = whereClauses.join(' AND ');

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM birth_records br WHERE ${whereStr}`,
      params
    );
    const totalCount = parseInt(countRes.rows[0].count);

    const queryParams = [...params, parseInt(limit), offset];
    const dataRes = await pool.query(
      `SELECT br.*,
              p.first_name AS mother_first_name, p.last_name AS mother_last_name, p.phone AS mother_phone,
              u.first_name || ' ' || u.last_name AS registered_by_name,
              v.first_name || ' ' || v.last_name AS verified_by_name,
              a.first_name || ' ' || a.last_name AS approved_by_name,
              iss.first_name || ' ' || iss.last_name AS issued_by_name
       FROM birth_records br
       JOIN patients p ON p.id = br.mother_id
       LEFT JOIN users u ON u.id = br.registered_by
       LEFT JOIN users v ON v.id = br.verified_by
       LEFT JOIN users a ON a.id = br.approved_by
       LEFT JOIN users iss ON iss.id = br.issued_by
       WHERE ${whereStr}
       ORDER BY br.created_at DESC
       LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`,
      queryParams
    );

    res.json({
      success: true,
      count: totalCount,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(totalCount / parseInt(limit)),
      data: dataRes.rows
    });
  } catch (err) {
    console.error('Error fetching birth records:', err);
    res.status(500).json({ success: false, message: 'Server error fetching birth records' });
  }
});

// GET /api/board/birth-certificates/:id
router.get('/birth-certificates/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT br.*,
              p.first_name AS mother_first_name, p.last_name AS mother_last_name, p.phone AS mother_phone, p.blood_type AS mother_blood_type,
              u.first_name || ' ' || u.last_name AS registered_by_name,
              v.first_name || ' ' || v.last_name AS verified_by_name,
              a.first_name || ' ' || a.last_name AS approved_by_name,
              iss.first_name || ' ' || iss.last_name AS issued_by_name
       FROM birth_records br
       JOIN patients p ON p.id = br.mother_id
       LEFT JOIN users u ON u.id = br.registered_by
       LEFT JOIN users v ON v.id = br.verified_by
       LEFT JOIN users a ON a.id = br.approved_by
       LEFT JOIN users iss ON iss.id = br.issued_by
       WHERE br.id = $1`,
      [id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Birth record not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error fetching birth record detail:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/board/birth-certificates
router.post(
  '/birth-certificates',
  authenticate,
  authorize('admin', 'super_admin', 'hospital_manager', 'doctor', 'nurse'),
  async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const {
        baby_name,
        gender,
        date_of_birth,
        time_of_birth,
        mother_id,
        mother_name,
        father_name,
        father_national_id,
        father_phone,
        attending_clinician_id,
        attending_clinician_name,
        clinician_role = 'Doctor',
        delivery_type = 'Spontaneous Vaginal',
        birth_weight,
        gestational_age_weeks = 39,
        apgar_score_1min,
        apgar_score_5min,
        place_of_birth = 'Alem Ketema Enat Hospital - Maternity & Delivery Ward',
        medical_record_ref,
        certificate_status = 'pending_verification'
      } = req.body;

      if (!baby_name || !gender || !date_of_birth || !time_of_birth || !mother_id || !birth_weight) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: baby_name, gender, date_of_birth, time_of_birth, mother_id, birth_weight'
        });
      }

      // Check mother exists
      const motherCheck = await client.query(`SELECT id, first_name, last_name FROM patients WHERE id = $1`, [mother_id]);
      if (!motherCheck.rows.length) {
        return res.status(404).json({ success: false, message: 'Mother patient record not found' });
      }
      const actualMotherName = mother_name || `${motherCheck.rows[0].first_name} ${motherCheck.rows[0].last_name}`;

      // Generate unique registration number
      const year = new Date().getFullYear();
      const seqRes = await client.query(`SELECT COUNT(*) + 1 AS next_seq FROM birth_records`);
      const nextSeq = String(seqRes.rows[0].next_seq).padStart(4, '0');
      const registrationNumber = `BRC-REG-${year}-${nextSeq}`;

      const insertRes = await client.query(
        `INSERT INTO birth_records
          (registration_number, baby_name, gender, date_of_birth, time_of_birth, mother_id, mother_name,
           father_name, father_national_id, father_phone, attending_clinician_id, attending_clinician_name,
           clinician_role, delivery_type, birth_weight, gestational_age_weeks, apgar_score_1min, apgar_score_5min,
           place_of_birth, medical_record_ref, certificate_status, registered_by)
         VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
         RETURNING *`,
        [
          registrationNumber,
          baby_name.trim(),
          gender.toLowerCase(),
          date_of_birth,
          time_of_birth,
          mother_id,
          actualMotherName,
          father_name || null,
          father_national_id || null,
          father_phone || null,
          attending_clinician_id || req.user.id,
          attending_clinician_name || `${req.user.firstName || req.user.first_name || 'Dr.'} ${req.user.lastName || req.user.last_name || 'Staff'}`,
          clinician_role,
          delivery_type,
          parseFloat(birth_weight),
          gestational_age_weeks ? parseInt(gestational_age_weeks) : null,
          apgar_score_1min ? parseInt(apgar_score_1min) : null,
          apgar_score_5min ? parseInt(apgar_score_5min) : null,
          place_of_birth,
          medical_record_ref || null,
          certificate_status,
          req.user.id
        ]
      );

      const record = insertRes.rows[0];

      await logAdminAudit(client, {
        module: 'birth_certificate',
        action: 'CREATE',
        entity_type: 'birth_record',
        entity_id: record.id,
        performed_by: req.user.id,
        new_values: { registration_number: record.registration_number, baby_name: record.baby_name },
        ip_address: req.ip
      });

      await client.query('COMMIT');
      res.status(201).json({ success: true, message: 'Birth record registered successfully', data: record });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error creating birth record:', err);
      res.status(500).json({ success: false, message: 'Server error registering birth record' });
    } finally {
      client.release();
    }
  }
);

// PUT /api/board/birth-certificates/:id/verify
router.put(
  '/birth-certificates/:id/verify',
  authenticate,
  authorize('admin', 'super_admin', 'hospital_manager', 'doctor', 'nurse'),
  async (req, res) => {
    const { id } = req.params;
    try {
      const check = await pool.query(`SELECT * FROM birth_records WHERE id = $1`, [id]);
      if (!check.rows.length) {
        return res.status(404).json({ success: false, message: 'Birth record not found' });
      }

      const updated = await pool.query(
        `UPDATE birth_records
         SET certificate_status = 'approved',
             verified_by = $1,
             verified_at = NOW(),
             updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [req.user.id, id]
      );

      await logAdminAudit(pool, {
        module: 'birth_certificate',
        action: 'VERIFY',
        entity_type: 'birth_record',
        entity_id: parseInt(id),
        performed_by: req.user.id,
        old_values: { status: check.rows[0].certificate_status },
        new_values: { status: 'approved' },
        ip_address: req.ip
      });

      res.json({ success: true, message: 'Birth record medically verified and approved', data: updated.rows[0] });
    } catch (err) {
      console.error('Error verifying birth record:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// PUT /api/board/birth-certificates/:id/approve
router.put(
  '/birth-certificates/:id/approve',
  authenticate,
  authorize('admin', 'super_admin', 'hospital_manager'),
  async (req, res) => {
    const { id } = req.params;
    try {
      const check = await pool.query(`SELECT * FROM birth_records WHERE id = $1`, [id]);
      if (!check.rows.length) {
        return res.status(404).json({ success: false, message: 'Birth record not found' });
      }

      const updated = await pool.query(
        `UPDATE birth_records
         SET certificate_status = 'approved',
             approved_by = $1,
             approved_at = NOW(),
             updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [req.user.id, id]
      );

      await logAdminAudit(pool, {
        module: 'birth_certificate',
        action: 'APPROVE',
        entity_type: 'birth_record',
        entity_id: parseInt(id),
        performed_by: req.user.id,
        new_values: { status: 'approved' },
        ip_address: req.ip
      });

      res.json({ success: true, message: 'Birth certificate approved', data: updated.rows[0] });
    } catch (err) {
      console.error('Error approving birth record:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// PUT /api/board/birth-certificates/:id/issue
router.put(
  '/birth-certificates/:id/issue',
  authenticate,
  authorize('admin', 'super_admin', 'hospital_manager'),
  async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const check = await client.query(`SELECT * FROM birth_records WHERE id = $1`, [id]);
      if (!check.rows.length) {
        return res.status(404).json({ success: false, message: 'Birth record not found' });
      }
      const record = check.rows[0];

      const year = new Date().getFullYear();
      let certNumber = record.certificate_number;
      if (!certNumber) {
        certNumber = `BRC-${year}-${String(id).padStart(6, '0')}`;
      }

      let token = record.verification_token;
      if (!token) {
        token = `vtok_birth_${crypto.randomBytes(8).toString('hex')}`;
      }

      // Update birth record
      const updatedRes = await client.query(
        `UPDATE birth_records
         SET certificate_number = $1,
             certificate_status = 'issued',
             verification_token = $2,
             issued_by = $3,
             issued_at = NOW(),
             updated_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [certNumber, token, req.user.id, id]
      );

      // Register into document_verifications table for public QR lookup
      await client.query(
        `INSERT INTO document_verifications
          (verification_token, document_type, document_number, entity_id, patient_id, issued_by, status, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, 'valid', $7)
         ON CONFLICT (verification_token) DO UPDATE 
         SET status = 'valid', document_number = EXCLUDED.document_number`,
        [
          token,
          'birth_certificate',
          certNumber,
          record.id,
          record.mother_id,
          req.user.id,
          JSON.stringify({
            baby_name: record.baby_name,
            gender: record.gender,
            delivery_type: record.delivery_type,
            birth_weight: record.birth_weight
          })
        ]
      );

      await logAdminAudit(client, {
        module: 'birth_certificate',
        action: 'ISSUE',
        entity_type: 'birth_record',
        entity_id: parseInt(id),
        performed_by: req.user.id,
        new_values: { certificate_number: certNumber, verification_token: token, status: 'issued' },
        ip_address: req.ip
      });

      await client.query('COMMIT');
      res.json({ success: true, message: 'Birth certificate formally issued', data: updatedRes.rows[0] });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error issuing birth certificate:', err);
      res.status(500).json({ success: false, message: 'Server error issuing birth certificate' });
    } finally {
      client.release();
    }
  }
);

// PUT /api/board/birth-certificates/:id/correct
router.put(
  '/birth-certificates/:id/correct',
  authenticate,
  authorize('admin', 'super_admin', 'hospital_manager'),
  async (req, res) => {
    const { id } = req.params;
    const { baby_name, father_name, birth_weight, delivery_type, father_national_id, father_phone } = req.body;
    const correction_notes = req.body.correction_notes || req.body.correction_reason;

    if (!correction_notes) {
      return res.status(400).json({ success: false, message: 'Correction notes describing the amendment are required' });
    }

    try {
      const check = await pool.query(`SELECT * FROM birth_records WHERE id = $1`, [id]);
      if (!check.rows.length) {
        return res.status(404).json({ success: false, message: 'Birth record not found' });
      }
      const oldRecord = check.rows[0];

      const updated = await pool.query(
        `UPDATE birth_records
         SET baby_name = COALESCE($1, baby_name),
             father_name = COALESCE($2, father_name),
             birth_weight = COALESCE($3, birth_weight),
             delivery_type = COALESCE($4, delivery_type),
             father_national_id = COALESCE($5, father_national_id),
             father_phone = COALESCE($6, father_phone),
             correction_notes = COALESCE(correction_notes || E'\n' || $7, $7),
             certificate_status = 'corrected',
             updated_at = NOW()
         WHERE id = $8
         RETURNING *`,
        [
          baby_name || null,
          father_name || null,
          birth_weight ? parseFloat(birth_weight) : null,
          delivery_type || null,
          father_national_id || null,
          father_phone || null,
          `[${new Date().toISOString()}] ${req.user.first_name || 'Admin'}: ${correction_notes}`,
          id
        ]
      );

      await logAdminAudit(pool, {
        module: 'birth_certificate',
        action: 'CORRECT',
        entity_type: 'birth_record',
        entity_id: parseInt(id),
        performed_by: req.user.id,
        reason: correction_notes,
        old_values: { baby_name: oldRecord.baby_name, father_name: oldRecord.father_name, birth_weight: oldRecord.birth_weight },
        new_values: { baby_name: updated.rows[0].baby_name, father_name: updated.rows[0].father_name, birth_weight: updated.rows[0].birth_weight },
        ip_address: req.ip
      });

      res.json({ success: true, message: 'Birth certificate corrected with audit trail', data: updated.rows[0] });
    } catch (err) {
      console.error('Error correcting birth record:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// PUT /api/board/birth-certificates/:id/reject
router.put(
  '/birth-certificates/:id/reject',
  authenticate,
  authorize('admin', 'super_admin', 'hospital_manager', 'doctor'),
  async (req, res) => {
    const { id } = req.params;
    const { rejection_reason } = req.body;
    if (!rejection_reason) {
      return res.status(400).json({ success: false, message: 'Rejection reason is required' });
    }

    try {
      const updated = await pool.query(
        `UPDATE birth_records
         SET certificate_status = 'rejected',
             rejection_reason = $1,
             updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [rejection_reason, id]
      );

      if (!updated.rows.length) {
        return res.status(404).json({ success: false, message: 'Birth record not found' });
      }

      await logAdminAudit(pool, {
        module: 'birth_certificate',
        action: 'REJECT',
        entity_type: 'birth_record',
        entity_id: parseInt(id),
        performed_by: req.user.id,
        reason: rejection_reason,
        ip_address: req.ip
      });

      res.json({ success: true, message: 'Birth certificate rejected', data: updated.rows[0] });
    } catch (err) {
      console.error('Error rejecting birth record:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// GET /api/board/birth-certificates/:id/pdf
router.get('/birth-certificates/:id/pdf', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT br.*,
              p.first_name AS mother_first_name, p.last_name AS mother_last_name, p.phone AS mother_phone, p.date_of_birth AS mother_dob
       FROM birth_records br
       JOIN patients p ON p.id = br.mother_id
       WHERE br.id = $1`,
      [id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Birth record not found' });
    }

    const birthData = result.rows[0];
    const pdfBuffer = await generateBirthCertificatePdf(birthData, birthData.verification_token);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="birth_certificate_${birthData.certificate_number || birthData.registration_number}.pdf"`
    );
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Error generating birth certificate PDF:', err);
    res.status(500).json({ success: false, message: 'Failed to generate birth certificate PDF' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// 2. DEATH CERTIFICATE MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/board/death-certificates
router.get('/death-certificates', authenticate, async (req, res) => {
  try {
    const { status, search, department_id, date_from, date_to, page = 1, limit = 25 } = req.query;
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const params = [];
    let whereClauses = ['1=1'];

    if (status && status !== 'all') {
      params.push(status);
      whereClauses.push(`dr.document_status = $${params.length}`);
    }

    if (department_id) {
      params.push(parseInt(department_id));
      whereClauses.push(`dr.department_id = $${params.length}`);
    }

    if (search) {
      params.push(`%${search.trim()}%`);
      whereClauses.push(`(
        dr.patient_name ILIKE $${params.length} OR 
        dr.record_number ILIKE $${params.length} OR 
        dr.document_number ILIKE $${params.length} OR 
        dr.mrn ILIKE $${params.length} OR
        dr.immediate_cause ILIKE $${params.length} OR
        dr.next_of_kin_name ILIKE $${params.length}
      )`);
    }

    if (date_from) {
      params.push(date_from);
      whereClauses.push(`dr.date_of_death >= $${params.length}`);
    }

    if (date_to) {
      params.push(date_to);
      whereClauses.push(`dr.date_of_death <= $${params.length}`);
    }

    const whereStr = whereClauses.join(' AND ');

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM death_records dr WHERE ${whereStr}`,
      params
    );
    const totalCount = parseInt(countRes.rows[0].count);

    const queryParams = [...params, parseInt(limit), offset];
    const dataRes = await pool.query(
      `SELECT dr.*,
              d.name AS dept_name,
              u.first_name || ' ' || u.last_name AS attending_doctor_full_name,
              v.first_name || ' ' || v.last_name AS verified_by_name,
              a.first_name || ' ' || a.last_name AS approved_by_name,
              iss.first_name || ' ' || iss.last_name AS issued_by_name
       FROM death_records dr
       LEFT JOIN departments d ON d.id = dr.department_id
       LEFT JOIN users u ON u.id = dr.attending_doctor_id
       LEFT JOIN users v ON v.id = dr.verified_by
       LEFT JOIN users a ON a.id = dr.approved_by
       LEFT JOIN users iss ON iss.id = dr.issued_by
       WHERE ${whereStr}
       ORDER BY dr.created_at DESC
       LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`,
      queryParams
    );

    res.json({
      success: true,
      count: totalCount,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(totalCount / parseInt(limit)),
      data: dataRes.rows
    });
  } catch (err) {
    console.error('Error fetching death records:', err);
    res.status(500).json({ success: false, message: 'Server error fetching death records' });
  }
});

// GET /api/board/death-certificates/:id
router.get('/death-certificates/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT dr.*,
              d.name AS dept_name,
              u.first_name || ' ' || u.last_name AS attending_doctor_full_name,
              v.first_name || ' ' || v.last_name AS verified_by_name,
              a.first_name || ' ' || a.last_name AS approved_by_name,
              iss.first_name || ' ' || iss.last_name AS issued_by_name
       FROM death_records dr
       LEFT JOIN departments d ON d.id = dr.department_id
       LEFT JOIN users u ON u.id = dr.attending_doctor_id
       LEFT JOIN users v ON v.id = dr.verified_by
       LEFT JOIN users a ON a.id = dr.approved_by
       LEFT JOIN users iss ON iss.id = dr.issued_by
       WHERE dr.id = $1`,
      [id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Death record not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error fetching death record detail:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/board/death-certificates
router.post(
  '/death-certificates',
  authenticate,
  authorize('doctor', 'admin', 'super_admin', 'hospital_manager'),
  async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const {
        patient_id,
        patient_name,
        mrn,
        gender,
        age_years,
        date_of_death,
        time_of_death,
        department_id,
        department_name,
        place_of_death = 'Alem Ketema Enat Hospital',
        attending_doctor_id,
        attending_doctor_name,
        immediate_cause,
        antecedent_cause,
        underlying_cause,
        icd10_code,
        contributing_conditions,
        autopsy_requested = false,
        medical_history_summary,
        next_of_kin_name,
        next_of_kin_relation: kinRelation,
        next_of_kin_phone,
        next_of_kin_address
      } = req.body;
      const next_of_kin_relation = kinRelation || req.body.next_of_kin_relationship;

      if (!patient_id || !date_of_death || !time_of_death || !immediate_cause || !next_of_kin_name || !next_of_kin_relation) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: patient_id, date_of_death, time_of_death, immediate_cause, next_of_kin_name, next_of_kin_relation'
        });
      }

      // Verify patient exists
      const patientCheck = await client.query(`SELECT id, first_name, last_name, gender, date_of_birth FROM patients WHERE id = $1`, [patient_id]);
      if (!patientCheck.rows.length) {
        return res.status(404).json({ success: false, message: 'Patient not found' });
      }
      const patient = patientCheck.rows[0];
      const actualName = patient_name || `${patient.first_name} ${patient.last_name}`;
      const actualGender = gender || patient.gender;

      // Calculate approximate age if not given
      let actualAge = age_years;
      if (!actualAge && patient.date_of_birth) {
        actualAge = Math.floor((new Date(date_of_death) - new Date(patient.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000));
      }

      const year = new Date().getFullYear();
      const countRes = await client.query(`SELECT COUNT(*) + 1 AS next_seq FROM death_records`);
      const recordNumber = `REC-DTH-${year}-${String(countRes.rows[0].next_seq).padStart(4, '0')}`;

      const insertRes = await client.query(
        `INSERT INTO death_records
          (record_number, patient_id, patient_name, mrn, gender, age_years, date_of_death, time_of_death,
           department_id, department_name, place_of_death, attending_doctor_id, attending_doctor_name,
           immediate_cause, antecedent_cause, underlying_cause, icd10_code, contributing_conditions,
           autopsy_requested, medical_history_summary, next_of_kin_name, next_of_kin_relation,
           next_of_kin_phone, next_of_kin_address, document_status, registered_by)
         VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, 'pending_medical_verification', $25)
         RETURNING *`,
        [
          recordNumber,
          patient_id,
          actualName,
          mrn || `ETH-MRN-${patient_id}`,
          actualGender,
          actualAge || null,
          date_of_death,
          time_of_death,
          department_id || null,
          department_name || null,
          place_of_death,
          attending_doctor_id || req.user.id,
          attending_doctor_name || `${req.user.firstName || req.user.first_name || 'Dr.'} ${req.user.lastName || req.user.last_name || 'Clinician'}`,
          immediate_cause.trim(),
          antecedent_cause || null,
          underlying_cause || null,
          icd10_code || null,
          contributing_conditions || null,
          Boolean(autopsy_requested),
          medical_history_summary || null,
          next_of_kin_name.trim(),
          next_of_kin_relation.trim(),
          next_of_kin_phone || null,
          next_of_kin_address || null,
          req.user.id
        ]
      );

      const record = insertRes.rows[0];

      await logAdminAudit(client, {
        module: 'death_certificate',
        action: 'CREATE',
        entity_type: 'death_record',
        entity_id: record.id,
        performed_by: req.user.id,
        new_values: { record_number: record.record_number, patient_name: record.patient_name, immediate_cause: record.immediate_cause },
        ip_address: req.ip
      });

      await client.query('COMMIT');
      res.status(201).json({ success: true, message: 'Hospital death record documented', data: record });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error recording death documentation:', err);
      res.status(500).json({ success: false, message: 'Server error documenting death record' });
    } finally {
      client.release();
    }
  }
);

// PUT /api/board/death-certificates/:id/verify
router.put(
  '/death-certificates/:id/verify',
  authenticate,
  authorize('doctor', 'admin', 'super_admin'),
  async (req, res) => {
    const { id } = req.params;
    try {
      const check = await pool.query(`SELECT * FROM death_records WHERE id = $1`, [id]);
      if (!check.rows.length) {
        return res.status(404).json({ success: false, message: 'Death record not found' });
      }

      const updated = await pool.query(
        `UPDATE death_records
         SET document_status = 'verified',
             verified_by = $1,
             verified_at = NOW(),
             updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [req.user.id, id]
      );

      await logAdminAudit(pool, {
        module: 'death_certificate',
        action: 'VERIFY',
        entity_type: 'death_record',
        entity_id: parseInt(id),
        performed_by: req.user.id,
        new_values: { status: 'verified' },
        ip_address: req.ip
      });

      res.json({ success: true, message: 'Medical cause of death verified by physician', data: updated.rows[0] });
    } catch (err) {
      console.error('Error verifying death record:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// PUT /api/board/death-certificates/:id/approve
router.put(
  '/death-certificates/:id/approve',
  authenticate,
  authorize('admin', 'super_admin', 'hospital_manager'),
  async (req, res) => {
    const { id } = req.params;
    try {
      const updated = await pool.query(
        `UPDATE death_records
         SET document_status = 'approved',
             approved_by = $1,
             approved_at = NOW(),
             updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [req.user.id, id]
      );

      if (!updated.rows.length) {
        return res.status(404).json({ success: false, message: 'Death record not found' });
      }

      await logAdminAudit(pool, {
        module: 'death_certificate',
        action: 'APPROVE',
        entity_type: 'death_record',
        entity_id: parseInt(id),
        performed_by: req.user.id,
        new_values: { status: 'approved' },
        ip_address: req.ip
      });

      res.json({ success: true, message: 'Hospital death documentation approved', data: updated.rows[0] });
    } catch (err) {
      console.error('Error approving death record:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// PUT /api/board/death-certificates/:id/issue
router.put(
  '/death-certificates/:id/issue',
  authenticate,
  authorize('admin', 'super_admin', 'hospital_manager'),
  async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const check = await client.query(`SELECT * FROM death_records WHERE id = $1`, [id]);
      if (!check.rows.length) {
        return res.status(404).json({ success: false, message: 'Death record not found' });
      }
      const record = check.rows[0];

      const year = new Date().getFullYear();
      let docNumber = record.document_number;
      if (!docNumber) {
        docNumber = `DOC-DTH-${year}-${String(id).padStart(5, '0')}`;
      }

      let token = record.verification_token;
      if (!token) {
        token = `vtok_death_${crypto.randomBytes(8).toString('hex')}`;
      }

      const updatedRes = await client.query(
        `UPDATE death_records
         SET document_number = $1,
             document_status = 'issued',
             verification_token = $2,
             issued_by = $3,
             issued_at = NOW(),
             updated_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [docNumber, token, req.user.id, id]
      );

      // Register with document_verifications for public QR lookup
      await client.query(
        `INSERT INTO document_verifications
          (verification_token, document_type, document_number, entity_id, patient_id, issued_by, status, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, 'valid', $7)
         ON CONFLICT (verification_token) DO UPDATE 
         SET status = 'valid', document_number = EXCLUDED.document_number`,
        [
          token,
          'death_certificate',
          docNumber,
          record.id,
          record.patient_id,
          req.user.id,
          JSON.stringify({
            deceased_name: record.patient_name,
            immediate_cause: record.immediate_cause,
            underlying_cause: record.underlying_cause
          })
        ]
      );

      await logAdminAudit(client, {
        module: 'death_certificate',
        action: 'ISSUE',
        entity_type: 'death_record',
        entity_id: parseInt(id),
        performed_by: req.user.id,
        new_values: { document_number: docNumber, status: 'issued' },
        ip_address: req.ip
      });

      await client.query('COMMIT');
      res.json({ success: true, message: 'Official death documentation issued', data: updatedRes.rows[0] });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error issuing death document:', err);
      res.status(500).json({ success: false, message: 'Server error issuing death certificate' });
    } finally {
      client.release();
    }
  }
);

// PUT /api/board/death-certificates/:id/reject
router.put(
  '/death-certificates/:id/reject',
  authenticate,
  authorize('doctor', 'admin', 'super_admin', 'hospital_manager'),
  async (req, res) => {
    const { id } = req.params;
    const { rejection_reason } = req.body;
    if (!rejection_reason) {
      return res.status(400).json({ success: false, message: 'Rejection reason is required' });
    }

    try {
      const updated = await pool.query(
        `UPDATE death_records
         SET document_status = 'rejected',
             rejection_reason = $1,
             updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [rejection_reason, id]
      );

      if (!updated.rows.length) {
        return res.status(404).json({ success: false, message: 'Death record not found' });
      }

      await logAdminAudit(pool, {
        module: 'death_certificate',
        action: 'REJECT',
        entity_type: 'death_record',
        entity_id: parseInt(id),
        performed_by: req.user.id,
        reason: rejection_reason,
        ip_address: req.ip
      });

      res.json({ success: true, message: 'Death documentation rejected', data: updated.rows[0] });
    } catch (err) {
      console.error('Error rejecting death record:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// GET /api/board/death-certificates/:id/pdf
router.get('/death-certificates/:id/pdf', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT dr.*,
              d.name AS dept_name
       FROM death_records dr
       LEFT JOIN departments d ON d.id = dr.department_id
       WHERE dr.id = $1`,
      [id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Death record not found' });
    }

    const deathData = result.rows[0];
    const pdfBuffer = await generateDeathCertificatePdf(deathData, deathData.verification_token);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="death_certificate_${deathData.document_number || deathData.record_number}.pdf"`
    );
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Error generating death certificate PDF:', err);
    res.status(500).json({ success: false, message: 'Failed to generate death certificate PDF' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// 3. SCHOLARSHIP MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/board/scholarships/programs
router.get('/scholarships/programs', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT sp.*,
             COUNT(sa.id)::int AS total_applications,
             COUNT(CASE WHEN sa.status = 'approved' THEN 1 END)::int AS approved_applications
      FROM scholarship_programs sp
      LEFT JOIN scholarship_applications sa ON sa.program_id = sp.id
      GROUP BY sp.id
      ORDER BY sp.status = 'active' DESC, sp.closing_date ASC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching scholarship programs:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/board/scholarships/programs
router.post(
  '/scholarships/programs',
  authenticate,
  authorize('admin', 'super_admin', 'hospital_manager'),
  async (req, res) => {
    try {
      const {
        program_code,
        title,
        category,
        sponsoring_org,
        total_slots = 1,
        opening_date,
        closing_date,
        eligibility_criteria,
        financial_support_amount = 0,
        duration_months = 12,
        required_documents = ['Curriculum Vitae', 'Degree Certificate', 'Recommendation Letter']
      } = req.body;

      if (!title || !category || !sponsoring_org || !opening_date || !closing_date || !eligibility_criteria) {
        return res.status(400).json({ success: false, message: 'Missing required program parameters' });
      }

      const year = new Date().getFullYear();
      let code = program_code;
      if (!code) {
        const countRes = await pool.query(`SELECT COUNT(*) + 1 AS seq FROM scholarship_programs`);
        code = `SCH-${year}-${String(countRes.rows[0].seq).padStart(3, '0')}`;
      }

      const result = await pool.query(
        `INSERT INTO scholarship_programs
          (program_code, title, category, sponsoring_org, total_slots, available_slots, opening_date, closing_date,
           eligibility_criteria, financial_support_amount, duration_months, required_documents, created_by)
         VALUES ($1, $2, $3, $4, $5, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [
          code,
          title.trim(),
          category.trim(),
          sponsoring_org.trim(),
          parseInt(total_slots),
          opening_date,
          closing_date,
          eligibility_criteria.trim(),
          parseFloat(financial_support_amount),
          parseInt(duration_months),
          JSON.stringify(required_documents),
          req.user.id
        ]
      );

      await logAdminAudit(pool, {
        module: 'scholarship',
        action: 'CREATE',
        entity_type: 'scholarship_program',
        entity_id: result.rows[0].id,
        performed_by: req.user.id,
        new_values: { program_code: code, title },
        ip_address: req.ip
      });

      res.status(201).json({ success: true, message: 'Scholarship program created', data: result.rows[0] });
    } catch (err) {
      console.error('Error creating scholarship program:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// GET /api/board/scholarships/applications
router.get('/scholarships/applications', authenticate, async (req, res) => {
  try {
    const { program_id, status } = req.query;
    const isStaffReviewer = ['admin', 'super_admin', 'hospital_manager'].includes(req.user.role);

    const params = [];
    let whereClauses = ['1=1'];

    // If regular staff, only see their own applications
    if (!isStaffReviewer) {
      params.push(req.user.id);
      whereClauses.push(`sa.applicant_user_id = $${params.length}`);
    }

    if (program_id) {
      params.push(parseInt(program_id));
      whereClauses.push(`sa.program_id = $${params.length}`);
    }

    if (status && status !== 'all') {
      params.push(status);
      whereClauses.push(`sa.status = $${params.length}`);
    }

    const whereStr = whereClauses.join(' AND ');

    const result = await pool.query(
      `SELECT sa.*,
              sp.title AS program_title, sp.category AS program_category, sp.financial_support_amount,
              d.name AS department_name,
              u.first_name || ' ' || u.last_name AS evaluator_name,
              appr.first_name || ' ' || appr.last_name AS approver_name
       FROM scholarship_applications sa
       JOIN scholarship_programs sp ON sp.id = sa.program_id
       LEFT JOIN departments d ON d.id = sa.department_id
       LEFT JOIN users u ON u.id = sa.evaluated_by
       LEFT JOIN users appr ON appr.id = sa.approved_by
       WHERE ${whereStr}
       ORDER BY sa.created_at DESC`,
      params
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching scholarship applications:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/board/scholarships/applications
router.post('/scholarships/applications', authenticate, async (req, res) => {
  try {
    const {
      program_id,
      applicant_name,
      applicant_type = 'employee',
      employee_id_code,
      department_id,
      education_level,
      academic_gpa,
      years_of_experience = 0,
      contact_phone,
      contact_email,
      statement_of_purpose,
      documents_meta = []
    } = req.body;

    if (!program_id || !education_level || !contact_phone || !contact_email) {
      return res.status(400).json({
        success: false,
        message: 'Missing required application fields: program_id, education_level, contact_phone, contact_email'
      });
    }

    const progCheck = await pool.query(`SELECT id, status, closing_date FROM scholarship_programs WHERE id = $1`, [program_id]);
    if (!progCheck.rows.length) {
      return res.status(404).json({ success: false, message: 'Scholarship program not found' });
    }
    if (progCheck.rows[0].status !== 'active') {
      return res.status(400).json({ success: false, message: 'This scholarship program is no longer accepting applications' });
    }

    const year = new Date().getFullYear();
    const countRes = await pool.query(`SELECT COUNT(*) + 1 AS seq FROM scholarship_applications`);
    const appNumber = `SCH-APP-${year}-${String(countRes.rows[0].seq).padStart(4, '0')}`;

    const actualName = applicant_name || `${req.user.firstName || req.user.first_name || 'Staff'} ${req.user.lastName || req.user.last_name || 'Member'}`;

    const result = await pool.query(
      `INSERT INTO scholarship_applications
        (application_number, program_id, applicant_user_id, applicant_name, applicant_type, employee_id_code,
         department_id, education_level, academic_gpa, years_of_experience, contact_phone, contact_email,
         statement_of_purpose, status, documents_meta)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'submitted', $14)
       RETURNING *`,
      [
        appNumber,
        program_id,
        req.user.id,
        actualName,
        applicant_type,
        employee_id_code || `EMP-${req.user.id}`,
        department_id || null,
        education_level,
        academic_gpa ? parseFloat(academic_gpa) : null,
        years_of_experience ? parseFloat(years_of_experience) : 0,
        contact_phone,
        contact_email,
        statement_of_purpose || null,
        JSON.stringify(documents_meta)
      ]
    );

    await logAdminAudit(pool, {
      module: 'scholarship',
      action: 'CREATE',
      entity_type: 'scholarship_application',
      entity_id: result.rows[0].id,
      performed_by: req.user.id,
      new_values: { application_number: appNumber, program_id },
      ip_address: req.ip
    });

    res.status(201).json({ success: true, message: 'Scholarship application submitted successfully', data: result.rows[0] });
  } catch (err) {
    console.error('Error submitting scholarship application:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/board/scholarships/applications/:id/evaluate
router.put(
  '/scholarships/applications/:id/evaluate',
  authenticate,
  authorize('admin', 'super_admin', 'hospital_manager'),
  async (req, res) => {
    const { id } = req.params;
    const { evaluation_score, evaluation_remarks, shortlist = false } = req.body;

    if (evaluation_score === undefined || evaluation_score === null) {
      return res.status(400).json({ success: false, message: 'Evaluation score is required' });
    }

    try {
      const nextStatus = shortlist ? 'shortlisted' : 'under_review';
      const updated = await pool.query(
        `UPDATE scholarship_applications
         SET evaluation_score = $1,
             evaluation_remarks = $2,
             evaluated_by = $3,
             evaluated_at = NOW(),
             status = $4,
             updated_at = NOW()
         WHERE id = $5
         RETURNING *`,
        [parseFloat(evaluation_score), evaluation_remarks || null, req.user.id, nextStatus, id]
      );

      if (!updated.rows.length) {
        return res.status(404).json({ success: false, message: 'Application not found' });
      }

      await logAdminAudit(pool, {
        module: 'scholarship',
        action: 'EVALUATE',
        entity_type: 'scholarship_application',
        entity_id: parseInt(id),
        performed_by: req.user.id,
        new_values: { score: evaluation_score, status: nextStatus },
        ip_address: req.ip
      });

      res.json({ success: true, message: 'Scholarship evaluation recorded', data: updated.rows[0] });
    } catch (err) {
      console.error('Error evaluating scholarship application:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// PUT /api/board/scholarships/applications/:id/decision
router.put(
  '/scholarships/applications/:id/decision',
  authenticate,
  authorize('admin', 'super_admin', 'hospital_manager'),
  async (req, res) => {
    const { id } = req.params;
    const { board_decision_ref, rejection_reason } = req.body;
    const decision = req.body.decision || req.body.status;

    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ success: false, message: "Decision must be 'approved' or 'rejected'" });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const appCheck = await client.query(`SELECT * FROM scholarship_applications WHERE id = $1`, [id]);
      if (!appCheck.rows.length) {
        return res.status(404).json({ success: false, message: 'Application not found' });
      }
      const app = appCheck.rows[0];

      const updatedRes = await client.query(
        `UPDATE scholarship_applications
         SET status = $1,
             board_decision_ref = $2,
             approved_by = $3,
             approved_at = NOW(),
             rejection_reason = $4,
             updated_at = NOW()
         WHERE id = $5
         RETURNING *`,
        [decision, board_decision_ref || null, req.user.id, decision === 'rejected' ? rejection_reason : null, id]
      );

      // If approved, decrement available slot if available
      if (decision === 'approved') {
        await client.query(
          `UPDATE scholarship_programs
           SET available_slots = GREATEST(0, available_slots - 1)
           WHERE id = $1`,
          [app.program_id]
        );
      }

      await logAdminAudit(client, {
        module: 'scholarship',
        action: decision.toUpperCase(),
        entity_type: 'scholarship_application',
        entity_id: parseInt(id),
        performed_by: req.user.id,
        reason: rejection_reason || board_decision_ref,
        new_values: { status: decision, board_decision_ref },
        ip_address: req.ip
      });

      await client.query('COMMIT');
      res.json({ success: true, message: `Scholarship application ${decision}`, data: updatedRes.rows[0] });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error deciding scholarship application:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    } finally {
      client.release();
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// 4. MEDICAL SPECIALIZATION MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/board/specializations/programs
router.get('/specializations/programs', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT sp.*,
             COUNT(sa.id)::int AS total_applications,
             COUNT(CASE WHEN sa.status IN ('approved', 'in_training', 'completed') THEN 1 END)::int AS accepted_candidates
      FROM specialization_programs sp
      LEFT JOIN specialization_applications sa ON sa.program_id = sp.id
      GROUP BY sp.id
      ORDER BY sp.status = 'active' DESC, sp.name ASC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching specialization programs:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/board/specializations/programs
router.post(
  '/specializations/programs',
  authenticate,
  authorize('admin', 'super_admin', 'hospital_manager'),
  async (req, res) => {
    try {
      const {
        program_code,
        name,
        medical_field,
        partner_institution,
        duration_years = 3.0,
        admission_requirements,
        total_positions = 2,
        sponsorship_type = 'Full Sponsorship',
        application_deadline
      } = req.body;

      if (!name || !medical_field || !partner_institution || !admission_requirements || !application_deadline) {
        return res.status(400).json({ success: false, message: 'Missing required specialization program fields' });
      }

      const year = new Date().getFullYear();
      let code = program_code;
      if (!code) {
        const countRes = await pool.query(`SELECT COUNT(*) + 1 AS seq FROM specialization_programs`);
        code = `SPEC-${year}-${String(countRes.rows[0].seq).padStart(3, '0')}`;
      }

      const result = await pool.query(
        `INSERT INTO specialization_programs
          (program_code, name, medical_field, partner_institution, duration_years, admission_requirements,
           total_positions, available_positions, sponsorship_type, application_deadline, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8, $9, $10)
         RETURNING *`,
        [
          code,
          name.trim(),
          medical_field.trim(),
          partner_institution.trim(),
          parseFloat(duration_years),
          admission_requirements.trim(),
          parseInt(total_positions),
          sponsorship_type,
          application_deadline,
          req.user.id
        ]
      );

      await logAdminAudit(pool, {
        module: 'specialization',
        action: 'CREATE',
        entity_type: 'specialization_program',
        entity_id: result.rows[0].id,
        performed_by: req.user.id,
        new_values: { program_code: code, name },
        ip_address: req.ip
      });

      res.status(201).json({ success: true, message: 'Specialization program created', data: result.rows[0] });
    } catch (err) {
      console.error('Error creating specialization program:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// GET /api/board/specializations/applications
router.get('/specializations/applications', authenticate, async (req, res) => {
  try {
    const { program_id, status } = req.query;
    const isStaffReviewer = ['admin', 'super_admin', 'hospital_manager'].includes(req.user.role);

    const params = [];
    let whereClauses = ['1=1'];

    if (!isStaffReviewer) {
      params.push(req.user.id);
      whereClauses.push(`sa.applicant_user_id = $${params.length}`);
    }

    if (program_id) {
      params.push(parseInt(program_id));
      whereClauses.push(`sa.program_id = $${params.length}`);
    }

    if (status && status !== 'all') {
      params.push(status);
      whereClauses.push(`sa.status = $${params.length}`);
    }

    const whereStr = whereClauses.join(' AND ');

    const result = await pool.query(
      `SELECT sa.*,
              sp.name AS program_name, sp.medical_field, sp.partner_institution, sp.duration_years,
              d.name AS department_name,
              dh.first_name || ' ' || dh.last_name AS dept_head_name,
              hr.first_name || ' ' || hr.last_name AS hr_name
       FROM specialization_applications sa
       JOIN specialization_programs sp ON sp.id = sa.program_id
       JOIN departments d ON d.id = sa.department_id
       LEFT JOIN users dh ON dh.id = sa.dept_head_id
       LEFT JOIN users hr ON hr.id = sa.hr_user_id
       WHERE ${whereStr}
       ORDER BY sa.created_at DESC`,
      params
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching specialization applications:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/board/specializations/applications
router.post('/specializations/applications', authenticate, async (req, res) => {
  try {
    const {
      program_id,
      applicant_name,
      current_position,
      department_id,
      current_qualification,
      work_experience_years = 1,
      preferred_institution,
      recommendation_summary,
      documents_meta = []
    } = req.body;

    if (!program_id || !current_position || !department_id || !current_qualification) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: program_id, current_position, department_id, current_qualification'
      });
    }

    const progCheck = await pool.query(`SELECT id, status FROM specialization_programs WHERE id = $1`, [program_id]);
    if (!progCheck.rows.length) {
      return res.status(404).json({ success: false, message: 'Specialization program not found' });
    }

    const year = new Date().getFullYear();
    const countRes = await pool.query(`SELECT COUNT(*) + 1 AS seq FROM specialization_applications`);
    const appNumber = `SPEC-APP-${year}-${String(countRes.rows[0].seq).padStart(4, '0')}`;

    const actualName = applicant_name || `${req.user.firstName || req.user.first_name || 'Dr.'} ${req.user.lastName || req.user.last_name || 'Physician'}`;

    const result = await pool.query(
      `INSERT INTO specialization_applications
        (application_number, program_id, applicant_user_id, applicant_name, current_position, department_id,
         current_qualification, work_experience_years, preferred_institution, recommendation_summary,
         status, documents_meta)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'submitted', $11)
       RETURNING *`,
      [
        appNumber,
        program_id,
        req.user.id,
        actualName,
        current_position.trim(),
        parseInt(department_id),
        current_qualification.trim(),
        parseFloat(work_experience_years),
        preferred_institution || null,
        recommendation_summary || null,
        JSON.stringify(documents_meta)
      ]
    );

    await logAdminAudit(pool, {
      module: 'specialization',
      action: 'CREATE',
      entity_type: 'specialization_application',
      entity_id: result.rows[0].id,
      performed_by: req.user.id,
      new_values: { application_number: appNumber, program_id },
      ip_address: req.ip
    });

    res.status(201).json({ success: true, message: 'Specialization application submitted', data: result.rows[0] });
  } catch (err) {
    console.error('Error submitting specialization application:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/board/specializations/applications/:id/stage
router.put(
  '/specializations/applications/:id/stage',
  authenticate,
  authorize('admin', 'super_admin', 'hospital_manager', 'doctor'),
  async (req, res) => {
    const { id } = req.params;
    const {
      stage,
      notes,
      approved,
      board_decision_ref,
      training_start_date,
      training_end_date,
      rejection_reason
    } = req.body;

    const validStages = [
      'department_review',
      'hr_verification',
      'board_review',
      'approved',
      'rejected',
      'in_training',
      'completed'
    ];

    if (!validStages.includes(stage)) {
      return res.status(400).json({ success: false, message: `Invalid stage: ${stage}` });
    }

    try {
      let queryStr = '';
      let params = [];

      if (stage === 'department_review') {
        queryStr = `UPDATE specialization_applications
                    SET status = 'department_review',
                        dept_head_approved = $1,
                        dept_head_id = $2,
                        dept_head_notes = $3,
                        dept_head_reviewed_at = NOW(),
                        updated_at = NOW()
                    WHERE id = $4 RETURNING *`;
        params = [Boolean(approved), req.user.id, notes || null, id];
      } else if (stage === 'hr_verification') {
        queryStr = `UPDATE specialization_applications
                    SET status = 'hr_verification',
                        hr_verified = $1,
                        hr_user_id = $2,
                        hr_notes = $3,
                        hr_verified_at = NOW(),
                        updated_at = NOW()
                    WHERE id = $4 RETURNING *`;
        params = [Boolean(approved), req.user.id, notes || null, id];
      } else if (stage === 'board_review' || stage === 'approved') {
        queryStr = `UPDATE specialization_applications
                    SET status = $1,
                        board_approved = $2,
                        board_decision_ref = $3,
                        board_reviewed_at = NOW(),
                        updated_at = NOW()
                    WHERE id = $4 RETURNING *`;
        params = [stage, Boolean(approved), board_decision_ref || null, id];
      } else if (stage === 'in_training') {
        queryStr = `UPDATE specialization_applications
                    SET status = 'in_training',
                        training_start_date = $1,
                        training_end_date = $2,
                        updated_at = NOW()
                    WHERE id = $3 RETURNING *`;
        params = [training_start_date || new Date().toISOString().split('T')[0], training_end_date || null, id];
      } else if (stage === 'completed') {
        queryStr = `UPDATE specialization_applications
                    SET status = 'completed',
                        updated_at = NOW()
                    WHERE id = $1 RETURNING *`;
        params = [id];
      } else if (stage === 'rejected') {
        queryStr = `UPDATE specialization_applications
                    SET status = 'rejected',
                        rejection_reason = $1,
                        updated_at = NOW()
                    WHERE id = $2 RETURNING *`;
        params = [rejection_reason || notes || 'Rejected by committee', id];
      }

      const updated = await pool.query(queryStr, params);
      if (!updated.rows.length) {
        return res.status(404).json({ success: false, message: 'Application not found' });
      }

      await logAdminAudit(pool, {
        module: 'specialization',
        action: stage.toUpperCase(),
        entity_type: 'specialization_application',
        entity_id: parseInt(id),
        performed_by: req.user.id,
        new_values: { stage, notes, approved },
        ip_address: req.ip
      });

      res.json({ success: true, message: `Specialization application transitioned to ${stage}`, data: updated.rows[0] });
    } catch (err) {
      console.error('Error transitioning specialization stage:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// 5. TRAINING AND PROFESSIONAL DEVELOPMENT
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/board/training/programs
router.get('/training/programs', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT tp.*,
             COUNT(tp_part.id)::int AS registered_count,
             COUNT(CASE WHEN tp_part.attendance_status = 'completed' THEN 1 END)::int AS completed_count
      FROM training_programs tp
      LEFT JOIN training_participants tp_part ON tp_part.training_id = tp.id
      GROUP BY tp.id
      ORDER BY tp.start_date DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching training programs:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/board/training/programs
router.post(
  '/training/programs',
  authenticate,
  authorize('admin', 'super_admin', 'hospital_manager'),
  async (req, res) => {
    try {
      const {
        program_code,
        title,
        category,
        description,
        trainer_name,
        trainer_institution,
        start_date,
        end_date,
        venue = 'Hospital Training Hall A',
        ceu_credits = 0,
        max_participants = 30
      } = req.body;

      if (!title || !category || !trainer_name || !start_date || !end_date) {
        return res.status(400).json({ success: false, message: 'Missing required training program fields' });
      }

      const year = new Date().getFullYear();
      let code = program_code;
      if (!code) {
        const countRes = await pool.query(`SELECT COUNT(*) + 1 AS seq FROM training_programs`);
        code = `TRN-${year}-${String(countRes.rows[0].seq).padStart(3, '0')}`;
      }

      const result = await pool.query(
        `INSERT INTO training_programs
          (program_code, title, category, description, trainer_name, trainer_institution,
           start_date, end_date, venue, ceu_credits, max_participants, status, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'scheduled', $12)
         RETURNING *`,
        [
          code,
          title.trim(),
          category.trim(),
          description || null,
          trainer_name.trim(),
          trainer_institution || null,
          start_date,
          end_date,
          venue,
          parseFloat(ceu_credits || 0),
          parseInt(max_participants || 30),
          req.user.id
        ]
      );

      await logAdminAudit(pool, {
        module: 'training',
        action: 'CREATE',
        entity_type: 'training_program',
        entity_id: result.rows[0].id,
        performed_by: req.user.id,
        new_values: { program_code: code, title },
        ip_address: req.ip
      });

      res.status(201).json({ success: true, message: 'Training program scheduled', data: result.rows[0] });
    } catch (err) {
      console.error('Error creating training program:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// GET /api/board/training/programs/:id/participants
router.get('/training/programs/:id/participants', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT tp.*,
              d.name AS department_name,
              u.email, u.role AS staff_role
       FROM training_participants tp
       JOIN users u ON u.id = tp.user_id
       LEFT JOIN departments d ON d.id = tp.department_id
       WHERE tp.training_id = $1
       ORDER BY tp.participant_name ASC`,
      [id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching training participants:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/board/training/programs/:id/register
router.post('/training/programs/:id/register', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const targetUserId = req.body.user_id || req.user.id;
    const departmentId = req.body.department_id || null;

    // Check program exists & capacity
    const progRes = await pool.query(
      `SELECT tp.*, COUNT(tp_part.id)::int AS current_count
       FROM training_programs tp
       LEFT JOIN training_participants tp_part ON tp_part.training_id = tp.id
       WHERE tp.id = $1
       GROUP BY tp.id`,
      [id]
    );

    if (!progRes.rows.length) {
      return res.status(404).json({ success: false, message: 'Training program not found' });
    }

    const prog = progRes.rows[0];
    if (prog.current_count >= prog.max_participants) {
      return res.status(400).json({ success: false, message: 'Training program has reached maximum participant capacity' });
    }

    // Look up user name
    const userRes = await pool.query(`SELECT id, first_name, last_name FROM users WHERE id = $1`, [targetUserId]);
    if (!userRes.rows.length) {
      return res.status(404).json({ success: false, message: 'Staff user not found' });
    }
    const staff = userRes.rows[0];
    const participantName = `${staff.first_name} ${staff.last_name}`;

    const insertRes = await pool.query(
      `INSERT INTO training_participants (training_id, user_id, participant_name, department_id, attendance_status)
       VALUES ($1, $2, $3, $4, 'registered')
       ON CONFLICT (training_id, user_id) DO NOTHING
       RETURNING *`,
      [id, targetUserId, participantName, departmentId || null]
    );

    if (!insertRes.rows.length) {
      return res.status(409).json({ success: false, message: 'Staff member is already registered for this training' });
    }

    await logAdminAudit(pool, {
      module: 'training',
      action: 'REGISTER_PARTICIPANT',
      entity_type: 'training_participant',
      entity_id: insertRes.rows[0].id,
      performed_by: req.user.id,
      new_values: { training_id: id, user_id: targetUserId },
      ip_address: req.ip
    });

    res.status(201).json({ success: true, message: 'Enrolled in training program successfully', data: insertRes.rows[0] });
  } catch (err) {
    console.error('Error registering for training program:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/board/training/participants/:id
router.put(
  '/training/participants/:id',
  authenticate,
  authorize('admin', 'super_admin', 'hospital_manager'),
  async (req, res) => {
    const { id } = req.params;
    const { attendance_status, evaluation_score } = req.body;

    try {
      const check = await pool.query(`SELECT * FROM training_participants WHERE id = $1`, [id]);
      if (!check.rows.length) {
        return res.status(404).json({ success: false, message: 'Participant record not found' });
      }
      const participant = check.rows[0];

      let certNum = participant.certificate_number;
      let certIssued = participant.certificate_issued;
      let certIssuedAt = participant.certificate_issued_at;

      if (attendance_status === 'completed' && !certNum) {
        const year = new Date().getFullYear();
        const countRes = await pool.query(`SELECT COUNT(*) + 100 AS seq FROM training_participants WHERE certificate_number IS NOT NULL`);
        certNum = `TRN-CERT-${year}-${String(countRes.rows[0].seq).padStart(4, '0')}`;
        certIssued = true;
        certIssuedAt = new Date().toISOString();
      }

      const updated = await pool.query(
        `UPDATE training_participants
         SET attendance_status = COALESCE($1, attendance_status),
             evaluation_score = COALESCE($2, evaluation_score),
             certificate_number = $3,
             certificate_issued = $4,
             certificate_issued_at = $5,
             updated_at = NOW()
         WHERE id = $6
         RETURNING *`,
        [attendance_status || null, evaluation_score ? parseFloat(evaluation_score) : null, certNum, certIssued, certIssuedAt, id]
      );

      await logAdminAudit(pool, {
        module: 'training',
        action: 'UPDATE_PARTICIPANT',
        entity_type: 'training_participant',
        entity_id: parseInt(id),
        performed_by: req.user.id,
        new_values: { attendance_status, evaluation_score, certificate_number: certNum },
        ip_address: req.ip
      });

      res.json({ success: true, message: 'Participant record updated', data: updated.rows[0] });
    } catch (err) {
      console.error('Error updating participant record:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// 6. BOARD MEMBERS & MEETINGS
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/board/members
router.get('/members', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT bm.*,
             d.name AS department_name,
             u.email AS user_email
      FROM board_members bm
      LEFT JOIN departments d ON d.id = bm.department_id
      LEFT JOIN users u ON u.id = bm.user_id
      ORDER BY bm.is_active DESC, bm.role_title ASC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching board members:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/board/members
router.post(
  '/members',
  authenticate,
  authorize('admin', 'super_admin', 'hospital_manager'),
  async (req, res) => {
    try {
      const {
        user_id,
        full_name,
        role_title,
        committee = 'Executive Board',
        department_id,
        appointed_date = new Date().toISOString().split('T')[0],
        term_end_date,
        phone,
        email
      } = req.body;

      if (!full_name || !role_title) {
        return res.status(400).json({ success: false, message: 'Full name and role title are required' });
      }

      const result = await pool.query(
        `INSERT INTO board_members
          (user_id, full_name, role_title, committee, department_id, appointed_date, term_end_date, phone, email, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
         RETURNING *`,
        [
          user_id || null,
          full_name.trim(),
          role_title.trim(),
          committee.trim(),
          department_id || null,
          appointed_date,
          term_end_date || null,
          phone || null,
          email || null
        ]
      );

      await logAdminAudit(pool, {
        module: 'board',
        action: 'CREATE_MEMBER',
        entity_type: 'board_member',
        entity_id: result.rows[0].id,
        performed_by: req.user.id,
        new_values: { full_name, role_title },
        ip_address: req.ip
      });

      res.status(201).json({ success: true, message: 'Board member appointed', data: result.rows[0] });
    } catch (err) {
      console.error('Error adding board member:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// PUT /api/board/members/:id
router.put(
  '/members/:id',
  authenticate,
  authorize('admin', 'super_admin', 'hospital_manager'),
  async (req, res) => {
    const { id } = req.params;
    const { full_name, role_title, committee, department_id, is_active, phone, email, term_end_date } = req.body;

    try {
      const updated = await pool.query(
        `UPDATE board_members
         SET full_name = COALESCE($1, full_name),
             role_title = COALESCE($2, role_title),
             committee = COALESCE($3, committee),
             department_id = COALESCE($4, department_id),
             is_active = COALESCE($5, is_active),
             phone = COALESCE($6, phone),
             email = COALESCE($7, email),
             term_end_date = COALESCE($8, term_end_date),
             updated_at = NOW()
         WHERE id = $9
         RETURNING *`,
        [full_name, role_title, committee, department_id, is_active, phone, email, term_end_date, id]
      );

      if (!updated.rows.length) {
        return res.status(404).json({ success: false, message: 'Board member not found' });
      }

      res.json({ success: true, message: 'Board member updated', data: updated.rows[0] });
    } catch (err) {
      console.error('Error updating board member:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// GET /api/board/meetings
router.get('/meetings', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT bm.*,
             u_pres.first_name || ' ' || u_pres.last_name AS presided_by_name,
             u_rec.first_name || ' ' || u_rec.last_name AS recorded_by_name,
             COUNT(DISTINCT ba.id)::int AS agenda_count,
             COUNT(DISTINCT bd.id)::int AS decisions_count
      FROM board_meetings bm
      LEFT JOIN users u_pres ON u_pres.id = bm.presided_by
      LEFT JOIN users u_rec ON u_rec.id = bm.recorded_by
      LEFT JOIN board_agendas ba ON ba.meeting_id = bm.id
      LEFT JOIN board_decisions bd ON bd.meeting_id = bm.id
      GROUP BY bm.id, u_pres.first_name, u_pres.last_name, u_rec.first_name, u_rec.last_name
      ORDER BY bm.meeting_date DESC, bm.start_time DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching board meetings:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/board/meetings
router.post(
  '/meetings',
  authenticate,
  authorize('admin', 'super_admin', 'hospital_manager'),
  async (req, res) => {
    try {
      const {
        meeting_number,
        title,
        meeting_date,
        start_time,
        end_time,
        location = 'Executive Board Room (Block B, 3rd Floor)',
        presided_by,
        recorded_by,
        meeting_minutes
      } = req.body;

      if (!title || !meeting_date || !start_time) {
        return res.status(400).json({ success: false, message: 'Title, meeting date and start time are required' });
      }

      const year = new Date().getFullYear();
      let mNum = meeting_number;
      if (!mNum) {
        const countRes = await pool.query(`SELECT COUNT(*) + 1 AS seq FROM board_meetings`);
        mNum = `BM-${year}-${String(countRes.rows[0].seq).padStart(3, '0')}`;
      }

      const result = await pool.query(
        `INSERT INTO board_meetings
          (meeting_number, title, meeting_date, start_time, end_time, location, status,
           meeting_minutes, presided_by, recorded_by, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, 'scheduled', $7, $8, $9, $10)
         RETURNING *`,
        [
          mNum,
          title.trim(),
          meeting_date,
          start_time,
          end_time || null,
          location,
          meeting_minutes || null,
          presided_by || req.user.id,
          recorded_by || req.user.id,
          req.user.id
        ]
      );

      await logAdminAudit(pool, {
        module: 'board',
        action: 'CREATE_MEETING',
        entity_type: 'board_meeting',
        entity_id: result.rows[0].id,
        performed_by: req.user.id,
        new_values: { meeting_number: mNum, title },
        ip_address: req.ip
      });

      res.status(201).json({ success: true, message: 'Board meeting convened/scheduled', data: result.rows[0] });
    } catch (err) {
      console.error('Error creating board meeting:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// GET /api/board/meetings/:id
router.get('/meetings/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const meetingRes = await pool.query(
      `SELECT bm.*,
              u_pres.first_name || ' ' || u_pres.last_name AS presided_by_name,
              u_rec.first_name || ' ' || u_rec.last_name AS recorded_by_name
       FROM board_meetings bm
       LEFT JOIN users u_pres ON u_pres.id = bm.presided_by
       LEFT JOIN users u_rec ON u_rec.id = bm.recorded_by
       WHERE bm.id = $1`,
      [id]
    );

    if (!meetingRes.rows.length) {
      return res.status(404).json({ success: false, message: 'Board meeting not found' });
    }

    const meeting = meetingRes.rows[0];

    const agendasRes = await pool.query(
      `SELECT * FROM board_agendas WHERE meeting_id = $1 ORDER BY item_order ASC`,
      [id]
    );

    const decisionsRes = await pool.query(
      `SELECT bd.*, u.first_name || ' ' || u.last_name AS recorded_by_name
       FROM board_decisions bd
       LEFT JOIN users u ON u.id = bd.recorded_by
       WHERE bd.meeting_id = $1
       ORDER BY bd.created_at ASC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...meeting,
        agendas: agendasRes.rows,
        decisions: decisionsRes.rows
      }
    });
  } catch (err) {
    console.error('Error fetching board meeting detail:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/board/meetings/:id
router.put(
  '/meetings/:id',
  authenticate,
  authorize('admin', 'super_admin', 'hospital_manager'),
  async (req, res) => {
    const { id } = req.params;
    const { title, meeting_date, start_time, end_time, location, status, meeting_minutes } = req.body;

    try {
      const updated = await pool.query(
        `UPDATE board_meetings
         SET title = COALESCE($1, title),
             meeting_date = COALESCE($2, meeting_date),
             start_time = COALESCE($3, start_time),
             end_time = COALESCE($4, end_time),
             location = COALESCE($5, location),
             status = COALESCE($6, status),
             meeting_minutes = COALESCE($7, meeting_minutes),
             updated_at = NOW()
         WHERE id = $8
         RETURNING *`,
        [title, meeting_date, start_time, end_time, location, status, meeting_minutes, id]
      );

      if (!updated.rows.length) {
        return res.status(404).json({ success: false, message: 'Board meeting not found' });
      }

      res.json({ success: true, message: 'Board meeting updated', data: updated.rows[0] });
    } catch (err) {
      console.error('Error updating board meeting:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// POST /api/board/meetings/:id/agendas
router.post(
  '/meetings/:id/agendas',
  authenticate,
  authorize('admin', 'super_admin', 'hospital_manager'),
  async (req, res) => {
    const { id } = req.params;
    const { title, description, presenter_name, decision_required = false } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Agenda title is required' });
    }

    try {
      const orderRes = await pool.query(`SELECT COUNT(*) + 1 AS next_order FROM board_agendas WHERE meeting_id = $1`, [id]);
      const nextOrder = parseInt(orderRes.rows[0].next_order);

      const result = await pool.query(
        `INSERT INTO board_agendas (meeting_id, item_order, title, description, presenter_name, decision_required)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [id, nextOrder, title.trim(), description || null, presenter_name || null, Boolean(decision_required)]
      );

      res.status(201).json({ success: true, message: 'Agenda item added', data: result.rows[0] });
    } catch (err) {
      console.error('Error adding agenda item:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// POST /api/board/meetings/:id/decisions
router.post(
  '/meetings/:id/decisions',
  authenticate,
  authorize('admin', 'super_admin', 'hospital_manager'),
  async (req, res) => {
    const { id } = req.params;
    const {
      agenda_id,
      resolution_number,
      resolution_type = 'general',
      subject,
      resolution_text,
      voting_result = 'Unanimously Approved',
      linked_entity_type,
      linked_entity_id
    } = req.body;

    if (!subject || !resolution_text) {
      return res.status(400).json({ success: false, message: 'Subject and resolution text are required' });
    }

    try {
      const year = new Date().getFullYear();
      let resNum = resolution_number;
      if (!resNum) {
        const countRes = await pool.query(`SELECT COUNT(*) + 1 AS seq FROM board_decisions`);
        resNum = `RES-${year}-${String(countRes.rows[0].seq).padStart(3, '0')}`;
      }

      const result = await pool.query(
        `INSERT INTO board_decisions
          (meeting_id, agenda_id, resolution_number, resolution_type, subject, resolution_text,
           voting_result, linked_entity_type, linked_entity_id, recorded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          id,
          agenda_id || null,
          resNum,
          resolution_type,
          subject.trim(),
          resolution_text.trim(),
          voting_result,
          linked_entity_type || null,
          linked_entity_id ? parseInt(linked_entity_id) : null,
          req.user.id
        ]
      );

      await logAdminAudit(pool, {
        module: 'board',
        action: 'RECORD_DECISION',
        entity_type: 'board_decision',
        entity_id: result.rows[0].id,
        performed_by: req.user.id,
        new_values: { resolution_number: resNum, subject, resolution_type },
        ip_address: req.ip
      });

      res.status(201).json({ success: true, message: 'Formal board resolution adopted', data: result.rows[0] });
    } catch (err) {
      console.error('Error recording board decision:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// 7. BOARD REPORTS & STATISTICS
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/board/stats
router.get('/stats', authenticate, async (req, res) => {
  try {
    // 1. Birth stats
    const birthStatsRes = await pool.query(`
      SELECT 
        COUNT(*)::int AS total_births,
        COUNT(CASE WHEN date_of_birth >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END)::int AS births_this_month,
        COUNT(CASE WHEN certificate_status = 'issued' THEN 1 END)::int AS certificates_issued,
        COUNT(CASE WHEN certificate_status = 'pending_verification' THEN 1 END)::int AS pending_verification,
        COUNT(CASE WHEN gender = 'male' THEN 1 END)::int AS male_count,
        COUNT(CASE WHEN gender = 'female' THEN 1 END)::int AS female_count,
        COUNT(CASE WHEN delivery_type = 'Cesarean Section' THEN 1 END)::int AS csection_count,
        COUNT(CASE WHEN delivery_type = 'Spontaneous Vaginal' THEN 1 END)::int AS vaginal_count
      FROM birth_records
    `);

    // 2. Death stats
    const deathStatsRes = await pool.query(`
      SELECT 
        COUNT(*)::int AS total_deaths,
        COUNT(CASE WHEN date_of_death >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END)::int AS deaths_this_month,
        COUNT(CASE WHEN document_status = 'issued' THEN 1 END)::int AS documents_issued,
        COUNT(CASE WHEN document_status = 'verified' OR document_status = 'approved' OR document_status = 'issued' THEN 1 END)::int AS medically_verified_count,
        COUNT(CASE WHEN autopsy_requested = true THEN 1 END)::int AS autopsy_count
      FROM death_records
    `);

    // 3. Scholarship stats
    const scholarshipStatsRes = await pool.query(`
      SELECT 
        COUNT(DISTINCT sp.id)::int AS active_programs,
        COALESCE(SUM(sp.financial_support_amount), 0)::numeric(12,2) AS total_financial_commitment,
        COUNT(sa.id)::int AS total_applications,
        COUNT(CASE WHEN sa.status = 'approved' THEN 1 END)::int AS awarded_count
      FROM scholarship_programs sp
      LEFT JOIN scholarship_applications sa ON sa.program_id = sp.id
      WHERE sp.status = 'active'
    `);

    // 4. Specialization stats
    const specStatsRes = await pool.query(`
      SELECT 
        COUNT(DISTINCT sp.id)::int AS active_programs,
        COUNT(sa.id)::int AS total_applicants,
        COUNT(CASE WHEN sa.status = 'in_training' THEN 1 END)::int AS candidates_in_training,
        COUNT(CASE WHEN sa.status = 'completed' THEN 1 END)::int AS graduates_completed
      FROM specialization_programs sp
      LEFT JOIN specialization_applications sa ON sa.program_id = sp.id
      WHERE sp.status = 'active'
    `);

    // 5. Training stats
    const trainingStatsRes = await pool.query(`
      SELECT 
        COUNT(DISTINCT tp.id)::int AS total_trainings,
        COALESCE(SUM(tp.ceu_credits), 0)::numeric(5,1) AS total_ceu_offered,
        COUNT(tp_part.id)::int AS total_trainees_enrolled,
        COUNT(CASE WHEN tp_part.attendance_status = 'completed' THEN 1 END)::int AS trainees_certified
      FROM training_programs tp
      LEFT JOIN training_participants tp_part ON tp_part.training_id = tp.id
    `);

    // 6. Board governance stats
    const boardStatsRes = await pool.query(`
      SELECT 
        (SELECT COUNT(*)::int FROM board_members WHERE is_active = true) AS active_board_members,
        (SELECT COUNT(*)::int FROM board_meetings) AS total_meetings_convened,
        (SELECT COUNT(*)::int FROM board_decisions) AS total_resolutions_passed
    `);

    // 7. Recent administrative audit logs
    const auditRes = await pool.query(`
      SELECT aal.*, u.first_name || ' ' || u.last_name AS performer_name, u.role AS performer_role
      FROM administrative_audit_logs aal
      LEFT JOIN users u ON u.id = aal.performed_by
      ORDER BY aal.created_at DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      data: {
        births: birthStatsRes.rows[0],
        deaths: deathStatsRes.rows[0],
        scholarships: scholarshipStatsRes.rows[0],
        specializations: specStatsRes.rows[0],
        training: trainingStatsRes.rows[0],
        governance: boardStatsRes.rows[0],
        recent_audit: auditRes.rows
      }
    });
  } catch (err) {
    console.error('Error fetching board stats:', err);
    res.status(500).json({ success: false, message: 'Server error generating board statistics' });
  }
});

// GET /api/board/audit-logs
router.get('/audit-logs', authenticate, authorize('admin', 'super_admin', 'hospital_manager'), async (req, res) => {
  try {
    const { module, action, page = 1, limit = 30 } = req.query;
    const offset = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const params = [];
    let whereClauses = ['1=1'];

    if (module && module !== 'all') {
      params.push(module);
      whereClauses.push(`aal.module = $${params.length}`);
    }

    if (action && action !== 'all') {
      params.push(action);
      whereClauses.push(`aal.action = $${params.length}`);
    }

    const whereStr = whereClauses.join(' AND ');

    const countRes = await pool.query(`SELECT COUNT(*) FROM administrative_audit_logs aal WHERE ${whereStr}`, params);
    const totalCount = parseInt(countRes.rows[0].count);

    const queryParams = [...params, parseInt(limit), offset];
    const dataRes = await pool.query(
      `SELECT aal.*,
              u.first_name || ' ' || u.last_name AS performer_name,
              u.role AS performer_role
       FROM administrative_audit_logs aal
       LEFT JOIN users u ON u.id = aal.performed_by
       WHERE ${whereStr}
       ORDER BY aal.created_at DESC
       LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`,
      queryParams
    );

    res.json({
      success: true,
      count: totalCount,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(totalCount / parseInt(limit)),
      data: dataRes.rows
    });
  } catch (err) {
    console.error('Error fetching administrative audit logs:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
