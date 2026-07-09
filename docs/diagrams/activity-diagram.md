# Activity Diagram
## Hospital Management System

### 1. Patient Registration Activity

```
┌──────────────┐
│  Receptionist│
└──────┬───────┘
       │
       │ Start
       ▼
┌──────────────────┐
│ Navigate to      │
│ Patient Register │
│ Page             │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Enter Patient    │
│ Information:     │
│ - Name           │
│ - DOB            │
│ - Gender         │
│ - Phone          │
│ - Email          │
│ - Address        │
│ - Blood Type     │
│ - Allergies      │
│ - Emergency      │
│   Contact        │
│ - Insurance      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Validate Input   │
└────────┬─────────┘
         │
         ├──────────┐
         │          │
         │ Invalid  │ Valid
         ▼          ▼
┌──────────────┐  ┌──────────────┐
│ Show Error   │  │ Check if User │
│ Message      │  │ Account Exists│
└──────────────┘  └──────┬───────┘
                         │
                         ├──────────┐
                         │          │
                         │ Yes       │ No
                         ▼          ▼
                  ┌──────────────┐ ┌──────────────┐
                  │ Link to      │ │ Create User   │
                  │ Existing User│ │ Account       │
                  └──────┬───────┘ └──────┬───────┘
                         │                 │
                         └────────┬────────┘
                                  ▼
                         ┌──────────────┐
                         │ Create       │
                         │ Patient      │
                         │ Record       │
                         └──────┬───────┘
                                │
                                ▼
                         ┌──────────────┐
                         │ Generate     │
                         │ Patient ID   │
                         └──────┬───────┘
                                │
                                ▼
                         ┌──────────────┐
                         │ Send Welcome │
                         │ Notification │
                         └──────┬───────┘
                                │
                                ▼
                         ┌──────────────┐
                         │ Display      │
                         │ Success      │
                         │ Message      │
                         └──────┬───────┘
                                │
                                ▼
                         ┌──────────────┐
                         │ End          │
                         └──────────────┘
```

### 2. Appointment Booking Activity

```
┌──────────────┐
│  Patient     │
└──────┬───────┘
       │
       │ Start
       ▼
┌──────────────────┐
│ Navigate to      │
│ Appointment Page │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Select Department│
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ View Available   │
│ Doctors          │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Select Doctor    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Select Date &    │
│ Time             │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Enter Reason     │
│ for Visit        │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Check Slot       │
│ Availability     │
└────────┬─────────┘
         │
         ├──────────┐
         │          │
         │ Not       │ Available
         │ Available │
         ▼          ▼
┌──────────────┐  ┌──────────────┐
│ Show Error   │  │ Confirm      │
│ & Suggest    │  │ Appointment  │
│ Alternative  │  └──────┬───────┘
│ Times        │         │
└──────────────┘         ▼
                  ┌──────────────┐
                  │ Create       │
                  │ Appointment  │
                  │ Record       │
                  └──────┬───────┘
                         │
                         ▼
                  ┌──────────────┐
                  │ Send         │
                  │ Confirmation │
                  │ to Doctor    │
                  └──────┬───────┘
                         │
                         ▼
                  ┌──────────────┐
                  │ Send         │
                  │ Reminder to  │
                  │ Patient      │
                  └──────┬───────┘
                         │
                         ▼
                  ┌──────────────┐
                  │ Display      │
                  │ Confirmation │
                  └──────┬───────┘
                         │
                         ▼
                  ┌──────────────┐
                  │ End          │
                  └──────────────┘
```

### 3. Doctor Consultation Activity

