-- Migration 010: Emergency Alerts, Clinical Document Verifications, Doctor Shifts & Handovers
-- Designed for Alem Ketema Enat Hospital Management System

-- 1. Emergency Alerts Table
CREATE TABLE IF NOT EXISTS emergency_alerts (
    id SERIAL PRIMARY KEY,
    encounter_id INTEGER NOT NULL REFERENCES patient_encounters(id) ON DELETE CASCADE,
    patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'emergency', -- 'emergency', 'critical', 'resuscitation'
    reason TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'active', -- 'active', 'acknowledged', 'in_assessment', 'escalated', 'resolved'
    escalation_level INTEGER NOT NULL DEFAULT 0,
    last_escalated_at TIMESTAMP WITH TIME ZONE,
    acknowledged_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    in_assessment_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    in_assessment_at TIMESTAMP WITH TIME ZONE,
    resolved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emergency_alerts_status ON emergency_alerts(status);
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_encounter ON emergency_alerts(encounter_id);
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_patient ON emergency_alerts(patient_id);
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_created_at ON emergency_alerts(created_at);

-- 2. Emergency Audit Logs Table
CREATE TABLE IF NOT EXISTS emergency_audit_logs (
    id SERIAL PRIMARY KEY,
    alert_id INTEGER NOT NULL REFERENCES emergency_alerts(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- 'created', 'acknowledged', 'escalated', 'assessment_started', 'resolved', 'notification_sent', 'notification_failed'
    performed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emergency_audit_alert_id ON emergency_audit_logs(alert_id);
CREATE INDEX IF NOT EXISTS idx_emergency_audit_action ON emergency_audit_logs(action);

-- 3. Document Verifications Table (For Priority 2 QR Verification)
CREATE TABLE IF NOT EXISTS document_verifications (
    id SERIAL PRIMARY KEY,
    verification_token VARCHAR(64) UNIQUE NOT NULL,
    document_type VARCHAR(50) NOT NULL, -- 'prescription', 'lab_result', 'discharge_summary'
    document_number VARCHAR(100) NOT NULL,
    entity_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    encounter_id INTEGER REFERENCES patient_encounters(id) ON DELETE SET NULL,
    issued_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) NOT NULL DEFAULT 'valid', -- 'valid', 'revoked', 'expired'
    revoked_reason TEXT,
    metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_doc_verify_token ON document_verifications(verification_token);
CREATE INDEX IF NOT EXISTS idx_doc_verify_type_entity ON document_verifications(document_type, entity_id);

-- 4. Doctor Shifts Table (For Priority 3 Doctor Shift Scheduling)
CREATE TABLE IF NOT EXISTS doctor_shifts (
    id SERIAL PRIMARY KEY,
    doctor_id INTEGER NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    shift_date DATE NOT NULL,
    shift_type VARCHAR(30) NOT NULL DEFAULT 'morning', -- 'morning', 'evening', 'night', 'on_call', 'custom'
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'confirmed', 'completed', 'cancelled', 'absence'
    is_on_duty BOOLEAN DEFAULT false,
    max_active_patients INTEGER DEFAULT 20,
    notes TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doctor_shifts_date ON doctor_shifts(shift_date);
CREATE INDEX IF NOT EXISTS idx_doctor_shifts_doctor ON doctor_shifts(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_shifts_status ON doctor_shifts(status);
CREATE INDEX IF NOT EXISTS idx_doctor_shifts_duty ON doctor_shifts(is_on_duty);

-- 5. Clinical Handovers Table (For Priority 3 Shift Handover)
CREATE TABLE IF NOT EXISTS clinical_handovers (
    id SERIAL PRIMARY KEY,
    shift_id INTEGER REFERENCES doctor_shifts(id) ON DELETE SET NULL,
    from_doctor_id INTEGER NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    to_doctor_id INTEGER NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    encounter_id INTEGER REFERENCES patient_encounters(id) ON DELETE SET NULL,
    pending_tasks TEXT,
    clinical_notes TEXT,
    is_acknowledged BOOLEAN DEFAULT false,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clinical_handovers_from_doc ON clinical_handovers(from_doctor_id);
CREATE INDEX IF NOT EXISTS idx_clinical_handovers_to_doc ON clinical_handovers(to_doctor_id);
CREATE INDEX IF NOT EXISTS idx_clinical_handovers_patient ON clinical_handovers(patient_id);
