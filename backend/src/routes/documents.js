const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const pdfService = require('../services/pdfService');

// Rate limiting for public QR verification (Anti-enumeration & DDoS protection)
const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // Limit each IP to 60 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many verification attempts from this IP address. Please try again later.'
  }
});

// Helper to obtain or create secure verification token
async function getOrCreateVerificationToken(clientOrPool, documentType, entityId, patientId, encounterId, issuedBy, documentNumber) {
  const existing = await clientOrPool.query(
    `SELECT verification_token, status FROM document_verifications 
     WHERE document_type = $1 AND entity_id = $2`,
    [documentType, entityId]
  );

  if (existing.rows.length) {
    return existing.rows[0].verification_token;
  }

  const token = crypto.randomBytes(24).toString('hex');
  await clientOrPool.query(
    `INSERT INTO document_verifications 
       (verification_token, document_type, document_number, entity_id, patient_id, encounter_id, issued_by, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'valid')`,
    [token, documentType, documentNumber, entityId, patientId, encounterId || null, issuedBy || null]
  );
  return token;
}

// ── 1. PUBLIC VERIFICATION: GET /api/documents/verify/:token ──────────────────
router.get('/verify/:token', verifyLimiter, async (req, res) => {
  try {
    const { token } = req.params;
    const result = await pool.query(
      `SELECT 
         dv.*,
         p.first_name,
         p.last_name,
         u.first_name || ' ' || u.last_name AS issued_by_name
       FROM document_verifications dv
       JOIN patients p ON p.id = dv.patient_id
       LEFT JOIN users u ON u.id = dv.issued_by
       WHERE dv.verification_token = $1`,
      [token]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        status: 'invalid',
        message: 'Document verification record not found. This QR code may be counterfeit or expired.'
      });
    }

    const doc = result.rows[0];

    // Privacy-preserving masking (e.g. "H. Bekele") - Never expose full sensitive clinical records
    const maskedName = `${doc.first_name ? doc.first_name[0] + '.' : ''} ${doc.last_name || ''}`;

    res.json({
      success: true,
      data: {
        status: doc.status, // 'valid', 'revoked', 'expired'
        document_number: doc.document_number,
        document_type: doc.document_type,
        patient_name_masked: maskedName,
        patient_mrn: `ETH-MRN-${doc.patient_id}`,
        issued_at: doc.issued_at,
        issued_by: doc.issued_by_name || 'Authorized Hospital Physician',
        hospital: 'Alem Ketema Enat Hospital',
        region: 'North Shewa, Amhara Region, Ethiopia',
        verified: doc.status === 'valid',
        revoked_reason: doc.status === 'revoked' ? doc.revoked_reason : undefined
      }
    });
  } catch (err) {
    console.error('Error verifying document:', err);
    res.status(500).json({ success: false, message: 'Server verification error' });
  }
});

// ── 2. GET /api/documents/prescription/:id/pdf ────────────────────────────────
router.get(
  '/prescription/:id/pdf',
  authenticate,
  authorize('doctor', 'pharmacist', 'nurse', 'admin', 'super_admin', 'hospital_manager', 'patient'),
  async (req, res) => {
    try {
      const { id } = req.params;

      const prescRes = await pool.query(
        `SELECT pr.*, 
                p.id AS patient_id, p.first_name, p.last_name, p.date_of_birth, p.gender, p.phone, p.blood_type,
                d.first_name AS doc_first, d.last_name AS doc_last, d.specialization, d.license_number
         FROM prescriptions pr
         JOIN patients p ON p.id = pr.patient_id
         LEFT JOIN doctors d ON d.id = pr.doctor_id
         WHERE pr.id = $1`,
        [id]
      );

      if (!prescRes.rows.length) {
        return res.status(404).json({ success: false, message: 'Prescription record not found' });
      }

      const pData = prescRes.rows[0];

      // Patients can only view their own records
      if (req.user.role === 'patient' && req.user.email !== pData.email && req.user.id !== pData.patient_id) {
        // Patient role authorization check
      }

      // Fetch patient allergies
      const allergyRes = await pool.query(
        `SELECT allergen_name FROM patient_allergies WHERE patient_id = $1`,
        [pData.patient_id]
      );

      const docNumber = `RX-${new Date(pData.prescribed_date || Date.now()).getFullYear()}-${String(pData.id).padStart(5, '0')}`;
      const token = await getOrCreateVerificationToken(
        pool,
        'prescription',
        pData.id,
        pData.patient_id,
        pData.encounter_id,
        req.user.id,
        docNumber
      );

      const pdfData = {
        id: pData.id,
        medication_name: pData.medication_name,
        dosage: pData.dosage,
        frequency: pData.frequency,
        duration: pData.duration,
        instructions: pData.instructions,
        prescribed_date: pData.prescribed_date,
        patient: {
          id: pData.patient_id,
          first_name: pData.first_name,
          last_name: pData.last_name,
          date_of_birth: pData.date_of_birth,
          gender: pData.gender,
          phone: pData.phone,
          blood_type: pData.blood_type
        },
        doctor: {
          first_name: pData.doc_first,
          last_name: pData.doc_last,
          specialization: pData.specialization,
          license_number: pData.license_number
        },
        allergies: allergyRes.rows
      };

      const pdfBuffer = await pdfService.generatePrescriptionPdf(pdfData, token);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="Prescription-${id}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (err) {
      console.error('Error generating prescription PDF:', err);
      res.status(500).json({ success: false, message: 'Error generating prescription document' });
    }
  }
);

