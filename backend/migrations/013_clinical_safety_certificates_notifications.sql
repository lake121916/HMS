-- =====================================================================
-- Migration 013: Clinical Safety, Medical Certificates & Notifications Outbox
-- Alem Ketema Enat Hospital Management System
-- =====================================================================

-- ── 1. Medical Certificates Table (Priority 2) ────────────────────────
CREATE TABLE IF NOT EXISTS medical_certificates (
    id                      SERIAL PRIMARY KEY,
    certificate_number      VARCHAR(100) UNIQUE NOT NULL,
    patient_id              INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    encounter_id            INTEGER REFERENCES patient_encounters(id) ON DELETE SET NULL,
    clinician_id            INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    examination_date        DATE NOT NULL DEFAULT CURRENT_DATE,
    medical_statement       TEXT NOT NULL,
    diagnosis_summary       TEXT,
    sick_leave_recommended  BOOLEAN NOT NULL DEFAULT false,
    sick_leave_start_date   DATE,
    sick_leave_end_date     DATE,
    sick_leave_days         INTEGER DEFAULT 0,
    fit_for_work            BOOLEAN DEFAULT true,
    issue_date              DATE NOT NULL DEFAULT CURRENT_DATE,
    status                  VARCHAR(20) NOT NULL DEFAULT 'valid'
                            CHECK (status IN ('valid', 'revoked', 'superseded')),
    revocation_reason       TEXT,
    revoked_by              INTEGER REFERENCES users(id) ON DELETE SET NULL,
    revoked_at              TIMESTAMP WITH TIME ZONE,
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_med_cert_patient ON medical_certificates(patient_id);
CREATE INDEX IF NOT EXISTS idx_med_cert_clinician ON medical_certificates(clinician_id);
CREATE INDEX IF NOT EXISTS idx_med_cert_number ON medical_certificates(certificate_number);

-- ── 2. Notification Outbox Queue Table (Priority 3) ───────────────────
CREATE TABLE IF NOT EXISTS notification_queue (
    id                      SERIAL PRIMARY KEY,
    entity_type             VARCHAR(50) NOT NULL, -- 'appointment', 'prescription', 'general'
    entity_id               INTEGER NOT NULL,
    patient_id              INTEGER REFERENCES patients(id) ON DELETE CASCADE,
    channel                 VARCHAR(30) NOT NULL DEFAULT 'sms'
                            CHECK (channel IN ('sms', 'telegram', 'in_app', 'email')),
    provider                VARCHAR(50) NOT NULL DEFAULT 'mock'
                            CHECK (provider IN ('mock', 'twilio', 'africastalking', 'telegram')),
    recipient_phone         VARCHAR(50),
    recipient_telegram_id   VARCHAR(100),
    template_key            VARCHAR(100) NOT NULL,
    language                VARCHAR(10) NOT NULL DEFAULT 'en',
    message_content         TEXT NOT NULL,
    status                  VARCHAR(30) NOT NULL DEFAULT 'queued'
                            CHECK (status IN ('queued', 'sent', 'delivered', 'failed', 'cancelled')),
    attempts                INTEGER NOT NULL DEFAULT 0,
    max_attempts            INTEGER NOT NULL DEFAULT 3,
    last_error              TEXT,
    provider_message_id     VARCHAR(200),
    idempotency_key         VARCHAR(150) UNIQUE NOT NULL,
    metadata                JSONB,
    scheduled_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at                 TIMESTAMP WITH TIME ZONE,
    delivered_at            TIMESTAMP WITH TIME ZONE,
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_queue_status ON notification_queue(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_notif_queue_patient ON notification_queue(patient_id);
CREATE INDEX IF NOT EXISTS idx_notif_queue_idempotency ON notification_queue(idempotency_key);

-- ── 3. Patient Telegram Verification Registry ─────────────────────────
CREATE TABLE IF NOT EXISTS patient_telegram_verifications (
    id                      SERIAL PRIMARY KEY,
    patient_id              INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    telegram_chat_id        VARCHAR(100),
    telegram_username       VARCHAR(100),
    verification_code       VARCHAR(20),
    is_verified             BOOLEAN NOT NULL DEFAULT false,
    verified_at             TIMESTAMP WITH TIME ZONE,
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE patient_telegram_verifications ALTER COLUMN telegram_chat_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_telegram_patient ON patient_telegram_verifications(patient_id);
CREATE INDEX IF NOT EXISTS idx_telegram_chat ON patient_telegram_verifications(telegram_chat_id);
