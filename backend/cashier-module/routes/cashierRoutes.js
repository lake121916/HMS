const express = require('express');
const auth = require('../middleware/auth');
const idempotency = require('../middleware/idempotency');
const controller = require('../controllers/cashierController');

const router = express.Router();
router.get('/verify-account/:accountNumber', auth, controller.verifyAccountHandler);
router.get('/invoice/:invoiceNumber/:accountNumber', auth, controller.getInvoiceHandler);
router.post('/payment', auth, idempotency, controller.processPaymentHandler);
router.get('/receipt/:transactionId', auth, controller.getReceiptHandler);

module.exports = router;
