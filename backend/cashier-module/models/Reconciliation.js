const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Reconciliation = sequelize.define('Reconciliation', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  transactionId: { type: DataTypes.STRING(80), allowNull: false, field: 'transaction_id' },
  accountNumber: { type: DataTypes.STRING(50), allowNull: false, field: 'account_number' },
  invoiceNumber: { type: DataTypes.STRING(50), allowNull: false, field: 'invoice_number' },
  amountPaid: { type: DataTypes.DECIMAL(12, 2), allowNull: false, field: 'amount_paid' },
  remainingBalance: { type: DataTypes.DECIMAL(12, 2), allowNull: false, field: 'remaining_balance' },
  notes: { type: DataTypes.TEXT },
}, { tableName: 'cashier_reconciliations', underscored: true });

module.exports = Reconciliation;
