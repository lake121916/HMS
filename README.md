# AI-Based Hospital Management System

A comprehensive hospital management system built with React.js, Node.js, Express.js, and PostgreSQL, featuring AI-powered disease prediction, drug interaction checking, smart scheduling, and role-based access control.

## 🎓 Capstone Project Features

This system has been enhanced with production-ready features suitable for a final year graduation project:

### High-Impact Production Features

#### 1. **ML Disease Prediction Microservice** ✨
- **Technology**: FastAPI + Scikit-Learn (Random Forest Classifier)
- **Features**: Real machine learning model for disease prediction from symptoms
- **Integration**: Python microservice called from Node.js backend
- **Impact**: Demonstrates full-stack integration of Software Engineering and Data Science
- **Location**: `ml-service/` directory

#### 2. **Stripe Payment Gateway Integration** 💳
- **Technology**: Stripe API with PDFKit for receipt generation
- **Features**: Real secure payment processing, automatic PDF receipts, refund support
- **Impact**: Professional payment handling with downloadable receipts
- **Endpoints**: `/api/payments/create-intent`, `/api/payments/confirm`, `/api/payments/receipt/:id`

#### 3. **Real-time Critical Vitals Alerts** 🚨
- **Technology**: Enhanced Socket.io with emergency notifications
- **Features**: Instant alerts when vitals exceed thresholds, emergency call broadcasting
- **Impact**: Demonstrates real-time system responsiveness during live demo
- **Events**: `critical-vitals`, `emergency-call`

#### 4. **RAG Chatbot with LLM Integration** 🤖
- **Technology**: Retrieval-Augmented Generation with Google Gemini/OpenAI
- **Features**: Intelligent responses using hospital knowledge base, fallback to keyword matching
- **Impact**: Shows advanced AI implementation beyond simple rule-based systems
- **Configuration**: Supports both Gemini and OpenAI APIs
- **Location**: `backend/src/services/ragService.js`

#### 5. **Telehealth Video Consultation** 📹
- **Technology**: WebRTC with Socket.io signaling
- **Features**: Real-time video calls between doctors and patients, session management
- **Impact**: Modern healthcare delivery demonstration
- **Endpoints**: `/api/telehealth/sessions`, `/api/telehealth/sessions/:id/join`

#### 6. **Medical Image Analysis with CNN** 🏥
- **Technology**: FastAPI + TensorFlow/Keras (ResNet50)
- **Features**: X-ray/MRI/CT analysis, pneumonia detection, fracture detection, tumor detection
- **Impact**: Demonstrates deep learning in healthcare
- **Location**: `image-analysis-service/` directory
- **Features**: Grad-CAM heatmap generation for model interpretability

## Features

### Core Modules
- **Authentication Module**: JWT-based authentication with role-based access control (RBAC)
- **Patient Management**: Registration, search, medical history tracking
- **Appointment Management**: Booking, rescheduling, cancellation, doctor scheduling
- **Doctor Module**: Patient consultation, diagnosis, prescriptions, treatment notes
- **Nurse Module**: Vital signs recording, patient monitoring, ward assignment
- **Laboratory Module**: Test requests, result uploads, lab reports
- **Pharmacy Module**: Inventory management, medicine dispensing, low stock alerts
- **Billing Module**: Invoice generation, payment processing, receipt printing
- **Ward & Bed Management**: Bed allocation, admission, discharge
- **AI Module**: Disease prediction (ML), drug interaction checking, smart scheduling, health risk prediction, RAG chatbot
- **Reporting Module**: Revenue reports, patient reports, disease statistics, department performance
- **Notification Module**: Email notifications, SMS notifications, appointment reminders
- **Telehealth Module**: Video consultations, real-time communication
- **Payment Module**: Stripe integration, PDF receipt generation

### Security Features
- JWT Authentication
- Role-based permissions (10 user roles)
- Audit logs
- Encrypted passwords (bcrypt)
- Rate limiting
- CORS protection
- Helmet security headers

## Technology Stack

### Frontend
- **React.js** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Shadcn UI** - UI components
- **React Router** - Navigation
- **Axios** - HTTP client
- **Zustand** - State management
- **Recharts** - Data visualization
- **Lucide React** - Icons
- **Socket.io Client** - Real-time communication

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **PostgreSQL** - Database
- **JWT** - Authentication
- **Bcrypt** - Password hashing
- **Nodemailer** - Email service
- **Twilio** - SMS service
- **Stripe** - Payment processing
- **Socket.io** - Real-time WebSocket communication
- **PDFKit** - PDF generation

### Microservices
- **ML Service**: FastAPI + Scikit-Learn (Python)
- **Image Analysis Service**: FastAPI + TensorFlow/Keras (Python)

## Project Structure

