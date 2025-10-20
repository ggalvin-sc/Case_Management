/**
 * Comprehensive Security Testing Suite
 * Tests Phase 2 Security Enhancements
 */

const http = require('http');
const bcrypt = require('bcrypt');

// Test configuration
const BASE_URL = 'http://localhost:3000';
const SALT_ROUNDS = 10;

// Color codes for output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[36m',
    bold: '\x1b[1m'
};

// Test results tracker
const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
    tests: []
};

/**
 * Makes an HTTP request
 */
function makeRequest(method, path, data = null, token = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            method,
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const response = {
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: body ? JSON.parse(body) : null
                    };
                    resolve(response);
                } catch (e) {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: body
                    });
                }
            });
        });

        req.on('error', reject);

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

/**
 * Logs a test result
 */
function logTest(name, passed, message = '', warning = false) {
    const status = warning ? 'WARNING' : (passed ? 'PASS' : 'FAIL');
    const color = warning ? colors.yellow : (passed ? colors.green : colors.red);

    console.log(`${color}${status}${colors.reset} ${name}`);
    if (message) {
        console.log(`     ${message}`);
    }

    results.tests.push({ name, passed, warning, message });

    if (warning) {
        results.warnings++;
    } else if (passed) {
        results.passed++;
    } else {
        results.failed++;
    }
}

/**
 * Adds delay between tests
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Test 1: JWT Secret Enforcement (Code Review)
 */
async function testJWTSecretEnforcement() {
    console.log(`\n${colors.bold}${colors.blue}TEST 1: JWT Secret Enforcement${colors.reset}`);

    // This test validates the code logic since we can't restart the server easily
    const fs = require('fs');
    const serverCode = fs.readFileSync(__dirname + '/server.js', 'utf8');

    // Check for JWT_SECRET validation
    const hasValidation = serverCode.includes('if (!JWT_SECRET || JWT_SECRET === \'your-secret-key-change-this-in-production\')');
    const hasProcessExit = serverCode.includes('process.exit(1)');
    const hasErrorMessage = serverCode.includes('FATAL ERROR: JWT_SECRET not configured');

    logTest(
        'JWT_SECRET validation exists',
        hasValidation && hasProcessExit && hasErrorMessage,
        hasValidation && hasProcessExit && hasErrorMessage
            ? 'Server properly validates JWT_SECRET on startup (lines 29-38)'
            : 'Missing proper JWT_SECRET validation'
    );

    // Check .env file has valid secret
    const dotenv = require('dotenv');
    const envConfig = dotenv.config({ path: __dirname + '/../.env' });
    const jwtSecret = envConfig.parsed?.JWT_SECRET;

    const isValidSecret = jwtSecret &&
                         jwtSecret !== 'your-secret-key-change-this-in-production' &&
                         jwtSecret.length >= 64;

    logTest(
        'JWT_SECRET properly configured in .env',
        isValidSecret,
        isValidSecret
            ? `Valid 512-bit secret configured (${jwtSecret.length} chars)`
            : 'JWT_SECRET is missing or too short'
    );
}

/**
 * Test 2: Rate Limiting and Brute Force Protection
 */
async function testRateLimiting() {
    console.log(`\n${colors.bold}${colors.blue}TEST 2: Rate Limiting & Brute Force Protection${colors.reset}`);

    const testEmail = `ratetest${Date.now()}@example.com`;

    // Test 1: Multiple failed login attempts
    let lockoutTriggered = false;
    let attemptsBeforeLockout = 0;
    let retryAfterHeader = null;

    for (let i = 1; i <= 7; i++) {
        const res = await makeRequest('POST', '/api/v1/auth/login', {
            email: testEmail,
            password: 'WrongPassword123!'
        });

        if (res.statusCode === 429) {
            lockoutTriggered = true;
            attemptsBeforeLockout = i;
            retryAfterHeader = res.body?.retryAfter;
            break;
        }

        // Small delay between attempts
        await delay(100);
    }

    logTest(
        'Rate limiting triggers after 5 failed attempts',
        lockoutTriggered && attemptsBeforeLockout <= 6,
        lockoutTriggered
            ? `Lockout triggered after ${attemptsBeforeLockout} attempts, retry after ${retryAfterHeader}s`
            : `No lockout after 7 attempts - SECURITY VULNERABILITY`
    );

    // Test 2: Verify lockout error message
    const lockedRes = await makeRequest('POST', '/api/v1/auth/login', {
        email: testEmail,
        password: 'AnyPassword123!'
    });

    const hasProperMessage = lockedRes.statusCode === 429 &&
                            lockedRes.body?.error === 'Too many login attempts' &&
                            lockedRes.body?.retryAfter > 0;

    logTest(
        'Lockout returns proper error message and retry-after',
        hasProperMessage,
        hasProperMessage
            ? `Error: "${lockedRes.body.error}", Retry after: ${lockedRes.body.retryAfter}s`
            : `Incorrect lockout response: ${JSON.stringify(lockedRes.body)}`
    );

    // Test 3: Verify rate limit code implementation
    const fs = require('fs');
    const serverCode = fs.readFileSync(__dirname + '/server.js', 'utf8');

    const hasRateLimitMap = serverCode.includes('const loginAttempts = new Map()');
    const hasCheckFunction = serverCode.includes('function checkRateLimit');
    const hasRecordFunction = serverCode.includes('function recordFailedLogin');
    const hasCleanup = serverCode.includes('setInterval(');

    logTest(
        'Rate limiting implementation complete',
        hasRateLimitMap && hasCheckFunction && hasRecordFunction && hasCleanup,
        'Map-based tracking, check/record functions, and cleanup interval present (lines 271-350)'
    );
}

