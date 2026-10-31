const request = require('supertest');
const app = require('../src/server');
const jwt = require('jsonwebtoken');
const pool = require('../src/config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

describe('Priority 1: Clinical Allergy & Drug-Interaction Safety Engine', () => {
  let doctorToken;
  let nurseToken;
  let testPatientId;
  let testPatientUnknownId;
  let testPatientAnaphylaxisId;
  let doctorUserId;

  beforeAll(async () => {
    // 1. Doctor user
    const docUser = await pool.query(`
      INSERT INTO users (email, password_hash, role, is_active, first_name, last_name)
      VALUES ('allergy_doc@hospital.com', 'dummyhash', 'doctor', true, 'Dr. Yohannes', 'Mekonnen')
      ON CONFLICT (email) DO UPDATE SET role = 'doctor'
      RETURNING id
    `);
    doctorUserId = docUser.rows[0].id;

    // Doctor profile
    const existingDoc = await pool.query('SELECT id FROM doctors WHERE user_id = $1', [doctorUserId]);
    if (!existingDoc.rows.length) {
      await pool.query(`
        INSERT INTO doctors (user_id, first_name, last_name, specialization, license_number)
        VALUES ($1, 'Yohannes', 'Mekonnen', 'Internal Medicine', 'MED-ETH-49102')
        ON CONFLICT (license_number) DO UPDATE SET user_id = $1
      `, [doctorUserId]);
    }

    doctorToken = jwt.sign(
      { id: doctorUserId, email: 'allergy_doc@hospital.com', role: 'doctor' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 2. Nurse user (unauthorized for prescribing)
    const nurseUser = await pool.query(`
      INSERT INTO users (email, password_hash, role, is_active, first_name, last_name)
      VALUES ('allergy_nurse@hospital.com', 'dummyhash', 'nurse', true, 'Sister Tigist', 'Haile')
      ON CONFLICT (email) DO UPDATE SET role = 'nurse'
      RETURNING id
    `);
    nurseToken = jwt.sign(
      { id: nurseUser.rows[0].id, email: 'allergy_nurse@hospital.com', role: 'nurse' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 3. Test Patient with documented Penicillin allergy (moderate cross-reactivity)
    const pat1 = await pool.query(`
      INSERT INTO patients (first_name, last_name, date_of_birth, gender, phone, allergies)
      VALUES ('Abebe', 'Bikila', '1985-05-12', 'male', '+251911223344', 'Penicillin')
      RETURNING id
    `);
    testPatientId = pat1.rows[0].id;

    await pool.query(`
      INSERT INTO patient_allergies (patient_id, allergen_name, allergen_category, reaction_description, severity, verification_status, recorded_by)
      VALUES ($1, 'Penicillin', 'drug', 'Severe urticaria and maculopapular rash', 'moderate', 'verified', $2)
    `, [testPatientId, doctorUserId]);

    // 4. Test Patient with unknown / missing allergy history
    const pat2 = await pool.query(`
      INSERT INTO patients (first_name, last_name, date_of_birth, gender, phone, allergies)
      VALUES ('Kassahun', 'Kebede', '1992-09-20', 'male', '+251922334455', NULL)
      RETURNING id
    `);
    testPatientUnknownId = pat2.rows[0].id;

    // 5. Test Patient with recorded Anaphylaxis allergy to Penicillin (Hard-Stop)
    const pat3 = await pool.query(`
      INSERT INTO patients (first_name, last_name, date_of_birth, gender, phone, allergies)
      VALUES ('Meron', 'Tadesse', '1990-03-15', 'female', '+251933445566', 'Penicillin G')
      RETURNING id
    `);
    testPatientAnaphylaxisId = pat3.rows[0].id;

    await pool.query(`
      INSERT INTO patient_allergies (patient_id, allergen_name, allergen_category, reaction_description, severity, verification_status, recorded_by)
      VALUES ($1, 'Penicillin G', 'drug', 'Immediate respiratory arrest, angioedema, anaphylactic shock', 'anaphylaxis', 'verified', $2)
    `, [testPatientAnaphylaxisId, doctorUserId]);
  });

  afterAll(async () => {
    if (testPatientId) {
      await pool.query('DELETE FROM prescriptions WHERE patient_id = $1', [testPatientId]);
      await pool.query('DELETE FROM patient_allergies WHERE patient_id = $1', [testPatientId]);
      await pool.query('DELETE FROM patients WHERE id = $1', [testPatientId]);
    }
    if (testPatientUnknownId) {
      await pool.query('DELETE FROM prescriptions WHERE patient_id = $1', [testPatientUnknownId]);
      await pool.query('DELETE FROM patients WHERE id = $1', [testPatientUnknownId]);
    }
    if (testPatientAnaphylaxisId) {
      await pool.query('DELETE FROM prescriptions WHERE patient_id = $1', [testPatientAnaphylaxisId]);
      await pool.query('DELETE FROM patient_allergies WHERE patient_id = $1', [testPatientAnaphylaxisId]);
      await pool.query('DELETE FROM patients WHERE id = $1', [testPatientAnaphylaxisId]);
    }
    await pool.query("DELETE FROM users WHERE email IN ('allergy_doc@hospital.com', 'allergy_nurse@hospital.com')");
  });

  describe('Pre-Check Validation: POST /api/prescriptions/validate', () => {
    it('detects Penicillin + Amoxicillin cross-reactivity with exact required warning', async () => {
      const res = await request(app)
        .post('/api/prescriptions/validate')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          patient_id: testPatientId,
          medication_name: 'Amoxicillin 500mg'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.hasConflict).toBe(true);
      expect(res.body.data.requiresOverride).toBe(true);
      expect(res.body.data.alerts.length).toBeGreaterThan(0);

      const alert = res.body.data.alerts[0];
      expect(alert.alertMessage).toBe(
        "PATIENT ALLERGY ALERT: Potential cross-reactivity detected. Review the patient's allergy history and clinical risk before prescribing."
      );
      expect(alert.recordedAllergen).toBe('Penicillin');
      expect(alert.ruleVersion).toBe('ET-NDF-2026.1');
    });

    it('treats missing or unreviewed allergy records as unknown with an uncertainty note', async () => {
      const res = await request(app)
        .post('/api/prescriptions/validate')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          patient_id: testPatientUnknownId,
          medication_name: 'Ciprofloxacin 500mg'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.hasConflict).toBe(false);
      expect(res.body.data.uncertaintyNote).toContain('Missing allergy history must be treated as unknown');
    });

    it('detects drug-drug interaction when patient has active interacting prescription', async () => {
      // First save an active prescription for Warfarin
      const sampleDoc = await pool.query('SELECT id FROM doctors ORDER BY id ASC LIMIT 1');
      const docIdForTest = sampleDoc.rows[0].id;
      await pool.query(`
        INSERT INTO prescriptions (patient_id, doctor_id, medication_name, dosage, frequency, duration, prescribed_date)
        VALUES ($1, $2, 'Warfarin Sodium', '5mg', 'Once daily', '30 days', NOW())
      `, [testPatientId, docIdForTest]);

      // Propose prescribing Aspirin
      const res = await request(app)
        .post('/api/prescriptions/validate')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          patient_id: testPatientId,
          medication_name: 'Aspirin 81mg'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.hasConflict).toBe(true);
      expect(res.body.data.drugInteractions.length).toBeGreaterThan(0);
      expect(res.body.data.drugInteractions[0].severity).toBe('severe');
      expect(res.body.data.drugInteractions[0].mechanism).toContain('hemorrhage');
    });
  });

  describe('Enforcement & Override Policy: POST /api/prescriptions', () => {
    it('rejects unauthorized roles (nurse) from creating prescriptions with 403', async () => {
      const res = await request(app)
        .post('/api/prescriptions')
        .set('Authorization', `Bearer ${nurseToken}`)
        .send({
          patient_id: testPatientId,
          medication_name: 'Paracetamol',
          dosage: '1g',
          frequency: 'TDS',
          duration: '3 days'
        });

      expect(res.statusCode).toBe(403);
    });

    it('rejects prescribing without explicit acknowledgement and override reason when conflict exists', async () => {
      const res = await request(app)
        .post('/api/prescriptions')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          patient_id: testPatientId,
          medication_name: 'Amoxicillin 500mg',
          dosage: '500mg',
          frequency: 'TID',
          duration: '7 days'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.requiresOverride).toBe(true);
      expect(res.body.message).toContain('PATIENT ALLERGY ALERT: Potential cross-reactivity detected');
    });

    it('strictly enforces HARD STOP (403 Forbidden) for direct anaphylaxis allergy', async () => {
      const res = await request(app)
        .post('/api/prescriptions')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          patient_id: testPatientAnaphylaxisId,
          medication_name: 'Penicillin G 1M IU',
          dosage: '1M IU',
          frequency: 'IM Stat',
          duration: '1 day',
          override_acknowledged: true,
          override_reason: 'Clinician attempted override for critical condition'
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.hardBlocked).toBe(true);
      expect(res.body.message).toContain('CLINICAL HARD STOP');
    });

    it('successfully processes authorized override and audits clinician decision', async () => {
      const res = await request(app)
        .post('/api/prescriptions')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          patient_id: testPatientId,
          medication_name: 'Amoxicillin 500mg',
          dosage: '500mg',
          frequency: 'TID',
          duration: '5 days',
          override_acknowledged: true,
          override_reason: 'Benefits outweigh risk. Patient will receive first dose under direct observation in OPD with antihistamine standby.'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.allergyOverridden).toBe(true);

      const createdRxId = res.body.data.prescription.id;

      // Verify audit trail recorded in prescription_allergy_overrides
      const overrideAudit = await pool.query(
        'SELECT * FROM prescription_allergy_overrides WHERE prescription_id = $1',
        [createdRxId]
      );
      expect(overrideAudit.rows.length).toBe(1);
      expect(overrideAudit.rows[0].prescriber_id).toBe(doctorUserId);
      expect(overrideAudit.rows[0].allergen_name).toBe('Penicillin');

      // Verify clinical_audit_events table
      const eventAudit = await pool.query(
        "SELECT * FROM clinical_audit_events WHERE record_id = $1 AND record_type = 'prescription'",
        [createdRxId]
      );
      expect(eventAudit.rows.length).toBe(1);
      expect(eventAudit.rows[0].action_type).toBe('OVERRIDE_RECORDED');
    });
  });
});
