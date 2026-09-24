-- ============================================================
-- HMS Workflow Migration 002
-- Add encounter_id to existing tables + ensure new columns exist
-- Safe to run multiple times (all IF NOT EXISTS / IF EXISTS)
-- ============================================================

-- ── Add encounter_id to prescriptions ───────────────────────
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS encounter_id INTEGER REFERENCES patient_encounters(id) ON DELETE SET NULL;

-- ── Add encounter_id to lab_tests ───────────────────────────
ALTER TABLE lab_tests ADD COLUMN IF NOT EXISTS encounter_id INTEGER REFERENCES patient_encounters(id) ON DELETE SET NULL;

-- ── Add encounter_id to vitals ──────────────────────────────
ALTER TABLE vitals ADD COLUMN IF NOT EXISTS encounter_id INTEGER REFERENCES patient_encounters(id) ON DELETE SET NULL;

-- ── Add encounter_id to invoices ────────────────────────────
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS encounter_id INTEGER REFERENCES patient_encounters(id) ON DELETE SET NULL;

-- ── Ensure invoice_items table has correct structure ─────────
-- (In case 001 ran partially)
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS encounter_id INTEGER REFERENCES patient_encounters(id) ON DELETE SET NULL;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS service_id INTEGER REFERENCES services(id) ON DELETE SET NULL;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS source_type VARCHAR(50);
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS source_id INTEGER;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS unit_price DECIMAL(12,2) NOT NULL DEFAULT 0.00;

-- Unique constraint to prevent double billing
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'invoice_items_source_unique'
    ) THEN
        ALTER TABLE invoice_items ADD CONSTRAINT invoice_items_source_unique UNIQUE (source_type, source_id);
    END IF;
END $$;

-- ── Computed subtotal column (if not auto-calculated) ────────
-- The subtotal should be quantity * unit_price
-- Add it if it doesn't exist (some schemas call it "total")
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS subtotal DECIMAL(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED;

-- If the generated column fails (already exists as regular), skip
-- Just update existing rows
-- UPDATE invoice_items SET subtotal = quantity * unit_price WHERE subtotal IS NULL;

-- ── Add invoice_items subtotal trigger as backup ─────────────
CREATE OR REPLACE FUNCTION update_invoice_item_subtotal()
RETURNS TRIGGER AS $$
BEGIN
    NEW.subtotal := NEW.quantity * NEW.unit_price;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only create trigger if subtotal is NOT a generated column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoice_items' AND column_name = 'subtotal'
        AND is_generated = 'ALWAYS'
    ) THEN
        DROP TRIGGER IF EXISTS invoice_item_subtotal_trigger ON invoice_items;
        CREATE TRIGGER invoice_item_subtotal_trigger
            BEFORE INSERT OR UPDATE ON invoice_items
            FOR EACH ROW EXECUTE FUNCTION update_invoice_item_subtotal();
    END IF;
END $$;

-- ── Indexes for performance ──────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_patient_encounters_status ON patient_encounters(status);
CREATE INDEX IF NOT EXISTS idx_patient_encounters_patient ON patient_encounters(patient_id);
CREATE INDEX IF NOT EXISTS idx_triage_assessments_encounter ON triage_assessments(encounter_id);
CREATE INDEX IF NOT EXISTS idx_encounter_assignments_doctor ON encounter_assignments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_source ON invoice_items(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_encounter ON prescriptions(encounter_id);
CREATE INDEX IF NOT EXISTS idx_lab_tests_encounter ON lab_tests(encounter_id);
CREATE INDEX IF NOT EXISTS idx_invoices_encounter ON invoices(encounter_id);
CREATE INDEX IF NOT EXISTS idx_radiology_orders_encounter ON radiology_orders(encounter_id);
CREATE INDEX IF NOT EXISTS idx_procedure_orders_encounter ON procedure_orders(encounter_id);

-- ── Workflow status history (if not created by 001) ──────────
CREATE TABLE IF NOT EXISTS workflow_status_history (
    id          SERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id   INTEGER     NOT NULL,
    from_status VARCHAR(50),
    to_status   VARCHAR(50) NOT NULL,
    changed_by  INTEGER     REFERENCES users(id) ON DELETE SET NULL,
    notes       TEXT,
    created_at  TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_wsh_entity ON workflow_status_history(entity_type, entity_id);

-- ── Drop NOT NULL on encounter_assignments for optional/partial routing ────
ALTER TABLE encounter_assignments ALTER COLUMN department_id DROP NOT NULL;
ALTER TABLE encounter_assignments ALTER COLUMN doctor_id DROP NOT NULL;

-- Migration 002 complete
SELECT 'Migration 002 applied successfully.' AS status;

