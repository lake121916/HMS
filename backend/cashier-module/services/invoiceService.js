const { Invoice } = require('../models');
const { AppError } = require('../utils/errors');

async function getInvoice(invoiceNumber, accountNumber, transaction = undefined) {
  const invoice = await Invoice.findOne({ where: { invoiceNumber }, transaction, lock: transaction ? transaction.LOCK.UPDATE : undefined });
  if (!invoice) throw new AppError('INVOICE_NOT_FOUND', 'Invoice was not found', 404);
  if (invoice.accountNumber !== accountNumber) throw new AppError('INVOICE_ACCOUNT_MISMATCH', 'Invoice does not belong to this account', 403);
  if (invoice.status === 'PAID') throw new AppError('INVOICE_ALREADY_PAID', 'Invoice is already paid', 409);
  if (invoice.status === 'CANCELLED') throw new AppError('INVOICE_CANCELLED', 'Invoice is cancelled', 409);
  return invoice;
}

module.exports = { getInvoice };
