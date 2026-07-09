# Entity-Relationship (ER) Diagram
## Hospital Management System

### Entities and Relationships

```
┌─────────────────┐
│    DEPARTMENTS  │
├─────────────────┤
│ PK id           │
│    name         │
│    description  │
│    head_doctor  │──────┐
│    created_at   │      │
│    updated_at   │      │
└─────────────────┘      │
                         │
┌─────────────────┐      │
│      USERS      │      │
├─────────────────┤      │
│ PK id           │      │
│    email        │      │
│    password     │      │
│    role         │      │
│    is_active    │      │
│    last_login   │      │
│    created_at   │      │
│    updated_at   │      │
└─────────────────┘      │
         │               │
         │ (1:1)         │ (1:N)
         │               │
    ┌────┴────┐           │
    │         │           │
    │         │           │
┌───▼───┐ ┌───▼───┐  ┌────▼────┐
│DOCTORS│ │NURSES │  │PATIENTS │
├───────┤ ├───────┤  ├─────────┤
│PK id  │ │PK id  │  │PK id    │
│FK user│ │FK user│  │FK user  │
│first  │ │first  │  │first    │
│last   │ │last   │  │last     │
│spec   │ │dept   │  │dob      │
│dept───┼─►│license│  │gender   │
│license│ │shift  │  │phone    │
│qual   │ │qual   │  │email    │
│exp    │ │avail  │  │address  │
│fee    │ │created│  │blood    │
│avail  │ │updated│  │allergies│
│created│ └───────┘  │emergency│
│updated│             │insurance│
└───────┘             │history  │
                      │created  │
                      │updated  │
                      └─────────┘
                           │
                           │ (1:N)
                           │
                    ┌──────▼──────┐
                    │ APPOINTMENTS│
                    ├─────────────┤
                    │ PK id       │
                    │ FK patient  │◄────┐
                    │ FK doctor   │     │
                    │ date        │     │
                    │ status      │     │
                    │ reason      │     │
                    │ notes       │     │
                    │ created     │     │
                    │ updated     │     │
                    └─────────────┘     │
                           │             │
                           │ (1:N)       │ (1:N)
                           │             │
                    ┌──────▼──────┐ ┌────▼────┐
                    │  DIAGNOSES  │ │ VITALS  │
                    ├─────────────┤ ├─────────┤
                    │ PK id       │ │ PK id   │
                    │ FK patient  │ │ FK pat  │
                    │ FK doctor   │ │ FK nurse│
                    │ FK appoint  │ │ temp    │
                    │ date        │ │ bp_sys  │
                    │ disease     │ │ bp_dia  │
                    │ icd_code    │ │ hr      │
                    │ severity    │ │ rr      │
                    │ symptoms    │ │ o2_sat  │
                    │ notes       │ │ weight  │
                    │ is_chronic  │ │ height  │
                    │ created     │ │ glucose │
                    │ updated     │ │ notes   │
                    └─────────────┘ └─────────┘
                           │
                           │ (1:N)
                           │
                    ┌──────▼──────────┐
                    │ PRESCRIPTIONS   │
                    ├─────────────────┤
                    │ PK id           │
                    │ FK patient      │
                    │ FK doctor       │
                    │ FK diagnosis    │
                    │ date            │
                    │ medication      │
                    │ dosage          │
                    │ frequency       │
                    │ duration        │
                    │ instructions    │
                    │ is_dispensed    │
                    │ created         │
                    │ updated         │
                    └─────────────────┘

┌─────────────┐
│  LAB_TESTS  │
├─────────────┤
│ PK id       │
│ FK patient  │
│ FK doctor   │
│ test_name   │
│ test_type   │
│ requested   │
│ status      │
│ priority    │
│ notes       │
│ created     │
│ updated     │
└──────┬──────┘
       │ (1:1)
       │
┌──────▼──────────┐
│  LAB_RESULTS    │
├─────────────────┤
│ PK id           │
│ FK lab_test     │
│ FK technician   │
│ result_date     │
│ results         │
│ reference_range │
│ is_abnormal     │
│ notes           │
│ attachment      │
│ created         │
│ updated         │
└─────────────────┘

┌─────────────┐
│  MEDICINES  │
├─────────────┤
│ PK id       │
│ name        │
│ generic     │
│ manufacturer│
│ category    │
│ description │
│ unit        │
│ price       │
│ expiry      │
│ storage     │
│ side_effects│
│ contra      │
│ created     │
│ updated     │
└──────┬──────┘
       │ (1:N)
       │
┌──────▼──────────┐
│   INVENTORY     │
├─────────────────┤
│ PK id           │
│ FK medicine     │
│ quantity        │
│ reorder_level   │
│ batch_number    │
│ expiry_date     │
│ location        │
│ restocked       │
│ created         │
│ updated         │
└─────────────────┘

┌─────────────┐
│    BEDS     │
├─────────────┤
│ PK id       │
│ ward        │
│ bed_number  │
│ bed_type    │
│ status      │
│ hourly_rate │
│ daily_rate  │
│ created     │
│ updated     │
└──────┬──────┘
       │ (1:N)
       │
┌──────▼──────────┐
│  ADMISSIONS    │
├─────────────────┤
│ PK id           │
│ FK patient      │
│ FK bed          │
│ FK doctor       │
│ admission_date  │
│ discharge_date  │
│ status          │
│ diagnosis       │
│ treatment_plan  │
│ discharge_summary│
│ total_charges   │
│ created         │
│ updated         │
└──────┬──────────┘
       │ (1:N)
       │
┌──────▼──────────┐
│   INVOICES     │
├─────────────────┤
│ PK id           │
│ FK patient      │
│ FK admission    │
│ invoice_date    │
│ due_date        │
│ subtotal        │
│ tax             │
│ discount        │
│ total_amount    │
│ status          │
│ notes           │
│ created         │
│ updated         │
└──────┬──────────┘
       │ (1:N)
       │
┌──────▼──────────┐
│   PAYMENTS      │
├─────────────────┤
│ PK id           │
│ FK invoice      │
│ payment_date    │
│ amount          │
│ payment_method  │
│ transaction_id  │
│ FK received_by  │
│ notes           │
│ created         │
└─────────────────┘

┌─────────────────┐
│ NOTIFICATIONS   │
├─────────────────┤
│ PK id           │
│ FK user         │
│ FK patient      │
│ type            │
│ title           │
│ message         │
│ is_read         │
│ sent_email      │
│ sent_sms        │
│ created         │
└─────────────────┘

┌─────────────────┐
│   AUDIT_LOGS    │
├─────────────────┤
│ PK id           │
│ FK user         │
│ action          │
│ entity_type     │
│ entity_id       │
│ old_values      │
│ new_values      │
│ ip_address      │
│ user_agent      │
│ timestamp       │
└─────────────────┘
```