```
┌──────────────┐
│   Doctor     │
└──────┬───────┘
       │
       │ Start
       ▼
┌──────────────────┐
│ View Today's     │
│ Appointments     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Select Patient  │
│ for Consultation│
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Review Patient  │
│ Medical History │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Discuss Symptoms │
│ with Patient     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Perform Physical│
│ Examination     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Use AI Disease  │
│ Prediction (Optional)│
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Record Diagnosis│
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Request Lab     │
│ Tests (if needed)│
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Prescribe        │
│ Medications      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Check Drug       │
│ Interactions     │
│ (AI Module)      │
└────────┬─────────┘
         │
         ├──────────┐
         │          │
         │ Warning   │ No Warning
         ▼          ▼
┌──────────────┐  ┌──────────────┐
│ Show Warning │  │ Proceed with │
│ & Modify     │  │ Prescription │
└──────────────┘  └──────┬───────┘
                         │
                         ▼
                  ┌──────────────┐
                  │ Add Treatment│
                  │ Notes        │
                  └──────┬───────┘
                         │
                         ▼
                  ┌──────────────┐
                  │ Mark         │
                  │ Appointment  │
                  │ as Completed │
                  └──────┬───────┘
                         │
                         ▼
                  ┌──────────────┐
                  │ Send         │
                  │ Prescription │
                  │ to Pharmacy  │
                  └──────┬───────┘
                         │
                         ▼
                  ┌──────────────┐
                  │ End          │
                  └──────────────┘
```

### 4. Lab Test Processing Activity

```
┌──────────────┐
│Lab Technician│
└──────┬───────┘
       │
       │ Start
       ▼
┌──────────────────┐
│ View Pending     │
│ Lab Tests        │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Select Test      │
│ to Process       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Review Patient   │
│ Information      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Collect Sample   │
│ from Patient     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Perform Test     │
│ Analysis         │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Record Results   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Compare with    │
│ Reference Range  │
└────────┬─────────┘
         │
         ├──────────┐
         │          │
         │ Abnormal  │ Normal
         ▼          ▼
┌──────────────┐  ┌──────────────┐
│ Mark as      │  │ Mark as      │
│ Abnormal     │  │ Normal       │
└──────┬───────┘  └──────┬───────┘
       │                 │
       └────────┬────────┘
                ▼
         ┌──────────────┐
         │ Upload       │
         │ Results      │
         └──────┬───────┘
                │
                ▼
         ┌──────────────┐
         │ Generate     │
         │ Lab Report   │
         └──────┬───────┘
                │
                ▼
         ┌──────────────┐
         │ Send Alert   │
         │ if Abnormal  │
         └──────┬───────┘
                │
                ▼
         ┌──────────────┐
         │ Notify      │
         │ Doctor       │
         └──────┬───────┘
                │
                ▼
         ┌──────────────┐
         │ Update Test  │
         │ Status to    │
         │ Completed    │
         └──────┬───────┘
                │
                ▼
         ┌──────────────┐
         │ End          │
         └──────────────┘
```

### 5. Medicine Dispensing Activity

```
┌──────────────┐
│  Pharmacist  │
└──────┬───────┘
       │
       │ Start
       ▼
┌──────────────────┐
│ View Pending     │
│ Prescriptions    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Select           │
│ Prescription     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Verify Patient   │
│ Identity         │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Check Medicine   │
│ Availability     │
└────────┬─────────┘
         │
         ├──────────┐
         │          │
         │ Out of    │ Available
         │ Stock     │
         ▼          ▼
┌──────────────┐  ┌──────────────┐
│ Notify       │  │ Check Drug   │
│ Doctor &     │  │ Interactions │
│ Suggest      │  └──────┬───────┘
│ Alternative  │         │
└──────────────┘         ├──────────┐
                          │          │
                          │ Warning   │ No Warning
                          ▼          ▼
                   ┌──────────────┐ ┌──────────────┐
                   │ Contact      │ │ Prepare      │
                   │ Doctor       │ │ Medication   │
                   └──────────────┘ └──────┬───────┘
                                          │
                                          ▼
                                   ┌──────────────┐
                                   │ Verify       │
                                   │ Dosage       │
                                   └──────┬───────┘
                                          │
                                          ▼
                                   ┌──────────────┐
                                   │ Dispense     │
                                   │ Medicine     │
                                   └──────┬───────┘
                                          │
                                          ▼
                                   ┌──────────────┐
                                   │ Update       │
                                   │ Inventory    │
                                   └──────┬───────┘
                                          │
                                          ▼
                                   ┌──────────────┐
                                   │ Check Low    │
                                   │ Stock Alert  │
                                   └──────┬───────┘
                                          │
                                          ▼
                                   ┌──────────────┐
                                   │ Mark         │
                                   │ Prescription │
                                   │ as Dispensed │
                                   └──────┬───────┘
                                          │
                                          ▼
                                   ┌──────────────┐
                                   │ Provide      │
                                   │ Instructions │
                                   │ to Patient   │
                                   └──────┬───────┘
                                          │
                                          ▼
                                   ┌──────────────┐
                                   │ End          │
                                   └──────────────┘
```

