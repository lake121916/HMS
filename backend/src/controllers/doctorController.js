const pool = require('../config/database');
const { sendSuccess, sendError, handleAsync } = require('../utils/response');

const getAllDoctors = handleAsync(async (req, res) => {
  const { departmentId, specialization, isAvailable } = req.query;

  let query = 'SELECT * FROM doctors WHERE 1=1';
  const params = [];
  let paramCount = 0;

  if (departmentId) {
    paramCount++;
    query += ` AND department_id = $${paramCount}`;
    params.push(departmentId);
  }

  if (specialization) {
    paramCount++;
    query += ` AND specialization ILIKE $${paramCount}`;
    params.push(`%${specialization}%`);
  }

  if (isAvailable !== undefined) {
    paramCount++;
    query += ` AND is_available = $${paramCount}`;
    params.push(isAvailable === 'true');
  }

  const result = await pool.query(query, params);
  sendSuccess(res, { doctors: result.rows });
});

const getDoctorById = handleAsync(async (req, res) => {
  const { id } = req.params;

  const result = await pool.query(
    'SELECT * FROM doctors WHERE id = $1',
    [id]
  );

  if (result.rows.length === 0) {
    return sendError(res, 'Doctor not found', 404);
  }

  sendSuccess(res, result.rows[0]);
});

const createDoctor = handleAsync(async (req, res) => {
  const {
    firstName, lastName, specialization, phone, email,
    departmentId, licenseNumber, qualification, experienceYears, consultationFee
  } = req.body;

  const result = await pool.query(
    `INSERT INTO doctors (first_name, last_name, specialization, phone, email, department_id, license_number, qualification, experience_years, consultation_fee)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
    [firstName, lastName, specialization, phone, email, departmentId, licenseNumber, qualification, experienceYears, consultationFee]
  );

  sendSuccess(res, result.rows[0], 'Doctor created successfully', 201);
});

// Helper: convert camelCase keys to snake_case for SQL
const toSnakeCase = (obj) => {
  const result = {};
  for (const key in obj) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    result[snakeKey] = obj[key];
  }
  return result;
};

const updateDoctor = handleAsync(async (req, res) => {
  const { id } = req.params;
  // Convert camelCase body keys to snake_case to match DB column names
  const updates = toSnakeCase(req.body);

  if (Object.keys(updates).length === 0) {
    return sendError(res, 'No fields provided for update', 400);
  }

  const setClause = Object.keys(updates)
    .map((key, index) => `${key} = $${index + 2}`)
    .join(', ');

  const values = [id, ...Object.values(updates)];

  const result = await pool.query(
    `UPDATE doctors SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    return sendError(res, 'Doctor not found', 404);
  }

  sendSuccess(res, result.rows[0], 'Doctor updated successfully');
});

const deleteDoctor = handleAsync(async (req, res) => {
  const { id } = req.params;

  const result = await pool.query(
    'DELETE FROM doctors WHERE id = $1 RETURNING *',
    [id]
  );

  if (result.rows.length === 0) {
    return sendError(res, 'Doctor not found', 404);
  }

  sendSuccess(res, null, 'Doctor deleted successfully');
});

const getDoctorSchedule = handleAsync(async (req, res) => {
  const { id } = req.params;
  const { startDate, endDate } = req.query;

  const result = await pool.query(
    `SELECT * FROM appointments 
     WHERE doctor_id = $1 AND appointment_date BETWEEN $2 AND $3
     ORDER BY appointment_date`,
    [id, startDate, endDate]
  );

  sendSuccess(res, { schedule: result.rows });
});

module.exports = {
  getAllDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor,
  deleteDoctor,
  getDoctorSchedule
};
