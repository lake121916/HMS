const pool = require('../config/database');

const auditLog = async (req, res, next) => {
  // Store original json and end methods
  const originalJson = res.json;
  const originalEnd = res.end;

  // Intercept response to log after it's sent
  res.json = function(data) {
    res.locals.responseData = data;
    return originalJson.call(this, data);
  };

  res.end = function(chunk, encoding) {
    if (res.statusCode >= 200 && res.statusCode < 300 && req.method !== 'GET') {
      logAuditEntry(req, res).catch(err => {
        console.error('Failed to log audit entry:', err);
      });
    }
    return originalEnd.call(this, chunk, encoding);
  };

  next();
};

async function logAuditEntry(req, res) {
  try {
    const user = req.user;
    if (!user) return;

    const action = getActionFromRequest(req);
    const entityType = getEntityTypeFromPath(req.path);
    const entityId = getEntityIdFromRequest(req);

    // Only log important actions
    const importantActions = [
      'CREATE', 'UPDATE', 'DELETE', 'PAYMENT', 'REFUND', 
      'DISPENSE', 'PRESCRIBE', 'ORDER', 'REGISTER', 'ADMIT'
    ];

    if (!importantActions.some(a => action.includes(a))) {
      return;
    }

    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        user.id,
        action,
        entityType,
        entityId,
        req.body ? JSON.stringify(req.body) : null,
        res.locals.responseData ? JSON.stringify(res.locals.responseData) : null,
        req.ip || req.connection.remoteAddress,
        req.get('user-agent')
      ]
    );
  } catch (error) {
    console.error('Audit log error:', error);
    // Don't throw error to avoid breaking the main request
  }
}

function getActionFromRequest(req) {
  const method = req.method;
  const path = req.path;
  
  if (method === 'POST') {
    if (path.includes('/payments')) return 'PAYMENT_CREATED';
    if (path.includes('/invoices')) return 'INVOICE_CREATED';
    if (path.includes('/patients')) return 'PATIENT_REGISTERED';
    if (path.includes('/prescriptions')) return 'PRESCRIPTION_CREATED';
    if (path.includes('/lab-tests')) return 'LAB_TEST_ORDERED';
    if (path.includes('/admissions')) return 'PATIENT_ADMITTED';
    return 'CREATE';
  }
  
  if (method === 'PUT' || method === 'PATCH') {
    if (path.includes('/payments')) return 'PAYMENT_UPDATED';
    if (path.includes('/invoices')) return 'INVOICE_UPDATED';
    if (path.includes('/prescriptions')) return 'PRESCRIPTION_UPDATED';
    if (path.includes('/lab-tests')) return 'LAB_TEST_UPDATED';
    return 'UPDATE';
  }
  
  if (method === 'DELETE') {
    if (path.includes('/payments')) return 'PAYMENT_DELETED';
    if (path.includes('/invoices')) return 'INVOICE_DELETED';
    return 'DELETE';
  }
  
  return 'UNKNOWN';
}

function getEntityTypeFromPath(path) {
  if (path.includes('/payments')) return 'payment';
  if (path.includes('/invoices')) return 'invoice';
  if (path.includes('/patients')) return 'patient';
  if (path.includes('/prescriptions')) return 'prescription';
  if (path.includes('/lab-tests')) return 'lab_test';
  if (path.includes('/encounters')) return 'encounter';
  if (path.includes('/admissions')) return 'admission';
  if (path.includes('/users')) return 'user';
  return 'unknown';
}

function getEntityIdFromRequest(req) {
  // Try to get ID from URL params
  if (req.params && req.params.id) return parseInt(req.params.id);
  if (req.params && req.params.receiptNumber) return req.params.receiptNumber;
  
  // Try to get ID from request body
  if (req.body && req.body.id) return parseInt(req.body.id);
  if (req.body && req.body.invoice_id) return parseInt(req.body.invoice_id);
  if (req.body && req.body.patient_id) return parseInt(req.body.patient_id);
  
  return null;
}

module.exports = auditLog;