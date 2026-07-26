const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

// Self-contained initialization: create tables & seed inventory if they do not exist
const initDb = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS blood_donors (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        blood_type VARCHAR(10) NOT NULL,
        age INTEGER,
        gender VARCHAR(20),
        phone VARCHAR(20),
        last_donation_date DATE DEFAULT CURRENT_DATE,
        status VARCHAR(20) DEFAULT 'eligible',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS blood_inventory (
        id SERIAL PRIMARY KEY,
        blood_type VARCHAR(10) NOT NULL UNIQUE,
        units_available INTEGER DEFAULT 0,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Check if inventory is empty
    const checkInv = await pool.query('SELECT COUNT(*) FROM blood_inventory');
    if (parseInt(checkInv.rows[0].count, 10) === 0) {
      const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
      for (const bt of bloodTypes) {
        // Seed with a default starting stock of 10 units each
        await pool.query(
          'INSERT INTO blood_inventory (blood_type, units_available) VALUES ($1, $2)',
          [bt, 10]
        );
      }
      console.log('Seeded default blood bank inventory.');
    }
  } catch (err) {
    console.error('Blood Bank DB Init Error:', err);
  }
};
initDb();

// GET inventory details
router.get('/inventory', authenticate, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM blood_inventory ORDER BY blood_type');
    res.json({ success: true, data: { inventory: result.rows } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET donors list
router.get('/donors', authenticate, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM blood_donors ORDER BY created_at DESC');
    res.json({ success: true, data: { donors: result.rows } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST register donor (automatically increments blood units in inventory!)
router.post('/donors', authenticate, authorize('super_admin', 'admin', 'hospital_manager', 'receptionist'), async (req, res) => {
  const client = await pool.connect();
  try {
    const { name, blood_type, age, gender, phone } = req.body;
    if (!name || !blood_type) {
      return res.status(400).json({ success: false, message: 'Name and Blood Type are required' });
    }

    await client.query('BEGIN');
    
    // Add donor
    const donorRes = await client.query(
      `INSERT INTO blood_donors (name, blood_type, age, gender, phone, last_donation_date) 
       VALUES ($1, $2, $3, $4, $5, CURRENT_DATE) RETURNING *`,
      [name, blood_type, age || null, gender || null, phone || null]
    );

    // Update inventory
    await client.query(
      `INSERT INTO blood_inventory (blood_type, units_available, last_updated)
       VALUES ($1, 1, NOW())
       ON CONFLICT (blood_type) 
       DO UPDATE SET units_available = blood_inventory.units_available + 1, last_updated = NOW()`,
      [blood_type]
    );

    await client.query('COMMIT');
    res.status(201).json({ success: true, data: { donor: donorRes.rows[0] } });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    client.release();
  }
});

// POST issue blood units (reduces units from inventory)
router.post('/request', authenticate, authorize('super_admin', 'admin', 'hospital_manager', 'doctor'), async (req, res) => {
  const client = await pool.connect();
  try {
    const { blood_type, units, patient_id, purpose } = req.body;
    const reqUnits = parseInt(units, 10) || 1;

    if (!blood_type) {
      return res.status(400).json({ success: false, message: 'Blood type is required' });
    }

    await client.query('BEGIN');

    // Check inventory
    const invRes = await client.query('SELECT units_available FROM blood_inventory WHERE blood_type = $1', [blood_type]);
    if (!invRes.rows.length || invRes.rows[0].units_available < reqUnits) {
      return res.status(400).json({ success: false, message: `Insufficient units of ${blood_type} in stock.` });
    }

    // Deduct inventory
    await client.query(
      'UPDATE blood_inventory SET units_available = units_available - $1, last_updated = NOW() WHERE blood_type = $2',
      [reqUnits, blood_type]
    );

    // If patient is specified, log it
    if (patient_id) {
      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
         VALUES ($1, 'ISSUE_BLOOD', 'patients', $2, $3)`,
        [req.user.id, patient_id, JSON.stringify({ blood_type, units: reqUnits, purpose })]
      );
    }

    await client.query('COMMIT');
    res.json({ success: true, message: `Successfully issued ${reqUnits} units of ${blood_type}.` });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    client.release();
  }
});

module.exports = router;
