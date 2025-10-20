/**
 * RunPod Console Automation Script
 *
 * This script uses Playwright to log into the RunPod console and fetch
 * endpoint IDs from the serverless page. It saves the endpoint IDs to
 * a configuration file for use with the RunPod clients.
 *
 * Usage:
 *   RUNPOD_EMAIL=your@email.com RUNPOD_PASSWORD=your_password node scripts/fetch-runpod-endpoints.js
 *
 * Requirements:
 *   - npm install @playwright/test
 *   - RunPod account credentials
 *
 * Security Note:
 *   This script requires your RunPod credentials. Use environment variables
 *   and never commit credentials to version control.
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const RUNPOD_CONSOLE_URL = 'https://console.runpod.io/';
const SERVERLESS_URL = 'https://console.runpod.io/serverless';
const OUTPUT_FILE = path.join(__dirname, '..', 'runpod-endpoints.json');

/**
 * Fetch RunPod endpoint IDs from the console
 *
 * @param {string} email - RunPod account email
 * @param {string} password - RunPod account password
 * @returns {Promise<Object>} Endpoint information
 */
async function fetchRunPodEndpoints(email, password) {
    console.log('[RunPod Fetcher] Starting browser...');

    const browser = await chromium.launch({
        headless: false, // Set to true for headless mode
    });

    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    });

    const page = await context.newPage();

    try {
        console.log('[RunPod Fetcher] Navigating to RunPod console...');
        await page.goto(RUNPOD_CONSOLE_URL, { waitUntil: 'networkidle' });

        // Wait for login form or check if already logged in
        console.log('[RunPod Fetcher] Checking login status...');

        // Wait for either the login button or the dashboard
        const loginSelector = 'input[type="email"], input[name="email"]';
        const dashboardSelector = '[data-testid="dashboard"], .dashboard, nav';

        try {
            await page.waitForSelector(`${loginSelector}, ${dashboardSelector}`, { timeout: 10000 });
        } catch (e) {
            console.error('[RunPod Fetcher] Could not find login form or dashboard');
            throw new Error('Login page structure may have changed');
        }

        // Check if we need to log in
        const needsLogin = await page.locator(loginSelector).count() > 0;

        if (needsLogin) {
            console.log('[RunPod Fetcher] Logging in...');

            // Fill in email
            await page.fill('input[type="email"], input[name="email"]', email);

            // Fill in password
            await page.fill('input[type="password"], input[name="password"]', password);

            // Click login button
            await page.click('button[type="submit"], button:has-text("Sign In"), button:has-text("Log In")');

            // Wait for navigation after login
            await page.waitForLoadState('networkidle');
            console.log('[RunPod Fetcher] Logged in successfully');
        } else {
            console.log('[RunPod Fetcher] Already logged in');
        }

        // Navigate to serverless page
        console.log('[RunPod Fetcher] Navigating to serverless page...');
        await page.goto(SERVERLESS_URL, { waitUntil: 'networkidle' });

        // Wait for the page to load
        await page.waitForTimeout(2000);

        console.log('[RunPod Fetcher] Extracting endpoint information...');

        // Try to find endpoint cards or list items
        // Note: This selector may need adjustment based on actual page structure
        const endpoints = await page.evaluate(() => {
            const endpointList = [];

            // Try different selectors for endpoints
            const selectors = [
                '[data-testid="endpoint-card"]',
                '.endpoint-card',
                '[class*="endpoint"]',
                'a[href*="/serverless/"]',
            ];

            for (const selector of selectors) {
                const elements = document.querySelectorAll(selector);

                if (elements.length > 0) {
                    console.log(`Found ${elements.length} elements with selector: ${selector}`);

                    elements.forEach((el) => {
                        // Try to extract endpoint ID from various attributes
                        const href = el.getAttribute('href') || el.closest('a')?.getAttribute('href') || '';
                        const text = el.textContent || '';

                        // Extract endpoint ID from URL (format: /serverless/endpoint-id)
                        const match = href.match(/\/serverless\/([a-zA-Z0-9-]+)/);

                        if (match && match[1]) {
                            const endpointId = match[1];
                            const name = text.trim().split('\n')[0] || endpointId;

                            endpointList.push({
                                id: endpointId,
                                name: name,
                                url: `https://console.runpod.io${href}`,
                            });
                        }
                    });

                    if (endpointList.length > 0) {
                        break; // Found endpoints, no need to try other selectors
                    }
                }
            }

            return endpointList;
        });

        console.log(`[RunPod Fetcher] Found ${endpoints.length} endpoints`);

        if (endpoints.length === 0) {
            console.warn('[RunPod Fetcher] No endpoints found. The page structure may have changed.');
            console.warn('[RunPod Fetcher] Taking a screenshot for debugging...');
            await page.screenshot({ path: 'runpod-serverless-page.png', fullPage: true });
            console.warn('[RunPod Fetcher] Screenshot saved to: runpod-serverless-page.png');
        }

        // Save to file
        const output = {
            fetched_at: new Date().toISOString(),
            count: endpoints.length,
            endpoints: endpoints,
        };

        await fs.writeFile(OUTPUT_FILE, JSON.stringify(output, null, 2));
        console.log(`[RunPod Fetcher] Saved endpoint information to: ${OUTPUT_FILE}`);

        // Print summary
        console.log('\n=== Endpoint Summary ===');
        endpoints.forEach((ep, index) => {
            console.log(`${index + 1}. ${ep.name}`);
            console.log(`   ID: ${ep.id}`);
            console.log(`   URL: ${ep.url}`);
        });

        return output;

    } catch (error) {
        console.error('[RunPod Fetcher] Error:', error.message);
        console.error('[RunPod Fetcher] Taking error screenshot...');
        await page.screenshot({ path: 'runpod-error.png', fullPage: true });
        console.error('[RunPod Fetcher] Screenshot saved to: runpod-error.png');
        throw error;
    } finally {
        await browser.close();
    }
}

