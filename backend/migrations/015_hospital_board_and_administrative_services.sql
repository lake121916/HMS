-- =====================================================================
-- Migration 015: Hospital Board and Administrative Services Management
-- Alem Ketema Enat Hospital Management System
-- =====================================================================

-- ── 1. Birth Records & Certificates ──────────────────────────────────
CREATE TABLE IF NOT EXISTS birth_records (
    id                          SERIAL PRIMARY KEY,
    registration_number         VARCHAR(100) UNIQUE NOT NULL,
    certificate_number          VARCHAR(100) UNIQUE,
    baby_name                   VARCHAR(150) NOT NULL,
    gender                      VARCHAR(20) NOT NULL CHECK (gender IN ('male', 'female', 'other')),
    date_of_birth               DATE NOT NULL,
    time_of_birth               TIME NOT NULL,
    mother_id                   INTEGER NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
    mother_name                 VARCHAR(150) NOT NULL,
    father_name                 VARCHAR(150),
    father_national_id          VARCHAR(50),
    father_phone                VARCHAR(50),
    attending_clinician_id      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    attending_clinician_name    VARCHAR(150),
    clinician_role              VARCHAR(50) DEFAULT 'Doctor',
    delivery_type               VARCHAR(50) NOT NULL DEFAULT 'Spontaneous Vaginal'
                                CHECK (delivery_type IN ('Spontaneous Vaginal', 'Cesarean Section', 'Assisted Instrumental', 'Breech Extraction', 'Vacuum Assisted')),
    birth_weight                NUMERIC(5,2) NOT NULL, -- in kilograms (e.g. 3.40)
    gestational_age_weeks       INTEGER DEFAULT 39,
    apgar_score_1min            INTEGER,
    apgar_score_5min            INTEGER,
    place_of_birth              VARCHAR(150) NOT NULL DEFAULT 'Alem Ketema Enat Hospital - Maternity & Delivery Ward',
    medical_record_ref          VARCHAR(100),
    certificate_status          VARCHAR(30) NOT NULL DEFAULT 'draft'
                                CHECK (certificate_status IN ('draft', 'pending_verification', 'approved', 'issued', 'rejected', 'corrected')),
    verification_token          VARCHAR(100) UNIQUE,
    registered_by               INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    verified_by                 INTEGER REFERENCES users(id) ON DELETE SET NULL,
    verified_at                 TIMESTAMP WITH TIME ZONE,
    approved_by                 INTEGER REFERENCES users(id) ON DELETE SET NULL,
    approved_at                 TIMESTAMP WITH TIME ZONE,
    issued_by                   INTEGER REFERENCES users(id) ON DELETE SET NULL,
    issued_at                   TIMESTAMP WITH TIME ZONE,
    rejection_reason            TEXT,
    correction_notes            TEXT,
    created_at                  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at                  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_birth_mother ON birth_records(mother_id);
CREATE INDEX IF NOT EXISTS idx_birth_reg_num ON birth_records(registration_number);
CREATE INDEX IF NOT EXISTS idx_birth_cert_num ON birth_records(certificate_number);
CREATE INDEX IF NOT EXISTS idx_birth_status ON birth_records(certificate_status);

-- ── 2. Death Records & Hospital Medical Death Documentation ──────────
CREATE TABLE IF NOT EXISTS death_records (
    id                          SERIAL PRIMARY KEY,
    record_number               VARCHAR(100) UNIQUE NOT NULL,
    document_number             VARCHAR(100) UNIQUE,
    patient_id                  INTEGER NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
    patient_name                VARCHAR(150) NOT NULL,
    mrn                         VARCHAR(100),
    gender                      VARCHAR(20) NOT NULL,
    age_years                   INTEGER,
    date_of_death               DATE NOT NULL,
    time_of_death               TIME NOT NULL,
    department_id               INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    department_name             VARCHAR(100),
    place_of_death              VARCHAR(150) NOT NULL DEFAULT 'Alem Ketema Enat Hospital',
    attending_doctor_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    attending_doctor_name       VARCHAR(150),
    immediate_cause             TEXT NOT NULL,
    antecedent_cause            TEXT,
    underlying_cause            TEXT,
    icd10_code                  VARCHAR(30),
    contributing_conditions     TEXT,
    autopsy_requested           BOOLEAN DEFAULT false,
    medical_history_summary     TEXT,
    next_of_kin_name            VARCHAR(150) NOT NULL,
    next_of_kin_relation        VARCHAR(50) NOT NULL,
    next_of_kin_phone           VARCHAR(50),
    next_of_kin_address         TEXT,
    document_status             VARCHAR(40) NOT NULL DEFAULT 'pending_medical_verification'
                                CHECK (document_status IN ('pending_medical_verification', 'verified', 'approved', 'issued', 'rejected')),
    verification_token          VARCHAR(100) UNIQUE,
    registered_by               INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    verified_by                 INTEGER REFERENCES users(id) ON DELETE SET NULL,
    verified_at                 TIMESTAMP WITH TIME ZONE,
    approved_by                 INTEGER REFERENCES users(id) ON DELETE SET NULL,
    approved_at                 TIMESTAMP WITH TIME ZONE,
    issued_by                   INTEGER REFERENCES users(id) ON DELETE SET NULL,
    issued_at                   TIMESTAMP WITH TIME ZONE,
    rejection_reason            TEXT,
    created_at                  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at                  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_death_patient ON death_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_death_record_num ON death_records(record_number);
CREATE INDEX IF NOT EXISTS idx_death_doc_num ON death_records(document_number);
CREATE INDEX IF NOT EXISTS idx_death_status ON death_records(document_status);

-- ── 3. Scholarship Programs & Applications ───────────────────────────
CREATE TABLE IF NOT EXISTS scholarship_programs (
    id                          SERIAL PRIMARY KEY,
    program_code                VARCHAR(50) UNIQUE NOT NULL,
    title                       VARCHAR(200) NOT NULL,
    category                    VARCHAR(100) NOT NULL,
    sponsoring_org              VARCHAR(200) NOT NULL,
    total_slots                 INTEGER NOT NULL DEFAULT 1,
    available_slots             INTEGER NOT NULL DEFAULT 1,
    opening_date                DATE NOT NULL,
    closing_date                DATE NOT NULL,
    eligibility_criteria        TEXT NOT NULL,
    financial_support_amount    NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    duration_months             INTEGER NOT NULL DEFAULT 12,
    required_documents          JSONB DEFAULT '["Curriculum Vitae", "Degree Certificate", "Letter of Motivation", "Hospital Recommendation"]'::jsonb,
    status                      VARCHAR(30) NOT NULL DEFAULT 'active'
                                CHECK (status IN ('draft', 'active', 'closed', 'completed')),
    created_by                  INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at                  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at                  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scholarship_applications (
    id                          SERIAL PRIMARY KEY,
    application_number          VARCHAR(100) UNIQUE NOT NULL,
    program_id                  INTEGER NOT NULL REFERENCES scholarship_programs(id) ON DELETE RESTRICT,
    applicant_user_id           INTEGER REFERENCES users(id) ON DELETE SET NULL,
    applicant_name              VARCHAR(150) NOT NULL,
    applicant_type              VARCHAR(30) NOT NULL DEFAULT 'employee'
                                CHECK (applicant_type IN ('employee', 'student')),
    employee_id_code            VARCHAR(50),
    department_id               INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    education_level             VARCHAR(100) NOT NULL,
    academic_gpa                NUMERIC(4,2),
    years_of_experience         NUMERIC(4,1) DEFAULT 0,
    contact_phone               VARCHAR(50) NOT NULL,
    contact_email               VARCHAR(150) NOT NULL,
    statement_of_purpose        TEXT,
    status                      VARCHAR(30) NOT NULL DEFAULT 'submitted'
                                CHECK (status IN ('draft', 'submitted', 'under_review', 'shortlisted', 'approved', 'rejected', 'completed')),
    evaluation_score            NUMERIC(5,2),
    evaluation_remarks          TEXT,
    evaluated_by                INTEGER REFERENCES users(id) ON DELETE SET NULL,
    evaluated_at                TIMESTAMP WITH TIME ZONE,
    board_decision_ref          VARCHAR(100),
    approved_by                 INTEGER REFERENCES users(id) ON DELETE SET NULL,
    approved_at                 TIMESTAMP WITH TIME ZONE,
    rejection_reason            TEXT,
    documents_meta              JSONB DEFAULT '[]'::jsonb,
    created_at                  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at                  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scholarship_app_program ON scholarship_applications(program_id);
CREATE INDEX IF NOT EXISTS idx_scholarship_app_user ON scholarship_applications(applicant_user_id);
CREATE INDEX IF NOT EXISTS idx_scholarship_app_status ON scholarship_applications(status);

-- ── 4. Medical Specialization Programs & Applications ─────────────────
CREATE TABLE IF NOT EXISTS specialization_programs (
    id                          SERIAL PRIMARY KEY,
    program_code                VARCHAR(50) UNIQUE NOT NULL,
    name                        VARCHAR(150) NOT NULL,
    medical_field               VARCHAR(100) NOT NULL,
    partner_institution         VARCHAR(200) NOT NULL,
    duration_years              NUMERIC(3,1) NOT NULL DEFAULT 3.0,
    admission_requirements      TEXT NOT NULL,
    total_positions             INTEGER NOT NULL DEFAULT 2,
    available_positions         INTEGER NOT NULL DEFAULT 2,
    sponsorship_type            VARCHAR(50) NOT NULL DEFAULT 'Full Sponsorship',
    application_deadline        DATE NOT NULL,
    status                      VARCHAR(30) NOT NULL DEFAULT 'active'
                                CHECK (status IN ('active', 'closed', 'upcoming')),
    created_by                  INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at                  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at                  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS specialization_applications (
    id                          SERIAL PRIMARY KEY,
    application_number          VARCHAR(100) UNIQUE NOT NULL,
    program_id                  INTEGER NOT NULL REFERENCES specialization_programs(id) ON DELETE RESTRICT,
    applicant_user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    applicant_name              VARCHAR(150) NOT NULL,
    current_position            VARCHAR(100) NOT NULL,
    department_id               INTEGER NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    current_qualification       VARCHAR(100) NOT NULL,
    work_experience_years       NUMERIC(4,1) NOT NULL DEFAULT 1,
    preferred_institution       VARCHAR(200),
    recommendation_summary      TEXT,
    status                      VARCHAR(40) NOT NULL DEFAULT 'submitted'
                                CHECK (status IN ('submitted', 'department_review', 'hr_verification', 'board_review', 'approved', 'rejected', 'in_training', 'completed')),
    dept_head_approved          BOOLEAN,
    dept_head_id                INTEGER REFERENCES users(id) ON DELETE SET NULL,
    dept_head_notes             TEXT,
    dept_head_reviewed_at       TIMESTAMP WITH TIME ZONE,
    hr_verified                 BOOLEAN,
    hr_user_id                  INTEGER REFERENCES users(id) ON DELETE SET NULL,
    hr_notes                    TEXT,
    hr_verified_at              TIMESTAMP WITH TIME ZONE,
    board_approved              BOOLEAN,
    board_decision_ref          VARCHAR(100),
    board_reviewed_at           TIMESTAMP WITH TIME ZONE,
    training_start_date         DATE,
    training_end_date           DATE,
    rejection_reason            TEXT,
    documents_meta              JSONB DEFAULT '[]'::jsonb,
    created_at                  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at                  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spec_app_program ON specialization_applications(program_id);
CREATE INDEX IF NOT EXISTS idx_spec_app_user ON specialization_applications(applicant_user_id);
CREATE INDEX IF NOT EXISTS idx_spec_app_status ON specialization_applications(status);

-- ── 5. Training & Professional Development ───────────────────────────
CREATE TABLE IF NOT EXISTS training_programs (
    id                          SERIAL PRIMARY KEY,
    program_code                VARCHAR(50) UNIQUE NOT NULL,
    title                       VARCHAR(200) NOT NULL,
    category                    VARCHAR(100) NOT NULL,
    description                 TEXT,
    trainer_name                VARCHAR(150) NOT NULL,
    trainer_institution         VARCHAR(150),
    start_date                  DATE NOT NULL,
    end_date                    DATE NOT NULL,
    venue                       VARCHAR(150) NOT NULL DEFAULT 'Hospital Training Hall A',
    ceu_credits                 NUMERIC(4,1) DEFAULT 0,
    max_participants            INTEGER DEFAULT 30,
    status                      VARCHAR(30) NOT NULL DEFAULT 'scheduled'
                                CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    created_by                  INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at                  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at                  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS training_participants (
    id                          SERIAL PRIMARY KEY,
    training_id                 INTEGER NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
    user_id                     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    participant_name            VARCHAR(150) NOT NULL,
    department_id               INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    attendance_status           VARCHAR(30) NOT NULL DEFAULT 'registered'
                                CHECK (attendance_status IN ('registered', 'attended', 'completed', 'absent')),
    evaluation_score            NUMERIC(5,2),
    certificate_number          VARCHAR(100),
    certificate_issued          BOOLEAN DEFAULT false,
    certificate_issued_at       TIMESTAMP WITH TIME ZONE,
    created_at                  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at                  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(training_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_train_part_training ON training_participants(training_id);
CREATE INDEX IF NOT EXISTS idx_train_part_user ON training_participants(user_id);

-- ── 6. Board Members, Meetings, Agendas & Decisions ───────────────────
CREATE TABLE IF NOT EXISTS board_members (
    id                          SERIAL PRIMARY KEY,
    user_id                     INTEGER REFERENCES users(id) ON DELETE SET NULL,
    full_name                   VARCHAR(150) NOT NULL,
    role_title                  VARCHAR(100) NOT NULL,
    committee                   VARCHAR(100) DEFAULT 'Executive Board',
    department_id               INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    appointed_date              DATE NOT NULL DEFAULT CURRENT_DATE,
    term_end_date               DATE,
    phone                       VARCHAR(50),
    email                       VARCHAR(150),
    is_active                   BOOLEAN NOT NULL DEFAULT true,
    created_at                  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at                  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS board_meetings (
    id                          SERIAL PRIMARY KEY,
    meeting_number              VARCHAR(100) UNIQUE NOT NULL,
    title                       VARCHAR(200) NOT NULL,
    meeting_date                DATE NOT NULL,
    start_time                  TIME NOT NULL,
    end_time                    TIME,
    location                    VARCHAR(150) NOT NULL DEFAULT 'Executive Board Room (Block B, 3rd Floor)',
    status                      VARCHAR(30) NOT NULL DEFAULT 'scheduled'
                                CHECK (status IN ('scheduled', 'in_progress', 'adjourned', 'minutes_approved', 'cancelled')),
    meeting_minutes             TEXT,
    presided_by                 INTEGER REFERENCES users(id) ON DELETE SET NULL,
    recorded_by                 INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_by                  INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at                  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at                  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS board_agendas (
    id                          SERIAL PRIMARY KEY,
    meeting_id                  INTEGER NOT NULL REFERENCES board_meetings(id) ON DELETE CASCADE,
    item_order                  INTEGER NOT NULL DEFAULT 1,
    title                       VARCHAR(200) NOT NULL,
    description                 TEXT,
    presenter_name              VARCHAR(150),
    discussion_notes            TEXT,
    decision_required           BOOLEAN DEFAULT false,
    created_at                  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS board_decisions (
    id                          SERIAL PRIMARY KEY,
    meeting_id                  INTEGER NOT NULL REFERENCES board_meetings(id) ON DELETE CASCADE,
    agenda_id                   INTEGER REFERENCES board_agendas(id) ON DELETE SET NULL,
    resolution_number           VARCHAR(100) UNIQUE NOT NULL,
    resolution_type             VARCHAR(50) NOT NULL DEFAULT 'general'
                                CHECK (resolution_type IN ('scholarship_approval', 'specialization_approval', 'policy_ratification', 'budget_approval', 'general')),
    subject                     VARCHAR(250) NOT NULL,
    resolution_text             TEXT NOT NULL,
    voting_result               VARCHAR(50) DEFAULT 'Unanimously Approved',
    linked_entity_type          VARCHAR(50), -- 'scholarship', 'specialization', 'policy', 'budget'
    linked_entity_id            INTEGER,
    recorded_by                 INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at                  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_board_decisions_meeting ON board_decisions(meeting_id);
CREATE INDEX IF NOT EXISTS idx_board_meetings_date ON board_meetings(meeting_date);

-- ── 7. Administrative Audit Logs ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS administrative_audit_logs (
    id                          SERIAL PRIMARY KEY,
    module                      VARCHAR(50) NOT NULL, -- 'birth_certificate', 'death_certificate', 'scholarship', 'specialization', 'training', 'board'
    action                      VARCHAR(50) NOT NULL, -- 'CREATE', 'UPDATE', 'VERIFY', 'APPROVE', 'REJECT', 'ISSUE', 'CORRECT', 'RECORD_DECISION'
    entity_type                 VARCHAR(50) NOT NULL,
    entity_id                   INTEGER NOT NULL,
    performed_by                INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    reason                      TEXT,
    old_values                  JSONB,
    new_values                  JSONB,
    ip_address                  VARCHAR(50),
    created_at                  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_module ON administrative_audit_logs(module, action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_entity ON administrative_audit_logs(entity_type, entity_id);
