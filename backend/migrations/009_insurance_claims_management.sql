-- ============================================================================
-- Alem Ketema Enat Hospital Management System (HMS)
-- Migration 009: Insurance & Claims Management
--   - Insurance provider registry
--   - Patient policy enrollment with benefit limits
--   - Pre-authorization (PA) workflow
--   - Claims with itemised service lines
--   - Co-pay & benefit deduction logic in billing
--   - Claims audit trail
-- ============================================================================

-- 1. Insurance Providers Master Table
CREATE TABLE IF NOT EXISTS insurance_providers (
  id                  SERIAL PRIMARY KEY,
  code                VARCHAR(30) UNIQUE NOT NULL,
  name_en             VARCHAR(200) NOT NULL,
  name_am             VARCHAR(200),
  provider_type       VARCHAR(30) NOT NULL DEFAULT 'private'
                      CHECK (provider_type IN ('cbhi', 'private', 'government', 'employer', 'ngo')),
  contact_person      VARCHAR(150),
  phone               VARCHAR(50),
  email               VARCHAR(150),
  address             TEXT,
  contract_start_date DATE,
  contract_end_date   DATE,
  claims_submission_email VARCHAR(150),
  reimbursement_days  INTEGER DEFAULT 30,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  notes               TEXT,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO insurance_providers (code, name_en, name_am, provider_type, phone, email, reimbursement_days) VALUES
  ('EIC',   'Ethiopian Insurance Corporation',          'የኢትዮጵያ ኢንሹራንስ ኮርፖሬሽን',         'government', '+251-11-557-0011', 'claims@eic.com.et',   30),
  ('NYALA', 'Nyala Insurance S.C.',                     'ናያላ ኢንሹራንስ',                      'private',    '+251-11-518-7373', 'claims@nyalainsurance.com', 21),
  ('AWASH', 'Awash Insurance Company S.C.',             'አዋሽ ኢንሹራንስ',                      'private',    '+251-11-557-3740', 'claims@awashinsurance.com', 21),
  ('UNITED','United Insurance Company S.C.',            'ዩናይትድ ኢንሹራንስ',                    'private',    '+251-11-553-3700', 'claims@unitedin.com',  30),
  ('NILE',  'Nile Insurance Company S.C.',              'ናይል ኢንሹራንስ',                       'private',    '+251-11-551-4352', 'claims@nileinsurance.com', 21),
  ('CBHI',  'Community-Based Health Insurance (CBHI)',  'ማህበረሰብ ላይ ተመሠረተ ጤና ኢንሹራንስ',      'cbhi',       NULL,              NULL,                   45),
  ('PENNYF','Penniform Health (Employer)',               NULL,                                'employer',   NULL,              NULL,                   30)
ON CONFLICT (code) DO NOTHING;

-- 2. Patient Insurance Policies Table
CREATE TABLE IF NOT EXISTS patient_insurance_policies (
  id                    SERIAL PRIMARY KEY,
  patient_id            INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  provider_id           INTEGER NOT NULL REFERENCES insurance_providers(id),
  policy_number         VARCHAR(100) NOT NULL,
  membership_id         VARCHAR(100),
  group_number          VARCHAR(100),
  plan_name             VARCHAR(150),
  plan_type             VARCHAR(30) DEFAULT 'inpatient_outpatient'
                        CHECK (plan_type IN ('inpatient_only', 'outpatient_only', 'inpatient_outpatient', 'comprehensive')),
  relationship_to_insured VARCHAR(30) DEFAULT 'self'
                        CHECK (relationship_to_insured IN ('self', 'spouse', 'child', 'parent', 'other')),
  insured_name          VARCHAR(200),
  insured_dob           DATE,
  effective_date        DATE NOT NULL,
  expiry_date           DATE,
  annual_limit          NUMERIC(14, 2),
  remaining_benefit     NUMERIC(14, 2),
  copay_fixed           NUMERIC(10, 2) DEFAULT 0.00,
  copay_percentage      NUMERIC(5, 2) DEFAULT 0.00,
  deductible_amount     NUMERIC(12, 2) DEFAULT 0.00,
  deductible_met        NUMERIC(12, 2) DEFAULT 0.00,
  inpatient_limit       NUMERIC(14, 2),
  outpatient_limit      NUMERIC(14, 2),
  pharmacy_limit        NUMERIC(12, 2),
  lab_limit             NUMERIC(12, 2),
  is_primary            BOOLEAN DEFAULT true,
  is_active             BOOLEAN DEFAULT true,
  verification_status   VARCHAR(20) DEFAULT 'unverified'
                        CHECK (verification_status IN ('unverified', 'verified', 'expired', 'suspended')),
  verified_by           INTEGER REFERENCES users(id),
  verified_at           TIMESTAMP,
  notes                 TEXT,
  created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (patient_id, provider_id, policy_number)
);

CREATE INDEX IF NOT EXISTS idx_pip_patient ON patient_insurance_policies(patient_id);
CREATE INDEX IF NOT EXISTS idx_pip_provider ON patient_insurance_policies(provider_id);
CREATE INDEX IF NOT EXISTS idx_pip_active ON patient_insurance_policies(is_active, expiry_date);

-- 3. Pre-Authorization (PA) Requests Table
CREATE TABLE IF NOT EXISTS pre_authorization_requests (
  id                    SERIAL PRIMARY KEY,
  pa_number             VARCHAR(50) UNIQUE NOT NULL,
  policy_id             INTEGER NOT NULL REFERENCES patient_insurance_policies(id),
  patient_id            INTEGER NOT NULL REFERENCES patients(id),
  encounter_id          INTEGER REFERENCES patient_encounters(id),
  service_type          VARCHAR(50) NOT NULL
                        CHECK (service_type IN ('inpatient_admission', 'elective_surgery', 'diagnostic', 'specialist_referral', 'physiotherapy', 'pharmacy', 'other')),
  service_description   TEXT NOT NULL,
  requested_amount      NUMERIC(12, 2) NOT NULL,
  approved_amount       NUMERIC(12, 2),
  diagnosis_codes       TEXT[],
  procedure_codes       TEXT[],
  requested_by          INTEGER REFERENCES users(id),
  requested_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status                VARCHAR(30) DEFAULT 'pending'
                        CHECK (status IN ('pending', 'submitted', 'approved', 'partially_approved', 'rejected', 'expired', 'cancelled')),
  provider_reference    VARCHAR(100),
  reviewed_by           INTEGER REFERENCES users(id),
  reviewed_at           TIMESTAMP,
  review_notes          TEXT,
  valid_from            DATE,
  valid_until           DATE,
  submission_method     VARCHAR(30) DEFAULT 'manual',
  created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pa_patient ON pre_authorization_requests(patient_id);
CREATE INDEX IF NOT EXISTS idx_pa_policy ON pre_authorization_requests(policy_id);
CREATE INDEX IF NOT EXISTS idx_pa_status ON pre_authorization_requests(status);
CREATE INDEX IF NOT EXISTS idx_pa_number ON pre_authorization_requests(pa_number);

-- PA number sequence
CREATE SEQUENCE IF NOT EXISTS pa_number_seq START WITH 1001 INCREMENT BY 1;

-- 4. Enhanced Insurance Claims Table (replaces basic insurance_claims logic)
-- Keep backward compatibility by preserving the old table but add columns
DO $$
BEGIN
  -- provider_id FK column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='insurance_claims' AND column_name='provider_id') THEN
    ALTER TABLE insurance_claims ADD COLUMN provider_id INTEGER REFERENCES insurance_providers(id);
  END IF;
  -- policy_id FK column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='insurance_claims' AND column_name='policy_id') THEN
    ALTER TABLE insurance_claims ADD COLUMN policy_id INTEGER REFERENCES patient_insurance_policies(id);
  END IF;
  -- pre_auth_id FK column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='insurance_claims' AND column_name='pre_auth_id') THEN
    ALTER TABLE insurance_claims ADD COLUMN pre_auth_id INTEGER REFERENCES pre_authorization_requests(id);
  END IF;
  -- encounter_id FK column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='insurance_claims' AND column_name='encounter_id') THEN
    ALTER TABLE insurance_claims ADD COLUMN encounter_id INTEGER REFERENCES patient_encounters(id);
  END IF;
  -- claim_number column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='insurance_claims' AND column_name='claim_number') THEN
    ALTER TABLE insurance_claims ADD COLUMN claim_number VARCHAR(50) UNIQUE;
  END IF;
  -- claim_type column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='insurance_claims' AND column_name='claim_type') THEN
    ALTER TABLE insurance_claims ADD COLUMN claim_type VARCHAR(30) DEFAULT 'outpatient';
  END IF;
  -- total_billed column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='insurance_claims' AND column_name='total_billed') THEN
    ALTER TABLE insurance_claims ADD COLUMN total_billed NUMERIC(14, 2);
  END IF;
  -- approved_amount column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='insurance_claims' AND column_name='approved_amount') THEN
    ALTER TABLE insurance_claims ADD COLUMN approved_amount NUMERIC(14, 2);
  END IF;
  -- patient_copay column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='insurance_claims' AND column_name='patient_copay') THEN
    ALTER TABLE insurance_claims ADD COLUMN patient_copay NUMERIC(12, 2) DEFAULT 0;
  END IF;
  -- deductible_applied column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='insurance_claims' AND column_name='deductible_applied') THEN
    ALTER TABLE insurance_claims ADD COLUMN deductible_applied NUMERIC(12, 2) DEFAULT 0;
  END IF;
  -- submitted_at column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='insurance_claims' AND column_name='submitted_at') THEN
    ALTER TABLE insurance_claims ADD COLUMN submitted_at TIMESTAMP;
  END IF;
  -- submitted_by column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='insurance_claims' AND column_name='submitted_by') THEN
    ALTER TABLE insurance_claims ADD COLUMN submitted_by INTEGER REFERENCES users(id);
  END IF;
  -- provider_claim_ref column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='insurance_claims' AND column_name='provider_claim_ref') THEN
    ALTER TABLE insurance_claims ADD COLUMN provider_claim_ref VARCHAR(100);
  END IF;
  -- payment_received_at column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='insurance_claims' AND column_name='payment_received_at') THEN
    ALTER TABLE insurance_claims ADD COLUMN payment_received_at TIMESTAMP;
  END IF;
  -- payment_amount column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='insurance_claims' AND column_name='payment_amount') THEN
    ALTER TABLE insurance_claims ADD COLUMN payment_amount NUMERIC(14, 2);
  END IF;
  -- rejection_reason column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='insurance_claims' AND column_name='rejection_reason') THEN
    ALTER TABLE insurance_claims ADD COLUMN rejection_reason TEXT;
  END IF;
  -- reviewed_by column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='insurance_claims' AND column_name='reviewed_by') THEN
    ALTER TABLE insurance_claims ADD COLUMN reviewed_by INTEGER REFERENCES users(id);
  END IF;
  -- reviewed_at column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='insurance_claims' AND column_name='reviewed_at') THEN
    ALTER TABLE insurance_claims ADD COLUMN reviewed_at TIMESTAMP;
  END IF;
