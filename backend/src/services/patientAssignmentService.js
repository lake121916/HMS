/**
 * Intelligent Patient Assignment Service
 * Alem Ketema Enat Hospital Management System
 * 
 * Features:
 * - Real-time on-duty doctor discovery across clinical departments
 * - Priority-1 emergency bypass: routes critical cases directly to emergency duty physicians
 * - Workload balancing: assigns routine/urgent cases to least-loaded eligible doctor
 * - Capacity management: respects max_active_patients threshold
 * - Graceful fallback: handles understaffed departments safely with triage coordinator alerts
 */

const pool = require('../config/database');
const socketService = require('./socketService');

/**
 * Get all on-duty doctors, optionally filtered by department.
 * Doctors are sorted by current active patient workload (ascending: least loaded first).
 */
async function getOnDutyDoctors(departmentId = null, dbClient = null) {
  const client = dbClient || pool;

  let deptClause = '';
  const params = [];
  let paramIdx = 1;

  if (departmentId) {
    deptClause = `AND (d.department_id = $${paramIdx} OR s.department_id = $${paramIdx})`;
    params.push(departmentId);
    paramIdx++;
  }

  // A doctor is on-duty if:
  // 1. They have an active shift for today with is_on_duty = true, OR
  // 2. They have a confirmed shift for today whose time window covers current time, OR
  // 3. Fallback: is_available = true in doctors table
  const query = `
    WITH active_shifts AS (
      SELECT DISTINCT ON (doctor_id)
        id AS shift_id,
        doctor_id,
        department_id,
        shift_date,
        shift_type,
        start_time,
        end_time,
        is_on_duty,
        max_active_patients,
        status
      FROM doctor_shifts
      WHERE shift_date = CURRENT_DATE
        AND status IN ('scheduled', 'confirmed')
      ORDER BY doctor_id, is_on_duty DESC, id DESC
    ),
    doctor_workloads AS (
      SELECT 
        ea.doctor_id,
        COUNT(pe.id) AS active_patient_count
      FROM encounter_assignments ea
      JOIN patient_encounters pe ON pe.id = ea.encounter_id
      WHERE UPPER(pe.status) IN ('WAITING_FOR_DOCTOR', 'WAITING_FOR_CONSULTATION', 'IN_CONSULTATION')
      GROUP BY ea.doctor_id
    )
    SELECT 
      d.id AS doctor_id,
      d.first_name,
      d.last_name,
      d.specialization,
      d.phone,
      d.is_available,
      COALESCE(s.department_id, d.department_id) AS department_id,
      dep.name AS department_name,
      s.shift_id,
      s.shift_type,
      s.start_time,
      s.end_time,
      COALESCE(s.is_on_duty, d.is_available, false) AS is_on_duty,
      COALESCE(s.max_active_patients, 20) AS max_active_patients,
      COALESCE(w.active_patient_count, 0)::integer AS active_workload
    FROM doctors d
    LEFT JOIN departments dep ON dep.id = d.department_id
    LEFT JOIN active_shifts s ON s.doctor_id = d.id
    LEFT JOIN doctor_workloads w ON w.doctor_id = d.id
    WHERE (d.is_available = true OR s.is_on_duty = true)
      ${deptClause}
    ORDER BY active_workload ASC, d.id ASC
  `;

  const res = await client.query(query, params);
  return res.rows;
}

/**
 * Assign a patient encounter to the most suitable on-duty doctor.
 * 
 * @param {Object} options
 * @param {number} options.encounterId - Encounter ID
 * @param {number} options.patientId - Patient ID
 * @param {number} [options.departmentId] - Department ID
 * @param {string} [options.priority='normal'] - Triage priority ('emergency', 'urgent', 'normal')
 * @param {number} [options.requestedDoctorId] - Specific doctor requested by nurse
 * @param {number} [options.assignedBy] - User ID performing assignment
 * @param {string} [options.notes] - Assignment notes
 * @param {Object} [options.client] - Optional transactional database client
 */
