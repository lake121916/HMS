-- Create audit_logs table for tracking financial and clinical actions
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INTEGER,
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE audit_logs IS 'Audit trail for all critical system actions';
COMMENT ON COLUMN audit_logs.action IS 'The action performed (e.g., PAYMENT_CREATED, INVOICE_UPDATED, PATIENT_REGISTERED)';
COMMENT ON COLUMN audit_logs.entity_type IS 'Type of entity affected (e.g., payment, invoice, patient, encounter)';
COMMENT ON COLUMN audit_logs.entity_id IS 'ID of the affected entity';
COMMENT ON COLUMN audit_logs.old_values IS 'Previous state of the entity (JSON)';
COMMENT ON COLUMN audit_logs.new_values IS 'New state of the entity (JSON)';
COMMENT ON COLUMN audit_logs.ip_address IS 'IP address of the user who performed the action';
COMMENT ON COLUMN audit_logs.user_agent IS 'User agent string of the request';