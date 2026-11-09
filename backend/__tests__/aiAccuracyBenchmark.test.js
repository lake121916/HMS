const request = require('supertest');
const app = require('../src/server');
const jwt = require('jsonwebtoken');
const pool = require('../src/config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

const doctorToken = jwt.sign(
  { id: 2, email: 'dr.dawit@hospital.gov.et', role: 'doctor', firstName: 'Dawit' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

describe('AI Clinical Decision Support & Accuracy Benchmark Module', () => {
  afterAll(async () => {
    // Avoid open handles
  });

  describe('1. GET /api/ai/benchmark-metrics', () => {
    it('rejects unauthorized access without token', async () => {
      const res = await request(app).get('/api/ai/benchmark-metrics');
      expect(res.statusCode).toBe(401);
    });

    it('returns empirical clinical evaluation metrics and 10 disease profiles', async () => {
      const res = await request(app)
        .get('/api/ai/benchmark-metrics')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('summary');
      expect(res.body.data).toHaveProperty('allergySafetyBenchmark');
      expect(res.body.data).toHaveProperty('diseases');

      const { summary, allergySafetyBenchmark, diseases } = res.body.data;
      expect(summary.totalCases).toBe(120);
      expect(summary.top1Accuracy).toBeGreaterThanOrEqual(95);
      expect(summary.top3Accuracy).toBeGreaterThanOrEqual(98);
      expect(summary.macroSensitivity).toBeGreaterThanOrEqual(95);
      expect(summary.macroSpecificity).toBeGreaterThanOrEqual(95);
      expect(summary.f1Score).toBeGreaterThanOrEqual(0.95);

      expect(allergySafetyBenchmark.interceptRate).toBe(100);
      expect(allergySafetyBenchmark.anaphylaxisHardStopsActive).toBe(true);

      expect(diseases.length).toBe(10);
      const malaria = diseases.find(d => d.name.includes('Malaria'));
      expect(malaria).toBeDefined();
      expect(malaria.icdCode).toBe('B50.9');
      expect(malaria.top1Accuracy).toBe(100);
    });
  });

  describe('2. POST /api/ai/predict-disease', () => {
    it('accurately predicts Acute Malaria with fever, rigors, and chills', async () => {
      const res = await request(app)
        .post('/api/ai/predict-disease')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          symptoms: ['high fever', 'chills', 'rigors', 'profuse sweating'],
          vitals: { temperature: 39.4 }
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('predictions');
      expect(Array.isArray(res.body.data.predictions)).toBe(true);

      const top = res.body.data.predictions[0];
      expect(top.disease).toBe('Acute Plasmodium Falciparum Malaria');
      expect(top.icdCode).toBe('B50.9');
      expect(top.confidence).toBeGreaterThanOrEqual(0.85);
      expect(top.matchedCriteria.length).toBeGreaterThan(0);
      expect(top.differentialDiagnoses.length).toBeGreaterThanOrEqual(1);
    });

    it('accurately predicts Acute Bacterial Pneumonia with cough, pleuritic pain, and low SpO2', async () => {
      const res = await request(app)
        .post('/api/ai/predict-disease')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          symptoms: ['productive cough', 'rust sputum', 'fever', 'pleuritic chest pain'],
          vitals: { temperature: 39.1, oxygenSaturation: 91 }
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      const top = res.body.data.predictions[0];
      expect(top.disease).toBe('Acute Bacterial Pneumonia');
      expect(top.icdCode).toBe('J18.9');
      expect(top.confidence).toBeGreaterThanOrEqual(0.85);
    });
  });
});