### 6. Patient Admission Activity

```
┌──────────────┐
│ Receptionist │
└──────┬───────┘
       │
       │ Start
       ▼
┌──────────────────┐
│ Select Patient  │
│ for Admission   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Get Doctor's     │
│ Admission Order  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Check Available  │
│ Beds             │
└────────┬─────────┘
         │
         ├──────────┐
         │          │
         │ No Beds   │ Beds Available
         ▼          ▼
┌──────────────┐  ┌──────────────┐
│ Put on       │  │ Select Bed   │
│ Waiting List │  │ & Ward       │
└──────────────┘  └──────┬───────┘
                         │
                         ▼
                  ┌──────────────┐
                  │ Assign Bed   │
                  └──────┬───────┘
                         │
                         ▼
                  ┌──────────────┐
                  │ Create       │
                  │ Admission    │
                  │ Record       │
                  └──────┬───────┘
                         │
                         ▼
                  ┌──────────────┐
                  │ Update Bed    │
                  │ Status to     │
                  │ Occupied     │
                  └──────┬───────┘
                         │
                         ▼
                  ┌──────────────┐
                  │ Assign Nurse  │
                  │ for Care      │
                  └──────┬───────┘
                         │
                         ▼
                  ┌──────────────┐
                  │ Notify       │
                  │ Doctor       │
                  └──────┬───────┘
                         │
                         ▼
                  ┌──────────────┐
                  │ Notify       │
                  │ Patient      │
                  └──────┬───────┘
                         │
                         ▼
                  ┌──────────────┐
                  │ Generate     │
                  │ Admission    │
                  │ Papers       │
                  └──────┬───────┘
                         │
                         ▼
                  ┌──────────────┐
                  │ End          │
                  └──────────────┘
```

### 7. Billing & Payment Activity

```
┌──────────────┐
│   Cashier    │
└──────┬───────┘
       │
       │ Start
       ▼
┌──────────────────┐
│ Select Patient  │
│ for Billing     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Review Services  │
│ Rendered:        │
│ - Consultations  │
│ - Lab Tests      │
│ - Medicines      │
│ - Room Charges   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Calculate       │
│ Subtotal        │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Apply Discounts  │
│ (if any)         │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Calculate Tax   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Calculate Total  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Generate Invoice │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Present Invoice  │
│ to Patient       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Select Payment   │
│ Method:          │
│ - Cash          │
│ - Card          │
│ - Insurance     │
│ - Online        │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Process Payment  │
└────────┬─────────┘
         │
         ├──────────┐
         │          │
         │ Failed   │ Success
         ▼          ▼
┌──────────────┐  ┌──────────────┐
│ Show Error   │  │ Record       │
│ & Retry      │  │ Payment      │
└──────────────┘  └──────┬───────┘
                         │
                         ▼
                  ┌──────────────┐
                  │ Update       │
                  │ Invoice      │
                  │ Status       │
                  └──────┬───────┘
                         │
                         ▼
                  ┌──────────────┐
                  │ Print        │
                  │ Receipt      │
                  └──────┬───────┘
                         │
                         ▼
                  ┌──────────────┐
                  │ Send         │
                  │ Payment      │
                  │ Confirmation │
                  └──────┬───────┘
                         │
                         ▼
                  ┌──────────────┐
                  │ End          │
                  └──────────────┘
```

### 8. AI Disease Prediction Activity

```
┌──────────────┐
│   Doctor     │
└──────┬───────┘
       │
       │ Start
       ▼
┌──────────────────┐
│ Enter Patient   │
│ Symptoms        │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Enter Patient   │
│ Vitals          │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Enter Patient   │
│ Medical History  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Submit to AI    │
│ Module          │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ AI Analyzes Data │
│ Using ML Model  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ AI Generates    │
│ Disease         │
│ Predictions     │
│ with Confidence │
│ Scores          │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Display Results │
│ to Doctor       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Doctor Reviews   │
│ Predictions      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Doctor Makes    │
│ Final Diagnosis │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Record Diagnosis │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ End          │
└──────────────────┘
```

### 9. Authentication Activity

