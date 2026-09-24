exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS clinical_encounters (
      id SERIAL PRIMARY KEY,
      patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      doctor_id INTEGER REFERENCES doctors(id) ON DELETE SET NULL,
      appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
      chief_complaint TEXT,
      examination_notes TEXT,
      assessment TEXT,
      treatment_plan TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'signed', 'amended')),
      signed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS workflow_status_history (
      id SERIAL PRIMARY KEY,
      entity_type VARCHAR(40) NOT NULL,
      entity_id INTEGER NOT NULL,
      from_status VARCHAR(50),
      to_status VARCHAR(50) NOT NULL,
      changed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS referrals (
      id SERIAL PRIMARY KEY,
      patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      referring_facility VARCHAR(255),
      referring_clinician VARCHAR(255),
      clinical_summary TEXT NOT NULL,
      urgency VARCHAR(20) NOT NULL DEFAULT 'routine' CHECK (urgency IN ('routine', 'urgent', 'emergency')),
      receiving_department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
      assigned_doctor_id INTEGER REFERENCES doctors(id) ON DELETE SET NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'under_review', 'accepted', 'scheduled', 'completed', 'rejected')),
      attachment_url VARCHAR(500),
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS triage_cases (
      id SERIAL PRIMARY KEY,
      patient_id INTEGER REFERENCES patients(id) ON DELETE SET NULL,
      patient_name VARCHAR(255) NOT NULL,
      symptoms TEXT NOT NULL,
      triage_level VARCHAR(20) NOT NULL CHECK (triage_level IN ('critical', 'urgent', 'standard', 'non_urgent')),
      arrival_source VARCHAR(50) NOT NULL DEFAULT 'walk_in',
      assigned_department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
      assigned_doctor_id INTEGER REFERENCES doctors(id) ON DELETE SET NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'in_assessment', 'admitted', 'discharged', 'transferred')),
      notes TEXT,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_encounters_patient ON clinical_encounters(patient_id);
    CREATE INDEX IF NOT EXISTS idx_encounters_appointment ON clinical_encounters(appointment_id);
    CREATE INDEX IF NOT EXISTS idx_workflow_history_entity ON workflow_status_history(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
    CREATE INDEX IF NOT EXISTS idx_triage_status ON triage_cases(status, triage_level);

    ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS workflow_status VARCHAR(40) NOT NULL DEFAULT 'created';
    ALTER TABLE lab_tests ADD COLUMN IF NOT EXISTS workflow_status VARCHAR(40) NOT NULL DEFAULT 'ordered';
    ALTER TABLE notifications ADD COLUMN IF NOT EXISTS channel VARCHAR(20) NOT NULL DEFAULT 'in_app';
    ALTER TABLE notifications ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE notifications DROP COLUMN IF EXISTS delivered_at;
    ALTER TABLE notifications DROP COLUMN IF EXISTS channel;
    ALTER TABLE lab_tests DROP COLUMN IF EXISTS workflow_status;
    ALTER TABLE prescriptions DROP COLUMN IF EXISTS workflow_status;
    DROP TABLE IF EXISTS triage_cases;
    DROP TABLE IF EXISTS referrals;
    DROP TABLE IF EXISTS workflow_status_history;
    DROP TABLE IF EXISTS clinical_encounters;
  `);
};
