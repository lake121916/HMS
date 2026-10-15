/**
 * Outpatient Department (OPD) Waiting Queue & Public TV Calling System
 * Alem Ketema Enat Hospital Management System
 */

const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const socketService = require('../services/socketService');
const { v4: uuidv4 } = require('uuid');

// ── 1. GET Public TV Display Queue (NO SENSITIVE DATA - READ ONLY) ───────────
// Accessible without patient authentication for waiting room smart TVs
router.get('/display', async (req, res) => {
  try {
    const { department_id } = req.query;
    let deptFilter = '';
    const params = [];
    if (department_id) {
      deptFilter = 'AND q.department_id = $1';
      params.push(department_id);
    }

    const result = await pool.query(`
      SELECT q.id, q.queue_token, q.token_number, q.status, q.priority,
             COALESCE(q.consultation_room, 'Room 1') AS consultation_room,
             d.name AS department_name,
             doc.first_name || ' ' || doc.last_name AS doctor_name,
             q.called_at, q.consultation_started_at
      FROM opd_queues q
      JOIN departments d ON d.id = q.department_id
      LEFT JOIN doctors doc ON doc.id = q.assigned_doctor_id
      WHERE q.queue_date = CURRENT_DATE
        AND q.status IN ('waiting', 'next', 'called', 'in_consultation')
        ${deptFilter}
      ORDER BY
        CASE q.priority WHEN 'emergency' THEN 1 WHEN 'urgent' THEN 2 ELSE 3 END,
        q.token_number ASC
    `, params);

    const rows = result.rows;

    const currentlyCalled = rows.filter(r => r.status === 'called');
    const inConsultation = rows.filter(r => r.status === 'in_consultation');
    const nextPatients = rows.filter(r => r.status === 'next');
    const waitingList = rows.filter(r => r.status === 'waiting');

    res.json({
      success: true,
      data: {
        serverTime: new Date().toISOString(),
        hospitalName: 'Alem Ketema Enat Hospital',
        department: department_id ? rows[0]?.department_name || 'Outpatient Department' : 'All Departments',
        currentlyCalled,
        inConsultation,
        nextPatients,
        waitingList
      }
    });
  } catch (error) {
    console.error('Error fetching OPD display queue:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── 2. GET Full Queue (Authenticated Staff) ──────────────────────────────────
router.get('/', authenticate, async (req, res) => {
  try {
    const { department_id, doctor_id, status } = req.query;
    let query = `
      SELECT q.*,
             p.first_name || ' ' || p.last_name AS patient_name,
             p.gender, p.date_of_birth, p.phone,
             d.name AS department_name,
             doc.first_name || ' ' || doc.last_name AS doctor_name
      FROM opd_queues q
      JOIN patients p ON p.id = q.patient_id
      JOIN departments d ON d.id = q.department_id
      LEFT JOIN doctors doc ON doc.id = q.assigned_doctor_id
      WHERE q.queue_date = CURRENT_DATE
    `;
    const params = [];
    let idx = 1;

    if (department_id) {
      query += ` AND q.department_id = $${idx++}`;
      params.push(department_id);
    }
    if (doctor_id) {
      query += ` AND q.assigned_doctor_id = $${idx++}`;
      params.push(doctor_id);
    }
    if (status) {
      query += ` AND q.status = $${idx++}`;
      params.push(status);
    } else {
      query += ` AND q.status NOT IN ('completed', 'cancelled')`;
    }

    query += ` ORDER BY
      CASE q.priority WHEN 'emergency' THEN 1 WHEN 'urgent' THEN 2 ELSE 3 END,
      q.token_number ASC`;

    const result = await pool.query(query, params);
    res.json({ success: true, data: { queue: result.rows } });
  } catch (error) {
    console.error('Error fetching OPD queue:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── 3. POST Generate Queue Token (Receptionist Intake) ───────────────────────
router.post('/', authenticate, authorize('receptionist', 'nurse', 'doctor', 'admin', 'super_admin'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { patient_id, encounter_id, department_id, doctor_id, consultation_room, priority } = req.body;

    if (!patient_id || !department_id) {
      return res.status(400).json({ success: false, message: 'patient_id and department_id are required' });
    }

    // Check for existing active token today for this patient in this department
    const existing = await client.query(`
      SELECT * FROM opd_queues
      WHERE patient_id = $1 AND department_id = $2 AND queue_date = CURRENT_DATE
        AND status IN ('waiting', 'next', 'called', 'in_consultation')
    `, [patient_id, department_id]);

    if (existing.rows.length) {
      await client.query('COMMIT');
      return res.json({
        success: true,
        alreadyActive: true,
        message: 'Patient already has an active queue token for today.',
        data: { queue: existing.rows[0] }
      });
    }

    // Determine sequential daily token number with lock
    const seqRes = await client.query(`
      SELECT COALESCE(MAX(token_number), 0) + 1 AS next_token
      FROM opd_queues
      WHERE department_id = $1 AND queue_date = CURRENT_DATE
    `, [department_id]);

    const tokenNumber = parseInt(seqRes.rows[0].next_token, 10);
    const tokenFormatted = `OPD-${String(tokenNumber).padStart(3, '0')}`;

    // Insert new queue record
    const insertRes = await client.query(`
      INSERT INTO opd_queues
        (queue_token, token_number, patient_id, encounter_id, department_id,
         assigned_doctor_id, consultation_room, priority, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'waiting')
      RETURNING *
    `, [
      tokenFormatted,
      tokenNumber,
      patient_id,
      encounter_id || null,
      department_id,
      doctor_id || null,
      consultation_room || 'Room 1',
      priority || 'normal'
    ]);

    const created = insertRes.rows[0];

    // Fetch department and patient names for ticket response
    const infoRes = await client.query(`
      SELECT d.name AS department_name, p.first_name || ' ' || p.last_name AS patient_name,
             doc.first_name || ' ' || doc.last_name AS doctor_name
      FROM departments d
      CROSS JOIN patients p
      LEFT JOIN doctors doc ON doc.id = $3
      WHERE d.id = $1 AND p.id = $2
    `, [department_id, patient_id, doctor_id || null]);

    await client.query('COMMIT');

    const ticketData = {
      ...created,
      department_name: infoRes.rows[0]?.department_name || 'General OPD',
      patient_name: infoRes.rows[0]?.patient_name,
      doctor_name: infoRes.rows[0]?.doctor_name || 'Assigned Duty Doctor',
      hospitalName: 'Alem Ketema Enat Hospital'
    };

    // Broadcast queue update to waiting room displays via socket
    socketService.broadcast('opd-queue-update', {
      type: 'token_issued',
      token: tokenFormatted,
      department_id
    });

    res.status(201).json({
      success: true,
      message: `Token #${tokenNumber} issued successfully.`,
      data: { queue: ticketData }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error generating OPD queue token:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  } finally {
    client.release();
  }
});

// ── 4. POST Call Next Patient (Doctor / Nurse) ────────────────────────────────
router.post('/:id/call', authenticate, authorize('doctor', 'nurse', 'admin', 'super_admin'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { consultation_room } = req.body;

    const queueRes = await client.query(`
      SELECT q.*, d.name AS department_name,
             doc.first_name || ' ' || doc.last_name AS doctor_name
      FROM opd_queues q
      JOIN departments d ON d.id = q.department_id
      LEFT JOIN doctors doc ON doc.id = q.assigned_doctor_id
      WHERE q.id = $1 FOR UPDATE
    `, [req.params.id]);

    if (!queueRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Queue item not found' });
    }

    const queue = queueRes.rows[0];

    // Determine room & doctor
    let room = consultation_room || queue.consultation_room || 'Room 1';
    let doctorName = queue.doctor_name || 'Consulting Physician';

    if (req.user.role === 'doctor') {
      const docQuery = await client.query('SELECT first_name, last_name FROM doctors WHERE user_id = $1', [req.user.id]);
      if (docQuery.rows.length) {
        doctorName = `Dr. ${docQuery.rows[0].first_name} ${docQuery.rows[0].last_name}`;
      }
    }

    // Update status to 'called'
    const updatedRes = await client.query(`
      UPDATE opd_queues
      SET status = 'called',
          consultation_room = $1,
          called_at = NOW(),
          updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [room, req.params.id]);

    await client.query('COMMIT');

    const callEvent = {
      eventId: uuidv4(),
      queueId: queue.id,
      queueToken: queue.queue_token,
      tokenNumber: queue.token_number,
      departmentName: queue.department_name,
      doctorName,
      consultationRoom: room,
      calledAt: new Date().toISOString()
    };

    // 1. Emit audio/visual announcement event to public TV displays
    socketService.broadcast('opd-patient-called', callEvent);

    // 2. Broadcast queue state update
    socketService.broadcast('opd-queue-update', {
      type: 'patient_called',
      queueId: queue.id,
      token: queue.queue_token
    });

    res.json({
      success: true,
      message: `Called ${queue.queue_token} to ${room}`,
      data: { queue: updatedRes.rows[0], callEvent }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error calling OPD patient:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  } finally {
    client.release();
  }
});

// ── 5. POST Start Consultation ────────────────────────────────────────────────
router.post('/:id/start', authenticate, authorize('doctor', 'admin', 'super_admin'), async (req, res) => {
  try {
    const result = await pool.query(`
      UPDATE opd_queues
      SET status = 'in_consultation',
          consultation_started_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [req.params.id]);

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Queue item not found' });
    }

    socketService.broadcast('opd-queue-update', {
      type: 'consultation_started',
      queueId: req.params.id
    });

    res.json({ success: true, data: { queue: result.rows[0] } });
  } catch (error) {
    console.error('Error starting consultation:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── 6. POST Complete Consultation in Queue ────────────────────────────────────
router.post('/:id/complete', authenticate, authorize('doctor', 'admin', 'super_admin'), async (req, res) => {
  try {
    const result = await pool.query(`
      UPDATE opd_queues
      SET status = 'completed',
          completed_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [req.params.id]);

    socketService.broadcast('opd-queue-update', {
      type: 'consultation_completed',
      queueId: req.params.id
    });

    res.json({ success: true, message: 'Visit completed', data: { queue: result.rows[0] } });
  } catch (error) {
    console.error('Error completing queue item:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── 7. POST Mark No-Show ─────────────────────────────────────────────────────
router.post('/:id/no-show', authenticate, authorize('doctor', 'nurse', 'admin', 'super_admin'), async (req, res) => {
  try {
    const result = await pool.query(`
      UPDATE opd_queues
      SET status = 'no_show',
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [req.params.id]);

    socketService.broadcast('opd-queue-update', {
      type: 'patient_no_show',
      queueId: req.params.id
    });

    res.json({ success: true, message: 'Marked as no-show', data: { queue: result.rows[0] } });
  } catch (error) {
    console.error('Error marking no-show:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── 8. POST Reprint Ticket (Audit Tracked) ───────────────────────────────────
router.post('/:id/reprint', authenticate, authorize('receptionist', 'nurse', 'admin', 'super_admin'), async (req, res) => {
  try {
    const result = await pool.query(`
      UPDATE opd_queues
      SET ticket_printed_count = ticket_printed_count + 1,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [req.params.id]);

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Queue item not found' });
    }

    const q = result.rows[0];
    const infoRes = await pool.query(`
      SELECT d.name AS department_name, p.first_name || ' ' || p.last_name AS patient_name,
             doc.first_name || ' ' || doc.last_name AS doctor_name
      FROM departments d
      CROSS JOIN patients p
      LEFT JOIN doctors doc ON doc.id = $3
      WHERE d.id = $1 AND p.id = $2
    `, [q.department_id, q.patient_id, q.assigned_doctor_id]);

    res.json({
      success: true,
      message: `Reprinted ticket #${q.token_number} (Reprint count: ${q.ticket_printed_count})`,
      data: {
        queue: {
          ...q,
          department_name: infoRes.rows[0]?.department_name,
          patient_name: infoRes.rows[0]?.patient_name,
          doctor_name: infoRes.rows[0]?.doctor_name,
          hospitalName: 'Alem Ketema Enat Hospital'
        }
      }
    });
  } catch (error) {
    console.error('Error reprinting ticket:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
