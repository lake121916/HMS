const pool = require('../config/database');

const auditLog = async (req, res, next) => {
  const originalSend = res.send;

  res.send = function (data) {
    const userId = req.user?.id;
    const action = getActionFromMethod(req.method, req.path);
    const entityType = getEntityTypeFromPath(req.path);
    const entityId = req.params.id || req.body.id;

    if (userId && action && res.statusCode < 400) {
      pool.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, action, entityType, entityId, req.ip, req.get('user-agent')]
      ).catch(err => console.error('Audit log error:', err));
    }

    originalSend.call(this, data);
  };

  next();
};

function getActionFromMethod(method, path) {
  const actions = {
    'POST': 'CREATE',
    'PUT': 'UPDATE',
    'PATCH': 'UPDATE',
    'DELETE': 'DELETE',
    'GET': 'VIEW'
  };
  return actions[method];
}

function getEntityTypeFromPath(path) {
  const parts = path.split('/').filter(p => p);
  if (parts.length > 0 && parts[0] !== 'api') {
    return parts[1]?.charAt(0).toUpperCase() + parts[1]?.slice(1, -1) || 'Unknown';
  }
  return 'Unknown';
}

module.exports = auditLog;
