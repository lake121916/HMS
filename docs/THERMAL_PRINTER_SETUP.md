# Direct Thermal Printer Hardware Integration Guide
## Alem Ketema Enat General Hospital Management System (AKEH-HMS)

### 1. Overview
The AKEH-HMS printing subsystem supports direct ESC/POS hardware thermal printing at Reception, Cashier, Triage, and Pharmacy desks, alongside an automatic zero-driver browser printing fallback.

---

### 2. Architecture & Transport Layers

```
                          ┌───────────────────────────┐
                          │     printerService.ts     │
                          └─────────────┬─────────────┘
                                        │
          ┌─────────────────┬───────────┴───────────┬─────────────────┐
          │                 │                       │                 │
   ┌──────▼──────┐   ┌──────▼──────┐         ┌──────▼──────┐   ┌──────▼──────┐
   │   WebUSB    │   │  WebSerial  │         │WebBluetooth │   │   Browser   │
   │  Transport  │   │  Transport  │         │  Transport  │   │  Fallback   │
   └─────────────┘   └─────────────┘         └─────────────┘   └─────────────┘
```

1. **WebUSB (`usbPrinter.ts`)**:
   - Communicates with USB thermal POS printers (USB Class 7) via `navigator.usb`.
   - Requires modern Chromium browsers (Chrome, Edge, Opera) over HTTPS / localhost.
2. **WebSerial (`serialPrinter.ts`)**:
   - Communicates with virtual COM ports and RS-232 serial thermal printers at 9600 / 115200 baud via `navigator.serial`.
3. **WebBluetooth (`bluetoothPrinter.ts`)**:
   - Connects to portable wireless Bluetooth belt printers used by mobile nurses.
4. **Browser Fallback (`browserPrint.ts`)**:
   - Universal fallback for Firefox, Safari, and unsupported mobile browsers.
   - Generates an isolated iframe formatted with exact `@page { size: 80mm auto; margin: 0; }` CSS.

---

### 3. Supported Clinical & Financial Documents

| Document Type | Target Counter | Features & Payloads |
| :--- | :--- | :--- |
| **Patient Wristband** | Reception / Admission | Encrypted SHA-256 HMAC QR code, MRN, Encounter number, Allergies badge |
| **Cashier Payment Receipt** | Cashier POS | Itemized charges, Subtotal, Discount, TeleBirr / CBE Birr / Cash tender, Change due, Z-Report alignment |
| **Registration Slip** | Reception | Alphanumeric queue token (`A-001`), Patient demographics, Clinic assignment |
| **Pharmacy Dispense Label** | Pharmacy | Medication names, dosages, directions, warnings, Pharmacist sign-off |
| **Appointment Booking Slip** | Front Desk | Time window, assigned physician, clinic room number |
| **Laboratory Specimen Slip** | Phlebotomy / Lab | Ordered investigations, clinical indications, ordering doctor |

---

### 4. Hardware Configuration & Testing

1. **Accessing Settings**:
   - Click the **Account Settings** cog icon in the top header bar of `GlobalNavigation.tsx`.
   - Select **Thermal Printer Setup**.
2. **Select Transport**:
   - Choose **Standard Browser Print**, **WebUSB**, **WebSerial**, or **WebBluetooth**.
3. **Select Paper Width**:
   - **80 mm (Standard)**: Recommended for Cashier counters and Inpatient receipts (48 columns).
   - **58 mm (Compact)**: Recommended for Wristband printers and mobile belt printers (32 columns).
4. **Click "Test Print Slip"**:
   - Transmits an ESC/POS hardware test sequence directly to verify paper feed, alignment, and auto-cut functionality.

---

### 5. Troubleshooting

* **Permission Denied in WebUSB**: Ensure browser site permissions allow "USB Devices" and you are on an HTTPS connection.
* **Paper Cuts Prematurely**: Ensure printer DIP switches or driver settings do not enforce fixed-length page cuts.
* **Browser Fallback Font Size**: If receipts appear too small on non-thermal office laser printers, switch paper width setting to 80mm.
