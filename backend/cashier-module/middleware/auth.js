const jwt = require('jsonwebtoken');
const { AppError } = require('../utils/errors');

function auth(req, res, next) {
  const header = req.get('authorization');
  const token = header && header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(new AppError('AUTH_REQUIRED', 'Bearer token is required', 401));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.cashier = { id: decoded.id || decoded.sub, role: decoded.role };
    if (!req.cashier.id) return next(new AppError('AUTH_INVALID', 'Token does not identify a cashier', 401));
    next();
  } catch (error) {
    next(new AppError('AUTH_INVALID', 'Invalid or expired token', 401));
  }
}

module.exports = auth;
