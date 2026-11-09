-- ============================================================================
-- ALEM KETEMA ENAT HOSPITAL MANAGEMENT SYSTEM (ዓለም ከተማ እናት ሆስፒታል)
-- Comprehensive Ethiopian Demonstration Database Seed Script
-- Final-Year Information Technology Project Defense
-- Candidate: Lake Awraris | Debre Berhan University (DBU)
-- ============================================================================

BEGIN;

-- 1. HOSPITAL DEPARTMENTS
INSERT INTO departments (name, description, head_doctor_id, is_active)
VALUES 
  ('General Medicine', 'Primary care, adult outpatient triage and non-specialized consultations', NULL, true),
  ('Emergency Department', '24/7 acute trauma, resuscitation, and critical emergency reception', NULL, true),
  ('Pediatrics', 'Comprehensive neonatal, infant, and child healthcare services', NULL, true),
  ('Gynecology and Obstetrics', 'Maternal health, prenatal care, labor, delivery, and postpartum ward', NULL, true),
  ('Surgery', 'General, elective, and emergency operative surgical theatre and post-op care', NULL, true),
  ('Laboratory', 'Hematology, parasitology, clinical chemistry, microbiology and blood bank', NULL, true),
  ('Pharmacy', 'Inpatient dispensing, outpatient pharmaceutical care, inventory & cold chain', NULL, true),
  ('Radiology', 'Diagnostic imaging, digital X-Ray, ultrasound, and emergency fluoroscopy', NULL, true),
  ('Dentistry', 'Preventive, restorative oral health, extractions, and dental trauma care', NULL, true),
  ('Outpatient Department (OPD)', 'Ambulatory patient registration, initial screening, and coordinated triage', NULL, true)
ON CONFLICT (name) DO UPDATE SET is_active = true;

-- Note: The full deterministic data insertion with active bcrypt password hashes
-- and cryptographically generated opaque QR tokens is automated via:
--   npm --prefix backend run db:seed-demo
-- which populates:
--   - 8 Ethiopian specialist & general doctors
--   - 10 Ethiopian nurses across shifts
--   - 32 Realistic Ethiopian patients with active scannable QR tokens
--   - 12 Ethiopian pharmaceutical formulary entries (ETB)
--   - 20 Inpatient hospital beds across 5 wards
--   - 32 Appointments
--   - 24 Encounters with vital signs & clinical triage
--   - 18 Laboratory diagnostic orders & 14 verified laboratory results
--   - 24 Dispensed electronic prescriptions
--   - 15 Itemized invoices & verified receipts (Telebirr, CBE Birr & Cash Desk)

COMMIT;
