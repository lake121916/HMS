/**
 * ESC/POS Command Formatter & Thermal Byte Generator
 * Alem Ketema Enat General Hospital Management System (AKEH-HMS)
 */

import {
  PaperWidth,
  PatientWristbandData,
  CashierReceiptData,
  RegistrationReceiptData,
  AppointmentReceiptData,
  PharmacyDispenseData,
  LabRequestReceiptData
} from './printerTypes';

export class EscposFormatter {
  private buffer: number[] = [];
  private widthChars: number;

  constructor(paperWidth: PaperWidth = '80mm') {
    this.widthChars = paperWidth === '58mm' ? 32 : 48;
    this.init();
  }

  public init(): this {
    this.buffer.push(0x1b, 0x40); // ESC @ (Initialize printer)
    return this;
  }

  public alignLeft(): this {
    this.buffer.push(0x1b, 0x61, 0x00); // ESC a 0
    return this;
  }

  public alignCenter(): this {
    this.buffer.push(0x1b, 0x61, 0x01); // ESC a 1
    return this;
  }

  public alignRight(): this {
    this.buffer.push(0x1b, 0x61, 0x02); // ESC a 2
    return this;
  }

  public bold(on: boolean): this {
    this.buffer.push(0x1b, 0x45, on ? 0x01 : 0x00); // ESC E n
    return this;
  }

  public textSize(widthMult: number = 1, heightMult: number = 1): this {
    const w = Math.min(Math.max(widthMult - 1, 0), 7);
    const h = Math.min(Math.max(heightMult - 1, 0), 7);
    const n = (w << 4) | h;
    this.buffer.push(0x1d, 0x21, n); // GS ! n
    return this;
  }

  public text(str: string): this {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    for (let i = 0; i < bytes.length; i++) {
      this.buffer.push(bytes[i]);
    }
    return this;
  }

  public line(str: string = ''): this {
    this.text(str);
    this.buffer.push(0x0a); // LF
    return this;
  }

  public divider(char: string = '-'): this {
    this.line(char.repeat(this.widthChars));
    return this;
  }

  public doubleDivider(): this {
    return this.divider('=');
  }

  public twoColumn(left: string, right: string): this {
    const spaceCount = this.widthChars - left.length - right.length;
    if (spaceCount <= 0) {
      this.line(`${left} ${right}`);
    } else {
      this.line(`${left}${' '.repeat(spaceCount)}${right}`);
    }
    return this;
  }

