# REST API Documentation
## Hospital Management System

Base URL: `http://localhost:5000/api`

### Authentication Headers
All protected endpoints require:
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

---

## 1. Authentication Module

### POST /auth/login
Login to the system.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "role": "doctor",
      "firstName": "John",
      "lastName": "Doe"
    }
  }
}
```

### POST /auth/logout
Logout from the system.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

### POST /auth/refresh
Refresh access token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### POST /auth/reset-password
Request password reset.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password reset email sent"
}
```

### POST /auth/change-password
Change user password.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "oldPassword": "oldPassword123",
  "newPassword": "newPassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

### PUT /auth/role/:userId
Change user role (Super Admin, Admin only).

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "role": "admin"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Role updated successfully"
}
```

---

## 2. Patient Management

### GET /patients
Get all patients (with pagination and filters).

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `search`: Search by name, email, phone
- `bloodType`: Filter by blood type

**Response (200):**
```json
{
  "success": true,
  "data": {
    "patients": [
      {
        "id": 1,
        "firstName": "John",
        "lastName": "Doe",
        "dateOfBirth": "1990-01-15",
        "gender": "male",
        "phone": "+1234567890",
        "email": "john@example.com",
        "bloodType": "O+",
        "allergies": "Penicillin",
        "emergencyContactName": "Jane Doe",
        "emergencyContactPhone": "+1234567891"
      }
    ],
    "pagination": {
      "total": 100,
      "page": 1,
      "limit": 10,
      "totalPages": 10
    }
  }
}
```

### GET /patients/:id
Get patient by ID.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "firstName": "John",
    "lastName": "Doe",
    "dateOfBirth": "1990-01-15",
    "gender": "male",
    "phone": "+1234567890",
    "email": "john@example.com",
    "address": "123 Main St",
    "bloodType": "O+",
    "allergies": "Penicillin",
    "emergencyContactName": "Jane Doe",
    "emergencyContactPhone": "+1234567891",
    "insuranceNumber": "INS123456",
    "medicalHistory": "Hypertension",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### POST /patients
Register new patient (Receptionist, Admin only).

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1990-01-15",
  "gender": "male",
  "phone": "+1234567890",
  "email": "john@example.com",
  "address": "123 Main St",
  "bloodType": "O+",
  "allergies": "Penicillin",
  "emergencyContactName": "Jane Doe",
  "emergencyContactPhone": "+1234567891",
  "insuranceNumber": "INS123456",
  "medicalHistory": "Hypertension"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Patient registered successfully",
  "data": {
    "id": 1,
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

### PUT /patients/:id
Update patient information.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "phone": "+1234567890",
  "address": "456 New St"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Patient updated successfully",
  "data": {
    "id": 1,
    "firstName": "John",
    "lastName": "Smith"
  }
}
```

### GET /patients/:id/history
Get patient medical history.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "patient": {
      "id": 1,
      "firstName": "John",
      "lastName": "Doe"
    },
    "diagnoses": [...],
    "prescriptions": [...],
    "labTests": [...],
    "admissions": [...]
  }
}
```

### DELETE /patients/:id
Delete patient (Admin only).

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Patient deleted successfully"
}
```

---

## 3. Appointment Management

### GET /appointments
Get all appointments.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters:**
- `patientId`: Filter by patient
- `doctorId`: Filter by doctor
- `date`: Filter by date
- `status`: Filter by status (scheduled, confirmed, completed, cancelled, rescheduled)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "appointments": [
      {
        "id": 1,
        "patientId": 1,
        "doctorId": 1,
        "appointmentDate": "2024-01-15T10:00:00Z",
        "status": "scheduled",
        "reason": "Regular checkup",
        "notes": "Patient has hypertension"
      }
    ]
  }
}
```

### GET /appointments/:id
Get appointment by ID.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "patientId": 1,
    "doctorId": 1,
    "appointmentDate": "2024-01-15T10:00:00Z",
    "status": "scheduled",
    "reason": "Regular checkup",
    "notes": "Patient has hypertension"
  }
}
```

### POST /appointments
Book new appointment.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "patientId": 1,
  "doctorId": 1,
  "appointmentDate": "2024-01-15T10:00:00Z",
  "reason": "Regular checkup",
  "notes": "Patient has hypertension"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Appointment booked successfully",
  "data": {
    "id": 1,
    "appointmentDate": "2024-01-15T10:00:00Z"
  }
}
```

### PUT /appointments/:id/reschedule
Reschedule appointment.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "newDate": "2024-01-16T10:00:00Z",
  "reason": "Patient requested change"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Appointment rescheduled successfully"
}
```

