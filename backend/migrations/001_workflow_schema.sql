-- ============================================================
-- HMS Workflow Migration 001
-- Full Patient Encounter Workflow + Auto-Billing Engine
-- ============================================================

-- ── 1. Services catalog ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS services (
    id                SERIAL PRIMARY KEY,
    name              VARCHAR(255)    NOT NULL,
    category          VARCHAR(50)     NOT NULL CHECK (category IN (
                          'consultation','lab_test','radiology','medication',
                          'procedure','bed','other')),
    description       TEXT,
    unit_price        DECIMAL(12, 2)  NOT NULL DEFAULT 0.00,
    is_active         BOOLEAN         NOT NULL DEFAULT true,
    department_id     INTEGER         REFERENCES departments(id) ON DELETE SET NULL,
    created_at        TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
);

-- ── 2. Patient encounters ────────────────────────────────────
-- Full lifecycle from registration through payment
CREATE TABLE IF NOT EXISTS patient_encounters (
    id                SERIAL PRIMARY KEY,
    patient_id        INTEGER         NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    encounter_number  VARCHAR(50)     UNIQUE,
    encounter_type    VARCHAR(30)     NOT NULL DEFAULT 'outpatient'
                          CHECK (encounter_type IN ('outpatient','inpatient','emergency')),
    status            VARCHAR(50)     NOT NULL DEFAULT 'registered'
                          CHECK (status IN (
                              'registered','waiting_for_triage','triage_completed',
                              'department_assigned','doctor_assigned','waiting_for_doctor',
                              'in_consultation','services_ordered','billing_generated',
                              'payment_pending','paid','completed','cancelled'
                          )),
    created_by        INTEGER         REFERENCES users(id) ON DELETE SET NULL,  -- receptionist
    created_at        TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
);

-- Unique sequential encounter number
CREATE OR REPLACE FUNCTION generate_encounter_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.encounter_number := 'ENC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEW.id::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_encounter_number ON patient_encounters;
CREATE TRIGGER set_encounter_number
    BEFORE INSERT ON patient_encounters
    FOR EACH ROW WHEN (NEW.encounter_number IS NULL)
    EXECUTE FUNCTION generate_encounter_number();

-- ── 3. Triage assessments ────────────────────────────────────
CREATE TABLE IF NOT EXISTS triage_assessments (
    id                      SERIAL PRIMARY KEY,
    encounter_id            INTEGER         NOT NULL REFERENCES patient_encounters(id) ON DELETE CASCADE,
    patient_id              INTEGER         NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    -- Vital signs
    temperature             DECIMAL(5, 2),
    blood_pressure_systolic  INTEGER,
    blood_pressure_diastolic INTEGER,
    heart_rate              INTEGER,
    respiratory_rate        INTEGER,
    oxygen_saturation       DECIMAL(5, 2),
    weight                  DECIMAL(5, 2),
    height                  DECIMAL(5, 2),
    -- Clinical
    chief_complaint         TEXT            NOT NULL,
    preliminary_observations TEXT,
    priority                VARCHAR(20)     NOT NULL DEFAULT 'normal'
                                CHECK (priority IN ('emergency','urgent','normal')),
    -- Staff
    assessed_by             INTEGER         REFERENCES users(id) ON DELETE SET NULL,
    assessed_at             TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    created_at              TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
);

-- ── 4. Department & doctor assignments ──────────────────────
CREATE TABLE IF NOT EXISTS encounter_assignments (
    id                SERIAL PRIMARY KEY,
    encounter_id      INTEGER         NOT NULL REFERENCES patient_encounters(id) ON DELETE CASCADE,
    patient_id        INTEGER         NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    department_id     INTEGER         NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    doctor_id         INTEGER         NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
    assigned_by       INTEGER         REFERENCES users(id) ON DELETE SET NULL,
    assigned_at       TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    notes             TEXT,
    UNIQUE (encounter_id)  -- one assignment per encounter
);

