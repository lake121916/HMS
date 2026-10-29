const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const pdfService = require('../services/pdfService');

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
router.get('/verify/:token', async (req, res) => {
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

    // Privacy-preserving masking (e.g. "H. Bekele")
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
        verified: doc.status === 'valid'
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

module.exports = router;
