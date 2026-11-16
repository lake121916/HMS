if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'opd-test-secret';

const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/config/database', () => ({
  query: jest.fn(),
  connect: jest.fn(),
  on: jest.fn()
}));

const pool = require('../src/config/database');
const app = require('../src/server');

const testClient = {
  query: jest.fn(),
  release: jest.fn()
};

const tokenFor = role => jwt.sign({ id: 10, email: `${role}@hospital.test`, role }, process.env.JWT_SECRET);

describe('OPD Department Comprehensive Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    testClient.query.mockReset();
    pool.query.mockReset();
    pool.connect.mockResolvedValue(testClient);
    pool.query.mockResolvedValue({ rows: [] });
    testClient.query.mockResolvedValue({ rows: [] });
  });

  describe('1. OPD Dashboard Unified Metrics', () => {
    test('returns aggregated OPD metrics for today', async () => {
      pool.query
        .mockResolvedValueOnce({
          rows: [{
            total_encounters: '45',
            in_triage: '8',
            in_coordinator: '5',
            waiting_for_doctor: '14',
            in_consultation: '6',
            completed_consultations: '10',
            cancelled_visits: '2'
          }]
        })
        .mockResolvedValueOnce({
          rows: [{
            total_tokens: '50',
            waiting_tokens: '12',
            emergency_cases: '3',
            avg_wait_time: '26'
          }]
        })
        .mockResolvedValueOnce({ rows: [{ count: '7' }] }) // lab pending
        .mockResolvedValueOnce({ rows: [{ count: '9' }] }) // pharmacy pending
        .mockResolvedValueOnce({ rows: [{ count: '11' }] }) // cashier pending
        .mockResolvedValueOnce({ rows: [{ count: '4' }] }) // referrals count
        .mockResolvedValueOnce({
          rows: [
            { id: 1, first_name: 'Abebe', last_name: 'Bikila', specialization: 'Cardiology', is_available: true, department_name: 'Cardiology', active_consultations: 1, waiting_queue: 5 }
          ]
        }) // doctor roster
        .mockResolvedValueOnce({
          rows: [
            { name: 'General OPD', count: '25' },
            { name: 'Pediatrics', count: '15' }
          ]
        }); // dept breakdown

      const response = await request(app)
        .get('/api/opd/dashboard-metrics')
        .set('Authorization', `Bearer ${tokenFor('doctor')}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.kpis.totalPatientsToday).toBe(50);
      expect(response.body.data.kpis.waitingPatients).toBe(14);
      expect(response.body.data.kpis.inTriage).toBe(8);
      expect(response.body.data.kpis.inConsultation).toBe(6);
      expect(response.body.data.kpis.completedConsultations).toBe(10);
      expect(response.body.data.workstationQueues.laboratory).toBe(7);
      expect(response.body.data.workstationQueues.pharmacy).toBe(9);
      expect(response.body.data.doctorRoster[0].name).toBe('Dr. Abebe Bikila');
    });
  });

  describe('2. Patient Duplicate Detection', () => {
    test('detects potential duplicate patient by phone or name/DOB', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 42,
          first_name: 'Kebede',
          last_name: 'Alemu',
          date_of_birth: '1990-05-15',
          gender: 'male',
          phone: '+251911223344',
          insurance_number: 'CBHI-0012',
          created_at: new Date()
        }]
      });

      const response = await request(app)
        .post('/api/patients/check-duplicate')
        .set('Authorization', `Bearer ${tokenFor('receptionist')}`)
        .send({
          phone: '0911223344',
          firstName: 'Kebede',
          lastName: 'Alemu',
          dateOfBirth: '1990-05-15'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.has_duplicates).toBe(true);
      expect(response.body.data.duplicates[0].mrn).toBe('PAT-0042');
      expect(response.body.data.duplicates[0].match_reasons).toContain('Full name match');
    });
  });

  describe('3. Appointment Conflict Prevention', () => {
    test('rejects booking when doctor already has an appointment within slot window', async () => {
      // 1. Doctor check
      pool.query
        .mockResolvedValueOnce({
          rows: [{ id: 5, is_available: true }]
        })
        // 2. Conflict check returns existing appointment
        .mockResolvedValueOnce({
          rows: [{ id: 101, appointment_date: new Date('2026-11-20T10:00:00Z') }]
        });

      const response = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${tokenFor('receptionist')}`)
        .send({
          patientId: 42,
          doctorId: 5,
          appointmentDate: '2026-11-20T10:10:00Z',
          reason: 'Follow-up cardiology consultation'
        });

      expect(response.status).toBe(409);
      expect(response.body.message).toMatch(/already has an appointment scheduled near this time slot/i);
    });
  });

  describe('4. OPD Queue Operations (Transfer, Skip, Recall)', () => {
    test('transfers patient token to another department and doctor', async () => {
      testClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ id: 88, queue_token: 'OPD-042', department_id: 1, status: 'waiting', encounter_id: 501 }]
        }) // SELECT for update
        .mockResolvedValueOnce({
          rows: [{ id: 88, queue_token: 'OPD-042', department_id: 2, status: 'waiting' }]
        }) // UPDATE
        .mockResolvedValueOnce({}) // workflow status history insert
        .mockResolvedValueOnce({}); // COMMIT

      const response = await request(app)
        .post('/api/opd/transfer')
        .set('Authorization', `Bearer ${tokenFor('nurse')}`)
        .send({
          queue_id: 88,
          new_department_id: 2,
          new_room: 'Room 3',
          reason: 'Referred to pediatrics'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.queue.department_id).toBe(2);
    });

    test('skips patient token in queue', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ id: 88, queue_token: 'OPD-042', status: 'skipped' }]
      });

      const response = await request(app)
        .post('/api/opd/88/skip')
        .set('Authorization', `Bearer ${tokenFor('doctor')}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.queue.status).toBe('skipped');
    });

    test('recalls patient token with room announcement', async () => {
      pool.query
        .mockResolvedValueOnce({
          rows: [{ id: 88, queue_token: 'OPD-042', token_number: 42, department_name: 'General OPD', consultation_room: 'Room 1' }]
        })
        .mockResolvedValueOnce({
          rows: [{ id: 88, queue_token: 'OPD-042', status: 'called', consultation_room: 'Room 1' }]
        });

      const response = await request(app)
        .post('/api/opd/88/recall')
        .set('Authorization', `Bearer ${tokenFor('doctor')}`)
        .send({ consultation_room: 'Room 1' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.callEvent.queueToken).toBe('OPD-042');
    });
  });

  describe('5. Referral Management', () => {
    test('creates internal and external referrals', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ id: 7 }] }) // doctor lookup by user_id
        .mockResolvedValueOnce({
          rows: [{
            id: 15,
            patient_id: 42,
            referral_type: 'external',
            receiving_facility: 'Tikur Anbessa Specialized Hospital',
            urgency: 'urgent',
            reason: 'Cardiothoracic surgical evaluation',
            status: 'pending'
          }]
        });

      const response = await request(app)
        .post('/api/referrals')
        .set('Authorization', `Bearer ${tokenFor('doctor')}`)
        .send({
          patient_id: 42,
          referral_type: 'external',
          receiving_facility: 'Tikur Anbessa Specialized Hospital',
          urgency: 'urgent',
          reason: 'Cardiothoracic surgical evaluation'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.referral.receiving_facility).toBe('Tikur Anbessa Specialized Hospital');
    });

    test('retrieves referral statistics', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{
          total_referrals: '18',
          internal_count: '11',
          external_count: '7',
          emergency_count: '2',
          pending_count: '5',
          completed_count: '13'
        }]
      });

      const response = await request(app)
        .get('/api/referrals/stats')
        .set('Authorization', `Bearer ${tokenFor('doctor')}`);

      expect(response.status).toBe(200);
      expect(response.body.data.stats.total_referrals).toBe('18');
    });
  });

  describe('6. OPD Department Settings', () => {
    test('retrieves and updates OPD settings', async () => {
      pool.query
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            department_id: 1,
            department_name: 'General OPD',
            appointment_duration_minutes: 20,
            consultation_fee: '100.00',
            queue_prefix: 'OPD'
          }]
        });

      const response = await request(app)
        .get('/api/opd/settings')
        .set('Authorization', `Bearer ${tokenFor('admin')}`);

      expect(response.status).toBe(200);
      expect(response.body.data.settings[0].department_name).toBe('General OPD');
    });
  });
});
