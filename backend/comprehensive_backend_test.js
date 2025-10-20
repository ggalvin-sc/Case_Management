/**
 * Comprehensive Backend API Testing Suite
 * Tests all endpoints systematically with proper authentication,
 * error handling, and integration validation
 */

const http = require('http');
const https = require('https');

// Test Configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const USE_HTTPS = BASE_URL.startsWith('https');

// Test results tracking
const results = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    tests: []
};

let authToken = null;
let csrfToken = null;
let testUserId = null;
let testClientId = null;
let testMatterId = null;
let testTimeEntryId = null;
let testExpenseId = null;
let testInvoiceId = null;

/**
 * Makes HTTP/HTTPS request
 */
function makeRequest(method, path, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const protocol = USE_HTTPS ? https : http;

        const options = {
            hostname: url.hostname,
            port: url.port || (USE_HTTPS ? 443 : 80),
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        if (authToken) {
            options.headers['Authorization'] = `Bearer ${authToken}`;
        }

        if (csrfToken) {
            options.headers['X-CSRF-Token'] = csrfToken;
        }

        const req = protocol.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = data ? JSON.parse(data) : {};
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: parsed
                    });
                } catch (e) {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: data
                    });
                }
            });
        });

        req.on('error', reject);

        if (body) {
            req.write(JSON.stringify(body));
        }

        req.end();
    });
}

/**
 * Test helper - records test result
 */
function test(name, fn) {
    return async () => {
        results.total++;
        console.log(`\n[TEST] ${name}`);

        try {
            const startTime = Date.now();
            await fn();
            const duration = Date.now() - startTime;

            results.passed++;
            results.tests.push({
                name,
                status: 'PASSED',
                duration,
                error: null
            });
            console.log(`✓ PASSED (${duration}ms)`);
        } catch (error) {
            results.failed++;
            results.tests.push({
                name,
                status: 'FAILED',
                duration: 0,
                error: error.message
            });
            console.log(`✗ FAILED: ${error.message}`);
        }
    };
}

/**
 * Assertion helpers
 */
function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

function assertEquals(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
}

function assertStatus(response, expectedStatus, message) {
    if (response.statusCode !== expectedStatus) {
        throw new Error(
            message ||
            `Expected status ${expectedStatus}, got ${response.statusCode}. Body: ${JSON.stringify(response.body)}`
        );
    }
}

/**
 * Test Suite
 */

// 1. Authentication Tests
const testLoginSuccess = test('POST /api/v1/auth/login - Successful login', async () => {
    const response = await makeRequest('POST', '/api/v1/auth/login', {
        email: 'admin@example.com',
        password: 'admin123'
    });

    assertStatus(response, 200, 'Login should return 200');
    assert(response.body.token, 'Should return JWT token');
    assert(response.body.user, 'Should return user object');

    authToken = response.body.token;
    testUserId = response.body.user.id;
    csrfToken = response.headers['x-csrf-token'];
});

const testLoginFailure = test('POST /api/v1/auth/login - Invalid credentials', async () => {
    const response = await makeRequest('POST', '/api/v1/auth/login', {
        email: 'admin@example.com',
        password: 'wrongpassword'
    });

    assertStatus(response, 401, 'Should return 401 for invalid credentials');
});

const testAuthMe = test('GET /api/v1/auth/me - Get current user', async () => {
    const response = await makeRequest('GET', '/api/v1/auth/me');

    assertStatus(response, 200);
    assert(response.body.id === testUserId, 'Should return current user');
});

const testAuthMeUnauthorized = test('GET /api/v1/auth/me - Unauthorized access', async () => {
    const savedToken = authToken;
    authToken = null;

    const response = await makeRequest('GET', '/api/v1/auth/me');
    assertStatus(response, 401, 'Should return 401 without token');

    authToken = savedToken;
});

// 2. Dashboard Tests
const testDashboardStats = test('GET /api/v1/dashboard/stats - Get dashboard statistics', async () => {
    const response = await makeRequest('GET', '/api/v1/dashboard/stats');
    assertStatus(response, 200);
    assert(typeof response.body === 'object', 'Should return stats object');
});

const testDashboardActivity = test('GET /api/v1/dashboard/activity - Get recent activity', async () => {
    const response = await makeRequest('GET', '/api/v1/dashboard/activity');
    assertStatus(response, 200);
    assert(Array.isArray(response.body), 'Should return activity array');
});