### Relationship Types

1. **One-to-One (1:1)**
   - Users ↔ Doctors
   - Users ↔ Nurses
   - Users ↔ Patients
   - Lab Tests ↔ Lab Results

2. **One-to-Many (1:N)**
   - Departments → Doctors
   - Departments → Nurses
   - Patients → Appointments
   - Patients → Vitals
   - Patients → Diagnoses
   - Patients → Prescriptions
   - Patients → Lab Tests
   - Patients → Admissions
   - Patients → Invoices
   - Doctors → Appointments
   - Doctors → Diagnoses
   - Doctors → Prescriptions
   - Doctors → Lab Tests
   - Doctors → Admissions
   - Nurses → Vitals
   - Diagnoses → Prescriptions
   - Medicines → Inventory
   - Beds → Admissions
   - Admissions → Invoices
   - Invoices → Payments
   - Users → Notifications
   - Users → Audit Logs

### Cardinality Constraints

- Each user can have only one role-based profile (Doctor, Nurse, or Patient)
- Each patient can have multiple appointments
- Each appointment belongs to one patient and one doctor
- Each admission can have multiple invoices
- Each invoice can have multiple payments
- Each medicine can have multiple inventory records (different batches)
- Each bed can have multiple admissions over time

### Foreign Key Relationships

| Child Table | Foreign Key | Parent Table | Parent Key |
|-------------|-------------|--------------|------------|
| patients | user_id | users | id |
| doctors | user_id | users | id |
| nurses | user_id | users | id |
| doctors | department_id | departments | id |
| nurses | department_id | departments | id |
| departments | head_doctor_id | doctors | id |
| appointments | patient_id | patients | id |
| appointments | doctor_id | doctors | id |
| vitals | patient_id | patients | id |
| vitals | nurse_id | nurses | id |
| diagnoses | patient_id | patients | id |
| diagnoses | doctor_id | doctors | id |
| diagnoses | appointment_id | appointments | id |
| prescriptions | patient_id | patients | id |
| prescriptions | doctor_id | doctors | id |
| prescriptions | diagnosis_id | diagnoses | id |
| lab_tests | patient_id | patients | id |
| lab_tests | doctor_id | doctors | id |
| lab_results | lab_test_id | lab_tests | id |
| lab_results | technician_id | users | id |
| inventory | medicine_id | medicines | id |
| admissions | patient_id | patients | id |
| admissions | bed_id | beds | id |
| admissions | admitting_doctor_id | doctors | id |
| invoices | patient_id | patients | id |
| invoices | admission_id | admissions | id |
| payments | invoice_id | invoices | id |
| payments | received_by | users | id |
| notifications | user_id | users | id |
| notifications | patient_id | patients | id |
| audit_logs | user_id | users | id |