/**
 * Update .env file with fetched endpoint IDs
 *
 * @param {Array} endpoints - List of endpoints
 */
async function updateEnvFile(endpoints) {
    if (endpoints.length === 0) {
        console.log('[RunPod Fetcher] No endpoints to update in .env');
        return;
    }

    const envPath = path.join(__dirname, '..', '.env');

    try {
        let envContent = await fs.readFile(envPath, 'utf8');

        // Update or add default endpoint ID (use first endpoint)
        const defaultEndpoint = endpoints[0];
        const endpointIdPattern = /^RUNPOD_DEFAULT_ENDPOINT_ID=.*$/m;

        if (endpointIdPattern.test(envContent)) {
            envContent = envContent.replace(
                endpointIdPattern,
                `RUNPOD_DEFAULT_ENDPOINT_ID=${defaultEndpoint.id}`
            );
        } else {
            envContent += `\nRUNPOD_DEFAULT_ENDPOINT_ID=${defaultEndpoint.id}\n`;
        }

        await fs.writeFile(envPath, envContent);
        console.log(`[RunPod Fetcher] Updated .env with default endpoint: ${defaultEndpoint.id}`);
    } catch (error) {
        console.error('[RunPod Fetcher] Failed to update .env file:', error.message);
    }
}

// Main execution
async function main() {
    const email = process.env.RUNPOD_EMAIL;
    const password = process.env.RUNPOD_PASSWORD;

    if (!email || !password) {
        console.error('Error: RUNPOD_EMAIL and RUNPOD_PASSWORD must be set');
        console.error('');
        console.error('Usage:');
        console.error('  RUNPOD_EMAIL=your@email.com RUNPOD_PASSWORD=your_password node scripts/fetch-runpod-endpoints.js');
        process.exit(1);
    }

    try {
        const result = await fetchRunPodEndpoints(email, password);

        if (result.endpoints.length > 0) {
            await updateEnvFile(result.endpoints);
            console.log('\n✅ Successfully fetched RunPod endpoints!');
            console.log(`📄 Results saved to: ${OUTPUT_FILE}`);
        } else {
            console.log('\n⚠️  No endpoints found. Please check the RunPod console manually.');
            console.log('   The page structure may have changed or you may not have any endpoints.');
        }

    } catch (error) {
        console.error('\n❌ Failed to fetch RunPod endpoints');
        console.error(error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { fetchRunPodEndpoints };
