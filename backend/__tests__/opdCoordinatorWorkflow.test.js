/**
 * Comprehensive Integration Test Suite:
 * Official Alem Ketema Enat Hospital OPD Coordinator Workflow
 * RECEPTION → TRIAGE → VITALS → OPD COORDINATOR → DEPARTMENT ASSIGNMENT → DOCTOR ASSIGNMENT → DOCTOR CONSULTATION
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');

const mockClient = {
  query: jest.fn(),
  release: jest.fn()
};

jest.mock('../src/config/database', () => ({
  query: jest.fn().mockResolvedValue({ rows: [{ count: 1 }] }),
  connect: jest.fn().mockResolvedValue(mockClient),
  on: jest.fn()
}));

jest.mock('../src/services/billingService', () => ({
  getOrCreateInvoice: jest.fn().mockResolvedValue({ id: 101, total_amount: 50 }),
  createBillingItem: jest.fn().mockResolvedValue({ id: 201 }),
  billConsultation: jest.fn().mockResolvedValue({ id: 301 }),
  getEncounterBilling: jest.fn().mockResolvedValue({ invoice: { id: 101 }, items: [] })
}));

jest.mock('../src/services/socketService', () => ({
  init: jest.fn(),
  broadcast: jest.fn(),
  emitToUser: jest.fn()
}));

const app = require('../src/server');
const pool = require('../src/config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const tokenFor = (role, id = 99) => jwt.sign({ id, email: `${role}@hospital.com`, role }, JWT_SECRET, { expiresIn: '1h' });

describe('OPD Coordinator Complete Clinical Workflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    pool.connect.mockResolvedValue(mockClient);
    pool.query.mockResolvedValue({ rows: [{ count: 1 }] });
    mockClient.query.mockResolvedValue({ rows: [{ count: 1 }] });
  });

  describe('Stage 1: Receptionist Patient Intake & Triage Handover', () => {
    it('creates encounter in REGISTERED state and sends to triage queue', async () => {
      const receptionistToken = tokenFor('receptionist', 101);

      // 1. Patient check
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 42, first_name: 'Abebe', last_name: 'Bikila' }] }) // pat check
        .mockResolvedValueOnce({ rows: [{ id: 701, patient_id: 42, encounter_type: 'outpatient', status: 'REGISTERED' }] }) // insert enc
        .mockResolvedValueOnce({}) // update enc number
        .mockResolvedValueOnce({}) // workflow status history
        .mockResolvedValueOnce({}); // COMMIT

      const encRes = await request(app)
        .post('/api/encounters')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({ patient_id: 42, encounter_type: 'outpatient' });

      expect(encRes.statusCode).toBe(201);
      expect(encRes.body.success).toBe(true);
      expect(encRes.body.data.encounter.status).toBe('REGISTERED');

      // 2. Send to triage
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 701, status: 'REGISTERED' }] }) // enc check
        .mockResolvedValueOnce({ rows: [{ status: 'REGISTERED' }] }) // cur status in transitionStatus
        .mockResolvedValueOnce({}) // update status
        .mockResolvedValueOnce({}) // insert history
        .mockResolvedValueOnce({}); // COMMIT

      const triageRes = await request(app)
        .post('/api/encounters/701/send-to-triage')
        .set('Authorization', `Bearer ${receptionistToken}`);

      expect(triageRes.statusCode).toBe(200);
      expect(triageRes.body.message).toContain('Patient sent to triage queue');
    });
  });

  describe('Stage 2: Triage Nurse Assessment & Routine vs Emergency Protocol', () => {
    it('blocks triage nurse from routine doctor assignment and sends routine case to vitals queue', async () => {
      const nurseToken = tokenFor('nurse', 201);

      // 1. Attempt routine assignment by triage nurse -> blocked with 403
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 701, patient_id: 42, status: 'WAITING_FOR_TRIAGE' }] }) // enc check
        .mockResolvedValueOnce({}); // ROLLBACK

      const blockedRes = await request(app)
        .post('/api/encounters/701/triage')
        .set('Authorization', `Bearer ${nurseToken}`)
        .send({
          chief_complaint: 'Mild headache for 2 days',
          priority: 'normal',
          department_id: 1,
          doctor_id: 5
        });

      expect(blockedRes.statusCode).toBe(403);
      expect(blockedRes.body.message).toContain('Triage nurses cannot perform routine department or doctor assignment');

      // 2. Complete routine triage without doctor assignment -> forwards to WAITING_FOR_VITALS
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 701, patient_id: 42, status: 'IN_TRIAGE' }] }) // enc check
        .mockResolvedValueOnce({ rows: [] }) // check existing triage
        .mockResolvedValueOnce({}) // insert triage
        .mockResolvedValueOnce({ rows: [{ status: 'IN_TRIAGE' }] }) // cur status
        .mockResolvedValueOnce({}) // update status to WAITING_FOR_VITALS
        .mockResolvedValueOnce({}) // insert history
        .mockResolvedValueOnce({}); // COMMIT

      const validTriageRes = await request(app)
        .post('/api/encounters/701/triage')
        .set('Authorization', `Bearer ${nurseToken}`)
        .send({
          chief_complaint: 'Persistent dry cough',
          preliminary_observations: 'Patient alert and oriented, breathing room air comfortably',
          priority: 'normal'
        });

      expect(validTriageRes.statusCode).toBe(200);
      expect(validTriageRes.body.message).toContain('forwarded to Vitals queue');
    });

    it('emergency triage immediately creates emergency alert and bypasses to consultation queue', async () => {
      const nurseToken = tokenFor('nurse', 201);

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 702, patient_id: 43, status: 'IN_TRIAGE' }] }) // enc check
        .mockResolvedValueOnce({ rows: [] }) // check existing triage
        .mockResolvedValueOnce({}) // insert triage
        .mockResolvedValueOnce({ rows: [] }) // check existing emergency alert
        .mockResolvedValueOnce({ rows: [{ id: 99 }] }) // insert emergency alert
        .mockResolvedValueOnce({}) // insert emergency audit log
        .mockResolvedValueOnce({ rows: [{ status: 'IN_TRIAGE' }] }) // cur status
        .mockResolvedValueOnce({}) // update status to WAITING_FOR_CONSULTATION
        .mockResolvedValueOnce({}) // insert history
        .mockResolvedValueOnce({}); // COMMIT

      const emRes = await request(app)
        .post('/api/encounters/702/triage')
        .set('Authorization', `Bearer ${nurseToken}`)
        .send({
          chief_complaint: 'Crushing chest pain radiating to left arm',
          priority: 'emergency'
        });

      expect(emRes.statusCode).toBe(200);
      expect(emRes.body.message).toContain('Emergency triage completed');
    });
  });

  describe('Stage 3: Vitals Nurse Assessment, BMI & Pain Score Recording', () => {
    it('records complete vitals with pain score, calculates BMI, and forwards to OPD Coordinator queue', async () => {
      const nurseToken = tokenFor('nurse', 201);

      // Check vitals queue
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 701,
          encounter_number: 'ENC-2026-0701',
          first_name: 'Abebe',
          last_name: 'Bikila',
          status: 'WAITING_FOR_VITALS',
          chief_complaint: 'Persistent dry cough'
        }]
      });

      const queueRes = await request(app)
        .get('/api/encounters/vitals-queue')
        .set('Authorization', `Bearer ${nurseToken}`);

      expect(queueRes.statusCode).toBe(200);
      expect(queueRes.body.data.encounters).toHaveLength(1);

      // Record vitals: height 175cm, weight 70kg (BMI ~ 22.86), pain score 3
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 701, patient_id: 42, status: 'WAITING_FOR_VITALS' }] }) // enc check
        .mockResolvedValueOnce({}) // insert into vitals
        .mockResolvedValueOnce({}) // update triage_assessments
        .mockResolvedValueOnce({ rows: [{ status: 'WAITING_FOR_VITALS' }] }) // cur status for VITALS_COMPLETED
        .mockResolvedValueOnce({}) // update status to VITALS_COMPLETED
        .mockResolvedValueOnce({}) // insert history
        .mockResolvedValueOnce({ rows: [{ status: 'VITALS_COMPLETED' }] }) // cur status for WAITING_FOR_OPD_COORDINATOR
        .mockResolvedValueOnce({}) // update status to WAITING_FOR_OPD_COORDINATOR
        .mockResolvedValueOnce({}) // insert history
        .mockResolvedValueOnce({}); // COMMIT

      const vitalsRes = await request(app)
        .post('/api/encounters/701/vitals')
        .set('Authorization', `Bearer ${nurseToken}`)
        .send({
          temperature: 36.8,
          blood_pressure_systolic: 120,
          blood_pressure_diastolic: 80,
          heart_rate: 72,
          respiratory_rate: 16,
          oxygen_saturation: 98,
          weight: 70,
          height: 175,
          pain_score: 3,
          notes: 'Vitals stable'
        });

      expect(vitalsRes.statusCode).toBe(200);
      expect(vitalsRes.body.success).toBe(true);
      expect(vitalsRes.body.message).toContain('OPD Coordinator queue');
      expect(vitalsRes.body.data.bmi).toBe(22.86);
    });
  });

  describe('Stage 4: OPD Coordinator Department & Doctor Allocation', () => {
    it('retrieves patient in coordinator queue and assigns to department and doctor', async () => {
      const coordinatorToken = tokenFor('admin', 101);

      // 1. Fetch coordinator queue
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 701,
          encounter_number: 'ENC-2026-0701',
          first_name: 'Abebe',
          last_name: 'Bikila',
          status: 'WAITING_FOR_OPD_COORDINATOR',
          priority: 'normal',
          chief_complaint: 'Persistent dry cough',
          temperature: 36.8,
          bmi: 22.86,
          pain_score: 3
        }]
      });

      const coordQueueRes = await request(app)
        .get('/api/encounters/opd-coordinator-queue')
        .set('Authorization', `Bearer ${coordinatorToken}`);

      expect(coordQueueRes.statusCode).toBe(200);
      expect(coordQueueRes.body.data.encounters).toHaveLength(1);
      expect(coordQueueRes.body.data.encounters[0].bmi).toBe(22.86);

      // 2. Perform coordinator assignment
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 701, patient_id: 42, status: 'WAITING_FOR_OPD_COORDINATOR' }] }) // enc check
        .mockResolvedValueOnce({ rows: [{ id: 10, first_name: 'Selam', last_name: 'Bekele', is_available: true, department_id: 2 }] }) // doc check
        .mockResolvedValueOnce({ rows: [{ id: 2, name: 'Internal Medicine' }] }) // dept check
        .mockResolvedValueOnce({ rows: [] }) // existing assignment check
        .mockResolvedValueOnce({}) // upsert encounter_assignments
        .mockResolvedValueOnce({ rows: [{ status: 'WAITING_FOR_OPD_COORDINATOR' }] }) // cur status -> DEPARTMENT_ASSIGNED
        .mockResolvedValueOnce({}) // update status
        .mockResolvedValueOnce({}) // history
        .mockResolvedValueOnce({ rows: [{ status: 'DEPARTMENT_ASSIGNED' }] }) // cur status -> DOCTOR_ASSIGNED
        .mockResolvedValueOnce({}) // update status
        .mockResolvedValueOnce({}) // history
        .mockResolvedValueOnce({ rows: [{ status: 'DOCTOR_ASSIGNED' }] }) // cur status -> WAITING_FOR_CONSULTATION
        .mockResolvedValueOnce({}) // update status
        .mockResolvedValueOnce({}) // history
        .mockResolvedValueOnce({}); // COMMIT

      const assignRes = await request(app)
        .post('/api/encounters/701/coordinator-assign')
        .set('Authorization', `Bearer ${coordinatorToken}`)
        .send({
          department_id: 2,
          doctor_id: 10,
          notes: 'Assigned to Dr. Selam Bekele for respiratory evaluation'
        });

      expect(assignRes.statusCode).toBe(200);
      expect(assignRes.body.success).toBe(true);
      expect(assignRes.body.data.status).toBe('WAITING_FOR_CONSULTATION');
    });

    it('rejects assignment when attempted by receptionist', async () => {
      const receptionistToken = tokenFor('receptionist', 301);

      const res = await request(app)
        .post('/api/encounters/701/coordinator-assign')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({ department_id: 2, doctor_id: 10 });

      expect(res.statusCode).toBe(403);
    });
  });

  describe('Stage 5: Doctor Consultation & Clinical Completion', () => {
    it('doctor starts and completes consultation with status COMPLETED', async () => {
      const doctorToken = tokenFor('doctor', 301);

      // 1. Doctor queue
      pool.query
        .mockResolvedValueOnce({ rows: [{ id: 10 }] }) // doctor lookup
        .mockResolvedValueOnce({
          rows: [{
            id: 701,
            patient_id: 42,
            first_name: 'Abebe',
            last_name: 'Bikila',
            status: 'WAITING_FOR_CONSULTATION',
            bmi: 22.86
          }]
        });

      const queueRes = await request(app)
        .get('/api/encounters/doctor-queue')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(queueRes.statusCode).toBe(200);
      expect(queueRes.body.data.encounters).toHaveLength(1);

      // 2. Start consultation -> IN_CONSULTATION
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 701, patient_id: 42, status: 'WAITING_FOR_CONSULTATION' }] }) // enc check
        .mockResolvedValueOnce({ rows: [{ id: 10 }] }) // doc lookup
        .mockResolvedValueOnce({}) // upsert doctor_consultations
        .mockResolvedValueOnce({ rows: [{ status: 'WAITING_FOR_CONSULTATION' }] }) // cur status
        .mockResolvedValueOnce({}) // update status to IN_CONSULTATION
        .mockResolvedValueOnce({}) // history
        .mockResolvedValueOnce({}); // COMMIT

      const startRes = await request(app)
        .post('/api/encounters/701/start-consultation')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(startRes.statusCode).toBe(200);
      expect(startRes.body.message).toBe('Consultation started');

      // 3. Complete consultation -> COMPLETED
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 701, patient_id: 42, status: 'IN_CONSULTATION' }] }) // enc check
        .mockResolvedValueOnce({ rows: [{ id: 10 }] }) // doc lookup
        .mockResolvedValueOnce({ rows: [] }) // existing consult check
        .mockResolvedValueOnce({ rows: [{ id: 501, status: 'completed' }] }) // insert/update consult
        .mockResolvedValueOnce({}) // insert clinical_audit_events
        .mockResolvedValueOnce({ rows: [{ status: 'IN_CONSULTATION' }] }) // cur status
        .mockResolvedValueOnce({}) // update status to COMPLETED
        .mockResolvedValueOnce({}) // history
        .mockResolvedValueOnce({}); // COMMIT

      const completeRes = await request(app)
        .post('/api/encounters/701/complete-consultation')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          consultation_notes: 'Upper respiratory tract infection diagnosed. Prescribed supportive treatment.',
          diagnosis: 'Acute Upper Respiratory Tract Infection',
          icd_code: 'J06.9',
          treatment_plan: 'Oral hydration, paracetamol, rest',
          completion_status: 'COMPLETED'
        });

      expect(completeRes.statusCode).toBe(200);
      expect(completeRes.body.success).toBe(true);
      expect(completeRes.body.data.status).toBe('COMPLETED');
    });
  });
});
