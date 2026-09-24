const axios = require('axios');

async function verify({ transactionRef, amount, currency }) {
  try {
    const response = await axios.post(`${process.env.CBE_BIRR_API_URL}/transactions/verify`, { merchantId: process.env.CBE_BIRR_MERCHANT_ID, transactionRef, amount: String(amount), currency }, {
      timeout: Number(process.env.GATEWAY_TIMEOUT_MS || 10000),
      headers: { 'X-API-Key': process.env.CBE_BIRR_API_KEY, 'X-Merchant-Id': process.env.CBE_BIRR_MERCHANT_ID },
    });
    const data = response.data || {};
    return { status: data.status === 'SUCCESS' ? 'SUCCESS' : 'FAILED', ref: data.ref || data.transactionRef || transactionRef, raw: data };
  } catch (error) {
    return { status: 'FAILED', ref: transactionRef, raw: error.response?.data || { message: error.message } };
  }
}

module.exports = { verify };
