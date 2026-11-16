-- Migration 020: OPD Department Tables (Referrals, Settings & Performance Indexes)
-- Alem Ketema Enat Hospital Management System

BEGIN;

-- 1. Create OPD Referrals Table (Internal and External Referrals)
CREATE TABLE IF NOT EXISTS opd_referrals (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    encounter_id INTEGER REFERENCES patient_encounters(id) ON DELETE SET NULL,
    referral_type VARCHAR(20) NOT NULL DEFAULT 'internal', -- 'internal', 'external'
    urgency VARCHAR(20) NOT NULL DEFAULT 'routine',       -- 'routine', 'urgent', 'emergency'
    referring_doctor_id INTEGER REFERENCES doctors(id) ON DELETE SET NULL,
    receiving_department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    receiving_facility VARCHAR(255),                      -- External hospital/specialized center
    specialty VARCHAR(100),
    reason TEXT NOT NULL,
    clinical_summary TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',        -- 'pending', 'accepted', 'in_progress', 'completed', 'rejected', 'cancelled'
    follow_up_date DATE,
    notes TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create OPD Department Settings Table
CREATE TABLE IF NOT EXISTS opd_settings (
    id SERIAL PRIMARY KEY,
    department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
    appointment_duration_minutes INTEGER DEFAULT 20,
    consultation_fee NUMERIC(10,2) DEFAULT 100.00,
    queue_prefix VARCHAR(10) DEFAULT 'OPD',
    working_hours_start TIME WITHOUT TIME ZONE DEFAULT '08:00:00',
    working_hours_end TIME WITHOUT TIME ZONE DEFAULT '17:00:00',
    max_daily_patients INTEGER DEFAULT 120,
    auto_call_voice BOOLEAN DEFAULT TRUE,
    triage_protocol VARCHAR(50) DEFAULT 'manchester',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default OPD settings for general departments if none exist
INSERT INTO opd_settings (department_id, appointment_duration_minutes, consultation_fee, queue_prefix, working_hours_start, working_hours_end, max_daily_patients)
SELECT d.id, 20, 100.00, 'OPD', '08:00:00', '17:00:00', 120
FROM departments d
WHERE NOT EXISTS (
    SELECT 1 FROM opd_settings s WHERE s.department_id = d.id
)
LIMIT 5;

-- 3. Performance Indexes for OPD Workflows
CREATE INDEX IF NOT EXISTS idx_opd_referrals_patient_id ON opd_referrals(patient_id);
CREATE INDEX IF NOT EXISTS idx_opd_referrals_status ON opd_referrals(status);
CREATE INDEX IF NOT EXISTS idx_opd_referrals_created_at ON opd_referrals(created_at);
CREATE INDEX IF NOT EXISTS idx_opd_queues_date_status ON opd_queues(queue_date, status);
CREATE INDEX IF NOT EXISTS idx_opd_queues_dept_date ON opd_queues(department_id, queue_date);
CREATE INDEX IF NOT EXISTS idx_patient_encounters_status_date ON patient_encounters(status, created_at);

COMMIT;
