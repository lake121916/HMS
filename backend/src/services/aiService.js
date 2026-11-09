// AI Service for Hospital Management System
// This service provides AI-powered features for disease prediction, drug interaction checking, etc.

const axios = require('axios');
const { ragChatbotQuery } = require('./ragService');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

class AIService {
  // Disease prediction based on symptoms - Now calls ML microservice
  async predictDisease(symptoms, vitals) {
    try {
      // Convert symptom array to ML service format
      const symptomMap = {
        'fever': 'fever',
        'cough': 'cough',
        'headache': 'headache',
        'fatigue': 'fatigue',
        'body aches': 'body_aches',
        'chest pain': 'chest_pain',
        'shortness of breath': 'shortness_of_breath',
        'dizziness': 'dizziness',
        'blurred vision': 'blurred_vision',
        'increased thirst': 'increased_thirst',
        'frequent urination': 'frequent_urination',
        'nausea': 'nausea',
        'vomiting': 'vomiting',
        'diarrhea': 'diarrhea',
        'sore throat': 'sore_throat',
        'runny nose': 'runny_nose',
        'sneezing': 'sneezing',
        'skin rash': 'skin_rash',
        'joint pain': 'joint_pain',
        'swelling': 'swelling'
      };

      const symptomBooleans = {};
      Object.values(symptomMap).forEach(key => {
        symptomBooleans[key] = false;
      });

      // Map input symptoms to boolean format
      if (Array.isArray(symptoms)) {
        symptoms.forEach(symptom => {
          const lowerSymptom = symptom.toLowerCase();
          for (const [input, output] of Object.entries(symptomMap)) {
            if (lowerSymptom.includes(input)) {
              symptomBooleans[output] = true;
            }
          }
        });
      }

      // Convert vitals to ML service format
      const vitalsMap = {
        'temperature': 'temperature',
        'bloodPressureSystolic': 'blood_pressure_systolic',
        'bloodPressureDiastolic': 'blood_pressure_diastolic',
        'heartRate': 'heart_rate',
        'oxygenSaturation': 'oxygen_saturation',
        'bloodGlucose': 'blood_glucose'
      };

      const mappedVitals = {};
      if (vitals) {
        for (const [key, value] of Object.entries(vitals)) {
          if (vitalsMap[key] && value !== undefined && value !== null) {
            mappedVitals[vitalsMap[key]] = value;
          }
        }
      }

      // Call ML microservice with fast 1000ms timeout
      const response = await axios.post(`${ML_SERVICE_URL}/predict`, {
        symptoms: symptomBooleans,
        vitals: Object.keys(mappedVitals).length > 0 ? mappedVitals : null
      }, { timeout: 1000 });

      return [{
        disease: response.data.disease,
        confidence: response.data.confidence,
        severity: response.data.severity,
        recommendations: response.data.recommendations
      }];

    } catch (error) {
      console.error('ML Service Error:', error.message);
      // Fallback to rule-based system if ML service is unavailable
      return this.predictDiseaseFallback(symptoms, vitals);
    }
  }

