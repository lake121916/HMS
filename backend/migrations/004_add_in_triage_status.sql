-- Migration 004: Update patient_encounters_status_check constraint to include 'in_triage'
ALTER TABLE patient_encounters DROP CONSTRAINT IF EXISTS patient_encounters_status_check;

ALTER TABLE patient_encounters ADD CONSTRAINT patient_encounters_status_check
  CHECK (status IN (
    'registered',
    'waiting_for_triage',
    'in_triage',
    'triage_completed',
    'department_assigned',
    'doctor_assigned',
    'waiting_for_doctor',
    'in_consultation',
    'services_ordered',
    'billing_generated',
    'payment_pending',
    'paid',
    'completed',
    'cancelled'
  ));
