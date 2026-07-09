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

      // Call ML microservice
      const response = await axios.post(`${ML_SERVICE_URL}/predict`, {
        symptoms: symptomBooleans,
        vitals: Object.keys(mappedVitals).length > 0 ? mappedVitals : null
      });

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

  // Fallback rule-based prediction
  async predictDiseaseFallback(symptoms, vitals) {
    const diseaseDatabase = {
      influenza: {
        symptoms: ['fever', 'cough', 'headache', 'fatigue', 'body aches'],
        vitals: { temperature: { min: 38, max: 40 } },
        confidence: 0.85,
        severity: 'moderate'
      },
      pneumonia: {
        symptoms: ['fever', 'cough', 'chest pain', 'shortness of breath'],
        vitals: { temperature: { min: 38.5, max: 41 }, oxygenSaturation: { max: 95 } },
        confidence: 0.9,
        severity: 'severe'
      },
      hypertension: {
        symptoms: ['headache', 'dizziness', 'blurred vision'],
        vitals: { bloodPressureSystolic: { min: 140 } },
        confidence: 0.8,
        severity: 'moderate'
      },
      diabetes: {
        symptoms: ['increased thirst', 'frequent urination', 'fatigue'],
        vitals: { bloodGlucose: { min: 126 } },
        confidence: 0.75,
        severity: 'moderate'
      }
    };

    const predictions = [];
    
    for (const [disease, data] of Object.entries(diseaseDatabase)) {
      let matchCount = 0;
      let vitalsMatch = true;

      for (const symptom of data.symptoms) {
        if (symptoms.some(s => s.toLowerCase().includes(symptom))) {
          matchCount++;
        }
      }

      if (vitals && data.vitals) {
        for (const [vital, range] of Object.entries(data.vitals)) {
          const patientVital = vitals[vital];
          if (patientVital !== undefined) {
            if (range.min && patientVital < range.min) vitalsMatch = false;
            if (range.max && patientVital > range.max) vitalsMatch = false;
          }
        }
      }

      const symptomMatch = matchCount / data.symptoms.length;
      const confidence = (symptomMatch * 0.7 + (vitalsMatch ? 0.3 : 0)) * data.confidence;

      if (confidence > 0.5) {
        predictions.push({
          disease: disease.charAt(0).toUpperCase() + disease.slice(1),
          confidence: Math.round(confidence * 100) / 100,
          severity: data.severity
        });
      }
    }

    predictions.sort((a, b) => b.confidence - a.confidence);
    return predictions.slice(0, 3);
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
