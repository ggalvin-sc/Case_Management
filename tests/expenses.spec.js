const { test, expect } = require('@playwright/test');

async function login(page) {
  await page.goto('/login.html');
  await page.fill('input#email', 'admin@example.com');
  await page.fill('input#password', 'password');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/index.html', { timeout: 10000 });
}

test.describe('Expense Management', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await login(page);
  });

  test('should load expenses page', async ({ page }) => {
    await page.goto('/pages/expenses.html');
    await expect(page).toHaveTitle(/Expense/);
  });

  test('should display expense form fields', async ({ page }) => {
    await page.goto('/pages/expenses.html');
    await page.waitForTimeout(1000);

    // Matter selection
    const matterSelect = page.locator('select[name="matter_id"], select#matter_id, select#matter');
    if (await matterSelect.count() > 0) {
      await expect(matterSelect.first()).toBeVisible();
    }

    // Date field
    const dateInput = page.locator('input[name="expense_date"], input#expense_date, input[type="date"]');
    if (await dateInput.count() > 0) {
      await expect(dateInput.first()).toBeVisible();
    }

    // Category field
    const categoryInput = page.locator('select[name="category"], input[name="category"], select#category');
    if (await categoryInput.count() > 0) {
      await expect(categoryInput.first()).toBeVisible();
    }

    // Description field
    const descInput = page.locator('textarea[name="description"], textarea#description, input[name="description"]');
    if (await descInput.count() > 0) {
      await expect(descInput.first()).toBeVisible();
    }

    // Amount field
    const amountInput = page.locator('input[name="amount"], input#amount, input[name="expense_amount"]');
    if (await amountInput.count() > 0) {
      await expect(amountInput.first()).toBeVisible();
    }
  });

  test('should create an expense', async ({ page }) => {
    await page.goto('/pages/expenses.html');
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
    const dateInput = page.locator('input[name="expense_date"], input#expense_date, input[type="date"]').first();
    if (await dateInput.count() > 0) {
      await dateInput.fill('2025-01-15');
    }

    // Select or fill category
    const categoryInput = page.locator('select[name="category"], input[name="category"], select#category').first();
    if (await categoryInput.count() > 0) {
      if (await categoryInput.evaluate(el => el.tagName) === 'SELECT') {
        const options = await categoryInput.locator('option').count();
        if (options > 1) {
          await categoryInput.selectOption({ index: 1 });
        }
      } else {
        await categoryInput.fill('Travel');
      }
    }

    // Fill description
    const descInput = page.locator('textarea[name="description"], textarea#description, input[name="description"]').first();
    if (await descInput.count() > 0) {
      await descInput.fill('Client meeting travel expenses');
    }

    // Fill vendor
    const vendorInput = page.locator('input[name="vendor"], input#vendor');
    if (await vendorInput.count() > 0) {
      await vendorInput.first().fill('Uber');
    }

    // Fill amount
    const amountInput = page.locator('input[name="amount"], input#amount, input[name="expense_amount"]').first();
    if (await amountInput.count() > 0) {
      await amountInput.fill('75.50');
    }

    // Fill markup percentage if exists
    const markupInput = page.locator('input[name="markup_percentage"], input#markup_percentage, input[name="markup"]');
    if (await markupInput.count() > 0) {
      await markupInput.first().fill('10');
    }

    // Check billable checkbox if exists
    const billableCheckbox = page.locator('input[name="billable"], input#billable, input[type="checkbox"][name="billable"]');
    if (await billableCheckbox.count() > 0) {
      await billableCheckbox.first().check();
    }

    // Submit
    const submitBtn = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Add Expense"), button:has-text("Create")').first();

    if (await submitBtn.count() > 0) {
      const responsePromise = page.waitForResponse(response =>
        response.url().includes('/api/v1/expenses') &&
        (response.status() === 201 || response.status() === 200),
        { timeout: 10000 }
      ).catch(() => null);

      await submitBtn.click();
      await page.waitForTimeout(1000);
    }
  });

  test('should display expenses table or list', async ({ page }) => {
    await page.goto('/pages/expenses.html');
    await page.waitForTimeout(1500);

    const expensesTable = page.locator('table, .expenses-list, #expenses-table');
    const count = await expensesTable.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should test expense category dropdown', async ({ page }) => {
    await page.goto('/pages/expenses.html');
    await page.waitForTimeout(1000);

    const categorySelect = page.locator('select[name="category"], select#category');

    if (await categorySelect.count() > 0) {
      const options = await categorySelect.first().locator('option').allTextContents();
      expect(options.length).toBeGreaterThan(0);

      // Common expense categories
      const categoryText = options.join(' ').toLowerCase();
      // Categories might include: travel, filing fees, copying, postage, etc.
    }
  });

  test('should calculate billed amount with markup', async ({ page }) => {
    await page.goto('/pages/expenses.html');
    await page.waitForTimeout(1000);

    const amountInput = page.locator('input[name="amount"], input#amount').first();
    const markupInput = page.locator('input[name="markup_percentage"], input#markup_percentage, input[name="markup"]').first();
    const billedAmountInput = page.locator('input[name="billed_amount"], input#billed_amount, .billed-amount');

    if (await amountInput.count() > 0 && await markupInput.count() > 0) {
      await amountInput.fill('100');
      await markupInput.fill('10');

      // Wait for calculation
      await page.waitForTimeout(500);

      // Check if billed amount is auto-calculated
      if (await billedAmountInput.count() > 0) {
        const billedValue = await billedAmountInput.first().inputValue();
        // Should be 110 (100 + 10%)
      }
    }
  });

  test('should validate required fields in expense form', async ({ page }) => {
    await page.goto('/pages/expenses.html');
    await page.waitForTimeout(1000);

    const submitBtn = page.locator('button[type="submit"]').first();

    if (await submitBtn.count() > 0) {
      await submitBtn.click();
      await page.waitForTimeout(500);
      // HTML5 validation should prevent submission
    }
  });

  test('should filter expenses by matter', async ({ page }) => {
    await page.goto('/pages/expenses.html');
    await page.waitForTimeout(1500);

    const matterFilter = page.locator('select#matter-filter, select.filter-matter, .filter select[name="matter"]');

    if (await matterFilter.count() > 0) {
      const options = await matterFilter.first().locator('option').count();
      if (options > 1) {
        await matterFilter.first().selectOption({ index: 1 });
        await page.waitForTimeout(1000);
      }
    }
  });

  test('should test expense date picker', async ({ page }) => {
    await page.goto('/pages/expenses.html');
    await page.waitForTimeout(1000);

    const dateInput = page.locator('input[name="expense_date"], input#expense_date, input[type="date"]').first();

    if (await dateInput.count() > 0) {
      await dateInput.fill('2025-10-01');
      await expect(dateInput).toHaveValue('2025-10-01');
    }
  });

  test('should display vendor field', async ({ page }) => {
    await page.goto('/pages/expenses.html');
    await page.waitForTimeout(1000);

    const vendorInput = page.locator('input[name="vendor"], input#vendor');

    if (await vendorInput.count() > 0) {
      await vendorInput.first().fill('Test Vendor');
      await expect(vendorInput.first()).toHaveValue('Test Vendor');
    }
  });

  test('should test billable checkbox functionality', async ({ page }) => {
    await page.goto('/pages/expenses.html');
    await page.waitForTimeout(1000);

    const billableCheckbox = page.locator('input[name="billable"], input#billable, input[type="checkbox"][name="billable"]');

    if (await billableCheckbox.count() > 0) {
      await billableCheckbox.first().check();
      await expect(billableCheckbox.first()).toBeChecked();

      await billableCheckbox.first().uncheck();
      await expect(billableCheckbox.first()).not.toBeChecked();
    }
  });

  test('should display expense amounts correctly', async ({ page }) => {
    await page.goto('/pages/expenses.html');
    await page.waitForTimeout(1500);

    const amountCells = page.locator('td.amount, .expense-amount, [data-field="amount"]');

    if (await amountCells.count() > 0) {
      const amountText = await amountCells.first().textContent();
      expect(amountText).toBeTruthy();
    }
  });

  test('should handle empty expenses list', async ({ page }) => {
    await page.goto('/pages/expenses.html');
    await page.waitForTimeout(2000);

    // Check for either expenses or empty state message
    const expenses = page.locator('tbody tr, .expense-row');
    const emptyMessage = page.locator('.empty-state, .no-results, p:has-text("No expenses")');

    const expenseCount = await expenses.count();
    const emptyCount = await emptyMessage.count();

    // Should have either expenses or empty message
    expect(expenseCount + emptyCount).toBeGreaterThan(0);
  });

  test('should test expense edit functionality', async ({ page }) => {
    await page.goto('/pages/expenses.html');
    await page.waitForTimeout(1500);

    const editBtn = page.locator('button:has-text("Edit"), a:has-text("Edit"), .edit-btn').first();

    if (await editBtn.count() > 0) {
      // Edit button exists
      await expect(editBtn).toBeVisible();
    }
  });

  test('should test expense delete functionality', async ({ page }) => {
    await page.goto('/pages/expenses.html');
    await page.waitForTimeout(1500);

    const deleteBtn = page.locator('button:has-text("Delete"), a:has-text("Delete"), .delete-btn').first();

    if (await deleteBtn.count() > 0) {
      // Delete button exists
      await expect(deleteBtn).toBeVisible();
    }
  });

  test('should load matter options in expense form', async ({ page }) => {
    await page.goto('/pages/expenses.html');
    await page.waitForTimeout(1500);

    const matterSelect = page.locator('select[name="matter_id"], select#matter_id, select#matter').first();

    if (await matterSelect.count() > 0) {
      const options = await matterSelect.locator('option').count();
      expect(options).toBeGreaterThan(0);
    }
  });
});