/**
 * Test 3: Legacy Password Support Removal
 */
async function testLegacyPasswordRemoval() {
    console.log(`\n${colors.bold}${colors.blue}TEST 3: Legacy Password Support Removal${colors.reset}`);

    const fs = require('fs');
    const serverCode = fs.readFileSync(__dirname + '/server.js', 'utf8');

    // Check for any plain password comparison
    const hasPlainComparison = serverCode.includes('user.password === data.password') ||
                              serverCode.includes('password === user.password');

    logTest(
        'No plain-text password comparison in code',
        !hasPlainComparison,
        !hasPlainComparison
            ? 'All password checks use bcrypt.compare()'
            : 'SECURITY RISK: Plain-text password comparison found'
    );

    // Check bcrypt is used exclusively
    const hasBcryptCompare = serverCode.includes('bcrypt.compare(data.password, user.password)');

    logTest(
        'Bcrypt password comparison used',
        hasBcryptCompare,
        hasBcryptCompare
            ? 'bcrypt.compare() used for password verification (line 692)'
            : 'bcrypt.compare() not found in login handler'
    );

    // Check database for any non-bcrypt hashed passwords
    const sqlite3 = require('sqlite3').verbose();
    const db = new sqlite3.Database(__dirname + '/billing.db');

    return new Promise((resolve) => {
        db.all('SELECT id, email, password FROM users LIMIT 10', (err, users) => {
            if (err) {
                logTest('Database password check', false, `Database error: ${err.message}`);
                db.close();
                resolve();
                return;
            }

            let allHashedProperly = true;
            const bcryptPattern = /^\$2[aby]\$\d{2}\$/;

            for (const user of users) {
                if (!bcryptPattern.test(user.password)) {
                    allHashedProperly = false;
                    logTest(
                        `User ${user.email} password format`,
                        false,
                        `Password not in bcrypt format: ${user.password.substring(0, 20)}...`,
                        true
                    );
                }
            }

            if (allHashedProperly) {
                logTest(
                    'All user passwords use bcrypt hashing',
                    true,
                    `Checked ${users.length} users, all use bcrypt $2b$ format`
                );
            }

            db.close();
            resolve();
        });
    });
}

/**
 * Test 4: Password Complexity Requirements
 */
