import { test, expect } from '@playwright/test';

test.describe('AKEH-HMS Authentication & Role Route Guards', () => {
  test('should render the login portal with hospital branding and security inputs', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/Alem Ketema|Hospital|AKEH/i);
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should display validation feedback for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"], input[name="email"]', 'nonexistent@hospital.com');
    await page.fill('input[type="password"], input[name="password"]', 'WrongPassword123!');
    await page.click('button[type="submit"]');

    // Should stay on login and present error notification
    await expect(page).toHaveURL(/.*login/);
    const alertMessage = page.locator('.text-rose-400, .text-rose-500, [role="alert"], .bg-red-500');
    await expect(alertMessage.first()).toBeVisible({ timeout: 5000 });
  });

  test('should redirect unauthenticated users away from protected clinical dashboards', async ({ page }) => {
    await page.goto('/consultation');
    await expect(page).toHaveURL(/.*login/);

    await page.goto('/triage');
    await expect(page).toHaveURL(/.*login/);

    await page.goto('/cashier-workflow');
    await expect(page).toHaveURL(/.*login/);
  });

  test('should successfully log in doctor user and navigate to workbench', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"], input[name="email"]', 'doctor@hospital.com');
    await page.fill('input[type="password"], input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Upon successful login, doctor navigates to dashboard or consultation workbench
    await expect(page).not.toHaveURL(/.*login/, { timeout: 8000 });
    await expect(page.locator('header, nav')).toBeVisible();
  });
});
