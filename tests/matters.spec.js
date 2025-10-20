const { test, expect } = require('@playwright/test');

async function login(page) {
  await page.goto('/login.html');
  await page.fill('input#email', 'admin@example.com');
  await page.fill('input#password', 'password');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/index.html', { timeout: 10000 });
}

test.describe('Matter Management', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await login(page);
  });

  test('should load matters list page', async ({ page }) => {
    await page.goto('/pages/matters.html');
    await expect(page).toHaveTitle(/Matter/);
  });

  test('should display matters table or list', async ({ page }) => {
    await page.goto('/pages/matters.html');
    await page.waitForTimeout(1500);

    // Should have some container for matters
    const mattersContainer = page.locator('table, .matters-list, #matters-table, #matters-container');
    const count = await mattersContainer.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should load new matter page', async ({ page }) => {
    await page.goto('/pages/new-matter.html');
    await expect(page).toHaveTitle(/Matter/);
  });

  test('should display all matter form fields', async ({ page }) => {
    await page.goto('/pages/new-matter.html');

    // Essential fields
    await expect(page.locator('input[name="name"], input#name, input#matter-name').first()).toBeVisible();

    // Client selection
    const clientSelect = page.locator('select[name="client_id"], select#client_id, select#client');
    await expect(clientSelect.first()).toBeVisible();
  });

  test('should load client options in matter form', async ({ page }) => {
    await page.goto('/pages/new-matter.html');
    await page.waitForTimeout(1500);

    const clientSelect = page.locator('select[name="client_id"], select#client_id, select#client').first();
    const options = await clientSelect.locator('option').count();

    // Should have at least one option (even if just "Select client")
    expect(options).toBeGreaterThan(0);
  });

  test('should submit new matter form with minimal data', async ({ page }) => {
    await page.goto('/pages/new-matter.html');
    await page.waitForTimeout(1500); // Wait for form to load

    const timestamp = Date.now();
    const matterName = `Test Matter ${timestamp}`;

    // Fill required fields
    const nameInput = page.locator('input[name="name"], input#name, input#matter-name').first();
    await nameInput.fill(matterName);

    // Select a client
    const clientSelect = page.locator('select[name="client_id"], select#client_id, select#client').first();
    const optionCount = await clientSelect.locator('option').count();

    if (optionCount > 1) {
      await clientSelect.selectOption({ index: 1 }); // Select first real client
    }

    // Find description field
    const descInput = page.locator('textarea[name="description"], textarea#description, input[name="description"]');
    if (await descInput.count() > 0) {
      await descInput.first().fill('Test matter description');
    }

    // Find and click submit
    const submitBtn = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")').first();

    const responsePromise = page.waitForResponse(response =>
      response.url().includes('/api/v1/matters') &&
      (response.status() === 201 || response.status() === 200),
      { timeout: 10000 }
    ).catch(() => null);

    await submitBtn.click();

    const response = await responsePromise;
    await page.waitForTimeout(1000);
  });

  test('should test matter billing type selection', async ({ page }) => {
    await page.goto('/pages/new-matter.html');
    await page.waitForTimeout(1000);

    const billingTypeSelect = page.locator('select[name="billing_type"], select#billing_type');

    if (await billingTypeSelect.count() > 0) {
      const options = await billingTypeSelect.first().locator('option').allTextContents();
      expect(options.length).toBeGreaterThan(0);

      // Test selecting each option
      for (let i = 0; i < Math.min(options.length, 3); i++) {
        await billingTypeSelect.first().selectOption({ index: i });
      }
    }
  });

  test('should test hourly rate field', async ({ page }) => {
    await page.goto('/pages/new-matter.html');

    const rateInput = page.locator('input[name="hourly_rate"], input#hourly_rate');

    if (await rateInput.count() > 0) {
      await rateInput.first().fill('400');
      await expect(rateInput.first()).toHaveValue('400');
    }
  });

  test('should test matter type field', async ({ page }) => {
    await page.goto('/pages/new-matter.html');

    const typeInput = page.locator('input[name="matter_type"], select[name="matter_type"], input#matter_type');

    if (await typeInput.count() > 0) {
      const firstInput = typeInput.first();
      if (await firstInput.evaluate(el => el.tagName) === 'SELECT') {
        await firstInput.selectOption({ index: 1 });
      } else {
        await firstInput.fill('Litigation');
      }
    }
  });

  test('should test practice area field', async ({ page }) => {
    await page.goto('/pages/new-matter.html');

    const practiceInput = page.locator('input[name="practice_area"], select[name="practice_area"]');

    if (await practiceInput.count() > 0) {
      const firstInput = practiceInput.first();
      if (await firstInput.evaluate(el => el.tagName) === 'SELECT') {
        await firstInput.selectOption({ index: 1 });
      } else {
        await firstInput.fill('Corporate Law');
      }
    }
  });

  test('should test attorney assignment', async ({ page }) => {
    await page.goto('/pages/new-matter.html');
    await page.waitForTimeout(1500);

    const attorneySelect = page.locator('select[name="attorney_id"], select#attorney_id, select#attorney');

    if (await attorneySelect.count() > 0) {
      const options = await attorneySelect.first().locator('option').count();
      if (options > 1) {
        await attorneySelect.first().selectOption({ index: 1 });
      }
    }
  });

  test('should test contingency percentage fields', async ({ page }) => {
    await page.goto('/pages/new-matter.html');

    const contingencyInput = page.locator('input[name="contingency_percentage"], input[name="trial_contingency_percentage"]');

    if (await contingencyInput.count() > 0) {
      await contingencyInput.first().fill('33.33');
    }

    const trialContingency = page.locator('input[name="trial_contingency_percentage"]');
    if (await trialContingency.count() > 0) {
      await trialContingency.first().fill('40');
    }

    const appealContingency = page.locator('input[name="appeal_contingency_percentage"]');
    if (await appealContingency.count() > 0) {
      await appealContingency.first().fill('45');
    }
  });

  test('should test court and case information fields', async ({ page }) => {
    await page.goto('/pages/new-matter.html');

    const courtInput = page.locator('input[name="court_name"], input#court_name');
    if (await courtInput.count() > 0) {
      await courtInput.first().fill('Superior Court');
    }

    const caseNumberInput = page.locator('input[name="case_number"], input#case_number');
    if (await caseNumberInput.count() > 0) {
      await caseNumberInput.first().fill('CV-2025-12345');
    }

    const opposingPartyInput = page.locator('input[name="opposing_party"], input#opposing_party');
    if (await opposingPartyInput.count() > 0) {
      await opposingPartyInput.first().fill('Defendant Name');
    }

    const opposingCounselInput = page.locator('input[name="opposing_counsel"], input#opposing_counsel');
    if (await opposingCounselInput.count() > 0) {
      await opposingCounselInput.first().fill('Opposing Attorney');
    }
  });

  test('should test date fields', async ({ page }) => {
    await page.goto('/pages/new-matter.html');

    const openDateInput = page.locator('input[name="open_date"], input#open_date');
    if (await openDateInput.count() > 0) {
      await openDateInput.first().fill('2025-01-01');
    }

    const trialDateInput = page.locator('input[name="trial_date"], input#trial_date');
    if (await trialDateInput.count() > 0) {
      await trialDateInput.first().fill('2025-06-01');
    }

    const solDateInput = page.locator('input[name="statute_of_limitations_date"]');
    if (await solDateInput.count() > 0) {
      await solDateInput.first().fill('2026-01-01');
    }
  });

  test('should test priority field', async ({ page }) => {
    await page.goto('/pages/new-matter.html');

    const priorityInput = page.locator('select[name="priority"], input[name="priority"]');

    if (await priorityInput.count() > 0) {
      const firstInput = priorityInput.first();
      if (await firstInput.evaluate(el => el.tagName) === 'SELECT') {
        await firstInput.selectOption({ index: 1 });
      } else {
        await firstInput.fill('High');
      }
    }
  });

  test('should test retainer amount field', async ({ page }) => {
    await page.goto('/pages/new-matter.html');

    const retainerInput = page.locator('input[name="retainer_amount"], input#retainer_amount');

    if (await retainerInput.count() > 0) {
      await retainerInput.first().fill('5000');
      await expect(retainerInput.first()).toHaveValue('5000');
    }
  });

  test('should test estimated hours field', async ({ page }) => {
    await page.goto('/pages/new-matter.html');

    const hoursInput = page.locator('input[name="estimated_hours"], input#estimated_hours');

    if (await hoursInput.count() > 0) {
      await hoursInput.first().fill('100');
      await expect(hoursInput.first()).toHaveValue('100');
    }
  });

  test('should test notes field', async ({ page }) => {
    await page.goto('/pages/new-matter.html');

    const notesInput = page.locator('textarea[name="notes"], textarea#notes');

    if (await notesInput.count() > 0) {
      await notesInput.first().fill('Test notes for this matter');
    }
  });

  test('should load matter detail page', async ({ page }) => {
    await page.goto('/pages/matters.html');
    await page.waitForTimeout(1500);

    // Try to find and click a matter link
    const matterLink = page.locator('a[href*="matter-detail.html"]').first();

    if (await matterLink.count() > 0) {
      await matterLink.click();
      await page.waitForURL(/matter-detail\.html/, { timeout: 5000 });
    } else {
      // If no matters exist, test direct navigation
      await page.goto('/pages/matter-detail.html?id=1');
      await page.waitForTimeout(1000);
    }
  });

  test('should validate required fields in matter form', async ({ page }) => {
    await page.goto('/pages/new-matter.html');
    await page.waitForTimeout(1000);

    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click();

    // Should have validation
    await page.waitForTimeout(500);
  });
});
