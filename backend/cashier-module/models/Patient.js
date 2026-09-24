const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Patient = sequelize.define('Patient', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  accountNumber: { type: DataTypes.STRING(50), allowNull: false, unique: true, field: 'account_number' },
  firstName: { type: DataTypes.STRING(100), allowNull: false, field: 'first_name' },
  lastName: { type: DataTypes.STRING(100), allowNull: false, field: 'last_name' },
  dob: { type: DataTypes.DATEONLY, allowNull: false },
  phone: { type: DataTypes.STRING(30) },
  status: { type: DataTypes.ENUM('ACTIVE', 'INACTIVE', 'ON_HOLD'), allowNull: false, defaultValue: 'ACTIVE' },
}, { tableName: 'cashier_patients', underscored: true });

module.exports = Patient;
