from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import numpy as np
from PIL import Image
import io
import tensorflow as tf
from tensorflow.keras.applications import ResNet50
from tensorflow.keras.preprocessing import image
from tensorflow.keras.applications.resnet50 import preprocess_input, decode_predictions
import cv2
import base64

app = FastAPI(title="Medical Image Analysis Service", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data models
class AnalysisRequest(BaseModel):
    image_type: str  # 'xray', 'mri', 'ct', 'ultrasound'
    analysis_type: str  # 'pneumonia_detection', 'fracture_detection', 'tumor_detection'

class AnalysisResponse(BaseModel):
    prediction: str
    confidence: float
    findings: list
    recommendations: list
    heatmap_data: Optional[str] = None  # Base64 encoded heatmap

# Global variables for models
pneumonia_model = None
fracture_model = None
tumor_model = None
general_model = None

def load_models():
    """Load pre-trained models"""
    global pneumonia_model, fracture_model, tumor_model, general_model
    
    # Load general model (ResNet50 for general image classification)
    general_model = ResNet50(weights='imagenet')
    
    # In production, load specialized medical models
    # pneumonia_model = tf.keras.models.load_model('models/pneumonia_model.h5')
    # fracture_model = tf.keras.models.load_model('models/fracture_model.h5')
    # tumor_model = tf.keras.models.load_model('models/tumor_model.h5')
    
    print("Models loaded successfully")

@app.on_event("startup")
async def startup_event():
    """Load models on startup"""
    load_models()

@app.get("/")
async def root():
    return {
        "message": "Medical Image Analysis Service",
        "version": "1.0.0",
        "endpoints": {
            "/analyze": "POST - Analyze medical image",
            "/health": "GET - Health check"
        }
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "models_loaded": general_model is not None}

def generate_heatmap(img_array, model, last_conv_layer_name):
    """Generate Grad-CAM heatmap for model interpretation"""
    try:
        # Create a model that maps the input image to the activations of the last conv layer
        grad_model = tf.keras.models.Model(
            [model.inputs], 
            [model.get_layer(last_conv_layer_name).output, model.output]
        )
        
        # Compute gradient of the top predicted class
        with tf.GradientTape() as tape:
            last_conv_layer_output, preds = grad_model(img_array)
            pred_index = tf.argmax(preds[0])
            class_channel = preds[:, pred_index]
        
        # Gradient of the output neuron with regard to the output feature map
        grads = tape.gradient(class_channel, last_conv_layer_output)
        
        # Vector of mean intensity of the gradient over a specific feature map channel
        pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
        
        # Weight the feature map channels by the gradient importance
        last_conv_layer_output = last_conv_layer_output[0]
        heatmap = last_conv_layer_output @ pooled_grads[..., tf.newaxis]
        heatmap = tf.squeeze(heatmap)
        
        # Normalize heatmap
        heatmap = tf.maximum(heatmap, 0) / tf.math.reduce_max(heatmap)
        
        # Convert to numpy and resize to original image size
        heatmap = heatmap.numpy()
        heatmap = cv2.resize(heatmap, (224, 224))
        heatmap = np.uint8(255 * heatmap)
        heatmap = cv2.applyColorMap(heatmap, cv2.COLORMAP_JET)
        
        # Convert to base64
        _, buffer = cv2.imencode('.jpg', heatmap)
        heatmap_base64 = base64.b64encode(buffer).decode('utf-8')
        
        return heatmap_base64
    except Exception as e:
        print(f"Heatmap generation error: {e}")
        return None

@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_image(
    file: UploadFile = File(...),
    image_type: str = "xray",
    analysis_type: str = "pneumonia_detection"
):
    """Analyze medical image using CNN"""
    if general_model is None:
        raise HTTPException(status_code=503, detail="Models not loaded")
    
    try:
        # Read and preprocess image
        contents = await file.read()
        img = Image.open(io.BytesIO(contents))
        
        # Convert to RGB if necessary
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Resize for model
        img = img.resize((224, 224))
        img_array = image.img_to_array(img)
        img_array = np.expand_dims(img_array, axis=0)
        img_array = preprocess_input(img_array)
        
        # Perform analysis based on type
        if analysis_type == "pneumonia_detection":
            prediction, confidence, findings, recommendations = analyze_pneumonia(img_array)
        elif analysis_type == "fracture_detection":
            prediction, confidence, findings, recommendations = analyze_fracture(img_array)
        elif analysis_type == "tumor_detection":
            prediction, confidence, findings, recommendations = analyze_tumor(img_array)
        else:
            # General analysis using ResNet50
            prediction, confidence, findings, recommendations = analyze_general(img_array)
        
        # Generate heatmap (optional)
        heatmap_data = None
        try:
            heatmap_data = generate_heatmap(img_array, general_model, 'conv5_block3_out')
        except:
            pass
        
        return AnalysisResponse(
            prediction=prediction,
            confidence=confidence,
            findings=findings,
            recommendations=recommendations,
            heatmap_data=heatmap_data
        )
        
    except Exception as e:
        print(f"Analysis error: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

def analyze_pneumonia(img_array):
    """Analyze for pneumonia (simulated - use trained model in production)"""
    # In production, use: pneumonia_model.predict(img_array)
    
    # Simulated prediction for demo
    confidence = 0.72
    
    if confidence > 0.5:
        prediction = "Pneumonia Detected"
        findings = [
            "Increased opacity in lung fields",
            "Possible consolidation patterns",
            "Air bronchograms visible"
        ]
        recommendations = [
            "Immediate clinical correlation required",
            "Consider antibiotic treatment",
            "Follow-up imaging recommended in 3-5 days"
        ]
    else:
        prediction = "No Pneumonia Detected"
        findings = [
            "Clear lung fields",
            "Normal lung markings",
            "No significant abnormalities"
        ]
        recommendations = [
            "Normal chest X-ray",
            "Continue routine monitoring",
            "No immediate intervention required"
        ]
    
    return prediction, confidence, findings, recommendations

def analyze_fracture(img_array):
    """Analyze for fractures (simulated - use trained model in production)"""
    # In production, use: fracture_model.predict(img_array)
    
    confidence = 0.65
    
    if confidence > 0.5:
        prediction = "Fracture Detected"
        findings = [
            "Disruption in cortical continuity",
            "Possible fracture line visible",
            "Soft tissue swelling present"
        ]
        recommendations = [
            "Orthopedic consultation recommended",
            "Immobilization required",
            "Follow-up X-ray in 7-10 days"
        ]
    else:
        prediction = "No Fracture Detected"
        findings = [
            "Normal bone architecture",
            "No fracture lines visible",
            "Joint spaces maintained"
        ]
        recommendations = [
            "Normal skeletal imaging",
            "Conservative management if symptomatic",
            "Routine follow-up as needed"
        ]
    
    return prediction, confidence, findings, recommendations

def analyze_tumor(img_array):
    """Analyze for tumors (simulated - use trained model in production)"""
    # In production, use: tumor_model.predict(img_array)
    
    confidence = 0.58
    
    if confidence > 0.5:
        prediction = "Suspicious Mass Detected"
        findings = [
            "Irregular mass lesion visible",
            "Ill-defined margins",
            "Possible tissue infiltration"
        ]
        recommendations = [
            "Immediate specialist consultation",
            "Biopsy recommended",
            "Additional imaging (MRI/CT) advised"
        ]
    else:
        prediction = "No Significant Mass Detected"
        findings = [
            "Normal tissue architecture",
            "No suspicious lesions",
            "Symmetrical appearance"
        ]
        recommendations = [
            "Normal imaging findings",
            "Routine screening recommended",
            "Annual follow-up suggested"
        ]
    
    return prediction, confidence, findings, recommendations

def analyze_general(img_array):
    """General image analysis using ResNet50"""
    try:
        predictions = general_model.predict(img_array)
        decoded_predictions = decode_predictions(predictions, top=3)[0]
        
        top_prediction = decoded_predictions[0]
        prediction = top_prediction[1].replace('_', ' ').title()
        confidence = float(top_prediction[2])
        
        findings = [
            f"Image classified as: {prediction}",
            f"Confidence: {confidence:.2%}",
            "General analysis performed"
        ]
        
        recommendations = [
            "Specialized medical analysis recommended",
            "Consult radiologist for detailed interpretation",
            "Correlate with clinical findings"
        ]
        
        return prediction, confidence, findings, recommendations
    except Exception as e:
        print(f"General analysis error: {e}")
        return "Analysis Error", 0.0, ["Analysis failed"], ["Retry analysis"]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