```
hospital-management-system/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js          # Database configuration
│   │   ├── controllers/
│   │   │   ├── authController.js    # Authentication logic
│   │   │   ├── patientController.js # Patient management
│   │   │   ├── doctorController.js  # Doctor management
│   │   │   ├── appointmentController.js
│   │   │   ├── aiController.js     # AI services
│   │   │   ├── paymentController.js # Stripe payments
│   │   │   └── telehealthController.js # Video consultations
│   │   ├── middleware/
│   │   │   ├── auth.js              # JWT & RBAC middleware
│   │   │   ├── validation.js        # Request validation
│   │   │   ├── error.js             # Error handling
│   │   │   └── audit.js             # Audit logging
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── patients.js
│   │   │   ├── doctors.js
│   │   │   ├── appointments.js
│   │   │   ├── ai.js
│   │   │   ├── payments.js          # Stripe routes
│   │   │   └── telehealth.js       # Video consultation routes
│   │   ├── services/
│   │   │   ├── aiService.js         # AI implementation
│   │   │   ├── ragService.js        # RAG chatbot
│   │   │   └── socketService.js     # WebSocket service
│   │   ├── utils/
│   │   │   └── response.js          # Response utilities
│   │   └── server.js                # Express server
│   ├── database/
│   │   └── schema.sql               # Database schema
│   ├── receipts/                    # Generated PDF receipts
│   ├── package.json
│   └── .env.example
├── ml-service/                      # ML Disease Prediction Microservice
│   ├── main.py                      # FastAPI application
│   ├── requirements.txt
│   └── README.md
├── image-analysis-service/          # Medical Image Analysis Microservice
│   ├── main.py                      # FastAPI application
│   ├── requirements.txt
│   └── README.md
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Layout.tsx           # Main layout component
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx      # Authentication context
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── PatientsPage.tsx
│   │   │   ├── DoctorsPage.tsx
│   │   │   └── AppointmentsPage.tsx
│   │   ├── services/
│   │   │   └── api.ts               # API client
│   │   ├── lib/
│   │   │   └── utils.ts             # Utility functions
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── tsconfig.json
├── docs/
│   ├── diagrams/
│   │   ├── er-diagram.md
│   │   ├── use-case-diagram.md
│   │   ├── class-diagram.md
│   │   ├── activity-diagram.md
│   │   └── sequence-diagram.md
│   └── api-documentation.md
└── README.md
```

## User Roles

1. **Super Admin** - Full system access
2. **Admin** - Hospital administration
3. **Receptionist** - Front desk operations
4. **Doctor** - Medical consultations
5. **Nurse** - Patient care
6. **Lab Technician** - Laboratory operations
7. **Pharmacist** - Pharmacy operations
8. **Cashier** - Billing operations
9. **Hospital Manager** - Operations management
10. **Patient** - Self-service access

## Installation

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Configure your environment variables in `.env`:
```env
PORT=5000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hospital_management
DB_USER=postgres
DB_PASSWORD=your_password

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_change_this_in_production
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=your_refresh_secret_key_change_this_in_production
JWT_REFRESH_EXPIRE=30d

# Email Configuration (SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_email_password
EMAIL_FROM=noreply@hospital.com

# SMS Configuration (Twilio)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# ML Service Configuration
ML_SERVICE_URL=http://localhost:8000

# Stripe Payment Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# LLM Configuration for RAG Chatbot
LLM_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key
```

5. Set up the PostgreSQL database:
```bash
# Create database
createdb hospital_management

# Run schema
psql -d hospital_management -f database/schema.sql
```

6. Start the backend server:
```bash
npm run dev
```

The backend will run on `http://localhost:5000`

### ML Service Setup (Disease Prediction)

1. Navigate to the ML service directory:
```bash
cd ml-service
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

3. Run the ML service:
```bash
python main.py
```

The ML service will run on `http://localhost:8000`

### Image Analysis Service Setup

1. Navigate to the image analysis service directory:
```bash
cd image-analysis-service
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

3. Run the image analysis service:
```bash
python main.py
```

The image analysis service will run on `http://localhost:8001`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

## Database Schema

The system uses PostgreSQL with the following main tables:
- Users
- Patients
- Doctors
- Nurses
- Appointments
- Vitals
- Diagnoses
- Prescriptions
- LabTests
- LabResults
- Medicines
- Inventory
- Invoices
- Payments
- Admissions
- Beds
- Departments
- Notifications
- AuditLogs

See `backend/database/schema.sql` for the complete schema.

## API Documentation

Complete API documentation is available in `docs/api-documentation.md`.

### Example Endpoints

#### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh access token

#### Patients
- `GET /api/patients` - Get all patients
- `POST /api/patients` - Register new patient
- `GET /api/patients/:id` - Get patient by ID
- `PUT /api/patients/:id` - Update patient

#### AI Module
- `POST /api/ai/predict-disease` - Predict disease from symptoms (uses ML microservice)
- `POST /api/ai/drug-interaction` - Check drug interactions
- `POST /api/ai/health-risk` - Predict health risk
- `POST /api/ai/chatbot` - AI chatbot query (RAG with LLM)

