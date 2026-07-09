# Medical Image Analysis Service

A FastAPI-based microservice for medical image analysis using Convolutional Neural Networks (CNNs). Supports X-ray, MRI, CT, and ultrasound analysis.

## Features

- **CNN-Based Analysis**: Uses TensorFlow/Keras for deep learning image analysis
- **Multiple Analysis Types**: Pneumonia detection, fracture detection, tumor detection
- **Heatmap Generation**: Grad-CAM visualizations for model interpretability
- **DICOM Support**: Ready for DICOM medical image format integration
- **REST API**: Clean endpoints for image upload and analysis

## Installation

1. **Install Python dependencies:**
```bash
cd image-analysis-service
pip install -r requirements.txt
```

2. **Run the service:**
```bash
python main.py
```

Or using uvicorn directly:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8001
```

The service will be available at `http://localhost:8001`

## API Endpoints

### POST /analyze
Analyze medical image.

**Parameters:**
- `file`: Image file (multipart/form-data)
- `image_type`: Type of medical image (xray, mri, ct, ultrasound)
- `analysis_type`: Type of analysis (pneumonia_detection, fracture_detection, tumor_detection)

**Response:**
```json
{
  "prediction": "Pneumonia Detected",
  "confidence": 0.72,
  "findings": [
    "Increased opacity in lung fields",
    "Possible consolidation patterns",
    "Air bronchograms visible"
  ],
  "recommendations": [
    "Immediate clinical correlation required",
    "Consider antibiotic treatment",
    "Follow-up imaging recommended in 3-5 days"
  ],
  "heatmap_data": "base64_encoded_heatmap_image"
}
```

### GET /health
Health check endpoint.

## Model Training

The service currently uses pre-trained models for demonstration. For production:

1. **Prepare Dataset**: Collect labeled medical images (e.g., from Kaggle medical imaging datasets)
2. **Train Models**: Use transfer learning with architectures like ResNet50, DenseNet, or EfficientNet
3. **Save Models**: Export trained models as `.h5` files
4. **Update Code**: Load custom models in the `load_models()` function

Example training code structure:
```python
from tensorflow.keras.applications import ResNet50
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D
from tensorflow.keras.models import Model

# Load base model
base_model = ResNet50(weights='imagenet', include_top=False, input_shape=(224, 224, 3))

# Add custom layers
x = base_model.output
x = GlobalAveragePooling2D()(x)
x = Dense(1024, activation='relu')(x)
predictions = Dense(num_classes, activation='softmax')(x)

model = Model(inputs=base_model.input, outputs=predictions)

# Train
model.fit(train_generator, validation_data=val_generator, epochs=50)

# Save
model.save('pneumonia_model.h5')
```

## DICOM Integration

For full DICOM support:

1. Install additional dependencies:
```bash
pip install pydicom cornerstone-wado-image-loader
```

2. Use pydicom to parse DICOM files:
```python
import pydicom

def load_dicom(file_path):
    ds = pydicom.dcmread(file_path)
    pixel_array = ds.pixel_array
    # Convert to PIL Image for processing
    img = Image.fromarray(pixel_array)
    return img
```

## Frontend Integration

The frontend can use libraries like Cornerstone.js for DICOM viewing:

```javascript
import cornerstone from 'cornerstone-core';
import cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';

cornerstoneWADOImageLoader.external.cornerstone = cornerstone;

// Load and display DICOM image
const element = document.getElementById('dicomImage');
cornerstone.enable(element);

cornerstone.loadImage(imageId).then(image => {
  cornerstone.displayImage(element, image);
});
```

## Integration with Node.js Backend

The Node.js backend can call this service:

```javascript
const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');

async function analyzeImage(imagePath, imageType, analysisType) {
  const form = new FormData();
  form.append('file', fs.createReadStream(imagePath));
  form.append('image_type', imageType);
  form.append('analysis_type', analysisType);

  const response = await axios.post(
    'http://localhost:8001/analyze',
    form,
    {
      headers: form.getHeaders()
    }
  );

  return response.data;
}
```

## Supported Analysis Types

1. **Pneumonia Detection**: Analyzes chest X-rays for pneumonia indicators
2. **Fracture Detection**: Identifies bone fractures in X-rays
3. **Tumor Detection**: Detects suspicious masses in MRI/CT scans
4. **General Analysis**: Uses ImageNet-trained ResNet50 for general classification

## Future Enhancements

- Add more specialized models (e.g., for different body regions)
- Implement 3D image analysis for CT/MRI volumes
- Add segmentation capabilities
- Integrate with PACS systems
- Add real-time analysis streaming
- Implement model versioning and A/B testing
