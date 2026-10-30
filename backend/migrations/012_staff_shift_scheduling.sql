-- Migration 012: Expand Shift Scheduling to All Staff (Nurses, Lab Techs, Pharmacists, Doctors)
-- Alem Ketema Enat Hospital Management System

ALTER TABLE doctor_shifts ALTER COLUMN doctor_id DROP NOT NULL;
ALTER TABLE doctor_shifts ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE doctor_shifts ADD COLUMN IF NOT EXISTS staff_role VARCHAR(50) DEFAULT 'doctor';
ALTER TABLE doctor_shifts ADD COLUMN IF NOT EXISTS staff_name VARCHAR(150);

-- Backfill user_id and staff_name for existing doctor_shifts
UPDATE doctor_shifts ds
SET user_id = d.user_id,
    staff_name = TRIM(d.first_name || ' ' || d.last_name),
    staff_role = 'doctor'
FROM doctors d
WHERE ds.doctor_id = d.id AND ds.user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_doctor_shifts_user_id ON doctor_shifts(user_id);
CREATE INDEX IF NOT EXISTS idx_doctor_shifts_staff_role ON doctor_shifts(staff_role);
