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

## Roles & Modules (Professional Overview)

Each role has a secure, role-specific dashboard, permissions, navigation, and modules. Users can access only the features granted to their role.

### Super Admin
Purpose: Full system administration and configuration.

Key Features:
- Dashboard (system-wide metrics & alerts)
- User management (create/disable users)
- Role & permission management
- Hospital settings & configuration
- Department & branch management
- Staff management and assignments
- Analytics & executive reports
- Audit logs and activity review
- Database backup & restore
- Billing configuration
- System configuration and integrations
- Notifications management
- Profile & personal settings

### Admin
Purpose: Day-to-day hospital administration and oversight.

Key Features:
- Dashboard (operational metrics)
- Patient management
- Staff management
- Department administration
- Appointment & schedule management
- Admissions & discharge workflows
- Pharmacy and laboratory coordination
- Billing & invoicing oversight
- Reports (operational & financial)
- Inventory management
- Notifications & alerts
- Profile

### Receptionist
Purpose: Front desk operations, patient intake and scheduling.

Key Features:
- Dashboard (today's queues & appointments)
- Patient registration
- Patient search and lookup
- Appointment scheduling & rescheduling
- Doctor schedules and availability
- Queue & check-in management
- Admissions initiation
- Visitor registration
- Notifications
- Profile

### Doctor
Purpose: Clinical care and patient management.

Dashboard Highlights:
- Today's patients
- Upcoming appointments
- Pending lab results
- Recent prescriptions
- Emergency cases

Modules:
- Patients (list & search)
- Medical records / EMR
- Appointments
- Vitals entry
- Diagnosis & clinical notes (SOAP)
- Prescriptions
- Lab & radiology requests
- Treatment plans & referrals
- Admissions & discharge summaries
- Messaging
- Notifications
- Reports
- Profile

### Nurse
Purpose: Inpatient care and daily bedside workflows.

Key Modules:
- Dashboard (assigned patients)
- Assigned patients & care list
- Vitals recording
- Medication administration
- Nursing notes
- Bed management
- Patient monitoring
- Admissions coordination
- Care plans
- Messaging & notifications
- Profile

### Lab Technician
Purpose: Laboratory test processing and reporting.

Key Modules:
- Dashboard (test queues)
- Test requests & sample tracking
- Sample collection logging
- Laboratory processing workflows
- Results upload & verification
- Report generation (PDF)
- Completed & pending test lists
- Notifications
- Profile

### Pharmacist
Purpose: Pharmacy inventory, dispensing, and procurement.

Key Modules:
- Dashboard (stock & sales)
- Prescriptions queue
- Dispensing interface
- Drug inventory & stock control
- Supplier & purchase order management
- Expiry tracking
- Stock alerting
- Sales & dispensing reports
- Notifications
- Profile

### Cashier
Purpose: Patient billing and payment processing.

Key Modules:
- Dashboard (payments & daily totals)
- Patient billing
- Invoice generation
- Payment collection & reconciliation
- Insurance claims processing
- Refund handling
- Payment history
- Financial reports
- Notifications
- Profile

### Hospital Manager
Purpose: Operational oversight and performance management.

Key Modules:
- Dashboard (KPIs & occupancy)
- Staff performance metrics
- Department performance analytics
- Admissions overview
- Bed occupancy monitoring
- Financial summary
- Inventory overview
- Reports & analytics
- Notifications
- Profile

### Patient (Patient Portal)
Purpose: Personal health access and self-service.

Key Modules:
- Dashboard (upcoming appointments, alerts)
- My profile
- Medical history & documents
- Appointments booking & management
- Prescriptions
- Laboratory results
- Billing & payments
- Secure messaging
- Notifications
- Report download (PDF)

### General Platform Features

- Authentication: JWT, refresh tokens, role-based authorization, password reset, email verification, optional 2FA
- Patient Management: EMR, patient timeline, allergies, chronic conditions, family history
- Appointments: online booking, availability, calendar view, reschedule/cancel
- Laboratory: test orders, results upload, PDF reports
- Pharmacy: inventory, stock alerts, barcode support
- Billing: invoices, multiple payment methods, insurance support
- Reports: daily/weekly/monthly/yearly; export to PDF, Excel, CSV
- Notifications: email, SMS, in-app
- Audit logs: comprehensive activity recording
- Global search: patients, clinicians, medicines, and reports

## Cashier Responsibilities

### 1. Patient Billing

- Generate bills for:
     - Consultation fees
     - Laboratory tests
     - Pharmacy purchases
     - Admission charges
     - Surgery fees
     - Room/bed charges
     - Medical procedures

### 2. Receive Payments

- Accept payments via:
     - Cash
     - Credit/Debit Card
     - Mobile Money
     - Bank Transfer
     - Insurance

### 3. Generate Invoices

- Create printable invoices and receipts.
- Email or print receipts for patients.

### 4. Manage Insurance Claims

- Verify insurance coverage.
- Record insurance payments.
- Track claim status.

### 5. Payment History

- View all patient payments.
- Search previous transactions.
- Reprint receipts.

### 6. Refund Management

- Process approved refunds.
- Record refund reasons.
- Maintain refund history.

### 7. Outstanding Balances

- View unpaid bills.
- Record partial payments.
- Track remaining balances.

### 8. Daily Cash Report

- Total collections.
- Cash received.
- Card payments.
- Insurance payments.
- Refunds.
- Daily closing balance.

### 9. Financial Reports

- Daily income.
- Weekly income.
- Monthly income.
- Revenue by department.
- Payment method reports.

### 10. Notifications

- Pending payments.
- Successful payments.
- Failed transactions.
- Insurance approvals.

---

## Cashier Dashboard

The cashier dashboard provides an at-a-glance financial overview and quick actions for payment workflows.

Key widgets and views:
- Today's Revenue
- Total Transactions
- Pending Bills
- Paid Bills
- Outstanding Balance
- Recent Payments
- Insurance Claims
- Daily Collection Chart


## Dashboard — Billing & Finance

Overview: The financial dashboard provides fast, role-appropriate access to billing, insurance, transaction history, reports, notifications, and profile/settings related to payments.

### Billing
- Create Bill: create and preview bills for services rendered.
- Patient Bills: view and search all bills for a patient.
- Outstanding Bills: list and filter unpaid or overdue invoices.
- Payment Collection: record and reconcile payments (cash, card, insurance).
- Refunds: process and track refund requests.

### Insurance
- Insurance Claims: submit and track claims to insurers.
- Insurance Payments: record insurer settlements and reconciliations.

### Transactions
- Payment History: searchable ledger of all transactions.
- Receipts: generate and reprint receipts for payments.

### Reports
- Daily Report: summary of daily revenue and settlements.
- Monthly Report: month-to-date financial summary.
- Revenue Report: breakdown by department, service, and payment method.

### Notifications
- Financial alerts: overdue payments, failed transactions, settlement notices.

### Profile
- Billing profile: payment methods, insurance details, billing contacts.

### Settings
- Billing settings: tax, discounts, invoice templates, payment gateways.


