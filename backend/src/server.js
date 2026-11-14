const path = require('path');
// Support loading from backend/.env or root .env
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const pool = require('./config/database');
const { errorHandler, notFound } = require('./middleware/error');
const auditLog = require('./middleware/auditLog');

const app = express();

// Security middleware
app.use(helmet());
// CORS origin resolver for development, staging, and cloud production
const getCorsOrigins = () => {
  const allowedOrigins = ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000'];
  if (process.env.FRONTEND_URL) {
    process.env.FRONTEND_URL.split(',').forEach(url => {
      const clean = url.trim().replace(/\/$/, '');
      if (clean) allowedOrigins.push(clean);
    });
  }
  return (origin, callback) => {
    // Allow non-browser requests (mobile apps, curl, server-to-server) or matching origins
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app') || origin.endsWith('.onrender.com') || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(null, true); // Permissive fallback to prevent breaking defense/demo
    }
  };
};

app.use(cors({
  origin: getCorsOrigins(),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting — general API limiter
const limiter = rateLimit({
  windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 500,
  message: { success: false, message: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limiter for auth routes only (prevent brute-force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, message: 'Too many login attempts, please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth', authLimiter);
app.use('/api/', limiter);

// Logging
app.use(morgan('combined'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Audit logging (skip auth routes)
app.use('/api/patients', auditLog);
app.use('/api/doctors', auditLog);
app.use('/api/nurses', auditLog);
app.use('/api/appointments', auditLog);
app.use('/api/vitals', auditLog);
app.use('/api/diagnoses', auditLog);
app.use('/api/prescriptions', auditLog);
app.use('/api/lab-tests', auditLog);
app.use('/api/medicines', auditLog);
app.use('/api/inventory', auditLog);
app.use('/api/beds', auditLog);
app.use('/api/admissions', auditLog);
app.use('/api/invoices', auditLog);
app.use('/api/payments', auditLog);
app.use('/api/cashier', auditLog);
app.use('/api/notifications', auditLog);
app.use('/api/ai', auditLog);
app.use('/api/reports', auditLog);
app.use('/api/admin', auditLog);
app.use('/api/blood-bank', auditLog);
app.use('/api/insurance', auditLog);
app.use('/api/portal', auditLog);
app.use('/api/workflow', auditLog);
app.use('/api/fhir', auditLog);
app.use('/api/encounters', auditLog);
app.use('/api/radiology-orders', auditLog);
app.use('/api/procedures', auditLog);
app.use('/api/services', auditLog);
app.use('/api/pharmacy', auditLog);
app.use('/api/consultations', auditLog);
app.use('/api/opd', auditLog);

// Root status and Health check endpoints
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    system: 'AI-Based Smart Hospital Management System',
    hospital: 'Alem Ketema Enat Hospital',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/departments', require('./routes/departments'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/doctors', require('./routes/doctors'));
app.use('/api/nurses', require('./routes/nurses'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/vitals', require('./routes/vitals'));
app.use('/api/diagnoses', require('./routes/diagnoses'));
app.use('/api/prescriptions', require('./routes/prescriptions'));
app.use('/api/lab-tests', require('./routes/labTests'));
app.use('/api/medicines', require('./routes/medicines'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/beds', require('./routes/beds'));
app.use('/api/admissions', require('./routes/admissions'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/cashier', require('./routes/cashier'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/telehealth', require('./routes/telehealth'));
app.use('/api/blood-bank', require('./routes/bloodBank'));
app.use('/api/insurance', require('./routes/insurance'));
app.use('/api/portal', require('./routes/portal'));
app.use('/api/workflow', require('./routes/workflow'));
app.use('/api/fhir', require('./routes/fhir'));
// ── New workflow routes ──────────────────────────────────────
app.use('/api/encounters', require('./routes/encounters'));
app.use('/api/radiology-orders', require('./routes/radiologyOrders'));
app.use('/api/procedures', require('./routes/procedures'));
app.use('/api/services', require('./routes/services'));
app.use('/api/pharmacy', require('./routes/pharmacy'));
app.use('/api/consultations', require('./routes/consultations'));
app.use('/api/opd', require('./routes/opdQueue'));
app.use('/api/emergency', auditLog, require('./routes/emergency'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/shifts', require('./routes/shifts'));
app.use('/api/workload', require('./routes/workload'));
app.use('/api/sync', require('./routes/sync'));
app.use('/api/board', require('./routes/boardAdmin'));

// Error handling
app.use(notFound);
app.use(errorHandler);

const http = require('http');
const socketService = require('./services/socketService');
const { sendAppointmentReminders, startTelegramPolling } = require('./services/notificationService');

const server = http.createServer(app);

// Initialize Socket.io
socketService.init(server);

const PORT = parseInt(process.env.PORT, 10) || 5000;
const HOST = process.env.HOST || '0.0.0.0';

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
    sendAppointmentReminders().catch(error => console.error('Reminder worker error:', error.message));
    startTelegramPolling().catch(error => console.error('Telegram bot error:', error.message));
    setInterval(() => {
      sendAppointmentReminders().catch(error => console.error('Reminder worker error:', error.message));
    }, 60 * 60 * 1000);
  });
}

module.exports = app;

