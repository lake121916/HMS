const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { sendSuccess, sendError, handleAsync } = require('../utils/response');

// Create Payment Intent
const createPaymentIntent = handleAsync(async (req, res) => {
  const { amount, currency = 'usd', invoiceId, patientId } = req.body;

  // Validate amount (in cents)
  if (!amount || amount <= 0) {
    return sendError(res, 'Invalid amount', 400);
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      metadata: {
        invoiceId,
        patientId
      },
      description: `Hospital Invoice Payment - Invoice #${invoiceId}`
    });

    sendSuccess(res, {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency
    });
  } catch (error) {
    console.error('Stripe Error:', error);
    sendError(res, error.message, 500);
  }
});

// Confirm Payment
const confirmPayment = handleAsync(async (req, res) => {
  const { paymentIntentId } = req.body;

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      // Generate PDF receipt
      const receiptPath = await generateReceipt(paymentIntent);

      sendSuccess(res, {
        status: paymentIntent.status,
        receiptUrl: `/api/payments/receipt/${paymentIntentId}`,
        receiptPath
      });
    } else {
      sendError(res, 'Payment not successful', 400);
    }
  } catch (error) {
    console.error('Payment Confirmation Error:', error);
    sendError(res, error.message, 500);
  }
});

// Generate PDF Receipt
async function generateReceipt(paymentIntent) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const receiptDir = path.join(__dirname, '../../receipts');
    
    // Create receipts directory if it doesn't exist
    if (!fs.existsSync(receiptDir)) {
      fs.mkdirSync(receiptDir, { recursive: true });
    }

    const receiptPath = path.join(receiptDir, `receipt_${paymentIntent.id}.pdf`);
    const stream = fs.createWriteStream(receiptPath);

    doc.pipe(stream);

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text('Hospital Management System', { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text('Payment Receipt', { align: 'center' });
    doc.moveDown();

    // Line
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    // Receipt Details
    doc.fontSize(12).font('Helvetica');
    doc.text(`Receipt ID: ${paymentIntent.id}`);
    doc.text(`Date: ${new Date(paymentIntent.created * 1000).toLocaleDateString()}`);
    doc.text(`Time: ${new Date(paymentIntent.created * 1000).toLocaleTimeString()}`);
    doc.moveDown();

    // Payment Details
    doc.text(`Invoice ID: ${paymentIntent.metadata.invoiceId || 'N/A'}`);
    doc.text(`Patient ID: ${paymentIntent.metadata.patientId || 'N/A'}`);
    doc.text(`Amount: $${(paymentIntent.amount / 100).toFixed(2)} ${paymentIntent.currency.toUpperCase()}`);
    doc.text(`Status: ${paymentIntent.status.toUpperCase()}`);
    doc.moveDown();

    // Line
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    // Footer
    doc.fontSize(10).text('Thank you for your payment.', { align: 'center' });
    doc.text('For any queries, please contact our billing department.', { align: 'center' });
    doc.moveDown();
    doc.text('This is a computer-generated receipt. No signature required.', { align: 'center' });

    doc.end();

    stream.on('finish', () => resolve(receiptPath));
    stream.on('error', reject);
  });
}

// Download Receipt
const downloadReceipt = handleAsync(async (req, res) => {
  const { paymentIntentId } = req.params;
  const receiptPath = path.join(__dirname, '../../receipts', `receipt_${paymentIntentId}.pdf`);

  if (!fs.existsSync(receiptPath)) {
    return sendError(res, 'Receipt not found', 404);
  }

  res.download(receiptPath, `receipt_${paymentIntentId}.pdf`);
});

// Get Payment Status
const getPaymentStatus = handleAsync(async (req, res) => {
  const { paymentIntentId } = req.params;

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    sendSuccess(res, {
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      created: new Date(paymentIntent.created * 1000),
      metadata: paymentIntent.metadata
    });
  } catch (error) {
    console.error('Payment Status Error:', error);
    sendError(res, error.message, 500);
  }
});

// Refund Payment
const refundPayment = handleAsync(async (req, res) => {
  const { paymentIntentId, amount } = req.body;

  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount ? Math.round(amount * 100) : undefined // Partial refund if amount specified
    });

    sendSuccess(res, {
      refundId: refund.id,
      amount: refund.amount,
      status: refund.status
    });
  } catch (error) {
    console.error('Refund Error:', error);
    sendError(res, error.message, 500);
  }
});

// Webhook Handler
const handleWebhook = handleAsync(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return sendError(res, 'Webhook signature verification failed', 400);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log('Payment succeeded:', paymentIntent.id);
      // Update database, send email, etc.
      break;
    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      console.log('Payment failed:', failedPayment.id);
      // Handle failed payment
      break;
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  sendSuccess(res, { received: true });
});

module.exports = {
  createPaymentIntent,
  confirmPayment,
  downloadReceipt,
  getPaymentStatus,
  refundPayment,
  handleWebhook
};
