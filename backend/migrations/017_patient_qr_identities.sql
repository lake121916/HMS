CREATE TABLE IF NOT EXISTS patient_qr_identities (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  token VARCHAR(64) NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS patient_qr_one_active_identity
  ON patient_qr_identities(patient_id) WHERE is_active = true;

CREATE TABLE IF NOT EXISTS patient_qr_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  patient_id INTEGER REFERENCES patients(id) ON DELETE SET NULL,
  identity_id INTEGER REFERENCES patient_qr_identities(id) ON DELETE SET NULL,
  actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(32) NOT NULL CHECK (action IN ('issued', 'retrieved', 'regenerated', 'scan_succeeded', 'scan_rejected')),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS patient_qr_audit_patient_created
  ON patient_qr_audit_logs(patient_id, created_at DESC);