### PUT /appointments/:id/cancel
Cancel appointment.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "reason": "Patient unable to attend"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Appointment cancelled successfully"
}
```

### GET /appointments/available-slots
Get available appointment slots for a doctor.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters:**
- `doctorId`: Doctor ID (required)
- `date`: Date (required, format: YYYY-MM-DD)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "availableSlots": [
      "09:00",
      "10:00",
      "11:00",
      "14:00",
      "15:00"
    ]
  }
}
```

---

## 4. Doctor Module

### GET /doctors
Get all doctors.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters:**
- `departmentId`: Filter by department
- `specialization`: Filter by specialization
- `isAvailable`: Filter by availability

**Response (200):**
```json
{
  "success": true,
  "data": {
    "doctors": [
      {
        "id": 1,
        "firstName": "Jane",
        "lastName": "Smith",
        "specialization": "Cardiology",
        "phone": "+1234567890",
        "email": "jane@example.com",
        "departmentId": 2,
        "licenseNumber": "DOC123456",
        "qualification": "MD, FACC",
        "experienceYears": 15,
        "consultationFee": 150.00,
        "isAvailable": true
      }
    ]
  }
}
```

### GET /doctors/:id
Get doctor by ID.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "firstName": "Jane",
    "lastName": "Smith",
    "specialization": "Cardiology",
    "phone": "+1234567890",
    "email": "jane@example.com",
    "departmentId": 2,
    "licenseNumber": "DOC123456",
    "qualification": "MD, FACC",
    "experienceYears": 15,
    "consultationFee": 150.00,
    "isAvailable": true
  }
}
```

### POST /doctors
Create new doctor (Admin only).

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "specialization": "Cardiology",
  "phone": "+1234567890",
  "email": "jane@example.com",
  "departmentId": 2,
  "licenseNumber": "DOC123456",
  "qualification": "MD, FACC",
  "experienceYears": 15,
  "consultationFee": 150.00
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Doctor created successfully",
  "data": {
    "id": 1
  }
}
```

### PUT /doctors/:id
Update doctor information (Admin only).

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "consultationFee": 175.00,
  "isAvailable": false
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Doctor updated successfully"
}
```

### DELETE /doctors/:id
Delete doctor (Admin only).

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Doctor deleted successfully"
}
```

### GET /doctors/:id/schedule
Get doctor's schedule.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters:**
- `startDate`: Start date (required)
- `endDate`: End date (required)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "schedule": [
      {
        "date": "2024-01-15",
        "slots": [
          {
            "time": "09:00",
            "status": "available"
          },
          {
            "time": "10:00",
            "status": "booked",
            "appointmentId": 1
          }
        ]
      }
    ]
  }
}
```

---

## 5. Nurse Module

### GET /nurses
Get all nurses.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters:**
- `departmentId`: Filter by department
- `shift`: Filter by shift (morning, evening, night)
- `isAvailable`: Filter by availability

**Response (200):**
```json
{
  "success": true,
  "data": {
    "nurses": [
      {
        "id": 1,
        "firstName": "Mary",
        "lastName": "Johnson",
        "phone": "+1234567890",
        "email": "mary@example.com",
        "departmentId": 1,
        "licenseNumber": "NUR123456",
        "qualification": "BSN",
        "shift": "morning",
        "isAvailable": true
      }
    ]
  }
}
```

### GET /nurses/:id
Get nurse by ID.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "firstName": "Mary",
    "lastName": "Johnson",
    "phone": "+1234567890",
    "email": "mary@example.com",
    "departmentId": 1,
    "licenseNumber": "NUR123456",
    "qualification": "BSN",
    "shift": "morning",
    "isAvailable": true
  }
}
```

### POST /nurses
Create new nurse (Admin only).

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "firstName": "Mary",
  "lastName": "Johnson",
  "phone": "+1234567890",
  "email": "mary@example.com",
  "departmentId": 1,
  "licenseNumber": "NUR123456",
  "qualification": "BSN",
  "shift": "morning"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Nurse created successfully",
  "data": {
    "id": 1
  }
}
```

### PUT /nurses/:id
Update nurse information (Admin only).

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "shift": "evening",
  "isAvailable": false
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Nurse updated successfully"
}
```

