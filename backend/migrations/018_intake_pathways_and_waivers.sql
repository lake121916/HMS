-- Migration: 018_intake_pathways_and_waivers.sql
-- Description: Non-destructive columns for 3 intake pathways (Self-pay, CBHI/Indigent waiver, Emergency deferred billing)

ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS intake_pathway VARCHAR(30) DEFAULT 'self_pay',
ADD COLUMN IF NOT EXISTS waiver_reason TEXT,
ADD COLUMN IF NOT EXISTS waived_by INT REFERENCES users(id),
ADD COLUMN IF NOT EXISTS waived_at TIMESTAMP;

ALTER TABLE patient_encounters 
ADD COLUMN IF NOT EXISTS intake_pathway VARCHAR(30) DEFAULT 'self_pay',
ADD COLUMN IF NOT EXISTS billing_status VARCHAR(30) DEFAULT 'pending';

-- Add index on intake pathway for quick filtering
CREATE INDEX IF NOT EXISTS idx_invoices_intake_pathway ON invoices(intake_pathway);
CREATE INDEX IF NOT EXISTS idx_encounters_intake_pathway ON patient_encounters(intake_pathway);
