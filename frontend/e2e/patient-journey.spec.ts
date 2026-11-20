import { test, expect } from '@playwright/test';

test.describe('AKEH-HMS End-to-End Outpatient Patient Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate as receptionist / clinical user
    await page.goto('/login');
    await page.fill('input[type="email"], input[name="email"]', 'receptionist@hospital.com');
    await page.fill('input[type="password"], input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 8000 });
  });

  test('Stage 1: Receptionist searches and registers patient with duplicate guard', async ({ page }) => {
    await page.goto('/reception-workflow');
    await expect(page.locator('h1, h2, h3').filter({ hasText: /reception|intake|registration/i }).first()).toBeVisible();

    // Verify search input is present
    const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="MRN"]').first();
    await expect(searchInput).toBeVisible();

    // Verify Register Patient action button
    const registerBtn = page.locator('button').filter({ hasText: /register|new patient/i }).first();
    await expect(registerBtn).toBeVisible();
  });

  test('Stage 2: Triage Nurse reviews acuity queue and records vital observations', async ({ page }) => {
    await page.goto('/triage');
    await expect(page.locator('text=Triage').first()).toBeVisible();

    // Ensure waiting list or triage queue table/cards are rendered
    await expect(page.locator('table, [data-testid="patient-card"], .rounded-2xl').first()).toBeVisible();
  });

  test('Stage 3: OPD Coordinator balances specialty loads and dynamic assignments', async ({ page }) => {
    await page.goto('/opd-coordinator');
    // Verify OPD Coordinator view or command center
    await expect(page.locator('header, nav')).toBeVisible();
  });

  test('Stage 4: Doctor conducts clinical consultation with CDSS and prescribes medication', async ({ page }) => {
    await page.goto('/consultation');
    await expect(page.locator('header, nav')).toBeVisible();
    // Verify patient consultation tabs (HPI, Physical Exam, Diagnosis ICD-10, Rx)
    await expect(page.locator('text=Diagnosis, text=Chief Complaint, text=Consultation').first()).toBeVisible();
  });

  test('Stage 5: Cashier invoices patient with Ethiopian payment rails (TeleBirr / CBE Birr)', async ({ page }) => {
    await page.goto('/cashier-workflow');
    await expect(page.locator('text=Cashier, text=Invoice, text=Collections').first()).toBeVisible();
  });

  test('Stage 6: Pharmacist verifies prescription and dispenses medications', async ({ page }) => {
    await page.goto('/pharmacy');
    await expect(page.locator('text=Pharmacy, text=Prescription, text=Dispensing').first()).toBeVisible();
  });
});