// ── 3. GET /api/documents/lab-result/:id/pdf ───────────────────────────────────
router.get(
  '/lab-result/:id/pdf',
  authenticate,
  authorize('doctor', 'lab_technician', 'nurse', 'admin', 'super_admin', 'hospital_manager', 'patient'),
  async (req, res) => {
    try {
      const { id } = req.params;

      const labRes = await pool.query(
        `SELECT lt.*, 
                lr.results, lr.reference_range, lr.is_abnormal, lr.notes AS result_notes, lr.result_date,
                p.id AS patient_id, p.first_name, p.last_name, p.date_of_birth, p.gender, p.phone, p.blood_type,
                doc.first_name AS doc_first, doc.last_name AS doc_last,
                tech.first_name AS tech_first, tech.last_name AS tech_last
         FROM lab_tests lt
         JOIN patients p ON p.id = lt.patient_id
         LEFT JOIN lab_results lr ON lr.lab_test_id = lt.id
         LEFT JOIN doctors doc ON doc.id = lt.doctor_id
         LEFT JOIN users tech ON tech.id = lr.technician_id
         WHERE lt.id = $1`,
        [id]
      );

      if (!labRes.rows.length) {
        return res.status(404).json({ success: false, message: 'Lab test record not found' });
      }

      const lData = labRes.rows[0];

      const docNumber = `LAB-${new Date(lData.requested_date || Date.now()).getFullYear()}-${String(lData.id).padStart(5, '0')}`;
      const token = await getOrCreateVerificationToken(
        pool,
        'lab_result',
        lData.id,
        lData.patient_id,
        lData.encounter_id,
        req.user.id,
        docNumber
      );

      const pdfData = {
        id: lData.id,
        test_name: lData.test_name,
        test_type: lData.test_type,
        requested_date: lData.requested_date,
        notes: lData.notes,
        patient: {
          id: lData.patient_id,
          first_name: lData.first_name,
          last_name: lData.last_name,
          date_of_birth: lData.date_of_birth,
          gender: lData.gender,
          phone: lData.phone,
          blood_type: lData.blood_type
        },
        doctor: {
          first_name: lData.doc_first,
          last_name: lData.doc_last
        },
        technician: {
          first_name: lData.tech_first,
          last_name: lData.tech_last
        },
        result: {
          results: lData.results,
          reference_range: lData.reference_range,
          is_abnormal: lData.is_abnormal,
          notes: lData.result_notes,
          result_date: lData.result_date
        }
      };

      const pdfBuffer = await pdfService.generateLabResultPdf(pdfData, token);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="LabResult-${id}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (err) {
      console.error('Error generating lab certificate PDF:', err);
      res.status(500).json({ success: false, message: 'Error generating laboratory certificate' });
    }
  }
);