// 3. Client Tests
const testGetClients = test('GET /api/v1/clients - List all clients', async () => {
    const response = await makeRequest('GET', '/api/v1/clients');
    assertStatus(response, 200);
    assert(Array.isArray(response.body), 'Should return clients array');
});

const testCreateClient = test('POST /api/v1/clients - Create new client', async () => {
    const response = await makeRequest('POST', '/api/v1/clients', {
        name: 'Test Client Corporation',
        email: 'testclient@example.com',
        phone: '555-0123',
        address: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zip_code: '12345',
        country: 'USA'
    });

    assertStatus(response, 201, 'Should return 201 for created client');
    assert(response.body.id, 'Should return client with ID');

    testClientId = response.body.id;
});

const testGetClientById = test('GET /api/v1/clients/:id - Get specific client', async () => {
    const response = await makeRequest('GET', `/api/v1/clients/${testClientId}`);
    assertStatus(response, 200);
    assertEquals(response.body.id, testClientId, 'Should return correct client');
});

const testUpdateClient = test('PATCH /api/v1/clients/:id - Update client', async () => {
    const response = await makeRequest('PATCH', `/api/v1/clients/${testClientId}`, {
        phone: '555-9999'
    });

    assertStatus(response, 200);
    assertEquals(response.body.phone, '555-9999', 'Should update phone number');
});

// 4. Matter Tests
const testGetMatters = test('GET /api/v1/matters - List all matters', async () => {
    const response = await makeRequest('GET', '/api/v1/matters');
    assertStatus(response, 200);
    assert(Array.isArray(response.body), 'Should return matters array');
});

const testCreateMatter = test('POST /api/v1/matters - Create new matter', async () => {
    const response = await makeRequest('POST', '/api/v1/matters', {
        name: 'Test Matter',
        client_id: testClientId,
        description: 'Test matter description',
        status: 'open',
        billing_type: 'hourly',
        hourly_rate: 250.00,
        matter_type: 'litigation',
        priority: 'high'
    });

    assertStatus(response, 201, 'Should return 201 for created matter');
    assert(response.body.id, 'Should return matter with ID');

    testMatterId = response.body.id;
});

const testGetMatterById = test('GET /api/v1/matters/:id - Get specific matter', async () => {
    const response = await makeRequest('GET', `/api/v1/matters/${testMatterId}`);
    assertStatus(response, 200);
    assertEquals(response.body.id, testMatterId, 'Should return correct matter');
});

const testGetMatterSummary = test('GET /api/v1/matters/:id/summary - Get matter summary', async () => {
    const response = await makeRequest('GET', `/api/v1/matters/${testMatterId}/summary`);
    assertStatus(response, 200);
    assert(response.body.matter, 'Should return matter summary with matter data');
});

const testUpdateMatter = test('PATCH /api/v1/matters/:id - Update matter', async () => {
    const response = await makeRequest('PATCH', `/api/v1/matters/${testMatterId}`, {
        status: 'active'
    });

    assertStatus(response, 200);
});

// 5. Time Entry Tests
const testGetTimeEntries = test('GET /api/v1/time-entries - List time entries', async () => {
    const response = await makeRequest('GET', '/api/v1/time-entries');
    assertStatus(response, 200);
    assert(Array.isArray(response.body), 'Should return time entries array');
});

const testCreateTimeEntry = test('POST /api/v1/time-entries - Create time entry', async () => {
    const response = await makeRequest('POST', '/api/v1/time-entries', {
        matter_id: testMatterId,
        entry_date: new Date().toISOString().split('T')[0],
        duration_minutes: 120,
        description: 'Legal research',
        hourly_rate: 250.00,
        billable: 1
    });

    assertStatus(response, 201, 'Should return 201 for created time entry');
    assert(response.body.id, 'Should return time entry with ID');

    testTimeEntryId = response.body.id;
});

const testGetUnbilledTimeEntries = test('GET /api/v1/time-entries/unbilled - Get unbilled time', async () => {
    const response = await makeRequest('GET', '/api/v1/time-entries/unbilled');
    assertStatus(response, 200);
    assert(Array.isArray(response.body), 'Should return unbilled time entries');
});

const testUpdateTimeEntry = test('PATCH /api/v1/time-entries/:id - Update time entry', async () => {
    const response = await makeRequest('PATCH', `/api/v1/time-entries/${testTimeEntryId}`, {
        duration_minutes: 150
    });

    assertStatus(response, 200);
});

const testGetMatterTimeEntries = test('GET /api/v1/matters/:id/time-entries - Get matter time entries', async () => {
    const response = await makeRequest('GET', `/api/v1/matters/${testMatterId}/time-entries`);
    assertStatus(response, 200);
    assert(Array.isArray(response.body), 'Should return matter time entries');
});

