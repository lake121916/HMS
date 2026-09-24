require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const sequelize = require('./config/database');
require('./models');
const cashierRoutes = require('./routes/cashierRoutes');
const { AppError } = require('./utils/errors');

const app = express();
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use('/api/cashier', cashierRoutes);
app.get('/health', (req, res) => res.json({ status: 'OK', service: 'cashier-module' }));
app.use((req, res) => res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Route not found' }));
app.use((error, req, res, next) => {
  const normalized = error instanceof AppError ? error : new AppError('INTERNAL_ERROR', 'Internal server error', 500);
  if (!(error instanceof AppError)) console.error(error);
  res.status(normalized.status).json({ success: false, code: normalized.code, message: normalized.message, ...(normalized.details ? { details: normalized.details } : {}) });
});

const port = Number(process.env.PORT || 5001);

async function start() {
  await sequelize.authenticate();
  await sequelize.sync();
  app.listen(port, () => console.log(`Alem Ketema Enat cashier module listening on port ${port}`));
}

if (require.main === module) {
  start().catch(error => { console.error('Cashier module failed to start:', error); process.exit(1); });
}

module.exports = { app, start };
