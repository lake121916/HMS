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

const app = require('../src/server');
const pool = require('../src/config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const generateTestToken = (role = 'doctor', userId = 101) => {
  return jwt.sign({ id: userId, email: `${role}@hospital.com`, role }, JWT_SECRET, { expiresIn: '1h' });
};

describe('End-to-End Clinical Workflow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    pool.connect.mockResolvedValue(mockClient);
    pool.query.mockResolvedValue({ rows: [{ count: 1 }] });
    mockClient.query.mockResolvedValue({ rows: [{ count: 1 }] });
  });

  describe('Step 1: Patient Intake & Registration', () => {
    it('should register a new patient in the hospital system', async () => {
      const receptionistToken = generateTestToken('receptionist', 201);
      const mockPatient = {
        id: 42,
        mrn: 'MRN-2026-0042',
        first_name: 'Jane',
        last_name: 'Smith',
        gender: 'female',
        date_of_birth: '1990-05-15',
        email: 'jane.smith@example.com'
      };

      // pool.query checks email
      pool.query.mockResolvedValueOnce({ rows: [] });

      // mockClient transaction queries: BEGIN, insert user, insert patient, COMMIT
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 88, email: 'jane.smith@example.com', role: 'patient' }] }) // insert user
        .mockResolvedValueOnce({ rows: [mockPatient] }) // insert patient
        .mockResolvedValueOnce({}); // COMMIT

      const response = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({
          firstName: 'Jane',
          lastName: 'Smith',
          dateOfBirth: '1990-05-15',
          gender: 'female',
          email: 'jane.smith@example.com',
          phone: '+1555123456',
          address: '124 Healthcare Ave'
        });

      expect(response.statusCode).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('mrn', 'MRN-2026-0042');
    });
  });

  describe('Step 2: Doctor Encounter & Consultation', () => {
    it('should create an active clinical encounter for the patient', async () => {
      const receptionistToken = generateTestToken('receptionist', 201);
      const mockEncounter = {
        id: 701,
        patient_id: 42,
        encounter_type: 'outpatient',
        status: 'registered'
      };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 42, first_name: 'Jane', last_name: 'Smith' }] }) // patient check
        .mockResolvedValueOnce({ rows: [mockEncounter] }) // insert encounter
        .mockResolvedValueOnce({}) // workflow history
        .mockResolvedValueOnce({}); // COMMIT

      const response = await request(app)
        .post('/api/encounters')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({
          patient_id: 42,
          encounter_type: 'outpatient',
          chief_complaint: 'Severe headache and fatigue'
        });

      expect(response.statusCode).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.encounter.id).toBe(701);
    });
  });

  describe('Step 3: Prescription Issuance', () => {
    it('should create a medication prescription linked to doctor', async () => {
      const doctorToken = generateTestToken('doctor', 301);
      const mockPrescription = {
        id: 501,
        patient_id: 42,
        doctor_id: 301,
        medication_name: 'Amoxicillin 500mg',
        dosage: '1 tablet 3x daily',
        status: 'active'
      };

      pool.query
        .mockResolvedValueOnce({ rows: [{ id: 301 }] }) // doctor lookup
        .mockResolvedValueOnce({ rows: [mockPrescription] }); // insert prescription

      const response = await request(app)
        .post('/api/prescriptions')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          patient_id: 42,
          medication_name: 'Amoxicillin 500mg',
          dosage: '1 tablet 3x daily',
          frequency: 'TID',
          duration: '7 days',
          instructions: 'Take with food'
        });

      expect(response.statusCode).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.prescription).toBeDefined();
      expect(response.body.data.prescription.medication_name).toBe('Amoxicillin 500mg');
    });
  });

  describe('Step 4: Billing Invoice Generation', () => {
    it('should generate an invoice for the consultation & prescribed treatments', async () => {
      const receptionistToken = generateTestToken('receptionist', 201);

      const mockInvoice = {
        id: 901,
        patient_id: 42,
        total_amount: 150.00,
        status: 'pending',
        invoice_number: 'INV-2026-0901'
      };

      pool.query.mockResolvedValueOnce({ rows: [mockInvoice] });

      const response = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({
          patient_id: 42,
          subtotal: 150.00,
          due_date: '2026-10-15'
        });

      expect(response.statusCode).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.invoice).toHaveProperty('invoice_number', 'INV-2026-0901');
    });
  });
});
