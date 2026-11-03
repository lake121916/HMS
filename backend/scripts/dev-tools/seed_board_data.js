const pool = require('../../src/config/database');

async function seedBoardData() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Get or create mother patient for birth certificates
    let motherRes = await client.query("SELECT id, first_name, last_name FROM patients WHERE gender = 'female' LIMIT 2");
    if (!motherRes.rows.length) {
      console.log('No female patients found for mother role, using any patient');
      motherRes = await client.query("SELECT id, first_name, last_name FROM patients LIMIT 2");
    }
    const mother1 = motherRes.rows[0];
    const mother2 = motherRes.rows[1] || mother1;

    // Get an admin or doctor user
    const docRes = await client.query("SELECT u.id, u.email, d.first_name, d.last_name FROM users u LEFT JOIN doctors d ON d.user_id = u.id WHERE u.role IN ('doctor', 'admin', 'super_admin') LIMIT 2");
    const docUser = docRes.rows[0];
    const docUser2 = docRes.rows[1] || docUser;
    const docName = docUser?.first_name ? `Dr. ${docUser.first_name} ${docUser.last_name}` : 'Dr. Dawit Haile';
    const docName2 = docUser2?.first_name ? `Dr. ${docUser2.first_name} ${docUser2.last_name}` : 'Dr. Almaz Bekele';

    const adminRes = await client.query("SELECT id FROM users WHERE role IN ('admin', 'super_admin') LIMIT 1");
    const adminId = adminRes.rows[0]?.id || docUser.id;

    // 2. Seed Birth Records
    const birthCheck = await client.query("SELECT id FROM birth_records LIMIT 1");
    if (!birthCheck.rows.length) {
      await client.query(`
        INSERT INTO birth_records 
          (registration_number, certificate_number, baby_name, gender, date_of_birth, time_of_birth,
           mother_id, mother_name, father_name, father_national_id, father_phone,
           attending_clinician_id, attending_clinician_name, clinician_role, delivery_type,
           birth_weight, gestational_age_weeks, apgar_score_1min, apgar_score_5min,
           place_of_birth, medical_record_ref, certificate_status, verification_token,
           registered_by, verified_by, verified_at, approved_by, approved_at, issued_by, issued_at)
        VALUES
          ('BTH-2026-00012', 'BRC-2026-000108', 'Kidus Yohannes Bekele', 'male', CURRENT_DATE - 3, '04:25:00',
           $1, $2, 'Yohannes Bekele Tadesse', 'ETH-NID-8839210', '+251 911 234 567',
           $3, $4, 'Obstetrician', 'Spontaneous Vaginal',
           3.45, 39, 8, 9,
           'Alem Ketema Enat Hospital - Labor & Delivery Room 2', 'MRN-BTH-8902', 'issued', 'vtok_birth_77a912be',
           $5, $3, NOW() - INTERVAL '2 days', $5, NOW() - INTERVAL '1 day', $5, NOW() - INTERVAL '1 day'),
          
          ('BTH-2026-00013', 'BRC-2026-000109', 'Emanuela Samuel Worku', 'female', CURRENT_DATE - 1, '11:15:00',
           $6, $7, 'Samuel Worku Kebede', 'ETH-NID-9921402', '+251 922 456 789',
           $8, $9, 'Midwife Specialist', 'Spontaneous Vaginal',
           3.10, 40, 9, 10,
           'Alem Ketema Enat Hospital - Labor & Delivery Room 1', 'MRN-BTH-8905', 'approved', 'vtok_birth_88c421ef',
           $5, $8, NOW() - INTERVAL '12 hours', $5, NOW() - INTERVAL '6 hours', NULL, NULL),

          ('BTH-2026-00014', NULL, 'Baby of Aster Tesfaye (Twin A)', 'male', CURRENT_DATE, '08:40:00',
           $6, $7, 'Getachew Mengistu', 'ETH-NID-7729104', '+251 933 678 901',
           $3, $4, 'Doctor', 'Cesarean Section',
           2.85, 37, 7, 8,
           'Alem Ketema Enat Hospital - Surgical Theatre 1', 'MRN-BTH-8911', 'pending_verification', NULL,
           $5, NULL, NULL, NULL, NULL, NULL, NULL)
      `, [
        mother1.id, `${mother1.first_name} ${mother1.last_name}`,
        docUser.id, docName, adminId,
        mother2.id, `${mother2.first_name} ${mother2.last_name}`,
        docUser2.id, docName2
      ]);

      // Seed corresponding document_verifications for the issued birth certificate
      await client.query(`
        INSERT INTO document_verifications
          (verification_token, document_type, document_number, entity_id, patient_id, issued_by, status, metadata)
        VALUES
          ('vtok_birth_77a912be', 'birth_certificate', 'BRC-2026-000108', 1, $1, $2, 'valid',
           '{"baby_name": "Kidus Yohannes Bekele", "delivery_type": "Spontaneous Vaginal", "birth_weight": 3.45}'::jsonb)
        ON CONFLICT (verification_token) DO NOTHING
      `, [mother1.id, adminId]);

      console.log('Seeded birth records.');
    }

    // 3. Seed Death Records
    const deathCheck = await client.query("SELECT id FROM death_records LIMIT 1");
    if (!deathCheck.rows.length) {
      const patRes = await client.query("SELECT id, first_name, last_name, gender, date_of_birth FROM patients LIMIT 2");
      const p1 = patRes.rows[0];
      const p2 = patRes.rows[1] || p1;

      await client.query(`
        INSERT INTO death_records
          (record_number, document_number, patient_id, patient_name, mrn, gender, age_years,
           date_of_death, time_of_death, department_name, place_of_death,
           attending_doctor_id, attending_doctor_name,
           immediate_cause, antecedent_cause, underlying_cause, icd10_code, contributing_conditions,
           autopsy_requested, medical_history_summary,
           next_of_kin_name, next_of_kin_relation, next_of_kin_phone, next_of_kin_address,
           document_status, verification_token, registered_by, verified_by, verified_at, approved_by, approved_at, issued_by, issued_at)
        VALUES
          ('DTH-2026-00004', 'DOC-DTH-2026-0041', $1, $2, 'ETH-MRN-4819', $3, 68,
           CURRENT_DATE - 4, '14:20:00', 'Intensive Care Unit (ICU)', 'Alem Ketema Enat Hospital - ICU Bed 4',
           $4, $5,
           'Septic Shock', 'Severe Community-Acquired Pneumonia with ARDS', 'Type 2 Diabetes Mellitus with Chronic Kidney Disease', 'J18.9', 'Hypertensive Nephrosclerosis',
           false, 'Patient was admitted 8 days prior with progressive respiratory failure, placed on invasive mechanical ventilation.',
           'Tewodros Bekele', 'Son', '+251 911 889 900', 'Alem Ketema Town, Kebele 02',
           'issued', 'vtok_death_33b819ac', $6, $4, NOW() - INTERVAL '3 days', $6, NOW() - INTERVAL '2 days', $6, NOW() - INTERVAL '2 days'),

          ('DTH-2026-00005', NULL, $7, $8, 'ETH-MRN-9021', $9, 54,
           CURRENT_DATE - 1, '22:45:00', 'Emergency Department', 'Alem Ketema Enat Hospital - Emergency Resuscitation Room',
           $4, $5,
           'Acute Massive Myocardial Infarction', 'Coronary Artery Thrombosis', 'Severe Atherosclerotic Cardiovascular Disease', 'I21.9', 'Essential Hypertension',
           false, 'Brought in with sudden onset crushing chest pain and syncope. Cardiopulmonary resuscitation attempted for 45 minutes.',
           'Meseret Alemu', 'Spouse', '+251 922 771 122', 'North Shewa, Merhabete Woreda',
           'verified', NULL, $6, $4, NOW() - INTERVAL '18 hours', NULL, NULL, NULL, NULL)
      `, [
        p1.id, `${p1.first_name} ${p1.last_name}`, p1.gender || 'male',
        docUser.id, docName, adminId,
        p2.id, `${p2.first_name} ${p2.last_name}`, p2.gender || 'female'
      ]);

      // Seed document_verifications for the issued death certificate
      await client.query(`
        INSERT INTO document_verifications
          (verification_token, document_type, document_number, entity_id, patient_id, issued_by, status, metadata)
        VALUES
          ('vtok_death_33b819ac', 'death_certificate', 'DOC-DTH-2026-0041', 1, $1, $2, 'valid', $3)
        ON CONFLICT (verification_token) DO NOTHING
      `, [p1.id, adminId, JSON.stringify({ deceased_name: `${p1.first_name} ${p1.last_name}`, immediate_cause: "Septic Shock", underlying_cause: "Type 2 Diabetes Mellitus" })]);

      console.log('Seeded death records.');
    }

    // 4. Seed Scholarship Programs & Applications
    const schCheck = await client.query("SELECT id FROM scholarship_programs LIMIT 1");
    if (!schCheck.rows.length) {
      const sch1 = await client.query(`
        INSERT INTO scholarship_programs
          (program_code, title, category, sponsoring_org, total_slots, available_slots, opening_date, closing_date,
           eligibility_criteria, financial_support_amount, duration_months, status, created_by)
        VALUES
          ('SCH-2026-SURG', 'Ministry of Health Surgical Residency Fellowship', 'Clinical Residency', 'Federal Ministry of Health (FMoH)', 4, 2,
           CURRENT_DATE - 30, CURRENT_DATE + 30,
           'Licensed General Medical Practitioner with minimum 2 years rural clinical service at Alem Ketema Enat Hospital; Clean ethical standing.',
           240000.00, 36, 'active', $1)
        RETURNING id
      `, [adminId]);

      const sch2 = await client.query(`
        INSERT INTO scholarship_programs
          (program_code, title, category, sponsoring_org, total_slots, available_slots, opening_date, closing_date,
           eligibility_criteria, financial_support_amount, duration_months, status, created_by)
        VALUES
          ('SCH-2026-NURS', 'Advanced Critical Care Nursing Specialization Grant', 'Nursing Specialty', 'Hospital Board Endowment & WHO Partner Fund', 6, 4,
           CURRENT_DATE - 15, CURRENT_DATE + 45,
           'BSc Nurse with at least 18 months intensive care or emergency nursing experience; Recommendation from Chief Nursing Officer.',
           150000.00, 18, 'active', $1)
        RETURNING id
      `, [adminId]);

      const sch3 = await client.query(`
        INSERT INTO scholarship_programs
          (program_code, title, category, sponsoring_org, total_slots, available_slots, opening_date, closing_date,
           eligibility_criteria, financial_support_amount, duration_months, status, created_by)
        VALUES
          ('SCH-2026-HI', 'Health Informatics & Smart Hospital Systems Fellowship', 'Health Informatics', 'Amhara Regional Health Bureau', 3, 1,
           CURRENT_DATE - 40, CURRENT_DATE + 10,
           'BSc in Health Informatics, IT, or Clinical background with software system proficiency.',
           180000.00, 24, 'active', $1)
        RETURNING id
      `, [adminId]);

      // Seed scholarship applications
      await client.query(`
        INSERT INTO scholarship_applications
          (application_number, program_id, applicant_user_id, applicant_name, applicant_type, employee_id_code,
           education_level, academic_gpa, years_of_experience, contact_phone, contact_email,
           statement_of_purpose, status, evaluation_score, evaluation_remarks, evaluated_by, evaluated_at,
           board_decision_ref, approved_by, approved_at)
        VALUES
          ('APP-SCH-2026-001', $1, $2, 'Dr. Binyam Girma Mengesha', 'employee', 'EMP-MD-042',
           'Doctor of Medicine (MD)', 3.82, 3.5, '+251 911 334 455', 'binyam.girma@hospital.et',
           'Aiming to bridge the specialist surgical gap in North Shewa through 3-year sub-specialty general surgery training.',
           'approved', 92.50, 'Outstanding candidate with high clinical appraisal scores and dedicated 3 years service.',
           $3, NOW() - INTERVAL '5 days', 'RES-2026-004', $3, NOW() - INTERVAL '2 days'),

          ('APP-SCH-2026-002', $4, $5, 'Sr. Tigist Hailemariam', 'employee', 'EMP-NR-108',
           'BSc in Nursing', 3.65, 2.8, '+251 922 998 811', 'tigist.hailemariam@hospital.et',
           'Desire to elevate our Emergency and ICU triage outcomes with standardized critical care life support skills.',
           'under_review', 84.00, 'Strong clinical recommendation from Head of Emergency.',
           $3, NOW() - INTERVAL '2 days', NULL, NULL, NULL),

          ('APP-SCH-2026-003', $6, $2, 'Ato Daniel Assefa', 'employee', 'EMP-IT-019',
           'BSc in Computer Science', 3.75, 2.0, '+251 944 112 233', 'daniel.assefa@hospital.et',
           'Dedicated to expanding AI clinical analytics and FHIR standards across regional health networks.',
           'shortlisted', 88.00, 'Exceptional technical proposal aligned with hospital 5-year modernization roadmap.',
           $3, NOW() - INTERVAL '1 day', NULL, NULL, NULL)
      `, [sch1.rows[0].id, docUser.id, adminId, sch2.rows[0].id, docUser2.id, sch3.rows[0].id]);

      console.log('Seeded scholarship programs and applications.');
    }

    // 5. Seed Specialization Programs & Applications
    const specCheck = await client.query("SELECT id FROM specialization_programs LIMIT 1");
    if (!specCheck.rows.length) {
      const sp1 = await client.query(`
        INSERT INTO specialization_programs
          (program_code, name, medical_field, partner_institution, duration_years, admission_requirements,
           total_positions, available_positions, sponsorship_type, application_deadline, status, created_by)
        VALUES
          ('SPEC-SURG', 'General Surgery Specialization', 'Surgery', 'Addis Ababa University - Tikur Anbessa Hospital', 4.0,
           'MD Degree, 2+ Years Clinical Practice, Regional Health Bureau Sponsorship Exam Pass',
           3, 1, 'Full Sponsorship', CURRENT_DATE + 60, 'active', $1)
        RETURNING id
      `, [adminId]);

      const sp2 = await client.query(`
        INSERT INTO specialization_programs
          (program_code, name, medical_field, partner_institution, duration_years, admission_requirements,
           total_positions, available_positions, sponsorship_type, application_deadline, status, created_by)
        VALUES
          ('SPEC-OBGYN', 'Obstetrics & Gynecology Residency', 'Obstetrics and Gynecology', 'St. Paul’s Hospital Millennium Medical College', 4.0,
           'MD Degree, Emergency Surgical Skills Certification, Maternal Health Endorsement',
           4, 2, 'Full Sponsorship', CURRENT_DATE + 45, 'active', $1)
        RETURNING id
      `, [adminId]);

      const sp3 = await client.query(`
        INSERT INTO specialization_programs
          (program_code, name, medical_field, partner_institution, duration_years, admission_requirements,
           total_positions, available_positions, sponsorship_type, application_deadline, status, created_by)
        VALUES
          ('SPEC-PED', 'Pediatrics & Child Health Specialty', 'Pediatrics', 'Gondar University College of Medicine', 3.0,
           'MD Degree, Neonatal Care Experience, Clean Professional Conduct',
           2, 1, 'Full Sponsorship', CURRENT_DATE + 90, 'active', $1)
        RETURNING id
      `, [adminId]);

      const sp4 = await client.query(`
        INSERT INTO specialization_programs
          (program_code, name, medical_field, partner_institution, duration_years, admission_requirements,
           total_positions, available_positions, sponsorship_type, application_deadline, status, created_by)
        VALUES
          ('SPEC-ANES', 'Anesthesiology & Intensive Care Residency', 'Anesthesia', 'Jimma University Medical Center', 3.0,
           'MD Degree or BSc Anesthesia with 3 years clinical service',
           2, 2, 'Full Sponsorship', CURRENT_DATE + 75, 'active', $1)
        RETURNING id
      `, [adminId]);

      // Seed specialization applications
      const deptRes = await client.query("SELECT id FROM departments LIMIT 2");
      const deptId1 = deptRes.rows[0]?.id || 1;
      const deptId2 = deptRes.rows[1]?.id || deptId1;

      await client.query(`
        INSERT INTO specialization_applications
          (application_number, program_id, applicant_user_id, applicant_name, current_position, department_id,
           current_qualification, work_experience_years, preferred_institution, recommendation_summary,
           status, dept_head_approved, dept_head_notes, dept_head_reviewed_at,
           hr_verified, hr_notes, hr_verified_at,
           board_approved, board_decision_ref, board_reviewed_at, training_start_date)
        VALUES
          ('APP-SPEC-2026-001', $1, $2, 'Dr. Solomon Kassa', 'General Medical Practitioner', $3,
           'MD Degree (AAU 2022)', 4.0, 'Tikur Anbessa Specialized Hospital',
           'Dr. Solomon has performed over 300 emergency appendectomies and hernia repairs under supervision with exemplary patient recovery rates.',
           'in_training', true, 'Unanimously endorsed by Department of Surgery', NOW() - INTERVAL '20 days',
           true, 'Service bond and HR qualification verified', NOW() - INTERVAL '15 days',
           true, 'RES-2026-002', NOW() - INTERVAL '10 days', CURRENT_DATE - 5),

          ('APP-SPEC-2026-002', $4, $5, 'Dr. Selamawit Tadesse', 'Medical Officer', $6,
           'MD Degree (Gondar 2023)', 2.5, 'St. Paul Millennium Medical College',
           'Dedicated physician with exemplary record in maternal care and emergency obstetric response.',
           'board_review', true, 'Strongly recommended to address referral load in maternal ward', NOW() - INTERVAL '5 days',
           true, 'Credentials and regional health bureau quota validated', NOW() - INTERVAL '2 days',
           NULL, NULL, NULL, NULL)
      `, [sp1.rows[0].id, docUser.id, deptId1, sp2.rows[0].id, docUser2.id, deptId2]);

      console.log('Seeded specialization programs and applications.');
    }

    // 6. Seed Training Programs & Participants
    const trainCheck = await client.query("SELECT id FROM training_programs LIMIT 1");
    if (!trainCheck.rows.length) {
      const tp1 = await client.query(`
        INSERT INTO training_programs
          (program_code, title, category, description, trainer_name, trainer_institution,
           start_date, end_date, venue, ceu_credits, max_participants, status, created_by)
        VALUES
          ('TRN-2026-NRP', 'Neonatal Resuscitation Program (NRP) 8th Edition', 'Emergency Care',
           'Comprehensive hands-on training for delivery room clinicians on golden minute resuscitation and positive pressure ventilation.',
           'Dr. Meron Getachew (Neonatologist)', 'Ethiopian Pediatric Society',
           CURRENT_DATE - 10, CURRENT_DATE - 8, 'Hospital Simulation Lab - Block C', 15.0, 25, 'completed', $1)
        RETURNING id
      `, [adminId]);

      const tp2 = await client.query(`
        INSERT INTO training_programs
          (program_code, title, category, description, trainer_name, trainer_institution,
           start_date, end_date, venue, ceu_credits, max_participants, status, created_by)
        VALUES
          ('TRN-2026-IPC', 'Infection Prevention & Antimicrobial Stewardship Workshop', 'Infection Control',
           'Standardized clinical hygiene protocols, surgical site infection reduction, and rational antibiotic utilization.',
           'Ato Girma Belay (Infection Control Specialist)', 'Amhara Public Health Institute (APHI)',
           CURRENT_DATE + 5, CURRENT_DATE + 7, 'Main Auditorium (Block A)', 12.0, 40, 'scheduled', $1)
        RETURNING id
      `, [adminId]);

      const tp3 = await client.query(`
        INSERT INTO training_programs
          (program_code, title, category, description, trainer_name, trainer_institution,
           start_date, end_date, venue, ceu_credits, max_participants, status, created_by)
        VALUES
          ('TRN-2026-HMS', 'AI-Assisted Smart HMS & ICD-10 Coding Masterclass', 'Digital Health',
           'Mastering electronic medical records, clinical decision support alerts, and digital prescription workflows.',
           'Eng. Yonas Abebe (Health Informatics Lead)', 'Alem Ketema Enat ICT Directorate',
           CURRENT_DATE + 14, CURRENT_DATE + 15, 'Computer Lab - IT Building', 8.0, 30, 'scheduled', $1)
        RETURNING id
      `, [adminId]);

      // Seed training participants
      await client.query(`
        INSERT INTO training_participants
          (training_id, user_id, participant_name, attendance_status, evaluation_score, certificate_number, certificate_issued, certificate_issued_at)
        VALUES
          ($1, $2, 'Dr. Dawit Haile', 'completed', 96.0, 'CERT-NRP-2026-041', true, NOW() - INTERVAL '8 days'),
          ($1, $3, 'Dr. Almaz Bekele', 'completed', 94.5, 'CERT-NRP-2026-042', true, NOW() - INTERVAL '8 days')
        ON CONFLICT (training_id, user_id) DO NOTHING
      `, [tp1.rows[0].id, docUser.id, docUser2.id]);

      console.log('Seeded training programs and participants.');
    }

    // 7. Seed Board Members & Meetings
    const boardCheck = await client.query("SELECT id FROM board_members LIMIT 1");
    if (!boardCheck.rows.length) {
      await client.query(`
        INSERT INTO board_members
          (user_id, full_name, role_title, committee, appointed_date, phone, email, is_active)
        VALUES
          ($1, 'Dr. Yohannes Tadesse (MD, MPH)', 'Board Chairperson', 'Hospital Governing Board', '2024-01-15', '+251 911 001 122', 'yohannes.chair@hospital.et', true),
          ($2, 'W/ro Selamawit Kebede', 'Board Secretary', 'Executive & Governance Committee', '2024-02-01', '+251 911 223 344', 'selamawit.sec@hospital.et', true),
          ($3, 'Dr. Dawit Haile (MD)', 'Medical Director', 'Clinical Governance & Credentialing Committee', '2024-01-10', '+251 911 334 455', 'dawit.meddir@hospital.et', true),
          ($4, 'Ato Birhanu Nega', 'Hospital Administrator / CEO', 'Finance & Administration Committee', '2023-11-01', '+251 911 445 566', 'birhanu.ceo@hospital.et', true),
          ($5, 'Sr. Rahel Wolde', 'Chief Nursing Officer', 'Clinical Quality & Patient Safety Committee', '2024-03-01', '+251 911 556 677', 'rahel.cno@hospital.et', true),
          (NULL, 'Ato Mulatu Tesfaye', 'Zonal Health Department Representative', 'External Stakeholder Oversight', '2024-01-20', '+251 911 667 788', 'mulatu.zonal@amharahealth.gov.et', true)
      `, [adminId, docUser2.id, docUser.id, adminId, docUser2.id]);

      // Seed Board Meeting
      const bm1 = await client.query(`
        INSERT INTO board_meetings
          (meeting_number, title, meeting_date, start_time, end_time, location, status, meeting_minutes, presided_by, recorded_by, created_by)
        VALUES
          ('BM-2026-003', 'Q1 2026 Regular Hospital Governing Board Assembly', CURRENT_DATE - 12, '09:00:00', '13:30:00',
           'Executive Board Room (Block B, 3rd Floor)', 'minutes_approved',
           'Meeting called to order by Board Chairperson Dr. Yohannes Tadesse. Quorum confirmed with 5 of 6 voting members present. Key resolutions passed regarding 2026 surgical fellowships and emergency department bed expansion.',
           $1, $2, $1)
        RETURNING id
      `, [adminId, docUser2.id]);

      const bm2 = await client.query(`
        INSERT INTO board_meetings
          (meeting_number, title, meeting_date, start_time, end_time, location, status, meeting_minutes, presided_by, recorded_by, created_by)
        VALUES
          ('BM-2026-004', 'Special Board Review on Human Resource Development & Specialty Sponsorships', CURRENT_DATE + 8, '10:00:00', '12:30:00',
           'Executive Board Room & Hybrid Teleconference', 'scheduled',
           'Scheduled agenda includes final award approval for 2026 Surgical Residency candidates and review of 2025/2026 Clinical Training Outcomes.',
           $1, $2, $1)
        RETURNING id
      `, [adminId, docUser2.id]);

      // Seed Agendas
      const ag1 = await client.query(`
        INSERT INTO board_agendas
          (meeting_id, item_order, title, description, presenter_name, discussion_notes, decision_required)
        VALUES
          ($1, 1, 'Approval of 2026 Ministry of Health Surgical Fellowships',
           'Review of Dr. Binyam Girma Mengesha credentials and formal quota ratification.',
           'Dr. Dawit Haile (Medical Director)',
           'Committee confirmed all service criteria fulfilled. Candidate demonstrated exceptional surgical proficiency.', true),
          
          ($1, 2, 'Maternal & Neonatal Certificate Audit Review',
           'Assessment of birth certificate processing speed and digital QR verification integrity.',
           'W/ro Selamawit Kebede (Board Secretary)',
           'New digital QR verification operational with 100% compliance across 108 issued documents.', false)
        RETURNING id
      `, [bm1.rows[0].id]);

      // Seed Board Decisions
      await client.query(`
        INSERT INTO board_decisions
          (meeting_id, agenda_id, resolution_number, resolution_type, subject, resolution_text, voting_result, linked_entity_type, linked_entity_id, recorded_by)
        VALUES
          ($1, $2, 'RES-2026-004', 'scholarship_approval',
           'Ratification of FMoH Surgical Residency Fellowship Award for Dr. Binyam Girma',
           'The Governing Board hereby approves full institutional sponsorship for Dr. Binyam Girma to commence 3-year General Surgery residency at Addis Ababa University. Return-of-service bond of 4 years confirmed.',
           'Unanimously Approved (5-0)', 'scholarship', 1, $3),

          ($1, NULL, 'RES-2026-005', 'policy_ratification',
           'Adoption of Digital QR Verification Standard for Hospital Birth and Death Documentation',
           'Resolved that all official hospital medical birth certificates and medical cause of death certificates issued by Alem Ketema Enat Hospital shall carry cryptographically generated QR verification codes and prominent notices distinguishing them from civil registration documents.',
           'Unanimously Approved (5-0)', 'policy', NULL, $3)
      `, [bm1.rows[0].id, ag1.rows[0].id, adminId]);

      console.log('Seeded board members, meetings, agendas, and decisions.');
    }

    await client.query('COMMIT');
    console.log('Successfully completed Board & Administrative Services seeding!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seeding error:', err);
  } finally {
    client.release();
    process.exit(0);
  }
}

seedBoardData();
