import { test, expect } from '@playwright/test';

const MOBILE_VIEWPORTS = [
  { name: '320px Extreme Compact', width: 320, height: 600 },
  { name: '375px Standard Compact', width: 375, height: 667 },
  { name: '390px Modern Mobile', width: 390, height: 844 },
  { name: '430px Large Mobile', width: 430, height: 932 },
];

test.describe('AKEH-HMS Responsive Design & Zero-Bleed Mobile Layout', () => {
  for (const vp of MOBILE_VIEWPORTS) {
    test(`should render cleanly at ${vp.name} without horizontal overflow`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/login');

      // Verify no horizontal overflow bleed
      const hasHorizontalOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(hasHorizontalOverflow).toBeFalsy();

      // Submit button must be fully clickable
      const submitBtn = page.locator('button[type="submit"]');
      await expect(submitBtn).toBeVisible();
    });
  }

  test('should display 5-touch bottom mobile dock on screens below 1024px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/login');
    await page.fill('input[type="email"], input[name="email"]', 'doctor@hospital.com');
    await page.fill('input[type="password"], input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 8000 });

    // Verify 5-touch dock in mobile navigation
    const bottomDock = page.locator('nav.fixed.bottom-0, nav[class*="bottom-0"]');
    await expect(bottomDock).toBeVisible();

    // Verify presence of Scan QR or Workbench action in dock
    const dockActions = bottomDock.locator('button, a');
    await expect(dockActions).toHaveCount(5);
  });

  test('should render collapsible desktop sidebar on viewports >= 1024px', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/login');
    await page.fill('input[type="email"], input[name="email"]', 'doctor@hospital.com');
    await page.fill('input[type="password"], input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 8000 });

    // Verify desktop sidebar is present
    const desktopSidebar = page.locator('aside');
    await expect(desktopSidebar).toBeVisible();
  });
});
