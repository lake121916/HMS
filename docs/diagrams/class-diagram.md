# Class Diagram
## Hospital Management System

### Backend Classes

```
┌─────────────────────────────────────────────────────────────────┐
│                        BaseController                           │
├─────────────────────────────────────────────────────────────────┤
│ + sendSuccess(data: any, message?: string): Response           │
│ + sendError(error: any, statusCode?: number): Response          │
│ + handleAsync(fn: Function): Function                          │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼────────┐   ┌────────▼────────┐   ┌────────▼────────┐
│AuthController │   │PatientController│   │DoctorController │
├───────────────┤   ├─────────────────┤   ├─────────────────┤
│+ login()       │   │+ register()     │   │+ getDoctors()   │
│+ logout()      │   │+ update()       │   │+ getDoctorById()│
│+ resetPassword()│ │+ search()        │   │+ createDoctor() │
│+ refreshToken()│ │+ getPatientById() │   │+ updateDoctor() │
│+ changeRole()  │   │+ getHistory()   │   │+ deleteDoctor() │
└───────────────┘   └─────────────────┘   └─────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        BaseModel                                │
├─────────────────────────────────────────────────────────────────┤
│ - id: number                                                    │
│ - createdAt: Date                                               │
│ - updatedAt: Date                                               │
│ + toJSON(): object                                              │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼────────┐   ┌────────▼────────┐   ┌────────▼────────┐
│      User       │   │     Patient     │   │     Doctor      │
├───────────────┤   ├─────────────────┤   ├─────────────────┤
│- email: string │   │- userId: number │   │- userId: number │
│- passwordHash  │   │- firstName: str │   │- firstName: str │
│- role: Role    │   │- lastName: str  │   │- lastName: str  │
│- isActive: bool│   │- dob: Date      │   │- specialization │
│- lastLogin:Date│   │- gender: Gender │   │- departmentId   │
└───────────────┘   │- phone: string  │   │- licenseNumber  │
                    │- email: string  │   │- qualification  │
                    │- address: string│   │- experienceYears│
                    │- bloodType: str │   │- consultationFee│
                    │- allergies: str │   │- isAvailable:   │
                    │- emergencyContact│ │  bool            │
                    │- insuranceNum   │   └─────────────────┘
                    │- medicalHistory  │
                    └─────────────────┘

┌────────────────┐   ┌────────────────┐   ┌────────────────┐
│     Nurse      │   │  Appointment    │   │     Vitals     │
├────────────────┤   ├────────────────┤   ├────────────────┤
│- userId: number│   │- patientId: num │   │- patientId: num │
│- firstName: str│   │- doctorId: num │   │- nurseId: number│
│- lastName: str │   │- appointmentDate│  │- recordedAt:Date│
│- phone: string │   │- status: Status │   │- temperature:  │
│- email: string │   │- reason: string │   │  decimal       │
│- departmentId  │   │- notes: string │   │- bloodPressure: │
│- licenseNumber │   └────────────────┘   │  {systolic,     │
│- qualification │                        │   diastolic}    │
│- shift: Shift  │                        │- heartRate: int │
│- isAvailable   │                        │- respiratoryRate│
└────────────────┘                        │- oxygenSaturation│
                                          │- weight: decimal │
                                          │- height: decimal │
                                          │- bloodGlucose    │
                                          └────────────────┘

┌────────────────┐   ┌────────────────┐   ┌────────────────┐
│   Diagnosis    │   │  Prescription   │   │    LabTest      │
├────────────────┤   ├────────────────┤   ├────────────────┤
│- patientId: num│   │- patientId: num │   │- patientId: num │
│- doctorId: num │   │- doctorId: num │   │- doctorId: num  │
│- appointmentId │   │- diagnosisId:   │   │- testName: str  │
│- diagnosisDate │   │  number         │   │- testType: str  │
│- diseaseName   │   │- prescribedDate │   │- requestedDate │
│- icdCode: str  │   │- medicationName │   │- status: Status│
│- severity:     │   │- dosage: string │   │- priority:     │
│  Severity      │   │- frequency: str │   │  Priority      │
│- symptoms: str │   │- duration: str  │   │- notes: string  │
│- notes: string │   │- instructions   │   └────────────────┘
│- isChronic:    │   │- isDispensed:   │
│  bool          │   │  bool           │
└────────────────┘   └────────────────┘

┌────────────────┐   ┌────────────────┐   ┌────────────────┐
│   LabResult    │   │    Medicine     │   │   Inventory     │
├────────────────┤   ├────────────────┤   ├────────────────┤
│- labTestId: num│   │- name: string  │   │- medicineId: num│
│- technicianId │   │- genericName:  │   │- quantity: int  │
│- resultDate    │   │  string         │   │- reorderLevel:  │
│- results: text │   │- manufacturer   │   │  int           │
│- referenceRange│   │- category: str  │   │- batchNumber:  │
│- isAbnormal:   │   │- description    │   │  string        │
│  bool          │   │- unit: string   │   │- expiryDate:   │
│- notes: string │   │- unitPrice: dec │   │  Date          │
│- attachmentUrl │   │- expiryDate:    │   │- location: str  │
└────────────────┘   │- storageCond    │   └────────────────┘
                    │- sideEffects    │
                    │- contraindications│
                    └────────────────┘

┌────────────────┐   ┌────────────────┐   ┌────────────────┐
│      Bed       │   │   Admission    │   │    Invoice      │
├────────────────┤   ├────────────────┤   ├────────────────┤
│- ward: string  │   │- patientId: num │   │- patientId: num│
│- bedNumber: str│   │- bedId: number │   │- admissionId:  │
│- bedType:      │   │- admittingDocId│   │  number         │
│  BedType       │   │- admissionDate │   │- invoiceDate   │
│- status: Status│   │- dischargeDate │   │- dueDate: Date  │
│- hourlyRate:   │   │- status: Status │   │- subtotal: dec │
│  decimal       │   │- diagnosis: str │   │- tax: decimal  │
│- dailyRate:    │   │- treatmentPlan  │   │- discount: dec │
│  decimal       │   │- dischargeSum   │   │- totalAmount   │
└────────────────┘   │- totalCharges   │   │- status: Status│
                    └────────────────┘   └────────────────┘

┌────────────────┐   ┌────────────────┐   ┌────────────────┐
│    Payment     │   │ Notification   │   │   AuditLog      │
├────────────────┤   ├────────────────┤   ├────────────────┤
│- invoiceId: num│   │- userId: number│   │- userId: number│
│- paymentDate   │   │- patientId: num│   │- action: string│
│- amount: dec   │   │- type: NotifType│  │- entityType:   │
│- paymentMethod │   │- title: string │   │  string        │
│- transactionId │   │- message: text │   │- entityId: num │
│- receivedBy:   │   │- isRead: bool  │   │- oldValues:    │
│  number        │   │- sentEmail:    │   │  JSON          │
│- notes: string │   │  bool          │   │- newValues:    │
└────────────────┘   │- sentSMS: bool  │   │  JSON          │
                    └────────────────┘   │- ipAddress: str │
                                         │- userAgent: str │
                                         └────────────────┘
```