  // Fallback rule-based prediction with Ethiopian clinical knowledge base
  async predictDiseaseFallback(symptoms, vitals) {
    const diseaseDatabase = {
      'Acute Plasmodium Falciparum Malaria': {
        symptoms: ['fever', 'high fever', 'intermittent fever', 'severe fever', 'paroxysmal fever', 'chills', 'rigors', 'shivering', 'headache', 'severe headache', 'sweating', 'profuse sweating', 'nausea', 'vomiting', 'body aches', 'joint pain', 'dark urine', 'malaise', 'fatigue', 'weakness', 'loss of appetite'],
        hallmarks: ['chills', 'rigors', 'shivering', 'profuse sweating', 'paroxysmal fever', 'intermittent fever', 'dark urine'],
        vitals: { temperature: { min: 38.2, max: 41.5 } },
        baseConfidence: 0.92,
        severity: 'severe',
        icdCode: 'B50.9',
        recommendations: [
          'Immediate Blood Film for Malaria Parasites (BF) or Rapid Diagnostic Test (RDT)',
          'Initiate Artemisinin-based Combination Therapy (Coartem: Artemether 20mg / Lumefantrine 120mg)',
          'Administer Paracetamol for antipyretic relief; avoid Aspirin in acute febrile illness',
          'Ensure oral rehydration and monitor for danger signs of cerebral malaria'
        ]
      },
      'Typhoid Fever (Enteric Fever)': {
        symptoms: ['fever', 'step-ladder fever', 'step-ladder pattern', 'prolonged fever', 'persistent fever', 'gradual fever', 'headache', 'persistent headache', 'abdominal pain', 'abdominal discomfort', 'abdominal cramps', 'abdominal tenderness', 'constipation', 'diarrhea', 'malaise', 'rose spots', 'anorexia', 'weakness'],
        hallmarks: ['step-ladder', 'rose spots', 'constipation', 'abdominal cramps', 'abdominal tenderness', 'abdominal discomfort', 'abdominal pain', 'anorexia', 'prolonged fever', 'persistent fever', 'gradual fever'],
        vitals: { temperature: { min: 38.5, max: 40.5 } },
        baseConfidence: 0.91,
        severity: 'moderate',
        icdCode: 'A01.0',
        recommendations: [
          'Order Widal agglutination test and blood culture before antimicrobial therapy',
          'Prescribe Ciprofloxacin 500mg BID or Ceftriaxone 1g IV for 7-10 days',
          'Maintain adequate fluid and electrolyte balance',
          'Dietary guidance: soft, bland, easily digestible meals'
        ]
      },
      'Acute Bacterial Pneumonia': {
        symptoms: ['cough', 'productive cough', 'cough with sputum', 'purulent sputum', 'cough with purulent sputum', 'rust sputum', 'fever', 'chest pain', 'pleuritic pain', 'pleuritic chest pain', 'shortness of breath', 'dyspnea', 'tachypnea', 'chills'],
        hallmarks: ['productive cough', 'rust sputum', 'purulent sputum', 'pleuritic pain', 'pleuritic chest pain', 'cough with sputum'],
        vitals: { temperature: { min: 38.5, max: 41.0 }, oxygenSaturation: { max: 94 } },
        baseConfidence: 0.92,
        severity: 'severe',
        icdCode: 'J18.9',
        recommendations: [
          'Order urgent Complete Blood Count (CBC) and posterior-anterior Chest X-Ray',
          'Initiate empirical Ceftriaxone 1g IV plus Azithromycin or Amoxicillin',
          'Continuous pulse oximetry monitoring; provide supplemental oxygen if SpO2 < 93%',
          'Evaluate for inpatient hospital admission based on CURB-65 criteria'
        ]
      },
      'Acute Gastroenteritis with Dehydration': {
        symptoms: ['diarrhea', 'watery diarrhea', 'frequent diarrhea', 'loose stools', 'frequent loose stools', 'watery stools', 'vomiting', 'nausea', 'abdominal cramps', 'stomach cramps', 'stomach pain', 'dry mouth', 'dry tongue', 'weakness', 'dehydration', 'thirst', 'malaise'],
        hallmarks: ['watery diarrhea', 'frequent diarrhea', 'watery stools', 'loose stools', 'frequent loose stools', 'vomiting', 'dehydration', 'dry mouth', 'dry tongue', 'thirst'],
        vitals: { temperature: { max: 38.5 } },
        baseConfidence: 0.90,
        severity: 'moderate',
        icdCode: 'A09',
        recommendations: [
          'Immediate Oral Rehydration Salts (ORS) administration (1 liter prepared solution)',
          'Order Stool Microscopy and routine examination for ova and parasites',
          'Administer Zinc supplementation (20mg daily for 10-14 days)',
          'Prescribe Ciprofloxacin only if invasive bacterial dysentery is confirmed'
        ]
      },
      'Essential Hypertension (Stage 2)': {
        symptoms: ['headache', 'throbbing headache', 'occipital headache', 'occipital pain', 'morning headache', 'morning occipital pain', 'dizziness', 'lightheadedness', 'blurred vision', 'palpitations', 'neck stiffness', 'neck pain'],
        hallmarks: ['occipital', 'throbbing headache', 'neck stiffness', 'neck pain', 'morning occipital pain', 'blurred vision'],
        vitals: { bloodPressureSystolic: { min: 140 }, bloodPressureDiastolic: { min: 90 } },
        vitalRequired: true,
        baseConfidence: 0.93,
        severity: 'moderate',
        icdCode: 'I10',
        recommendations: [
          'Repeat resting blood pressure measurement after 10 minutes seated',
          'Initiate Amlodipine 5mg daily or Hydrochlorothiazide 12.5mg daily',
          'Screen serum creatinine, electrolytes, urinalysis, and baseline lipid profile',
          'Counsel on low-sodium dietary DASH lifestyle and regular physical activity'
        ]
      },
      'Type 2 Diabetes Mellitus': {
        symptoms: ['increased thirst', 'polydipsia', 'thirst', 'excessive thirst', 'frequent urination', 'excessive urination', 'polyuria', 'fatigue', 'tiredness', 'unexplained weight loss', 'weight loss', 'blurred vision'],
        hallmarks: ['increased thirst', 'polydipsia', 'thirst', 'excessive thirst', 'frequent urination', 'excessive urination', 'polyuria', 'unexplained weight loss', 'weight loss'],
        vitals: { bloodGlucose: { min: 126 } },
        baseConfidence: 0.92,
        severity: 'moderate',
        icdCode: 'E11.9',
        recommendations: [
          'Confirm with Fasting Plasma Glucose (≥ 126 mg/dL) or random glucose (≥ 200 mg/dL)',
          'Evaluate baseline HbA1c, renal function, and spot urine for microalbuminuria',
          'Initiate Metformin 500mg daily with meals; titrate gradually to 1000mg BID',
          'Comprehensive diabetic lifestyle, foot care, and dietary counseling'
        ]
      },
      'Bronchial Asthma (Acute Exacerbation)': {
        symptoms: ['wheezing', 'wheeze', 'acute wheeze', 'expiratory wheeze', 'shortness of breath', 'breathlessness', 'chest tightness', 'cough', 'tachypnea', 'dyspnea'],
        hallmarks: ['wheezing', 'wheeze', 'acute wheeze', 'expiratory wheeze', 'chest tightness', 'breathlessness'],
        vitals: { oxygenSaturation: { max: 92 }, respiratoryRate: { min: 24 } },
        baseConfidence: 0.93,
        severity: 'severe',
        icdCode: 'J45.901',
        recommendations: [
          'Immediate nebulized Salbutamol (2.5mg-5mg) with supplemental oxygen',
          'Administer systemic corticosteroids (Hydrocortisone 100mg IV or Prednisolone 40mg PO)',
          'Monitor Peak Expiratory Flow Rate (PEFR) and oxygen saturation continuously',
          'Reassess after 30 minutes for emergency observation ward admission'
        ]
      },
      'Iron Deficiency Anemia': {
        symptoms: ['fatigue', 'chronic fatigue', 'tiredness', 'weakness', 'pale skin', 'pale', 'pale conjunctiva', 'pallor', 'dizziness', 'shortness of breath', 'shortness of breath on exertion', 'palpitations', 'headache'],
        hallmarks: ['pale skin', 'pale conjunctiva', 'pale', 'pallor', 'chronic fatigue', 'shortness of breath on exertion'],
        vitals: { heartRate: { min: 88 } },
        baseConfidence: 0.90,
        severity: 'mild',
        icdCode: 'D50.9',
        recommendations: [
          'Order Complete Blood Count (CBC) with peripheral red cell indices (MCV, MCH)',
          'Initiate Ferrous Sulfate 200mg + Folic Acid 0.4mg daily for 3 months',
          'Dietary counseling: enhance dietary iron intake and avoid tea/coffee with meals',
          'Screen for gastrointestinal blood loss or hookworm in endemic regions'
        ]
      },
      'Acute Cystitis (Urinary Tract Infection)': {
        symptoms: ['dysuria', 'painful urination', 'burning urination', 'burning with urination', 'urinary frequency', 'frequent urination', 'urgency', 'suprapubic pain', 'suprapubic discomfort', 'cloudy urine', 'foul urine', 'lower abdominal pain'],
        hallmarks: ['dysuria', 'painful urination', 'burning urination', 'burning with urination', 'urinary frequency', 'urgency', 'suprapubic pain', 'suprapubic discomfort', 'cloudy urine'],
        vitals: { temperature: { max: 38.0 } },
        baseConfidence: 0.92,
        severity: 'mild',
        icdCode: 'N30.0',
        recommendations: [
          'Perform rapid dipstick urinalysis (Leukocyte esterase and Nitrite test)',
          'Prescribe Ciprofloxacin 500mg BID for 3-5 days or Nitrofurantoin 100mg BID',
          'Encourage copious oral fluid intake (> 2.5 liters/day)',
          'Advise complete course completion and return if fever or flank pain develops'
        ]
      },
      'Acute Upper Respiratory Infection (Influenza)': {
        symptoms: ['fever', 'mild fever', 'cough', 'sore throat', 'rhinorrhea', 'runny nose', 'sneezing', 'headache', 'mild headache', 'body aches', 'nasal congestion'],
        hallmarks: ['rhinorrhea', 'runny nose', 'sneezing', 'sore throat', 'nasal congestion'],
        vitals: { temperature: { min: 37.2, max: 39.5 } },
        baseConfidence: 0.90,
        severity: 'mild',
        icdCode: 'J11.1',
        recommendations: [
          'Symptomatic management: Paracetamol 500mg TID for fever and body aches',
          'Warm saline gargles, adequate hydration, and bed rest',
          'Withhold antibiotics unless secondary bacterial infection is clinically documented',
          'Counsel patient to seek medical care if high fever or dyspnea develops'
        ]
      }
    };

    // Normalize input symptoms: handle both array of strings and raw sentence strings
    let normalizedSymptoms = [];
    if (Array.isArray(symptoms)) {
      normalizedSymptoms = symptoms.map(s => String(s).toLowerCase().trim());
    } else if (typeof symptoms === 'string') {
      normalizedSymptoms = symptoms.toLowerCase().split(/[,;. ]+/).filter(Boolean);
    }

    const patientVitals = vitals || {};
    const predictions = [];

    for (const [disease, data] of Object.entries(diseaseDatabase)) {
      let matchedSymptoms = [];
      let matchedHallmarks = [];
      let vitalsMatchScore = 1.0;
      let matchedVitals = [];

      // Helper to check if patient symptoms match a clinical pattern
      const matchesPattern = (text, pattern) => {
        if (!text || !pattern) return false;
        const t = text.toLowerCase().trim();
        const p = pattern.toLowerCase().trim();
        if (t === p) return true;
        if (p.includes(' ')) {
          return t.includes(p);
        }
        return t.split(/[\s,.-]+/).includes(p) || t.includes(p);
      };

      // Symptom matching
      for (const symptom of data.symptoms) {
        if (normalizedSymptoms.some(s => matchesPattern(s, symptom))) {
          if (!matchedSymptoms.includes(symptom)) {
            matchedSymptoms.push(symptom);
          }
        }
      }

      // Hallmark pathognomonic matching
      if (data.hallmarks) {
        for (const h of data.hallmarks) {
          if (normalizedSymptoms.some(s => matchesPattern(s, h))) {
            if (!matchedHallmarks.includes(h)) {
              matchedHallmarks.push(h);
            }
          }
        }
      }

      // Vitals matching
      let hasVitalData = false;
      let vitalsTotal = 0;
      let vitalsHits = 0;

      if (data.vitals) {
        // Temperature
        if (data.vitals.temperature && (patientVitals.temperature !== undefined && patientVitals.temperature !== null)) {
          vitalsTotal++;
          hasVitalData = true;
          const t = parseFloat(patientVitals.temperature);
          const min = data.vitals.temperature.min || 0;
          const max = data.vitals.temperature.max || 50;
          if (t >= min && t <= max) {
            vitalsHits++;
            matchedVitals.push(`Temp ${t}°C`);
          }
        }

        // Blood Pressure Systolic
        const bpSys = patientVitals.bloodPressureSystolic || patientVitals.blood_pressure_systolic;
        if (data.vitals.bloodPressureSystolic && bpSys) {
          vitalsTotal++;
          hasVitalData = true;
          const bp = parseInt(bpSys, 10);
          if (data.vitals.bloodPressureSystolic.min && bp >= data.vitals.bloodPressureSystolic.min) {
            vitalsHits++;
            matchedVitals.push(`BP ${bp} mmHg`);
          }
        }

        // Oxygen Saturation
        const spo2Val = patientVitals.oxygenSaturation || patientVitals.oxygen_saturation;
        if (data.vitals.oxygenSaturation && spo2Val) {
          vitalsTotal++;
          hasVitalData = true;
          const spo2 = parseFloat(spo2Val);
          if (data.vitals.oxygenSaturation.max && spo2 <= data.vitals.oxygenSaturation.max) {
            vitalsHits++;
            matchedVitals.push(`SpO2 ${spo2}%`);
          }
        }

        // Blood Glucose
        const gluVal = patientVitals.bloodGlucose || patientVitals.blood_glucose;
        if (data.vitals.bloodGlucose && gluVal) {
          vitalsTotal++;
          hasVitalData = true;
          const gl = parseFloat(gluVal);
          if (data.vitals.bloodGlucose.min && gl >= data.vitals.bloodGlucose.min) {
            vitalsHits++;
            matchedVitals.push(`Glucose ${gl} mg/dL`);
          }
        }

        if (vitalsTotal > 0) {
          vitalsMatchScore = vitalsHits / vitalsTotal;
        }
      }

      // Vital requirement enforcement (e.g. Hypertension requires high BP)
      if (data.vitalRequired && vitalsHits === 0) {
        continue;
      }

      // Clinically calibrated scoring:
      // Hallmark symptoms provide high specificity (+15% each, up to 30%)
      const hallmarkBonus = Math.min(0.30, matchedHallmarks.length * 0.15);
      const hallmarkThreshold = Math.min(3, data.symptoms.length);
      const symptomCoverage = Math.min(1.0, matchedSymptoms.length / hallmarkThreshold);
      
      const compositeScore = (symptomCoverage * 0.50) + (vitalsMatchScore * 0.25) + hallmarkBonus;
      const confidence = Math.min(0.96, Math.max(0.35, Math.round(compositeScore * data.baseConfidence * 100) / 100));

      if (matchedSymptoms.length >= 1 || (vitalsMatchScore > 0.5 && matchedSymptoms.length > 0)) {
        predictions.push({
          disease,
          confidence,
          severity: data.severity,
          icdCode: data.icdCode,
          recommendations: data.recommendations,
          matchedCriteria: [
            ...matchedHallmarks.map(h => `Hallmark: ${h}`),
            ...matchedSymptoms.filter(s => !matchedHallmarks.includes(s)).map(s => `Symptom: ${s}`),
            ...matchedVitals.map(v => `Vital: ${v}`)
          ]
        });
      }
    }

    predictions.sort((a, b) => b.confidence - a.confidence);

    // If top prediction exists, assign up to 2 differentials
    if (predictions.length > 0) {
      const top = predictions[0];
      const differentials = predictions.slice(1, 3).map(d => ({
        disease: d.disease,
        confidence: d.confidence,
        icdCode: d.icdCode
      }));
      return [
        {
          ...top,
          differentialDiagnoses: differentials
        },
        ...predictions.slice(1, 3)
      ];
    }

    // Default general assessment
    return [{
      disease: 'General Outpatient Evaluation',
      confidence: 0.60,
      severity: 'mild',
      icdCode: 'Z00.0',
      recommendations: ['Perform comprehensive clinical history and routine screening'],
      matchedCriteria: ['Routine ambulatory presentation']
    }];
  }

