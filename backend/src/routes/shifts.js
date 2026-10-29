/**
 * Doctor Shift Scheduling & Clinical Handover Routes
 * Alem Ketema Enat Hospital Management System
 */

const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const socketService = require('../services/socketService');
const patientAssignment = require('../services/patientAssignmentService');

// Standard Ethiopian Hospital Shift Time Presets (Africa/Addis_Ababa)
const SHIFT_PRESETS = {
  morning: { start: '08:00:00', end: '16:00:00', label: 'Morning Shift (08:00 - 16:00)' },
  evening: { start: '16:00:00', end: '00:00:00', label: 'Evening Shift (16:00 - 00:00)' },
  night:   { start: '00:00:00', end: '08:00:00', label: 'Night Shift (00:00 - 08:00)' },
  on_call: { start: '08:00:00', end: '08:00:00', label: 'On-Call Coverage (24h)' }
};

// ══════════════════════════════════════════════════════════════
// 1. GET ALL SHIFTS (Filtered by date, doctor, department, duty)
// ══════════════════════════════════════════════════════════════
router.get('/', authenticate, async (req, res) => {
  try {
    const { shift_date, start_date, end_date, doctor_id, department_id, status, is_on_duty } = req.query;

    let query = `
      SELECT 
        ds.*,
        d.first_name AS doctor_first_name,
        d.last_name AS doctor_last_name,
        d.specialization AS doctor_specialization,
        d.phone AS doctor_phone,
        dep.name AS department_name,
        u.first_name AS created_by_first_name,
        u.last_name AS created_by_last_name,
        (
          SELECT COUNT(pe.id)
          FROM encounter_assignments ea
          JOIN patient_encounters pe ON pe.id = ea.encounter_id
          WHERE ea.doctor_id = ds.doctor_id 
            AND pe.status IN ('waiting_for_doctor', 'in_consultation')
        )::integer AS active_patient_load
      FROM doctor_shifts ds
      JOIN doctors d ON d.id = ds.doctor_id
      LEFT JOIN departments dep ON dep.id = ds.department_id
      LEFT JOIN users u ON u.id = ds.created_by
      WHERE 1=1
    `;

    const params = [];
    let idx = 1;

    if (shift_date) {
      query += ` AND ds.shift_date = $${idx++}`;
      params.push(shift_date);
    }
    if (start_date) {
      query += ` AND ds.shift_date >= $${idx++}`;
      params.push(start_date);
    }
    if (end_date) {
      query += ` AND ds.shift_date <= $${idx++}`;
      params.push(end_date);
    }
    if (doctor_id) {
      query += ` AND ds.doctor_id = $${idx++}`;
      params.push(doctor_id);
    }
    if (department_id) {
      query += ` AND ds.department_id = $${idx++}`;
      params.push(department_id);
    }
    if (status) {
      query += ` AND ds.status = $${idx++}`;
      params.push(status);
    }
    if (is_on_duty !== undefined) {
      query += ` AND ds.is_on_duty = $${idx++}`;
      params.push(is_on_duty === 'true');
    }

    query += ` ORDER BY ds.shift_date DESC, ds.start_time ASC`;

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching doctor shifts:', error);
    res.status(500).json({ success: false, message: 'Server error fetching shifts' });
  }
});

// ══════════════════════════════════════════════════════════════
// 2. GET CURRENTLY ON-DUTY DOCTORS WITH WORKLOAD
// ══════════════════════════════════════════════════════════════
router.get('/on-duty', authenticate, async (req, res) => {
  try {
    const { department_id } = req.query;
    const onDutyList = await patientAssignment.getOnDutyDoctors(department_id ? parseInt(department_id) : null);
    res.json({ success: true, data: onDutyList });
  } catch (error) {
    console.error('Error fetching on-duty doctors:', error);
    res.status(500).json({ success: false, message: 'Server error fetching on-duty doctors' });
  }
});

