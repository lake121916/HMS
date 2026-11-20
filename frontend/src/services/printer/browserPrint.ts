/**
 * Browser Print Fallback Transport
 * Alem Ketema Enat General Hospital Management System (AKEH-HMS)
 * 
 * Generates an isolated, thermal-formatted print frame for standard window.print
 * supporting 58mm and 80mm thermal receipt and wristband media.
 */

import {
  PaperWidth,
  PatientWristbandData,
  CashierReceiptData,
  RegistrationReceiptData
} from './printerTypes';

export class BrowserPrintFallback {
  public static printHtml(htmlContent: string, paperWidth: PaperWidth = '80mm'): Promise<boolean> {
    return new Promise((resolve) => {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);

      const widthMm = paperWidth === '58mm' ? '58mm' : '80mm';

      const doc = iframe.contentWindow?.document;
      if (!doc) {
        document.body.removeChild(iframe);
        resolve(false);
        return;
      }

      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>AKEH HMS Print</title>
          <style>
            @page {
              size: ${widthMm} auto;
              margin: 0;
            }
            body {
              font-family: 'Courier New', Courier, monospace;
              width: ${widthMm};
              margin: 0;
              padding: 6px;
              color: #000;
              background: #fff;
              font-size: ${paperWidth === '58mm' ? '10px' : '12px'};
              line-height: 1.3;
            }
            .text-center { text-align: center; }
            .text-left { text-align: left; }
            .text-right { text-align: right; }
            .bold { font-weight: bold; }
            .title { font-size: ${paperWidth === '58mm' ? '12px' : '15px'}; font-weight: bold; text-align: center; margin-bottom: 2px; }
            .subtitle { font-size: ${paperWidth === '58mm' ? '9px' : '11px'}; text-align: center; margin-bottom: 6px; }
            .divider { border-top: 1px dashed #000; margin: 4px 0; }
            .double-divider { border-top: 2px solid #000; margin: 4px 0; }
            .row { display: flex; justify-content: space-between; margin-bottom: 2px; }
            .item-col-left { text-align: left; max-width: 65%; word-break: break-word; }
            .item-col-right { text-align: right; }
            .qr-container { text-align: center; margin: 8px 0; }
            .qr-code { max-width: ${paperWidth === '58mm' ? '120px' : '150px'}; height: auto; }
            .footer { font-size: 9px; text-align: center; margin-top: 8px; }
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
        </html>
      `);
      doc.close();

      iframe.contentWindow?.focus();
      setTimeout(() => {
        try {
          iframe.contentWindow?.print();
        } catch (e) {
          console.error('Browser print error:', e);
        }
        setTimeout(() => {
          document.body.removeChild(iframe);
          resolve(true);
        }, 500);
      }, 300);
    });
  }

  public static printWristband(data: PatientWristbandData, paperWidth: PaperWidth = '80mm'): Promise<boolean> {
    const html = `
      <div class="title">${data.hospitalName.toUpperCase()}</div>
      <div class="subtitle">PATIENT IDENTIFICATION WRISTBAND</div>
      <div class="double-divider"></div>
      <div class="text-center bold" style="font-size: 16px; margin: 4px 0;">${data.patientName}</div>
      <div class="row"><span class="bold">MRN:</span><span class="bold">${data.mrn}</span></div>
      <div class="row"><span>Encounter:</span><span>${data.encounterNumber}</span></div>
      <div class="row"><span>Age / Gender:</span><span>${data.age} yrs / ${data.gender}</span></div>
      ${data.bloodType ? `<div class="row"><span>Blood Type:</span><span>${data.bloodType}</span></div>` : ''}
      ${data.allergies && data.allergies.toLowerCase() !== 'none' ? `<div class="bold text-center" style="background: #000; color: #fff; padding: 2px; margin: 4px 0;">ALLERGIES: ${data.allergies.toUpperCase()}</div>` : ''}
      <div class="divider"></div>
      <div class="qr-container">
        <img class="qr-code" src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(data.qrPayload)}" alt="QR Wristband" />
        <div style="font-size: 9px; margin-top: 2px;">Positive Patient Identity Check</div>
      </div>
      <div class="divider"></div>
      <div class="footer">Issued: ${data.registrationDate}<br>Alem Ketema Enat Hospital Information System</div>
    `;
    return this.printHtml(html, paperWidth);
  }

  public static printCashierReceipt(data: CashierReceiptData, paperWidth: PaperWidth = '80mm'): Promise<boolean> {
    const itemsHtml = data.items.map(item => `
      <div class="row">
        <span class="item-col-left">${item.quantity > 1 ? `${item.quantity}x ` : ''}${item.name}</span>
        <span class="item-col-right">ETB ${item.total.toFixed(2)}</span>
      </div>
    `).join('');

    const html = `
      <div class="title">${data.hospitalName.toUpperCase()}</div>
      <div class="subtitle">OFFICIAL PAYMENT RECEIPT</div>
      <div class="double-divider"></div>
      <div class="row"><span>Receipt #:</span><span class="bold">${data.receiptNumber}</span></div>
      <div class="row"><span>Invoice #:</span><span>${data.invoiceNumber}</span></div>
      <div class="row"><span>Patient:</span><span>${data.patientName}</span></div>
      <div class="row"><span>MRN:</span><span>${data.mrn}</span></div>
      <div class="row"><span>Date:</span><span>${data.timestamp}</span></div>
      <div class="row"><span>Method:</span><span class="bold">${data.paymentMethod.toUpperCase()}</span></div>
      ${data.referenceNumber ? `<div class="row"><span>Ref / Trans ID:</span><span>${data.referenceNumber}</span></div>` : ''}
      <div class="divider"></div>
      <div class="row bold"><span>Item Description</span><span>Amount</span></div>
      <div class="divider"></div>
      ${itemsHtml}
      <div class="divider"></div>
      <div class="row"><span>Subtotal:</span><span>ETB ${data.subtotal.toFixed(2)}</span></div>
      ${data.discount > 0 ? `<div class="row"><span>Discount:</span><span>-ETB ${data.discount.toFixed(2)}</span></div>` : ''}
      <div class="row bold" style="font-size: 14px; margin-top: 4px;">
        <span>TOTAL PAID:</span>
        <span>ETB ${data.totalAmount.toFixed(2)}</span>
      </div>
      ${data.cashReceived !== undefined && data.changeGiven !== undefined ? `
        <div class="row"><span>Cash Received:</span><span>ETB ${data.cashReceived.toFixed(2)}</span></div>
        <div class="row"><span>Change Due:</span><span>ETB ${data.changeGiven.toFixed(2)}</span></div>
      ` : ''}
      <div class="double-divider"></div>
      <div class="footer">
        Served by: ${data.cashierName}<br>
        Thank you for choosing AKEH General Hospital.<br>
        Please retain receipt for clinical exit.
      </div>
    `;
    return this.printHtml(html, paperWidth);
  }

  public static printRegistrationReceipt(data: RegistrationReceiptData, paperWidth: PaperWidth = '80mm'): Promise<boolean> {
    const html = `
      <div class="title">${data.hospitalName.toUpperCase()}</div>
      <div class="subtitle">OUTPATIENT REGISTRATION SLIP</div>
      <div class="double-divider"></div>
      ${data.tokenNumber ? `<div class="bold text-center" style="font-size: 20px; margin: 4px 0;">TOKEN: ${data.tokenNumber}</div><div class="divider"></div>` : ''}
      <div class="row"><span>Patient:</span><span class="bold">${data.patientName}</span></div>
      <div class="row"><span>MRN:</span><span class="bold">${data.mrn}</span></div>
      <div class="row"><span>DOB / Age:</span><span>${data.dateOfBirth}</span></div>
      <div class="row"><span>Gender:</span><span>${data.gender}</span></div>
      <div class="row"><span>Phone:</span><span>${data.phone}</span></div>
      <div class="row"><span>Clinic:</span><span class="bold">${data.intakeDepartment}</span></div>
      <div class="row"><span>Date:</span><span>${data.registrationDate}</span></div>
      <div class="row"><span>Registered By:</span><span>${data.receptionistName}</span></div>
      ${data.qrPayload ? `
        <div class="divider"></div>
        <div class="qr-container">
          <img class="qr-code" src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(data.qrPayload)}" alt="QR Token" />
          <div style="font-size: 9px;">Present ticket at Triage & Consultation</div>
        </div>
      ` : ''}
      <div class="double-divider"></div>
      <div class="footer">Alem Ketema Enat General Hospital</div>
    `;
    return this.printHtml(html, paperWidth);
  }
}