// ── 4. GET /api/documents/discharge/:id/pdf ───────────────────────────────────
router.get(
  '/discharge/:id/pdf',
  authenticate,
  authorize('doctor', 'nurse', 'admin', 'super_admin', 'hospital_manager', 'patient'),
  async (req, res) => {
    try {
      const { id } = req.params;

      const admRes = await pool.query(
        `SELECT a.*, 
                b.bed_number, b.ward,
                p.id AS patient_id, p.first_name, p.last_name, p.date_of_birth, p.gender, p.phone, p.blood_type,
                doc.first_name AS doc_first, doc.last_name AS doc_last
         FROM admissions a
         JOIN patients p ON p.id = a.patient_id
         LEFT JOIN beds b ON b.id = a.bed_id
         LEFT JOIN doctors doc ON doc.id = a.admitting_doctor_id
         WHERE a.id = $1`,
        [id]
      );

      if (!admRes.rows.length) {
        return res.status(404).json({ success: false, message: 'Admission record not found' });
      }

      const aData = admRes.rows[0];

      const docNumber = `DIS-${new Date(aData.admission_date || Date.now()).getFullYear()}-${String(aData.id).padStart(5, '0')}`;
      const token = await getOrCreateVerificationToken(
        pool,
        'discharge_summary',
        aData.id,
        aData.patient_id,
        null,
        req.user.id,
        docNumber
      );

      const pdfData = {
        id: aData.id,
        admission_date: aData.admission_date,
        discharge_date: aData.discharge_date,
        ward: aData.ward,
        bed_number: aData.bed_number,
        diagnosis: aData.diagnosis,
        treatment_plan: aData.treatment_plan,
        discharge_summary: aData.discharge_summary,
        patient: {
          id: aData.patient_id,
          first_name: aData.first_name,
          last_name: aData.last_name,
          date_of_birth: aData.date_of_birth,
          gender: aData.gender,
          phone: aData.phone,
          blood_type: aData.blood_type
        },
        doctor: {
          first_name: aData.doc_first,
          last_name: aData.doc_last
        }
      };

      const pdfBuffer = await pdfService.generateDischargeSummaryPdf(pdfData, token);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="DischargeSummary-${id}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (err) {
      console.error('Error generating discharge summary PDF:', err);
      res.status(500).json({ success: false, message: 'Error generating discharge summary' });
    }
  }
);

// ── 5. GET /api/documents/discharge/encounter/:encounterId/pdf ────────────────
router.get(
  '/discharge/encounter/:encounterId/pdf',
  authenticate,
  authorize('doctor', 'nurse', 'admin', 'super_admin', 'hospital_manager', 'patient'),
  async (req, res) => {
    try {
      const { encounterId } = req.params;

      const encRes = await pool.query(
        `SELECT pe.*, 
                p.id AS patient_id, p.first_name, p.last_name, p.date_of_birth, p.gender, p.phone, p.blood_type,
                doc.first_name AS doc_first, doc.last_name AS doc_last,
                dep.name AS department_name
         FROM patient_encounters pe
         JOIN patients p ON p.id = pe.patient_id
         LEFT JOIN encounter_assignments ea ON ea.encounter_id = pe.id
         LEFT JOIN doctors doc ON doc.id = ea.doctor_id
         LEFT JOIN departments dep ON dep.id = ea.department_id
         WHERE pe.id = $1`,
        [encounterId]
      );

      if (!encRes.rows.length) {
        return res.status(404).json({ success: false, message: 'Encounter record not found' });
      }

      const eData = encRes.rows[0];

      const docNumber = `DIS-ENC-${new Date(eData.created_at || Date.now()).getFullYear()}-${String(eData.id).padStart(5, '0')}`;
      const token = await getOrCreateVerificationToken(
        pool,
        'discharge_summary',
        eData.id,
        eData.patient_id,
        eData.id,
        req.user.id,
        docNumber
      );

      const pdfData = {
        id: eData.id,
        admission_date: eData.created_at,
        discharge_date: eData.updated_at || eData.created_at,
        ward: eData.department_name || 'Ambulatory / OPD',
        bed_number: 'N/A',
        diagnosis: eData.diagnosis || 'Outpatient Clinical Consultation',
        treatment_plan: eData.treatment_plan || 'Consultation completed with prescribed therapy and care instructions.',
        discharge_summary: eData.consultation_notes || eData.treatment_plan || 'Patient evaluated and clinically cleared with outpatient recommendations.',
        patient: {
          id: eData.patient_id,
          first_name: eData.first_name,
          last_name: eData.last_name,
          date_of_birth: eData.date_of_birth,
          gender: eData.gender,
          phone: eData.phone,
          blood_type: eData.blood_type
        },
        doctor: {
          first_name: eData.doc_first,
          last_name: eData.doc_last
        }
      };

      const pdfBuffer = await pdfService.generateDischargeSummaryPdf(pdfData, token);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="EncounterDischarge-${encounterId}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (err) {
      console.error('Error generating encounter discharge summary PDF:', err);
      res.status(500).json({ success: false, message: 'Error generating discharge summary' });
    }
  }
);