### Service Classes

```
┌─────────────────────────────────────────────────────────────────┐
│                    AuthService                                   │
├─────────────────────────────────────────────────────────────────┤
│ + login(email, password): Promise<Token>                         │
│ + logout(token): Promise<void>                                   │
│ + verifyToken(token): Promise<User>                              │
│ + refreshToken(refreshToken): Promise<Token>                     │
│ + resetPassword(email): Promise<void>                            │
│ + changePassword(userId, oldPass, newPass): Promise<void>       │
│ + hashPassword(password): Promise<string>                        │
│ + comparePassword(password, hash): Promise<boolean>             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  PatientService                                  │
├─────────────────────────────────────────────────────────────────┤
│ + register(patientData): Promise<Patient>                         │
│ + update(id, data): Promise<Patient>                              │
│ + search(query): Promise<Patient[]>                              │
│ + getById(id): Promise<Patient>                                  │
│ + getMedicalHistory(id): Promise<MedicalHistory[]>               │
│ + delete(id): Promise<void>                                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                 AppointmentService                               │
├─────────────────────────────────────────────────────────────────┤
│ + book(appointmentData): Promise<Appointment>                     │
│ + reschedule(id, newDate): Promise<Appointment>                  │
│ + cancel(id): Promise<void>                                       │
│ + getByPatient(patientId): Promise<Appointment[]>                │
│ + getByDoctor(doctorId): Promise<Appointment[]>                  │
│ + getAvailableSlots(doctorId, date): Promise<TimeSlot[]>         │
│ + confirm(id): Promise<Appointment>                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    DoctorService                                  │
├─────────────────────────────────────────────────────────────────┤
│ + getDoctors(filters): Promise<Doctor[]>                         │
│ + getById(id): Promise<Doctor>                                    │
│ + create(doctorData): Promise<Doctor>                            │
│ + update(id, data): Promise<Doctor>                              │
│ + delete(id): Promise<void>                                      │
│ + getSchedule(doctorId): Promise<Schedule[]>                      │
│ + setAvailability(doctorId, slots): Promise<void>                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    LabService                                     │
├─────────────────────────────────────────────────────────────────┤
│ + requestTest(testData): Promise<LabTest>                         │
│ + uploadResult(testId, resultData): Promise<LabResult>            │
│ + getResults(patientId): Promise<LabResult[]>                     │
│ + generateReport(testId): Promise<Report>                        │
│ + updateStatus(testId, status): Promise<void>                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  PharmacyService                                 │
├─────────────────────────────────────────────────────────────────┤
│ + getInventory(): Promise<Inventory[]>                           │
│ + updateStock(medicineId, quantity): Promise<void>                │
│ + dispense(prescriptionId): Promise<void>                        │
│ + checkLowStock(): Promise<Medicine[]>                           │
│ + addMedicine(medicineData): Promise<Medicine>                   │
│ + checkDrugInteractions(medicines): Promise<Interaction[]>       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  BillingService                                  │
├─────────────────────────────────────────────────────────────────┤
│ + generateInvoice(patientId, items): Promise<Invoice>             │
│ + processPayment(invoiceId, paymentData): Promise<Payment>       │
│ + printReceipt(paymentId): Promise<Receipt>                      │
│ + getPatientPayments(patientId): Promise<Payment[]>              │
│ + calculateTotal(items): Promise<Total>                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  NotificationService                              │
├─────────────────────────────────────────────────────────────────┤
│ + sendNotification(userId, notification): Promise<void>          │
│ + sendEmail(to, subject, body): Promise<void>                     │
│ + sendSMS(to, message): Promise<void>                            │
│ + sendAppointmentReminder(appointmentId): Promise<void>          │
│ + markAsRead(notificationId): Promise<void>                       │
│ + getUserNotifications(userId): Promise<Notification[]>          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  AIService                                       │
├─────────────────────────────────────────────────────────────────┤
│ + predictDisease(symptoms): Promise<Prediction>                   │
│ + checkDrugInteractions(medicines): Promise<Interaction[]>        │
│ + predictHealthRisk(patientData): Promise<RiskAssessment>          │
│ + optimizeSchedule(doctorId, date): Promise<OptimizedSchedule>    │
│ + chatbotQuery(query): Promise<Response>                          │
│ + generateAlerts(): Promise<Alert[]>                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  ReportService                                   │
├─────────────────────────────────────────────────────────────────┤
│ + generateRevenueReport(period): Promise<RevenueReport>           │
│ + generatePatientReport(period): Promise<PatientReport>           │
│ + generateDiseaseStatistics(period): Promise<DiseaseStats>         │
│ + generateDepartmentPerformance(period): Promise<DeptPerformance> │
│ + exportReport(reportId, format): Promise<File>                   │
└─────────────────────────────────────────────────────────────────┘
```

