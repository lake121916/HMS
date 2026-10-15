-- =====================================================================
-- Migration 007: Clinical Safety, Medical Compliance, & OPD Queue System
-- Alem Ketema Enat Hospital Management System
-- =====================================================================

-- ── 1. Medication Batches Table ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS medication_batches (
    id                  SERIAL PRIMARY KEY,
    medication_id       INTEGER NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
    batch_number        VARCHAR(100) NOT NULL,
    quantity_received   INTEGER NOT NULL CHECK (quantity_received >= 0),
    quantity_available  INTEGER NOT NULL CHECK (quantity_available >= 0),
    manufacture_date    DATE,
    expiry_date         DATE NOT NULL,
    received_date       DATE NOT NULL DEFAULT CURRENT_DATE,
    supplier_id         INTEGER,
    supplier_name       VARCHAR(200),
    unit_cost           DECIMAL(12, 2) DEFAULT 0.00,
    storage_location    VARCHAR(100),
    status              VARCHAR(30) NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'quarantined', 'recalled', 'depleted')),
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_medication_batch UNIQUE (medication_id, batch_number)
);

CREATE INDEX IF NOT EXISTS idx_med_batches_expiry ON medication_batches(medication_id, expiry_date ASC);
CREATE INDEX IF NOT EXISTS idx_med_batches_status ON medication_batches(status);

-- ── 2. Batch Dispensations Table ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS batch_dispensations (
    id                  SERIAL PRIMARY KEY,
    prescription_id     INTEGER REFERENCES prescriptions(id) ON DELETE SET NULL,
    batch_id            INTEGER NOT NULL REFERENCES medication_batches(id) ON DELETE RESTRICT,
    quantity            INTEGER NOT NULL CHECK (quantity > 0),
    dispensed_by        INTEGER REFERENCES users(id) ON DELETE SET NULL,
    dispensed_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes               TEXT
);

CREATE INDEX IF NOT EXISTS idx_batch_disp_rx ON batch_dispensations(prescription_id);
CREATE INDEX IF NOT EXISTS idx_batch_disp_batch ON batch_dispensations(batch_id);