-- ── 5. Doctor consultations ──────────────────────────────────
CREATE TABLE IF NOT EXISTS doctor_consultations (
    id                    SERIAL PRIMARY KEY,
    encounter_id          INTEGER         NOT NULL REFERENCES patient_encounters(id) ON DELETE CASCADE,
    patient_id            INTEGER         NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id             INTEGER         NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
    consultation_notes    TEXT,
    diagnosis             TEXT,
    icd_code              VARCHAR(20),
    treatment_plan        TEXT,
    follow_up_instructions TEXT,
    status                VARCHAR(20)     NOT NULL DEFAULT 'in_progress'
                              CHECK (status IN ('in_progress','completed','cancelled')),
    started_at            TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    completed_at          TIMESTAMP,
    created_at            TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (encounter_id)
);

-- ── 6. Invoices (extended) ───────────────────────────────────
-- Add encounter_id to existing invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS encounter_id INTEGER REFERENCES patient_encounters(id) ON DELETE SET NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS doctor_id INTEGER REFERENCES doctors(id) ON DELETE SET NULL;

-- ── 7. Invoice items (line items) ────────────────────────────
CREATE TABLE IF NOT EXISTS invoice_items (
    id              SERIAL PRIMARY KEY,
    invoice_id      INTEGER         NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    patient_id      INTEGER         NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    encounter_id    INTEGER         REFERENCES patient_encounters(id) ON DELETE SET NULL,
    service_id      INTEGER         REFERENCES services(id) ON DELETE SET NULL,
    description     VARCHAR(500)    NOT NULL,
    quantity        INTEGER         NOT NULL DEFAULT 1,
    unit_price      DECIMAL(12, 2)  NOT NULL,
    subtotal        DECIMAL(12, 2)  GENERATED ALWAYS AS (quantity * unit_price) STORED,
    source_type     VARCHAR(50)     NOT NULL  -- 'prescription','lab_order','radiology_order','consultation','procedure','bed'
                        CHECK (source_type IN (
                            'prescription','lab_order','radiology_order',
                            'consultation','procedure','bed','other'
                        )),
    source_id       INTEGER         NOT NULL, -- FK to the originating record
    created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    -- ▶ Duplicate-billing protection: one item per source transaction
    UNIQUE (source_type, source_id)
);

-- ── 8. Billing events (audit trail) ─────────────────────────
CREATE TABLE IF NOT EXISTS billing_events (
    id              SERIAL PRIMARY KEY,
    encounter_id    INTEGER         REFERENCES patient_encounters(id) ON DELETE SET NULL,
    patient_id      INTEGER         NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    invoice_id      INTEGER         REFERENCES invoices(id) ON DELETE SET NULL,
    invoice_item_id INTEGER         REFERENCES invoice_items(id) ON DELETE SET NULL,
    event_type      VARCHAR(50)     NOT NULL,  -- matches source_type
    event_id        INTEGER         NOT NULL,  -- matches source_id
    amount          DECIMAL(12, 2)  NOT NULL,
    description     TEXT,
    created_by      INTEGER         REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
);

-- ── 9. Add encounter_id to clinical tables ──────────────────
ALTER TABLE prescriptions  ADD COLUMN IF NOT EXISTS encounter_id INTEGER REFERENCES patient_encounters(id) ON DELETE SET NULL;
ALTER TABLE lab_tests       ADD COLUMN IF NOT EXISTS encounter_id INTEGER REFERENCES patient_encounters(id) ON DELETE SET NULL;
ALTER TABLE diagnoses       ADD COLUMN IF NOT EXISTS encounter_id INTEGER REFERENCES patient_encounters(id) ON DELETE SET NULL;
ALTER TABLE vitals          ADD COLUMN IF NOT EXISTS encounter_id INTEGER REFERENCES patient_encounters(id) ON DELETE SET NULL;

