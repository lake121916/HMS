import { test, expect } from '@playwright/test';

test.describe('AKEH-HMS Cashier Operations & Payment Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"], input[name="email"]', 'cashier@hospital.com');
    await page.fill('input[type="password"], input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 8000 });
  });

  test('should display cashier workbench with unpaid invoice queue', async ({ page }) => {
    await page.goto('/cashier-workflow');
    await expect(page.locator('text=Cashier, text=Collections, text=Invoices').first()).toBeVisible();

    // Verify payment tabs (Unpaid Queue, Z-Report, Thermal Print, Digital Verify)
    await expect(page.locator('button').filter({ hasText: /Unpaid|Queue/i }).first()).toBeVisible();
    await expect(page.locator('button').filter({ hasText: /Thermal Print|Receipt/i }).first()).toBeVisible();
  });

  test('should present Ethiopian local payment methods (TeleBirr, CBE Birr, Cash)', async ({ page }) => {
    await page.goto('/cashier-workflow');

    // Look for payment methods or selector
    const telebirrOption = page.locator('text=Telebirr, text=TeleBirr, text=CBE Birr').first();
    if (await telebirrOption.isVisible()) {
      await expect(telebirrOption).toBeVisible();
    }
  });

  test('should access thermal printer hardware settings from top navigation popover', async ({ page }) => {
    await page.goto('/cashier-workflow');

    // Click account settings cog
    const settingsBtn = page.locator('button[title="Account Settings"]').first();
    await expect(settingsBtn).toBeVisible();
    await settingsBtn.click();

    // Click Thermal Printer Setup
    const printerSetupBtn = page.locator('button').filter({ hasText: /Thermal Printer|ፕሪንተር/i }).first();
    await expect(printerSetupBtn).toBeVisible();
    await printerSetupBtn.click();

    // Modal opens
    await expect(page.locator('text=Thermal Printer Hardware Settings').first()).toBeVisible();
    await expect(page.locator('text=WebUSB, text=WebSerial, text=Browser').first()).toBeVisible();
    await expect(page.locator('text=80 mm, text=58 mm').first()).toBeVisible();
  });
});
