const request = require('supertest');
const app = require('../src/server');
const jwt = require('jsonwebtoken');
const pool = require('../src/config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

const adminToken = jwt.sign(
  { id: 1, email: 'admin@hospital.com', role: 'admin', firstName: 'Admin' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

const doctorToken = jwt.sign(
  { id: 2, email: 'doctor@hospital.com', role: 'doctor', firstName: 'Doctor' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

const nurseToken = jwt.sign(
  { id: 3, email: 'nurse@hospital.com', role: 'nurse', firstName: 'Nurse' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

describe('Priority 3: Doctor Shift Scheduling & Intelligent Patient Assignment', () => {
  let sampleDoctorId = null;
  let sampleDoctor2Id = null;
  let sampleDeptId = null;
  let sampleEncounterId = null;
  let samplePatientId = null;
  let createdShiftId = null;
  let createdHandoverId = null;
  const testShiftDate = '2026-11-15';

  beforeAll(async () => {
    // Look up sample doctor(s), department, and encounter for testing
    const docRes = await pool.query('SELECT id, department_id FROM doctors ORDER BY id ASC LIMIT 2');
    if (docRes.rows.length > 0) {
      sampleDoctorId = docRes.rows[0].id;
      sampleDeptId = docRes.rows[0].department_id;
    }
    if (docRes.rows.length > 1) {
      sampleDoctor2Id = docRes.rows[1].id;
    } else {
      sampleDoctor2Id = sampleDoctorId;
    }

    const encRes = await pool.query('SELECT id, patient_id FROM patient_encounters ORDER BY id DESC LIMIT 1');
    if (encRes.rows.length > 0) {
      sampleEncounterId = encRes.rows[0].id;
      samplePatientId = encRes.rows[0].patient_id;
    }
  });

  afterAll(async () => {
    // Cleanup created test shifts and handovers
    if (createdShiftId) {
      await pool.query('DELETE FROM doctor_shifts WHERE id = $1', [createdShiftId]);
    }
    if (createdHandoverId) {
      await pool.query('DELETE FROM clinical_handovers WHERE id = $1', [createdHandoverId]);
    }
    await pool.query('DELETE FROM doctor_shifts WHERE shift_date = $1', [testShiftDate]);
  });

  describe('Shift Scheduling: POST /api/shifts & Conflicts', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const res = await request(app).post('/api/shifts').send({ doctor_id: sampleDoctorId, shift_date: testShiftDate });
      expect(res.statusCode).toBe(401);
    });

    it('successfully schedules a morning shift for a doctor', async () => {
      if (!sampleDoctorId) return;

      const res = await request(app)
        .post('/api/shifts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          doctor_id: sampleDoctorId,
          department_id: sampleDeptId,
          shift_date: testShiftDate,
          shift_type: 'morning',
          start_time: '08:00:00',
          end_time: '16:00:00',
          max_active_patients: 15,
          notes: 'Test morning shift on duty'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.shift_type).toBe('morning');
      createdShiftId = res.body.data.id;
    });

    it('prevents overlapping shift scheduling with 409 Conflict', async () => {
      if (!sampleDoctorId) return;

      // Attempt to schedule an overlapping morning/custom shift for the same doctor on the same date
      const res = await request(app)
        .post('/api/shifts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          doctor_id: sampleDoctorId,
          shift_date: testShiftDate,
          shift_type: 'morning',
          start_time: '09:00:00',
          end_time: '14:00:00'
        });

      expect(res.statusCode).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Shift conflict');
    });
  });

  describe('Shift Management: GET /api/shifts & Duty Toggles', () => {
    it('GET /api/shifts — retrieves list of scheduled shifts', async () => {
      const res = await request(app)
        .get('/api/shifts')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /api/shifts/on-duty — retrieves currently on-duty roster', async () => {
      const res = await request(app)
        .get('/api/shifts/on-duty')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('PUT /api/shifts/:id/toggle-duty — toggles on-duty status', async () => {
      if (!createdShiftId) return;

      const res = await request(app)
        .put(`/api/shifts/${createdShiftId}/toggle-duty`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('is_on_duty');
    });
  });

  describe('Intelligent Patient Assignment: POST /api/shifts/assign-patient', () => {
    it('assigns patient to least-loaded eligible doctor', async () => {
      if (!sampleEncounterId || !samplePatientId) return;

      const res = await request(app)
        .post('/api/shifts/assign-patient')
        .set('Authorization', `Bearer ${nurseToken}`)
        .send({
          encounter_id: sampleEncounterId,
          patient_id: samplePatientId,
          department_id: sampleDeptId,
          priority: 'urgent',
          notes: 'Test intelligent auto-assignment'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.assigned).toBe(true);
      expect(res.body.data.doctor).toBeDefined();
    });
  });

  describe('Clinical Shift Handover Workflow', () => {
    it('POST /api/shifts/handover — records handover and transfers encounter', async () => {
      if (!samplePatientId || !sampleDoctorId || !sampleDoctor2Id) return;

      const res = await request(app)
        .post('/api/shifts/handover')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          shift_id: createdShiftId,
          from_doctor_id: sampleDoctorId,
          to_doctor_id: sampleDoctor2Id,
          patient_id: samplePatientId,
          encounter_id: sampleEncounterId,
          pending_tasks: 'Review CBC and recheck vitals at next round',
          clinical_notes: 'Patient stable, IV fluids ongoing'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.is_acknowledged).toBe(false);
      createdHandoverId = res.body.data.id;
    });

    it('GET /api/shifts/handovers — retrieves clinical handovers', async () => {
      const res = await request(app)
        .get('/api/shifts/handovers')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('PUT /api/shifts/handovers/:id/acknowledge — incoming doctor acknowledges handover', async () => {
      if (!createdHandoverId) return;

      const res = await request(app)
        .put(`/api/shifts/handovers/${createdHandoverId}/acknowledge`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.is_acknowledged).toBe(true);
      expect(res.body.data.acknowledged_at).not.toBeNull();
    });
  });
});