### Middleware Classes

```
┌─────────────────────────────────────────────────────────────────┐
│                  AuthMiddleware                                  │
├─────────────────────────────────────────────────────────────────┤
│ - requiredRoles: Role[]                                          │
│ + authenticate(req, res, next): void                             │
│ + authorize(roles): Function                                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  ValidationMiddleware                            │
├─────────────────────────────────────────────────────────────────┤
│ + validate(schema): Function                                     │
│ + validateBody(req, res, next): void                             │
│ + validateParams(req, res, next): void                           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  ErrorMiddleware                                 │
├─────────────────────────────────────────────────────────────────┤
│ + handleError(err, req, res, next): void                         │
│ + notFound(req, res): void                                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  AuditMiddleware                                 │
├─────────────────────────────────────────────────────────────────┤
│ + logAction(req, res, next): void                                │
│ + logChange(entity, oldValues, newValues): void                  │
└─────────────────────────────────────────────────────────────────┘
```

### Frontend Classes (React Components)

```
┌─────────────────────────────────────────────────────────────────┐
│                       App                                         │
├─────────────────────────────────────────────────────────────────┤
│ - state: { user: User, theme: Theme }                            │
│ + render(): JSX                                                  │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼────────┐   ┌────────▼────────┐   ┌────────▼────────┐
│   Layout       │   │   AuthProvider │   │  ThemeProvider │
├───────────────┤   ├─────────────────┤   ├─────────────────┤
│- children     │   │- user: User     │   │- theme: Theme   │
│- sidebar      │   │- login()        │   │- toggleTheme()  │
│- header       │   │- logout()       │   └─────────────────┘
└───────────────┘   │- isAuthenticated│
                    │- loading        │
                    └─────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    BaseComponent                                 │
├─────────────────────────────────────────────────────────────────┤
│ - loading: boolean                                               │
│ - error: Error                                                   │
│ + setLoading(state): void                                        │
│ + setError(error): void                                          │
│ + handleAsync(fn): Promise<void>                                 │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼────────┐   ┌────────▼────────┐   ┌────────▼────────┐
│  LoginPage    │   │ DashboardPage   │   │PatientPage     │
├───────────────┤   ├─────────────────┤   ├─────────────────┤
│+ login()      │   │+ loadData()     │   │+ loadPatients() │
│+ forgotPassword│ │+ renderStats()   │   │+ searchPatient()│
└───────────────┘   │+ renderCharts()  │   │+ registerPatient│
                    └─────────────────┘   │+ updatePatient() │
                                          └─────────────────┘

┌────────────────┐   ┌────────────────┐   ┌────────────────┐
│DoctorPage      │   │AppointmentPage │   │LabPage         │
├────────────────┤   ├────────────────┤   ├────────────────┤
│+ loadDoctors() │   │+ loadAppointments│ │+ loadTests()   │
│+ createDoctor()│ │+ bookAppointment()│ │+ uploadResult() │
│+ updateDoctor()│ │+ reschedule()    │   │+ generateReport()│
└────────────────┘   └────────────────┘   └────────────────┘

┌────────────────┐   ┌────────────────┐   ┌────────────────┐
│PharmacyPage    │   │BillingPage     │   │AIPage          │
├────────────────┤   ├────────────────┤   ├────────────────┤
│+ loadInventory()│ │+ loadInvoices() │   │+ predictDisease()│
│+ dispense()    │   │+ processPayment()│ │+ chatbot()      │
│+ checkStock()  │   │+ printReceipt() │   │+ drugCheck()   │
└────────────────┘   └────────────────┘   └────────────────┘
```

