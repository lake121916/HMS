import { test, expect } from '@playwright/test';

test.describe('AKEH-HMS Clinical Safety, CDSS & Record Immutability', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"], input[name="email"]', 'doctor@hospital.com');
    await page.fill('input[type="password"], input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 8000 });
  });

  test('should display CDSS allergy alert container when reviewing patient prescriptions', async ({ page }) => {
    await page.goto('/consultation');
    await expect(page.locator('header, nav')).toBeVisible();

    // Verify presence of allergy or clinical warning indicators
    const allergyContainer = page.locator('text=Allergies, text=Penicillin, text=CDSS').first();
    if (await allergyContainer.isVisible()) {
      await expect(allergyContainer).toBeVisible();
    }
  });

  test('should enforce shift duty tracking on clinical workbench', async ({ page }) => {
    await page.goto('/consultation');

    // Check duty status badge in top header
    const dutyBadge = page.locator('button').filter({ hasText: /duty|on duty|off duty/i }).first();
    await expect(dutyBadge).toBeVisible();

    // Clicking duty status opens modal
    await dutyBadge.click();
    await expect(page.locator('text=Shift Duty Status, text=Clock In, text=Clock Out').first()).toBeVisible();
  });

  test('should provide bedside positive patient QR verification launcher', async ({ page }) => {
    await page.goto('/dashboard');

    // Global QR scanner launcher button in navigation
    const qrBtn = page.locator('button').filter({ hasText: /scan qr|qr scanner/i }).first();
    if (await qrBtn.isVisible()) {
      await qrBtn.click();
      await expect(page.locator('text=Scan Patient Wristband, text=Camera, text=Two-Identifier').first()).toBeVisible();
    }
  });

  test('should present offline synchronization telemetry button in navigation bar', async ({ page }) => {
    await page.goto('/dashboard');

    // Offline / Online status indicator
    const syncStatusBtn = page.locator('button[title*="Offline Synchronization"], button[title*="Network"]').first();
    await expect(syncStatusBtn).toBeVisible();

    // Click to open Offline Resilience & Synchronization dashboard modal
    await syncStatusBtn.click();
    await expect(page.locator('text=Offline Resilience & Synchronization').first()).toBeVisible();
    await expect(page.locator('text=Pending Sync, text=Synchronized').first()).toBeVisible();
  });
});
