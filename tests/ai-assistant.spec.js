const { test, expect } = require('@playwright/test');

test.describe('AI Assistant', () => {
    test.beforeEach(async ({ page }) => {
        // Login before each test
        await page.goto('https://localhost:3000/login.html');

        // Fill login form
        await page.fill('#email', 'attorney@example.com');
        await page.fill('#password', 'password123');

        // Submit login
        await page.click('button[type="submit"]');

        // Wait for navigation (could be index.html or /)
        await page.waitForURL(/\/(index\.html)?$/, { timeout: 10000 });

        // Navigate to AI Assistant
        await page.goto('https://localhost:3000/pages/ai-assistant.html');
        await page.waitForLoadState('networkidle');
    });

    test('should load AI Assistant page', async ({ page }) => {
        // Check page title
        await expect(page.locator('h1')).toContainText('AI Legal Assistant');

        // Check question form exists
        await expect(page.locator('#questionForm')).toBeVisible();
        await expect(page.locator('#question')).toBeVisible();
        await expect(page.locator('#submitBtn')).toBeVisible();
    });

    test('should display character count', async ({ page }) => {
        const textarea = page.locator('#question');
        const charCount = page.locator('#charCount');

        // Initially should be 0
        await expect(charCount).toHaveText('0');

        // Type a question
        await textarea.fill('What is a contract?');

        // Character count should update
        await expect(charCount).toHaveText('20');
    });

    test('should submit question and display answer', async ({ page }) => {
        // Fill question
        await page.fill('#question', 'What is the statute of limitations?');

        // Submit form
        await page.click('#submitBtn');

        // Wait for loading to appear
        await expect(page.locator('#loadingSection')).toBeVisible({ timeout: 5000 });

        // Wait for answer section (with longer timeout for AI processing)
        await expect(page.locator('#answerSection')).toBeVisible({ timeout: 120000 });

        // Check that loading is hidden
        await expect(page.locator('#loadingSection')).toBeHidden();

        // Check question is displayed
        const questionDisplay = page.locator('#questionDisplay p:last-child');
        await expect(questionDisplay).toContainText('statute of limitations');

        // Check answer is displayed (should not be empty or [object Object])
        const answerDisplay = page.locator('#answerDisplay');
        await expect(answerDisplay).toBeVisible();
        const answerText = await answerDisplay.textContent();
        expect(answerText).not.toBe('');
        expect(answerText).not.toContain('[object Object]');
        expect(answerText.length).toBeGreaterThan(10);

        // Check execution time is shown
        await expect(page.locator('#executionTime')).toContainText('Answered in');
    });

    test('should handle sample questions', async ({ page }) => {
        // Click on a sample question button
        const sampleButton = page.locator('button').filter({ hasText: 'Statute of limitations (CA)' });
        await sampleButton.click();

        // Check that question textarea is filled
        const textarea = page.locator('#question');
        await expect(textarea).toHaveValue(/statute of limitations/i);
    });

    test('should copy answer to clipboard', async ({ page }) => {
        // First submit a question
        await page.fill('#question', 'What is discovery?');
        await page.click('#submitBtn');

        // Wait for answer
        await expect(page.locator('#answerSection')).toBeVisible({ timeout: 120000 });

        // Grant clipboard permissions
        await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

        // Click copy button
        await page.click('text=Copy Answer');

        // Verify button text changes temporarily
        await expect(page.locator('button').filter({ hasText: 'Copied!' })).toBeVisible({ timeout: 1000 });
    });

    test('should start new question', async ({ page }) => {
        // Submit first question
        await page.fill('#question', 'What is mediation?');
        await page.click('#submitBtn');

        // Wait for answer
        await expect(page.locator('#answerSection')).toBeVisible({ timeout: 120000 });

        // Click New Question
        await page.click('text=New Question');

        // Check that answer is hidden and form is reset
        await expect(page.locator('#answerSection')).toBeHidden();
        await expect(page.locator('#question')).toHaveValue('');
        await expect(page.locator('#charCount')).toHaveText('0');
    });

    test('should load recent questions', async ({ page }) => {
        // Check recent questions section
        const recentSection = page.locator('#recentQuestions');
        await expect(recentSection).toBeVisible();

        // Should either show "Loading..." initially or questions
        const content = await recentSection.textContent();
        expect(content.length).toBeGreaterThan(0);
    });

    test('should show error on empty question', async ({ page }) => {
        // Try to submit empty question
        await page.click('#submitBtn');

        // Form validation should prevent submission
        const textarea = page.locator('#question');
        const validationMessage = await textarea.evaluate(el => el.validationMessage);
        expect(validationMessage).toBeTruthy();
    });

    test('should handle CSRF token expiration gracefully', async ({ page }) => {
        // Clear cookies to simulate expired session
        await page.context().clearCookies();

        // Try to submit a question
        await page.fill('#question', 'Test question');
        await page.click('#submitBtn');

        // Should either show error or redirect to login
        await page.waitForTimeout(2000);

        // Check if redirected to login or error shown
        const currentUrl = page.url();
        const errorSection = page.locator('#errorSection');

        const isLoginPage = currentUrl.includes('login.html');
        const hasError = await errorSection.isVisible().catch(() => false);

        expect(isLoginPage || hasError).toBe(true);
    });

    test('should display tips and sample questions', async ({ page }) => {
        // Check tips section
        await expect(page.locator('text=Tips for Better Answers')).toBeVisible();
        await expect(page.locator('text=Be specific about jurisdiction')).toBeVisible();

        // Check sample questions section
        await expect(page.locator('text=Sample Questions')).toBeVisible();
        await expect(page.locator('text=Elements of a contract')).toBeVisible();
    });
});