---

## 6. Vitals Module

### GET /vitals
Get all vitals records.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters:**
- `patientId`: Filter by patient (required)
- `startDate`: Start date
- `endDate`: End date

**Response (200):**
```json
{
  "success": true,
  "data": {
    "vitals": [
      {
        "id": 1,
        "patientId": 1,
        "nurseId": 1,
        "recordedAt": "2024-01-15T08:00:00Z",
        "temperature": 37.0,
        "bloodPressureSystolic": 120,
        "bloodPressureDiastolic": 80,
        "heartRate": 72,
        "respiratoryRate": 16,
        "oxygenSaturation": 98,
        "weight": 70.5,
        "height": 175,
        "bloodGlucose": 95,
        "notes": "Normal vitals"
      }
    ]
  }
}
```

### POST /vitals
Record patient vitals (Nurse only).

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "patientId": 1,
  "temperature": 37.0,
  "bloodPressureSystolic": 120,
  "bloodPressureDiastolic": 80,
  "heartRate": 72,
  "respiratoryRate": 16,
  "oxygenSaturation": 98,
  "weight": 70.5,
  "height": 175,
  "bloodGlucose": 95,
  "notes": "Normal vitals"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Vitals recorded successfully",
  "data": {
    "id": 1
  }
}
```

---

## 7. Diagnosis Module

### GET /diagnoses
Get all diagnoses.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters:**
- `patientId`: Filter by patient
- `doctorId`: Filter by doctor
- `isChronic`: Filter by chronic conditions

**Response (200):**
```json
{
  "success": true,
  "data": {
    "diagnoses": [
      {
        "id": 1,
        "patientId": 1,
        "doctorId": 1,
        "appointmentId": 1,
        "diagnosisDate": "2024-01-15T10:00:00Z",
        "diseaseName": "Hypertension",
        "icdCode": "I10",
        "severity": "moderate",
        "symptoms": "Headache, dizziness",
        "notes": "Stage 1 hypertension",
        "isChronic": true
      }
    ]
  }
}
```

### POST /diagnoses
Create diagnosis (Doctor only).

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "patientId": 1,
  "doctorId": 1,
  "appointmentId": 1,
  "diseaseName": "Hypertension",
  "icdCode": "I10",
  "severity": "moderate",
  "symptoms": "Headache, dizziness",
  "notes": "Stage 1 hypertension",
  "isChronic": true
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Diagnosis created successfully",
  "data": {
    "id": 1
  }
}
```

---

## 8. Prescription Module

### GET /prescriptions
Get all prescriptions.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters:**
- `patientId`: Filter by patient
- `doctorId`: Filter by doctor
- `isDispensed`: Filter by dispensed status

**Response (200):**
```json
{
  "success": true,
  "data": {
    "prescriptions": [
      {
        "id": 1,
        "patientId": 1,
        "doctorId": 1,
        "diagnosisId": 1,
        "prescribedDate": "2024-01-15T10:00:00Z",
        "medicationName": "Lisinopril",
        "dosage": "10mg",
        "frequency": "Once daily",
        "duration": "30 days",
        "instructions": "Take with food",
        "isDispensed": false
      }
    ]
  }
}
```

### POST /prescriptions
Create prescription (Doctor only).

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "patientId": 1,
  "doctorId": 1,
  "diagnosisId": 1,
  "medicationName": "Lisinopril",
  "dosage": "10mg",
  "frequency": "Once daily",
  "duration": "30 days",
  "instructions": "Take with food"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Prescription created successfully",
  "data": {
    "id": 1
  }
}
```

### PUT /prescriptions/:id/dispense
Mark prescription as dispensed (Pharmacist only).

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Prescription dispensed successfully"
}
```

---

## 9. Laboratory Module

### GET /lab-tests
Get all lab tests.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters:**
- `patientId`: Filter by patient
- `doctorId`: Filter by doctor
- `status`: Filter by status (pending, in_progress, completed, cancelled)
- `priority`: Filter by priority (low, normal, high, urgent)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "labTests": [
      {
        "id": 1,
        "patientId": 1,
        "doctorId": 1,
        "testName": "Complete Blood Count",
        "testType": "Hematology",
        "requestedDate": "2024-01-15T10:00:00Z",
        "status": "pending",
        "priority": "normal",
        "notes": "Routine checkup"
      }
    ]
  }
}
```

### POST /lab-tests
Request lab test (Doctor only).

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "patientId": 1,
  "doctorId": 1,
  "testName": "Complete Blood Count",
  "testType": "Hematology",
  "priority": "normal",
  "notes": "Routine checkup"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Lab test requested successfully",
  "data": {
    "id": 1
  }
}
```