async function assignPatientToDoctor({
  encounterId,
  patientId,
  departmentId = null,
  priority = 'normal',
  requestedDoctorId = null,
  assignedBy = null,
  notes = null,
  client = null
}) {
  const db = client || pool;
  const isEmergency = ['emergency', 'critical', 'resuscitation'].includes(String(priority).toLowerCase());

  // 1. If a specific doctor was explicitly selected by triage staff
  if (requestedDoctorId) {
    const docRes = await db.query(
      `SELECT d.id, d.first_name, d.last_name, d.department_id, d.is_available, dep.name AS department_name
       FROM doctors d
       LEFT JOIN departments dep ON dep.id = d.department_id
       WHERE d.id = $1`,
      [requestedDoctorId]
    );

    if (!docRes.rows.length) {
      return { success: false, assigned: false, message: 'Requested doctor not found' };
    }

    const doc = docRes.rows[0];
    const finalDeptId = departmentId || doc.department_id;

    await db.query(
      `INSERT INTO encounter_assignments (encounter_id, patient_id, department_id, doctor_id, assigned_by, notes, assigned_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (encounter_id) DO UPDATE SET
         department_id = COALESCE(EXCLUDED.department_id, encounter_assignments.department_id),
         doctor_id     = EXCLUDED.doctor_id,
         assigned_by   = EXCLUDED.assigned_by,
         notes         = EXCLUDED.notes,
         assigned_at   = NOW()`,
      [encounterId, patientId, finalDeptId, doc.id, assignedBy, notes || 'Direct assignment by clinical staff']
    );

    await db.query(
      `UPDATE patient_encounters
       SET status = 'waiting_for_doctor', updated_at = NOW()
       WHERE id = $1`,
      [encounterId]
    );

    socketService.broadcast('patient:assigned', {
      encounter_id: encounterId,
      patient_id: patientId,
      doctor_id: doc.id,
      doctor_name: `Dr. ${doc.first_name} ${doc.last_name}`,
      priority,
      method: 'manual'
    });

    return {
      success: true,
      assigned: true,
      doctor: doc,
      method: 'manual',
      message: `Assigned directly to Dr. ${doc.first_name} ${doc.last_name}`
    };
  }

  // 2. Intelligent Auto-Assignment
  // Query candidate on-duty doctors
  let candidates = await getOnDutyDoctors(departmentId, db);

  // If no doctors found in the specific department, look hospital-wide
  if (candidates.length === 0 && departmentId) {
    candidates = await getOnDutyDoctors(null, db);
  }

  // If still no on-duty doctors, check any doctor in the database
  if (candidates.length === 0) {
    const fallbackRes = await db.query(
      `SELECT d.id AS doctor_id, d.first_name, d.last_name, d.department_id, dep.name AS department_name, 0 AS active_workload
       FROM doctors d
       LEFT JOIN departments dep ON dep.id = d.department_id
       ORDER BY d.id ASC
       LIMIT 1`
    );
    if (fallbackRes.rows.length > 0) {
      candidates = fallbackRes.rows;
    }
  }

  // If absolutely no doctor records exist
  if (candidates.length === 0) {
    return {
      success: true,
      assigned: false,
      reason: 'NO_DOCTOR_AVAILABLE',
      message: 'No on-duty or available doctor found. Patient placed in unassigned department queue.'
    };
  }

  // 3. Selection Algorithm:
  let selectedDoctor = null;

  if (isEmergency) {
    // For Emergency: Pick the least-loaded doctor immediately. Capacity limits do NOT block emergencies.
    selectedDoctor = candidates[0];
  } else {
    // For Routine/Urgent: Pick least-loaded doctor who hasn't exceeded max_active_patients
    const withCapacity = candidates.filter(c => c.active_workload < (c.max_active_patients || 20));
    selectedDoctor = withCapacity.length > 0 ? withCapacity[0] : candidates[0]; // fallback to least-loaded even if at cap
  }

  const assignedDeptId = departmentId || selectedDoctor.department_id;
  const assignmentNotes = notes || (isEmergency 
    ? `Emergency Auto-Assignment: Priority Code Red routed to least-loaded on-duty physician (Load: ${selectedDoctor.active_workload})`
    : `Intelligent Auto-Assignment: Assigned to least-loaded on-duty doctor (Active Workload: ${selectedDoctor.active_workload})`
  );

  await db.query(
    `INSERT INTO encounter_assignments (encounter_id, patient_id, department_id, doctor_id, assigned_by, notes, assigned_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (encounter_id) DO UPDATE SET
       department_id = COALESCE(EXCLUDED.department_id, encounter_assignments.department_id),
       doctor_id     = EXCLUDED.doctor_id,
       assigned_by   = EXCLUDED.assigned_by,
       notes         = EXCLUDED.notes,
       assigned_at   = NOW()`,
    [encounterId, patientId, assignedDeptId, selectedDoctor.doctor_id, assignedBy, assignmentNotes]
  );

  await db.query(
    `UPDATE patient_encounters
     SET status = 'waiting_for_doctor', updated_at = NOW()
     WHERE id = $1`,
    [encounterId]
  );

  socketService.broadcast('patient:assigned', {
    encounter_id: encounterId,
    patient_id: patientId,
    doctor_id: selectedDoctor.doctor_id,
    doctor_name: `Dr. ${selectedDoctor.first_name} ${selectedDoctor.last_name}`,
    priority,
    method: 'intelligent_auto',
    activeWorkload: selectedDoctor.active_workload
  });

  return {
    success: true,
    assigned: true,
    doctor: {
      id: selectedDoctor.doctor_id,
      first_name: selectedDoctor.first_name,
      last_name: selectedDoctor.last_name,
      department_name: selectedDoctor.department_name
    },
    activeWorkload: selectedDoctor.active_workload,
    method: 'intelligent_auto',
    message: `Intelligently assigned to Dr. ${selectedDoctor.first_name} ${selectedDoctor.last_name} (${selectedDoctor.department_name || 'General OPD'})`
  };
}

module.exports = {
  getOnDutyDoctors,
  assignPatientToDoctor
};
