# Use Case Diagram
## Hospital Management System

### Actors

1. **Super Admin** - System administrator with full access
2. **Admin** - Hospital administrator
3. **Receptionist** - Front desk staff
4. **Doctor** - Medical practitioner
5. **Nurse** - Nursing staff
6. **Lab Technician** - Laboratory staff
7. **Pharmacist** - Pharmacy staff
8. **Cashier** - Billing staff
9. **Hospital Manager** - Operations manager
10. **Patient** - Hospital patient

### Use Case Diagram

```
                    ┌─────────────────────────────────────────┐
                    │         HOSPITAL MANAGEMENT SYSTEM       │
                    └─────────────────────────────────────────┘
                                       │
         ┌─────────────────────────────┼─────────────────────────────┐
         │                             │                             │
    ┌────▼────┐                  ┌────▼────┐                  ┌────▼────┐
    │ SUPER   │                  │  ADMIN  │                  │RECEPTION│
    │  ADMIN  │                  │         │                  │   IST   │
    └────┬────┘                  └────┬────┘                  └────┬────┘
         │                            │                            │
         │                            │                            │
         ├────────────────────────────┼────────────────────────────┤
         │                            │                            │
         │                            │                            │
    ┌────▼────────────────────────────▼────────────────────────────▼────┐
    │                    AUTHENTICATION MODULE                         │
    ├───────────────────────────────────────────────────────────────────┤
    │  • Login                                                          │
    │  • Logout                                                         │
    │  • Password Reset                                                 │
    │  • Role Management                                                │
    └───────────────────────────────────────────────────────────────────┘
         │                            │                            │
         │                            │                            │
         ├────────────────────────────┼────────────────────────────┤
         │                            │                            │
    ┌────▼────┐                  ┌────▼────┐                  ┌────▼────┐
    │ MANAGE  │                  │ MANAGE  │                  │ REGISTER│
    │ USERS   │                  │ DEPART  │                  │ PATIENT │
    │ ROLES   │                  │ MENTS   │                  │         │
    └─────────┘                  └─────────┘                  └─────────┘
         │                            │                            │
         │                            │                            │
         │                            │                            │
    ┌────▼────┐                  ┌────▼────┐                  ┌────▼────┐
    │ VIEW    │                  │ MANAGE  │                  │ BOOK    │
    │ AUDIT   │                  │ STAFF   │                  │ APPOINT │
    │ LOGS    │                  │         │                  │ MENT    │
    └─────────┘                  └─────────┘                  └─────────┘
         │                            │                            │
         │                            │                            │
         │                            │                            │
    ┌────▼────┐                  ┌────▼────┐                  ┌────▼────┐
    │ SYSTEM  │                  │ VIEW    │                  │ SEARCH  │
    │ BACKUPS │                  │ REPORTS │                  │ PATIENT │
    │         │                  │         │                  │         │
    └─────────┘                  └─────────┘                  └─────────┘
         │
         │
         ├─────────────────────────────────────────────────────────────┐
         │                                                             │
    ┌────▼────┐                  ┌────▼────┐                  ┌────▼────┐
    │ DOCTOR  │                  │  NURSE  │                  │   LAB   │
    │         │                  │         │                  │TECHNICIAN│
    └────┬────┘                  └────┬────┘                  └────┬────┘
         │                            │                            │
         │                            │                            │
         ├────────────────────────────┼────────────────────────────┤
         │                            │                            │
         │                            │                            │
    ┌────▼────────────────────────────▼────────────────────────────▼────┐
    │                    PATIENT MANAGEMENT                             │
    ├───────────────────────────────────────────────────────────────────┤
    │  • View Patient Profile                                           │
    │  • View Medical History                                           │
    │  • Update Patient Information                                     │
    └───────────────────────────────────────────────────────────────────┘
         │                            │                            │
         │                            │                            │
         ├────────────────────────────┼────────────────────────────┤
         │                            │                            │
    ┌────▼────┐                  ┌────▼────┐                  ┌────▼────┐
    │ VIEW    │                  │ RECORD  │                  │ REQUEST │
    │ APPOINT │                  │ VITALS  │                  │ LAB TEST│
    │ MENTS   │                  │         │                  │         │
    └─────────┘                  └─────────┘                  └─────────┘
         │                            │                            │
         │                            │                            │
         │                            │                            │
    ┌────▼────┐                  ┌────▼────┐                  ┌────▼────┐
    │ DIAGNOSE│                  │ MONITOR │                  │ UPLOAD  │
    │ PATIENT │                  │ PATIENT │                  │ RESULTS │
    │         │                  │         │                  │         │
    └─────────┘                  └─────────┘                  └─────────┘
         │                            │                            │
         │                            │                            │
         │                            │                            │
    ┌────▼────┐                  ┌────▼────┐                  ┌────▼────┐
    │ PRESCRIBE│                 │ ASSIGN  │                  │ GENERATE│
    │ MEDICINE │                 │ WARD    │                  │ REPORT  │
    │         │                  │         │                  │         │
    └─────────┘                  └─────────┘                  └─────────┘
         │
         │
         ├─────────────────────────────────────────────────────────────┐
         │                                                             │
    ┌────▼────┐                  ┌────▼────┐                  ┌────▼────┐
    │PHARMACIST│                 │ CASHIER │                  │ MANAGER │
    │         │                  │         │                  │         │
    └────┬────┘                  └────┬────┘                  └────┬────┘
         │                            │                            │
         │                            │                            │
         ├────────────────────────────┼────────────────────────────┤
         │                            │                            │
         │                            │                            │
    ┌────▼────┐                  ┌────▼────┐                  ┌────▼────┐
    │ MANAGE  │                  │ GENERATE│                  │ MANAGE  │
    │ INVENTORY│                 │ INVOICE │                  │ BEDS    │
    │         │                  │         │                  │         │
    └─────────┘                  └─────────┘                  └─────────┘
         │                            │                            │
         │                            │                            │
         │                            │                            │
    ┌────▼────┐                  ┌────▼────┐                  ┌────▼────┐
    │ DISPENSE│                  │ PROCESS │                  │ ALLOCATE│
    │ MEDICINE│                 │ PAYMENT │                  │ BED     │
    │         │                  │         │                  │         │
    └─────────┘                  └─────────┘                  └─────────┘
         │                            │                            │
         │                            │                            │
         │                            │                            │
    ┌────▼────┐                  ┌────▼────┐                  ┌────▼────┐
    │ CHECK   │                  │ PRINT   │                  │ ADMISSION│
    │ STOCK   │                  │ RECEIPT │                  │ DISCHARGE│
    │ ALERTS  │                  │         │                  │         │
    └─────────┘                  └─────────┘                  └─────────┘
         │
         │
         ├─────────────────────────────────────────────────────────────┐
         │                                                             │
    ┌────▼────┐                  ┌────▼────┐                  ┌────▼────┐
    │ PATIENT │                  │ AI      │                  │ ALL     │
    │         │                  │ MODULE  │                  │ ACTORS  │
    └────┬────┘                  └────┬────┘                  └────┬────┘
         │                            │                            │
         │                            │                            │
         ├────────────────────────────┼────────────────────────────┤
         │                            │                            │
         │                            │                            │
    ┌────▼────┐                  ┌────▼────┐                  ┌────▼────┐
    │ BOOK    │                  │ DISEASE │                  │ VIEW    │
    │ APPOINT │                  │ PREDICT │                  │ NOTIFICATIONS│
    │ MENT    │                  │         │                  │         │
    └─────────┘                  └─────────┘                  └─────────┘
         │                            │                            │
         │                            │                            │
         │                            │                            │
    ┌────▼────┐                  ┌────▼────┐                  ┌────▼────┐
    │ VIEW    │                  │ DRUG    │                  │ VIEW    │
    │ MEDICAL │                  │ INTERACT│                  │ REPORTS │
    │ HISTORY │                  │ CHECK   │                  │         │
    └─────────┘                  └─────────┘                  └─────────┘
         │                            │                            │
         │                            │                            │
         │                            │                            │
    ┌────▼────┐                  ┌────▼────┐                  ┌────▼────┐
    │ VIEW    │                  │ AI      │                  │ UPDATE  │
    │ PRESCRI │                  │ CHATBOT │                  │ PROFILE │
    │ PTIONS  │                  │         │                  │         │
    └─────────┘                  └─────────┘                  └─────────┘
         │                            │                            │
         │                            │                            │
         │                            │                            │
    ┌────▼────┐                  ┌────▼────┐                  ┌────▼────┐
    │ VIEW    │                  │ HEALTH  │                  │         │
    │ LAB     │                  │ RISK    │                  │         │
    │ RESULTS │                  │ PREDICT │                  │         │
    └─────────┘                  └─────────┘                  └─────────┘
         │                            │
         │                            │
         │                            │
    ┌────▼────┐                  ┌────▼────┐
    │ MAKE    │                  │ SMART   │
    │ PAYMENT │                  │ SCHEDUL │
    │         │                  │ ING     │
    └─────────┘                  └─────────┘
```