-- ── 3. Traceable Inventory Ledger (Stock Movements) ──────────────────
CREATE TABLE IF NOT EXISTS inventory_ledger (
    id                  SERIAL PRIMARY KEY,
    batch_id            INTEGER REFERENCES medication_batches(id) ON DELETE SET NULL,
    medication_id       INTEGER NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
    movement_type       VARCHAR(50) NOT NULL
                        CHECK (movement_type IN ('received', 'dispensed', 'adjusted', 'damaged', 'expired', 'returned', 'quarantined')),
    quantity_change     INTEGER NOT NULL,
    quantity_after      INTEGER NOT NULL,
    reason              TEXT NOT NULL,
    authorized_by       INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reference_id        VARCHAR(100),
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inv_ledger_med ON inventory_ledger(medication_id);
CREATE INDEX IF NOT EXISTS idx_inv_ledger_batch ON inventory_ledger(batch_id);
CREATE INDEX IF NOT EXISTS idx_inv_ledger_created ON inventory_ledger(created_at DESC);

-- ── 4. Patient Allergies Table ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS patient_allergies (
    id                  SERIAL PRIMARY KEY,
    patient_id          INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    allergen_name       VARCHAR(150) NOT NULL,
    allergen_category   VARCHAR(50) NOT NULL DEFAULT 'drug'
                        CHECK (allergen_category IN ('drug', 'food', 'environmental', 'other')),
    reaction_description TEXT,
    severity            VARCHAR(30) NOT NULL DEFAULT 'moderate'
                        CHECK (severity IN ('mild', 'moderate', 'severe', 'anaphylaxis')),
    verification_status VARCHAR(30) NOT NULL DEFAULT 'verified'
                        CHECK (verification_status IN ('unverified', 'verified', 'refuted')),
    recorded_date       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    recorded_by         INTEGER REFERENCES users(id) ON DELETE SET NULL,
    clinical_notes      TEXT,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_patient_allergies_patient ON patient_allergies(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_allergies_allergen ON patient_allergies(LOWER(allergen_name));

-- ── 5. Prescription Allergy Overrides Table ──────────────────────────
CREATE TABLE IF NOT EXISTS prescription_allergy_overrides (
    id                  SERIAL PRIMARY KEY,
    prescription_id     INTEGER REFERENCES prescriptions(id) ON DELETE CASCADE,
    patient_id          INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    medication_name     VARCHAR(200) NOT NULL,
    allergen_name       VARCHAR(150) NOT NULL,
    allergy_severity    VARCHAR(30),
    prescriber_id       INTEGER NOT NULL REFERENCES users(id),
    override_reason     TEXT NOT NULL,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rx_allergy_override_rx ON prescription_allergy_overrides(prescription_id);

-- ── 6. Consultation Addenda Table ────────────────────────────────────
CREATE TABLE IF NOT EXISTS consultation_addenda (
    id                      SERIAL PRIMARY KEY,
    consultation_id         INTEGER NOT NULL REFERENCES doctor_consultations(id) ON DELETE CASCADE,
    encounter_id            INTEGER REFERENCES patient_encounters(id) ON DELETE SET NULL,
    patient_id              INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id               INTEGER NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
    addendum_text           TEXT NOT NULL,
    reason                  TEXT NOT NULL,
    clinical_effective_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_consult_addenda_consult ON consultation_addenda(consultation_id);
CREATE INDEX IF NOT EXISTS idx_consult_addenda_patient ON consultation_addenda(patient_id);

-- ── 7. Clinical Audit Events Table (Immutable Log) ───────────────────
CREATE TABLE IF NOT EXISTS clinical_audit_events (
    id                  SERIAL PRIMARY KEY,
    patient_id          INTEGER REFERENCES patients(id) ON DELETE SET NULL,
    consultation_id     INTEGER REFERENCES doctor_consultations(id) ON DELETE SET NULL,
    record_type         VARCHAR(50) NOT NULL, -- 'consultation', 'prescription', 'allergy_override', 'batch_dispensation', 'stock_adjustment'
    record_id           INTEGER NOT NULL,
    action_type         VARCHAR(50) NOT NULL, -- 'CREATED', 'FINALIZED', 'ADDENDUM_ADDED', 'OVERRIDE_RECORDED', 'DISPENSED', 'ADJUSTED'
    performed_by        INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reason              TEXT,
    previous_state      JSONB,
    new_state           JSONB,
    metadata            JSONB,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_clinical_audit_record ON clinical_audit_events(record_type, record_id);
CREATE INDEX IF NOT EXISTS idx_clinical_audit_patient ON clinical_audit_events(patient_id);
CREATE INDEX IF NOT EXISTS idx_clinical_audit_action ON clinical_audit_events(action_type);
CREATE INDEX IF NOT EXISTS idx_clinical_audit_created ON clinical_audit_events(created_at DESC);

-- ── 8. Outpatient Department (OPD) Waiting Queues Table ──────────────
CREATE TABLE IF NOT EXISTS opd_queues (
    id                      SERIAL PRIMARY KEY,
    queue_token             VARCHAR(50) NOT NULL, -- e.g., 'OPD-015'
    token_number            INTEGER NOT NULL,
    patient_id              INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    encounter_id            INTEGER REFERENCES patient_encounters(id) ON DELETE SET NULL,
    department_id           INTEGER NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    assigned_doctor_id      INTEGER REFERENCES doctors(id) ON DELETE SET NULL,
    consultation_room       VARCHAR(50) DEFAULT 'Room 1',
    queue_date              DATE NOT NULL DEFAULT CURRENT_DATE,
    status                  VARCHAR(30) NOT NULL DEFAULT 'waiting'
                            CHECK (status IN ('waiting', 'next', 'called', 'in_consultation', 'completed', 'cancelled', 'no_show')),
    priority                VARCHAR(20) NOT NULL DEFAULT 'normal'
                            CHECK (priority IN ('emergency', 'urgent', 'normal')),
    ticket_printed_count    INTEGER NOT NULL DEFAULT 1,
    called_at               TIMESTAMP,
    consultation_started_at TIMESTAMP,
    completed_at            TIMESTAMP,
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_dept_date_token UNIQUE (department_id, queue_date, token_number)
);

CREATE INDEX IF NOT EXISTS idx_opd_queues_active ON opd_queues(queue_date, department_id, status);
CREATE INDEX IF NOT EXISTS idx_opd_queues_doc ON opd_queues(assigned_doctor_id, status);

-- ── 9. Safe Migration of Existing Data ───────────────────────────────

-- A. Migrate any existing legacy inventory rows into medication_batches
INSERT INTO medication_batches (
    medication_id, batch_number, quantity_received, quantity_available,
    expiry_date, storage_location, status
)
SELECT 
    inv.medicine_id,
    COALESCE(NULLIF(inv.batch_number, ''), 'LEGACY-B01'),
    inv.quantity,
    inv.quantity,
    COALESCE(inv.expiry_date, CURRENT_DATE + INTERVAL '180 days'),
    inv.location,
    CASE WHEN inv.quantity <= 0 THEN 'depleted' ELSE 'active' END
FROM inventory inv
WHERE inv.medicine_id IS NOT NULL
ON CONFLICT (medication_id, batch_number) DO NOTHING;

-- B. Migrate non-empty text allergies from patients into patient_allergies
INSERT INTO patient_allergies (
    patient_id, allergen_name, allergen_category, reaction_description, severity, verification_status
)
SELECT 
    p.id,
    TRIM(p.allergies),
    'drug',
    'Historical intake record',
    'moderate',
    'unverified'
FROM patients p
WHERE p.allergies IS NOT NULL 
  AND LENGTH(TRIM(p.allergies)) > 0
  AND NOT EXISTS (
      SELECT 1 FROM patient_allergies pa WHERE pa.patient_id = p.id
  );