#### Payment Module (Stripe)
- `POST /api/payments/create-intent` - Create Stripe payment intent
- `POST /api/payments/confirm` - Confirm payment
- `GET /api/payments/status/:paymentIntentId` - Get payment status
- `GET /api/payments/receipt/:paymentIntentId` - Download PDF receipt
- `POST /api/payments/refund` - Process refund
- `POST /api/payments/webhook` - Stripe webhook handler

#### Telehealth Module
- `POST /api/telehealth/sessions` - Create video consultation session
- `POST /api/telehealth/sessions/:sessionId/join` - Join video session
- `POST /api/telehealth/sessions/:sessionId/end` - End video session
- `GET /api/telehealth/sessions/:sessionId/status` - Get session status
- `POST /api/telehealth/sessions/:sessionId/signal` - WebRTC signaling

#### ML Service (Python)
- `POST /predict` - Predict disease from symptoms
- `POST /predict-batch` - Batch prediction
- `GET /health` - Health check

#### Image Analysis Service (Python)
- `POST /analyze` - Analyze medical image (X-ray, MRI, CT)
- `GET /health` - Health check

## Usage

### Default Credentials

After setting up the database, you can login with:
- **Email**: superadmin@hospital.com
- **Password**: admin123

**Important**: Change the default password in production!

### Dashboard
After login, you'll be redirected to the dashboard where you can:
- View statistics (total patients, active doctors, appointments, available beds)
- Monitor recent activity
- Access revenue and performance charts

### Patient Management
- Register new patients
- Search and view patient records
- Access medical history
- Update patient information

### Appointment Management
- Book new appointments
- View appointment schedules
- Reschedule or cancel appointments
- Check available time slots

### AI Features
- **Disease Prediction**: Enter symptoms to get ML-powered disease predictions (uses Python microservice)
- **Drug Interaction Check**: Verify medication compatibility
- **Health Risk Assessment**: Evaluate patient health risks
- **Smart Scheduling**: Optimize appointment scheduling
- **AI Chatbot**: Get intelligent answers using RAG with LLM (Gemini/OpenAI)

### Payment Features
- **Stripe Integration**: Secure payment processing with test mode
- **PDF Receipts**: Automatic receipt generation and download
- **Payment Status Tracking**: Real-time payment status updates
- **Refund Processing**: Handle refunds through Stripe

### Telehealth Features
- **Video Consultations**: Real-time video calls between doctors and patients
- **Session Management**: Create, join, and end video sessions
- **WebRTC Signaling**: Peer-to-peer video connection
- **Real-time Communication**: Instant messaging during consultations

### Real-time Features
- **Critical Vitals Alerts**: Instant notifications when vitals exceed thresholds
- **Emergency Calls**: Broadcast emergency alerts to medical staff
- **Staff Chat**: Real-time messaging between hospital staff
- **Live Updates**: Real-time dashboard updates via WebSockets

### Medical Imaging Features
- **Image Analysis**: CNN-based analysis of X-rays, MRIs, and CT scans
- **Pneumonia Detection**: Automated pneumonia detection from chest X-rays
- **Fracture Detection**: Identify bone fractures in X-rays
- **Tumor Detection**: Detect suspicious masses in medical images
- **Heatmap Visualization**: Grad-CAM heatmaps for model interpretability

## Development

### Running Tests
```bash
# Backend
cd backend
npm test

# Frontend
cd frontend
npm test
```

### Building for Production
```bash
# Backend
cd backend
npm run build

# Frontend
cd frontend
npm run build
```

## Security Considerations

1. **Change default credentials** immediately after installation
2. **Use strong JWT secrets** in production
3. **Enable HTTPS** in production
4. **Configure CORS** appropriately for your domain
5. **Regular database backups** - implement automated backup strategy
6. **Keep dependencies updated** - run `npm audit` regularly
7. **Monitor audit logs** for suspicious activity
8. **Implement rate limiting** to prevent abuse
9. **Use environment variables** for sensitive configuration
10. **Enable database SSL** in production

## AI Module Implementation

The AI module currently uses rule-based algorithms. For production use, consider:

1. **Machine Learning Models**: Train models on historical patient data
2. **External APIs**: Integrate with medical AI services (e.g., IBM Watson Health)
3. **Real-time Learning**: Implement feedback loops for continuous improvement
4. **Data Privacy**: Ensure HIPAA/GDPR compliance for patient data

## Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running
- Check database credentials in `.env`
- Ensure database exists: `createdb hospital_management`

### Frontend API Errors
- Verify backend is running on port 5000
- Check CORS configuration
- Ensure JWT token is valid

### Authentication Issues
- Clear browser localStorage
- Verify JWT secrets match between frontend and backend
- Check user account is active in database

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License.

## Support

For support, email support@hospital.com or open an issue in the repository.

## Acknowledgments

- React.js team for the amazing framework
- PostgreSQL community for the robust database
- All open-source contributors who made this project possible
