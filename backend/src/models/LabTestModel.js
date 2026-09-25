const pool = require('../config/database');

class LabTestModel {
  static async findAll({ patientId, doctorId, status, role, userId }) {
    let query = `
      SELECT lt.*, p.first_name||' '||p.last_name AS patient_name,
        d.first_name||' '||d.last_name AS doctor_name,
        lr.results, lr.is_abnormal, lr.result_date
      FROM lab_tests lt
      JOIN patients p ON lt.patient_id = p.id
      LEFT JOIN doctors d ON lt.doctor_id = d.id
      LEFT JOIN lab_results lr ON lr.lab_test_id = lt.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (role === 'patient') {
      const pat = await pool.query('SELECT id FROM patients WHERE user_id=$1', [userId]);
      if (!pat.rows.length) return [];
      query += ` AND lt.patient_id=$${idx++}`;
      params.push(pat.rows[0].id);
    } else if (role === 'doctor') {
      const doc = await pool.query('SELECT id FROM doctors WHERE user_id=$1', [userId]);
      if (doc.rows.length) {
        query += ` AND lt.doctor_id=$${idx++}`;
        params.push(doc.rows[0].id);
      }
    } else if (patientId) {
      query += ` AND lt.patient_id=$${idx++}`;
      params.push(patientId);
    }

    if (status) {
      query += ` AND lt.status=$${idx++}`;
      params.push(status);
    }

    query += ' ORDER BY lt.requested_date DESC';
    const result = await pool.query(query, params);
    return result.rows;
  }

  static async findById(id) {
    const result = await pool.query('SELECT * FROM lab_tests WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  static async create({ patientId, doctorId, testName, testType, priority, notes, encounterId }) {
    const result = await pool.query(
      `INSERT INTO lab_tests (patient_id, doctor_id, test_name, test_type, priority, notes, status, encounter_id)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7) RETURNING *`,
      [patientId, doctorId || null, testName, testType || null, priority || 'normal', notes || null, encounterId || null]
    );
    return result.rows[0];
  }

  static async updateStatus(id, { status, workflowStatus, notes }) {
    const result = await pool.query(
      `UPDATE lab_tests SET status=COALESCE($1, status), workflow_status=COALESCE($2, workflow_status), notes=COALESCE($3, notes), updated_at=NOW()
       WHERE id=$4 RETURNING *`,
      [status || null, workflowStatus, notes || null, id]
    );
    return result.rows[0];
  }

  static async addResult({ labTestId, technicianId, results, referenceRange, isAbnormal, notes }) {
    const resResult = await pool.query(
      `INSERT INTO lab_results (lab_test_id, technician_id, results, reference_range, is_abnormal, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [labTestId, technicianId, results, referenceRange || null, isAbnormal || false, notes || null]
    );
    await pool.query(`UPDATE lab_tests SET status='completed', workflow_status='ready', updated_at=NOW() WHERE id=$1`, [labTestId]);
    return resResult.rows[0];
  }
}

module.exports = LabTestModel;
