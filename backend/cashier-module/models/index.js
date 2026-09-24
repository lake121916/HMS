const Patient = require('./Patient');
const Invoice = require('./Invoice');
const Payment = require('./Payment');
const Reconciliation = require('./Reconciliation');

Payment.belongsTo(Invoice, { foreignKey: 'invoiceNumber', targetKey: 'invoiceNumber', as: 'invoice' });
Payment.belongsTo(Patient, { foreignKey: 'accountNumber', targetKey: 'accountNumber', as: 'patient' });

module.exports = { Patient, Invoice, Payment, Reconciliation };