// ══════════════════════════════════════════════════════════════
// 3. POST CREATE / SCHEDULE DOCTOR SHIFT
// ══════════════════════════════════════════════════════════════
router.post('/', authenticate, authorize('super_admin', 'admin', 'hospital_manager', 'doctor'), async (req, res) => {
  try {
    const {
      doctor_id,
      department_id,
      shift_date,
      shift_type = 'morning',
      start_time,
      end_time,
      max_active_patients = 20,
      notes,
      is_on_duty = false,
      status = 'scheduled'
    } = req.body;

    if (!doctor_id || !shift_date) {
      return res.status(400).json({ success: false, message: 'doctor_id and shift_date are required' });
    }

    // Determine shift times (defaults from presets if not explicitly provided)
    const preset = SHIFT_PRESETS[shift_type];
    const finalStartTime = start_time || (preset ? preset.start : '08:00:00');
    const finalEndTime   = end_time   || (preset ? preset.end   : '16:00:00');

    // Verify doctor exists and lookup department if missing
    const docCheck = await pool.query('SELECT id, first_name, last_name, department_id FROM doctors WHERE id = $1', [doctor_id]);
    if (!docCheck.rows.length) {
      return res.status(404).json({ success: false, message: 'Doctor record not found' });
    }
    const finalDeptId = department_id || docCheck.rows[0].department_id;

    // Conflict Check: Prevent overlapping shifts on the same date for the same doctor
    const conflictQuery = `
      SELECT id, shift_type, start_time, end_time, status
      FROM doctor_shifts
      WHERE doctor_id = $1
        AND shift_date = $2
        AND status NOT IN ('cancelled', 'absence')
        AND (
          (start_time < $4::time AND end_time > $3::time)
          OR (start_time = $3::time AND end_time = $4::time)
        )
    `;
    const conflictRes = await pool.query(conflictQuery, [doctor_id, shift_date, finalStartTime, finalEndTime]);

    if (conflictRes.rows.length > 0) {
      const existing = conflictRes.rows[0];
      return res.status(409).json({
        success: false,
        message: `Shift conflict: Dr. ${docCheck.rows[0].first_name} ${docCheck.rows[0].last_name} already has a ${existing.shift_type} shift scheduled on ${shift_date} (${existing.start_time} - ${existing.end_time}).`
      });
    }

    // Insert shift
    const insertRes = await pool.query(`
      INSERT INTO doctor_shifts (
        doctor_id, department_id, shift_date, shift_type,
        start_time, end_time, max_active_patients, notes,
        is_on_duty, status, created_by, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING *
    `, [
      doctor_id, finalDeptId, shift_date, shift_type,
      finalStartTime, finalEndTime, max_active_patients, notes,
      is_on_duty, status, req.user.id
    ]);

    const createdShift = insertRes.rows[0];

    // If marked on_duty, also update doctors.is_available
    if (is_on_duty) {
      await pool.query('UPDATE doctors SET is_available = true WHERE id = $1', [doctor_id]);
    }

    socketService.broadcast('shift:created', {
      shift: createdShift,
      doctor_name: `Dr. ${docCheck.rows[0].first_name} ${docCheck.rows[0].last_name}`
    });

    res.status(201).json({
      success: true,
      message: 'Doctor shift scheduled successfully',
      data: createdShift
    });
  } catch (error) {
    console.error('Error creating doctor shift:', error);
    res.status(500).json({ success: false, message: 'Server error scheduling shift' });
  }
});

// ══════════════════════════════════════════════════════════════
// 4. PUT UPDATE DOCTOR SHIFT
// ══════════════════════════════════════════════════════════════
router.put('/:id', authenticate, authorize('super_admin', 'admin', 'hospital_manager', 'doctor'), async (req, res) => {
  try {
    const { id } = req.params;
    const { shift_type, start_time, end_time, max_active_patients, notes, status, is_on_duty } = req.body;

    const existing = await pool.query('SELECT * FROM doctor_shifts WHERE id = $1', [id]);
    if (!existing.rows.length) {
      return res.status(404).json({ success: false, message: 'Shift not found' });
    }

    const current = existing.rows[0];
    const newStatus = status !== undefined ? status : current.status;
    const newDuty = is_on_duty !== undefined ? is_on_duty : current.is_on_duty;
    const newStart = start_time !== undefined ? start_time : current.start_time;
    const newEnd = end_time !== undefined ? end_time : current.end_time;
    const newMax = max_active_patients !== undefined ? max_active_patients : current.max_active_patients;
    const newNotes = notes !== undefined ? notes : current.notes;
    const newType = shift_type !== undefined ? shift_type : current.shift_type;

    const updateRes = await pool.query(`
      UPDATE doctor_shifts
      SET shift_type = $1, start_time = $2, end_time = $3,
          max_active_patients = $4, notes = $5, status = $6,
          is_on_duty = $7, updated_at = NOW()
      WHERE id = $8
      RETURNING *
    `, [newType, newStart, newEnd, newMax, newNotes, newStatus, newDuty, id]);

    // Keep doctors.is_available in sync
    await pool.query('UPDATE doctors SET is_available = $1 WHERE id = $2', [newDuty, current.doctor_id]);

    socketService.broadcast('shift:updated', { shift: updateRes.rows[0] });

    res.json({
      success: true,
      message: 'Shift updated successfully',
      data: updateRes.rows[0]
    });
  } catch (error) {
    console.error('Error updating shift:', error);
    res.status(500).json({ success: false, message: 'Server error updating shift' });
  }
});

