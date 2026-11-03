/**
 * Workload Summary & Real-time Duty Status API
 * Alem Ketema Enat Hospital Management System
 */

const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');
const socketService = require('../services/socketService');

/**
 * GET /api/workload/summary
 * Returns real-time pending counters for workbench badges + authoritative duty status
 */
router.get('/summary', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    // 1. Triage queue count
    const triageRes = await pool.query(
      `SELECT COUNT(*)::int AS count FROM patient_encounters WHERE status IN ('waiting_for_triage', 'in_triage')`
    );
    const triageCount = triageRes.rows[0]?.count || 0;

    // 2. Doctor consultation queue count
    let doctorQueueCount = 0;
    if (userRole === 'doctor') {
      const docRes = await pool.query('SELECT id FROM doctors WHERE user_id = $1 LIMIT 1', [userId]);
      const doctorId = docRes.rows[0]?.id;
      if (doctorId) {
        const assignedRes = await pool.query(
          `SELECT COUNT(*)::int AS count
           FROM patient_encounters pe
           JOIN encounter_assignments ea ON ea.encounter_id = pe.id
           WHERE UPPER(pe.status) IN ('WAITING_FOR_DOCTOR', 'WAITING_FOR_CONSULTATION', 'IN_CONSULTATION')
             AND ea.doctor_id = $1`,
          [doctorId]
        );
        doctorQueueCount = assignedRes.rows[0]?.count || 0;
      }
      if (doctorQueueCount === 0) {
        // Fallback to unassigned/general waiting doctor queue
        const generalRes = await pool.query(
          `SELECT COUNT(*)::int AS count FROM patient_encounters WHERE UPPER(status) IN ('WAITING_FOR_DOCTOR', 'WAITING_FOR_CONSULTATION', 'IN_CONSULTATION')`
        );
        doctorQueueCount = generalRes.rows[0]?.count || 0;
      }
    } else {
      const generalRes = await pool.query(
        `SELECT COUNT(*)::int AS count FROM patient_encounters WHERE UPPER(status) IN ('WAITING_FOR_DOCTOR', 'WAITING_FOR_CONSULTATION', 'IN_CONSULTATION')`
      );
      doctorQueueCount = generalRes.rows[0]?.count || 0;
    }

    // 3. Lab pending count
    const labRes = await pool.query(
      `SELECT COUNT(*)::int AS count FROM lab_tests WHERE status IN ('ordered', 'pending', 'sample_collected', 'in_progress') OR status != 'completed'`
    );
    const labCount = labRes.rows[0]?.count || 0;

    // 4. Pharmacy pending dispensing count
    const rxRes = await pool.query(
      `SELECT COUNT(*)::int AS count FROM prescriptions WHERE is_dispensed = false`
    );
    const rxCount = rxRes.rows[0]?.count || 0;

    // 5. Cashier pending invoices count
    const invoiceRes = await pool.query(
      `SELECT COUNT(*)::int AS count FROM invoices WHERE status IN ('pending', 'partial')`
    );
    const cashierCount = invoiceRes.rows[0]?.count || 0;

    // 6. Active inpatient admissions count
    const admRes = await pool.query(
      `SELECT COUNT(*)::int AS count FROM admissions WHERE status = 'admitted'`
    );
    const admissionsCount = admRes.rows[0]?.count || 0;

    // 7. Authoritative Duty Status for current staff member
    let dutyStatus = {
      isOnDuty: false,
      hasScheduledShift: false,
      shiftId: null,
      shiftType: 'off_duty',
      shiftLabel: 'Off Duty',
      startTime: null,
      endTime: null,
      department: null
    };

    const shiftQuery = await pool.query(`
      SELECT ds.*, dep.name AS department_name
      FROM doctor_shifts ds
      LEFT JOIN departments dep ON dep.id = ds.department_id
      WHERE (
        ds.user_id = $1 OR 
        ds.doctor_id = (SELECT id FROM doctors WHERE user_id = $1 LIMIT 1)
      )
      AND ds.shift_date = CURRENT_DATE
      ORDER BY ds.id DESC
      LIMIT 1
    `, [userId]);

    if (shiftQuery.rows.length > 0) {
      const shift = shiftQuery.rows[0];
      const shiftLabels = {
        morning: 'Morning Shift (08:00 - 16:00)',
        evening: 'Evening Shift (16:00 - 00:00)',
        night:   'Night Shift (00:00 - 08:00)',
        on_call: 'On-Call 24h Coverage'
      };

      dutyStatus = {
        isOnDuty: Boolean(shift.is_on_duty),
        hasScheduledShift: true,
        shiftId: shift.id,
        shiftType: shift.shift_type,
        shiftLabel: shiftLabels[shift.shift_type] || `${shift.shift_type} Shift`,
        startTime: shift.start_time,
        endTime: shift.end_time,
        department: shift.department_name || 'General Hospital'
      };
    } else {
      // Check if user has is_available on doctors or nurses profile
      if (userRole === 'doctor') {
        const docCheck = await pool.query('SELECT is_available FROM doctors WHERE user_id = $1 LIMIT 1', [userId]);
        if (docCheck.rows.length > 0 && docCheck.rows[0].is_available) {
          dutyStatus.isOnDuty = true;
          dutyStatus.shiftLabel = 'On Duty (Active)';
        }
      } else if (userRole === 'nurse') {
        const nurseCheck = await pool.query('SELECT is_available FROM nurses WHERE user_id = $1 LIMIT 1', [userId]);
        if (nurseCheck.rows.length > 0 && nurseCheck.rows[0].is_available) {
          dutyStatus.isOnDuty = true;
          dutyStatus.shiftLabel = 'On Duty (Active)';
        }
      }
    }

    res.json({
      success: true,
      data: {
        counts: {
          triage: triageCount,
          doctorQueue: doctorQueueCount,
          labPending: labCount,
          pharmacyPending: rxCount,
          cashierPending: cashierCount,
          activeAdmissions: admissionsCount
        },
        dutyStatus
      }
    });
  } catch (error) {
    console.error('Error fetching workload summary:', error);
    res.status(500).json({ success: false, message: 'Server error fetching workload summary' });
  }
});

