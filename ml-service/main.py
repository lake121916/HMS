"""
ML Disease Prediction Microservice
Hospital Management System — Final Year Project

Uses a weighted-similarity algorithm to predict diseases from symptoms and vitals.
Algorithm: 70% symptom match score + 30% vitals range match score, scaled by
per-disease base confidence.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import math

app = FastAPI(
    title="HMS Disease Prediction Service",
    description="Symptom-based disease prediction for Alem Ketema Enat Hospital HMS",
    version="2.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Pydantic models ──────────────────────────────────────────────────────────

class SymptomInput(BaseModel):
    fever: bool = False
    cough: bool = False
    fatigue: bool = False
    body_aches: bool = False
    headache: bool = False
    chest_pain: bool = False
    shortness_of_breath: bool = False
    dizziness: bool = False
    blurred_vision: bool = False
    increased_thirst: bool = False
    frequent_urination: bool = False
    nausea: bool = False
    vomiting: bool = False
    diarrhea: bool = False
    sore_throat: bool = False
    runny_nose: bool = False
    sneezing: bool = False
    skin_rash: bool = False
    joint_pain: bool = False
    swelling: bool = False
    abdominal_pain: bool = False
    loss_of_appetite: bool = False
    night_sweats: bool = False
    weight_loss: bool = False
    palpitations: bool = False


class VitalsInput(BaseModel):
    temperature: Optional[float] = None
    blood_pressure_systolic: Optional[int] = None
    blood_pressure_diastolic: Optional[int] = None
    heart_rate: Optional[int] = None
    oxygen_saturation: Optional[float] = None
    blood_glucose: Optional[float] = None


class PredictionRequest(BaseModel):
    symptoms: SymptomInput
    vitals: Optional[VitalsInput] = None


class PredictionResponse(BaseModel):
    disease: str
    confidence: float
    severity: str
    recommendations: List[str]
    differential_diagnoses: Optional[List[Dict[str, Any]]] = None


# ── Disease knowledge base ───────────────────────────────────────────────────
# vitals format: key -> (min_val, max_val)  — None means unbounded

disease_patterns: Dict[str, Dict] = {
    "Influenza": {
        "symptoms": ["fever", "cough", "fatigue", "body_aches", "headache",
                     "sore_throat", "runny_nose", "sneezing"],
        "vitals": {"temperature": (38.0, 40.5)},
        "base_confidence": 0.85,
        "severity": "moderate",
        "icd_code": "J11",
        "recommendations": [
            "Rest and stay well hydrated",
            "Take antiviral medications if prescribed within 48 hours of onset",
            "Monitor temperature every 4 hours",
            "Isolate to prevent spread to others",
            "Seek medical attention if symptoms worsen"
        ]
    },
    "Pneumonia": {
        "symptoms": ["fever", "cough", "chest_pain", "shortness_of_breath",
                     "fatigue", "night_sweats"],
        "vitals": {"temperature": (38.5, 41.0), "oxygen_saturation": (None, 95.0)},
        "base_confidence": 0.90,
        "severity": "severe",
        "icd_code": "J18",
        "recommendations": [
            "Seek immediate medical attention",
            "Antibiotic or antiviral treatment as prescribed",
            "Monitor oxygen saturation closely (target > 95%)",
            "Chest X-ray strongly recommended",
            "Hospitalisation may be required for severe cases"
        ]
    },
    "Hypertension": {
        "symptoms": ["headache", "dizziness", "blurred_vision", "palpitations"],
        "vitals": {"blood_pressure_systolic": (140, None)},
        "base_confidence": 0.82,
        "severity": "moderate",
        "icd_code": "I10",
        "recommendations": [
            "Regular blood pressure monitoring twice daily",
            "Low-sodium, DASH diet recommended",
            "Moderate exercise 30 min/day, 5 days/week",
            "Stress reduction techniques (meditation, deep breathing)",
            "Antihypertensive medication as prescribed",
            "Limit alcohol and caffeine intake"
        ]
    },
    "Diabetes Mellitus Type 2": {
        "symptoms": ["increased_thirst", "frequent_urination", "fatigue",
                     "blurred_vision", "loss_of_appetite", "weight_loss"],
        "vitals": {"blood_glucose": (126.0, None)},
        "base_confidence": 0.88,
        "severity": "moderate",
        "icd_code": "E11",
        "recommendations": [
            "Fasting blood glucose test required for confirmation (≥ 126 mg/dL)",
            "HbA1c test to assess 3-month average glucose",
            "Low glycaemic index diet",
            "Regular physical activity (150 min/week)",
            "Blood glucose self-monitoring as prescribed",
            "Metformin or other oral hypoglycaemics as prescribed"
        ]
    },
    "Gastroenteritis": {
        "symptoms": ["nausea", "vomiting", "diarrhea", "fatigue",
                     "abdominal_pain", "loss_of_appetite"],
        "vitals": {},
        "base_confidence": 0.85,
        "severity": "mild",
        "icd_code": "A09",
        "recommendations": [
            "Oral rehydration solution (ORS) to replace lost fluids",
            "BRAT diet: Bananas, Rice, Applesauce, Toast",
            "Avoid dairy, fatty, and spicy foods until recovery",
            "Rest and avoid solid foods initially",
            "Seek medical attention if symptoms persist > 48 hours",
            "Watch for signs of dehydration (dry mouth, dark urine)"
        ]
    },
    "Arthritis": {
        "symptoms": ["joint_pain", "swelling", "fatigue", "body_aches"],
        "vitals": {},
        "base_confidence": 0.72,
        "severity": "mild",
        "icd_code": "M13",
        "recommendations": [
            "Low-impact physical therapy exercises",
            "NSAIDs (e.g., ibuprofen) for pain and inflammation",
            "Joint protection techniques during daily activities",
            "Weight management to reduce joint load",
            "Rheumatology referral for persistent symptoms",
            "Hot/cold therapy for symptomatic relief"
        ]
    },
    "Malaria": {
        "symptoms": ["fever", "chills", "headache", "body_aches", "fatigue",
                     "nausea", "vomiting", "night_sweats"],
        "vitals": {"temperature": (38.0, 41.5)},
        "base_confidence": 0.80,
        "severity": "severe",
        "icd_code": "B54",
        "recommendations": [
            "Immediate malaria rapid diagnostic test (RDT) or blood smear",
            "Artemisinin-based combination therapy (ACT) as per national guidelines",
            "Hospitalisation for severe/complicated malaria",
            "Monitor for cerebral malaria symptoms",
            "Use insecticide-treated bed nets",
            "Paracetamol for fever control (avoid aspirin)"
        ]
    },
    "Tuberculosis": {
        "symptoms": ["cough", "night_sweats", "weight_loss", "fatigue",
                     "fever", "loss_of_appetite"],
        "vitals": {"temperature": (37.5, 39.5)},
        "base_confidence": 0.78,
        "severity": "severe",
        "icd_code": "A15",
        "recommendations": [
            "Sputum smear microscopy and culture required",
            "Chest X-ray for pulmonary involvement",
            "Standard 6-month DOTS regimen (RHZE/RH)",
            "Notify public health authorities",
            "Contact tracing of close contacts",
            "Airborne precautions (N95 mask, ventilated room)"
        ]
    },
    "Common Cold (URI)": {
        "symptoms": ["runny_nose", "sneezing", "sore_throat", "cough",
                     "headache", "fatigue"],
        "vitals": {"temperature": (37.0, 38.5)},
        "base_confidence": 0.88,
        "severity": "mild",
        "icd_code": "J00",
        "recommendations": [
            "Adequate rest (7–9 hours/night)",
            "Stay well hydrated — warm fluids soothe the throat",
            "Saline nasal rinses for congestion",
            "Over-the-counter analgesics for headache/sore throat",
            "Honey and lemon for symptomatic relief",
            "Avoid spreading — cover coughs, wash hands frequently"
        ]
    },
    "Anaemia": {
        "symptoms": ["fatigue", "dizziness", "shortness_of_breath",
                     "palpitations", "headache"],
        "vitals": {"heart_rate": (90, None)},
        "base_confidence": 0.70,
        "severity": "moderate",
        "icd_code": "D64",
        "recommendations": [
            "Full blood count (FBC) test required",
            "Iron-rich diet: red meat, legumes, leafy greens",
            "Iron supplementation as prescribed (avoid with tea/coffee)",
            "Identify and treat underlying cause",
            "Folic acid and B12 supplementation if indicated",
            "Monthly haemoglobin monitoring until normalised"
        ]
    }
}


# ── Core algorithm ───────────────────────────────────────────────────────────

def calculate_similarity(symptoms_dict: dict, vitals_dict: dict, disease_pattern: dict) -> float:
    """
    Weighted similarity score:
    - 70% from symptom overlap ratio
    - 30% from vitals range match (if applicable)
    """
    # Symptom score
    disease_symptoms = disease_pattern["symptoms"]
    if disease_symptoms:
        matched = sum(1 for s in disease_symptoms if symptoms_dict.get(s, False))
        symptom_score = matched / len(disease_symptoms)
    else:
        symptom_score = 0.0

    # Vitals score
    disease_vitals = disease_pattern.get("vitals", {})
    vital_score = 0.0
    if disease_vitals and vitals_dict:
        total_vitals = 0
        vital_matches = 0
        for vital, (min_val, max_val) in disease_vitals.items():
            patient_val = vitals_dict.get(vital)
            if patient_val is not None:
                total_vitals += 1
                in_range = True
                if min_val is not None and patient_val < min_val:
                    in_range = False
                if max_val is not None and patient_val > max_val:
                    in_range = False
                if in_range:
                    vital_matches += 1
        vital_score = (vital_matches / total_vitals) if total_vitals > 0 else 0.0

    # Combined weighted score
    return (symptom_score * 0.7) + (vital_score * 0.3)


def get_all_predictions(symptoms_dict: dict, vitals_dict: dict):
    predictions = []
    for disease, pattern in disease_patterns.items():
        similarity = calculate_similarity(symptoms_dict, vitals_dict, pattern)
        if similarity > 0.25:  # minimum threshold
            confidence = round(similarity * pattern["base_confidence"], 3)
            predictions.append({
                "disease": disease,
                "confidence": confidence,
                "severity": pattern["severity"],
                "recommendations": pattern["recommendations"],
                "icd_code": pattern.get("icd_code", ""),
            })
    predictions.sort(key=lambda x: x["confidence"], reverse=True)
    return predictions


# ── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/", summary="Service information")
async def root():
    return {
        "service": "HMS Disease Prediction Service",
        "version": "2.0.0",
        "hospital": "Alem Ketema Enat Hospital",
        "algorithm": "Weighted Similarity (70% symptoms + 30% vitals)",
        "supported_diseases": len(disease_patterns),
        "endpoints": {
            "GET  /": "Service information",
            "GET  /health": "Health check",
            "POST /predict": "Single patient prediction",
            "POST /predict-batch": "Batch predictions",
            "GET  /diseases": "List all supported diseases",
        }
    }


@app.get("/health", summary="Health check")
async def health_check():
    return {
        "status": "healthy",
        "model_loaded": True,
        "diseases_supported": len(disease_patterns),
    }


@app.post("/predict", response_model=PredictionResponse, summary="Predict disease for one patient")
async def predict_disease(request: PredictionRequest):
    """
    Predict the most likely disease from a patient's symptoms and optional vitals.
    Returns top prediction plus up to 2 differential diagnoses.
    """
    symptoms_dict = request.symptoms.model_dump()
    vitals_dict = request.vitals.model_dump() if request.vitals else {}

    # Check at least one symptom is reported
    if not any(symptoms_dict.values()):
        raise HTTPException(status_code=400, detail="At least one symptom must be reported")

    predictions = get_all_predictions(symptoms_dict, vitals_dict)

    if not predictions:
        return PredictionResponse(
            disease="Undetermined",
            confidence=0.0,
            severity="unknown",
            recommendations=[
                "Symptom pattern does not match known disease profiles",
                "Please consult a qualified healthcare professional",
                "Provide complete symptom history and vital signs for better accuracy"
            ],
            differential_diagnoses=[]
        )

    top = predictions[0]
    differentials = [
        {"disease": p["disease"], "confidence": p["confidence"],
         "severity": p["severity"], "icd_code": p.get("icd_code", "")}
        for p in predictions[1:3]
    ]

    return PredictionResponse(
        disease=top["disease"],
        confidence=top["confidence"],
        severity=top["severity"],
        recommendations=top["recommendations"],
        differential_diagnoses=differentials
    )


@app.post("/predict-batch", summary="Batch predictions for multiple patients")
async def predict_batch(requests: List[PredictionRequest]):
    """Batch disease prediction — useful for bulk screening scenarios."""
    if len(requests) > 50:
        raise HTTPException(status_code=400, detail="Batch size cannot exceed 50 requests")

    results = []
    for req in requests:
        symptoms_dict = req.symptoms.model_dump()
        vitals_dict = req.vitals.model_dump() if req.vitals else {}
        predictions = get_all_predictions(symptoms_dict, vitals_dict)

        if predictions:
            top = predictions[0]
            results.append({
                "disease": top["disease"],
                "confidence": top["confidence"],
                "severity": top["severity"],
                "icd_code": top.get("icd_code", ""),
                "recommendations": top["recommendations"],
            })
        else:
            results.append({
                "disease": "Undetermined",
                "confidence": 0.0,
                "severity": "unknown",
                "icd_code": "",
                "recommendations": ["Consult a healthcare professional for accurate diagnosis"],
            })

    return {"count": len(results), "predictions": results}


@app.get("/diseases", summary="List all supported diseases")
async def list_diseases():
    """Return a catalogue of all diseases the service can predict."""
    return {
        "count": len(disease_patterns),
        "diseases": [
            {
                "name": name,
                "severity": p["severity"],
                "icd_code": p.get("icd_code", ""),
                "symptom_count": len(p["symptoms"]),
                "vitals_used": list(p.get("vitals", {}).keys()),
            }
            for name, p in disease_patterns.items()
        ]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
