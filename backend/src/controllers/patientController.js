const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const { sendSuccess, sendError, handleAsync } = require('../utils/response');
const patientQrService = require('../services/patientQrService');

// Helper function to convert camelCase to snake_case
const toSnakeCase = (obj) => {
  const result = {};
  for (const key in obj) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    result[snakeKey] = obj[key];
  }
  return result;
};

const getAllPatients = handleAsync(async (req, res) => {
  const { page = 1, limit = 10, search, bloodType } = req.query;
  const offset = (page - 1) * limit;

  let query = 'SELECT * FROM patients WHERE 1=1';
  const params = [];
  let paramCount = 0;

  if (search) {
    const rawSearch = search.trim();
    const patMatch = rawSearch.match(/^(?:PAT-?|#)?(\d+)$/i);
    const numericPart = patMatch ? patMatch[1] : null;

    let altPhone = null;
    if (rawSearch.startsWith('09') || rawSearch.startsWith('07')) {
      altPhone = `+251${rawSearch.slice(1)}`;
    } else if (rawSearch.startsWith('+2519') || rawSearch.startsWith('+2517')) {
      altPhone = `0${rawSearch.slice(5)}`;
    } else if (rawSearch.startsWith('2519') || rawSearch.startsWith('2517')) {
      altPhone = `0${rawSearch.slice(4)}`;
    }

    paramCount++;
    const sIdx = paramCount;
    params.push(`%${rawSearch}%`);

    let searchClause = `(first_name ILIKE $${sIdx} OR last_name ILIKE $${sIdx} OR email ILIKE $${sIdx} OR phone ILIKE $${sIdx} OR (first_name || ' ' || last_name) ILIKE $${sIdx} OR id::text ILIKE $${sIdx})`;

    if (numericPart) {
      paramCount++;
      searchClause += ` OR id = $${paramCount}`;
      params.push(parseInt(numericPart, 10));
    }

    if (altPhone) {
      paramCount++;
      searchClause += ` OR phone ILIKE $${paramCount}`;
      params.push(`%${altPhone}%`);
    }

    query += ` AND (${searchClause})`;
  }

  if (bloodType) {
    paramCount++;
    query += ` AND blood_type = $${paramCount}`;
    params.push(bloodType);
  }

  query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
  params.push(limit, offset);

  const result = await pool.query(query, params);

  // Safe parameterized count query matching same conditions
  let countQuery = 'SELECT COUNT(*) FROM patients WHERE 1=1';
  const countParams = [];
  let countIdx = 0;

  if (search) {
    const rawSearch = search.trim();
    const patMatch = rawSearch.match(/^(?:PAT-?|#)?(\d+)$/i);
    const numericPart = patMatch ? patMatch[1] : null;

    let altPhone = null;
    if (rawSearch.startsWith('09') || rawSearch.startsWith('07')) {
      altPhone = `+251${rawSearch.slice(1)}`;
    } else if (rawSearch.startsWith('+2519') || rawSearch.startsWith('+2517')) {
      altPhone = `0${rawSearch.slice(5)}`;
    } else if (rawSearch.startsWith('2519') || rawSearch.startsWith('2517')) {
      altPhone = `0${rawSearch.slice(4)}`;
    }

    countIdx++;
    const sIdx = countIdx;
    countParams.push(`%${rawSearch}%`);

    let searchClause = `(first_name ILIKE $${sIdx} OR last_name ILIKE $${sIdx} OR email ILIKE $${sIdx} OR phone ILIKE $${sIdx} OR (first_name || ' ' || last_name) ILIKE $${sIdx} OR id::text ILIKE $${sIdx})`;

    if (numericPart) {
      countIdx++;
      searchClause += ` OR id = $${countIdx}`;
      countParams.push(parseInt(numericPart, 10));
    }

    if (altPhone) {
      countIdx++;
      searchClause += ` OR phone ILIKE $${countIdx}`;
      countParams.push(`%${altPhone}%`);
    }

    countQuery += ` AND (${searchClause})`;
  }

  if (bloodType) {
    countIdx++;
    countQuery += ` AND blood_type = $${countIdx}`;
    countParams.push(bloodType);
  }

  const countResult = await pool.query(countQuery, countParams);

  sendSuccess(res, {
    patients: result.rows,
    pagination: {
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
    }
  });
});

const getPatientById = handleAsync(async (req, res) => {
  const { id } = req.params;

  const result = await pool.query(
    'SELECT * FROM patients WHERE id = $1',
    [id]
  );

  if (result.rows.length === 0) {
    return sendError(res, 'Patient not found', 404);
  }

  sendSuccess(res, result.rows[0]);
});

const checkDuplicatePatient = handleAsync(async (req, res) => {
  const data = toSnakeCase(req.body);
  const { phone, first_name, last_name, date_of_birth, insurance_number } = data;

  const params = [];
  const conditions = [];

  if (phone && String(phone).trim().length >= 8) {
    const rawPhone = String(phone).trim();
    let normPhone = rawPhone;
    if (rawPhone.startsWith('09') || rawPhone.startsWith('07')) {
      normPhone = `+251${rawPhone.slice(1)}`;
    } else if (rawPhone.startsWith('+2519') || rawPhone.startsWith('+2517')) {
      normPhone = `0${rawPhone.slice(5)}`;
    }
    params.push(rawPhone);
    const p1 = `$${params.length}`;
    params.push(normPhone);
    const p2 = `$${params.length}`;
    conditions.push(`(phone = ${p1} OR phone = ${p2} OR phone ILIKE '%' || ${p1} || '%')`);
  }

  if (first_name && last_name && date_of_birth) {
    params.push(String(first_name).trim());
    const fn = `$${params.length}`;
    params.push(String(last_name).trim());
    const ln = `$${params.length}`;
    params.push(date_of_birth);
    const dob = `$${params.length}`;
    conditions.push(`(LOWER(first_name) = LOWER(${fn}) AND LOWER(last_name) = LOWER(${ln}) AND date_of_birth = ${dob}::date)`);
  }

  if (insurance_number && String(insurance_number).trim().length >= 4) {
    params.push(String(insurance_number).trim());
    const ins = `$${params.length}`;
    conditions.push(`(insurance_number = ${ins} AND insurance_number IS NOT NULL AND insurance_number != '')`);
  }

  if (conditions.length === 0) {
    return sendSuccess(res, { duplicates: [], count: 0, has_duplicates: false }, 'No search criteria provided');
  }

  const query = `
    SELECT id, first_name, last_name, date_of_birth, gender, phone, email,
           insurance_number, created_at
    FROM patients
    WHERE ${conditions.join(' OR ')}
    LIMIT 5
  `;

  const result = await pool.query(query, params);
  const duplicates = result.rows.map(row => {
    const reasons = [];
    if (phone && row.phone && (row.phone.includes(phone) || phone.includes(row.phone))) {
      reasons.push('Phone number match');
    }
    if (first_name && last_name && row.first_name.toLowerCase() === first_name.toLowerCase() && row.last_name.toLowerCase() === last_name.toLowerCase()) {
      reasons.push('Full name match');
    }
    if (date_of_birth && row.date_of_birth) {
      const d1 = new Date(row.date_of_birth).toISOString().slice(0, 10);
      const d2 = new Date(date_of_birth).toISOString().slice(0, 10);
      if (d1 === d2) reasons.push('Date of birth match');
    }
    if (insurance_number && row.insurance_number === insurance_number) {
      reasons.push('Insurance/CBHI number match');
    }

    return {
      id: row.id,
      mrn: patientQrService.formatMrn(row.id),
      first_name: row.first_name,
      last_name: row.last_name,
      phone: row.phone,
      date_of_birth: row.date_of_birth,
      gender: row.gender,
      insurance_number: row.insurance_number,
      created_at: row.created_at,
      match_reasons: reasons.length ? reasons : ['Demographic similarity']
    };
  });

  sendSuccess(res, {
    duplicates,
    count: duplicates.length,
    has_duplicates: duplicates.length > 0
  }, duplicates.length > 0 ? 'Potential duplicate patient records found' : 'No duplicate records found');
});

const registerPatient = handleAsync(async (req, res) => {
  const data = toSnakeCase(req.body);
  const {
    first_name, last_name, date_of_birth, gender, phone, email,
    address, blood_type, allergies, emergency_contact_name,
    emergency_contact_phone, insurance_number, medical_history,
    intake_pathway = 'self_pay', waiver_reason, allow_duplicate,
    password  // optional: admin may supply a real password
  } = data;

  if (!first_name || !last_name || !date_of_birth || !gender) {
    return sendError(res, 'first_name, last_name, date_of_birth, and gender are required', 400);
  }

  // Duplicate patient prevention (when requested or on strict check)
  if (data.check_duplicate && phone && String(phone).trim().length >= 8) {
    const dupCheck = await pool.query(
      `SELECT id, first_name, last_name, phone FROM patients
       WHERE (phone = $1 OR (LOWER(first_name) = LOWER($2) AND LOWER(last_name) = LOWER($3) AND date_of_birth = $4::date))
       LIMIT 1`,
      [phone.trim(), first_name.trim(), last_name.trim(), date_of_birth]
    );
    if (dupCheck.rows.length) {
      const match = dupCheck.rows[0];
      return sendError(res, `Potential duplicate patient found: ${match.first_name} ${match.last_name} (${patientQrService.formatMrn(match.id)}). Set allow_duplicate=true if this is a distinct individual.`, 409);
    }
  }

  // Handle email: if patient has no email, generate a unique internal clinical account identifier
  const cleanFirst = String(first_name).toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanLast = String(last_name).toLowerCase().replace(/[^a-z0-9]/g, '');
  const randomSuffix = Math.random().toString(36).substring(2, 7);
  const effectiveEmail = (email && String(email).trim())
    ? String(email).toLowerCase().trim()
    : `pat.${cleanFirst || 'patient'}.${cleanLast || 'record'}.${Date.now().toString(36)}.${randomSuffix}@hospital.local`;

  // Check if email already taken
  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [effectiveEmail]);
  if (existing.rows.length > 0) {
    return sendError(res, 'An account with this email already exists', 409);
  }

  // Use provided password or generate a secure random one
  const rawPassword = password || Math.random().toString(36).slice(-10) + 'A1!';
  const hashedPassword = await bcrypt.hash(rawPassword, 10);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const userResult = await client.query(
      'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id',
      [effectiveEmail, hashedPassword, 'patient']
    );
    const userId = userResult.rows[0].id;

    const patientResult = await client.query(
      `INSERT INTO patients (user_id, first_name, last_name, date_of_birth, gender, phone, email, address, blood_type,
        allergies, emergency_contact_name, emergency_contact_phone, insurance_number, medical_history)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
      [userId, first_name, last_name, date_of_birth, gender, phone || null,
       effectiveEmail, address || null, blood_type || null, allergies || null,
       emergency_contact_name || null, emergency_contact_phone || null,
       insurance_number || null, medical_history || null]
    );

    const patientRow = patientResult.rows[0];
    const qrIdentity = await patientQrService.ensurePatientQrIdentity(client, {
      patientId: patientRow.id,
      actorUserId: req.user.id,
      req
    });

    // ── AUTOMATIC INVOICE & ENCOUNTER GENERATION (3 INTAKE PATHWAYS) ────────
    let autoInvoice = null;
    let initialEncounter = null;
    try {
      const pathway = String(intake_pathway || 'self_pay').toLowerCase().trim();
      let invStatus = 'pending';
      let invNotes = 'Automatic Patient Registration Fee';
      let waiverReasonText = null;
      let waivedById = null;
      let waivedAtDate = null;

      if (pathway === 'cbhi') {
        invStatus = 'waived';
        invNotes = `CBHI Registration Fee Waiver - Verified Member: ${insurance_number || 'Kebele Booklet'}. Reason: ${waiver_reason || 'CBHI Membership Card Verified'}`;
        waiverReasonText = waiver_reason || 'CBHI Membership Card Verified';
        waivedById = req.user.id;
        waivedAtDate = new Date();
      } else if (pathway === 'emergency') {
        invStatus = 'deferred';
        invNotes = 'Emergency Intake - Card Fee Deferred until Clinical Stabilization';
      }

      const autoInvoiceRes = await client.query(
        `INSERT INTO invoices (patient_id, subtotal, tax, discount, total_amount, status, notes, intake_pathway, waiver_reason, waived_by, waived_at)
         VALUES ($1, 50.00, 0.00, 0.00, 50.00, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [patientRow.id, invStatus, invNotes, pathway, waiverReasonText, waivedById, waivedAtDate]
      );
      if (autoInvoiceRes && autoInvoiceRes.rows && autoInvoiceRes.rows.length) {
        autoInvoice = autoInvoiceRes.rows[0];
        await client.query(
          `INSERT INTO invoice_items 
             (invoice_id, patient_id, description, quantity, unit_price, source_type, source_id)
           VALUES ($1, $2, 'Patient Registration Fee', 1, 50.00, 'other', $3)`,
          [autoInvoice.id, patientRow.id, autoInvoice.id]
        );
      }

      // Automatically create the initial clinical encounter based on pathway
      const encType = pathway === 'emergency' ? 'emergency' : 'outpatient';
      // Emergency and CBHI proceed directly to Triage queue; Self-Pay awaits cashier clearance or triage authorization
      const encStatus = pathway === 'emergency' ? 'waiting_for_triage' : (pathway === 'cbhi' ? 'waiting_for_triage' : 'registered');
      const billStatus = pathway === 'cbhi' ? 'waived' : (pathway === 'emergency' ? 'deferred' : 'pending');

      const encRes = await client.query(
        `INSERT INTO patient_encounters (patient_id, encounter_type, status, created_by, intake_pathway, billing_status)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [patientRow.id, encType, encStatus, req.user.id, pathway, billStatus]
      );

      if (encRes.rows.length) {
        initialEncounter = encRes.rows[0];
        const encNumber = `ENC-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(initialEncounter.id).padStart(4,'0')}`;
        await client.query(
          `UPDATE patient_encounters SET encounter_number = $1 WHERE id = $2`,
          [encNumber, initialEncounter.id]
        );
        initialEncounter.encounter_number = encNumber;

        if (autoInvoice) {
          await client.query('UPDATE invoices SET encounter_id = $1 WHERE id = $2', [initialEncounter.id, autoInvoice.id]);
          autoInvoice.encounter_id = initialEncounter.id;
        }

        await client.query(
          `INSERT INTO workflow_status_history (entity_type, entity_id, from_status, to_status, changed_by, notes)
           VALUES ('encounter', $1, NULL, $2, $3, $4)`,
          [initialEncounter.id, encStatus, req.user.id, `Patient registered via ${pathway.toUpperCase()} pathway`]
        );
      }
    } catch (invErr) {
      console.warn('Auto invoice/encounter creation deferred:', invErr.message);
    }

    await client.query('COMMIT');

    // Return both top-level and nested .patient for compatibility with all frontend workflows
    const responseData = {
      ...patientRow,
      patient: patientRow,
      invoice: autoInvoice,
      registration_invoice: autoInvoice,
      encounter: initialEncounter,
      qr: qrIdentity
    };
    if (!password) {
      responseData.generated_password = rawPassword;
      responseData.password_note = 'Share this password with the patient. They should change it upon first login.';
    }

    sendSuccess(res, responseData, 'Patient registered successfully', 201);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

const updatePatient = handleAsync(async (req, res) => {
  const { id } = req.params;
  const updates = toSnakeCase(req.body);

  const setClause = Object.keys(updates)
    .map((key, index) => `${key} = $${index + 2}`)
    .join(', ');

  const values = [id, ...Object.values(updates)];

  const result = await pool.query(
    `UPDATE patients SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    return sendError(res, 'Patient not found', 404);
  }

  sendSuccess(res, result.rows[0], 'Patient updated successfully');
});

const getPatientHistory = handleAsync(async (req, res) => {
  const { id } = req.params;

  const patientResult = await pool.query(
    'SELECT * FROM patients WHERE id = $1',
    [id]
  );

  if (patientResult.rows.length === 0) {
    return sendError(res, 'Patient not found', 404);
  }

  const diagnoses = await pool.query(
    'SELECT * FROM diagnoses WHERE patient_id = $1 ORDER BY diagnosis_date DESC',
    [id]
  );

  const prescriptions = await pool.query(
    'SELECT * FROM prescriptions WHERE patient_id = $1 ORDER BY prescribed_date DESC',
    [id]
  );

  const labTests = await pool.query(
    'SELECT * FROM lab_tests WHERE patient_id = $1 ORDER BY requested_date DESC',
    [id]
  );

  const admissions = await pool.query(
    'SELECT * FROM admissions WHERE patient_id = $1 ORDER BY admission_date DESC',
    [id]
  );

  sendSuccess(res, {
    patient: patientResult.rows[0],
    diagnoses: diagnoses.rows,
    prescriptions: prescriptions.rows,
    labTests: labTests.rows,
    admissions: admissions.rows
  });
});

const deletePatient = handleAsync(async (req, res) => {
  const { id } = req.params;

  if (req.user?.role !== 'super_admin') {
    return sendError(res, 'Access denied. Only Super Admin may permanently delete patient records.', 403);
  }

  // Check if patient has any clinical encounters, prescriptions, lab tests, or invoices
  const linkCheck = await pool.query(
    `SELECT
       (SELECT COUNT(*) FROM patient_encounters WHERE patient_id = $1) AS encounter_count,
       (SELECT COUNT(*) FROM prescriptions WHERE patient_id = $1) AS prescription_count,
       (SELECT COUNT(*) FROM lab_tests WHERE patient_id = $1) AS lab_count,
       (SELECT COUNT(*) FROM invoices WHERE patient_id = $1) AS invoice_count`,
    [id]
  );

  const row = linkCheck.rows[0];
  const totalLinked = parseInt(row.encounter_count || 0) + 
                      parseInt(row.prescription_count || 0) + 
                      parseInt(row.lab_count || 0) + 
                      parseInt(row.invoice_count || 0);

  if (totalLinked > 0) {
    return sendError(
      res,
      `Cannot delete patient record: patient has linked clinical encounters (${row.encounter_count}), prescriptions (${row.prescription_count}), lab tests (${row.lab_count}), or billing records (${row.invoice_count}). Medical and financial records must be preserved.`,
      400
    );
  }

  const result = await pool.query(
    'DELETE FROM patients WHERE id = $1 RETURNING *',
    [id]
  );

  if (result.rows.length === 0) {
    return sendError(res, 'Patient not found', 404);
  }

  sendSuccess(res, null, 'Patient deleted successfully');
});

const lookupPatientByIdentifier = handleAsync(async (req, res) => {
  const { identifier } = req.body;
  if (!identifier || typeof identifier !== 'string') {
    return sendError(res, 'identifier string is required', 400);
  }

  const raw = identifier.trim();

  // Try extracting numeric ID if formatted as PAT-000123 or #123
  let numericId = null;
  const patMatch = raw.match(/^(?:PAT-?|#)?(\d+)$/i);
  if (patMatch) {
    numericId = parseInt(patMatch[1], 10);
  }

  // Check 1: By barcode log
  let patientId = null;
  const barcodeRes = await pool.query(
    'SELECT patient_id FROM patient_wristband_logs WHERE wristband_barcode = $1 LIMIT 1',
    [raw]
  );
  if (barcodeRes.rows.length > 0) {
    patientId = barcodeRes.rows[0].patient_id;
  } else if (numericId) {
    patientId = numericId;
  }

  let patient = null;
  if (patientId) {
    const pRes = await pool.query('SELECT * FROM patients WHERE id = $1', [patientId]);
    if (pRes.rows.length > 0) {
      patient = pRes.rows[0];
    }
  }

  // If still not found, search by phone, email, or insurance
  if (!patient) {
    const searchRes = await pool.query(
      `SELECT * FROM patients 
       WHERE phone = $1 OR email = $1 
       LIMIT 1`,
      [raw]
    );
    if (searchRes.rows.length > 0) {
      patient = searchRes.rows[0];
    }
  }

  if (!patient) {
    return sendError(res, `No patient record found for identifier "${raw}"`, 404);
  }

  // Fetch active / recent encounters
  let activeEncounters = [];
  try {
    const encRes = await pool.query(
      `SELECT pe.*, d.name AS department_name
       FROM patient_encounters pe
       LEFT JOIN departments d ON d.id = pe.department_id
       WHERE pe.patient_id = $1
       ORDER BY pe.started_at DESC LIMIT 3`,
      [patient.id]
    );
    activeEncounters = encRes.rows;
  } catch (e) {
    // Encounters optional if table empty
  }

  // Fetch verified allergies
  let allergies = [];
  try {
    const allergyRes = await pool.query(
      `SELECT * FROM patient_allergies WHERE patient_id = $1`,
      [patient.id]
    );
    allergies = allergyRes.rows;
  } catch (e) {
    // Optional
  }

  // Log / Update wristband verification audit
  const effectiveBarcode = raw.startsWith('PAT-') ? raw : `PAT-${String(patient.id).padStart(4, '0')}`;
  try {
    await pool.query(
      `UPDATE patient_wristband_logs
       SET verified_count = verified_count + 1,
           last_verified_at = NOW(),
           last_verified_by = $1
       WHERE patient_id = $2`,
      [req.user?.id || null, patient.id]
    );
  } catch (e) {
    // Non-fatal
  }

  sendSuccess(res, {
    patient: {
      ...patient,
      mrn: `PAT-${String(patient.id).padStart(4, '0')}`
    },
    activeEncounters,
    allergies,
    scannedAt: new Date().toISOString(),
    scannedBy: req.user ? { id: req.user.id, email: req.user.email, role: req.user.role } : null
  });
});

const withPatientQrTransaction = async (req, patientId, regenerate = false) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const qr = await patientQrService.ensurePatientQrIdentity(client, {
      patientId,
      actorUserId: req.user.id,
      req,
      regenerate
    });
    if (!qr) {
      await client.query('ROLLBACK');
      return null;
    }
    await client.query('COMMIT');
    return qr;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const getPatientQr = handleAsync(async (req, res) => {
  const patientId = Number(req.params.id);
  if (!Number.isSafeInteger(patientId) || patientId < 1) {
    return sendError(res, 'Invalid patient ID', 400);
  }
  const qr = await withPatientQrTransaction(req, patientId);
  if (!qr) return sendError(res, 'Patient not found', 404);
  sendSuccess(res, qr, 'Patient QR identity ready');
});

const regeneratePatientQr = handleAsync(async (req, res) => {
  const patientId = Number(req.params.id);
  if (!Number.isSafeInteger(patientId) || patientId < 1) {
    return sendError(res, 'Invalid patient ID', 400);
  }
  const qr = await withPatientQrTransaction(req, patientId, true);
  if (!qr) return sendError(res, 'Patient not found', 404);
  sendSuccess(res, qr, 'Patient QR identity regenerated');
});

const scanPatientQr = handleAsync(async (req, res) => {
  const { qrContent, department, device_id } = req.body;
  if (typeof qrContent !== 'string' || qrContent.length > 128) {
    return sendError(res, 'A valid patient QR code is required', 400);
  }

  const raw = qrContent.trim();
  const tokenMatch = raw.match(/^(?:AKEH:PATIENT:(?:v1:)?)?([A-Za-z0-9_-]{43,64})$/);
  const mrnMatch = raw.match(/^\*?(?:PAT-|TEMP-)?0*(\d+)\*?$/i);

  if (!tokenMatch && !mrnMatch) {
    await patientQrService.logQrAction(pool, {
      actorUserId: req.user.id,
      action: 'scan_rejected',
      outcome: 'rejected',
      rejectionReason: 'Invalid patient QR code',
      req
    });
    return sendError(res, 'Invalid patient QR code', 400);
  }

  const client = await pool.connect();
  let row;
  try {
    await client.query('BEGIN');
    if (tokenMatch) {
      const token = tokenMatch[1];
      const tokenHash = patientQrService.hashToken(token);
      const identityResult = await client.query(
        `SELECT i.id AS identity_id, i.status, i.is_active, i.expires_at, i.revocation_reason, i.revoked_at,
                p.id, p.first_name, p.last_name,
                p.date_of_birth, p.gender, p.blood_type, p.allergies, p.phone,
                p.is_unidentified, p.temporary_mrn, p.profile_photo_updated_at,
                (i.is_active = true) AS is_active_check,
                (i.expires_at > CURRENT_TIMESTAMP) AS not_expired_check
         FROM patient_qr_identities i
         JOIN patients p ON p.id = i.patient_id
         WHERE (i.token_hash = $1 OR i.token = $2)
         LIMIT 1
         FOR SHARE OF i`,
        [tokenHash, token]
      );
      if (!identityResult.rows.length) {
        await patientQrService.logQrAction(client, {
          actorUserId: req.user.id,
          action: 'scan_rejected',
          outcome: 'rejected',
          rejectionReason: 'Patient QR code is invalid, expired, or revoked',
          department,
          deviceId: device_id,
          req
        });
        await client.query('COMMIT');
        return sendError(res, 'Patient QR code is invalid, expired, or revoked', 404);
      }
      row = identityResult.rows[0];
    } else {
      const patientId = parseInt(mrnMatch[1], 10);
      const patientResult = await client.query(
        `SELECT p.id, p.first_name, p.last_name,
                p.date_of_birth, p.gender, p.blood_type, p.allergies, p.phone,
                p.is_unidentified, p.temporary_mrn, p.profile_photo_updated_at
         FROM patients p
         WHERE p.id = $1
         LIMIT 1`,
        [patientId]
      );
      if (!patientResult.rows.length) {
        await patientQrService.logQrAction(client, {
          actorUserId: req.user.id,
          action: 'scan_rejected',
          outcome: 'rejected',
          rejectionReason: 'Patient record not found for scanned identifier',
          department,
          deviceId: device_id,
          req
        });
        await client.query('COMMIT');
        return sendError(res, 'Patient record not found for scanned identifier', 404);
      }
      const p = patientResult.rows[0];
      const identRes = await client.query(
        `SELECT id, status FROM patient_qr_identities WHERE patient_id = $1 AND is_active = true LIMIT 1`,
        [p.id]
      );
      row = { ...p, identity_id: identRes.rows[0]?.id || null, status: identRes.rows[0]?.status || 'active' };
    }

    const patientId = row.id || row.patient_id;

    const isExpired = row.status === 'expired' || (row.expires_at && new Date(row.expires_at) < new Date());
    if (isExpired) {
      await patientQrService.logQrAction(client, {
        patientId,
        identityId: row.identity_id,
        actorUserId: req.user.id,
        action: 'scan_rejected',
        outcome: 'rejected',
        rejectionReason: 'Token expired',
        department,
        deviceId: device_id,
        req
      });
      await client.query('COMMIT');
      return sendError(res, 'Patient QR code has expired', 410);
    }

    if (row.status === 'revoked' || row.status === 'replaced' || row.is_active === false) {
      await patientQrService.logQrAction(client, {
        patientId,
        identityId: row.identity_id,
        actorUserId: req.user.id,
        action: 'scan_rejected',
        outcome: 'rejected',
        rejectionReason: `Attempted scan of ${row.status || 'inactive'} QR token`,
        department,
        deviceId: device_id,
        req
      });
      await client.query('COMMIT');
      return sendError(res, `Patient QR code has been revoked. Reason: ${row.revocation_reason || 'Replaced or deactivated'}`, 404);
    }

    await patientQrService.logQrAction(client, {
      patientId: row.id,
      identityId: row.identity_id,
      actorUserId: req.user.id,
      action: 'scan_succeeded',
      outcome: 'success',
      department: department || (req.user?.role ? req.user.role.toUpperCase() : 'GENERAL'),
      deviceId: device_id || 'DEFAULT',
      req
    });
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  const clinicalRoles = ['doctor', 'nurse', 'admin', 'super_admin'];
  const receptionistRoles = ['receptionist', 'hospital_manager'];
  const pharmacyRoles = ['pharmacist'];
  const labRoles = ['lab_technician'];

  const effectiveId = row.id || row.patient_id;
  const effectiveMrn = row.is_unidentified && row.temporary_mrn
    ? row.temporary_mrn
    : patientQrService.formatMrn(effectiveId);

  const patient = {
    id: effectiveId,
    mrn: effectiveMrn,
    first_name: row.first_name,
    last_name: row.last_name
  };

  if (clinicalRoles.includes(req.user.role)) {
    patient.gender = row.gender;
    patient.date_of_birth = row.date_of_birth;
    patient.blood_type = row.blood_type;
    patient.allergies = row.allergies;
    patient.phone = row.phone;
    patient.patient_photo_user_id = row.user_id || effectiveId;
  } else if (receptionistRoles.includes(req.user.role)) {
    patient.gender = row.gender;
    patient.date_of_birth = row.date_of_birth;
    patient.phone = row.phone;
  } else if (pharmacyRoles.includes(req.user.role)) {
    patient.allergies = row.allergies;
    patient.date_of_birth = row.date_of_birth;
  } else if (labRoles.includes(req.user.role)) {
    patient.gender = row.gender;
    patient.date_of_birth = row.date_of_birth;
  }

  sendSuccess(res, {
    patient,
    identity_status: 'active',
    verified_at: new Date().toISOString()
  }, 'Patient QR verified successfully');
});

const confirmPatientIdentity = handleAsync(async (req, res) => {
  const {
    patient_id,
    encounter_id,
    department,
    verification_method,
    identifiers_confirmed,
    status,
    notes
  } = req.body;

  const patientId = Number(patient_id);
  if (!Number.isSafeInteger(patientId) || patientId < 1) {
    return sendError(res, 'Valid patient ID is required', 400);
  }

  const verification = await patientQrService.recordTwoIdentifierVerification(pool, {
    patientId,
    encounterId: encounter_id ? Number(encounter_id) : null,
    actorUserId: req.user.id,
    department: department || req.user.role,
    verificationMethod: verification_method || 'two_identifier_verbal',
    identifiersConfirmed: Array.isArray(identifiers_confirmed) ? identifiers_confirmed : ['full_name', 'dob'],
    status: status || 'confirmed',
    notes: notes || null
  });

  sendSuccess(res, { verification }, 'Patient identity verification recorded');
});

const reportIdentityMismatch = handleAsync(async (req, res) => {
  const { scanned_patient_id, department, mismatch_details } = req.body;
  if (!scanned_patient_id || !mismatch_details) {
    return sendError(res, 'Scanned patient ID and mismatch details are required', 400);
  }

  const report = await patientQrService.reportIdentityMismatch(pool, {
    scannedPatientId: Number(scanned_patient_id),
    actorUserId: req.user.id,
    department: department || req.user.role,
    mismatchDetails: String(mismatch_details).trim(),
    req
  });

  sendSuccess(res, { report }, 'Patient identity mismatch alert filed and escalated');
});

const revokePatientQr = handleAsync(async (req, res) => {
  const patientId = Number(req.params.id);
  const { reason, identity_id } = req.body;
  if (!Number.isSafeInteger(patientId) || patientId < 1) {
    return sendError(res, 'Invalid patient ID', 400);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const revoked = await patientQrService.revokePatientQrIdentity(client, {
      patientId,
      identityId: identity_id ? Number(identity_id) : null,
      actorUserId: req.user.id,
      reason: reason || 'Revoked by authorized hospital staff',
      req
    });
    if (!revoked) {
      await client.query('ROLLBACK');
      return sendError(res, 'No active QR identity found for this patient', 404);
    }
    await client.query('COMMIT');
    sendSuccess(res, { revoked }, 'Patient QR identity successfully revoked');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

const replacePatientQr = handleAsync(async (req, res) => {
  const patientId = Number(req.params.id);
  const { reason, printer_id } = req.body;
  if (!Number.isSafeInteger(patientId) || patientId < 1) {
    return sendError(res, 'Invalid patient ID', 400);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const replacement = await patientQrService.replacePatientQrIdentity(client, {
      patientId,
      actorUserId: req.user.id,
      reason: reason || 'Damaged or lost wristband replacement',
      printerId: printer_id || 'THERMAL-MAIN-DESK',
      req
    });
    await client.query('COMMIT');
    sendSuccess(res, replacement, 'Replacement wristband issued and old identity revoked');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

const getPatientQrHistory = handleAsync(async (req, res) => {
  const patientId = Number(req.params.id);
  if (!Number.isSafeInteger(patientId) || patientId < 1) {
    return sendError(res, 'Invalid patient ID', 400);
  }

  const history = await patientQrService.getPatientQrHistory(pool, patientId);
  sendSuccess(res, history, 'Patient QR history retrieved');
});

const getQrAuditStats = handleAsync(async (req, res) => {
  const { startDate, endDate, department } = req.query;
  const stats = await patientQrService.getQrAuditStats(pool, { startDate, endDate, department });
  sendSuccess(res, stats, 'QR audit statistics retrieved');
});

const getQrAuditEvents = handleAsync(async (req, res) => {
  const { startDate, endDate, department, action, limit, offset } = req.query;
  const eventsData = await patientQrService.getQrAuditEvents(pool, {
    startDate,
    endDate,
    department,
    action,
    limit: limit ? parseInt(limit, 10) : 25,
    offset: offset ? parseInt(offset, 10) : 0
  });
  sendSuccess(res, eventsData, 'QR audit event logs retrieved');
});

const registerEmergencyUnidentified = handleAsync(async (req, res) => {
  const { estimated_age, gender, condition_description, department_id } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await patientQrService.registerEmergencyUnidentifiedPatient(client, {
      actorUserId: req.user.id,
      departmentId: department_id ? Number(department_id) : 1,
      estimatedAge: estimated_age || null,
      gender: gender || 'unknown',
      conditionDescription: condition_description || 'Emergency Trauma Unidentified Arrival',
      req
    });
    await client.query('COMMIT');
    sendSuccess(res, result, 'Emergency unidentified patient registered and wristband issued', 201);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

const recordWristbandPrinted = handleAsync(async (req, res) => {
  const patientId = parseInt(req.params.id, 10);
  const { encounter_id, barcode, printer_id, print_reason, print_type, replacement_reason } = req.body;

  const effectiveBarcode = barcode || `PAT-${String(patientId).padStart(4, '0')}`;

  const logRes = await pool.query(
    `INSERT INTO patient_wristband_logs (
      patient_id, encounter_id, wristband_barcode, printed_by, printer_id,
      print_reason, print_type, replacement_reason, printed_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
    RETURNING *`,
    [
      patientId,
      encounter_id || null,
      effectiveBarcode,
      req.user?.id || null,
      printer_id || 'THERMAL-DEFAULT',
      print_reason || 'initial',
      print_type || 'initial',
      replacement_reason || null
    ]
  );

  sendSuccess(res, {
    message: 'Wristband print event recorded',
    log: logRes.rows[0]
  });
});

module.exports = {
  getAllPatients,
  getPatientById,
  checkDuplicatePatient,
  registerPatient,
  updatePatient,
  getPatientHistory,
  deletePatient,
  lookupPatientByIdentifier,
  recordWristbandPrinted,
  getPatientQr,
  regeneratePatientQr,
  scanPatientQr,
  confirmPatientIdentity,
  reportIdentityMismatch,
  revokePatientQr,
  replacePatientQr,
  getPatientQrHistory,
  getQrAuditStats,
  getQrAuditEvents,
  registerEmergencyUnidentified
};
