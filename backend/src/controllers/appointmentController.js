const pool = require('../config/database');
const { sendSuccess, sendError, handleAsync } = require('../utils/response');

const getAllAppointments = handleAsync(async (req, res) => {
  const { patientId, doctorId, date, status } = req.query;

  let query = `
    SELECT a.*,
      p.first_name || ' ' || p.last_name AS patient_name,
      p.phone AS patient_phone,
      d.first_name || ' ' || d.last_name AS doctor_name,
      d.specialization AS doctor_specialization
    FROM appointments a
    JOIN patients p ON a.patient_id = p.id
    JOIN doctors d ON a.doctor_id = d.id
    WHERE 1=1
  `;
  const params = [];
  let paramCount = 0;

  // Patients can only see their own appointments
  if (req.user.role === 'patient') {
    const patRes = await pool.query('SELECT id FROM patients WHERE user_id = $1', [req.user.id]);
    if (!patRes.rows.length) return sendSuccess(res, { appointments: [] });
    paramCount++;
    query += ` AND a.patient_id = $${paramCount}`;
    params.push(patRes.rows[0].id);
  } else if (req.user.role === 'doctor') {
    const docRes = await pool.query('SELECT id FROM doctors WHERE user_id = $1', [req.user.id]);
    if (docRes.rows.length) {
      paramCount++;
      query += ` AND a.doctor_id = $${paramCount}`;
      params.push(docRes.rows[0].id);
    }
  } else {
    if (patientId) {
      paramCount++;
      query += ` AND a.patient_id = $${paramCount}`;
      params.push(patientId);
    }
    if (doctorId) {
      paramCount++;
      query += ` AND a.doctor_id = $${paramCount}`;
      params.push(doctorId);
    }
  }

  if (date) {
    paramCount++;
    query += ` AND DATE(a.appointment_date) = $${paramCount}`;
    params.push(date);
  }

  if (status) {
    paramCount++;
    query += ` AND a.status = $${paramCount}`;
    params.push(status);
  }

  const result = await pool.query(query + ' ORDER BY a.appointment_date DESC', params);
  sendSuccess(res, { appointments: result.rows });
});

const getAppointmentById = handleAsync(async (req, res) => {
  const { id } = req.params;

  const result = await pool.query(
    `SELECT a.*,
      p.first_name || ' ' || p.last_name AS patient_name,
      d.first_name || ' ' || d.last_name AS doctor_name
     FROM appointments a
     JOIN patients p ON a.patient_id = p.id
     JOIN doctors d ON a.doctor_id = d.id
     WHERE a.id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    return sendError(res, 'Appointment not found', 404);
  }

  sendSuccess(res, result.rows[0]);
});

const bookAppointment = handleAsync(async (req, res) => {
  const { patientId, doctorId, appointmentDate, reason, notes } = req.body;

  if (!patientId || !doctorId || !appointmentDate) {
    return sendError(res, 'patientId, doctorId, and appointmentDate are required', 400);
  }

  // Check the doctor exists and is available
  const doctorCheck = await pool.query(
    'SELECT id, is_available FROM doctors WHERE id = $1',
    [doctorId]
  );
  if (!doctorCheck.rows.length) {
    return sendError(res, 'Doctor not found', 404);
  }
  if (!doctorCheck.rows[0].is_available) {
    return sendError(res, 'Doctor is not currently available for appointments', 409);
  }

  const result = await pool.query(
    `INSERT INTO appointments (patient_id, doctor_id, appointment_date, reason, notes)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [patientId, doctorId, appointmentDate, reason, notes || null]
  );

  sendSuccess(res, result.rows[0], 'Appointment booked successfully', 201);
});

const rescheduleAppointment = handleAsync(async (req, res) => {
  const { id } = req.params;
  const { newDate, reason } = req.body;

  if (!newDate) {
    return sendError(res, 'newDate is required', 400);
  }

  // Verify the appointment exists and is reschedulable
  const existing = await pool.query('SELECT * FROM appointments WHERE id = $1', [id]);
  if (!existing.rows.length) {
    return sendError(res, 'Appointment not found', 404);
  }
  if (existing.rows[0].status === 'cancelled' || existing.rows[0].status === 'completed') {
    return sendError(res, `Cannot reschedule a ${existing.rows[0].status} appointment`, 400);
  }

  const rescheduleNote = reason ? ` | Rescheduled: ${reason}` : ' | Rescheduled';
  const updatedNotes = (existing.rows[0].notes || '') + rescheduleNote;

  const result = await pool.query(
    `UPDATE appointments
     SET appointment_date = $1, status = 'rescheduled', notes = $2, updated_at = CURRENT_TIMESTAMP
     WHERE id = $3 RETURNING *`,
    [newDate, updatedNotes, id]
  );

  sendSuccess(res, result.rows[0], 'Appointment rescheduled successfully');
});

const cancelAppointment = handleAsync(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const existing = await pool.query('SELECT * FROM appointments WHERE id = $1', [id]);
  if (!existing.rows.length) {
    return sendError(res, 'Appointment not found', 404);
  }
  if (existing.rows[0].status === 'cancelled') {
    return sendError(res, 'Appointment is already cancelled', 400);
  }
  if (existing.rows[0].status === 'completed') {
    return sendError(res, 'Cannot cancel a completed appointment', 400);
  }

  const cancelNote = reason ? ` | Cancelled: ${reason}` : ' | Cancelled';
  const updatedNotes = (existing.rows[0].notes || '') + cancelNote;

  const result = await pool.query(
    `UPDATE appointments
     SET status = 'cancelled', notes = $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2 RETURNING *`,
    [updatedNotes, id]
  );

  sendSuccess(res, result.rows[0], 'Appointment cancelled successfully');
});

const getAvailableSlots = handleAsync(async (req, res) => {
  const { doctorId, date } = req.query;

  if (!doctorId || !date) {
    return sendError(res, 'doctorId and date are required', 400);
  }

  const bookedSlots = await pool.query(
    `SELECT EXTRACT(HOUR FROM appointment_date) AS hour,
            EXTRACT(MINUTE FROM appointment_date) AS minute
     FROM appointments
     WHERE doctor_id = $1 AND DATE(appointment_date) = $2 AND status != 'cancelled'`,
    [doctorId, date]
  );

  const allSlots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
                    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'];

  const bookedTimes = bookedSlots.rows.map(slot => {
    const hour = String(Math.floor(slot.hour)).padStart(2, '0');
    const minute = String(Math.floor(slot.minute)).padStart(2, '0');
    return `${hour}:${minute}`;
  });

  const availableSlots = allSlots.filter(slot => !bookedTimes.includes(slot));

  sendSuccess(res, { availableSlots, bookedSlots: bookedTimes });
});

module.exports = {
  getAllAppointments,
  getAppointmentById,
  bookAppointment,
  rescheduleAppointment,
  cancelAppointment,
  getAvailableSlots
};