### GET /lab-tests/:id/results
Get lab test results.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "labTest": {
      "id": 1,
      "testName": "Complete Blood Count"
    },
    "results": [
      {
        "id": 1,
        "labTestId": 1,
        "resultDate": "2024-01-15T14:00:00Z",
        "results": "RBC: 4.5, WBC: 7.5, Platelets: 250",
        "referenceRange": "RBC: 4.5-5.5, WBC: 4.5-11.0, Platelets: 150-400",
        "isAbnormal": false,
        "notes": "Normal values"
      }
    ]
  }
}
```

### POST /lab-tests/:id/results
Upload lab test results (Lab Technician only).

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "results": "RBC: 4.5, WBC: 7.5, Platelets: 250",
  "referenceRange": "RBC: 4.5-5.5, WBC: 4.5-11.0, Platelets: 150-400",
  "isAbnormal": false,
  "notes": "Normal values",
  "attachmentUrl": "https://example.com/report.pdf"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Lab results uploaded successfully",
  "data": {
    "id": 1
  }
}
```

---

## 10. Pharmacy Module

### GET /medicines
Get all medicines.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters:**
- `category`: Filter by category
- `name`: Search by name

**Response (200):**
```json
{
  "success": true,
  "data": {
    "medicines": [
      {
        "id": 1,
        "name": "Lisinopril",
        "genericName": "Lisinopril",
        "manufacturer": "PharmaCorp",
        "category": "Antihypertensive",
        "description": "ACE inhibitor",
        "unit": "tablet",
        "unitPrice": 5.00,
        "expiryDate": "2025-12-31"
      }
    ]
  }
}
```

### POST /medicines
Add new medicine (Pharmacist, Admin only).

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "name": "Lisinopril",
  "genericName": "Lisinopril",
  "manufacturer": "PharmaCorp",
  "category": "Antihypertensive",
  "description": "ACE inhibitor",
  "unit": "tablet",
  "unitPrice": 5.00,
  "expiryDate": "2025-12-31"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Medicine added successfully",
  "data": {
    "id": 1
  }
}
```

### GET /inventory
Get inventory status.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "inventory": [
      {
        "id": 1,
        "medicineId": 1,
        "quantity": 500,
        "reorderLevel": 50,
        "batchNumber": "BATCH123456",
        "expiryDate": "2025-12-31",
        "location": "Shelf A1"
      }
    ]
  }
}
```

### PUT /inventory/:id
Update inventory (Pharmacist only).

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "quantity": 450,
  "notes": "Dispensed 50 units"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Inventory updated successfully"
}
```

### GET /inventory/low-stock
Get low stock alerts.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "lowStockItems": [
      {
        "medicineId": 1,
        "name": "Lisinopril",
        "currentQuantity": 30,
        "reorderLevel": 50
      }
    ]
  }
}
```

---

## 11. Ward & Bed Management

### GET /beds
Get all beds.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters:**
- `ward`: Filter by ward
- `bedType`: Filter by bed type
- `status`: Filter by status (available, occupied, maintenance, reserved)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "beds": [
      {
        "id": 1,
        "ward": "General Ward A",
        "bedNumber": "A101",
        "bedType": "general",
        "status": "available",
        "hourlyRate": 10.00,
        "dailyRate": 200.00
      }
    ]
  }
}
```

### POST /beds
Add new bed (Admin, Manager only).

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "ward": "General Ward A",
  "bedNumber": "A101",
  "bedType": "general",
  "hourlyRate": 10.00,
  "dailyRate": 200.00
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Bed added successfully",
  "data": {
    "id": 1
  }
}
```

### PUT /beds/:id
Update bed status.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "status": "occupied"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Bed updated successfully"
}
```

### GET /admissions
Get all admissions.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters:**
- `patientId`: Filter by patient
- `status`: Filter by status (admitted, discharged, transferred)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "admissions": [
      {
        "id": 1,
        "patientId": 1,
        "bedId": 1,
        "admittingDoctorId": 1,
        "admissionDate": "2024-01-15T10:00:00Z",
        "dischargeDate": null,
        "status": "admitted",
        "diagnosis": "Pneumonia",
        "treatmentPlan": "Antibiotics, rest",
        "totalCharges": 0.00
      }
    ]
  }
}
```