// 6. Expense Tests
const testGetExpenses = test('GET /api/v1/expenses - List expenses', async () => {
    const response = await makeRequest('GET', '/api/v1/expenses');
    assertStatus(response, 200);
    assert(Array.isArray(response.body), 'Should return expenses array');
});

const testCreateExpense = test('POST /api/v1/expenses - Create expense', async () => {
    const response = await makeRequest('POST', '/api/v1/expenses', {
        matter_id: testMatterId,
        expense_date: new Date().toISOString().split('T')[0],
        category: 'Filing Fees',
        description: 'Court filing fee',
        vendor: 'County Clerk',
        amount: 350.00,
        billable: 1
    });

    assertStatus(response, 201, 'Should return 201 for created expense');
    assert(response.body.id, 'Should return expense with ID');

    testExpenseId = response.body.id;
});

const testGetUnbilledExpenses = test('GET /api/v1/expenses/unbilled - Get unbilled expenses', async () => {
    const response = await makeRequest('GET', '/api/v1/expenses/unbilled');
    assertStatus(response, 200);
    assert(Array.isArray(response.body), 'Should return unbilled expenses');
});

const testGetMatterExpenses = test('GET /api/v1/matters/:id/expenses - Get matter expenses', async () => {
    const response = await makeRequest('GET', `/api/v1/matters/${testMatterId}/expenses`);
    assertStatus(response, 200);
    assert(Array.isArray(response.body), 'Should return matter expenses');
});

const testGetMatterUnbilled = test('GET /api/v1/matters/:id/unbilled - Get matter unbilled items', async () => {
    const response = await makeRequest('GET', `/api/v1/matters/${testMatterId}/unbilled`);
    assertStatus(response, 200);
    assert(response.body.timeEntries || response.body.expenses, 'Should return unbilled items');
});

// 7. Invoice Tests
const testGetInvoices = test('GET /api/v1/invoices - List invoices', async () => {
    const response = await makeRequest('GET', '/api/v1/invoices');
    assertStatus(response, 200);
    assert(Array.isArray(response.body), 'Should return invoices array');
});

const testCreateInvoice = test('POST /api/v1/invoices - Create invoice', async () => {
    const response = await makeRequest('POST', '/api/v1/invoices', {
        matter_id: testMatterId,
        client_id: testClientId,
        issue_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
        time_entry_ids: [testTimeEntryId],
        expense_ids: [testExpenseId],
        notes: 'Test invoice',
        payment_terms: 'Net 30'
    });

    assertStatus(response, 201, 'Should return 201 for created invoice');
    assert(response.body.id, 'Should return invoice with ID');

    testInvoiceId = response.body.id;
});

const testGetInvoiceById = test('GET /api/v1/invoices/:id - Get specific invoice', async () => {
    const response = await makeRequest('GET', `/api/v1/invoices/${testInvoiceId}`);
    assertStatus(response, 200);
    assertEquals(response.body.id, testInvoiceId, 'Should return correct invoice');
});

const testUpdateInvoice = test('PATCH /api/v1/invoices/:id - Update invoice', async () => {
    const response = await makeRequest('PATCH', `/api/v1/invoices/${testInvoiceId}`, {
        notes: 'Updated test invoice'
    });

    assertStatus(response, 200);
});

const testFinalizeInvoice = test('POST /api/v1/invoices/:id/finalize - Finalize invoice', async () => {
    const response = await makeRequest('POST', `/api/v1/invoices/${testInvoiceId}/finalize`);
    assertStatus(response, 200);
    assertEquals(response.body.status, 'finalized', 'Invoice should be finalized');
});

const testGetMatterInvoices = test('GET /api/v1/matters/:id/invoices - Get matter invoices', async () => {
    const response = await makeRequest('GET', `/api/v1/matters/${testMatterId}/invoices`);
    assertStatus(response, 200);
    assert(Array.isArray(response.body), 'Should return matter invoices');
});

// 8. Firm Settings Tests
const testGetFirmSettings = test('GET /api/v1/firm-settings - Get firm settings', async () => {
    const response = await makeRequest('GET', '/api/v1/firm-settings');
    assertStatus(response, 200);
    assert(response.body.firm_name, 'Should return firm settings');
});

