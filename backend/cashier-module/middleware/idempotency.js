const { AppError } = require('../utils/errors');

function idempotency(req, res, next) {
  const key = req.get('Idempotency-Key');
  if (!key || key.length < 16 || key.length > 120) {
    return next(new AppError('IDEMPOTENCY_REQUIRED', 'Idempotency-Key header must be 16-120 characters', 400));
  }
  req.body = { ...req.body, idempotencyKey: key };
  next();
}

module.exports = idempotency;