### POST /admissions
Admit patient (Doctor, Receptionist only).

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "patientId": 1,
  "bedId": 1,
  "admittingDoctorId": 1,
  "diagnosis": "Pneumonia",
  "treatmentPlan": "Antibiotics, rest"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Patient admitted successfully",
  "data": {
    "id": 1
  }
}
```

### PUT /admissions/:id/discharge
Discharge patient (Doctor only).

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "dischargeSummary": "Patient recovered successfully",
  "followUpInstructions": "Complete antibiotic course"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Patient discharged successfully"
}
```

---

## 12. Billing Module

### GET /invoices
Get all invoices.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters:**
- `patientId`: Filter by patient
- `status`: Filter by status (pending, partial, paid, overdue, cancelled)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "invoices": [
      {
        "id": 1,
        "patientId": 1,
        "admissionId": 1,
        "invoiceDate": "2024-01-20T10:00:00Z",
        "dueDate": "2024-02-20T10:00:00Z",
        "subtotal": 1500.00,
        "tax": 150.00,
        "discount": 0.00,
        "totalAmount": 1650.00,
        "status": "pending"
      }
    ]
  }
}
```

### POST /invoices
Generate invoice (Cashier only).

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "patientId": 1,
  "admissionId": 1,
  "items": [
    {
      "description": "Room charges (5 days)",
      "amount": 1000.00
    },
    {
      "description": "Consultation fees",
      "amount": 500.00
    }
  ],
  "discount": 0.00
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Invoice generated successfully",
  "data": {
    "id": 1,
    "totalAmount": 1650.00
  }
}
```

### GET /invoices/:id/payments
Get invoice payments.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "payments": [
      {
        "id": 1,
        "invoiceId": 1,
        "paymentDate": "2024-01-20T10:00:00Z",
        "amount": 1650.00,
        "paymentMethod": "card",
        "transactionId": "TXN123456"
      }
    ]
  }
}
```

### POST /payments
Process payment (Cashier only).

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "invoiceId": 1,
  "amount": 1650.00,
  "paymentMethod": "card",
  "transactionId": "TXN123456"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Payment processed successfully",
  "data": {
    "id": 1
  }
}
```

---

## 13. AI Module

### POST /ai/predict-disease
Predict disease based on symptoms.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "patientId": 1,
  "symptoms": ["headache", "fever", "cough"],
  "vitals": {
    "temperature": 38.5,
    "bloodPressureSystolic": 120,
    "bloodPressureDiastolic": 80
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "predictions": [
      {
        "disease": "Influenza",
        "confidence": 0.85,
        "severity": "moderate"
      },
      {
        "disease": "Common Cold",
        "confidence": 0.65,
        "severity": "mild"
      }
    ]
  }
}
```

### POST /ai/drug-interaction
Check drug interactions.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "medications": ["Lisinopril", "Ibuprofen", "Aspirin"]
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "hasInteractions": true,
    "interactions": [
      {
        "drug1": "Lisinopril",
        "drug2": "Ibuprofen",
        "severity": "moderate",
        "description": "May reduce effectiveness of blood pressure medication"
      }
    ]
  }
}
```

### POST /ai/health-risk
Predict health risk.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "patientId": 1
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "riskScore": 0.72,
    "riskLevel": "high",
    "riskFactors": [
      "Hypertension",
      "Age > 60",
      "Family history of heart disease"
    ],
    "recommendations": [
      "Regular blood pressure monitoring",
      "Dietary modifications",
      "Exercise program"
    ]
  }
}
```

### POST /ai/optimize-schedule
Optimize appointment scheduling.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "doctorId": 1,
  "date": "2024-01-15",
  "appointments": [
    {
      "patientId": 1,
      "duration": 30,
      "priority": "high"
    }
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "optimizedSchedule": [
      {
        "time": "09:00",
        "patientId": 1,
        "duration": 30
      }
    ]
  }
}
```