const testUpdateFirmSettings = test('PATCH /api/v1/firm-settings - Update firm settings', async () => {
    const response = await makeRequest('PATCH', '/api/v1/firm-settings', {
        phone: '555-TEST-1'
    });

    assertStatus(response, 200);
});

// 9. User Tests
const testGetUsers = test('GET /api/v1/users - List users', async () => {
    const response = await makeRequest('GET', '/api/v1/users');
    assertStatus(response, 200);
    assert(Array.isArray(response.body), 'Should return users array');
});

// 10. RunPod Health Test
const testRunPodHealth = test('GET /api/v1/runpod/health - Check RunPod health', async () => {
    const response = await makeRequest('GET', '/api/v1/runpod/health');
    // Don't assert status - RunPod may not be configured
    console.log(`  RunPod health status: ${response.statusCode}`);
});

// 11. Security Tests
const testCSRFProtection = test('POST /api/v1/clients - CSRF protection (missing token)', async () => {
    const savedCsrf = csrfToken;
    csrfToken = null;

    const response = await makeRequest('POST', '/api/v1/clients', {
        name: 'Should Fail'
    });

    assertStatus(response, 403, 'Should return 403 without CSRF token');

    csrfToken = savedCsrf;
});

const testInvalidToken = test('GET /api/v1/clients - Invalid JWT token', async () => {
    const savedToken = authToken;
    authToken = 'invalid-token-12345';

    const response = await makeRequest('GET', '/api/v1/clients');
    assertStatus(response, 401, 'Should return 401 with invalid token');

    authToken = savedToken;
});

/**
 * Run all tests
 */
async function runTests() {
    console.log('\n' + '='.repeat(70));
    console.log('COMPREHENSIVE BACKEND API TEST SUITE');
    console.log('='.repeat(70));
    console.log(`Testing: ${BASE_URL}`);
    console.log('='.repeat(70));

    const testGroups = [
        { name: 'Authentication Tests', tests: [
            testLoginSuccess,
            testLoginFailure,
            testAuthMe,
            testAuthMeUnauthorized
        ]},
        { name: 'Dashboard Tests', tests: [
            testDashboardStats,
            testDashboardActivity
        ]},
        { name: 'Client Tests', tests: [
            testGetClients,
            testCreateClient,
            testGetClientById,
            testUpdateClient
        ]},
        { name: 'Matter Tests', tests: [
            testGetMatters,
            testCreateMatter,
            testGetMatterById,
            testGetMatterSummary,
            testUpdateMatter
        ]},
        { name: 'Time Entry Tests', tests: [
            testGetTimeEntries,
            testCreateTimeEntry,
            testGetUnbilledTimeEntries,
            testUpdateTimeEntry,
            testGetMatterTimeEntries
        ]},
        { name: 'Expense Tests', tests: [
            testGetExpenses,
            testCreateExpense,
            testGetUnbilledExpenses,
            testGetMatterExpenses,
            testGetMatterUnbilled
        ]},
        { name: 'Invoice Tests', tests: [
            testGetInvoices,
            testCreateInvoice,
            testGetInvoiceById,
            testUpdateInvoice,
            testFinalizeInvoice,
            testGetMatterInvoices
        ]},
        { name: 'Firm Settings Tests', tests: [
            testGetFirmSettings,
            testUpdateFirmSettings
        ]},
        { name: 'User Tests', tests: [
            testGetUsers
        ]},
        { name: 'Integration Tests', tests: [
            testRunPodHealth
        ]},
        { name: 'Security Tests', tests: [
            testCSRFProtection,
            testInvalidToken
        ]}
    ];

    for (const group of testGroups) {
        console.log('\n' + '='.repeat(70));
        console.log(group.name.toUpperCase());
        console.log('='.repeat(70));

        for (const test of group.tests) {
            await test();
        }
    }

    // Print summary
    console.log('\n' + '='.repeat(70));
    console.log('TEST SUMMARY');
    console.log('='.repeat(70));
    console.log(`Total Tests:  ${results.total}`);
    console.log(`Passed:       ${results.passed} ✓`);
    console.log(`Failed:       ${results.failed} ✗`);
    console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
    console.log('='.repeat(70));

    if (results.failed > 0) {
        console.log('\nFAILED TESTS:');
        console.log('='.repeat(70));
        results.tests
            .filter(t => t.status === 'FAILED')
            .forEach(t => {
                console.log(`✗ ${t.name}`);
                console.log(`  Error: ${t.error}`);
            });
    }

    console.log('\n');

    // Exit with appropriate code
    process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(err => {
    console.error('Fatal error running tests:', err);
    process.exit(1);
});
