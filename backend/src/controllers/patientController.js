const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const { sendSuccess, sendError, handleAsync } = require('../utils/response');

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
    paramCount++;
    query += ` AND (first_name ILIKE $${paramCount} OR last_name ILIKE $${paramCount} OR email ILIKE $${paramCount} OR phone ILIKE $${paramCount})`;
    params.push(`%${search}%`);
  }

  if (bloodType) {
    paramCount++;
    query += ` AND blood_type = $${paramCount}`;
    params.push(bloodType);
  }

  query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
  params.push(limit, offset);

  const result = await pool.query(query, params);

  // Safe parameterized count query
  let countQuery = 'SELECT COUNT(*) FROM patients WHERE 1=1';
  const countParams = [];
  let countIdx = 1;
  if (search) {
    countQuery += ` AND (first_name ILIKE $${countIdx} OR last_name ILIKE $${countIdx} OR email ILIKE $${countIdx} OR phone ILIKE $${countIdx})`;
    countParams.push(`%${search}%`);
    countIdx++;
  }
  if (bloodType) {
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

const registerPatient = handleAsync(async (req, res) => {
  const data = toSnakeCase(req.body);
  const {
    first_name, last_name, date_of_birth, gender, phone, email,
    address, blood_type, allergies, emergency_contact_name,
    emergency_contact_phone, insurance_number, medical_history,
    password  // optional: admin may supply a real password
  } = data;

  if (!email || !first_name || !last_name || !date_of_birth || !gender) {
    return sendError(res, 'first_name, last_name, email, date_of_birth, and gender are required', 400);
  }

  // Check if email already taken
  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
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
      [email.toLowerCase().trim(), hashedPassword, 'patient']
    );
    const userId = userResult.rows[0].id;

    const patientResult = await client.query(
      `INSERT INTO patients (user_id, first_name, last_name, date_of_birth, gender, phone, email, address, blood_type,
        allergies, emergency_contact_name, emergency_contact_phone, insurance_number, medical_history)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
      [userId, first_name, last_name, date_of_birth, gender, phone || null,
       email.toLowerCase().trim(), address || null, blood_type || null, allergies || null,
       emergency_contact_name || null, emergency_contact_phone || null,
       insurance_number || null, medical_history || null]
    );

    await client.query('COMMIT');

    // Return the generated password only if admin didn't supply one (so they can share it)
    const responseData = { ...patientResult.rows[0] };
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

const recordWristbandPrinted = handleAsync(async (req, res) => {
  const patientId = parseInt(req.params.id, 10);
  const { encounter_id, barcode } = req.body;

  const effectiveBarcode = barcode || `PAT-${String(patientId).padStart(4, '0')}`;

  const logRes = await pool.query(
    `INSERT INTO patient_wristband_logs (
      patient_id, encounter_id, wristband_barcode, printed_by, printed_at
    )
    VALUES ($1, $2, $3, $4, NOW())
    RETURNING *`,
    [patientId, encounter_id || null, effectiveBarcode, req.user?.id || null]
  );

  sendSuccess(res, {
    message: 'Wristband print event recorded',
    log: logRes.rows[0]
  });
});

module.exports = {
  getAllPatients,
  getPatientById,
  registerPatient,
  updatePatient,
  getPatientHistory,
  deletePatient,
  lookupPatientByIdentifier,
  recordWristbandPrinted
};
