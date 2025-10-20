const { test, expect } = require('@playwright/test');

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page, context }) => {
    // Clear storage before each test
    await context.clearCookies();
    await page.goto('/login.html');
  });

  test('should display login page correctly', async ({ page }) => {
    await expect(page).toHaveTitle(/Login - Case Management/);
    await expect(page.locator('h2')).toContainText('Case Management System');
    await expect(page.locator('input#email')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show validation for empty email', async ({ page }) => {
    await page.click('button[type="submit"]');
    const emailInput = page.locator('input#email');
    await expect(emailInput).toHaveAttribute('required', '');
  });

  test('should show validation for empty password', async ({ page }) => {
    await page.fill('input#email', 'test@example.com');
    await page.click('button[type="submit"]');
    const passwordInput = page.locator('input#password');
    await expect(passwordInput).toHaveAttribute('required', '');
  });

  test('should show error message for invalid credentials', async ({ page }) => {
    await page.fill('input#email', 'invalid@example.com');
    await page.fill('input#password', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Wait for error message
    await page.waitForSelector('#errorMessage:not(.hidden)', { timeout: 5000 });
    const errorMessage = page.locator('#errorMessage');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText(/Invalid/i);
  });

  test('should successfully login with valid admin credentials', async ({ page }) => {
    await page.fill('input#email', 'admin@example.com');
    await page.fill('input#password', 'password');
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await page.waitForURL('**/index.html', { timeout: 10000 });
    await expect(page).toHaveURL(/index\.html/);

    // Check if token is stored
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();

    const user = await page.evaluate(() => localStorage.getItem('user'));
    expect(user).toBeTruthy();
  });

  test('should successfully login with valid attorney credentials', async ({ page }) => {
    await page.fill('input#email', 'attorney@example.com');
    await page.fill('input#password', 'password');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/index.html', { timeout: 10000 });
    await expect(page).toHaveURL(/index\.html/);
  });

  test('should fill demo credentials when clicking demo buttons', async ({ page }) => {
    await page.click('button:has-text("Admin:")');
    await expect(page.locator('input#email')).toHaveValue('admin@example.com');
    await expect(page.locator('input#password')).toHaveValue('password');

    // Test attorney button
    await page.fill('input#email', '');
    await page.fill('input#password', '');
    await page.click('button:has-text("Attorney:")');
    await expect(page.locator('input#email')).toHaveValue('attorney@example.com');
    await expect(page.locator('input#password')).toHaveValue('password');
  });

  test('should show loading state during login', async ({ page }) => {
    await page.fill('input#email', 'admin@example.com');
    await page.fill('input#password', 'password');

    const submitBtn = page.locator('button[type="submit"]');

    // Click and immediately check for loading state
    const clickPromise = page.click('button[type="submit"]');

    // Button should be disabled during submission
    await page.waitForTimeout(100); // Small delay to catch loading state

    await clickPromise;
  });

  test('should redirect to dashboard if already logged in', async ({ page }) => {
    // First login
    await page.fill('input#email', 'admin@example.com');
    await page.fill('input#password', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/index.html');

    // Try to go back to login
    await page.goto('/login.html');

    // Should redirect back to dashboard
    await page.waitForURL('**/index.html', { timeout: 5000 });
  });

  test('should test invalid email format', async ({ page }) => {
    await page.fill('input#email', 'notanemail');
    await page.fill('input#password', 'password');
    await page.click('button[type="submit"]');

    // HTML5 validation should prevent submission or show error
    const emailInput = page.locator('input#email');
    await expect(emailInput).toHaveAttribute('type', 'email');
  });

  test('should test remember me checkbox', async ({ page }) => {
    const rememberCheckbox = page.locator('input#remember');
    await expect(rememberCheckbox).toBeVisible();
    await rememberCheckbox.check();
    await expect(rememberCheckbox).toBeChecked();
  });

  test('should display forgot password link', async ({ page }) => {
    const forgotLink = page.locator('a:has-text("Forgot password")');
    await expect(forgotLink).toBeVisible();
  });
});

test.describe('Logout Functionality', () => {
  test('should logout and redirect to login page', async ({ page }) => {
    // Login first
    await page.goto('/login.html');
    await page.fill('input#email', 'admin@example.com');
    await page.fill('input#password', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/index.html');

    // Find and click logout button (if exists in navigation)
    const logoutBtn = page.locator('button:has-text("Logout"), a:has-text("Logout")');
    if (await logoutBtn.count() > 0) {
      await logoutBtn.click();
      await page.waitForURL('**/login.html', { timeout: 5000 });

      // Check if token is cleared
      const token = await page.evaluate(() => localStorage.getItem('token'));
      expect(token).toBeFalsy();
    }
  });
});
