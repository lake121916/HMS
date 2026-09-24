exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_method_check;
    ALTER TABLE payments ADD CONSTRAINT payments_payment_method_check
      CHECK (payment_method IN ('cash', 'card', 'insurance', 'online', 'check', 'mobile_money', 'bank_transfer'));
    CREATE INDEX IF NOT EXISTS idx_payments_method ON payments(payment_method);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_payments_method;
    ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_method_check;
    ALTER TABLE payments ADD CONSTRAINT payments_payment_method_check
      CHECK (payment_method IN ('cash', 'card', 'insurance', 'online', 'check'));
  `);
};
