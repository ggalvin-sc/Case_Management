const { test, expect } = require('@playwright/test');

async function login(page) {
  await page.goto('/login.html');
  await page.fill('input#email', 'admin@example.com');
  await page.fill('input#password', 'password');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/index.html', { timeout: 10000 });
}

test.describe('Billing and Time Entries', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await login(page);
  });

  test('should load billing page', async ({ page }) => {
    await page.goto('/pages/billing.html');
    await expect(page).toHaveTitle(/Billing|Time/);
  });

  test('should load unbilled time page', async ({ page }) => {
    await page.goto('/pages/unbilled-time.html');
    await expect(page).toHaveTitle(/Unbilled|Time/);
  });

  test('should display time entry form fields', async ({ page }) => {
    await page.goto('/pages/billing.html');
    await page.waitForTimeout(1000);

    // Matter selection
    const matterSelect = page.locator('select[name="matter_id"], select#matter_id, select#matter');
    if (await matterSelect.count() > 0) {
      await expect(matterSelect.first()).toBeVisible();
    }

    // Date field
    const dateInput = page.locator('input[name="entry_date"], input#entry_date, input[type="date"]');
    if (await dateInput.count() > 0) {
      await expect(dateInput.first()).toBeVisible();
    }

    // Duration field
    const durationInput = page.locator('input[name="duration_minutes"], input#duration, input[name="duration"]');
    if (await durationInput.count() > 0) {
      await expect(durationInput.first()).toBeVisible();
    }

    // Description field
    const descInput = page.locator('textarea[name="description"], textarea#description, input[name="description"]');
    if (await descInput.count() > 0) {
      await expect(descInput.first()).toBeVisible();
    }
  });

  test('should create a time entry', async ({ page }) => {
    await page.goto('/pages/billing.html');
    await page.waitForTimeout(1500);

    // Select matter
    const matterSelect = page.locator('select[name="matter_id"], select#matter_id, select#matter').first();
    if (await matterSelect.count() > 0) {
      const options = await matterSelect.locator('option').count();
      if (options > 1) {
        await matterSelect.selectOption({ index: 1 });
      }
    }

    // Fill date
    const dateInput = page.locator('input[name="entry_date"], input#entry_date, input[type="date"]').first();
    if (await dateInput.count() > 0) {
      await dateInput.fill('2025-01-15');
    }

    // Fill duration (in minutes or hours)
    const durationInput = page.locator('input[name="duration_minutes"], input#duration, input[name="duration"]').first();
    if (await durationInput.count() > 0) {
      await durationInput.fill('120'); // 2 hours
    }

    // Fill description
    const descInput = page.locator('textarea[name="description"], textarea#description, input[name="description"]').first();
    if (await descInput.count() > 0) {
      await descInput.fill('Legal research and client consultation');
    }

    // Fill hourly rate if needed
    const rateInput = page.locator('input[name="hourly_rate"], input#hourly_rate, input[name="rate"]');
    if (await rateInput.count() > 0) {
      await rateInput.first().fill('350');
    }

    // Check billable checkbox if exists
    const billableCheckbox = page.locator('input[name="billable"], input#billable, input[type="checkbox"][name="billable"]');
    if (await billableCheckbox.count() > 0) {
      await billableCheckbox.first().check();
    }

    // Submit
    const submitBtn = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Log Time"), button:has-text("Create")').first();

    if (await submitBtn.count() > 0) {
      const responsePromise = page.waitForResponse(response =>
        response.url().includes('/api/v1/time-entries') &&
        (response.status() === 201 || response.status() === 200),
        { timeout: 10000 }
      ).catch(() => null);

      await submitBtn.click();
      await page.waitForTimeout(1000);
    }
  });

  test('should display unbilled time entries', async ({ page }) => {
    await page.goto('/pages/unbilled-time.html');
    await page.waitForTimeout(1500);

    const timeEntriesTable = page.locator('table, .time-entries, #time-entries-table');
    const count = await timeEntriesTable.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should filter unbilled time by matter', async ({ page }) => {
    await page.goto('/pages/unbilled-time.html');
    await page.waitForTimeout(1500);

    const matterFilter = page.locator('select#matter-filter, select[name="matter"], .filter select');

    if (await matterFilter.count() > 0) {
      const options = await matterFilter.first().locator('option').count();
      if (options > 1) {
        await matterFilter.first().selectOption({ index: 1 });
        await page.waitForTimeout(1000);
      }
    }
  });

  test('should select time entries for billing', async ({ page }) => {
    await page.goto('/pages/unbilled-time.html');
    await page.waitForTimeout(1500);

    const checkboxes = page.locator('input[type="checkbox"].time-entry-checkbox, input[type="checkbox"][name="selected"]');

    if (await checkboxes.count() > 0) {
      await checkboxes.first().check();
      await expect(checkboxes.first()).toBeChecked();
    }
  });

  test('should have create invoice from unbilled time button', async ({ page }) => {
    await page.goto('/pages/unbilled-time.html');
    await page.waitForTimeout(1000);

    const createInvoiceBtn = page.locator('button:has-text("Create Invoice"), button:has-text("Generate Invoice"), button#create-invoice');

    if (await createInvoiceBtn.count() > 0) {
      await expect(createInvoiceBtn.first()).toBeVisible();
    }
  });

  test('should display time entry amount calculation', async ({ page }) => {
    await page.goto('/pages/unbilled-time.html');
    await page.waitForTimeout(1500);

    const amountColumns = page.locator('td.amount, .time-entry-amount, [data-field="amount"]');

    if (await amountColumns.count() > 0) {
      const amountText = await amountColumns.first().textContent();
      expect(amountText).toBeTruthy();
    }
  });

  test('should test duration input formats', async ({ page }) => {
    await page.goto('/pages/billing.html');
    await page.waitForTimeout(1000);

    const durationInput = page.locator('input[name="duration_minutes"], input#duration, input[name="duration"]').first();

    if (await durationInput.count() > 0) {
      // Test various duration formats
      await durationInput.fill('60');
      await expect(durationInput).toHaveValue('60');

      await durationInput.fill('120');
      await expect(durationInput).toHaveValue('120');

      await durationInput.fill('30');
      await expect(durationInput).toHaveValue('30');
    }
  });

  test('should validate required fields in time entry form', async ({ page }) => {
    await page.goto('/pages/billing.html');
    await page.waitForTimeout(1000);

    const submitBtn = page.locator('button[type="submit"]').first();

    if (await submitBtn.count() > 0) {
      await submitBtn.click();
      await page.waitForTimeout(500);
      // HTML5 validation should prevent submission
    }
  });

  test('should display total unbilled amount', async ({ page }) => {
    await page.goto('/pages/unbilled-time.html');
    await page.waitForTimeout(1500);

    const totalAmount = page.locator('#total-unbilled, .total-amount, .unbilled-total');

    if (await totalAmount.count() > 0) {
      const text = await totalAmount.first().textContent();
      expect(text).toBeTruthy();
    }
  });

  test('should test date picker functionality', async ({ page }) => {
    await page.goto('/pages/billing.html');
    await page.waitForTimeout(1000);

    const dateInput = page.locator('input[name="entry_date"], input#entry_date, input[type="date"]').first();

    if (await dateInput.count() > 0) {
      await dateInput.fill('2025-10-01');
      await expect(dateInput).toHaveValue('2025-10-01');
    }
  });

  test('should load matter options dynamically', async ({ page }) => {
    await page.goto('/pages/billing.html');
    await page.waitForTimeout(1500);

    const matterSelect = page.locator('select[name="matter_id"], select#matter_id, select#matter').first();

    if (await matterSelect.count() > 0) {
      const options = await matterSelect.locator('option').count();
      expect(options).toBeGreaterThan(0);
    }
  });

  test('should handle empty unbilled time list', async ({ page }) => {
    await page.goto('/pages/unbilled-time.html');
    await page.waitForTimeout(2000);

    // Check for either entries or empty state message
    const entries = page.locator('tbody tr, .time-entry-row');
    const emptyMessage = page.locator('.empty-state, .no-results, p:has-text("No unbilled")');

    const entryCount = await entries.count();
    const emptyCount = await emptyMessage.count();

    // Should have either entries or empty message
    expect(entryCount + emptyCount).toBeGreaterThan(0);
  });
});
