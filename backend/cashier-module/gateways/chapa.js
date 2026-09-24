const axios = require('axios');

async function verify({ transactionRef }) {
  try {
    const response = await axios.get(`${process.env.CHAPA_API_URL}/transaction/verify/${encodeURIComponent(transactionRef)}`, {
      timeout: Number(process.env.GATEWAY_TIMEOUT_MS || 10000),
      headers: { Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}` },
    });
    const data = response.data || {};
    const status = data.status === 'success' || data.data?.status === 'success' ? 'SUCCESS' : 'FAILED';
    return { status, ref: data.data?.reference || data.data?.tx_ref || transactionRef, raw: data };
  } catch (error) {
    return { status: 'FAILED', ref: transactionRef, raw: error.response?.data || { message: error.message } };
  }
}

module.exports = { verify };