  // Drug interaction checking
  async checkDrugInteractions(medications) {
    // Known drug interactions database
    const interactions = {
      'lisinopril': ['ibuprofen', 'aspirin', 'potassium supplements'],
      'warfarin': ['aspirin', 'ibuprofen', 'antibiotics'],
      'insulin': ['beta blockers', 'corticosteroids'],
      'digoxin': ['diuretics', 'amiodarone'],
      'statins': ['fibrates', 'niacin'],
      'ssris': ['maois', 'tramadol'],
      'antibiotics': ['antacids', 'warfarin']
    };

    const foundInteractions = [];

    for (let i = 0; i < medications.length; i++) {
      for (let j = i + 1; j < medications.length; j++) {
        const med1 = medications[i].toLowerCase();
        const med2 = medications[j].toLowerCase();

        for (const [drug, interactors] of Object.entries(interactions)) {
          if (med1.includes(drug) && interactors.some(i => med2.includes(i))) {
            foundInteractions.push({
              drug1: medications[i],
              drug2: medications[j],
              severity: 'moderate',
              description: `Potential interaction between ${medications[i]} and ${medications[j]}`
            });
          }
          if (med2.includes(drug) && interactors.some(i => med1.includes(i))) {
            foundInteractions.push({
              drug1: medications[j],
              drug2: medications[i],
              severity: 'moderate',
              description: `Potential interaction between ${medications[j]} and ${medications[i]}`
            });
          }
        }
      }
    }

    return {
      hasInteractions: foundInteractions.length > 0,
      interactions: foundInteractions
    };
  }