  public qrCode(content: string, size: number = 5): this {
    const encoder = new TextEncoder();
    const dataBytes = Array.from(encoder.encode(content));
    const len = dataBytes.length + 3;
    const pL = len % 256;
    const pH = Math.floor(len / 256);

    // 1. Model: QR Code Model 2
    this.buffer.push(0x1d, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00);
    // 2. Module size: (size 1 to 16)
    this.buffer.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, Math.min(Math.max(size, 2), 10));
    // 3. Error correction level: M (15%)
    this.buffer.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x31);
    // 4. Store data
    this.buffer.push(0x1d, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30, ...dataBytes);
    // 5. Print QR code
    this.buffer.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30);
    this.feed(1);
    return this;
  }

  public feed(lines: number = 3): this {
    this.buffer.push(0x1b, 0x64, lines); // ESC d n
    return this;
  }

  public cut(): this {
    this.feed(3);
    this.buffer.push(0x1d, 0x56, 0x41, 0x03); // GS V A 3 (Full/Partial cut)
    return this;
  }

  public getBytes(): Uint8Array {
    return new Uint8Array(this.buffer);
  }

  // ══════════════════════════════════════════════════════════════════
  // PRE-CONFIGURED HOSPITAL TEMPLATES
  // ══════════════════════════════════════════════════════════════════

  public formatWristband(data: PatientWristbandData): Uint8Array {
    this.init();
    this.alignCenter();
    this.bold(true).textSize(1, 1).line(data.hospitalName.toUpperCase()).bold(false).textSize(1, 1);
    this.line('PATIENT IDENTIFICATION WRISTBAND');
    this.divider();

    this.bold(true).textSize(2, 2).line(data.patientName).bold(false).textSize(1, 1);
    this.line(`MRN: ${data.mrn}`);
    this.line(`Enc: ${data.encounterNumber} | Age: ${data.age} | ${data.gender}`);
    if (data.bloodType) this.line(`Blood Type: ${data.bloodType}`);
    if (data.allergies && data.allergies.toLowerCase() !== 'none') {
      this.bold(true).line(`ALLERGIES: ${data.allergies.toUpperCase()}`).bold(false);
    }
    this.divider();

    // Cryptographic QR payload
    this.alignCenter();
    this.qrCode(data.qrPayload, 6);
    this.line('Scan for bedside clinical verification');
    this.line(`Issued: ${data.registrationDate}`);
    this.cut();
    return this.getBytes();
  }

  public formatCashierReceipt(data: CashierReceiptData): Uint8Array {
    this.init();
    this.alignCenter();
    this.bold(true).textSize(1, 2).line(data.hospitalName.toUpperCase()).bold(false).textSize(1, 1);
    this.line('OFFICIAL PAYMENT RECEIPT');
    this.doubleDivider();

    this.alignLeft();
    this.twoColumn('Receipt #:', data.receiptNumber);
    this.twoColumn('Invoice #:', data.invoiceNumber);
    this.twoColumn('Patient:', data.patientName);
    this.twoColumn('MRN:', data.mrn);
    this.twoColumn('Date:', data.timestamp);
    this.twoColumn('Method:', data.paymentMethod.toUpperCase());
    if (data.referenceNumber) {
      this.twoColumn('Ref/Trans ID:', data.referenceNumber);
    }
    this.divider();

    // Itemized table
    this.bold(true);
    this.twoColumn('Item Description', 'Amount');
    this.bold(false);
    this.divider();

    for (const item of data.items) {
      this.twoColumn(
        `${item.quantity > 1 ? `${item.quantity}x ` : ''}${item.name.substring(0, 24)}`,
        `ETB ${item.total.toFixed(2)}`
      );
    }

    this.divider();
    this.twoColumn('Subtotal:', `ETB ${data.subtotal.toFixed(2)}`);
    if (data.discount > 0) {
      this.twoColumn('Discount:', `-ETB ${data.discount.toFixed(2)}`);
    }
    this.bold(true).textSize(1, 2);
    this.twoColumn('TOTAL PAID:', `ETB ${data.totalAmount.toFixed(2)}`);
    this.bold(false).textSize(1, 1);

    if (data.cashReceived !== undefined && data.changeGiven !== undefined) {
      this.twoColumn('Cash Tendered:', `ETB ${data.cashReceived.toFixed(2)}`);
      this.twoColumn('Change Due:', `ETB ${data.changeGiven.toFixed(2)}`);
    }

    this.divider();
    this.alignCenter();
    this.line(`Served by: ${data.cashierName}`);
    this.line('Thank you for choosing AKEH General Hospital');
    this.line('Keep this receipt for pharmacy & clinical exit');
    this.cut();
    return this.getBytes();
  }

  public formatRegistrationReceipt(data: RegistrationReceiptData): Uint8Array {
    this.init();
    this.alignCenter();
    this.bold(true).textSize(1, 1).line(data.hospitalName.toUpperCase()).bold(false);
    this.line('OUTPATIENT REGISTRATION SLIP');
    this.doubleDivider();

    if (data.tokenNumber) {
      this.bold(true).textSize(2, 2).line(`TOKEN: ${data.tokenNumber}`).bold(false).textSize(1, 1);
      this.divider();
    }

    this.alignLeft();
    this.twoColumn('Patient Name:', data.patientName);
    this.twoColumn('MRN:', data.mrn);
    this.twoColumn('DOB / Age:', data.dateOfBirth);
    this.twoColumn('Gender:', data.gender);
    this.twoColumn('Phone:', data.phone);
    this.twoColumn('Assigned Clinic:', data.intakeDepartment);
    this.twoColumn('Registered By:', data.receptionistName);
    this.twoColumn('Date & Time:', data.registrationDate);

    if (data.qrPayload) {
      this.divider();
      this.alignCenter();
      this.qrCode(data.qrPayload, 5);
      this.line('Present this token at Triage & Consultation');
    }

    this.cut();
    return this.getBytes();
  }

  public formatPharmacyDispense(data: PharmacyDispenseData): Uint8Array {
    this.init();
    this.alignCenter();
    this.bold(true).line(data.hospitalName.toUpperCase()).bold(false);
    this.line('PHARMACY DISPENSING LABEL');
    this.divider();

    this.alignLeft();
    this.twoColumn('Rx ID:', `#${data.prescriptionId}`);
    this.twoColumn('Patient:', data.patientName);
    this.twoColumn('MRN:', data.mrn);
    this.twoColumn('Prescribing Dr:', data.doctorName);
    this.twoColumn('Dispensed At:', data.dispensedAt);
    this.divider();

    this.bold(true).line('DISPENSED MEDICATIONS:').bold(false);
    data.medications.forEach((med, i) => {
      this.bold(true).line(`${i + 1}. ${med.name} (${med.dosage}) - Qty: ${med.quantity}`).bold(false);
      this.line(`   Take: ${med.frequency} for ${med.duration}`);
      if (med.instructions) {
        this.line(`   Notes: ${med.instructions}`);
      }
    });

    this.divider();
    this.alignCenter();
    this.line(`Verified by Pharmacist: ${data.pharmacistName}`);
    this.line('Please take medications strictly as directed');
    this.cut();
    return this.getBytes();
  }

  public formatAppointmentReceipt(data: AppointmentReceiptData): Uint8Array {
    this.init();
    this.alignCenter();
    this.bold(true).line(data.hospitalName.toUpperCase()).bold(false);
    this.line('APPOINTMENT BOOKING SLIP');
    this.divider();

    if (data.tokenNumber) {
      this.bold(true).textSize(2, 2).line(data.tokenNumber).bold(false).textSize(1, 1);
      this.divider();
    }

    this.alignLeft();
    this.twoColumn('Patient:', data.patientName);
    this.twoColumn('MRN:', data.mrn);
    this.twoColumn('Doctor:', data.doctorName);
    this.twoColumn('Department:', data.department);
    this.twoColumn('Appointment Date:', data.appointmentDate);
    this.twoColumn('Time Window:', data.timeSlot);
    this.twoColumn('Booking Time:', data.bookedAt);
    this.divider();

    this.alignCenter();
    this.line('Please arrive 15 minutes before your time window');
    this.cut();
    return this.getBytes();
  }

  public formatLabRequest(data: LabRequestReceiptData): Uint8Array {
    this.init();
    this.alignCenter();
    this.bold(true).line(data.hospitalName.toUpperCase()).bold(false);
    this.line('LABORATORY SPECIMEN ROUTING SLIP');
    this.divider();

    this.alignLeft();
    this.twoColumn('Lab Order #:', data.orderNumber);
    this.twoColumn('Patient:', data.patientName);
    this.twoColumn('MRN:', data.mrn);
    this.twoColumn('Ordering Dr:', data.orderingDoctor);
    this.twoColumn('Ordered At:', data.orderedAt);
    this.divider();

    this.bold(true).line('REQUESTED INVESTIGATIONS:').bold(false);
    data.tests.forEach((t, i) => {
      this.line(`[ ] ${i + 1}. ${t}`);
    });

    if (data.clinicalNotes) {
      this.divider();
      this.line(`Clinical Indication: ${data.clinicalNotes}`);
    }

    this.cut();
    return this.getBytes();
  }
}
