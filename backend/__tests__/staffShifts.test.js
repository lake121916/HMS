const request = require('supertest');
const app = require('../src/server');
const jwt = require('jsonwebtoken');
const pool = require('../src/config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

describe('Staff Shift Scheduling & Role Governance (Managers vs Participants)', () => {
  let managerToken;
  let nurseToken;
  let otherNurseToken;
  let doctorToken;
  let sampleNurseUserId;
  let sampleOtherNurseUserId;
  let sampleDoctorUserId;
  let sampleLabUserId;
  let samplePharmacistUserId;
  let createdNurseShiftId;

  beforeAll(async () => {
    // 1. Hospital Manager
    const mgrRes = await pool.query(
      `INSERT INTO users (email, password_hash, role, is_active, first_name, last_name)
       VALUES ('shift_mgr@hospital.com', 'dummyhash', 'hospital_manager', true, 'Alemayehu', 'Manager')
       ON CONFLICT (email) DO UPDATE SET role = 'hospital_manager'
       RETURNING id`
    );
    managerToken = jwt.sign(
      { id: mgrRes.rows[0].id, email: 'shift_mgr@hospital.com', role: 'hospital_manager' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 2. Sample Nurse 1
    const nurseRes = await pool.query(
      `INSERT INTO users (email, password_hash, role, is_active, first_name, last_name)
       VALUES ('shift_nurse@hospital.com', 'dummyhash', 'nurse', true, 'Hiwot', 'Nurse')
       ON CONFLICT (email) DO UPDATE SET role = 'nurse'
       RETURNING id`
    );
    sampleNurseUserId = nurseRes.rows[0].id;
    nurseToken = jwt.sign(
      { id: sampleNurseUserId, email: 'shift_nurse@hospital.com', role: 'nurse' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 3. Sample Nurse 2 (other nurse)
    const otherNurseRes = await pool.query(
      `INSERT INTO users (email, password_hash, role, is_active, first_name, last_name)
       VALUES ('other_nurse@hospital.com', 'dummyhash', 'nurse', true, 'Bethlehem', 'Nurse')
       ON CONFLICT (email) DO UPDATE SET role = 'nurse'
       RETURNING id`
    );
    sampleOtherNurseUserId = otherNurseRes.rows[0].id;
    otherNurseToken = jwt.sign(
      { id: sampleOtherNurseUserId, email: 'other_nurse@hospital.com', role: 'nurse' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 4. Sample Doctor
    const docRes = await pool.query(
      `INSERT INTO users (email, password_hash, role, is_active, first_name, last_name)
       VALUES ('shift_doc@hospital.com', 'dummyhash', 'doctor', true, 'Dawit', 'Doctor')
       ON CONFLICT (email) DO UPDATE SET role = 'doctor'
       RETURNING id`
    );
    sampleDoctorUserId = docRes.rows[0].id;
    doctorToken = jwt.sign(
      { id: sampleDoctorUserId, email: 'shift_doc@hospital.com', role: 'doctor' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 5. Sample Lab Tech
    const labRes = await pool.query(
      `INSERT INTO users (email, password_hash, role, is_active, first_name, last_name)
       VALUES ('shift_lab@hospital.com', 'dummyhash', 'lab_technician', true, 'Tadesse', 'Lab')
       ON CONFLICT (email) DO UPDATE SET role = 'lab_technician'
       RETURNING id`
    );
    sampleLabUserId = labRes.rows[0].id;

    // 6. Sample Pharmacist
    const pharmRes = await pool.query(
      `INSERT INTO users (email, password_hash, role, is_active, first_name, last_name)
       VALUES ('shift_pharm@hospital.com', 'dummyhash', 'pharmacist', true, 'Marta', 'Pharm')
       ON CONFLICT (email) DO UPDATE SET role = 'pharmacist'
       RETURNING id`
    );
    samplePharmacistUserId = pharmRes.rows[0].id;
  });

  afterAll(async () => {
    if (createdNurseShiftId) {
      await pool.query('DELETE FROM doctor_shifts WHERE id = $1', [createdNurseShiftId]);
    }
    await pool.query('DELETE FROM doctor_shifts WHERE user_id IN ($1, $2, $3, $4, $5)', [
      sampleNurseUserId, sampleOtherNurseUserId, sampleDoctorUserId, sampleLabUserId, samplePharmacistUserId
    ]);
    await pool.query('DELETE FROM users WHERE email IN ($1, $2, $3, $4, $5, $6)', [
      'shift_mgr@hospital.com', 'shift_nurse@hospital.com', 'other_nurse@hospital.com',
      'shift_doc@hospital.com', 'shift_lab@hospital.com', 'shift_pharm@hospital.com'
    ]);
  });

  it('GET /api/shifts/staff — lists active staff across all clinical roles', async () => {
    const res = await request(app)
      .get('/api/shifts/staff')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    const roles = res.body.data.map(s => s.staff_role);
    expect(roles).toContain('nurse');
    expect(roles).toContain('lab_technician');
    expect(roles).toContain('pharmacist');
  });

  it('allows hospital_manager to schedule an evening shift for a nurse', async () => {
    const res = await request(app)
      .post('/api/shifts')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        user_id: sampleNurseUserId,
        staff_role: 'nurse',
        shift_date: '2026-11-20',
        shift_type: 'evening',
        notes: 'Inpatient Ward Evening Shift'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.staff_role).toBe('nurse');
    expect(res.body.data.shift_type).toBe('evening');
    createdNurseShiftId = res.body.data.id;
  });

  it('allows hospital_manager to schedule a night on-call shift for a lab technician', async () => {
    const res = await request(app)
      .post('/api/shifts')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        user_id: sampleLabUserId,
        staff_role: 'lab_technician',
        shift_date: '2026-11-20',
        shift_type: 'night',
        notes: 'Emergency Blood Bank & Cross-matching'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.staff_role).toBe('lab_technician');
  });

  it('rejects regular clinical participants (nurse) from creating shifts (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/shifts')
      .set('Authorization', `Bearer ${nurseToken}`)
      .send({
        user_id: samplePharmacistUserId,
        staff_role: 'pharmacist',
        shift_date: '2026-11-20',
        shift_type: 'morning'
      });

    expect(res.statusCode).toBe(403);
  });

  it('rejects regular clinical participants (doctor) from creating shifts (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/shifts')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        user_id: sampleDoctorUserId,
        staff_role: 'doctor',
        shift_date: '2026-11-20',
        shift_type: 'morning'
      });

    expect(res.statusCode).toBe(403);
  });

  it('allows assigned nurse to Clock In / Clock Out (toggle duty) for their own shift', async () => {
    if (!createdNurseShiftId) return;

    const res = await request(app)
      .put(`/api/shifts/${createdNurseShiftId}/toggle-duty`)
      .set('Authorization', `Bearer ${nurseToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.is_on_duty).toBe(true);
  });

  it('rejects other clinical staff from toggling duty on someone elses shift (403 Forbidden)', async () => {
    if (!createdNurseShiftId) return;

    const res = await request(app)
      .put(`/api/shifts/${createdNurseShiftId}/toggle-duty`)
      .set('Authorization', `Bearer ${otherNurseToken}`);

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toMatch(/You can only clock in or clock out for your own assigned shift/i);
  });
});