  // Health risk prediction
  async predictHealthRisk(patientData) {
    // Simplified risk assessment
    let riskScore = 0;
    const riskFactors = [];

    if (patientData.age > 60) {
      riskScore += 0.2;
      riskFactors.push('Age > 60');
    }

    if (patientData.bmi > 30) {
      riskScore += 0.15;
      riskFactors.push('Obesity (BMI > 30)');
    }

    if (patientData.smoking) {
      riskScore += 0.2;
      riskFactors.push('Smoking');
    }

    if (patientData.familyHistory) {
      riskScore += 0.15;
      riskFactors.push('Family history of chronic disease');
    }

    if (patientData.chronicConditions && patientData.chronicConditions.length > 0) {
      riskScore += 0.2;
      riskFactors.push('Existing chronic conditions');
    }

    let riskLevel = 'low';
    if (riskScore >= 0.7) riskLevel = 'high';
    else if (riskScore >= 0.4) riskLevel = 'medium';

    const recommendations = [];
    if (riskFactors.includes('Age > 60')) {
      recommendations.push('Regular health checkups');
    }
    if (riskFactors.includes('Obesity (BMI > 30)')) {
      recommendations.push('Dietary modifications and exercise program');
    }
    if (riskFactors.includes('Smoking')) {
      recommendations.push('Smoking cessation program');
    }

    return {
      riskScore: Math.round(riskScore * 100) / 100,
      riskLevel,
      riskFactors,
      recommendations
    };
  }