### Utility Classes

```
┌─────────────────────────────────────────────────────────────────┐
│                  DatabaseConfig                                  │
├─────────────────────────────────────────────────────────────────┤
│ - pool: Pool                                                     │
│ + connect(): Promise<Connection>                                │
│ + query(sql, params): Promise<Result>                            │
│ + transaction(transactionFn): Promise<void>                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  JWTUtils                                        │
├─────────────────────────────────────────────────────────────────┤
│ + generateToken(payload): string                                │
│ + verifyToken(token): Payload                                    │
│ + generateRefreshToken(payload): string                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  EmailService                                    │
├─────────────────────────────────────────────────────────────────┤
│ + sendEmail(to, subject, html): Promise<void>                    │
│ + sendTemplate(template, data): Promise<void>                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  SMSService                                      │
├─────────────────────────────────────────────────────────────────┤
│ + sendSMS(to, message): Promise<void>                           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  Logger                                          │
├─────────────────────────────────────────────────────────────────┤
│ + info(message): void                                            │
│ + error(message, error): void                                    │
│ + warn(message): void                                            │
│ + debug(message): void                                           │
└─────────────────────────────────────────────────────────────────┘
```

### Enums and Types

```
enum Role {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  RECEPTIONIST = 'receptionist',
  DOCTOR = 'doctor',
  NURSE = 'nurse',
  LAB_TECHNICIAN = 'lab_technician',
  PHARMACIST = 'pharmacist',
  CASHIER = 'cashier',
  HOSPITAL_MANAGER = 'hospital_manager',
  PATIENT = 'patient'
}

enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other'
}

enum AppointmentStatus {
  SCHEDULED = 'scheduled',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  RESCHEDULED = 'rescheduled'
}

enum LabTestStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

enum Priority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

enum BedType {
  GENERAL = 'general',
  PRIVATE = 'private',
  ICU = 'icu',
  EMERGENCY = 'emergency',
  PEDIATRIC = 'pediatric'
}

enum BedStatus {
  AVAILABLE = 'available',
  OCCUPIED = 'occupied',
  MAINTENANCE = 'maintenance',
  RESERVED = 'reserved'
}

enum InvoiceStatus {
  PENDING = 'pending',
  PARTIAL = 'partial',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled'
}

enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  INSURANCE = 'insurance',
  ONLINE = 'online',
  CHECK = 'check'
}

enum NotificationType {
  APPOINTMENT = 'appointment',
  PRESCRIPTION = 'prescription',
  LAB_RESULT = 'lab_result',
  PAYMENT = 'payment',
  ADMISSION = 'admission',
  DISCHARGE = 'discharge',
  SYSTEM = 'system',
  ALERT = 'alert'
}

enum Shift {
  MORNING = 'morning',
  EVENING = 'evening',
  NIGHT = 'night'
}

enum Severity {
  MILD = 'mild',
  MODERATE = 'moderate',
  SEVERE = 'severe',
  CRITICAL = 'critical'
}
```
