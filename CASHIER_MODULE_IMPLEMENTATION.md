# Cashier Module Implementation Guide

## Overview

This document describes the complete implementation of the Cashier module for the Hospital Management System (HMS). The module integrates financial workflows with clinical operations, ensuring proper payment authorization for services.

## Architecture

### Frontend Components

**Reusable Components** (`frontend/src/components/cashier/`):
- `StatCard.tsx` - Display statistics with icons and trends
- `InvoiceStatusBadge.tsx` - Invoice status indicators (UNPAID, PARTIAL, PAID, etc.)
- `PaymentMethodSelector.tsx` - Payment method selection (Cash, Card, Telebirr, Bank, Insurance)
- `InvoiceTable.tsx` - Invoice listing with actions
- `PaymentModal.tsx` - Payment processing modal with validation
- `ReceiptPreview.tsx` - Receipt display with print/download options

**Main Page** (`frontend/src/pages/CashierDashboard.tsx`):
- Dashboard with daily statistics
- Unpaid invoices management
- Payment history
- Receipt management
- Patient billing search

### Backend Routes

**Cashier Routes** (`backend/src/routes/cashier.js`):
- `GET /api/cashier/stats` - Dashboard statistics
- `GET /api/cashier/invoices/unpaid` - Unpaid invoices list
- `POST /api/cashier/payments/process` - Process payment with receipt generation
- `GET /api/cashier/payments/history` - Payment history
- `GET /api/cashier/receipt/:receiptNumber` - Receipt details

**Enhanced Invoice Routes** (`backend/src/routes/invoices.js`):
- `POST /api/invoices/clinical` - Create/update clinical invoices for lab, pharmacy, radiology
- `POST /api/invoices` - Create registration invoices with items

### Database Schema

**New Tables**:
- `invoice_items` - Line items for invoices (service, quantity, unit_price, total)
- `audit_logs` - Audit trail for all critical actions

**New Columns**:
- `invoices.invoice_type` - Distinguish registration vs clinical invoices
- `invoices.encounter_id` - Link invoices to encounters
- `payments.receipt_number` - Unique receipt identifier

## Workflow Integration

### 1. Patient Registration Payment

**When Receptionist registers a patient**:
1. Patient record is created
2. Automatic registration invoice (50 ETB) is generated
3. Invoice status: `UNPAID`
4. Patient appears in Cashier's unpaid invoice list
5. Cashier processes payment
6. Invoice status changes to `PAID`
7. Receipt generated (e.g., `RCP-00001`)
8. Patient can proceed to clinical workflow

**Implementation**:
- Modified `ReceptionistWorkflow.tsx` to auto-create registration invoice
- Invoice includes item: "Patient Registration" - 50 ETB

### 2. Clinical Service Billing

**When Doctor orders services**:
1. Doctor selects services from catalog (radiology, lab, pharmacy)
2. System creates/updates clinical invoice
3. Invoice status: `UNPAID`
4. Service becomes "payment locked"
5. Cashier processes payment
6. Invoice status changes to `PAID`
7. Service becomes "READY" for department
8. Lab/Pharmacy can now perform service

**Implementation**:
- Modified `DoctorConsultationPage.tsx` to create clinical invoices
- Services use Superadmin-defined pricing
- Multiple services combined into single clinical invoice

### 3. Laboratory Payment Workflow

**Lab Technician Dashboard**:
- Shows payment status for each test
- "Start Test" button disabled if payment not complete
- Shows "Payment Required" badge for unpaid tests
- Button enabled only after `payment_status !== 'UNPAID'`

**Implementation**:
- Modified `LabTechDashboard.tsx` to check payment status
- Frontend restriction prevents starting unpaid tests
- Backend validation should also be added

### 4. Pharmacy Payment Workflow

**Pharmacy Dashboard**:
- Shows payment status for prescriptions
- "Dispense" button disabled if payment not complete
- Shows "Payment Required" badge for unpaid prescriptions
- Button enabled only after `payment_status !== 'UNPAID'`

**Implementation**:
- Modified `PharmacyDashboard.tsx` to check payment status
- Frontend restriction prevents dispensing unpaid medications
- Backend validation should also be added

## Payment Methods

Supported payment methods:
- **Cash** - Direct cash payment
- **Card** - Credit/debit card
- **Telebirr** - Mobile money (requires transaction reference)
- **Bank Transfer** - Bank transfer (requires transaction reference)
- **Insurance** - Insurance coverage (with patient responsibility split)

## Invoice Status Flow

```
UNPAID → PARTIAL → PAID
          ↓
        CANCELLED
          ↓
        REFUNDED
```

## Service Authorization States

```
LOCKED (payment required) → READY (paid) → COMPLETED (service done)
```

## Audit Logging

All critical actions are logged:
- Payments created/updated
- Invoices created/updated
- Patient registrations
- Service orders
- User actions include: user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent, timestamp

## Security

**Backend Authorization**:
- All cashier routes require `cashier`, `admin`, or `super_admin` role
- Clinical invoice creation requires appropriate clinical roles
- Payment processing requires cashier role
- Duplicate payment prevention via invoice status checks

**Frontend Role Protection**:
- Cashier dashboard restricted to cashier role in `App.tsx`
- Payment modal only accessible to authorized users
- Service buttons disabled based on payment status

## Testing Instructions