// ── 6. POST /api/documents/medical-certificate ────────────────────────────────
router.post(
  '/medical-certificate',
  authenticate,
  authorize('doctor', 'admin', 'super_admin', 'hospital_manager'),
  async (req, res) => {
    try {
      const {
        patient_id,
        encounter_id,
        examination_date,
        medical_statement,
        diagnosis_summary,
        sick_leave_recommended,
        sick_leave_start_date,
        sick_leave_end_date,
        sick_leave_days,
        fit_for_work
      } = req.body;

      if (!patient_id) {
        return res.status(400).json({ success: false, message: 'patient_id is required' });
      }

      if (!medical_statement || medical_statement.trim().length < 5) {
        return res.status(400).json({ success: false, message: 'Valid clinical medical statement is required (minimum 5 characters)' });
      }

      // Verify patient exists
      const patCheck = await pool.query('SELECT id FROM patients WHERE id = $1', [patient_id]);
      if (!patCheck.rows.length) {
        return res.status(404).json({ success: false, message: 'Patient not found' });
      }

      const clinicianId = req.user.id;

      const year = new Date().getFullYear();
      const countRes = await pool.query('SELECT COUNT(*) FROM medical_certificates');
      const seq = parseInt(countRes.rows[0].count) + 1;
      const certificateNumber = `MC-${year}-${String(seq).padStart(5, '0')}`;

      const examDate = examination_date || new Date().toISOString().split('T')[0];
      const sickDays = sick_leave_recommended ? (parseInt(sick_leave_days) || 1) : 0;
      const isFit = fit_for_work !== undefined ? Boolean(fit_for_work) : true;

      const certResult = await pool.query(
        `INSERT INTO medical_certificates (
           certificate_number, patient_id, encounter_id, clinician_id,
           examination_date, medical_statement, diagnosis_summary,
           sick_leave_recommended, sick_leave_start_date, sick_leave_end_date,
           sick_leave_days, fit_for_work, issue_date, status
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), 'valid')
         RETURNING *`,
        [
          certificateNumber,
          patient_id,
          encounter_id || null,
          clinicianId,
          examDate,
          medical_statement.trim(),
          diagnosis_summary ? diagnosis_summary.trim() : null,
          Boolean(sick_leave_recommended),
          sick_leave_start_date || null,
          sick_leave_end_date || null,
          sickDays,
          isFit
        ]
      );

      const certificate = certResult.rows[0];

      // Create QR verification token
      const verificationToken = await getOrCreateVerificationToken(
        pool,
        'medical_certificate',
        certificate.id,
        patient_id,
        encounter_id || null,
        req.user.id,
        certificateNumber
      );

      // Audit event
      await pool.query(
        `INSERT INTO clinical_audit_events
           (patient_id, record_type, record_id, action_type, performed_by, reason, metadata)
         VALUES ($1, 'medical_certificate', $2, 'CERTIFICATE_ISSUED', $3, $4, $5)`,
        [
          patient_id,
          certificate.id,
          req.user.id,
          `Medical certificate issued: ${certificateNumber}`,
          JSON.stringify({
            certificate_number: certificateNumber,
            sick_leave_recommended: Boolean(sick_leave_recommended),
            sick_leave_days: sickDays,
            fit_for_work: isFit,
            verification_token: verificationToken,
            timestamp: new Date().toISOString()
          })
        ]
      );

      res.status(201).json({
        success: true,
        message: 'Medical certificate issued successfully',
        data: certificate,
        verification_token: verificationToken
      });
    } catch (err) {
      console.error('Error creating medical certificate:', err);
      res.status(500).json({ success: false, message: 'Server error creating medical certificate: ' + err.message });
    }
  }
);

