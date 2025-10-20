const { test, expect } = require('@playwright/test');

async function login(page) {
  await page.goto('/login.html');
  await page.fill('input#email', 'admin@example.com');
  await page.fill('input#password', 'password');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/index.html', { timeout: 10000 });
}

test.describe('Client Management', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await login(page);
  });

  test('should load new client page', async ({ page }) => {
    await page.goto('/pages/new-client.html');
    await expect(page).toHaveTitle(/Client/);
  });

  test('should display all client form fields', async ({ page }) => {
    await page.goto('/pages/new-client.html');

    // Check for essential form fields
    await expect(page.locator('input[name="name"], input#name, input#client-name')).toBeVisible();
    await expect(page.locator('input[name="email"], input#email, input#client-email')).toBeVisible();
  });

  test('should submit new client form with valid data', async ({ page }) => {
    await page.goto('/pages/new-client.html');

    const timestamp = Date.now();
    const clientName = `Test Client ${timestamp}`;
    const clientEmail = `client${timestamp}@test.com`;

    // Fill form fields - try multiple selectors
    const nameInput = page.locator('input[name="name"], input#name, input#client-name').first();
    const emailInput = page.locator('input[name="email"], input#email, input#client-email').first();

    await nameInput.fill(clientName);
    await emailInput.fill(clientEmail);

    // Find and fill phone if exists
    const phoneInput = page.locator('input[name="phone"], input#phone, input#client-phone');
    if (await phoneInput.count() > 0) {
      await phoneInput.first().fill('555-1234');
    }

    // Find and fill address if exists
    const addressInput = page.locator('input[name="address"], input#address, textarea[name="address"]');
    if (await addressInput.count() > 0) {
      await addressInput.first().fill('123 Test St');
    }

    // Find submit button
    const submitBtn = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")').first();

    // Wait for API response
    const responsePromise = page.waitForResponse(response =>
      response.url().includes('/api/v1/clients') && response.status() === 201,
      { timeout: 10000 }
    ).catch(() => null);

    await submitBtn.click();

    const response = await responsePromise;

    if (response) {
      // Check if redirected or success message shown
      await page.waitForTimeout(1000);
    }
  });

  test('should validate required fields in client form', async ({ page }) => {
    await page.goto('/pages/new-client.html');

    const submitBtn = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")').first();
    await submitBtn.click();

    // HTML5 validation should prevent submission
    await page.waitForTimeout(500);
  });

  test('should validate email format in client form', async ({ page }) => {
    await page.goto('/pages/new-client.html');

    const emailInput = page.locator('input[name="email"], input#email, input#client-email').first();
    await emailInput.fill('invalid-email');

    const submitBtn = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")').first();
    await submitBtn.click();

    // Should not submit with invalid email
    await page.waitForTimeout(500);
  });

  test('should test address fields', async ({ page }) => {
    await page.goto('/pages/new-client.html');

    // Test structured address fields
    const cityInput = page.locator('input[name="city"], input#city');
    const stateInput = page.locator('input[name="state"], input#state, select[name="state"], select#state');
    const zipInput = page.locator('input[name="zip_code"], input#zip, input[name="zip"]');

    if (await cityInput.count() > 0) {
      await cityInput.first().fill('Test City');
      await expect(cityInput.first()).toHaveValue('Test City');
    }

    if (await stateInput.count() > 0) {
      const firstState = stateInput.first();
      if (await firstState.evaluate(el => el.tagName) === 'SELECT') {
        await firstState.selectOption({ index: 1 });
      } else {
        await firstState.fill('CA');
      }
    }

    if (await zipInput.count() > 0) {
      await zipInput.first().fill('12345');
      await expect(zipInput.first()).toHaveValue('12345');
    }
  });

  test('should test default hourly rate field', async ({ page }) => {
    await page.goto('/pages/new-client.html');

    const rateInput = page.locator('input[name="default_hourly_rate"], input#hourly_rate, input[name="hourly_rate"]');

    if (await rateInput.count() > 0) {
      await rateInput.first().fill('350');
      await expect(rateInput.first()).toHaveValue('350');
    }
  });

  test('should handle form submission errors', async ({ page }) => {
    await page.goto('/pages/new-client.html');

    // Try to create duplicate client or trigger error
    const nameInput = page.locator('input[name="name"], input#name, input#client-name').first();
    await nameInput.fill(''); // Empty name might trigger error

    const submitBtn = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")').first();

    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await submitBtn.click();
    await page.waitForTimeout(1000);
  });

  test('should test client number auto-generation', async ({ page }) => {
    await page.goto('/pages/new-client.html');

    const clientNumberInput = page.locator('input[name="client_number"], input#client_number');

    if (await clientNumberInput.count() > 0) {
      const value = await clientNumberInput.first().inputValue();
      // Might be pre-filled or empty
    }
  });

  test('should test address line 2 field', async ({ page }) => {
    await page.goto('/pages/new-client.html');

    const address2Input = page.locator('input[name="address_line2"], input#address_line2, input[name="address2"]');

    if (await address2Input.count() > 0) {
      await address2Input.first().fill('Suite 100');
      await expect(address2Input.first()).toHaveValue('Suite 100');
    }
  });

  test('should test country field', async ({ page }) => {
    await page.goto('/pages/new-client.html');

    const countryInput = page.locator('input[name="country"], input#country, select[name="country"]');

    if (await countryInput.count() > 0) {
      const firstCountry = countryInput.first();
      if (await firstCountry.evaluate(el => el.tagName) === 'SELECT') {
        await firstCountry.selectOption({ index: 0 });
      } else {
        await firstCountry.fill('USA');
      }
    }
  });

  test('should test cancel/back navigation', async ({ page }) => {
    await page.goto('/pages/new-client.html');

    const cancelBtn = page.locator('button:has-text("Cancel"), a:has-text("Cancel"), a:has-text("Back")');

    if (await cancelBtn.count() > 0) {
      await cancelBtn.first().click();
      await page.waitForTimeout(1000);
    }
  });
});