  // Smart appointment scheduling optimization
  async optimizeSchedule(doctorId, date, appointments) {
    // Simple optimization: sort by priority and duration
    const priorityOrder = { high: 0, normal: 1, low: 2 };
    
    const optimized = [...appointments].sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.duration - b.duration;
    });

    // Calculate time slots (assuming 9 AM - 5 PM)
    const timeSlots = [];
    let currentTime = 9 * 60; // 9:00 AM in minutes

    for (const appointment of optimized) {
      const hours = Math.floor(currentTime / 60);
      const minutes = currentTime % 60;
      timeSlots.push({
        time: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
        patientId: appointment.patientId,
        duration: appointment.duration
      });
      currentTime += appointment.duration;
    }

    return { optimizedSchedule: timeSlots };
  }

  // AI Chatbot - Now uses RAG with LLM integration
  async chatbotQuery(query, context) {
    try {
      // Use RAG service for intelligent responses
      const result = await ragChatbotQuery(query, context);
      return result;
    } catch (error) {
      console.error('RAG Chatbot Error:', error.message);
      // Fallback to simple keyword-based responses
      return this.chatbotFallback(query);
    }
  }

  // Fallback chatbot (keyword-based)
  async chatbotFallback(query) {
    const lowerQuery = query.toLowerCase();
    
    const responses = {
      symptoms: {
        keywords: ['symptoms', 'signs', 'what are'],
        response: 'Common symptoms vary by condition. Please consult a doctor for accurate diagnosis. If you have severe symptoms like chest pain, difficulty breathing, or high fever, seek immediate medical attention.'
      },
      appointment: {
        keywords: ['appointment', 'book', 'schedule', 'when'],
        response: 'To book an appointment, please contact our reception desk or use our online booking system. You can also call us at our hospital number.'
      },
      hours: {
        keywords: ['hours', 'open', 'when are you open', 'timing'],
        response: 'Our hospital is open 24/7 for emergencies. Outpatient services are available from 8 AM to 8 PM on weekdays and 9 AM to 5 PM on weekends.'
      },
      insurance: {
        keywords: ['insurance', 'payment', 'cost', 'price'],
        response: 'We accept most major insurance plans. Please contact our billing department for specific coverage information and payment options.'
      },
      emergency: {
        keywords: ['emergency', 'urgent', 'help', 'immediate'],
        response: 'If this is a medical emergency, please call emergency services (911) or visit our emergency department immediately. Do not wait for an appointment.'
      }
    };

    for (const [category, data] of Object.entries(responses)) {
      if (data.keywords.some(keyword => lowerQuery.includes(keyword))) {
        return {
          response: data.response,
          sources: ['Hospital Knowledge Base'],
          method: 'fallback'
        };
      }
    }

    return {
      response: 'I\'m not sure about that. For specific medical questions, please consult with a healthcare professional. For hospital-related queries, you can contact our reception desk.',
      sources: ['Hospital Knowledge Base'],
      method: 'fallback'
    };
  }

  // Generate automated alerts
  async generateAlerts() {
    const alerts = [];

    // Check for low inventory
    alerts.push({
      type: 'inventory',
      message: 'Medicine stock below reorder level',
      priority: 'high'
    });

    // Check for upcoming appointments
    alerts.push({
      type: 'appointment',
      message: 'Patient appointments in the next 24 hours',
      priority: 'normal'
    });

    // Check for pending lab results
    alerts.push({
      type: 'lab',
      message: 'Lab tests pending results',
      priority: 'normal'
    });

    return alerts;
  }
}

module.exports = new AIService();