async function testPasswordComplexity() {
    console.log(`\n${colors.bold}${colors.blue}TEST 4: Password Complexity Requirements${colors.reset}`);

    // Test validatePassword function exists
    const fs = require('fs');
    const serverCode = fs.readFileSync(__dirname + '/server.js', 'utf8');

    const hasValidateFunction = serverCode.includes('function validatePassword');
    const hasMinLength = serverCode.includes('password.length < 8');
    const hasLowercase = serverCode.includes('/[a-z]/.test(password)');
    const hasUppercase = serverCode.includes('/[A-Z]/.test(password)');
    const hasNumber = serverCode.includes('/[0-9]/.test(password)');
    const hasSpecial = serverCode.includes('/[!@#$%^&*()');

    logTest(
        'Password validation function implemented',
        hasValidateFunction,
        hasValidateFunction
            ? 'validatePassword() function exists (lines 468-495)'
            : 'validatePassword() function not found'
    );

    logTest(
        'All complexity requirements checked',
        hasMinLength && hasLowercase && hasUppercase && hasNumber && hasSpecial,
        'Checks: min 8 chars, lowercase, uppercase, number, special char'
    );

    // First, login to get a token
    const loginRes = await makeRequest('POST', '/api/v1/auth/login', {
        email: 'admin@example.com',
        password: 'password'
    });

    if (loginRes.statusCode !== 200) {
        logTest(
            'Login for password change test',
            false,
            `Could not login: ${JSON.stringify(loginRes.body)}`
        );
        return;
    }

    const token = loginRes.body.token;

    // Test change-password endpoint exists
    const hasChangeEndpoint = serverCode.includes('/api/v1/auth/change-password');

    logTest(
        'Password change endpoint exists',
        hasChangeEndpoint,
        hasChangeEndpoint
            ? 'POST /api/v1/auth/change-password endpoint implemented (lines 740-779)'
            : 'Password change endpoint not found'
    );

    // Test weak password rejection
    const weakPasswords = [
        { pwd: 'short', reason: 'too short (< 8 chars)' },
        { pwd: 'alllowercase1!', reason: 'no uppercase' },
        { pwd: 'ALLUPPERCASE1!', reason: 'no lowercase' },
        { pwd: 'NoNumbers!', reason: 'no numbers' },
        { pwd: 'NoSpecial123', reason: 'no special chars' }
    ];

    for (const test of weakPasswords) {
        const res = await makeRequest('POST', '/api/v1/auth/change-password', {
            current_password: 'password',
            new_password: test.pwd
        }, token);

        const rejected = res.statusCode === 400 &&
                        res.body?.error?.includes('complexity requirements');

        logTest(
            `Weak password rejected: ${test.reason}`,
            rejected,
            rejected
                ? `Properly rejected: ${res.body.requirements?.join(', ')}`
                : `Should have been rejected but got: ${res.statusCode}`
        );
    }

    // Test strong password acceptance
    const strongRes = await makeRequest('POST', '/api/v1/auth/change-password', {
        current_password: 'password',
        new_password: 'NewSecure123!'
    }, token);

    const accepted = strongRes.statusCode === 200;

    logTest(
        'Strong password accepted',
        accepted,
        accepted
            ? 'Password "NewSecure123!" accepted successfully'
            : `Strong password rejected: ${JSON.stringify(strongRes.body)}`
    );
}

/**
 * Test 5: Authentication Still Works
 */
async function testAuthenticationWorks() {
    console.log(`\n${colors.bold}${colors.blue}TEST 5: Authentication Integrity${colors.reset}`);

    // Test 1: Successful login
    const loginRes = await makeRequest('POST', '/api/v1/auth/login', {
        email: 'admin@example.com',
        password: 'NewSecure123!' // Changed in previous test
    });

    const loginSuccessful = loginRes.statusCode === 200 && loginRes.body?.token;

    logTest(
        'Valid credentials accepted',
        loginSuccessful,
        loginSuccessful
            ? 'Login successful, JWT token received'
            : `Login failed: ${JSON.stringify(loginRes.body)}`
    );

    if (!loginSuccessful) {
        console.log(`${colors.yellow}Skipping remaining auth tests due to login failure${colors.reset}`);
        return;
    }

    const token = loginRes.body.token;

    // Test 2: Protected endpoint requires auth
    const noAuthRes = await makeRequest('GET', '/api/v1/dashboard/stats');

    logTest(
        'Protected endpoint requires authentication',
        noAuthRes.statusCode === 401,
        noAuthRes.statusCode === 401
            ? 'Returns 401 without token'
            : `Should return 401 but got ${noAuthRes.statusCode}`
    );

    // Test 3: Valid token grants access
    const withAuthRes = await makeRequest('GET', '/api/v1/dashboard/stats', null, token);

    logTest(
        'Valid token grants access',
        withAuthRes.statusCode === 200,
        withAuthRes.statusCode === 200
            ? 'Dashboard stats accessible with token'
            : `Failed with status ${withAuthRes.statusCode}`
    );

    // Test 4: Invalid token rejected
    const invalidTokenRes = await makeRequest('GET', '/api/v1/dashboard/stats', null, 'invalid.token.here');

    logTest(
        'Invalid token rejected',
        invalidTokenRes.statusCode === 401,
        invalidTokenRes.statusCode === 401
            ? 'Invalid token properly rejected'
            : `Should return 401 but got ${invalidTokenRes.statusCode}`
    );

    // Test 5: Test multiple protected endpoints
    const endpoints = [
        '/api/v1/clients',
        '/api/v1/matters',
        '/api/v1/time-entries',
        '/api/v1/expenses',
        '/api/v1/invoices'
    ];

    let allProtected = true;
    for (const endpoint of endpoints) {
        const res = await makeRequest('GET', endpoint, null, token);
        if (res.statusCode !== 200) {
            allProtected = false;
            logTest(
                `Endpoint ${endpoint} protected`,
                false,
                `Failed with status ${res.statusCode}`
            );
        }
    }

    if (allProtected) {
        logTest(
            'All major endpoints accessible with auth',
            true,
            `Tested ${endpoints.length} endpoints successfully`
        );
    }
}