### POST /ai/chatbot
AI chatbot query.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "query": "What are the symptoms of flu?",
  "context": "patient"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "response": "Common symptoms of flu include fever, cough, sore throat, body aches, fatigue, and headache. If you experience severe symptoms, please consult a doctor.",
    "sources": ["CDC", "WHO"]
  }
}
```

---

## 14. Notification Module

### GET /notifications
Get user notifications.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters:**
- `isRead`: Filter by read status

**Response (200):**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": 1,
        "type": "appointment",
        "title": "Appointment Reminder",
        "message": "You have an appointment tomorrow at 10:00 AM",
        "isRead": false,
        "createdAt": "2024-01-14T10:00:00Z"
      }
    ]
  }
}
```

### PUT /notifications/:id/read
Mark notification as read.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

### PUT /notifications/:id/unread
Mark notification as unread.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Notification marked as unread"
}
```

---

## 15. Reporting Module

### GET /reports/revenue
Generate revenue report.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters:**
- `startDate`: Start date (required)
- `endDate`: End date (required)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "totalRevenue": 150000.00,
    "totalPayments": 145000.00,
    "pendingAmount": 5000.00,
    "breakdown": {
      "consultations": 50000.00,
      "labTests": 30000.00,
      "medicines": 40000.00,
      "roomCharges": 30000.00
    }
  }
}
```

### GET /reports/patients
Generate patient statistics report.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters:**
- `startDate`: Start date (required)
- `endDate`: End date (required)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "totalPatients": 500,
    "newPatients": 50,
    "returningPatients": 450,
    "byDepartment": {
      "Cardiology": 100,
      "Neurology": 80,
      "Orthopedics": 120
    }
  }
}
```

### GET /reports/diseases
Generate disease statistics report.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters:**
- `startDate`: Start date (required)
- `endDate`: End date (required)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "topDiseases": [
      {
        "disease": "Hypertension",
        "count": 150,
        "percentage": 30
      },
      {
        "disease": "Diabetes",
        "count": 100,
        "percentage": 20
      }
    ]
  }
}
```

### GET /reports/department-performance
Generate department performance report.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters:**
- `startDate`: Start date (required)
- `endDate`: End date (required)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "departments": [
      {
        "name": "Cardiology",
        "totalPatients": 100,
        "totalRevenue": 50000.00,
        "averageWaitTime": 15,
        "patientSatisfaction": 4.5
      }
    ]
  }
}
```

---

## 16. Admin Module

### GET /admin/users
Get all users (Super Admin, Admin only).

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters:**
- `role`: Filter by role
- `isActive`: Filter by active status

**Response (200):**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": 1,
        "email": "user@example.com",
        "role": "doctor",
        "isActive": true,
        "lastLogin": "2024-01-15T10:00:00Z",
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

### PUT /admin/users/:id/activate
Activate user account (Super Admin, Admin only).

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response (200):**
```json
{
  "success": true,
  "message": "User activated successfully"
}
```

### PUT /admin/users/:id/deactivate
Deactivate user account (Super Admin, Admin only).

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response (200):**
```json
{
  "success": true,
  "message": "User deactivated successfully"
}
```

### GET /admin/audit-logs
Get audit logs (Super Admin only).

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters:**
- `userId`: Filter by user
- `action`: Filter by action
- `startDate`: Start date
- `endDate`: End date

**Response (200):**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": 1,
        "userId": 1,
        "action": "UPDATE_PATIENT",
        "entityType": "Patient",
        "entityId": 1,
        "oldValues": {"firstName": "John"},
        "newValues": {"firstName": "Jane"},
        "ipAddress": "192.168.1.1",
        "timestamp": "2024-01-15T10:00:00Z"
      }
    ]
  }
}
```

### GET /admin/departments
Get all departments (Super Admin, Admin only).

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "departments": [
      {
        "id": 1,
        "name": "Cardiology",
        "description": "Heart and cardiovascular care",
        "headDoctorId": 1
      }
    ]
  }
}
```

### POST /admin/departments
Create new department (Super Admin only).

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Request Body:**
```json
{
  "name": "Neurology",
  "description": "Brain and nervous system care",
  "headDoctorId": 2
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Department created successfully",
  "data": {
    "id": 2
  }
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Unauthorized - Invalid or missing token"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Forbidden - You don't have permission to access this resource"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Resource not found"
}
```

### 409 Conflict
```json
{
  "success": false,
  "message": "Resource already exists"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error",
  "error": "Error details"
}
```

---

## Rate Limiting

- **Default**: 100 requests per 15 minutes per IP
- **Authenticated**: 1000 requests per 15 minutes per user

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642234567
```
