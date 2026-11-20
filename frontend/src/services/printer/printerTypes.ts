/**
 * Thermal Printer Types & Interfaces
 * Alem Ketema Enat General Hospital Management System (AKEH-HMS)
 */

export type PaperWidth = '58mm' | '80mm';

export type PrinterInterfaceType = 'webusb' | 'webserial' | 'bluetooth' | 'browser';

export interface PrinterDevice {
  name: string;
  type: PrinterInterfaceType;
  connected: boolean;
  rawDevice?: any;
}

export type DocumentType =
  | 'patient_registration'
  | 'patient_wristband'
  | 'appointment_receipt'
  | 'cashier_receipt'
  | 'pharmacy_dispense'
  | 'lab_request'
  | 'admission_card';

export interface PatientWristbandData {
  hospitalName: string;
  patientName: string;
  mrn: string;
  encounterNumber: string;
  age: number | string;
  gender: string;
  bloodType?: string;
  allergies?: string;
  registrationDate: string;
  qrPayload: string; // Cryptographic SHA-256 HMAC token
}

export interface CashierReceiptData {
  hospitalName: string;
  receiptNumber: string;
  invoiceNumber: string;
  patientName: string;
  mrn: string;
  encounterNumber?: string;
  paymentMethod: 'cash' | 'telebirr' | 'cbe_birr' | 'chapa' | 'card';
  referenceNumber?: string;
  items: Array<{
    name: string;
    department?: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  discount: number;
  totalAmount: number;
  cashReceived?: number;
  changeGiven?: number;
  cashierName: string;
  timestamp: string;
}

export interface RegistrationReceiptData {
  hospitalName: string;
  patientName: string;
  mrn: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  intakeDepartment: string;
  tokenNumber?: string;
  registrationDate: string;
  receptionistName: string;
  qrPayload?: string;
}

export interface AppointmentReceiptData {
  hospitalName: string;
  appointmentId: number | string;
  patientName: string;
  mrn: string;
  doctorName: string;
  department: string;
  appointmentDate: string;
  timeSlot: string;
  tokenNumber?: string;
  bookedAt: string;
}

export interface PharmacyDispenseData {
  hospitalName: string;
  prescriptionId: number | string;
  patientName: string;
  mrn: string;
  doctorName: string;
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    quantity: number;
    instructions?: string;
  }>;
  pharmacistName: string;
  dispensedAt: string;
}

export interface LabRequestReceiptData {
  hospitalName: string;
  orderNumber: string;
  patientName: string;
  mrn: string;
  orderingDoctor: string;
  tests: string[];
  clinicalNotes?: string;
  orderedAt: string;
}

export interface AdmissionCardData {
  hospitalName: string;
  admissionId: number | string;
  patientName: string;
  mrn: string;
  wardName: string;
  bedNumber: string;
  admittingDoctor: string;
  admittedAt: string;
  emergencyContact: string;
}

export interface PrintResult {
  success: boolean;
  methodUsed: PrinterInterfaceType;
  message?: string;
  error?: string;
}
