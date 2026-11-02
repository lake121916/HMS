-- =====================================================================
-- Migration 014: Security Lifecycle, Staff Password Reset & Inventory Guards
-- Alem Ketema Enat Hospital Management System
-- =====================================================================

-- ── 1. User Security Lifecycle Columns ───────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE;

-- Index for authentication lookups
CREATE INDEX IF NOT EXISTS idx_users_locked_until ON users(locked_until);

-- ── 2. Medication Batches Non-Negative Guard ─────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_medication_batch_non_negative'
    ) THEN
        ALTER TABLE medication_batches
        ADD CONSTRAINT chk_medication_batch_non_negative CHECK (quantity_available >= 0);
    END IF;
END $$;
