/**
 * Smart Queue & Token Management Center Test Suite
 * Validates Queue Command Center Summary, Counter Calls, and Real-Time Announcement APIs
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');

const mockClient = {
  query: jest.fn(),
  release: jest.fn()
};

jest.mock('../src/config/database', () => ({
  query: jest.fn().mockResolvedValue({ rows: [] }),
  connect: jest.fn().mockResolvedValue(mockClient),
  on: jest.fn()
}));

jest.mock('../src/services/billingService', () => ({
  getOrCreateInvoice: jest.fn().mockResolvedValue({ id: 101 }),
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
const socketService = require('../src/services/socketService');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const tokenFor = (role, id = 99) => jwt.sign({ id, email: `${role}@hospital.com`, role }, JWT_SECRET, { expiresIn: '1h' });

describe('Smart Queue & Token Management Command Center APIs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    pool.connect.mockResolvedValue(mockClient);
    pool.query.mockResolvedValue({ rows: [] });
    mockClient.query.mockResolvedValue({ rows: [] });
  });

  describe('GET /api/opd/summary', () => {
    it('returns high-fidelity command center summary matching the Drittech model', async () => {
      // Mock queries for summary
      pool.query
        // 1. calledRes
        .mockResolvedValueOnce({
          rows: [{
            queue_token: 'A-042',
            counter_number: 'Counter 3',
            service_category: 'General OPD',
            called_at: new Date().toISOString()
          }]
        })
        // 2. waitingRes
        .mockResolvedValueOnce({
          rows: [
            { queue_token: 'A-043', counter_number: 'Counter 2', service_category: 'General OPD', priority: 'normal' },
            { queue_token: 'B-118', counter_number: 'Counter 5', service_category: 'Neurology', priority: 'normal' }
          ]
        })
        // 3. kpiRes
        .mockResolvedValueOnce({
          rows: [{
            total_today: '142',
            served_today: '42',
            waiting_now: '68',
            avg_wait_time: '28'
          }]
        })
        // 4. docRes
        .mockResolvedValueOnce({
          rows: [
            { name: 'Awoke Desta', department: 'General Physician', waiting_count: '14' },
            { name: 'Biniam Assefa', department: 'Cardiology', waiting_count: '9' }
          ]
        })
        // 5. pharmRes
        .mockResolvedValueOnce({
          rows: [
            { id: 1, counter_name: 'Pharmacy 1', status: 'serving', current_token: 'P-032', wait_time_minutes: 10 },
            { id: 2, counter_name: 'Pharmacy 2', status: 'serving', current_token: 'P-033', wait_time_minutes: 12 },
            { id: 3, counter_name: 'Pharmacy 3', status: 'idle', current_token: null, wait_time_minutes: 0 }
          ]
        })
        // 6. allCountersRes
        .mockResolvedValueOnce({
          rows: [
            { id: 1, counter_name: 'Pharmacy 1', counter_type: 'pharmacy', status: 'serving', current_token: 'P-032' },
            { id: 5, counter_name: 'Counter 1', counter_type: 'opd', status: 'serving', current_token: 'A-044' }
          ]
        });

      const res = await request(app).get('/api/opd/summary');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.hero.nowServing.token).toBe('A-042');
      expect(res.body.data.hero.nowServing.counter).toBe('COUNTER 3');
      expect(res.body.data.hero.waitingTokens.length).toBeGreaterThanOrEqual(2);
      expect(res.body.data.kpis.totalPatientsToday).toBe(142);
      expect(res.body.data.kpis.servedToday).toBe(42);
      expect(res.body.data.kpis.waitingNow).toBe(68);
      expect(res.body.data.hourlyWaitCurve).toBeDefined();
      expect(res.body.data.departmentQueue.breakdown.length).toBe(6);
      expect(res.body.data.pharmacyCounters.length).toBe(3);
    });
  });

  describe('GET /api/opd/counters', () => {
    it('returns list of configured service counters', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          { id: 1, counter_name: 'Counter 1', counter_type: 'opd', status: 'serving' },
          { id: 2, counter_name: 'Pharmacy 1', counter_type: 'pharmacy', status: 'idle' }
        ]
      });

      const res = await request(app).get('/api/opd/counters');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
    });
  });

  describe('POST /api/opd/call-counter-token', () => {
    it('broadcasts socket event and updates queue and counter records', async () => {
      const nurseToken = tokenFor('nurse', 105);

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ // UPDATE opd_queues
          rows: [{
            id: 88,
            queue_token: 'A-043',
            counter_number: 'Counter 2',
            status: 'called'
          }]
        })
        .mockResolvedValueOnce({}) // UPDATE service_counters
        .mockResolvedValueOnce({}); // COMMIT

      const res = await request(app)
        .post('/api/opd/call-counter-token')
        .set('Authorization', `Bearer ${nurseToken}`)
        .send({
          token: 'A-043',
          counter_name: 'Counter 2',
          service_category: 'General OPD'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('A-043');
      expect(socketService.broadcast).toHaveBeenCalledWith('opd-patient-called', expect.objectContaining({
        queueToken: 'A-043',
        counterRoom: 'Counter 2'
      }));
    });

    it('rejects call request when token or counter is missing', async () => {
      const nurseToken = tokenFor('nurse', 105);

      const res = await request(app)
        .post('/api/opd/call-counter-token')
        .set('Authorization', `Bearer ${nurseToken}`)
        .send({
          token: ''
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/opd/counters/:id', () => {
    it('updates counter status and broadcasts update', async () => {
      const staffToken = tokenFor('doctor', 106);

      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 3,
          counter_name: 'Pharmacy 3',
          status: 'serving',
          current_token: 'P-099',
          wait_time_minutes: 10
        }]
      });

      const res = await request(app)
        .put('/api/opd/counters/3')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          status: 'serving',
          current_token: 'P-099',
          wait_time_minutes: 10
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.current_token).toBe('P-099');
      expect(socketService.broadcast).toHaveBeenCalledWith('opd-queue-update', expect.objectContaining({
        type: 'counter_updated'
      }));
    });
  });
});
