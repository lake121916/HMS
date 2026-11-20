# Automated End-to-End (E2E) Testing Guide
## Alem Ketema Enat General Hospital Management System (AKEH-HMS)

### 1. Overview
AKEH-HMS uses **Playwright** for automated end-to-end regression testing. The test suite simulates complete clinical, administrative, and cashier workflows across desktop, tablet, and mobile device viewports.

---

### 2. Test Architecture & Structure

```
frontend/
  ├── e2e/
  │    ├── auth.spec.ts              # Login, logout, session persistence & route guards
  │    ├── patient-journey.spec.ts   # Intake -> Triage -> OPD -> Doctor -> Cashier -> Pharmacy
  │    ├── clinical-safety.spec.ts   # CDSS, allergies, duty gating, QR verification
  │    ├── cashier-workflow.spec.ts  # Invoices, TeleBirr, CBE Birr, printer setup
  │    └── responsive.spec.ts        # 320px, 375px, 390px, 430px, tablet, desktop
  └── playwright.config.ts          # Playwright runner configuration & multi-viewport matrix
```

---

### 3. Executing E2E Tests

#### A. Run All Tests Headless
```bash
# From root directory:
npm run test:e2e

# Or from frontend directory:
cd frontend
npm run test:e2e
```

#### B. Run with Interactive UI Mode
```bash
cd frontend
npx playwright test --ui
```

#### C. Run a Specific Test Suite
```bash
cd frontend
npx playwright test e2e/responsive.spec.ts
```

#### D. View HTML Test Execution Report
```bash
cd frontend
npx playwright show-report
```

---

### 4. Responsive Viewport Testing Matrix

The `responsive.spec.ts` suite verifies that no horizontal scroll overflow or UI clipping occurs across common healthcare device viewports:

| Viewport | Dimensions | Target Device Category | Verification Criteria |
| :--- | :--- | :--- | :--- |
| **320px** | 320 x 600 | Extreme compact smartphone (iPhone SE 1st gen) | Zero scroll bleed (`scrollWidth === clientWidth`) |
| **375px** | 375 x 667 | Standard compact smartphone (iPhone SE 2nd gen) | Zero scroll bleed, readable touch buttons |
| **390px** | 390 x 844 | Modern mobile device (iPhone 12 / 13 / 14) | 5-touch bottom mobile navigation dock visible |
| **430px** | 430 x 932 | Large mobile device (iPhone 14 / 15 Pro Max) | Zero overflow, readable patient cards |
| **Tablet** | 768 x 1024 | Ward tablet / iPad | Responsive touch grid, drawer navigation |
| **Desktop** | 1280 x 800 | Hospital workstation monitor | Collapsible midnight navy sidebar visible |

---

### 5. Test Isolation & Safety Rules

1. **Production Database Protection**: E2E tests must **never** run against the production database (`postgres://...onrender.com`).
2. **Payment Mocking**: Electronic payment verifications (TeleBirr and CBE Birr) are executed against test environments; real monetary transactions are strictly excluded from automated runs.
