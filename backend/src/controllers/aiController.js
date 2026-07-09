const aiService = require('../services/aiService');
const { sendSuccess, sendError, handleAsync } = require('../utils/response');

const predictDisease = handleAsync(async (req, res) => {
  const { patientId, symptoms, vitals } = req.body;

  const predictions = await aiService.predictDisease(symptoms, vitals);

  sendSuccess(res, { predictions });
});

const checkDrugInteraction = handleAsync(async (req, res) => {
  const { medications } = req.body;

  const result = await aiService.checkDrugInteractions(medications);

  sendSuccess(res, result);
});

const predictHealthRisk = handleAsync(async (req, res) => {
  const { patientId } = req.body;

  if (!patientId) {
    return sendError(res, 'patientId is required', 400);
  }

  // Fetch real patient data from database
  const pool = require('../config/database');
  const patientRes = await pool.query(
    `SELECT p.*,
      EXTRACT(YEAR FROM AGE(p.date_of_birth)) AS age,
      (SELECT COUNT(*) FROM diagnoses d WHERE d.patient_id = p.id AND d.is_chronic = true) AS chronic_count,
      (SELECT json_agg(disease_name) FROM diagnoses d WHERE d.patient_id = p.id AND d.is_chronic = true) AS chronic_conditions,
      (SELECT v.weight FROM vitals v WHERE v.patient_id = p.id ORDER BY v.recorded_at DESC LIMIT 1) AS latest_weight,
      (SELECT v.height FROM vitals v WHERE v.patient_id = p.id ORDER BY v.recorded_at DESC LIMIT 1) AS latest_height
     FROM patients p WHERE p.id = $1`,
    [patientId]
  );

  if (patientRes.rows.length === 0) {
    return sendError(res, 'Patient not found', 404);
  }

  const p = patientRes.rows[0];
  const age = parseInt(p.age) || 0;
  const weight = parseFloat(p.latest_weight);
  const height = parseFloat(p.latest_height);
  const bmi = (weight && height) ? weight / ((height / 100) ** 2) : null;
  const chronicConditions = p.chronic_conditions || [];

  const patientData = {
    age,
    bmi: bmi || 22,  // default healthy BMI if no vitals
    smoking: false,  // not stored in schema — can be extended
    familyHistory: false,
    chronicConditions,
  };

  const result = await aiService.predictHealthRisk(patientData);
  result.patientInfo = {
    name: `${p.first_name} ${p.last_name}`,
    age,
    bmi: bmi ? Math.round(bmi * 10) / 10 : null,
    bloodType: p.blood_type,
    chronicDiseaseCount: parseInt(p.chronic_count) || 0,
  };

  sendSuccess(res, result);
});

const optimizeSchedule = handleAsync(async (req, res) => {
  const { doctorId, date, appointments } = req.body;

  const result = await aiService.optimizeSchedule(doctorId, date, appointments);

  sendSuccess(res, result);
});

const chatbot = handleAsync(async (req, res) => {
  const { query, context } = req.body;

  const result = await aiService.chatbotQuery(query, context);

  sendSuccess(res, result);
});

module.exports = {
  predictDisease,
  checkDrugInteraction,
  predictHealthRisk,
  optimizeSchedule,
  chatbot
};
