const { test, expect } = require('@playwright/test');

// Helper to login before tests
async function login(page) {
  await page.goto('/login.html');
  await page.fill('input#email', 'admin@example.com');
  await page.fill('input#password', 'password');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/index.html', { timeout: 10000 });
}

test.describe('Dashboard Page', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await login(page);
  });

  test('should load dashboard successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/Case Management - Dashboard/);
  });

  test('should display all stat cards', async ({ page }) => {
    // Check for stat cards
    await expect(page.locator('#activeMatters')).toBeVisible();
    await expect(page.locator('#unbilledHours')).toBeVisible();
    await expect(page.locator('#unbilledAmount')).toBeVisible();
    await expect(page.locator('#monthRevenue')).toBeVisible();
  });

  test('should load dashboard stats from API', async ({ page }) => {
    // Wait for API call to complete
    await page.waitForTimeout(1000);

    const activeMatters = await page.locator('#activeMatters').textContent();
    const unbilledHours = await page.locator('#unbilledHours').textContent();
    const unbilledAmount = await page.locator('#unbilledAmount').textContent();
    const monthRevenue = await page.locator('#monthRevenue').textContent();

    // Should have numeric values
    expect(activeMatters).toMatch(/^\d+$/);
    expect(unbilledHours).toMatch(/^[\d.]+$/);
  });

  test('should display quick action buttons', async ({ page }) => {
    await expect(page.locator('a:has-text("New Matter")')).toBeVisible();
    await expect(page.locator('a:has-text("Log Time")')).toBeVisible();
    await expect(page.locator('a:has-text("Add Expense")')).toBeVisible();
  });

  test('should navigate to new matter page from quick action', async ({ page }) => {
    await page.click('a:has-text("New Matter")');
    await page.waitForURL(/matters\.html/, { timeout: 5000 });
  });

  test('should navigate to billing page from quick action', async ({ page }) => {
    await page.click('a:has-text("Log Time")');
    await page.waitForURL(/billing\.html/, { timeout: 5000 });
  });

  test('should navigate to expenses page from quick action', async ({ page }) => {
    await page.click('a:has-text("Add Expense")');
    await page.waitForURL(/expenses\.html/, { timeout: 5000 });
  });

  test('should navigate to unbilled time when clicking unbilled amount card', async ({ page }) => {
    await page.click('a[href="pages/unbilled-time.html"]');
    await page.waitForURL(/unbilled-time\.html/, { timeout: 5000 });
  });

  test('should display recent activity section', async ({ page }) => {
    await expect(page.locator('#recentActivity')).toBeVisible();
  });

  test('should load recent activity items', async ({ page }) => {
    await page.waitForTimeout(2000); // Wait for activity to load

    const activityContainer = page.locator('#recentActivity');
    const content = await activityContainer.textContent();

    // Should show either activity items or "No recent activity"
    expect(content.length).toBeGreaterThan(0);
  });

  test('should display navigation menu', async ({ page }) => {
    const nav = page.locator('#app-nav');
    await expect(nav).toBeVisible();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // This test checks console errors
    const consoleMessages = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleMessages.push(msg.text());
      }
    });

    await page.reload();
    await page.waitForTimeout(2000);

    // Page should still be functional even if some API calls fail
    await expect(page.locator('#activeMatters')).toBeVisible();
  });

  test('should require authentication to access dashboard', async ({ page, context }) => {
    // Clear storage and try to access dashboard
    await context.clearCookies();
    await page.evaluate(() => localStorage.clear());

    await page.goto('/index.html');

    // Should redirect to login
    await page.waitForURL('**/login.html', { timeout: 5000 });
  });

  test('should have proper responsive layout', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('#activeMatters')).toBeVisible();

    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('#activeMatters')).toBeVisible();

    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('#activeMatters')).toBeVisible();
  });
});
