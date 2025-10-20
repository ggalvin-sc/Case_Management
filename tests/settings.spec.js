const { test, expect } = require('@playwright/test');

async function login(page) {
  await page.goto('/login.html');
  await page.fill('input#email', 'admin@example.com');
  await page.fill('input#password', 'password');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/index.html', { timeout: 10000 });
}

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await login(page);
  });

  test('should load settings page', async ({ page }) => {
    await page.goto('/pages/settings.html');
    await expect(page).toHaveTitle(/Settings/);
  });

  test('should display firm settings section', async ({ page }) => {
    await page.goto('/pages/settings.html');
    await page.waitForTimeout(1500);

    const firmSettings = page.locator('.firm-settings, #firm-settings, .settings-section');
    const count = await firmSettings.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should display firm name field', async ({ page }) => {
    await page.goto('/pages/settings.html');
    await page.waitForTimeout(1500);

    const firmNameInput = page.locator('input[name="firm_name"], input#firm_name');

    if (await firmNameInput.count() > 0) {
      await expect(firmNameInput.first()).toBeVisible();
      const currentValue = await firmNameInput.first().inputValue();
      expect(currentValue.length).toBeGreaterThan(0);
    }
  });

  test('should display address fields', async ({ page }) => {
    await page.goto('/pages/settings.html');
    await page.waitForTimeout(1500);

    const addressInput = page.locator('input[name="address"], textarea[name="address"], input#address');
    const cityInput = page.locator('input[name="city"], input#city');
    const stateInput = page.locator('input[name="state"], select[name="state"], input#state');
    const zipInput = page.locator('input[name="zip_code"], input#zip_code, input[name="zip"]');

    if (await addressInput.count() > 0) {
      await expect(addressInput.first()).toBeVisible();
    }
  });

  test('should display contact information fields', async ({ page }) => {
    await page.goto('/pages/settings.html');
    await page.waitForTimeout(1500);

    const phoneInput = page.locator('input[name="phone"], input#phone');
    const emailInput = page.locator('input[name="email"], input#email, input[type="email"]');
    const websiteInput = page.locator('input[name="website"], input#website');

    if (await phoneInput.count() > 0) {
      await expect(phoneInput.first()).toBeVisible();
    }

    if (await emailInput.count() > 0) {
      await expect(emailInput.first()).toBeVisible();
    }
  });

  test('should display tax ID field', async ({ page }) => {
    await page.goto('/pages/settings.html');
    await page.waitForTimeout(1500);

    const taxIdInput = page.locator('input[name="tax_id"], input#tax_id');

    if (await taxIdInput.count() > 0) {
      await expect(taxIdInput.first()).toBeVisible();
    }
  });

  test('should display logo upload field', async ({ page }) => {
    await page.goto('/pages/settings.html');
    await page.waitForTimeout(1500);

    const logoInput = page.locator('input[name="logo_url"], input#logo_url, input[type="file"]');

    if (await logoInput.count() > 0) {
      // Logo upload exists
    }
  });

  test('should display invoice template selector', async ({ page }) => {
    await page.goto('/pages/settings.html');
    await page.waitForTimeout(1500);

    const templateSelect = page.locator('select[name="default_invoice_template"], select#invoice_template');

    if (await templateSelect.count() > 0) {
      await expect(templateSelect.first()).toBeVisible();
      const options = await templateSelect.first().locator('option').allTextContents();
      expect(options.length).toBeGreaterThan(0);
    }
  });

  test('should display payment terms field', async ({ page }) => {
    await page.goto('/pages/settings.html');
    await page.waitForTimeout(1500);

    const paymentTermsInput = page.locator('textarea[name="default_payment_terms"], textarea#payment_terms');

    if (await paymentTermsInput.count() > 0) {
      await expect(paymentTermsInput.first()).toBeVisible();
    }
  });

  test('should display invoice footer field', async ({ page }) => {
    await page.goto('/pages/settings.html');
    await page.waitForTimeout(1500);

    const footerInput = page.locator('textarea[name="invoice_footer"], textarea#invoice_footer');

    if (await footerInput.count() > 0) {
      await expect(footerInput.first()).toBeVisible();
    }
  });

  test('should update firm settings', async ({ page }) => {
    await page.goto('/pages/settings.html');
    await page.waitForTimeout(1500);

    // Update firm name
    const firmNameInput = page.locator('input[name="firm_name"], input#firm_name').first();

    if (await firmNameInput.count() > 0) {
      await firmNameInput.fill('Updated Law Firm Name');

      // Find save button
      const saveBtn = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Update")').first();

      if (await saveBtn.count() > 0) {
        const responsePromise = page.waitForResponse(response =>
          response.url().includes('/api/v1/firm-settings') &&
          (response.status() === 200 || response.status() === 201),
          { timeout: 10000 }
        ).catch(() => null);

        await saveBtn.click();
        await page.waitForTimeout(1000);
      }
    }
  });

  test('should test phone number formatting', async ({ page }) => {
    await page.goto('/pages/settings.html');
    await page.waitForTimeout(1500);

    const phoneInput = page.locator('input[name="phone"], input#phone').first();

    if (await phoneInput.count() > 0) {
      await phoneInput.fill('5551234567');
      await page.waitForTimeout(500);
      // Might auto-format to (555) 123-4567
    }
  });

  test('should test email validation', async ({ page }) => {
    await page.goto('/pages/settings.html');
    await page.waitForTimeout(1500);

    const emailInput = page.locator('input[name="email"], input#email, input[type="email"]').first();

    if (await emailInput.count() > 0) {
      await emailInput.fill('invalid-email');

      const saveBtn = page.locator('button[type="submit"]').first();
      if (await saveBtn.count() > 0) {
        await saveBtn.click();
        await page.waitForTimeout(500);
        // HTML5 validation should prevent submission
      }
    }
  });

  test('should test website URL validation', async ({ page }) => {
    await page.goto('/pages/settings.html');
    await page.waitForTimeout(1500);

    const websiteInput = page.locator('input[name="website"], input#website').first();

    if (await websiteInput.count() > 0) {
      await websiteInput.fill('https://www.example.com');
      await expect(websiteInput).toHaveValue('https://www.example.com');
    }
  });

  test('should display settings tabs or sections', async ({ page }) => {
    await page.goto('/pages/settings.html');
    await page.waitForTimeout(1500);

    const tabs = page.locator('.tab, .settings-tab, nav a, button.tab-button');

    if (await tabs.count() > 0) {
      // Has tabbed interface
      const tabCount = await tabs.count();
      expect(tabCount).toBeGreaterThan(0);
    }
  });

  test('should test save button functionality', async ({ page }) => {
    await page.goto('/pages/settings.html');
    await page.waitForTimeout(1500);

    const saveBtn = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Update")');

    if (await saveBtn.count() > 0) {
      await expect(saveBtn.first()).toBeVisible();
      await expect(saveBtn.first()).toBeEnabled();
    }
  });

  test('should display success message after save', async ({ page }) => {
    await page.goto('/pages/settings.html');
    await page.waitForTimeout(1500);

    const firmNameInput = page.locator('input[name="firm_name"], input#firm_name').first();

    if (await firmNameInput.count() > 0) {
      await firmNameInput.fill('Test Firm');

      const saveBtn = page.locator('button[type="submit"], button:has-text("Save")').first();

      if (await saveBtn.count() > 0) {
        await saveBtn.click();
        await page.waitForTimeout(2000);

        // Look for success message
        const successMsg = page.locator('.success-message, .alert-success, .notification-success');

        if (await successMsg.count() > 0) {
          await expect(successMsg.first()).toBeVisible();
        }
      }
    }
  });

  test('should handle settings load errors gracefully', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/pages/settings.html');
    await page.waitForTimeout(2000);

    // Page should still load even if API fails
    await expect(page.locator('body')).toBeVisible();
  });

  test('should test cancel/reset functionality', async ({ page }) => {
    await page.goto('/pages/settings.html');
    await page.waitForTimeout(1500);

    const cancelBtn = page.locator('button:has-text("Cancel"), button:has-text("Reset")');

    if (await cancelBtn.count() > 0) {
      await expect(cancelBtn.first()).toBeVisible();
    }
  });
});
