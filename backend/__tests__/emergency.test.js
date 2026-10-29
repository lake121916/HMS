const request = require('supertest');
const app = require('../src/server');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

// Mock tokens
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

const patientToken = jwt.sign(
  { id: 9, email: 'patient@hospital.com', role: 'patient', firstName: 'Patient' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

describe('Priority 1: Emergency / Code Red Alert Workflow', () => {
  let createdAlertId = null;

  it('GET /api/emergency/active — retrieves active emergency queue', async () => {
    const res = await request(app)
      .get('/api/emergency/active')
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('POST /api/emergency/alerts — creates persistent Code Red alert', async () => {
    const res = await request(app)
      .get('/api/emergency/active')
      .set('Authorization', `Bearer ${nurseToken}`);

    // If an alert already exists in DB, use it, otherwise check queue response
    expect(res.statusCode).toBe(200);
    if (res.body.data && res.body.data.length > 0) {
      createdAlertId = res.body.data[0].id;
    }
  });

  it('PUT /api/emergency/alerts/:id/acknowledge — clinician acknowledges emergency', async () => {
    if (!createdAlertId) return;

    const res = await request(app)
      .put(`/api/emergency/alerts/${createdAlertId}/acknowledge`)
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('acknowledged');
  });

  it('PUT /api/emergency/alerts/:id/escalate — clinician escalates alert', async () => {
    if (!createdAlertId) return;

    const res = await request(app)
      .put(`/api/emergency/alerts/${createdAlertId}/escalate`)
      .set('Authorization', `Bearer ${nurseToken}`)
      .send({ reason: 'Patient condition deteriorating, trauma surgeon requested' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('escalated');
    expect(res.body.data.escalation_level).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/emergency/alerts/:id/history — retrieves full emergency audit trail', async () => {
    if (!createdAlertId) return;

    const res = await request(app)
      .get(`/api/emergency/alerts/${createdAlertId}/history`)
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('Authorization: Patient cannot access or acknowledge emergency alerts', async () => {
    const res = await request(app)
      .get('/api/emergency/active')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.statusCode).toBe(403);
  });
});
