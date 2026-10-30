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

// ══════════════════════════════════════════════════════════════
// 0. GET ALL ELIGIBLE STAFF FOR SHIFTS (Doctors, Nurses, Lab, Pharmacy)
// ══════════════════════════════════════════════════════════════
router.get('/staff', authenticate, async (req, res) => {
  try {
    const { role, department_id } = req.query;
    let query = `
      SELECT 
        u.id AS user_id,
        u.email,
        u.role AS staff_role,
        COALESCE(
          (SELECT TRIM(d.first_name || ' ' || d.last_name) FROM doctors d WHERE d.user_id = u.id LIMIT 1),
          (SELECT TRIM(n.first_name || ' ' || n.last_name) FROM nurses n WHERE n.user_id = u.id LIMIT 1),
          TRIM(u.first_name || ' ' || u.last_name),
          split_part(u.email, '@', 1)
        ) AS staff_name,
        (SELECT d.id FROM doctors d WHERE d.user_id = u.id LIMIT 1) AS doctor_id,
        COALESCE(
          (SELECT d.department_id FROM doctors d WHERE d.user_id = u.id LIMIT 1),
          (SELECT n.department_id FROM nurses n WHERE n.user_id = u.id LIMIT 1),
          NULL
        ) AS department_id,
        COALESCE(
          (SELECT dep.name FROM doctors d JOIN departments dep ON dep.id = d.department_id WHERE d.user_id = u.id LIMIT 1),
          (SELECT dep.name FROM nurses n JOIN departments dep ON dep.id = n.department_id WHERE n.user_id = u.id LIMIT 1),
          'General Hospital'
        ) AS department_name,
        COALESCE(
          (SELECT d.specialization FROM doctors d WHERE d.user_id = u.id LIMIT 1),
          (SELECT n.qualification FROM nurses n WHERE n.user_id = u.id LIMIT 1),
          INITCAP(REPLACE(u.role, '_', ' '))
        ) AS designation
      FROM users u
      WHERE u.role IN ('doctor', 'nurse', 'lab_technician', 'pharmacist')
        AND u.is_active = true
    `;
    const params = [];
    let idx = 1;
    if (role) {
      query += ` AND u.role = $${idx++}`;
      params.push(role);
    }

    if (department_id) {
      query += ` AND (
        (SELECT d.department_id FROM doctors d WHERE d.user_id = u.id LIMIT 1) = $${idx}
        OR (SELECT n.department_id FROM nurses n WHERE n.user_id = u.id LIMIT 1) = $${idx}
      )`;
      idx++;
      params.push(parseInt(department_id));
    }
    query += ' ORDER BY u.role, staff_name';
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching staff list for shifts:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch staff list' });
  }
});

