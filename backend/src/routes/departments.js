const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { handleAsync } = require('../utils/response');

// GET /api/departments - Publicly available department list with head doctor and doctor counts
router.get('/', handleAsync(async (req, res) => {
  const result = await pool.query(
    `SELECT dep.*, 
      TRIM(CONCAT(d.first_name, ' ', d.last_name)) AS head_doctor_name,
      COUNT(DISTINCT doc.id) AS doctor_count
     FROM departments dep
     LEFT JOIN doctors d ON d.id = dep.head_doctor_id
     LEFT JOIN doctors doc ON doc.department_id = dep.id
     GROUP BY dep.id, d.first_name, d.last_name
     ORDER BY dep.name ASC`
  );
  res.json({ success: true, data: { departments: result.rows } });
}));

// GET /api/departments/:id - Public department details
router.get('/:id', handleAsync(async (req, res) => {
  const result = await pool.query(
    `SELECT dep.*, 
      TRIM(CONCAT(d.first_name, ' ', d.last_name)) AS head_doctor_name,
      COUNT(DISTINCT doc.id) AS doctor_count
     FROM departments dep
     LEFT JOIN doctors d ON d.id = dep.head_doctor_id
     LEFT JOIN doctors doc ON doc.department_id = dep.id
     WHERE dep.id = $1
     GROUP BY dep.id, d.first_name, d.last_name`,
    [req.params.id]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ success: false, message: 'Department not found' });
  }
  res.json({ success: true, data: { department: result.rows[0] } });
}));

module.exports = router;