```
┌──────────────┐
│     User     │
└──────┬───────┘
       │
       │ Start
       ▼
┌──────────────────┐
│ Navigate to      │
│ Login Page       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Enter Email     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Enter Password  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Click Login      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Validate Input   │
└────────┬─────────┘
         │
         ├──────────┐
         │          │
         │ Invalid  │ Valid
         ▼          ▼
┌──────────────┐  ┌──────────────┐
│ Show Error   │  │ Check User   │
│ Message      │  │ Exists       │
└──────────────┘  └──────┬───────┘
                         │
                         ├──────────┐
                         │          │
                         │ Not Found │ Found
                         ▼          ▼
                  ┌──────────────┐ ┌──────────────┐
                  │ Show Error   │ │ Verify      │
                  │ Message      │ │ Password    │
                  └──────────────┘ └──────┬───────┘
                                          │
                                          ├──────────┐
                                          │          │
                                          │ Invalid   │ Valid
                                          ▼          ▼
                                   ┌──────────────┐ ┌──────────────┐
                                   │ Show Error   │ │ Check if    │
                                   │ Message      │ │ Active      │
                                   └──────────────┘ └──────┬───────┘
                                                          │
                                                          ├──────────┐
                                                          │          │
                                                          │ Inactive │ Active
                                                          ▼          ▼
                                                   ┌──────────────┐ ┌──────────────┐
                                                   │ Show Error   │ │ Generate    │
                                                   │ Message      │ │ JWT Token   │
                                                   └──────────────┘ └──────┬───────┘
                                                                  │
                                                                  ▼
                                                           ┌──────────────┐
                                                           │ Update Last  │
                                                           │ Login Time   │
                                                           └──────┬───────┘
                                                                  │
                                                                  ▼
                                                           ┌──────────────┐
                                                           │ Store Token  │
                                                           │ in Browser   │
                                                           └──────┬───────┘
                                                                  │
                                                                  ▼
                                                           ┌──────────────┐
                                                           │ Redirect to  │
                                                           │ Dashboard   │
                                                           └──────┬───────┘
                                                                  │
                                                                  ▼
                                                           ┌──────────────┐
                                                           │ End          │
                                                           └──────────────┘
```

### 10. Patient Discharge Activity

```
┌──────────────┐
│   Doctor     │
└──────┬───────┘
       │
       │ Start
       ▼
┌──────────────────┐
│ Review Patient   │
│ Condition        │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Determine if     │
│ Ready for       │
│ Discharge        │
└────────┬─────────┘
         │
         ├──────────┐
         │          │
         │ Not Ready │ Ready
         ▼          ▼
┌──────────────┐  ┌──────────────┐
│ Continue     │  │ Write        │
│ Treatment    │  │ Discharge    │
└──────────────┘  │ Summary      │
                  └──────┬───────┘
                         │
                         ▼
                  ┌──────────────┐
                  │ Prescribe    │
                  │ Discharge    │
                  │ Medications  │
                  └──────┬───────┘
                         │
                         ▼
                  ┌──────────────┐
                  │ Schedule     │
                  │ Follow-up    │
                  │ Appointment  │
                  └──────┬───────┘
                         │
                         ▼
                  ┌──────────────┐
                  │ Calculate    │
                  │ Final Bill   │
                  └──────┬───────┘
                         │
                         ▼
                  ┌──────────────┐
                  │ Generate    │
                  │ Invoice      │
                  └──────┬───────┘
                         │
                         ▼
                  ┌──────────────┐
                  │ Update       │
                  │ Admission    │
                  │ Status       │
                  └──────┬───────┘
                         │
                         ▼
                  ┌──────────────┐
                  │ Free Up Bed  │
                  └──────┬───────┘
                         │
                         ▼
                  ┌──────────────┐
                  │ Notify       │
                  │ Receptionist │
                  └──────┬───────┘
                         │
                         ▼
                  ┌──────────────┐
                  │ Notify       │
                  │ Patient      │
                  └──────┬───────┘
                         │
                         ▼
                  ┌──────────────┐
                  │ Provide      │
                  │ Discharge    │
                  │ Papers       │
                  └──────┬───────┘
                         │
                         ▼
                  ┌──────────────┐
                  │ End          │
                  └──────────────┘
```