END $$;

-- Update status constraint to include more states
ALTER TABLE insurance_claims DROP CONSTRAINT IF EXISTS insurance_claims_status_check;
ALTER TABLE insurance_claims ADD CONSTRAINT insurance_claims_status_check
  CHECK (status IN ('draft', 'pending', 'submitted', 'processing', 'approved', 'partially_approved', 'rejected', 'paid', 'appealed', 'written_off'));

-- Claim number sequence
CREATE SEQUENCE IF NOT EXISTS claim_number_seq START WITH 10001 INCREMENT BY 1;

-- Generate claim numbers for existing rows missing them
UPDATE insurance_claims
SET claim_number = 'CLM-' || TO_CHAR(created_at, 'YYYY') || '-' || LPAD(id::text, 5, '0')
WHERE claim_number IS NULL;

-- 5. Insurance Claim Line Items
CREATE TABLE IF NOT EXISTS insurance_claim_items (
  id                  SERIAL PRIMARY KEY,
  claim_id            INTEGER NOT NULL REFERENCES insurance_claims(id) ON DELETE CASCADE,
  service_type        VARCHAR(50) NOT NULL,
  description         TEXT NOT NULL,
  icd10_code          VARCHAR(20),
  cpt_code            VARCHAR(20),
  quantity            INTEGER NOT NULL DEFAULT 1,
  unit_price          NUMERIC(12, 2) NOT NULL,
  billed_amount       NUMERIC(12, 2) NOT NULL,
  allowed_amount      NUMERIC(12, 2),
  source_type         VARCHAR(30),
  source_id           INTEGER,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_claim_items_claim ON insurance_claim_items(claim_id);

-- 6. Claims Audit Trail
CREATE TABLE IF NOT EXISTS insurance_claim_events (
  id          SERIAL PRIMARY KEY,
  claim_id    INTEGER NOT NULL REFERENCES insurance_claims(id) ON DELETE CASCADE,
  event_type  VARCHAR(50) NOT NULL,
  old_status  VARCHAR(30),
  new_status  VARCHAR(30),
  actor_id    INTEGER REFERENCES users(id),
  actor_name  VARCHAR(200),
  notes       TEXT,
  metadata    JSONB,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_claim_events_claim ON insurance_claim_events(claim_id);

-- 7. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_insurance_claims_provider  ON insurance_claims(provider_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_policy    ON insurance_claims(policy_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_status    ON insurance_claims(status);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_patient   ON insurance_claims(patient_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_submitted ON insurance_claims(submitted_at);
