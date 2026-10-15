// ============================================================================
// Alem Ketema Enat Hospital Management System (HMS)
// Routes: Insurance & Claims Management (Migration 009)
//   - Provider registry
//   - Patient policy enrollment & benefit tracking
//   - Pre-authorization (PA) requests
//   - Claims lifecycle (draft → submitted → approved/rejected → paid)
//   - Co-pay / benefit deduction calculation
//   - Claims audit trail
// ============================================================================

const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const INSURANCE_ROLES = ['super_admin', 'admin', 'hospital_manager', 'cashier', 'receptionist', 'finance_officer'];
const REVIEW_ROLES   = ['super_admin', 'admin', 'hospital_manager', 'finance_officer'];

// ── Helpers ──────────────────────────────────────────────────────────────────

async function logClaimEvent(clientOrPool, { claimId, eventType, oldStatus, newStatus, actorId, actorName, notes, metadata }) {
  await clientOrPool.query(
    `INSERT INTO insurance_claim_events (claim_id, event_type, old_status, new_status, actor_id, actor_name, notes, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [claimId, eventType, oldStatus || null, newStatus || null, actorId || null, actorName || null, notes || null, metadata ? JSON.stringify(metadata) : null]
  );
}

function calcCopay(policy, billedAmount) {
  const billed = parseFloat(billedAmount || 0);
  let copay = parseFloat(policy.copay_fixed || 0);
  if (parseFloat(policy.copay_percentage || 0) > 0) {
    copay = Math.max(copay, billed * parseFloat(policy.copay_percentage) / 100);
  }
  const deductibleRemaining = Math.max(0, parseFloat(policy.deductible_amount || 0) - parseFloat(policy.deductible_met || 0));
  const deductibleApplied = Math.min(billed, deductibleRemaining);
  const insurancePays = Math.max(0, billed - copay - deductibleApplied);
  return { copay, deductibleApplied, insurancePays, patientResponsibility: copay + deductibleApplied };
}

// ── Insurance Providers ───────────────────────────────────────────────────────

// GET all providers
router.get('/providers', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM insurance_providers ORDER BY is_active DESC, name_en ASC'
    );
    res.json({ success: true, data: { providers: result.rows } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET single provider
router.get('/providers/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM insurance_providers WHERE id=$1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Provider not found' });
    res.json({ success: true, data: { provider: result.rows[0] } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST create provider (admin only)
router.post('/providers', authenticate, authorize(...REVIEW_ROLES), async (req, res) => {
  try {
    const {
      code, name_en, name_am, provider_type, contact_person, phone, email, address,
      contract_start_date, contract_end_date, claims_submission_email, reimbursement_days, notes
    } = req.body;
    if (!code || !name_en) return res.status(400).json({ success: false, message: 'Code and name are required' });
    const result = await pool.query(
      `INSERT INTO insurance_providers
       (code,name_en,name_am,provider_type,contact_person,phone,email,address,
        contract_start_date,contract_end_date,claims_submission_email,reimbursement_days,notes)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [code.toUpperCase(), name_en, name_am||null, provider_type||'private', contact_person||null,
       phone||null, email||null, address||null, contract_start_date||null, contract_end_date||null,
       claims_submission_email||null, reimbursement_days||30, notes||null]
    );
    res.status(201).json({ success: true, data: { provider: result.rows[0] } });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ success: false, message: 'Provider code already exists' });
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT update provider
router.put('/providers/:id', authenticate, authorize(...REVIEW_ROLES), async (req, res) => {
  try {
    const fields = ['name_en','name_am','provider_type','contact_person','phone','email','address',
                    'contract_start_date','contract_end_date','claims_submission_email','reimbursement_days','is_active','notes'];
    const sets = fields.map((f, i) => `${f}=COALESCE($${i+1},${f})`).join(',');
    const vals = fields.map(f => req.body[f] ?? null);
    const result = await pool.query(
      `UPDATE insurance_providers SET ${sets},updated_at=NOW() WHERE id=$${fields.length+1} RETURNING *`,
      [...vals, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Provider not found' });
    res.json({ success: true, data: { provider: result.rows[0] } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── Patient Policies ──────────────────────────────────────────────────────────

// GET policies for a patient
router.get('/policies', authenticate, async (req, res) => {
  try {
    const { patient_id } = req.query;
    let where = '1=1';
    const params = [];
    if (req.user.role === 'patient') {
      const pat = await pool.query('SELECT id FROM patients WHERE user_id=$1', [req.user.id]);
      if (!pat.rows.length) return res.json({ success: true, data: { policies: [] } });
      where = 'pip.patient_id=$1';
      params.push(pat.rows[0].id);
    } else if (patient_id) {
      where = 'pip.patient_id=$1';
      params.push(patient_id);
    }
    const result = await pool.query(
      `SELECT pip.*,
              ip.name_en AS provider_name, ip.code AS provider_code, ip.provider_type,
              p.first_name||' '||p.last_name AS patient_name
       FROM patient_insurance_policies pip
       JOIN insurance_providers ip ON pip.provider_id=ip.id
       JOIN patients p ON pip.patient_id=p.id
       WHERE ${where}
       ORDER BY pip.is_primary DESC, pip.effective_date DESC`,
      params
    );
    res.json({ success: true, data: { policies: result.rows } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET single policy
router.get('/policies/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT pip.*,
              ip.name_en AS provider_name, ip.code AS provider_code, ip.reimbursement_days,
              p.first_name||' '||p.last_name AS patient_name, p.phone AS patient_phone
       FROM patient_insurance_policies pip
       JOIN insurance_providers ip ON pip.provider_id=ip.id
       JOIN patients p ON pip.patient_id=p.id
       WHERE pip.id=$1`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Policy not found' });
    res.json({ success: true, data: { policy: result.rows[0] } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST enroll patient in policy
router.post('/policies', authenticate, authorize(...INSURANCE_ROLES), async (req, res) => {
  try {
    const {
      patient_id, provider_id, policy_number, membership_id, group_number, plan_name, plan_type,
      relationship_to_insured, insured_name, insured_dob, effective_date, expiry_date,
      annual_limit, copay_fixed, copay_percentage, deductible_amount,
      inpatient_limit, outpatient_limit, pharmacy_limit, lab_limit, is_primary, notes
    } = req.body;
    if (!patient_id || !provider_id || !policy_number || !effective_date) {
      return res.status(400).json({ success: false, message: 'patient_id, provider_id, policy_number, and effective_date are required' });
    }
    const annualLimitVal = annual_limit ? parseFloat(annual_limit) : null;
    const result = await pool.query(
      `INSERT INTO patient_insurance_policies
       (patient_id,provider_id,policy_number,membership_id,group_number,plan_name,plan_type,
        relationship_to_insured,insured_name,insured_dob,effective_date,expiry_date,
        annual_limit,remaining_benefit,copay_fixed,copay_percentage,deductible_amount,
        inpatient_limit,outpatient_limit,pharmacy_limit,lab_limit,is_primary,notes)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
       RETURNING *`,
      [patient_id, provider_id, policy_number, membership_id||null, group_number||null, plan_name||null,
       plan_type||'inpatient_outpatient', relationship_to_insured||'self', insured_name||null, insured_dob||null,
       effective_date, expiry_date||null, annualLimitVal,
       parseFloat(copay_fixed||0), parseFloat(copay_percentage||0), parseFloat(deductible_amount||0),
       inpatient_limit?parseFloat(inpatient_limit):null, outpatient_limit?parseFloat(outpatient_limit):null,
       pharmacy_limit?parseFloat(pharmacy_limit):null, lab_limit?parseFloat(lab_limit):null,
       is_primary !== false, notes||null]
    );
    res.status(201).json({ success: true, data: { policy: result.rows[0] } });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ success: false, message: 'Policy already enrolled for this patient and provider' });
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT update policy (limits, copay, status)
router.put('/policies/:id', authenticate, authorize(...INSURANCE_ROLES), async (req, res) => {
  try {
    const fields = ['policy_number','membership_id','group_number','plan_name','plan_type','effective_date',
                    'expiry_date','annual_limit','remaining_benefit','copay_fixed','copay_percentage',
                    'deductible_amount','deductible_met','inpatient_limit','outpatient_limit',
                    'pharmacy_limit','lab_limit','is_primary','is_active','notes','verification_status'];
    const sets = fields.map((f,i) => `${f}=COALESCE($${i+1},${f})`).join(',');
    const vals = fields.map(f => req.body[f] ?? null);
    const result = await pool.query(
      `UPDATE patient_insurance_policies SET ${sets},updated_at=NOW() WHERE id=$${fields.length+1} RETURNING *`,
      [...vals, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Policy not found' });
    res.json({ success: true, data: { policy: result.rows[0] } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST verify a patient's policy
router.post('/policies/:id/verify', authenticate, authorize(...REVIEW_ROLES), async (req, res) => {
  try {
    const { verification_status = 'verified' } = req.body;
    const result = await pool.query(
      `UPDATE patient_insurance_policies
       SET verification_status=$1, verified_by=$2, verified_at=NOW(), updated_at=NOW()
       WHERE id=$3 RETURNING *`,
      [verification_status, req.user.id, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Policy not found' });
    res.json({ success: true, data: { policy: result.rows[0] } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET calculate co-pay preview for a policy and amount
router.get('/policies/:id/copay-preview', authenticate, async (req, res) => {
  try {
    const { amount } = req.query;
    if (!amount) return res.status(400).json({ success: false, message: 'amount is required' });
    const polRes = await pool.query('SELECT * FROM patient_insurance_policies WHERE id=$1', [req.params.id]);
    if (!polRes.rows.length) return res.status(404).json({ success: false, message: 'Policy not found' });
    const preview = calcCopay(polRes.rows[0], parseFloat(amount));
    res.json({ success: true, data: preview });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── Pre-Authorization ─────────────────────────────────────────────────────────

// GET PA requests
router.get('/pre-auth', authenticate, async (req, res) => {
  try {
    const { patient_id, status, limit = 50, offset = 0 } = req.query;
    let where = '1=1';
    const params = [];
    let idx = 1;
    if (patient_id) { where += ` AND par.patient_id=$${idx++}`; params.push(patient_id); }
    if (status)     { where += ` AND par.status=$${idx++}`;     params.push(status); }
    const result = await pool.query(
      `SELECT par.*,
              p.first_name||' '||p.last_name AS patient_name,
              ip.name_en AS provider_name,
              pip.policy_number,
              u.email AS requested_by_email
       FROM pre_authorization_requests par
       JOIN patients p ON par.patient_id=p.id
       JOIN patient_insurance_policies pip ON par.policy_id=pip.id
       JOIN insurance_providers ip ON pip.provider_id=ip.id
       LEFT JOIN users u ON par.requested_by=u.id
       WHERE ${where}
       ORDER BY par.requested_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    );
    res.json({ success: true, data: { requests: result.rows } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST create PA request
router.post('/pre-auth', authenticate, authorize(...INSURANCE_ROLES), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const {
      policy_id, patient_id, encounter_id, service_type, service_description,
      requested_amount, diagnosis_codes, procedure_codes, valid_from, valid_until
    } = req.body;
    if (!policy_id || !patient_id || !service_type || !service_description || !requested_amount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'policy_id, patient_id, service_type, service_description and requested_amount are required' });
    }
    // Generate PA number: PA-YYYYMMDD-NNN
    const todayStr = new Date().toISOString().slice(0,10).replace(/-/g,'');
    const cntRes = await client.query(
      `SELECT COUNT(*) FROM pre_authorization_requests WHERE pa_number LIKE $1`, [`PA-${todayStr}-%`]
    );
    const seq = parseInt(cntRes.rows[0].count, 10) + 1;
    const paNumber = `PA-${todayStr}-${String(seq).padStart(3,'0')}`;

    const result = await client.query(
      `INSERT INTO pre_authorization_requests
       (pa_number,policy_id,patient_id,encounter_id,service_type,service_description,
        requested_amount,diagnosis_codes,procedure_codes,requested_by,valid_from,valid_until,status)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'pending') RETURNING *`,
      [paNumber, policy_id, patient_id, encounter_id||null, service_type, service_description,
       parseFloat(requested_amount), diagnosis_codes||null, procedure_codes||null,
       req.user.id, valid_from||null, valid_until||null]
    );
    await client.query('COMMIT');
    res.status(201).json({ success: true, data: { request: result.rows[0] } });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    client.release();
  }
});

// PUT review PA request (approve/reject)
router.put('/pre-auth/:id', authenticate, authorize(...REVIEW_ROLES), async (req, res) => {
  try {
    const { status, approved_amount, provider_reference, review_notes, valid_from, valid_until } = req.body;
    const allowed = ['submitted','approved','partially_approved','rejected','expired','cancelled'];
    if (!status || !allowed.includes(status)) {
      return res.status(400).json({ success: false, message: `Status must be one of: ${allowed.join(', ')}` });
    }
    const result = await pool.query(
      `UPDATE pre_authorization_requests
       SET status=$1, approved_amount=$2, provider_reference=$3, review_notes=$4,
           reviewed_by=$5, reviewed_at=NOW(), valid_from=$6, valid_until=$7, updated_at=NOW()
       WHERE id=$8 RETURNING *`,
      [status, approved_amount?parseFloat(approved_amount):null, provider_reference||null,
       review_notes||null, req.user.id, valid_from||null, valid_until||null, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'PA request not found' });
    res.json({ success: true, data: { request: result.rows[0] } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── Claims ────────────────────────────────────────────────────────────────────

// GET claims with full detail
router.get('/claims', authenticate, async (req, res) => {
  try {
    const { patient_id, status, provider_id, limit = 50, offset = 0 } = req.query;
    let where = '1=1';
    const params = [];
    let idx = 1;

    if (req.user.role === 'patient') {
      const pat = await pool.query('SELECT id FROM patients WHERE user_id=$1', [req.user.id]);
      if (!pat.rows.length) return res.json({ success: true, data: { claims: [] } });
      where += ` AND ic.patient_id=$${idx++}`; params.push(pat.rows[0].id);
    } else {
      if (patient_id) { where += ` AND ic.patient_id=$${idx++}`; params.push(patient_id); }
    }
    if (status)      { where += ` AND ic.status=$${idx++}`;      params.push(status); }
    if (provider_id) { where += ` AND ic.provider_id=$${idx++}`; params.push(provider_id); }

    const result = await pool.query(
      `SELECT ic.*,
              COALESCE(ic.claim_number, 'CLM-'||LPAD(ic.id::text,5,'0')) AS claim_number,
              p.first_name||' '||p.last_name AS patient_name,
              ip.name_en AS provider_name, ip.code AS provider_code,
              pip.policy_number, pip.plan_name,
              par.pa_number,
              u.email AS submitted_by_email,
              rv.email AS reviewed_by_email
       FROM insurance_claims ic
       JOIN patients p ON ic.patient_id=p.id
       LEFT JOIN insurance_providers ip ON ic.provider_id=ip.id
       LEFT JOIN patient_insurance_policies pip ON ic.policy_id=pip.id
       LEFT JOIN pre_authorization_requests par ON ic.pre_auth_id=par.id
       LEFT JOIN users u ON ic.submitted_by=u.id
       LEFT JOIN users rv ON ic.reviewed_by=rv.id
       WHERE ${where}
       ORDER BY ic.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    );
    res.json({ success: true, data: { claims: result.rows } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET single claim with line items and events
router.get('/claims/:id', authenticate, async (req, res) => {
  try {
    const [claimRes, itemsRes, eventsRes] = await Promise.all([
      pool.query(
        `SELECT ic.*,
                COALESCE(ic.claim_number,'CLM-'||LPAD(ic.id::text,5,'0')) AS claim_number,
                p.first_name||' '||p.last_name AS patient_name, p.phone AS patient_phone,
                ip.name_en AS provider_name, ip.code AS provider_code, ip.claims_submission_email,
                pip.policy_number, pip.plan_name, pip.copay_fixed, pip.copay_percentage
         FROM insurance_claims ic
         JOIN patients p ON ic.patient_id=p.id
         LEFT JOIN insurance_providers ip ON ic.provider_id=ip.id
         LEFT JOIN patient_insurance_policies pip ON ic.policy_id=pip.id
         WHERE ic.id=$1`,
        [req.params.id]
      ),
      pool.query('SELECT * FROM insurance_claim_items WHERE claim_id=$1 ORDER BY id', [req.params.id]),
      pool.query('SELECT * FROM insurance_claim_events WHERE claim_id=$1 ORDER BY created_at DESC', [req.params.id]),
    ]);
    if (!claimRes.rows.length) return res.status(404).json({ success: false, message: 'Claim not found' });
    res.json({ success: true, data: { claim: claimRes.rows[0], items: itemsRes.rows, events: eventsRes.rows } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST submit a new claim
router.post('/claims', authenticate, authorize(...INSURANCE_ROLES), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const {
      patient_id, provider_id, policy_id, pre_auth_id, encounter_id, provider_name,
      policy_number, claim_amount, diagnosis_code, claim_type, notes, items
    } = req.body;

    if (!patient_id || !claim_amount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'patient_id and claim_amount are required' });
    }

    // Resolve provider name for backward compat
    let resolvedProviderName = provider_name;
    if (provider_id && !resolvedProviderName) {
      const prov = await client.query('SELECT name_en FROM insurance_providers WHERE id=$1', [provider_id]);
      if (prov.rows.length) resolvedProviderName = prov.rows[0].name_en;
    }

    // Generate claim number
    const yrStr = new Date().getFullYear();
    const seqRes = await client.query(`SELECT nextval('claim_number_seq') AS n`);
    const claimNumber = `CLM-${yrStr}-${String(seqRes.rows[0].n).padStart(5,'0')}`;

    // Calculate co-pay if policy attached
    let patientCopay = 0;
    let deductibleApplied = 0;
    if (policy_id) {
      const pol = await client.query('SELECT * FROM patient_insurance_policies WHERE id=$1', [policy_id]);
      if (pol.rows.length) {
        const breakdown = calcCopay(pol.rows[0], parseFloat(claim_amount));
        patientCopay = breakdown.copay;
        deductibleApplied = breakdown.deductibleApplied;
      }
    }

    const claimRes = await client.query(
      `INSERT INTO insurance_claims
       (patient_id,provider_id,policy_id,pre_auth_id,encounter_id,provider_name,policy_number,
        claim_number,claim_type,claim_amount,total_billed,diagnosis_code,notes,
        patient_copay,deductible_applied,submitted_by,submitted_at,status)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10,$11,$12,$13,$14,$15,NOW(),'pending')
       RETURNING *`,
      [patient_id, provider_id||null, policy_id||null, pre_auth_id||null, encounter_id||null,
       resolvedProviderName||null, policy_number||null, claimNumber,
       claim_type||'outpatient', parseFloat(claim_amount),
       diagnosis_code||null, notes||null,
       patientCopay, deductibleApplied, req.user.id]
    );
    const claim = claimRes.rows[0];

    // Insert line items
    if (items && Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        await client.query(
          `INSERT INTO insurance_claim_items
           (claim_id,service_type,description,icd10_code,cpt_code,quantity,unit_price,billed_amount,source_type,source_id)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [claim.id, item.service_type||'other', item.description, item.icd10_code||null, item.cpt_code||null,
           item.quantity||1, parseFloat(item.unit_price||0), parseFloat(item.billed_amount||item.unit_price||0),
           item.source_type||null, item.source_id||null]
        );
      }
    }

    await logClaimEvent(client, {
      claimId: claim.id, eventType: 'CLAIM_SUBMITTED', oldStatus: null, newStatus: 'pending',
      actorId: req.user.id, notes: `Claim ${claimNumber} submitted`
    });

    await client.query('COMMIT');
    res.status(201).json({ success: true, data: { claim } });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    client.release();
  }
});

// PUT update / review claim status
router.put('/claims/:id', authenticate, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { status, notes, approved_amount, provider_claim_ref, payment_amount, rejection_reason } = req.body;

    const claimRes = await client.query('SELECT * FROM insurance_claims WHERE id=$1 FOR UPDATE', [req.params.id]);
    if (!claimRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Claim not found' });
    }
    const oldClaim = claimRes.rows[0];

    // Validate reviewer permissions for critical transitions
    const reviewOnly = ['approved','partially_approved','rejected','paid','written_off'];
    if (reviewOnly.includes(status) && !REVIEW_ROLES.includes(req.user.role)) {
      await client.query('ROLLBACK');
      return res.status(403).json({ success: false, message: 'Insufficient permissions to set this status' });
    }

    const updateRes = await client.query(
      `UPDATE insurance_claims
       SET status=COALESCE($1,status),
           notes=COALESCE($2,notes),
           approved_amount=COALESCE($3,approved_amount),
           provider_claim_ref=COALESCE($4,provider_claim_ref),
           payment_amount=COALESCE($5,payment_amount),
           rejection_reason=COALESCE($6,rejection_reason),
           reviewed_by=CASE WHEN $1 IN ('approved','partially_approved','rejected','paid') THEN $7 ELSE reviewed_by END,
           reviewed_at=CASE WHEN $1 IN ('approved','partially_approved','rejected','paid') THEN NOW() ELSE reviewed_at END,
           payment_received_at=CASE WHEN $1='paid' THEN NOW() ELSE payment_received_at END,
           updated_at=NOW()
       WHERE id=$8 RETURNING *`,
      [status||null, notes||null, approved_amount?parseFloat(approved_amount):null,
       provider_claim_ref||null, payment_amount?parseFloat(payment_amount):null,
       rejection_reason||null, req.user.id, req.params.id]
    );

    // Update remaining benefit when paid
    if (status === 'paid' && oldClaim.policy_id && updateRes.rows[0].payment_amount) {
      await client.query(
        `UPDATE patient_insurance_policies
         SET remaining_benefit = COALESCE(remaining_benefit,annual_limit) - $1, updated_at=NOW()
         WHERE id=$2`,
        [parseFloat(updateRes.rows[0].payment_amount), oldClaim.policy_id]
      );
    }

    await logClaimEvent(client, {
      claimId: parseInt(req.params.id), eventType: 'STATUS_CHANGED',
      oldStatus: oldClaim.status, newStatus: status || oldClaim.status,
      actorId: req.user.id, notes: notes || rejection_reason || null
    });

    await client.query('COMMIT');
    res.json({ success: true, data: { claim: updateRes.rows[0] } });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    client.release();
  }
});

// GET claim events / audit trail
router.get('/claims/:id/events', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM insurance_claim_events WHERE claim_id=$1 ORDER BY created_at DESC',
      [req.params.id]
    );
    res.json({ success: true, data: { events: result.rows } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── Analytics / Summary ───────────────────────────────────────────────────────

router.get('/analytics/summary', authenticate, authorize(...REVIEW_ROLES, 'cashier'), async (req, res) => {
  try {
    const { from, to } = req.query;
    const dateFilter = from && to ? `AND ic.created_at BETWEEN '${from}' AND '${to}'::date+1` : '';

    const [totals, byStatus, byProvider, pending] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*) AS total_claims,
          COALESCE(SUM(ic.claim_amount),0) AS total_billed,
          COALESCE(SUM(ic.approved_amount),0) AS total_approved,
          COALESCE(SUM(ic.payment_amount),0) AS total_paid,
          COALESCE(SUM(ic.patient_copay),0) AS total_copay
        FROM insurance_claims ic WHERE 1=1 ${dateFilter}`),
      pool.query(`
        SELECT status, COUNT(*) AS count, COALESCE(SUM(claim_amount),0) AS amount
        FROM insurance_claims WHERE 1=1 ${dateFilter}
        GROUP BY status ORDER BY count DESC`),
      pool.query(`
        SELECT ip.name_en AS provider_name, ip.code,
               COUNT(ic.id) AS claims, COALESCE(SUM(ic.claim_amount),0) AS billed,
               COALESCE(SUM(ic.approved_amount),0) AS approved
        FROM insurance_claims ic
        JOIN insurance_providers ip ON ic.provider_id=ip.id
        WHERE ic.provider_id IS NOT NULL ${dateFilter}
        GROUP BY ip.id ORDER BY billed DESC LIMIT 10`),
      pool.query(`
        SELECT COUNT(*) AS pa_pending FROM pre_authorization_requests WHERE status='pending'`),
    ]);

    res.json({
      success: true,
      data: {
        totals: totals.rows[0],
        byStatus: byStatus.rows,
        byProvider: byProvider.rows,
        paPending: parseInt(pending.rows[0].pa_pending),
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
