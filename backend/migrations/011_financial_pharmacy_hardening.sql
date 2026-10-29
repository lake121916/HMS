-- ============================================================================
-- Alem Ketema Enat Hospital Management System (HMS)
-- Migration 011: Financial Operations, Pharmacy Safety & Security Infrastructure
--   1. Dynamic QR Payment Requests (Telebirr & CBE Birr)
--   2. Insurance Coverage Rules & Co-pay Billing Extensions
--   3. Automated Pharmacy Inventory & Expiry Alerts
--   4. Offline Sync & Idempotency Logs
--   5. Patient Wristband Printing & Identifier Logs
-- ============================================================================

-- 1. Dynamic Payment Requests (Telebirr / CBE Birr QR Checkout)
CREATE TABLE IF NOT EXISTS payment_requests (
  id                      SERIAL PRIMARY KEY,
  request_id              VARCHAR(64) UNIQUE NOT NULL,
  invoice_id              INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  patient_id              INTEGER REFERENCES patients(id) ON DELETE SET NULL,
  provider                VARCHAR(30) NOT NULL CHECK (provider IN ('telebirr', 'cbe_birr', 'cbe')),
  merchant_id             VARCHAR(100) NOT NULL,
  amount                  NUMERIC(12, 2) NOT NULL,
  currency                VARCHAR(10) NOT NULL DEFAULT 'ETB',
  status                  VARCHAR(30) NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('created', 'pending', 'successful', 'failed', 'expired', 'cancelled', 'reversed', 'refunded')),
  qr_payload              TEXT NOT NULL,
  qr_code_data_url        TEXT,
  provider_transaction_id VARCHAR(100),
  expires_at              TIMESTAMP WITH TIME ZONE NOT NULL,
  confirmed_at            TIMESTAMP WITH TIME ZONE,
  verification_metadata   JSONB,
  created_by              INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payreq_request_id ON payment_requests(request_id);
CREATE INDEX IF NOT EXISTS idx_payreq_invoice ON payment_requests(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payreq_status ON payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_payreq_txn ON payment_requests(provider_transaction_id);

-- 2. Insurance Coverage Rules & Invoices Co-pay Extensions
CREATE TABLE IF NOT EXISTS insurance_coverage_rules (
  id                      SERIAL PRIMARY KEY,
  provider_id             INTEGER NOT NULL REFERENCES insurance_providers(id) ON DELETE CASCADE,
  plan_name               VARCHAR(150),
  service_category        VARCHAR(50) NOT NULL DEFAULT 'all', -- 'all', 'consultation', 'lab', 'radiology', 'pharmacy', 'procedure', 'admission'
  coverage_percentage     NUMERIC(5, 2) NOT NULL DEFAULT 85.00,
  patient_copay_percent   NUMERIC(5, 2) NOT NULL DEFAULT 15.00,
  fixed_copay_amount      NUMERIC(10, 2) DEFAULT 0.00,
  max_annual_limit        NUMERIC(14, 2),
  requires_preauth        BOOLEAN NOT NULL DEFAULT false,
  is_active               BOOLEAN NOT NULL DEFAULT true,
  excluded_items          TEXT[], -- List of service names or medication generic names excluded
  notes                   TEXT,
  created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_icr_provider ON insurance_coverage_rules(provider_id);
CREATE INDEX IF NOT EXISTS idx_icr_category ON insurance_coverage_rules(service_category);

-- Insert Default Baseline Rules for CBHI and Major Ethiopian Insurers
INSERT INTO insurance_coverage_rules (provider_id, plan_name, service_category, coverage_percentage, patient_copay_percent, requires_preauth, notes)
SELECT id, 'Standard CBHI Coverage', 'all', 85.00, 15.00, false, 'Ethiopian National CBHI 85% coverage with 15% patient co-pay'
FROM insurance_providers WHERE code = 'CBHI'
ON CONFLICT DO NOTHING;

INSERT INTO insurance_coverage_rules (provider_id, plan_name, service_category, coverage_percentage, patient_copay_percent, requires_preauth, notes)
SELECT id, 'EIC Comprehensive Health', 'all', 90.00, 10.00, true, 'Ethiopian Insurance Corporation Corporate 90/10 with pre-auth on major admissions'
FROM insurance_providers WHERE code = 'EIC'
ON CONFLICT DO NOTHING;

-- Extend Invoices Table for Insurance Co-pay Tracking
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='insurance_policy_id') THEN
    ALTER TABLE invoices ADD COLUMN insurance_policy_id INTEGER REFERENCES patient_insurance_policies(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='pre_auth_id') THEN
    ALTER TABLE invoices ADD COLUMN pre_auth_id INTEGER REFERENCES pre_authorization_requests(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='insurance_covered_amount') THEN
    ALTER TABLE invoices ADD COLUMN insurance_covered_amount NUMERIC(12, 2) DEFAULT 0.00;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='patient_copay_amount') THEN
    ALTER TABLE invoices ADD COLUMN patient_copay_amount NUMERIC(12, 2) DEFAULT 0.00;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='insurance_claim_status') THEN
    ALTER TABLE invoices ADD COLUMN insurance_claim_status VARCHAR(30) DEFAULT 'none';
  END IF;