/**
 * POST /api/workload/duty-toggle
 * Directly toggle duty for the logged-in staff member's shift
 */
router.post('/duty-toggle', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    // Find shift for today
    const shiftRes = await pool.query(`
      SELECT ds.* 
      FROM doctor_shifts ds
      WHERE (
        ds.user_id = $1 OR 
        ds.doctor_id = (SELECT id FROM doctors WHERE user_id = $1 LIMIT 1)
      )
      AND ds.shift_date = CURRENT_DATE
      ORDER BY ds.id DESC
      LIMIT 1
    `, [userId]);

    let newDutyStatus = true;
    let shiftId = null;

    if (shiftRes.rows.length > 0) {
      const shift = shiftRes.rows[0];
      shiftId = shift.id;
      newDutyStatus = !shift.is_on_duty;

      await pool.query(
        'UPDATE doctor_shifts SET is_on_duty = $1, updated_at = NOW() WHERE id = $2',
        [newDutyStatus, shiftId]
      );
    }

    // Update doctor or nurse availability
    if (userRole === 'doctor') {
      await pool.query('UPDATE doctors SET is_available = $1 WHERE user_id = $2', [newDutyStatus, userId]);
    } else if (userRole === 'nurse') {
      await pool.query('UPDATE nurses SET is_available = $1 WHERE user_id = $2', [newDutyStatus, userId]);
    }

    socketService.broadcast('shift:duty_changed', {
      user_id: userId,
      role: userRole,
      shift_id: shiftId,
      is_on_duty: newDutyStatus
    });

    res.json({
      success: true,
      message: `Duty status switched to ${newDutyStatus ? 'ON DUTY' : 'OFF DUTY'}`,
      data: {
        isOnDuty: newDutyStatus,
        shiftId
      }
    });
  } catch (error) {
    console.error('Error toggling duty status:', error);
    res.status(500).json({ success: false, message: 'Server error updating duty status' });
  }
});

module.exports = router;
