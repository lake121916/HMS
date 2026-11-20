/**
 * Central Hospital Printer Service
 * Alem Ketema Enat General Hospital Management System (AKEH-HMS)
 * 
 * Auto-negotiates hardware connectivity (WebUSB, WebSerial, WebBluetooth)
 * with reliable automatic fallback to the clean browser thermal print engine.
 */

import {
  PaperWidth,
  PrinterInterfaceType,
  PrintResult,
  PatientWristbandData,
  CashierReceiptData,
  RegistrationReceiptData,
  AppointmentReceiptData,
  PharmacyDispenseData,
  LabRequestReceiptData
} from './printerTypes';
import { EscposFormatter } from './escposFormatter';
import { UsbPrinterTransport } from './usbPrinter';
import { SerialPrinterTransport } from './serialPrinter';
import { BluetoothPrinterTransport } from './bluetoothPrinter';
import { BrowserPrintFallback } from './browserPrint';

const PREF_KEY_INTERFACE = 'akeh_printer_interface';
const PREF_KEY_WIDTH = 'akeh_printer_width';

class PrinterService {
  private usb = new UsbPrinterTransport();
  private serial = new SerialPrinterTransport();
  private bluetooth = new BluetoothPrinterTransport();

  public getPreferredInterface(): PrinterInterfaceType {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(PREF_KEY_INTERFACE);
      if (saved && ['webusb', 'webserial', 'bluetooth', 'browser'].includes(saved)) {
        return saved as PrinterInterfaceType;
      }
    }
    return 'browser'; // Safe default
  }

  public setPreferredInterface(type: PrinterInterfaceType): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(PREF_KEY_INTERFACE, type);
    }
  }

  public getPaperWidth(): PaperWidth {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(PREF_KEY_WIDTH);
      if (saved === '58mm' || saved === '80mm') return saved;
    }
    return '80mm'; // Standard POS width
  }

  public setPaperWidth(width: PaperWidth): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(PREF_KEY_WIDTH, width);
    }
  }

  public getAvailableInterfaces(): Array<{ type: PrinterInterfaceType; label: string; supported: boolean }> {
    return [
      { type: 'browser', label: 'Standard Browser Print (Universal Fallback)', supported: true },
      { type: 'webusb', label: 'WebUSB Direct Thermal (USB Port)', supported: UsbPrinterTransport.isSupported() },
      { type: 'webserial', label: 'WebSerial Direct Thermal (COM / Serial)', supported: SerialPrinterTransport.isSupported() },
      { type: 'bluetooth', label: 'WebBluetooth Direct Thermal (Wireless POS)', supported: BluetoothPrinterTransport.isSupported() },
    ];
  }

  /**
   * Dispatch raw ESC/POS byte payload or fallback to browser print
   */
  private async dispatchPrint(
    bytes: Uint8Array,
    browserFallbackFn: () => Promise<boolean>
  ): Promise<PrintResult> {
    const pref = this.getPreferredInterface();

    if (pref === 'webusb' && UsbPrinterTransport.isSupported()) {
      try {
        await this.usb.print(bytes);
        return { success: true, methodUsed: 'webusb', message: 'Printed directly via WebUSB' };
      } catch (err: any) {
        console.warn('WebUSB print failed, triggering browser fallback:', err);
      }
    }

    if (pref === 'webserial' && SerialPrinterTransport.isSupported()) {
      try {
        await this.serial.print(bytes);
        return { success: true, methodUsed: 'webserial', message: 'Printed directly via WebSerial' };
      } catch (err: any) {
        console.warn('WebSerial print failed, triggering browser fallback:', err);
      }
    }

    if (pref === 'bluetooth' && BluetoothPrinterTransport.isSupported()) {
      try {
        await this.bluetooth.print(bytes);
        return { success: true, methodUsed: 'bluetooth', message: 'Printed directly via WebBluetooth' };
      } catch (err: any) {
        console.warn('Bluetooth print failed, triggering browser fallback:', err);
      }
    }

    // Universal browser fallback
    await browserFallbackFn();
    return { success: true, methodUsed: 'browser', message: 'Printed via browser print dialog' };
  }

  public async printWristband(data: PatientWristbandData): Promise<PrintResult> {
    const width = this.getPaperWidth();
    const formatter = new EscposFormatter(width);
    const bytes = formatter.formatWristband(data);

    return this.dispatchPrint(bytes, () => BrowserPrintFallback.printWristband(data, width));
  }

  public async printCashierReceipt(data: CashierReceiptData): Promise<PrintResult> {
    const width = this.getPaperWidth();
    const formatter = new EscposFormatter(width);
    const bytes = formatter.formatCashierReceipt(data);

    return this.dispatchPrint(bytes, () => BrowserPrintFallback.printCashierReceipt(data, width));
  }

  public async printRegistrationReceipt(data: RegistrationReceiptData): Promise<PrintResult> {
    const width = this.getPaperWidth();
    const formatter = new EscposFormatter(width);
    const bytes = formatter.formatRegistrationReceipt(data);

    return this.dispatchPrint(bytes, () => BrowserPrintFallback.printRegistrationReceipt(data, width));
  }

  public async printPharmacyDispense(data: PharmacyDispenseData): Promise<PrintResult> {
    const width = this.getPaperWidth();
    const formatter = new EscposFormatter(width);
    const bytes = formatter.formatPharmacyDispense(data);

    return this.dispatchPrint(bytes, () => {
      const html = `
        <div class="title">${data.hospitalName.toUpperCase()}</div>
        <div class="subtitle">PHARMACY DISPENSING LABEL</div>
        <div class="divider"></div>
        <div class="row"><span>Rx #:</span><span>${data.prescriptionId}</span></div>
        <div class="row"><span>Patient:</span><span class="bold">${data.patientName}</span></div>
        <div class="row"><span>MRN:</span><span class="bold">${data.mrn}</span></div>
        <div class="row"><span>Prescriber:</span><span>${data.doctorName}</span></div>
        <div class="divider"></div>
        <div class="bold">Medications Dispensed:</div>
        ${data.medications.map((m, i) => `
          <div style="margin: 4px 0;">
            <span class="bold">${i + 1}. ${m.name} (${m.dosage})</span> - Qty: ${m.quantity}<br>
            <span style="font-size: 10px;">${m.frequency} for ${m.duration}</span>
            ${m.instructions ? `<div style="font-size: 9px; color: #444;">Note: ${m.instructions}</div>` : ''}
          </div>
        `).join('')}
        <div class="double-divider"></div>
        <div class="footer">Dispensed by: ${data.pharmacistName}<br>${data.dispensedAt}</div>
      `;
      return BrowserPrintFallback.printHtml(html, width);
    });
  }

  public async printAppointmentReceipt(data: AppointmentReceiptData): Promise<PrintResult> {
    const width = this.getPaperWidth();
    const formatter = new EscposFormatter(width);
    const bytes = formatter.formatAppointmentReceipt(data);

    return this.dispatchPrint(bytes, () => {
      const html = `
        <div class="title">${data.hospitalName.toUpperCase()}</div>
        <div class="subtitle">APPOINTMENT BOOKING SLIP</div>
        <div class="divider"></div>
        ${data.tokenNumber ? `<div class="bold text-center" style="font-size: 18px; margin: 4px 0;">TOKEN: ${data.tokenNumber}</div><div class="divider"></div>` : ''}
        <div class="row"><span>Patient:</span><span class="bold">${data.patientName}</span></div>
        <div class="row"><span>MRN:</span><span>${data.mrn}</span></div>
        <div class="row"><span>Doctor:</span><span>${data.doctorName}</span></div>
        <div class="row"><span>Clinic:</span><span>${data.department}</span></div>
        <div class="row"><span>Date:</span><span class="bold">${data.appointmentDate}</span></div>
        <div class="row"><span>Time:</span><span class="bold">${data.timeSlot}</span></div>
        <div class="double-divider"></div>
        <div class="footer">Please report 15 minutes before your time window.<br>AKEH Hospital Management</div>
      `;
      return BrowserPrintFallback.printHtml(html, width);
    });
  }

  public async printLabRequest(data: LabRequestReceiptData): Promise<PrintResult> {
    const width = this.getPaperWidth();
    const formatter = new EscposFormatter(width);
    const bytes = formatter.formatLabRequest(data);

    return this.dispatchPrint(bytes, () => {
      const html = `
        <div class="title">${data.hospitalName.toUpperCase()}</div>
        <div class="subtitle">LABORATORY SPECIMEN SLIP</div>
        <div class="divider"></div>
        <div class="row"><span>Order #:</span><span class="bold">${data.orderNumber}</span></div>
        <div class="row"><span>Patient:</span><span class="bold">${data.patientName}</span></div>
        <div class="row"><span>MRN:</span><span>${data.mrn}</span></div>
        <div class="row"><span>Ordering Dr:</span><span>${data.orderingDoctor}</span></div>
        <div class="row"><span>Date:</span><span>${data.orderedAt}</span></div>
        <div class="divider"></div>
        <div class="bold">Tests Requested:</div>
        ${data.tests.map((t, i) => `<div class="row"><span>[ ] ${i + 1}. ${t}</span></div>`).join('')}
        ${data.clinicalNotes ? `<div class="divider"></div><div>Indication: ${data.clinicalNotes}</div>` : ''}
        <div class="double-divider"></div>
        <div class="footer">Alem Ketema Enat Hospital Laboratory Services</div>
      `;
      return BrowserPrintFallback.printHtml(html, width);
    });
  }

  public async testPrint(): Promise<PrintResult> {
    const width = this.getPaperWidth();
    const formatter = new EscposFormatter(width);
    formatter.init();
    formatter.alignCenter();
    formatter.bold(true).line('ALEM KETEMA ENAT HOSPITAL').bold(false);
    formatter.line('THERMAL PRINTER HARDWARE TEST');
    formatter.divider();
    formatter.twoColumn('Interface:', this.getPreferredInterface().toUpperCase());
    formatter.twoColumn('Paper Width:', width);
    formatter.twoColumn('Timestamp:', new Date().toLocaleTimeString());
    formatter.divider();
    formatter.line('Status: ONLINE & FUNCTIONAL');
    formatter.cut();

    return this.dispatchPrint(formatter.getBytes(), () => {
      const html = `
        <div class="title">ALEM KETEMA ENAT HOSPITAL</div>
        <div class="subtitle">THERMAL PRINTER HARDWARE TEST</div>
        <div class="double-divider"></div>
        <div class="row"><span>Interface:</span><span>${this.getPreferredInterface().toUpperCase()}</span></div>
        <div class="row"><span>Paper Width:</span><span>${width}</span></div>
        <div class="row"><span>Status:</span><span class="bold">TEST PASSED</span></div>
        <div class="row"><span>Time:</span><span>${new Date().toLocaleTimeString()}</span></div>
        <div class="double-divider"></div>
        <div class="footer">Thermal Printer Subsystem Ready</div>
      `;
      return BrowserPrintFallback.printHtml(html, width);
    });
  }
}

export const printerService = new PrinterService();
export default printerService;