-- ── 10. Radiology orders (separate from lab_tests) ──────────
CREATE TABLE IF NOT EXISTS radiology_orders (
    id              SERIAL PRIMARY KEY,
    encounter_id    INTEGER         REFERENCES patient_encounters(id) ON DELETE SET NULL,
    patient_id      INTEGER         NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id       INTEGER         NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
    study_type      VARCHAR(100)    NOT NULL,  -- X-Ray, MRI, CT, Ultrasound, etc.
    body_part       VARCHAR(100),
    clinical_indication TEXT,
    priority        VARCHAR(20)     DEFAULT 'routine' CHECK (priority IN ('routine','urgent','stat')),
    status          VARCHAR(30)     DEFAULT 'ordered' CHECK (status IN ('ordered','in_progress','completed','cancelled')),
    findings        TEXT,
    impression      TEXT,
    performed_by    INTEGER         REFERENCES users(id) ON DELETE SET NULL,
    performed_at    TIMESTAMP,
    notes           TEXT,
    created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
);

-- ── 11. Procedure orders ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS procedure_orders (
    id              SERIAL PRIMARY KEY,
    encounter_id    INTEGER         REFERENCES patient_encounters(id) ON DELETE SET NULL,
    patient_id      INTEGER         NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id       INTEGER         NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
    procedure_name  VARCHAR(255)    NOT NULL,
    description     TEXT,
    priority        VARCHAR(20)     DEFAULT 'routine' CHECK (priority IN ('routine','urgent','emergency')),
    status          VARCHAR(30)     DEFAULT 'ordered' CHECK (status IN ('ordered','in_progress','completed','cancelled')),
    performed_by    INTEGER         REFERENCES users(id) ON DELETE SET NULL,
    performed_at    TIMESTAMP,
    notes           TEXT,
    created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
);

-- ── 12. Indexes ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_patient_encounters_patient_id  ON patient_encounters(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_encounters_status      ON patient_encounters(status);
CREATE INDEX IF NOT EXISTS idx_triage_assessments_encounter   ON triage_assessments(encounter_id);
CREATE INDEX IF NOT EXISTS idx_triage_assessments_patient     ON triage_assessments(patient_id);
CREATE INDEX IF NOT EXISTS idx_encounter_assignments_encounter ON encounter_assignments(encounter_id);
CREATE INDEX IF NOT EXISTS idx_encounter_assignments_doctor    ON encounter_assignments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_consultations_encounter  ON doctor_consultations(encounter_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice           ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_source            ON invoice_items(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_encounter         ON invoice_items(encounter_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_patient          ON billing_events(patient_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_encounter        ON billing_events(encounter_id);
CREATE INDEX IF NOT EXISTS idx_radiology_orders_patient        ON radiology_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_radiology_orders_encounter      ON radiology_orders(encounter_id);
CREATE INDEX IF NOT EXISTS idx_procedure_orders_encounter      ON procedure_orders(encounter_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_dedup            ON invoice_items(source_type, source_id);

-- ── 13. Default services catalog ─────────────────────────────
INSERT INTO services (name, category, description, unit_price) VALUES
  ('General Consultation',       'consultation', 'Standard outpatient consultation',         500.00),
  ('Emergency Consultation',     'consultation', 'Emergency department consultation',        1200.00),
  ('Specialist Consultation',    'consultation', 'Specialist doctor consultation',           800.00),
  ('Complete Blood Count (CBC)', 'lab_test',     'Full blood cell count panel',              300.00),
  ('Blood Glucose',              'lab_test',     'Fasting and random blood glucose',         150.00),
  ('Liver Function Test',        'lab_test',     'LFT panel',                               400.00),
  ('Renal Function Test',        'lab_test',     'RFT/KFT panel',                           400.00),
  ('Urinalysis',                 'lab_test',     'Complete urinalysis',                     200.00),
  ('Chest X-Ray',                'radiology',    'PA/AP chest radiograph',                  700.00),
  ('Abdominal Ultrasound',       'radiology',    'Abdominal sonogram',                     1200.00),
  ('CT Scan Head',               'radiology',    'CT head without contrast',               3500.00),
  ('MRI Brain',                  'radiology',    'MRI brain without contrast',             5000.00),
  ('IV Cannulation',             'procedure',    'Intravenous line insertion',              200.00),
  ('Wound Dressing',             'procedure',    'Basic wound cleaning and dressing',       300.00),
  ('ECG',                        'procedure',    '12-lead electrocardiogram',               400.00)
ON CONFLICT DO NOTHING;
