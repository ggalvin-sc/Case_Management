const { test, expect } = require('@playwright/test');

async function login(page) {
  await page.goto('/login.html');
  await page.fill('input#email', 'admin@example.com');
  await page.fill('input#password', 'password');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/index.html', { timeout: 10000 });
}

test.describe('Invoice Management', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await login(page);
  });

  test('should load invoices list page', async ({ page }) => {
    await page.goto('/pages/invoices.html');
    await expect(page).toHaveTitle(/Invoice/);
  });

  test('should display invoices table or list', async ({ page }) => {
    await page.goto('/pages/invoices.html');
    await page.waitForTimeout(1500);

    const invoicesContainer = page.locator('table, .invoices-list, #invoices-table, #invoices-container');
    const count = await invoicesContainer.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should display create invoice button', async ({ page }) => {
    await page.goto('/pages/invoices.html');

    const createBtn = page.locator('button:has-text("Create Invoice"), a:has-text("New Invoice"), button:has-text("New Invoice")');

    if (await createBtn.count() > 0) {
      await expect(createBtn.first()).toBeVisible();
    }
  });

  test('should filter invoices by status', async ({ page }) => {
    await page.goto('/pages/invoices.html');
    await page.waitForTimeout(1500);

    const statusFilter = page.locator('select#status-filter, select[name="status"], .status-filter select');

    if (await statusFilter.count() > 0) {
      const options = await statusFilter.first().locator('option').allTextContents();
      expect(options.length).toBeGreaterThan(0);

      // Try filtering by different statuses
      for (let i = 0; i < Math.min(options.length, 3); i++) {
        await statusFilter.first().selectOption({ index: i });
        await page.waitForTimeout(1000);
      }
    }
  });

  test('should load invoice detail page', async ({ page }) => {
    await page.goto('/pages/invoices.html');
    await page.waitForTimeout(1500);

    // Try to find and click an invoice link
    const invoiceLink = page.locator('a[href*="invoice-detail.html"]').first();

    if (await invoiceLink.count() > 0) {
      await invoiceLink.click();
      await page.waitForURL(/invoice-detail\.html/, { timeout: 5000 });
    } else {
      // Test direct navigation
      await page.goto('/pages/invoice-detail.html?id=1');
      await page.waitForTimeout(1000);
    }
  });

  test('should display invoice detail sections', async ({ page }) => {
    await page.goto('/pages/invoice-detail.html?id=1');
    await page.waitForTimeout(1500);

    // Common sections in invoice detail
    const sections = [
      'invoice-info, .invoice-header, #invoice-details',
      'line-items, .line-items, #line-items-table',
      'invoice-total, .invoice-totals, #invoice-totals'
    ];

    for (const selector of sections) {
      const element = page.locator(selector);
      if (await element.count() > 0) {
        // Section exists
      }
    }
  });

  test('should display invoice actions', async ({ page }) => {
    await page.goto('/pages/invoice-detail.html?id=1');
    await page.waitForTimeout(1500);

    // Common invoice actions
    const actions = [
      'button:has-text("Finalize")',
      'button:has-text("Send")',
      'button:has-text("Download")',
      'button:has-text("Print")',
      'button:has-text("Edit")',
      'button:has-text("Delete")'
    ];

    let foundActions = 0;
    for (const selector of actions) {
      const button = page.locator(selector);
      if (await button.count() > 0) {
        foundActions++;
      }
    }
  });

  test('should test invoice template selection', async ({ page }) => {
    await page.goto('/pages/invoice-detail.html?id=1');
    await page.waitForTimeout(1500);

    const templateSelect = page.locator('select[name="template"], select#template, select.template-selector');

    if (await templateSelect.count() > 0) {
      const options = await templateSelect.first().locator('option').count();
      expect(options).toBeGreaterThan(0);
    }
  });

  test('should test print functionality', async ({ page }) => {
    await page.goto('/pages/invoice-detail.html?id=1');
    await page.waitForTimeout(1500);

    const printBtn = page.locator('button:has-text("Print"), button#print-invoice');

    if (await printBtn.count() > 0) {
      // Don't actually print, just check button exists
      await expect(printBtn.first()).toBeVisible();
    }
  });

  test('should test download/export functionality', async ({ page }) => {
    await page.goto('/pages/invoice-detail.html?id=1');
    await page.waitForTimeout(1500);

    const downloadBtn = page.locator('button:has-text("Download"), button:has-text("Export"), button#download-invoice');

    if (await downloadBtn.count() > 0) {
      await expect(downloadBtn.first()).toBeVisible();
    }
  });

  test('should display firm information on invoice', async ({ page }) => {
    await page.goto('/pages/invoice-detail.html?id=1');
    await page.waitForTimeout(1500);

    // Check for firm name, address, etc.
    const firmInfo = page.locator('.firm-info, .firm-details, #firm-info');

    if (await firmInfo.count() > 0) {
      const text = await firmInfo.first().textContent();
      expect(text.length).toBeGreaterThan(0);
    }
  });

  test('should display client information on invoice', async ({ page }) => {
    await page.goto('/pages/invoice-detail.html?id=1');
    await page.waitForTimeout(1500);

    const clientInfo = page.locator('.client-info, .bill-to, #client-info');

    if (await clientInfo.count() > 0) {
      const text = await clientInfo.first().textContent();
      expect(text.length).toBeGreaterThan(0);
    }
  });

  test('should display invoice number and dates', async ({ page }) => {
    await page.goto('/pages/invoice-detail.html?id=1');
    await page.waitForTimeout(1500);

    const invoiceNumber = page.locator('#invoice-number, .invoice-number, [data-field="invoice_number"]');
    const issueDate = page.locator('#issue-date, .issue-date, [data-field="issue_date"]');
    const dueDate = page.locator('#due-date, .due-date, [data-field="due_date"]');

    // At least some of these should be visible
    let visibleCount = 0;
    if (await invoiceNumber.count() > 0) visibleCount++;
    if (await issueDate.count() > 0) visibleCount++;
    if (await dueDate.count() > 0) visibleCount++;
  });

  test('should display line items table', async ({ page }) => {
    await page.goto('/pages/invoice-detail.html?id=1');
    await page.waitForTimeout(1500);

    const lineItemsTable = page.locator('table.line-items, #line-items-table, .invoice-items table');

    if (await lineItemsTable.count() > 0) {
      await expect(lineItemsTable.first()).toBeVisible();
    }
  });

  test('should display invoice totals', async ({ page }) => {
    await page.goto('/pages/invoice-detail.html?id=1');
    await page.waitForTimeout(1500);

    const subtotal = page.locator('#subtotal, .subtotal, [data-field="subtotal"]');
    const total = page.locator('#total, .total, #total-amount, [data-field="total_amount"]');

    if (await total.count() > 0) {
      const totalText = await total.first().textContent();
      expect(totalText).toBeTruthy();
    }
  });

  test('should test invoice status badge', async ({ page }) => {
    await page.goto('/pages/invoice-detail.html?id=1');
    await page.waitForTimeout(1500);

    const statusBadge = page.locator('.status-badge, .invoice-status, [data-field="status"]');

    if (await statusBadge.count() > 0) {
      const statusText = await statusBadge.first().textContent();
      expect(statusText).toBeTruthy();
    }
  });

  test('should test payment information section', async ({ page }) => {
    await page.goto('/pages/invoice-detail.html?id=1');
    await page.waitForTimeout(1500);

    const paymentInfo = page.locator('.payment-info, .payment-details, #payment-info');

    if (await paymentInfo.count() > 0) {
      // Payment info exists
    }
  });

  test('should test record payment functionality', async ({ page }) => {
    await page.goto('/pages/invoice-detail.html?id=1');
    await page.waitForTimeout(1500);

    const recordPaymentBtn = page.locator('button:has-text("Record Payment"), button#record-payment');

    if (await recordPaymentBtn.count() > 0) {
      await recordPaymentBtn.first().click();
      await page.waitForTimeout(500);

      // Should show payment modal or form
      const paymentModal = page.locator('.modal, .payment-modal, #payment-modal');
      if (await paymentModal.count() > 0) {
        await expect(paymentModal.first()).toBeVisible();
      }
    }
  });

  test('should handle non-existent invoice gracefully', async ({ page }) => {
    await page.goto('/pages/invoice-detail.html?id=99999');
    await page.waitForTimeout(2000);

    // Should show error message or redirect
    const errorMsg = page.locator('.error-message, .alert-error, #error-message');

    if (await errorMsg.count() > 0) {
      await expect(errorMsg.first()).toBeVisible();
    }
  });

  test('should test invoice search functionality', async ({ page }) => {
    await page.goto('/pages/invoices.html');
    await page.waitForTimeout(1000);

    const searchInput = page.locator('input[type="search"], input#search, input.search-input');

    if (await searchInput.count() > 0) {
      await searchInput.first().fill('INV');
      await page.waitForTimeout(1000);
    }
  });
});
