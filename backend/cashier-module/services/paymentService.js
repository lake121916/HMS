const crypto = require('crypto');
const Decimal = require('decimal.js');
const sequelize = require('../config/database');
const { Payment, Reconciliation } = require('../models');
const { AppError } = require('../utils/errors');
const { verifyAccount } = require('./accountService');
const { getInvoice } = require('./invoiceService');
const telebirr = require('../gateways/telebirr');
const chapa = require('../gateways/chapa');
const cbeBirr = require('../gateways/cbeBirr');

const gatewayByMethod = { TELEBIRR: telebirr, CHAPA: chapa, CBE_BIRR: cbeBirr };
const methods = ['CASH', 'TELEBIRR', 'CBE_BIRR', 'CHAPA', 'INSURANCE', 'BANK_TRANSFER'];

function assertMethod(method) {
  if (!methods.includes(method)) throw new AppError('INVALID_PAYMENT_METHOD', `Unsupported payment method: ${method}`, 400);
}

async function processPayment(payload, cashierId) {
  const { accountNumber, lastName, dob, invoiceNumber, paymentMethod, transactionRef, idempotencyKey } = payload;
  assertMethod(paymentMethod);
  if (!idempotencyKey) throw new AppError('IDEMPOTENCY_REQUIRED', 'Idempotency-Key is required', 400);

  const existing = await Payment.findOne({ where: { idempotencyKey } });
  if (existing) return existing;

  const account = await verifyAccount(accountNumber, lastName, dob);
  const amount = new Decimal(payload.amount || 0);
  if (!amount.gt(0)) throw new AppError('INVALID_AMOUNT', 'Amount must be greater than zero', 400);

  const invoice = await getInvoice(invoiceNumber, accountNumber);
  const invoiceBalance = new Decimal(invoice.balance);
  let settledAmount = amount;
  let metadata = { identityVerified: true };
  let gatewayResult = { status: 'SUCCESS', ref: `CASH-${Date.now()}`, raw: {} };

  if (amount.gt(invoiceBalance)) throw new AppError('AMOUNT_EXCEEDS_BALANCE', 'Amount exceeds invoice balance', 400);

  if (paymentMethod === 'INSURANCE') {
    const coveredAmount = new Decimal(payload.coveredAmount || 0);
    const patientResponsibility = new Decimal(payload.patientResponsibility || 0);
    if (!coveredAmount.gte(0) || !patientResponsibility.gte(0) || !coveredAmount.plus(patientResponsibility).eq(amount)) {
      throw new AppError('INVALID_INSURANCE_SPLIT', 'coveredAmount plus patientResponsibility must equal amount', 400);
    }
    metadata = { ...metadata, coveredAmount: coveredAmount.toFixed(2), patientResponsibility: patientResponsibility.toFixed(2), insurancePlanId: invoice.insurancePlanId };
  } else if (gatewayByMethod[paymentMethod]) {
    gatewayResult = await gatewayByMethod[paymentMethod].verify({ transactionRef, amount: amount.toFixed(2), currency: 'ETB' });
    if (gatewayResult.status !== 'SUCCESS') throw new AppError('GATEWAY_FAILED', `${paymentMethod} verification failed`, 502, gatewayResult.raw);
  } else if (paymentMethod === 'BANK_TRANSFER') {
    if (!transactionRef) throw new AppError('TRANSACTION_REF_REQUIRED', 'Bank transfer reference is required', 400);
    metadata = { ...metadata, verification: 'manual_bank_reconciliation_pending' };
  }

  const transactionId = `AKH-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  return sequelize.transaction(async (transaction) => {
    const lockedInvoice = await getInvoice(invoiceNumber, accountNumber, transaction);
    const lockedBalance = new Decimal(lockedInvoice.balance);
    if (amount.gt(lockedBalance)) throw new AppError('AMOUNT_EXCEEDS_BALANCE', 'Amount exceeds the current invoice balance', 409);

    const paidAmount = new Decimal(lockedInvoice.paidAmount).plus(settledAmount);
    const balance = new Decimal(lockedInvoice.totalAmount).minus(paidAmount);
    const status = balance.eq(0) ? 'PAID' : 'PARTIAL';

    const payment = await Payment.create({ transactionId, accountNumber, invoiceNumber, amount: amount.toFixed(2), currency: 'ETB', paymentMethod, transactionRef: gatewayResult.ref || transactionRef, cashierId, status: 'SUCCESS', idempotencyKey, metadata: { ...metadata, gateway: gatewayResult.raw } }, { transaction });
    await lockedInvoice.update({ paidAmount: paidAmount.toFixed(2), balance: Decimal.max(balance, 0).toFixed(2), status }, { transaction });
    await Reconciliation.create({ transactionId, accountNumber, invoiceNumber, amountPaid: settledAmount.toFixed(2), remainingBalance: Decimal.max(balance, 0).toFixed(2), notes: paymentMethod === 'INSURANCE' ? 'Insurance split recorded' : null }, { transaction });
    return payment;
  });
}

module.exports = { processPayment };
