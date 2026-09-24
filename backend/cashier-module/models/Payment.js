const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Payment = sequelize.define('Payment', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  transactionId: { type: DataTypes.STRING(80), allowNull: false, unique: true, field: 'transaction_id' },
  accountNumber: { type: DataTypes.STRING(50), allowNull: false, field: 'account_number' },
  invoiceNumber: { type: DataTypes.STRING(50), allowNull: false, field: 'invoice_number' },
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'ETB' },
  paymentMethod: { type: DataTypes.ENUM('CASH', 'TELEBIRR', 'CBE_BIRR', 'CHAPA', 'INSURANCE', 'BANK_TRANSFER'), allowNull: false, field: 'payment_method' },
  transactionRef: { type: DataTypes.STRING(255), field: 'transaction_ref' },
  cashierId: { type: DataTypes.STRING(100), allowNull: false, field: 'cashier_id' },
  status: { type: DataTypes.ENUM('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'), allowNull: false, defaultValue: 'PENDING' },
  idempotencyKey: { type: DataTypes.STRING(120), allowNull: false, unique: true, field: 'idempotency_key' },
  metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
}, { tableName: 'cashier_payments', underscored: true });

module.exports = Payment;
