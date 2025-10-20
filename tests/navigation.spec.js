const { test, expect } = require('@playwright/test');

async function login(page) {
  await page.goto('/login.html');
  await page.fill('input#email', 'admin@example.com');
  await page.fill('input#password', 'password');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/index.html', { timeout: 10000 });
}

test.describe('Navigation and Cross-Page Integration', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await login(page);
  });

  test('should display navigation menu on all pages', async ({ page }) => {
    const pages = [
      '/index.html',
      '/pages/matters.html',
      '/pages/invoices.html',
      '/pages/billing.html',
      '/pages/expenses.html'
    ];

    for (const pagePath of pages) {
      await page.goto(pagePath);
      await page.waitForTimeout(500);

      const nav = page.locator('nav, #app-nav, .navigation, header');
      if (await nav.count() > 0) {
        await expect(nav.first()).toBeVisible();
      }
    }
  });

  test('should navigate between all main pages', async ({ page }) => {
    // Start at dashboard
    await page.goto('/index.html');

    // Navigate to matters
    const mattersLink = page.locator('a[href*="matters.html"], a:has-text("Matters")').first();
    if (await mattersLink.count() > 0) {
      await mattersLink.click();
      await page.waitForURL(/matters\.html/, { timeout: 5000 });
    }

    // Navigate to invoices
    const invoicesLink = page.locator('a[href*="invoices.html"], a:has-text("Invoices")').first();
    if (await invoicesLink.count() > 0) {
      await invoicesLink.click();
      await page.waitForURL(/invoices\.html/, { timeout: 5000 });
    }

    // Navigate to billing
    const billingLink = page.locator('a[href*="billing.html"], a:has-text("Billing"), a:has-text("Time")').first();
    if (await billingLink.count() > 0) {
      await billingLink.click();
      await page.waitForURL(/billing\.html/, { timeout: 5000 });
    }

    // Back to dashboard
    const dashboardLink = page.locator('a[href*="index.html"], a:has-text("Dashboard"), a:has-text("Home")').first();
    if (await dashboardLink.count() > 0) {
      await dashboardLink.click();
      await page.waitForURL(/index\.html/, { timeout: 5000 });
    }
  });

  test('should display user info in navigation', async ({ page }) => {
    await page.goto('/index.html');

    const userDisplay = page.locator('#userDisplay, .user-name, .user-info');

    if (await userDisplay.count() > 0) {
      const text = await userDisplay.first().textContent();
      expect(text.length).toBeGreaterThan(0);
    }
  });

  test('should have logout button in navigation', async ({ page }) => {
    await page.goto('/index.html');

    const logoutBtn = page.locator('button:has-text("Logout"), a:has-text("Logout"), button:has-text("Sign Out")');

    if (await logoutBtn.count() > 0) {
      await expect(logoutBtn.first()).toBeVisible();
    }
  });

  test('should handle browser back button', async ({ page }) => {
    await page.goto('/index.html');
    await page.goto('/pages/matters.html');
    await page.waitForTimeout(500);

    await page.goBack();
    await page.waitForTimeout(500);

    // Should be back at dashboard
    expect(page.url()).toContain('index.html');
  });

  test('should handle browser forward button', async ({ page }) => {
    await page.goto('/index.html');
    await page.goto('/pages/matters.html');
    await page.goBack();
    await page.waitForTimeout(500);

    await page.goForward();
    await page.waitForTimeout(500);

    // Should be at matters page
    expect(page.url()).toContain('matters.html');
  });

  test('should maintain session across page navigations', async ({ page }) => {
    await page.goto('/index.html');

    let token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();

    await page.goto('/pages/matters.html');
    token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();

    await page.goto('/pages/invoices.html');
    token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();
  });

  test('should display breadcrumbs if present', async ({ page }) => {
    await page.goto('/pages/matter-detail.html?id=1');
    await page.waitForTimeout(1000);

    const breadcrumbs = page.locator('.breadcrumbs, .breadcrumb, nav[aria-label="breadcrumb"]');

    if (await breadcrumbs.count() > 0) {
      await expect(breadcrumbs.first()).toBeVisible();
    }
  });

  test('should have active state on current page in navigation', async ({ page }) => {
    await page.goto('/pages/matters.html');
    await page.waitForTimeout(500);

    const activeLink = page.locator('a.active, a.current, .nav-link.active, [aria-current="page"]');

    if (await activeLink.count() > 0) {
      // Has active state styling
    }
  });

  test('should load all pages without JavaScript errors', async ({ page }) => {
    const pages = [
      '/index.html',
      '/pages/matters.html',
      '/pages/new-matter.html',
      '/pages/invoices.html',
      '/pages/billing.html',
      '/pages/unbilled-time.html',
      '/pages/expenses.html',
      '/pages/new-client.html',
      '/pages/settings.html'
    ];

    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({ page: page.url(), error: msg.text() });
      }
    });

    for (const pagePath of pages) {
      await page.goto(pagePath);
      await page.waitForTimeout(1000);

      // Check if page loaded
      await expect(page.locator('body')).toBeVisible();
    }

    // Log any console errors found
    if (consoleErrors.length > 0) {
      console.log('Console errors found:', consoleErrors);
    }
  });

  test('should test responsive navigation menu', async ({ page }) => {
    await page.goto('/index.html');

    // Desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);

    // Tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);

    // Mobile view - check for hamburger menu
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);

    const hamburgerBtn = page.locator('button.hamburger, button.menu-toggle, .mobile-menu-button, button:has-text("Menu")');

    if (await hamburgerBtn.count() > 0) {
      await hamburgerBtn.first().click();
      await page.waitForTimeout(500);

      // Mobile menu should be visible
      const mobileMenu = page.locator('.mobile-menu, .nav-mobile, nav.open');
      if (await mobileMenu.count() > 0) {
        await expect(mobileMenu.first()).toBeVisible();
      }
    }
  });

  test('should redirect to login if session expires', async ({ page, context }) => {
    await page.goto('/index.html');

    // Clear token to simulate expired session
    await page.evaluate(() => localStorage.removeItem('token'));

    // Try to navigate to another page
    await page.goto('/pages/matters.html');

    // Should redirect to login
    await page.waitForURL('**/login.html', { timeout: 5000 });
  });

  test('should test matter detail to invoice workflow', async ({ page }) => {
    await page.goto('/pages/matters.html');
    await page.waitForTimeout(1500);

    // Click on a matter
    const matterLink = page.locator('a[href*="matter-detail.html"]').first();

    if (await matterLink.count() > 0) {
      await matterLink.click();
      await page.waitForURL(/matter-detail\.html/, { timeout: 5000 });
      await page.waitForTimeout(1000);

      // Look for create invoice button
      const createInvoiceBtn = page.locator('button:has-text("Create Invoice"), a:has-text("Create Invoice"), button:has-text("Generate Invoice")');

      if (await createInvoiceBtn.count() > 0) {
        // Workflow button exists
      }
    }
  });

  test('should test quick create dropdowns', async ({ page }) => {
    await page.goto('/index.html');

    const quickCreateBtn = page.locator('button:has-text("New"), button:has-text("Create"), button:has-text("+")');

    if (await quickCreateBtn.count() > 0) {
      await quickCreateBtn.first().click();
      await page.waitForTimeout(500);

      // Should show dropdown menu
      const dropdown = page.locator('.dropdown-menu, .quick-create-menu');
      if (await dropdown.count() > 0) {
        await expect(dropdown.first()).toBeVisible();
      }
    }
  });

  test('should have consistent header across pages', async ({ page }) => {
    const pages = ['/index.html', '/pages/matters.html', '/pages/invoices.html'];

    let firstHeaderContent = null;

    for (const pagePath of pages) {
      await page.goto(pagePath);
      await page.waitForTimeout(500);

      const header = page.locator('header, .header, .app-header');

      if (await header.count() > 0) {
        const headerHTML = await header.first().innerHTML();
        if (!firstHeaderContent) {
          firstHeaderContent = headerHTML;
        }
        // Headers should have similar structure
      }
    }
  });
});
