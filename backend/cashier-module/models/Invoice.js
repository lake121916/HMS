const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Patient = require('./Patient');

const Invoice = sequelize.define('Invoice', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  invoiceNumber: { type: DataTypes.STRING(50), allowNull: false, unique: true, field: 'invoice_number' },
  accountNumber: { type: DataTypes.STRING(50), allowNull: false, field: 'account_number' },
  encounterNumber: { type: DataTypes.STRING(50), allowNull: false, field: 'encounter_number' },
  totalAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, field: 'total_amount' },
  paidAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: '0.00', field: 'paid_amount' },
  balance: { type: DataTypes.DECIMAL(12, 2), allowNull: false, field: 'balance' },
  status: { type: DataTypes.ENUM('UNPAID', 'PARTIAL', 'PAID', 'CANCELLED'), allowNull: false, defaultValue: 'UNPAID' },
  payerType: { type: DataTypes.ENUM('SELF', 'INSURANCE', 'EMPLOYER', 'GOV'), allowNull: false, defaultValue: 'SELF', field: 'payer_type' },
  insurancePlanId: { type: DataTypes.STRING(80), field: 'insurance_plan_id' },
}, { tableName: 'cashier_invoices', underscored: true });

Patient.hasMany(Invoice, { foreignKey: 'accountNumber', sourceKey: 'accountNumber', as: 'invoices' });
Invoice.belongsTo(Patient, { foreignKey: 'accountNumber', targetKey: 'accountNumber', as: 'patient' });

module.exports = Invoice;
