-- ============================================================================
-- Alem Ketema Enat Hospital Management System (HMS)
-- Migration 008: Cashier Shift Management, Z-Report Reconciliation,
--                Thermal Receipt Numbering & Digital Payment Verification
-- ============================================================================

-- 1. Create Receipt Number Generator Sequence
CREATE SEQUENCE IF NOT EXISTS receipt_number_seq START WITH 1001 INCREMENT BY 1;

-- 2. Create Cashier Shifts Table
CREATE TABLE IF NOT EXISTS cashier_shifts (
  id SERIAL PRIMARY KEY,
  shift_number VARCHAR(50) UNIQUE NOT NULL,
  cashier_id INTEGER NOT NULL REFERENCES users(id),
  register_id VARCHAR(50) NOT NULL DEFAULT 'REG-01',
  opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  opening_cash NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  closed_at TIMESTAMP,
  closing_cash_counted NUMERIC(12, 2),
  expected_closing_cash NUMERIC(12, 2),
  cash_variance NUMERIC(12, 2),
  status VARCHAR(30) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSING', 'CLOSED', 'HANDED_OVER', 'RECONCILED', 'REQUIRES_REVIEW')),
  closing_notes TEXT,
  variance_reason TEXT,
  handed_over_to INTEGER REFERENCES users(id),
  handed_over_at TIMESTAMP,
  reconciled_by INTEGER REFERENCES users(id),
  reconciled_at TIMESTAMP,
  reconciliation_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for unique active shift per register
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_shift_per_register 
  ON cashier_shifts(register_id) 
  WHERE status IN ('OPEN', 'CLOSING');

CREATE INDEX IF NOT EXISTS idx_cashier_shifts_cashier ON cashier_shifts(cashier_id);
CREATE INDEX IF NOT EXISTS idx_cashier_shifts_status ON cashier_shifts(status);

-- 3. Create Shift Handovers Table
CREATE TABLE IF NOT EXISTS shift_handovers (
  id SERIAL PRIMARY KEY,
  shift_id INTEGER NOT NULL REFERENCES cashier_shifts(id) ON DELETE CASCADE,
  handed_over_by INTEGER NOT NULL REFERENCES users(id),
  received_by INTEGER REFERENCES users(id),
  handed_over_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  finance_status VARCHAR(30) DEFAULT 'PENDING_REVIEW' CHECK (finance_status IN ('PENDING_REVIEW', 'ACCEPTED', 'DISPUTED', 'RECONCILED')),
  cashier_summary JSONB NOT NULL,
  review_notes TEXT,
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shift_handovers_shift ON shift_handovers(shift_id);
CREATE INDEX IF NOT EXISTS idx_shift_handovers_status ON shift_handovers(finance_status);

-- 4. Create Hospital Financial Configuration Table
CREATE TABLE IF NOT EXISTS hospital_financial_config (
  id SERIAL PRIMARY KEY,
  hospital_name_en VARCHAR(255) NOT NULL DEFAULT 'Alem Ketema Enat Hospital',
  hospital_name_am VARCHAR(255) NOT NULL DEFAULT 'አለም ከተማ እናት ጠቅላላ ሆስፒታል',
  address_en VARCHAR(255) NOT NULL DEFAULT 'Alem Ketema, North Shewa Zone, Amhara Region, Ethiopia',
  address_am VARCHAR(255) NOT NULL DEFAULT 'ዓለም ከተማ፣ ሰሜን ሸዋ ዞን፣ አማራ ክልል፣ ኢትዮጵያ',
  telephone VARCHAR(100) NOT NULL DEFAULT '+251 58 226 0123 / +251 91 123 4567',
  tin_number VARCHAR(50) NOT NULL DEFAULT '0012938475',
  telebirr_merchant_till VARCHAR(50) NOT NULL DEFAULT '654321',
  cbe_account_number VARCHAR(50) NOT NULL DEFAULT '1000189922341',
  cbe_account_name VARCHAR(255) NOT NULL DEFAULT 'Alem Ketema Enat Hospital',
  cbe_branch VARCHAR(100) NOT NULL DEFAULT 'Alem Ketema Main Branch',
  default_paper_width VARCHAR(10) NOT NULL DEFAULT '80mm',
  variance_threshold NUMERIC(10, 2) NOT NULL DEFAULT 50.00,
  require_active_shift BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed default configuration if empty
INSERT INTO hospital_financial_config (
  id, hospital_name_en, hospital_name_am, address_en, address_am,
  telephone, tin_number, telebirr_merchant_till, cbe_account_number,
  cbe_account_name, cbe_branch, default_paper_width, variance_threshold
)
SELECT 1, 'Alem Ketema Enat Hospital', 'አለም ከተማ እናት ጠቅላላ ሆስፒታል',
       'Alem Ketema, North Shewa Zone, Amhara Region, Ethiopia',
       'ዓለም ከተማ፣ ሰሜን ሸዋ ዞን፣ አማራ ክልል፣ ኢትዮጵያ',
       '+251 58 226 0123 / +251 91 123 4567', '0012938475',
       '654321', '1000189922341', 'Alem Ketema Enat Hospital',
       'Alem Ketema Main Branch', '80mm', 50.00
WHERE NOT EXISTS (SELECT 1 FROM hospital_financial_config WHERE id = 1);

-- 5. Create Financial Audit Events Table
CREATE TABLE IF NOT EXISTS financial_audit_events (
  id SERIAL PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INTEGER NOT NULL,
  action VARCHAR(50) NOT NULL,
  actor_id INTEGER REFERENCES users(id),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reason TEXT,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_fin_audit_entity ON financial_audit_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_fin_audit_action ON financial_audit_events(action);
CREATE INDEX IF NOT EXISTS idx_fin_audit_timestamp ON financial_audit_events(timestamp);

-- 6. Extend Payments Table
-- Update constraint for payment methods
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_method_check;
ALTER TABLE payments ADD CONSTRAINT payments_payment_method_check
  CHECK (payment_method IN ('cash', 'card', 'telebirr', 'cbe_birr', 'bank_transfer', 'insurance', 'online', 'check', 'mobile_money'));

-- Add columns if not already existing
DO $$
BEGIN
  -- receipt_number
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'receipt_number') THEN
    ALTER TABLE payments ADD COLUMN receipt_number VARCHAR(50) UNIQUE;
  END IF;

  -- payment_provider
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'payment_provider') THEN
    ALTER TABLE payments ADD COLUMN payment_provider VARCHAR(50) DEFAULT 'cash';
  END IF;

  -- provider_reference
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'provider_reference') THEN
    ALTER TABLE payments ADD COLUMN provider_reference VARCHAR(150);
  END IF;

  -- verification_status
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'verification_status') THEN
    ALTER TABLE payments ADD COLUMN verification_status VARCHAR(40) DEFAULT 'VERIFIED';
  END IF;

  -- verified_by
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'verified_by') THEN
    ALTER TABLE payments ADD COLUMN verified_by INTEGER REFERENCES users(id);
  END IF;

  -- verified_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'verified_at') THEN
    ALTER TABLE payments ADD COLUMN verified_at TIMESTAMP;
  END IF;

  -- verification_method
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'verification_method') THEN
    ALTER TABLE payments ADD COLUMN verification_method VARCHAR(50) DEFAULT 'DIRECT_CASH';
  END IF;

  -- verification_evidence_ref
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'verification_evidence_ref') THEN
    ALTER TABLE payments ADD COLUMN verification_evidence_ref TEXT;
  END IF;

  -- shift_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'shift_id') THEN
    ALTER TABLE payments ADD COLUMN shift_id INTEGER REFERENCES cashier_shifts(id);
  END IF;

  -- register_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'register_id') THEN
    ALTER TABLE payments ADD COLUMN register_id VARCHAR(50) DEFAULT 'REG-01';
  END IF;

  -- reprint_count
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'reprint_count') THEN
    ALTER TABLE payments ADD COLUMN reprint_count INTEGER DEFAULT 0;
  END IF;

  -- last_reprinted_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'last_reprinted_at') THEN
    ALTER TABLE payments ADD COLUMN last_reprinted_at TIMESTAMP;
  END IF;

  -- last_reprinted_by
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'last_reprinted_by') THEN
    ALTER TABLE payments ADD COLUMN last_reprinted_by INTEGER REFERENCES users(id);
  END IF;

  -- currency
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'currency') THEN
    ALTER TABLE payments ADD COLUMN currency VARCHAR(10) DEFAULT 'ETB';
  END IF;
END $$;

-- Populate receipt_number for historical payments if null
UPDATE payments 
SET receipt_number = 'RCP-' || TO_CHAR(payment_date, 'YYYY') || '-' || LPAD(id::text, 6, '0')
WHERE receipt_number IS NULL;

-- Populate provider_reference from transaction_id if null
UPDATE payments
SET provider_reference = transaction_id,
    payment_provider = payment_method
WHERE provider_reference IS NULL AND transaction_id IS NOT NULL;

-- 7. Add Unique Constraint on Digital Payment References to Prevent Duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_digital_provider_reference
  ON payments (payment_provider, provider_reference)
  WHERE provider_reference IS NOT NULL AND verification_status != 'REJECTED';

CREATE INDEX IF NOT EXISTS idx_payments_shift ON payments(shift_id);
CREATE INDEX IF NOT EXISTS idx_payments_receipt_number ON payments(receipt_number);
CREATE INDEX IF NOT EXISTS idx_payments_verification_status ON payments(verification_status);