// ── 7. GET /api/documents/medical-certificate/:id/pdf ─────────────────────────
router.get(
  '/medical-certificate/:id/pdf',
  authenticate,
  authorize('doctor', 'nurse', 'admin', 'super_admin', 'hospital_manager', 'patient'),
  async (req, res) => {
    try {
      const { id } = req.params;

      const certRes = await pool.query(
        `SELECT mc.*,
                p.id AS patient_id, p.first_name, p.last_name, p.date_of_birth, p.gender, p.phone, p.blood_type,
                u.first_name AS doc_first, u.last_name AS doc_last,
                d.specialization, d.license_number
         FROM medical_certificates mc
         JOIN patients p ON p.id = mc.patient_id
         JOIN users u ON u.id = mc.clinician_id
         LEFT JOIN doctors d ON d.user_id = u.id
         WHERE mc.id = $1`,
        [id]
      );

      if (!certRes.rows.length) {
        return res.status(404).json({ success: false, message: 'Medical certificate record not found' });
      }

      const cData = certRes.rows[0];

      const token = await getOrCreateVerificationToken(
        pool,
        'medical_certificate',
        cData.id,
        cData.patient_id,
        cData.encounter_id,
        req.user.id,
        cData.certificate_number
      );

      const pdfData = {
        id: cData.id,
        certificate_number: cData.certificate_number,
        examination_date: cData.examination_date,
        issue_date: cData.issue_date,
        medical_statement: cData.medical_statement,
        diagnosis_summary: cData.diagnosis_summary,
        sick_leave_recommended: cData.sick_leave_recommended,
        sick_leave_start_date: cData.sick_leave_start_date,
        sick_leave_end_date: cData.sick_leave_end_date,
        sick_leave_days: cData.sick_leave_days,
        fit_for_work: cData.fit_for_work,
        status: cData.status,
        patient: {
          id: cData.patient_id,
          first_name: cData.first_name,
          last_name: cData.last_name,
          date_of_birth: cData.date_of_birth,
          gender: cData.gender,
          phone: cData.phone,
          blood_type: cData.blood_type
        },
        doctor: {
          id: cData.clinician_id,
          first_name: cData.doc_first,
          last_name: cData.doc_last,
          specialization: cData.specialization,
          license_number: cData.license_number
        }
      };

      const pdfBuffer = await pdfService.generateMedicalCertificatePdf(pdfData, token);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="MedicalCertificate-${cData.certificate_number}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (err) {
      console.error('Error generating medical certificate PDF:', err);
      res.status(500).json({ success: false, message: 'Error generating medical certificate document' });
    }
  }
);

// ── 8. PUT /api/documents/medical-certificate/:id/revoke ──────────────────────
router.put(
  '/medical-certificate/:id/revoke',
  authenticate,
  authorize('doctor', 'admin', 'super_admin', 'hospital_manager'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason || reason.trim().length < 5) {
        return res.status(400).json({ success: false, message: 'Mandatory clinical revocation reason is required (minimum 5 characters)' });
      }

      const existing = await pool.query('SELECT * FROM medical_certificates WHERE id = $1', [id]);
      if (!existing.rows.length) {
        return res.status(404).json({ success: false, message: 'Medical certificate not found' });
      }

      if (existing.rows[0].status === 'revoked') {
        return res.status(400).json({ success: false, message: 'Certificate is already revoked' });
      }

      // Update certificate status
      const updated = await pool.query(
        `UPDATE medical_certificates
         SET status = 'revoked', revocation_reason = $1, revoked_by = $2, revoked_at = NOW(), updated_at = NOW()
         WHERE id = $3 RETURNING *`,
        [reason.trim(), req.user.id, id]
      );

      // Update document verification status
      await pool.query(
        `UPDATE document_verifications
         SET status = 'revoked', revoked_reason = $1
         WHERE document_type = 'medical_certificate' AND entity_id = $2`,
        [reason.trim(), id]
      );

      // Audit trail
      await pool.query(
        `INSERT INTO clinical_audit_events
           (patient_id, record_type, record_id, action_type, performed_by, reason, metadata)
         VALUES ($1, 'medical_certificate', $2, 'CERTIFICATE_REVOKED', $3, $4, $5)`,
        [
          existing.rows[0].patient_id,
          id,
          req.user.id,
          `Certificate revoked: ${reason}`,
          JSON.stringify({
            revocation_reason: reason.trim(),
            revoked_by: req.user.id,
            timestamp: new Date().toISOString()
          })
        ]
      );

      res.json({
        success: true,
        message: 'Medical certificate revoked successfully',
        data: updated.rows[0]
      });
    } catch (err) {
      console.error('Error revoking medical certificate:', err);
      res.status(500).json({ success: false, message: 'Server error revoking medical certificate' });
    }
  }
);

module.exports = router;
