# HMS Disease Prediction Microservice

A FastAPI-based microservice that provides rule-assisted disease prediction for the **Alem Ketema Enat Hospital Management System** — built as part of a 4th-year final year project.

## Algorithm

The service uses a **Weighted Similarity Algorithm**:

- **70%** symptom match score — ratio of patient-reported symptoms that match a disease profile
- **30%** vitals match score — how many vital sign ranges fall within expected thresholds

Combined score × per-disease base confidence = final prediction confidence.

> **Note:** This is a deterministic rule-based system, not a stochastic ML model. For production deployment, replacing it with a trained scikit-learn classifier (Random Forest or Gradient Boosting) on a labelled clinical dataset (e.g., UCI ML Repository) is recommended.

## Supported Diseases (10)

| Disease | ICD-10 | Severity |
|---|---|---|
| Influenza | J11 | Moderate |
| Pneumonia | J18 | Severe |
| Hypertension | I10 | Moderate |
| Diabetes Mellitus Type 2 | E11 | Moderate |
| Gastroenteritis | A09 | Mild |
| Arthritis | M13 | Mild |
| Malaria | B54 | Severe |
| Tuberculosis | A15 | Severe |
| Common Cold (URI) | J00 | Mild |
| Anaemia | D64 | Moderate |

## Input Features

**25 Symptoms (boolean):**
`fever`, `cough`, `fatigue`, `body_aches`, `headache`, `chest_pain`,
`shortness_of_breath`, `dizziness`, `blurred_vision`, `increased_thirst`,
`frequent_urination`, `nausea`, `vomiting`, `diarrhea`, `sore_throat`,
`runny_nose`, `sneezing`, `skin_rash`, `joint_pain`, `swelling`,
`abdominal_pain`, `loss_of_appetite`, `night_sweats`, `weight_loss`, `palpitations`

**6 Vitals (optional, numeric):**
`temperature` (°C), `blood_pressure_systolic` (mmHg),
`blood_pressure_diastolic` (mmHg), `heart_rate` (bpm),
`oxygen_saturation` (%), `blood_glucose` (mg/dL)

## Installation

```bash
cd ml-service
pip install -r requirements.txt
python main.py
```

Or with uvicorn directly:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Service runs at `http://localhost:8000`  
Interactive docs at `http://localhost:8000/docs`

## API Endpoints

### `GET /`
Returns service metadata and endpoint list.

### `GET /health`
```json
{ "status": "healthy", "model_loaded": true, "diseases_supported": 10 }
```

### `POST /predict`
Single patient prediction.

**Request:**
```json
{
  "symptoms": {
    "fever": true,
    "cough": true,
    "fatigue": true,
    "body_aches": true,
    "headache": true,
    "sore_throat": true
  },
  "vitals": {
    "temperature": 38.7,
    "heart_rate": 95,
    "oxygen_saturation": 97
  }
}
```

**Response:**
```json
{
  "disease": "Influenza",
  "confidence": 0.714,
  "severity": "moderate",
  "recommendations": [
    "Rest and stay well hydrated",
    "Take antiviral medications if prescribed within 48 hours of onset",
    "Monitor temperature every 4 hours",
    "Isolate to prevent spread to others",
    "Seek medical attention if symptoms worsen"
  ],
  "differential_diagnoses": [
    { "disease": "Common Cold (URI)", "confidence": 0.495, "severity": "mild", "icd_code": "J00" }
  ]
}
```

### `POST /predict-batch`
Accepts up to 50 prediction requests in one call.

### `GET /diseases`
Returns the full catalogue of supported diseases with ICD codes and feature counts.

## Integration with Node.js Backend

The backend calls this service via `aiService.js`:

```javascript
const response = await axios.post('http://localhost:8000/predict', {
  symptoms: symptomBooleans,
  vitals: mappedVitals
});
```

If the ML service is unavailable, the backend automatically falls back to its own rule-based engine.

## Future Enhancements (Recommended for Production)

1. Train a **scikit-learn Random Forest** classifier on a real dataset (e.g., [Disease Symptom Prediction — Kaggle](https://www.kaggle.com/datasets/itachi9604/disease-symptom-description-dataset))
2. Add **model persistence** with `joblib` for save/load
3. Implement **cross-validation** and hyperparameter tuning
4. Add **model monitoring** and performance metrics endpoint
5. Integrate **Ethiopian disease prevalence data** for regional calibration
6. Add **drug interaction prediction** endpoint