### Use Case Descriptions by Module

#### 1. Authentication Module
- **Login**: All actors can authenticate with email/password
- **Logout**: All actors can end their session
- **Password Reset**: All actors can reset their password
- **Role Management**: Super Admin and Admin can manage user roles

#### 2. Patient Management
- **Register Patient**: Receptionist can register new patients
- **Update Patient**: Receptionist, Doctor, Nurse can update patient info
- **Search Patient**: All actors can search for patients
- **View Medical History**: Doctor, Nurse, Patient can view history

#### 3. Appointment Management
- **Book Appointment**: Patient, Receptionist can book appointments
- **Reschedule Appointment**: Patient, Receptionist can reschedule
- **Cancel Appointment**: Patient, Receptionist, Doctor can cancel
- **View Appointments**: Doctor, Patient, Receptionist can view

#### 4. Doctor Module
- **Diagnose Patient**: Doctor can create diagnoses
- **Prescribe Medicine**: Doctor can prescribe medications
- **View Patient History**: Doctor can view complete medical history
- **Treatment Notes**: Doctor can add treatment notes

#### 5. Nurse Module
- **Record Vitals**: Nurse can record patient vital signs
- **Monitor Patient**: Nurse can monitor patient status
- **Assign Ward**: Nurse can assign patients to wards
- **Update Patient Care**: Nurse can update care information

