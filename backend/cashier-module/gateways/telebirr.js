const crypto = require('crypto');
const axios = require('axios');

function sign(payload, secret) {
  return crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
}

async function verify({ transactionRef, amount, currency }) {
  const payload = { appId: process.env.TELEBIRR_APP_ID, transactionRef, amount: String(amount), currency };
  const signature = sign(payload, process.env.TELEBIRR_APP_KEY);
  try {
    const response = await axios.post(`${process.env.TELEBIRR_API_URL}/transactions/verify`, payload, {
      timeout: Number(process.env.GATEWAY_TIMEOUT_MS || 10000),
      headers: { 'X-App-Id': process.env.TELEBIRR_APP_ID, 'X-Signature': signature, 'X-Public-Key': process.env.TELEBIRR_PUBLIC_KEY },
    });
    const data = response.data || {};
    return { status: data.status === 'SUCCESS' ? 'SUCCESS' : 'FAILED', ref: data.ref || data.transactionRef || transactionRef, raw: data };
  } catch (error) {
    return { status: 'FAILED', ref: transactionRef, raw: error.response?.data || { message: error.message } };
  }
}

module.exports = { verify };
