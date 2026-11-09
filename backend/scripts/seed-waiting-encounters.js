require('dotenv').config({ path: __dirname + '/../.env' });
const pool = require('../src/config/database');

async function seedWaitingEncounters() {
  console.log('Seeding active waiting encounters for doctor consultation demonstration...');

  // Get department ID for OPD / General Medicine
  const deptRes = await pool.query("SELECT id FROM departments WHERE name ILIKE '%Medicine%' OR name ILIKE '%OPD%' LIMIT 1");
  const deptId = deptRes.rows[0]?.id || 1;

  // Get doctors (doctor_id 1 Awoke Desta and doctor_id 53 Dawit Kebede)
  const docRes = await pool.query("SELECT id FROM doctors ORDER BY id ASC LIMIT 5");
  const doctorIds = docRes.rows.map(d => d.id);

  // Clinical Demonstration Cases
  const demoCases = [
    {
      name: 'Azanaw Nega',
      chief_complaint: 'High intermittent fever, severe rigors, body chills, profuse sweating, and intense headache for 3 days',
      priority: 'urgent',
      vitals: { temp: 39.4, bp_sys: 118, bp_dia: 76, hr: 104, rr: 20, spo2: 97, weight: 68, height: 172 },
      observations: 'Febrile, flushed, diaphoretic. Rapid pulse, clear chest.'
    },
    {
      name: 'Lake Awraris',
      chief_complaint: 'Productive cough with rust-colored purulent sputum, sharp pleuritic chest pain on inspiration, fever, and shortness of breath',
      priority: 'emergency',
      vitals: { temp: 39.2, bp_sys: 122, bp_dia: 80, hr: 110, rr: 28, spo2: 90, weight: 72, height: 175 },
      observations: 'Tachypneic, accessory muscle use, decreased air entry and crackles in right lower lung field.'
    },
    {
      name: 'Selamawit Tesfaye',
      chief_complaint: 'Acute wheezing, chest tightness, shortness of breath, and dry spasmodic cough exacerbating at night',
      priority: 'urgent',
      vitals: { temp: 37.1, bp_sys: 126, bp_dia: 82, hr: 98, rr: 26, spo2: 91, weight: 58, height: 163 },
      observations: 'Bilateral expiratory wheezing on auscultation, speaking in short phrases.'
    },
    {
      name: 'Bethlehem Tadesse',
      chief_complaint: 'Prolonged step-ladder fever, persistent frontal headache, severe abdominal cramps, and constipation for 6 days',
      priority: 'urgent',
      vitals: { temp: 39.0, bp_sys: 110, bp_dia: 70, hr: 82, rr: 18, spo2: 98, weight: 54, height: 160 },
      observations: 'Relative bradycardia compared to high fever, mild abdominal tenderness in right lower quadrant.'
    },
    {
      name: 'Henok Mekonnen',
      chief_complaint: 'Frequent watery diarrhea (6-8 episodes/day), repeated vomiting, severe abdominal cramps, extreme thirst, and dry mouth',
      priority: 'urgent',
      vitals: { temp: 37.8, bp_sys: 102, bp_dia: 68, hr: 102, rr: 20, spo2: 98, weight: 64, height: 170 },
      observations: 'Sunken eyes, reduced skin turgor, dry oral mucosa, tachycardic.'
    },
    {
      name: 'Dawit Alemu',
      chief_complaint: 'Severe throbbing occipital morning headache, dizziness, neck stiffness, blurred vision, and chest palpitations',
      priority: 'urgent',
      vitals: { temp: 36.9, bp_sys: 168, bp_dia: 104, hr: 88, rr: 16, spo2: 98, weight: 82, height: 174 },
      observations: 'Stage 2 Hypertension on arrival. Fundoscopic evaluation recommended.'
    }
  ];

  for (let i = 0; i < demoCases.length; i++) {
    const c = demoCases[i];
    const [first, ...rest] = c.name.split(' ');
    const last = rest.join(' ');

    // Find patient or create
    let patRes = await pool.query(
      "SELECT id FROM patients WHERE first_name ILIKE $1 AND last_name ILIKE $2 LIMIT 1",
      [first, last]
    );

    let patientId;
    if (patRes.rows.length > 0) {
      patientId = patRes.rows[0].id;
    } else {
      const ins = await pool.query(
        `INSERT INTO patients (first_name, last_name, gender, date_of_birth, phone, address)
         VALUES ($1, $2, 'male', '1992-06-15', '+251 91 123 450' || $3, 'Alem Ketema, Kebele 02')
         RETURNING id`,
        [first, last, i]
      );
      patientId = ins.rows[0].id;
    }

    // Check if patient already has an active waiting encounter
    const existingEnc = await pool.query(
      `SELECT id FROM patient_encounters 
       WHERE patient_id = $1 AND UPPER(status) IN ('WAITING_FOR_CONSULTATION', 'WAITING_FOR_DOCTOR', 'IN_CONSULTATION')`,
      [patientId]
    );

    let encounterId;
    if (existingEnc.rows.length > 0) {
      encounterId = existingEnc.rows[0].id;
    } else {
      const encNum = `ENC-DEMO-${Date.now().toString().slice(-6)}-${i+1}`;
      const newEnc = await pool.query(
        `INSERT INTO patient_encounters (patient_id, encounter_number, encounter_type, status, created_at, updated_at)
         VALUES ($1, $2, 'outpatient', 'waiting_for_doctor', NOW(), NOW())
         RETURNING id`,
        [patientId, encNum]
      );
      encounterId = newEnc.rows[0].id;
    }

    // Upsert triage assessment
    await pool.query(
      `INSERT INTO triage_assessments 
        (encounter_id, patient_id, temperature, blood_pressure_systolic, blood_pressure_diastolic, heart_rate, respiratory_rate, oxygen_saturation, weight, height, chief_complaint, preliminary_observations, priority, assessed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
       ON CONFLICT (id) DO NOTHING`,
      [
        encounterId,
        patientId,
        c.vitals.temp,
        c.vitals.bp_sys,
        c.vitals.bp_dia,
        c.vitals.hr,
        c.vitals.rr,
        c.vitals.spo2,
        c.vitals.weight,
        c.vitals.height,
        c.chief_complaint,
        c.observations,
        c.priority
      ]
    );

    // Upsert vitals
    await pool.query(
      `INSERT INTO vitals
        (patient_id, encounter_id, temperature, blood_pressure_systolic, blood_pressure_diastolic, heart_rate, respiratory_rate, oxygen_saturation, weight, height, recorded_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
      [
        patientId,
        encounterId,
        c.vitals.temp,
        c.vitals.bp_sys,
        c.vitals.bp_dia,
        c.vitals.hr,
        c.vitals.rr,
        c.vitals.spo2,
        c.vitals.weight,
        c.vitals.height
      ]
    );

    // Assign to doctor
    const assignedDoc = doctorIds[i % doctorIds.length] || doctorIds[0];
    await pool.query(
      `INSERT INTO encounter_assignments (encounter_id, patient_id, department_id, doctor_id, assigned_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT DO NOTHING`,
      [encounterId, patientId, deptId, assignedDoc]
    );

    console.log(`✓ Active Encounter #${encounterId} ready for [${c.name}] -> Complaint: "${c.chief_complaint.slice(0, 45)}..."`);
  }

  console.log('\nAll 6 demo clinical encounters are now actively waiting in the doctor consultation queue!');
  await pool.end();
}

seedWaitingEncounters().catch(err => {
  console.error('Error seeding waiting encounters:', err);
  process.exit(1);
});
