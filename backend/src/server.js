require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const pool = require('./config/database');
const { errorHandler, notFound } = require('./middleware/error');
const auditLog = require('./middleware/audit');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL || 'http://localhost:3000'
    : ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000'],
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
app.use('/api/notifications', auditLog);
app.use('/api/ai', auditLog);
app.use('/api/reports', auditLog);
app.use('/api/admin', auditLog);
app.use('/api/blood-bank', auditLog);
app.use('/api/insurance', auditLog);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
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
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/telehealth', require('./routes/telehealth'));
app.use('/api/blood-bank', require('./routes/bloodBank'));
app.use('/api/insurance', require('./routes/insurance'));

// Error handling
app.use(notFound);
app.use(errorHandler);

const http = require('http');
const socketService = require('./services/socketService');

const server = http.createServer(app);

// Initialize Socket.io
socketService.init(server);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});

module.exports = server;
