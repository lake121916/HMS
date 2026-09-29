const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/server');
const pool = require('../src/config/database');

jest.mock('../src/config/database', () => {
  const mClient = {
    query: jest.fn().mockResolvedValue({ rows: [{ count: 1 }] }),
    release: jest.fn()
  };
  return {
    query: jest.fn().mockResolvedValue({ rows: [{ count: 1 }] }),
    connect: jest.fn().mockResolvedValue(mClient),
    on: jest.fn()
  };
});

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

describe('Auth & Core API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    pool.query.mockResolvedValue({ rows: [{ count: 1 }] });
  });

  describe('GET /health', () => {
    it('should return 200 OK status', async () => {
      const response = await request(app).get('/health');
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should return 400 if email or password is missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: '' });

      expect(response.statusCode).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 for non-existent user email', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] }); // User not found

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@hospital.com', password: 'Password123!' });

      expect(response.statusCode).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/invalid email or password/i);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should return 401 if authorization header is missing', async () => {
      const response = await request(app).post('/api/auth/logout');
      expect(response.statusCode).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 if invalid token is provided', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer invalid_token_123');

      expect(response.statusCode).toBe(401);
    });

    it('should successfully logout with valid token', async () => {
      const testToken = jwt.sign({ id: 10, role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
