const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

// Self-contained initialization: create tables if they do not exist
const initDb = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS insurance_claims (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        provider_name VARCHAR(100) NOT NULL,
        policy_number VARCHAR(100) NOT NULL,
        claim_amount DECIMAL(12, 2) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processing')),
        diagnosis_code VARCHAR(20),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (err) {
    console.error('Insurance DB Init Error:', err);
  }
};
initDb();

// GET all claims (or for a specific patient)
router.get('/claims', authenticate, async (req, res) => {
  try {
    const { patient_id } = req.query;
    let query = `
      SELECT ic.*, p.first_name || ' ' || p.last_name AS patient_name
      FROM insurance_claims ic
      JOIN patients p ON ic.patient_id = p.id
    `;
    const params = [];
    
    if (req.user.role === 'patient') {
      const pat = await pool.query('SELECT id FROM patients WHERE user_id = $1', [req.user.id]);
      if (!pat.rows.length) return res.json({ success: true, data: { claims: [] } });
      query += ' WHERE ic.patient_id = $1';
      params.push(pat.rows[0].id);
    } else if (patient_id) {
      query += ' WHERE ic.patient_id = $1';
      params.push(patient_id);
    }
    
    query += ' ORDER BY ic.created_at DESC';
    const result = await pool.query(query, params);
    res.json({ success: true, data: { claims: result.rows } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST submit a claim
router.post('/claims', authenticate, authorize('super_admin', 'admin', 'hospital_manager', 'cashier', 'receptionist'), async (req, res) => {
  try {
    const { patient_id, provider_name, policy_number, claim_amount, diagnosis_code, notes } = req.body;
    if (!patient_id || !provider_name || !policy_number || !claim_amount) {
      return res.status(400).json({ success: false, message: 'Patient, provider, policy, and amount are required' });
    }

    const result = await pool.query(
      `INSERT INTO insurance_claims (patient_id, provider_name, policy_number, claim_amount, diagnosis_code, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending') RETURNING *`,
      [patient_id, provider_name, policy_number, claim_amount, diagnosis_code || null, notes || null]
    );

    res.status(201).json({ success: true, data: { claim: result.rows[0] } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT review status (approve / reject)
router.put('/claims/:id', authenticate, authorize('super_admin', 'admin', 'hospital_manager'), async (req, res) => {
  try {
    const { status, notes } = req.body;
    if (!status || !['approved', 'rejected', 'processing'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid claim status' });
    }

    const result = await pool.query(
      `UPDATE insurance_claims 
       SET status = $1, notes = COALESCE($2, notes), updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [status, notes || null, req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Claim not found' });
    }

    res.json({ success: true, data: { claim: result.rows[0] } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
