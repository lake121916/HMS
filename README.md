# Alem Ketema Enat General Hospital Management System (AKEH-HMS)

An enterprise-grade, full-stack Hospital Management System built for **Alem Ketema Enat General Hospital**, featuring modern healthcare ergonomics, AI-powered clinical decision support, Outpatient Department (OPD) queue orchestration, cryptographic SHA-256 patient QR wristbands, authoritative staff shift duty tracking, and multi-channel payment processing (TeleBirr, CBE Birr, Stripe).

🚀 **Live Production Deployment**: [https://alem-hms.vercel.app](https://alem-hms.vercel.app)

---

## 🌟 Key Architecture & Enterprise Healthcare Features

### 1. **Unified Global Navigation & Responsive Shell** 🧭
- **Single Source of Truth**: Encapsulated within `GlobalNavigation.tsx` (controlled by user role and viewport size).
- **Role-Governed Access**: Dynamic navigation hierarchy for 10 distinct hospital roles (Super Admin, Admin, Receptionist, Doctor, Nurse, Lab Tech, Pharmacist, Cashier, Hospital Manager, Patient).
- **Dynamic Workload Badges**: Real-time counter pills showing waiting queues for Triage, Doctor consults, Lab worklists, Pharmacy dispensing, and Cashier invoices.
- **Desktop Sidebar (`>= 1024px`)**: Collapsible/expandable sidebar (`w-64` / `w-18`), brand emblem, active cyan glow indicators, and accordion governance menus.
- **Top Bar Omni-Tools**: Quick Omnisearch (`Ctrl+K`), instant QR camera launcher, authoritative duty switch chip, bilingual toggle (English / Amharic `አማ`), theme settings, and alerts.
- **Mobile Touch Dock (`< 1024px`)**: Fixed 5-target thumb dock (`Menu`, `Workbench`, Center Elevated `Scan QR`, `Queue`, `Duty Status`).

### 2. **Master Midnight Navy Design Language** 🎨
- **Visual Identity**: Deep midnight navy background (`#070e1e` / `#0a1329`), cyan/teal accents (`#06b6d4`, `#14b8a6`), subtle translucent card borders (`border-cyan-500/20`), and gradient telemetry cards.
- **Dual-View Data Presentations**: Desktop high-density data tables automatically transform into touch-friendly expandable cards on mobile devices (< 768px).
- **Tested Across Viewports**: 320px, 360px, 375px, 390px, 414px, 430px, 768px, 1024px, 1280px, 1440px, and 1920px without horizontal scroll bleed.

### 3. **OPD Command Center & Real-Time Queue Management** 🏥
- **Executive Telemetry**: Total patients today, waiting, in-triage, waiting for doctor, in-consultation, completed, cancelled, emergency referrals, and average wait time metrics.
- **Dynamic Token Management**: Sequential alphanumeric tokens (`A-001`, `U-001`, `E-001`) with automatic calling counter voice announcements.
- **Queue Operations**: Call next, recall skipped patients, skip with configurable grace windows, and department transfers.
- **Public Waitroom Display Feed**: High-contrast, audio-chime enabled screen for hospital waiting rooms (`/opd/display`).

### 4. **Patient Identification & Cryptographic QR Wristbands** 🔐
- **Probabilistic Duplicate Detection**: Multi-factor phonetic matching (Name, DOB, Phone, Kebele/National ID) during registration.
- **Cryptographic Wristbands**: QR payloads signed with SHA-256 HMAC tokens preventing patient identity spoofing.
- **Bedside Two-Identifier Safety Checks**: Point-of-care verification (Name + MRN/DOB) mandated prior to specimen collection, drug dispensing, or consultation.
- **Emergency Unidentified Intake**: Trauma protocols for unconscious patients with auto-generated emergency IDs (`TRAUMA-M-001`).

### 5. **Authoritative Staff Shift Duty Tracking** ⏱️
- **Real-Time Duty Switch**: Healthcare workers toggle duty status via the navigation bar, updating departmental capacity.
- **Active Duty Gating**: Automated routing rules prevent assigning queue tickets to off-duty physicians.
- **Shift Handover Reports**: Structured documentation of critical patient watchlists, pending lab orders, and resuscitation notes passed to incoming staff.

### 6. **Clinical Decision Support System (CDSS) & Auditable Addenda** 🩺
- **Comprehensive Patient Chart**: Unified view of history of present illness, physical exams, vitals trends, ICD-10 diagnostic coding, and prescriptions.
- **Real-Time Drug Interaction & Allergy Alerts**: Cross-checks prescribed medications against patient allergy history and drug-drug safety databases.
- **Immutable Encounter Finalization**: Consultation records lock upon completion; post-finalization corrections are recorded as append-only auditable addenda with author ID and timestamp.

### 7. **Multi-Channel Cashier POS & Ethiopian Mobile Payments** 💳
- **Local Integrations**: TeleBirr USSD / API reference validation and Commercial Bank of Ethiopia (CBE Birr) mobile payment settlement.
- **Card & Cash Processing**: Stripe payment gateway integration with PDF receipts and physical cash change calculation.
- **Cashier Shifts & Z-Reports**: Daily opening float, continuous transaction ledger, reconciliation, and supervisory handover review.

### 8. **Advanced Capstone AI Microservices** 🤖
- **ML Disease Prediction**: FastAPI + Scikit-Learn Random Forest symptom classifier (`ml-service/`).
- **Medical Image Analysis**: FastAPI + TensorFlow ResNet50 for chest X-ray and CT imaging analysis with Grad-CAM heatmaps (`image-analysis-service/`).
- **RAG Knowledge Chatbot**: Retrieval-Augmented Generation with Gemini & OpenAI for patient assistance (`backend/src/services/ragService.js`).
- **Telehealth Video Consultations**: WebRTC peer-to-peer video consultations with Socket.io signaling.

---

## Features

### Core Modules
- **Authentication Module**: JWT-based authentication with role-based access control (RBAC)
- **Patient Management & Duplicate Detection**: Registration, search, probabilistic deduplication, medical history tracking
- **OPD Queue & Command Center**: Real-time queue tickets, calling counters, waiting-room display, department transfers
- **Doctor Consultation & CDSS**: Unified patient chart, ICD-10 coding, drug-allergy alerts, locked encounters, auditable addenda
- **Nurse & Triage Module**: Vital signs recording, ESI acuity categorization, patient monitoring, critical vitals broadcast
- **Laboratory Module**: Test requests, specimen collection, result uploads, critical value alerts
- **Pharmacy Module**: FEFO batch tracking, inventory management, medicine dispensing, low stock alerts
- **Cashier & Billing Module**: Multi-currency invoices, TeleBirr, CBE Birr, Stripe, POS receipts, shift Z-reports
- **Ward & Bed Management**: Interactive bed occupancy grid, admissions, transfers, discharge summaries
- **Staff Shifts & Duty System**: Active clock-in/out gating, department roster tracking, clinical handover summaries
- **AI Module**: Disease prediction (ML), medical image analysis (CNN), drug interaction checking, RAG chatbot
- **Reporting Module**: Daily/monthly OPD reports, revenue telemetry, disease incidence statistics
- **Notification Module**: Socket.io emergency alerts, email notifications, SMS reminders
- **Telehealth Module**: WebRTC video consultations, real-time doctor-patient communication

### Security & Compliance Features
- JWT Authentication with Refresh Tokens
- Strict Role-Based Access Control (RBAC across 10 user roles)
- Cryptographic SHA-256 HMAC Patient QR Wristbands
- Bedside Two-Identifier Patient Verification & Mismatch Logging
- Immutable Finalized Clinical Records & Auditable Append-Only Addenda
- Rate Limiting, Helmet Security Headers, CORS, and SQL Injection Prevention
- Comprehensive Audit Trail for Patient Records, QR Scans, and Billing Transactions

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

### Workflow Foundations

The current implementation also includes:
- A patient self-service portal at `/patient-portal` for appointments, diagnoses, lab results, prescriptions, invoices, and notifications.
- Server-side ownership checks for patient appointment reads, booking, rescheduling, and cancellation.
- Clinical encounters, workflow status history, structured referrals, and persistent emergency triage queues.
- Appointment reminders with in-app delivery and optional Twilio SMS delivery when Twilio environment variables are configured.
- Read-only FHIR R4 mappings for `Patient` and `Appointment` under `/api/fhir/R4`.

For an existing database, apply the new workflow migration from the backend directory:
```bash
npm run db:migrate
```

The migration adds the workflow tables and status columns without removing existing data. Fresh installations can continue using `database/schema.sql`.

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