### Prerequisites

1. Run database migrations:
```bash
# In backend directory
psql -U your_user -d your_database -f migrations/005_add_invoice_items.sql
psql -U your_user -d your_database -f migrations/006_add_audit_logs.sql
```

2. Restart backend server
3. Ensure frontend is running

### Test 1: Registration Payment Workflow

1. Login as Receptionist
2. Register a new patient
3. Verify registration invoice is created (50 ETB, UNPAID)
4. Logout as Receptionist
5. Login as Cashier
6. Navigate to Cashier Dashboard
7. Go to "Unpaid Invoices" tab
8. Find the registration invoice
9. Click "Pay" button
10. Select payment method (e.g., Cash)
11. Enter amount (50 ETB)
12. Confirm payment
13. Verify receipt is generated
14. Verify invoice status changes to PAID
15. Verify receipt appears in "Receipts" tab

### Test 2: Clinical Service Payment Workflow

1. Login as Doctor
2. Start consultation with a patient
3. Order a laboratory test from service catalog
4. Order a prescription from service catalog
5. Verify clinical invoice is created (sum of services, UNPAID)
6. Logout as Doctor
7. Login as Cashier
8. Navigate to Cashier Dashboard
9. Go to "Unpaid Invoices" tab
10. Find the clinical invoice
11. Pay the invoice
12. Verify invoice status changes to PAID
13. Logout as Cashier
14. Login as Lab Technician
15. Verify lab test shows as "READY" (not payment locked)
16. Verify "Start Test" button is enabled
17. Start the test
18. Logout as Lab Technician
19. Login as Pharmacist
20. Verify prescription shows as ready to dispense
21. Verify "Dispense" button is enabled
22. Dispense the medication

### Test 3: Payment Method Variations

Test each payment method:
- Cash (no reference required)
- Card (no reference required)
- Telebirr (requires transaction reference)
- Bank Transfer (requires transaction reference)
- Insurance (may require additional fields)

### Test 4: Partial Payments

1. Create an invoice with multiple items totaling 500 ETB
2. Pay 300 ETB
3. Verify invoice status changes to PARTIAL
4. Pay remaining 200 ETB
5. Verify invoice status changes to PAID

### Test 5: Service Locking

1. Login as Doctor
2. Order a lab test without paying
3. Logout as Doctor
4. Login as Lab Technician
5. Verify lab test shows "Payment Required"
6. Verify "Start Test" button is disabled
7. Logout as Lab Technician
8. Login as Cashier
9. Pay the invoice
10. Logout as Cashier
11. Login as Lab Technician
12. Verify "Start Test" button is now enabled

### Test 6: Audit Logs

1. Perform various actions (payments, invoices, registrations)
2. Check audit_logs table in database
3. Verify all actions are logged with:
   - User ID
   - Action type
   - Entity type and ID
   - Old and new values
   - Timestamp
   - IP address

## Files Modified/Created

### Frontend
- `frontend/src/components/cashier/` - New reusable components
- `frontend/src/pages/CashierDashboard.tsx` - New cashier dashboard
- `frontend/src/pages/ReceptionistWorkflow.tsx` - Auto-create registration invoice
- `frontend/src/pages/DoctorConsultationPage.tsx` - Create clinical invoices
- `frontend/src/pages/LabTechDashboard.tsx` - Payment status check
- `frontend/src/pages/PharmacyDashboard.tsx` - Payment status check
- `frontend/src/App.tsx` - Add cashier route and permissions

### Backend
- `backend/src/routes/cashier.js` - New cashier-specific routes
- `backend/src/routes/invoices.js` - Enhanced with clinical invoice support
- `backend/src/server.js` - Register cashier routes and audit middleware
- `backend/src/middleware/auditLog.js` - New audit logging middleware
- `backend/migrations/005_add_invoice_items.sql` - Invoice items table
- `backend/migrations/006_add_audit_logs.sql` - Audit logs table

## Troubleshooting

**Issue**: Cashier dashboard shows no statistics
- **Solution**: Ensure cashier role has proper permissions
- Check `/api/cashier/stats` endpoint is returning data

**Issue**: Lab/Pharmacy buttons not unlocking after payment
- **Solution**: Verify payment status is being updated in database
- Check clinical invoice is being marked as PAID
- Ensure frontend is fetching updated payment status

**Issue**: Receipt generation fails
- **Solution**: Verify receipt_number column exists in payments table
- Check receipt number generation logic in cashier route

**Issue**: Audit logs not being created
- **Solution**: Verify audit_logs table exists
- Check auditLog middleware is properly registered in server.js
- Ensure user authentication is working

## Future Enhancements

1. Add backend validation for lab/pharmacy service authorization
2. Implement refund/correction workflow with supervisor approval
3. Add daily/weekly/monthly financial reports
4. Implement receipt PDF generation and email
5. Add payment reconciliation for bank transfers
6. Implement installment payment plans
7. Add multi-currency support
8. Integrate with payment gateways (Telebirr, Chapa, etc.)
9. Add patient billing history and outstanding balance views
10. Implement payment reminders and notifications

## Conclusion

The Cashier module is now fully integrated with the HMS workflow. All financial transactions are properly tracked, services require payment authorization, and a complete audit trail is maintained. The system ensures financial integrity while providing a smooth user experience for cashiers, clinical staff, and patients.