#### 6. Laboratory Module
- **Request Lab Test**: Doctor can request lab tests
- **Upload Results**: Lab Technician can upload test results
- **Generate Lab Reports**: Lab Technician can generate reports
- **View Lab Results**: Doctor, Patient can view results

#### 7. Pharmacy Module
- **Manage Inventory**: Pharmacist can manage medicine stock
- **Dispense Medicine**: Pharmacist can dispense prescribed medicines
- **Check Stock Alerts**: Pharmacist receives low stock alerts
- **View Prescriptions**: Pharmacist can view prescriptions to dispense

#### 8. Billing Module
- **Generate Invoice**: Cashier can generate patient invoices
- **Process Payment**: Cashier can process payments
- **Print Receipt**: Cashier can print payment receipts
- **View Payment History**: Patient, Cashier can view payment history

#### 9. Ward & Bed Management
- **Bed Allocation**: Hospital Manager, Receptionist can allocate beds
- **Admission**: Doctor, Receptionist can admit patients
- **Discharge**: Doctor can discharge patients
- **View Bed Status**: All actors can view bed availability

#### 10. AI Module
- **Disease Prediction**: AI predicts diseases based on symptoms
- **Drug Interaction Check**: AI checks for drug interactions
- **Smart Appointment Scheduling**: AI optimizes appointment scheduling
- **Health Risk Prediction**: AI predicts health risks
- **AI Chatbot**: AI chatbot for patient queries
- **Automated Alerts**: AI sends automated alerts

#### 11. Reporting Module
- **Revenue Reports**: Admin, Manager can view revenue
- **Patient Reports**: Admin, Manager can view patient statistics
- **Disease Statistics**: Admin, Manager can view disease data
- **Department Performance**: Manager can view department metrics

#### 12. Notification Module
- **Email Notifications**: System sends email notifications
- **SMS Notifications**: System sends SMS notifications
- **Appointment Reminders**: System sends appointment reminders
- **View Notifications**: All actors can view their notifications

#### 13. Security Features
- **JWT Authentication**: All API calls use JWT tokens
- **Role-based Permissions**: Access based on user role
- **Audit Logs**: Super Admin can view audit logs
- **Encrypted Passwords**: All passwords are encrypted
- **Database Backups**: Super Admin can manage backups

### Actor-Use Case Matrix

| Use Case | Super Admin | Admin | Receptionist | Doctor | Nurse | Lab Tech | Pharmacist | Cashier | Manager | Patient |
|----------|-------------|-------|--------------|--------|-------|----------|------------|---------|---------|---------|
| Login | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Logout | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Password Reset | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Role Management | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Register Patient | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Update Patient | ✗ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ |
| Search Patient | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| View Medical History | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ | ✓ |
| Book Appointment | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |
| Reschedule Appointment | ✗ | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |
| Cancel Appointment | ✗ | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |
| View Appointments | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ |
| Diagnose Patient | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Prescribe Medicine | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Record Vitals | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Monitor Patient | ✗ | ✗ | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ | ✓ |
| Request Lab Test | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Upload Results | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Manage Inventory | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✓ | ✗ |
| Dispense Medicine | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ |
| Generate Invoice | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ | ✗ |
| Process Payment | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✓ |
| Bed Allocation | ✗ | ✗ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ | ✗ |
| Admission | ✗ | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ |
| Discharge | ✗ | ✗ | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ | ✗ |
| View Reports | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| View Notifications | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| AI Disease Prediction | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |
| AI Drug Interaction | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✓ | � | ✗ | ✓ |
| AI Chatbot | ✗ | ✗ | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ |
