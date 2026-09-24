const { Patient, Invoice, Payment } = require('../models');
const { verifyAccount } = require('../services/accountService');
const { getInvoice } = require('../services/invoiceService');
const { processPayment } = require('../services/paymentService');

async function verifyAccountHandler(req, res, next) {
  try {
    const patient = await verifyAccount(req.params.accountNumber, req.query.lastName, req.query.dob);
    res.json({ success: true, data: { accountNumber: patient.accountNumber, firstName: patient.firstName, lastName: patient.lastName, status: patient.status } });
  } catch (error) { next(error); }
}

async function getInvoiceHandler(req, res, next) {
  try {
    const invoice = await getInvoice(req.params.invoiceNumber, req.params.accountNumber);
    res.json({ success: true, data: invoice });
  } catch (error) { next(error); }
}

async function processPaymentHandler(req, res, next) {
  try {
    const payment = await processPayment(req.body, req.cashier.id);
    res.status(201).json({ success: true, data: payment });
  } catch (error) { next(error); }
}

async function getReceiptHandler(req, res, next) {
  try {
    const payment = await Payment.findOne({ where: { transactionId: req.params.transactionId }, include: [{ model: Invoice, as: 'invoice', required: false }, { model: Patient, as: 'patient', required: false }] });
    if (!payment) return res.status(404).json({ success: false, code: 'PAYMENT_NOT_FOUND', message: 'Payment receipt was not found' });
    res.json({
      success: true,
      data: {
        hospital: { name: 'Alem Ketema Enat Hospital', currency: payment.currency },
        receipt: { transactionId: payment.transactionId, paymentMethod: payment.paymentMethod, transactionRef: payment.transactionRef, amount: payment.amount, status: payment.status, paidAt: payment.createdAt, cashierId: payment.cashierId },
        accountNumber: payment.accountNumber,
        invoiceNumber: payment.invoiceNumber,
        metadata: payment.metadata,
      },
    });
  } catch (error) { next(error); }
}

module.exports = { verifyAccountHandler, getInvoiceHandler, processPaymentHandler, getReceiptHandler };