END $$;

-- 3. Pharmacy Inventory & Expiry Alerts Table
CREATE TABLE IF NOT EXISTS pharmacy_inventory_alerts (
  id                      SERIAL PRIMARY KEY,
  medication_id           INTEGER REFERENCES medicines(id) ON DELETE CASCADE,
  batch_id                INTEGER REFERENCES medication_batches(id) ON DELETE CASCADE,
  alert_type              VARCHAR(50) NOT NULL CHECK (alert_type IN ('low_stock', 'near_expiry', 'expired', 'quarantined')),
  severity                VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
  current_quantity        INTEGER NOT NULL DEFAULT 0,
  threshold_quantity      INTEGER,
  expiry_date             DATE,
  days_until_expiry       INTEGER,
  message                 TEXT NOT NULL,
  suggested_action        TEXT,
  is_acknowledged         BOOLEAN NOT NULL DEFAULT false,
  acknowledged_by         INTEGER REFERENCES users(id) ON DELETE SET NULL,
  acknowledged_at         TIMESTAMP WITH TIME ZONE,
  is_resolved             BOOLEAN NOT NULL DEFAULT false,
  created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pia_type ON pharmacy_inventory_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_pia_severity ON pharmacy_inventory_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_pia_acknowledged ON pharmacy_inventory_alerts(is_acknowledged);
CREATE INDEX IF NOT EXISTS idx_pia_med_batch ON pharmacy_inventory_alerts(medication_id, batch_id);

-- 4. Offline Synchronization & Idempotency Log
CREATE TABLE IF NOT EXISTS offline_sync_logs (
  id                      SERIAL PRIMARY KEY,
  operation_id            VARCHAR(100) UNIQUE NOT NULL,
  user_id                 INTEGER REFERENCES users(id) ON DELETE SET NULL,
  operation_type          VARCHAR(50) NOT NULL, -- 'patient_registration', 'triage_assessment', 'offline_draft'
  payload                 JSONB NOT NULL,
  status                  VARCHAR(30) NOT NULL DEFAULT 'applied' CHECK (status IN ('applied', 'conflict', 'rejected')),
  conflict_reason         TEXT,
  server_entity_id        INTEGER,
  created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_op ON offline_sync_logs(operation_id);
CREATE INDEX IF NOT EXISTS idx_sync_user ON offline_sync_logs(user_id);

-- 5. Patient Wristband & Identifier Audit Log
CREATE TABLE IF NOT EXISTS patient_wristband_logs (
  id                      SERIAL PRIMARY KEY,
  patient_id              INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  encounter_id            INTEGER REFERENCES patient_encounters(id) ON DELETE SET NULL,
  wristband_barcode       VARCHAR(100) NOT NULL,
  printed_by              INTEGER REFERENCES users(id) ON DELETE SET NULL,
  printed_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  verified_count          INTEGER DEFAULT 0,
  last_verified_at        TIMESTAMP WITH TIME ZONE,
  last_verified_by        INTEGER REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_pwl_patient ON patient_wristband_logs(patient_id);
CREATE INDEX IF NOT EXISTS idx_pwl_barcode ON patient_wristband_logs(wristband_barcode);