// ══════════════════════════════════════════════════════════════
// 5. PUT TOGGLE ON-DUTY STATUS
// ══════════════════════════════════════════════════════════════
router.put('/:id/toggle-duty', authenticate, authorize('super_admin', 'admin', 'hospital_manager', 'doctor'), async (req, res) => {
  try {
    const { id } = req.params;
    const shiftRes = await pool.query('SELECT * FROM doctor_shifts WHERE id = $1', [id]);
    if (!shiftRes.rows.length) {
      return res.status(404).json({ success: false, message: 'Shift not found' });
    }

    const shift = shiftRes.rows[0];
    const newDutyStatus = !shift.is_on_duty;

    const updateRes = await pool.query(`
      UPDATE doctor_shifts
      SET is_on_duty = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [newDutyStatus, id]);

    await pool.query('UPDATE doctors SET is_available = $1 WHERE id = $2', [newDutyStatus, shift.doctor_id]);

    socketService.broadcast('shift:duty_changed', {
      shift_id: id,
      doctor_id: shift.doctor_id,
      is_on_duty: newDutyStatus
    });

    res.json({
      success: true,
      message: `Doctor status updated to ${newDutyStatus ? 'ON DUTY' : 'OFF DUTY'}`,
      data: updateRes.rows[0]
    });
  } catch (error) {
    console.error('Error toggling shift duty:', error);
    res.status(500).json({ success: false, message: 'Server error updating duty status' });
  }
});

// ══════════════════════════════════════════════════════════════
// 6. DELETE CANCEL SHIFT
// ══════════════════════════════════════════════════════════════
router.delete('/:id', authenticate, authorize('super_admin', 'admin', 'hospital_manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const delRes = await pool.query('UPDATE doctor_shifts SET status = $1, is_on_duty = false, updated_at = NOW() WHERE id = $2 RETURNING *', ['cancelled', id]);
    if (!delRes.rows.length) {
      return res.status(404).json({ success: false, message: 'Shift not found' });
    }
    res.json({ success: true, message: 'Shift cancelled successfully', data: delRes.rows[0] });
  } catch (error) {
    console.error('Error cancelling shift:', error);
    res.status(500).json({ success: false, message: 'Server error cancelling shift' });
  }
});

// ══════════════════════════════════════════════════════════════
// 7. POST CLINICAL SHIFT HANDOVER
// ══════════════════════════════════════════════════════════════
router.post('/handover', authenticate, authorize('doctor', 'admin', 'super_admin'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      to_doctor_id,
      patient_id,
      encounter_id,
      shift_id,
      pending_tasks,
      clinical_notes
    } = req.body;

    if (!to_doctor_id || !patient_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'to_doctor_id and patient_id are required for clinical handover' });
    }

    // Determine outgoing doctor id from logged-in user or doctor profile
    let fromDoctorId = req.body.from_doctor_id;
    if (!fromDoctorId) {
      const docRes = await client.query('SELECT id FROM doctors WHERE user_id = $1', [req.user.id]);
      if (docRes.rows.length > 0) {
        fromDoctorId = docRes.rows[0].id;
      } else {
        // Fallback for admin or general user: use first available doctor or to_doctor
        fromDoctorId = to_doctor_id;
      }
    }

    // Record Handover
    const insertRes = await client.query(`
      INSERT INTO clinical_handovers (
        shift_id, from_doctor_id, to_doctor_id, patient_id, encounter_id,
        pending_tasks, clinical_notes, is_acknowledged, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, false, NOW())
      RETURNING *
    `, [
      shift_id || null,
      fromDoctorId,
      to_doctor_id,
      patient_id,
      encounter_id || null,
      pending_tasks || '',
      clinical_notes || ''
    ]);

    const handover = insertRes.rows[0];

    // If encounter is active, transfer assignment to incoming doctor
    if (encounter_id) {
      await client.query(`
        UPDATE encounter_assignments
        SET doctor_id = $1, notes = COALESCE(notes, '') || ' [Handed over from previous shift]', assigned_at = NOW()
        WHERE encounter_id = $2
      `, [to_doctor_id, encounter_id]);

      await client.query(`
        UPDATE patient_encounters
        SET updated_at = NOW()
        WHERE id = $1
      `, [encounter_id]);
    }

    await client.query('COMMIT');

    socketService.broadcast('handover:created', {
      handover_id: handover.id,
      to_doctor_id,
      from_doctor_id: fromDoctorId,
      patient_id,
      encounter_id
    });

    res.status(201).json({
      success: true,
      message: 'Clinical shift handover recorded and patient transferred successfully',
      data: handover
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating handover:', error);
    res.status(500).json({ success: false, message: 'Server error processing shift handover' });
  } finally {
    client.release();
  }
});

// ══════════════════════════════════════════════════════════════
// 8. GET CLINICAL HANDOVERS (Pending & History)
// ══════════════════════════════════════════════════════════════
router.get('/handovers', authenticate, async (req, res) => {
  try {
    const { doctor_id, is_acknowledged } = req.query;

    let myDoctorId = doctor_id;
    if (!myDoctorId && req.user.role === 'doctor') {
      const docRes = await pool.query('SELECT id FROM doctors WHERE user_id = $1', [req.user.id]);
      if (docRes.rows.length > 0) myDoctorId = docRes.rows[0].id;
    }

    let query = `
      SELECT 
        ch.*,
        p.first_name AS patient_first_name,
        p.last_name AS patient_last_name,
        'PAT-' || LPAD(p.id::text, 4, '0') AS patient_mrn,
        p.gender AS patient_gender,
        fdoc.first_name AS from_doctor_first_name,
        fdoc.last_name AS from_doctor_last_name,
        tdoc.first_name AS to_doctor_first_name,
        tdoc.last_name AS to_doctor_last_name,
        pe.encounter_number,
        pe.status AS encounter_status
      FROM clinical_handovers ch
      JOIN patients p ON p.id = ch.patient_id
      JOIN doctors fdoc ON fdoc.id = ch.from_doctor_id
      JOIN doctors tdoc ON tdoc.id = ch.to_doctor_id
      LEFT JOIN patient_encounters pe ON pe.id = ch.encounter_id
      WHERE 1=1
    `;

    const params = [];
    let idx = 1;

    if (myDoctorId) {
      query += ` AND (ch.to_doctor_id = $${idx} OR ch.from_doctor_id = $${idx})`;
      params.push(myDoctorId);
      idx++;
    }

    if (is_acknowledged !== undefined) {
      query += ` AND ch.is_acknowledged = $${idx++}`;
      params.push(is_acknowledged === 'true');
    }

    query += ` ORDER BY ch.created_at DESC LIMIT 50`;

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching handovers:', error);
    res.status(500).json({ success: false, message: 'Server error fetching handovers' });
  }
});

// ══════════════════════════════════════════════════════════════
// 9. PUT ACKNOWLEDGE CLINICAL HANDOVER
// ══════════════════════════════════════════════════════════════
router.put('/handovers/:id/acknowledge', authenticate, authorize('doctor', 'admin', 'super_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      UPDATE clinical_handovers
      SET is_acknowledged = true, acknowledged_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id]);

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Handover record not found' });
    }

    socketService.broadcast('handover:acknowledged', { handover_id: id });

    res.json({
      success: true,
      message: 'Clinical handover acknowledged and verified by incoming physician',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error acknowledging handover:', error);
    res.status(500).json({ success: false, message: 'Server error acknowledging handover' });
  }
});

// ══════════════════════════════════════════════════════════════
// 10. POST INTELLIGENT PATIENT ASSIGNMENT
// ══════════════════════════════════════════════════════════════
router.post('/assign-patient', authenticate, authorize('nurse', 'receptionist', 'doctor', 'admin', 'super_admin', 'hospital_manager'), async (req, res) => {
  try {
    const { encounter_id, patient_id, department_id, priority, doctor_id, notes } = req.body;

    if (!encounter_id || !patient_id) {
      return res.status(400).json({ success: false, message: 'encounter_id and patient_id are required' });
    }

    const assignment = await patientAssignment.assignPatientToDoctor({
      encounterId: encounter_id,
      patientId: patient_id,
      departmentId: department_id,
      priority: priority || 'normal',
      requestedDoctorId: doctor_id,
      assignedBy: req.user.id,
      notes
    });

    res.json({
      success: assignment.success,
      message: assignment.message,
      data: assignment
    });
  } catch (error) {
    console.error('Error in intelligent patient assignment:', error);
    res.status(500).json({ success: false, message: 'Server error during patient assignment' });
  }
});

module.exports = router;