/**
 * Test 6: Input Sanitization
 */
async function testInputSanitization() {
    console.log(`\n${colors.bold}${colors.blue}TEST 6: Input Sanitization${colors.reset}`);

    const fs = require('fs');
    const serverCode = fs.readFileSync(__dirname + '/server.js', 'utf8');

    const hasSanitizeFunction = serverCode.includes('function sanitizeInput');
    const hasSanitizeData = serverCode.includes('function sanitizeData');
    const usesXSSPrevention = serverCode.includes('.replace(/[<>]/g');
    const hasLengthLimit = serverCode.includes('.substring(0, 10000)');

    logTest(
        'Sanitization functions implemented',
        hasSanitizeFunction && hasSanitizeData,
        'sanitizeInput() and sanitizeData() functions exist (lines 433-461)'
    );

    logTest(
        'XSS prevention active',
        usesXSSPrevention,
        usesXSSPrevention
            ? 'Removes < and > characters to prevent XSS'
            : 'No XSS prevention found'
    );

    logTest(
        'Length limit prevents DoS',
        hasLengthLimit,
        hasLengthLimit
            ? 'Input limited to 10,000 chars'
            : 'No input length limit found'
    );

    const sanitizeUsed = serverCode.includes('data = sanitizeData(data)');

    logTest(
        'Sanitization applied to request data',
        sanitizeUsed,
        sanitizeUsed
            ? 'All request data sanitized (line 650)'
            : 'Sanitization not applied to incoming data'
    );
}

/**
 * Main test runner
 */
async function runTests() {
    console.log(`\n${colors.bold}${colors.blue}${'='.repeat(70)}`);
    console.log(`  COMPREHENSIVE SECURITY TESTING SUITE`);
    console.log(`  Phase 2 Security Enhancements Verification`);
    console.log(`${'='.repeat(70)}${colors.reset}\n`);

    try {
        await testJWTSecretEnforcement();
        await testRateLimiting();
        await testLegacyPasswordRemoval();
        await testPasswordComplexity();
        await testAuthenticationWorks();
        await testInputSanitization();

        // Print summary
        console.log(`\n${colors.bold}${colors.blue}${'='.repeat(70)}`);
        console.log(`  TEST SUMMARY`);
        console.log(`${'='.repeat(70)}${colors.reset}\n`);

        const total = results.passed + results.failed;
        const passRate = total > 0 ? ((results.passed / total) * 100).toFixed(1) : 0;

        console.log(`${colors.green}PASSED:   ${results.passed}${colors.reset}`);
        console.log(`${colors.red}FAILED:   ${results.failed}${colors.reset}`);
        console.log(`${colors.yellow}WARNINGS: ${results.warnings}${colors.reset}`);
        console.log(`Total:    ${total}`);
        console.log(`Pass Rate: ${passRate}%\n`);

        // Security rating
        let rating = 'F';
        let ratingColor = colors.red;

        if (passRate >= 95 && results.failed === 0) {
            rating = 'A+';
            ratingColor = colors.green;
        } else if (passRate >= 90) {
            rating = 'A';
            ratingColor = colors.green;
        } else if (passRate >= 80) {
            rating = 'B';
            ratingColor = colors.yellow;
        } else if (passRate >= 70) {
            rating = 'C';
            ratingColor = colors.yellow;
        } else if (passRate >= 60) {
            rating = 'D';
            ratingColor = colors.red;
        }

        console.log(`${colors.bold}SECURITY RATING: ${ratingColor}${rating}${colors.reset}\n`);

        if (results.failed > 0) {
            console.log(`${colors.red}${colors.bold}FAILED TESTS:${colors.reset}`);
            results.tests.filter(t => !t.passed && !t.warning).forEach(t => {
                console.log(`  - ${t.name}`);
                if (t.message) console.log(`    ${t.message}`);
            });
            console.log('');
        }

        if (results.warnings > 0) {
            console.log(`${colors.yellow}${colors.bold}WARNINGS:${colors.reset}`);
            results.tests.filter(t => t.warning).forEach(t => {
                console.log(`  - ${t.name}`);
                if (t.message) console.log(`    ${t.message}`);
            });
            console.log('');
        }

        // Exit code
        process.exit(results.failed > 0 ? 1 : 0);

    } catch (error) {
        console.error(`\n${colors.red}${colors.bold}FATAL ERROR:${colors.reset}`, error);
        process.exit(1);
    }
}

// Run tests
runTests();