// 1. GET ALL SHIFTS (Filtered by date, doctor, department, duty)
// ══════════════════════════════════════════════════════════════
router.get('/', authenticate, async (req, res) => {
  try {
    const { shift_date, start_date, end_date, doctor_id, user_id, department_id, status, is_on_duty, role, staff_role } = req.query;
    const requestedRole = role || staff_role;

    let query = `
      SELECT 
        ds.*,
        COALESCE(ds.staff_role, 'doctor') AS staff_role,
        COALESCE(
          ds.staff_name,
          CASE WHEN d.id IS NOT NULL THEN 'Dr. ' || d.first_name || ' ' || d.last_name ELSE NULL END,
          TRIM(su.first_name || ' ' || su.last_name),
          TRIM(n.first_name || ' ' || n.last_name),
          split_part(su.email, '@', 1)
        ) AS staff_name,
        d.first_name AS doctor_first_name,
        d.last_name AS doctor_last_name,
        d.specialization AS doctor_specialization,
        COALESCE(d.phone, su.phone, n.phone) AS doctor_phone,
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
      LEFT JOIN doctors d ON d.id = ds.doctor_id
      LEFT JOIN users su ON su.id = ds.user_id
      LEFT JOIN nurses n ON (n.user_id = ds.user_id OR (su.id IS NOT NULL AND n.user_id = su.id))
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
router.post('/', authenticate, authorize('super_admin', 'admin', 'hospital_manager'), async (req, res) => {
  try {
    const {
      doctor_id,
      user_id,
      staff_role: inputStaffRole,
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

    if ((!doctor_id && !user_id) || !shift_date) {
      return res.status(400).json({ success: false, message: 'Staff member (doctor_id or user_id) and shift_date are required' });
    }



    const preset = SHIFT_PRESETS[shift_type];
    const finalStartTime = start_time || (preset ? preset.start : '08:00:00');
    const finalEndTime   = end_time   || (preset ? preset.end   : '16:00:00');

    let resolvedDoctorId = doctor_id ? parseInt(doctor_id) : null;
    let resolvedUserId = user_id ? parseInt(user_id) : null;
    let resolvedStaffRole = inputStaffRole || 'doctor';
    let resolvedStaffName = '';
    let finalDeptId = department_id ? parseInt(department_id) : null;

    if (resolvedDoctorId) {
      const docCheck = await pool.query('SELECT id, user_id, first_name, last_name, department_id FROM doctors WHERE id = $1', [resolvedDoctorId]);
      if (!docCheck.rows.length) {
        return res.status(404).json({ success: false, message: 'Doctor record not found' });
      }
      const doc = docCheck.rows[0];
      resolvedUserId = resolvedUserId || doc.user_id;
      resolvedStaffRole = 'doctor';
      resolvedStaffName = `Dr. ${doc.first_name} ${doc.last_name}`;
      finalDeptId = finalDeptId || doc.department_id;
    } else if (resolvedUserId) {
      const userCheck = await pool.query(`
        SELECT u.id, u.first_name, u.last_name, u.role, u.email,
               (SELECT d.id FROM doctors d WHERE d.user_id = u.id LIMIT 1) AS doc_id,
               COALESCE((SELECT d.department_id FROM doctors d WHERE d.user_id = u.id LIMIT 1),
                        (SELECT n.department_id FROM nurses n WHERE n.user_id = u.id LIMIT 1)) AS dept_id
        FROM users u WHERE u.id = $1
      `, [resolvedUserId]);
      if (!userCheck.rows.length) {
        return res.status(404).json({ success: false, message: 'Staff user not found' });
      }
      const usr = userCheck.rows[0];
      resolvedStaffRole = inputStaffRole || usr.role || 'staff';
      const rawName = `${usr.first_name || ''} ${usr.last_name || ''}`.trim() || usr.email.split('@')[0];
      resolvedStaffName = usr.role === 'doctor' ? `Dr. ${rawName}` : rawName;
      if (usr.role === 'doctor') {
        resolvedDoctorId = usr.doc_id || null;
      }
      finalDeptId = finalDeptId || usr.dept_id;
    }

    // Conflict Check: Prevent overlapping shifts on the same date for the same staff
    const conflictQuery = `
      SELECT id, shift_type, start_time, end_time, status
      FROM doctor_shifts
      WHERE (
        ($1::integer IS NOT NULL AND doctor_id = $1)
        OR ($2::integer IS NOT NULL AND user_id = $2)
      )
        AND shift_date = $3
        AND status NOT IN ('cancelled', 'absence')
        AND (
          (start_time < $5::time AND end_time > $4::time)
          OR (start_time = $4::time AND end_time = $5::time)
        )
    `;
    const conflictRes = await pool.query(conflictQuery, [resolvedDoctorId, resolvedUserId, shift_date, finalStartTime, finalEndTime]);

    if (conflictRes.rows.length > 0) {
      const existing = conflictRes.rows[0];
      return res.status(409).json({
        success: false,
        message: `Shift conflict: ${resolvedStaffName} already has a ${existing.shift_type} shift scheduled on ${shift_date} (${existing.start_time} - ${existing.end_time}).`
      });
    }

    // Insert shift
    const insertRes = await pool.query(`
      INSERT INTO doctor_shifts (
        doctor_id, user_id, staff_role, staff_name, department_id, shift_date, shift_type,
        start_time, end_time, max_active_patients, notes,
        is_on_duty, status, created_by, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
      RETURNING *
    `, [
      resolvedDoctorId, resolvedUserId, resolvedStaffRole, resolvedStaffName, finalDeptId, shift_date, shift_type,
      finalStartTime, finalEndTime, max_active_patients, notes,
      is_on_duty, status, (await pool.query('SELECT id FROM users WHERE id = $1', [req.user.id])).rows[0]?.id || null
    ]);

    const createdShift = insertRes.rows[0];

    if (is_on_duty) {
      if (resolvedDoctorId) {
        await pool.query('UPDATE doctors SET is_available = true WHERE id = $1', [resolvedDoctorId]);
      }
      if (resolvedUserId) {
        await pool.query('UPDATE nurses SET is_available = true WHERE user_id = $1', [resolvedUserId]);
      }
    }

    socketService.broadcast('shift:created', {
      shift: createdShift,
      staff_name: resolvedStaffName,
      staff_role: resolvedStaffRole
    });

    res.status(201).json({
      success: true,
      message: `${resolvedStaffRole ? resolvedStaffRole.toUpperCase() : 'Staff'} shift scheduled successfully`,
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
router.put('/:id', authenticate, authorize('super_admin', 'admin', 'hospital_manager'), async (req, res) => {
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
router.put('/:id/toggle-duty', authenticate, authorize('super_admin', 'admin', 'hospital_manager', 'doctor', 'nurse', 'lab_technician', 'pharmacist'), async (req, res) => {
  try {
    const { id } = req.params;
    const shiftRes = await pool.query('SELECT * FROM doctor_shifts WHERE id = $1', [id]);
    if (!shiftRes.rows.length) {
      return res.status(404).json({ success: false, message: 'Shift not found' });
    }

    const shift = shiftRes.rows[0];

    // Non-manager participants can only toggle their own shifts
    if (!['super_admin', 'admin', 'hospital_manager'].includes(req.user.role)) {
      const ownDoc = await pool.query('SELECT id FROM doctors WHERE user_id = $1 OR id = $1', [req.user.id]);
      const ownDocIds = ownDoc.rows.map(r => r.id);
      const isOwner = 
        (shift.user_id && shift.user_id === req.user.id) || 
        (shift.doctor_id && (ownDocIds.includes(shift.doctor_id) || shift.doctor_id === req.user.id));
      if (!isOwner && (shift.user_id || shift.doctor_id)) {
        return res.status(403).json({ success: false, message: 'You can only clock in or clock out for your own assigned shift.' });
      }
    }

    const newDutyStatus = !shift.is_on_duty;

    const updateRes = await pool.query(`
      UPDATE doctor_shifts
      SET is_on_duty = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [newDutyStatus, id]);

    if (shift.doctor_id) {
      await pool.query('UPDATE doctors SET is_available = $1 WHERE id = $2', [newDutyStatus, shift.doctor_id]);
    }
    if (shift.user_id) {
      await pool.query('UPDATE nurses SET is_available = $1 WHERE user_id = $2', [newDutyStatus, shift.user_id]);
    }

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
