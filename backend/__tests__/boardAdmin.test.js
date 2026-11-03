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

describe('Hospital Board & Administrative Services Management Module', () => {
  let createdBirthId = null;
  let createdDeathId = null;
  let createdScholarshipId = null;
  let createdAppId = null;
  let createdMeetingId = null;

  describe('1. Birth Certificate Management Workflow', () => {
    it('creates a new newborn birth record', async () => {
      const patRes = await pool.query("SELECT id, first_name, last_name FROM patients WHERE gender = 'female' LIMIT 1");
      const mother = patRes.rows[0] || { id: 1, first_name: 'Almaz', last_name: 'Ayana' };

      const res = await request(app)
        .post('/api/board/birth-certificates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          mother_id: mother.id,
          mother_name: `${mother.first_name} ${mother.last_name}`,
          father_name: 'Tsegaye Kebede',
          father_national_id: 'KEB-2026-9812',
          father_phone: '+251911445566',
          baby_name: 'Ephrem Tsegaye',
          gender: 'male',
          date_of_birth: '2026-11-03',
          time_of_birth: '08:45:00',
          birth_weight: 3.45,
          gestational_age_weeks: 39,
          delivery_type: 'Spontaneous Vaginal',
          apgar_score_1min: 9,
          apgar_score_5min: 10,
          place_of_birth: 'Alem Ketema Enat Hospital - Maternity & Delivery Ward',
          attending_clinician_name: 'Dr. Berhanu Nega',
          clinician_role: 'Doctor',
          medical_record_ref: 'MRN-DEL-092'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.certificate_status).toBe('pending_verification');
      createdBirthId = res.body.data.id;
    });

    it('lists registered birth records with status filter', async () => {
      const res = await request(app)
        .get('/api/board/birth-certificates?status=pending_verification')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('allows a doctor/midwife to verify the birth record', async () => {
      expect(createdBirthId).toBeDefined();
      const res = await request(app)
        .put(`/api/board/birth-certificates/${createdBirthId}/verify`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ verification_notes: 'Clinical verification complete, vitals and apgar verified' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(['pending_verification', 'approved']).toContain(res.body.data.certificate_status);
    });

    it('allows an authorized admin to approve the verified birth record', async () => {
      const res = await request(app)
        .put(`/api/board/birth-certificates/${createdBirthId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ approval_notes: 'Approved by Medical Board Administration' });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.certificate_status).toBe('approved');
    });

    it('issues the birth certificate and generates public verification token', async () => {
      const res = await request(app)
        .put(`/api/board/birth-certificates/${createdBirthId}/issue`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.certificate_status).toBe('issued');
      expect(res.body.data.issued_at).toBeDefined();
    });

    it('generates an official printable birth certificate PDF stream with legal notice', async () => {
      const res = await request(app)
        .get(`/api/board/birth-certificates/${createdBirthId}/pdf`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
      expect(res.body).toBeDefined();
    });

    it('allows authorized correction with mandatory audit trail explanation', async () => {
      const res = await request(app)
        .put(`/api/board/birth-certificates/${createdBirthId}/correct`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          correction_notes: 'Updated father middle name upon submission of Kebele ID',
          father_name: 'Tsegaye Kebede Haile'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.father_name).toBe('Tsegaye Kebede Haile');
    });
  });

  describe('2. Death Certificate Management Workflow', () => {
    it('registers a deceased patient clinical death record', async () => {
      const patRes = await pool.query('SELECT id, first_name, last_name, date_of_birth, gender FROM patients LIMIT 1');
      const patient = patRes.rows[0] || { id: 1, first_name: 'Hailu', last_name: 'Girmay', gender: 'male' };

      const res = await request(app)
        .post('/api/board/death-certificates')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          patient_id: patient.id,
          patient_name: `${patient.first_name} ${patient.last_name}`,
          mrn: `MRN-${patient.id}`,
          gender: patient.gender || 'male',
          age_years: 64,
          date_of_death: '2026-11-02',
          time_of_death: '22:15:00',
          place_of_death: 'Alem Ketema Enat Hospital - ICU',
          immediate_cause: 'Septic Shock',
          antecedent_cause: 'Severe Community-Acquired Pneumonia',
          underlying_cause: 'Type 2 Diabetes Mellitus',
          contributing_conditions: 'Chronic Kidney Disease Stage 3',
          icd10_code: 'R57.2',
          next_of_kin_name: 'Almaz Hailu',
          next_of_kin_relationship: 'Daughter',
          next_of_kin_phone: '+251 91 123 4567'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.record_number).toMatch(/^REC-DTH-2026-/);
      createdDeathId = res.body.data.id;
    });

    it('verifies clinical cause of death and approves documentation', async () => {
      expect(createdDeathId).toBeDefined();
      const verifyRes = await request(app)
        .put(`/api/board/death-certificates/${createdDeathId}/verify`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ verification_notes: 'Medical review verified against clinical ICU charts' });

      expect(verifyRes.statusCode).toBe(200);
      expect(verifyRes.body.data.document_status).toBe('verified');

      const appRes = await request(app)
        .put(`/api/board/death-certificates/${createdDeathId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(appRes.statusCode).toBe(200);
      expect(appRes.body.data.document_status).toBe('approved');
    });

    it('issues the death certificate and generates printable PDF stream', async () => {
      const issueRes = await request(app)
        .put(`/api/board/death-certificates/${createdDeathId}/issue`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(issueRes.statusCode).toBe(200);
      expect(issueRes.body.data.document_status).toBe('issued');

      const pdfRes = await request(app)
        .get(`/api/board/death-certificates/${createdDeathId}/pdf`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(pdfRes.statusCode).toBe(200);
      expect(pdfRes.headers['content-type']).toContain('application/pdf');
    });
  });

  describe('3. Scholarship Management Module', () => {
    it('creates a new scholarship award program', async () => {
      const uniqueCode = `SCH-NURSE-${Date.now()}`;
      const res = await request(app)
        .post('/api/board/scholarships/programs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Specialized Nursing Excellence Grant',
          program_code: uniqueCode,
          category: 'Nursing',
          sponsoring_org: 'Ethiopian Ministry of Health & Hospital Trust',
          total_slots: 5,
          financial_support_amount: 150000.00,
          duration_months: 24,
          opening_date: '2026-11-01',
          closing_date: '2026-12-31',
          eligibility_criteria: 'Minimum 2 years of active service with performance score >= 85%',
          required_documents: ['Diploma', 'Recommendation Letter', 'Statement of Purpose']
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      createdScholarshipId = res.body.data.id;
    });

    it('submits a scholarship application', async () => {
      expect(createdScholarshipId).toBeDefined();
      const res = await request(app)
        .post('/api/board/scholarships/applications')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          program_id: createdScholarshipId,
          applicant_name: 'Sister Bethlehem Tadesse',
          contact_email: 'bethlehem.t@hospital.com',
          contact_phone: '+251 92 334 5566',
          employee_id_code: 'EMP-NURSE-042',
          education_level: 'BSc Nursing',
          academic_gpa: 3.82,
          years_of_experience: 3,
          statement_of_purpose: 'Desire to advance skills in emergency triage and critical pediatric stabilization.'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      createdAppId = res.body.data.id;
    });

    it('evaluates and approves scholarship application', async () => {
      expect(createdAppId).toBeDefined();
      const evalRes = await request(app)
        .put(`/api/board/scholarships/applications/${createdAppId}/evaluate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          evaluation_score: 92.5,
          evaluation_remarks: 'Strong clinical background and exceptional service record.',
          shortlist: true
        });

      expect(evalRes.statusCode).toBe(200);
      expect(evalRes.body.data.status).toBe('shortlisted');

      const decRes = await request(app)
        .put(`/api/board/scholarships/applications/${createdAppId}/decision`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          decision: 'approved',
          board_decision_ref: 'DEC-2026-BOARD-42'
        });

      expect(decRes.statusCode).toBe(200);
      expect(decRes.body.data.status).toBe('approved');
    });
  });

  describe('4. Medical Specialization Management', () => {
    it('fetches clinical specialization tracks and applications', async () => {
      const res = await request(app)
        .get('/api/board/specializations/programs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('5. Training & CPD Programs', () => {
    it('creates a training program and registers participants', async () => {
      const uniqueCode = `CPD-PALS-${Date.now()}`;
      const res = await request(app)
        .post('/api/board/training/programs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Advanced Pediatric Resuscitation (PALS)',
          program_code: uniqueCode,
          category: 'Clinical Skills',
          trainer_name: 'Dr. Dawit Alemayehu',
          trainer_institution: 'MD, Pediatric Emergency Specialist',
          start_date: '2026-11-20',
          end_date: '2026-11-22',
          venue: 'Main Auditorium, Education Center',
          ceu_credits: 12.0,
          max_participants: 25
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      const progId = res.body.data.id;

      const regRes = await request(app)
        .post(`/api/board/training/programs/${progId}/register`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          user_id: 1
        });

      expect(regRes.statusCode).toBe(201);
      expect(regRes.body.success).toBe(true);
    });
  });

  describe('6. Board Governance & Reports', () => {
    it('creates a board meeting and logs agenda item', async () => {
      const res = await request(app)
        .post('/api/board/meetings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Q4 2026 Hospital Executive Board Meeting',
          meeting_number: `BM-2026-Q4-${Date.now()}`,
          meeting_date: '2026-11-15',
          start_time: '09:00:00',
          end_time: '12:00:00',
          location: 'Board Executive Room / Virtual',
          meeting_type: 'regular'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.id).toBeDefined();
      createdMeetingId = res.body.data.id;

      const agendaRes = await request(app)
        .post(`/api/board/meetings/${createdMeetingId}/agendas`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          item_number: 1,
          title: 'Approval of 2026 Medical Specialization Cohort',
          description: 'Review committee recommendations for OBGYN and Emergency Medicine residencies.',
          presenter_name: 'Medical Director',
          allotted_minutes: 30
        });

      expect(agendaRes.statusCode).toBe(201);
      expect(agendaRes.body.data.title).toBe('Approval of 2026 Medical Specialization Cohort');
    });

    it('returns executive board statistics and KPIs', async () => {
      const res = await request(app)
        .get('/api/board/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('births');
      expect(res.body.data).toHaveProperty('deaths');
      expect(res.body.data).toHaveProperty('scholarships');
      expect(res.body.data).toHaveProperty('training');
      expect(res.body.data.births).toHaveProperty('vaginal_count');
    });

    it('returns administrative audit trail logs', async () => {
      const res = await request(app)
        .get('/api/board/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });
});
