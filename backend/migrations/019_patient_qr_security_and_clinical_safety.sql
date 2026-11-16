-- ============================================================================
-- Migration 019: Patient QR Security, Clinical Safety & Verification Architecture
-- Alem Ketema Enat Hospital Management System (AKEH)
-- ============================================================================

-- Ensure pgcrypto extension for cryptographic hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Upgrade patient_qr_identities with token_hash, lifecycle status & tracking
ALTER TABLE patient_qr_identities
  ADD COLUMN IF NOT EXISTS token_hash VARCHAR(64),
  ADD COLUMN IF NOT EXISTS token_version VARCHAR(16) DEFAULT 'v1',
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS revoked_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS revocation_reason TEXT,
  ADD COLUMN IF NOT EXISTS replaced_by_identity_id INTEGER REFERENCES patient_qr_identities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP WITH TIME ZONE;

-- Add check constraint for status if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'patient_qr_identities_status_check'
  ) THEN
    ALTER TABLE patient_qr_identities
      ADD CONSTRAINT patient_qr_identities_status_check
      CHECK (status IN ('active', 'revoked', 'expired', 'replaced', 'suspended'));
  END IF;
END $$;

-- Populate token_hash for any existing plaintext tokens
UPDATE patient_qr_identities
SET token_hash = encode(digest(token, 'sha256'), 'hex')
WHERE token_hash IS NULL AND token IS NOT NULL;

-- Populate status based on is_active
UPDATE patient_qr_identities
SET status = CASE WHEN is_active = true THEN 'active' ELSE 'revoked' END
WHERE status IS NULL;

-- Indexes for lightning-fast hash lookups and audit
CREATE INDEX IF NOT EXISTS idx_patient_qr_token_hash
  ON patient_qr_identities(token_hash);

CREATE INDEX IF NOT EXISTS idx_patient_qr_patient_status
  ON patient_qr_identities(patient_id, status);

-- 2. Create patient_identity_verifications (Two-Identifier Clinical Verification)
CREATE TABLE IF NOT EXISTS patient_identity_verifications (
  id BIGSERIAL PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  encounter_id INTEGER REFERENCES patient_encounters(id) ON DELETE SET NULL,
  actor_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  department VARCHAR(50),
  verification_method VARCHAR(32) NOT NULL DEFAULT 'two_identifier_verbal',
  identifiers_confirmed TEXT[] NOT NULL DEFAULT ARRAY['full_name', 'dob'],
  status VARCHAR(20) NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'mismatch', 'override')),
  notes TEXT,
  verified_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_piv_patient_date
  ON patient_identity_verifications(patient_id, verified_at DESC);

CREATE INDEX IF NOT EXISTS idx_piv_encounter
  ON patient_identity_verifications(encounter_id);

-- 3. Create patient_qr_mismatch_reports (Clinical Safety Identity Mismatch Reports)
CREATE TABLE IF NOT EXISTS patient_qr_mismatch_reports (
  id BIGSERIAL PRIMARY KEY,
  scanned_patient_id INTEGER REFERENCES patients(id) ON DELETE SET NULL,
  reported_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  department VARCHAR(50),
  mismatch_details TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')),
  resolved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pqm_status_date
  ON patient_qr_mismatch_reports(status, created_at DESC);

-- 4. Enhance patient_qr_audit_logs with department, device_id, outcome & rejection_reason
ALTER TABLE patient_qr_audit_logs
  ADD COLUMN IF NOT EXISTS department VARCHAR(50),
  ADD COLUMN IF NOT EXISTS device_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS outcome VARCHAR(32),
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_pqa_action_date
  ON patient_qr_audit_logs(action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pqa_actor_date
  ON patient_qr_audit_logs(actor_user_id, created_at DESC);

-- 5. Enhance patient_wristband_logs with print type, reasons and printer hardware tracking
ALTER TABLE patient_wristband_logs
  ADD COLUMN IF NOT EXISTS printer_id VARCHAR(64),
  ADD COLUMN IF NOT EXISTS print_reason VARCHAR(64) DEFAULT 'initial',
  ADD COLUMN IF NOT EXISTS print_type VARCHAR(32) DEFAULT 'initial',
  ADD COLUMN IF NOT EXISTS replacement_reason TEXT;

-- 6. Emergency Unidentified Patient Support on patients table
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS is_unidentified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS temporary_mrn VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_patients_unidentified
  ON patients(is_unidentified) WHERE is_unidentified = true;
