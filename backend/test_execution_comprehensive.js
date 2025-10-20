// COMPREHENSIVE END-TO-END TEST EXECUTION SUITE
// Test Execution Specialist - No code modification, only testing and reporting

const https = require('https');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const BASE_URL = 'https://localhost:3000';
let authCookies = '';
let csrfToken = '';
let testResults = {
    totalTests: 0,
    passed: 0,
    failed: 0,
    errors: [],
    testDetails: []
};

// Database connection
const dbPath = path.join(__dirname, 'billing.db');
const db = new sqlite3.Database(dbPath);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function makeRequest(method, path, data = null, cookies = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            rejectUnauthorized: false
        };

        if (cookies || authCookies) {
            options.headers['Cookie'] = cookies || authCookies;
        }

        if (csrfToken && ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
            options.headers['X-CSRF-Token'] = csrfToken;
        }

        const req = https.request(options, (res) => {
            let body = '';

            if (res.headers['set-cookie']) {
                const cookieArray = res.headers['set-cookie'];
                authCookies = cookieArray.map(c => c.split(';')[0]).join('; ');

                const csrfCookie = cookieArray.find(c => c.startsWith('csrfToken='));
                if (csrfCookie) {
                    csrfToken = csrfCookie.split('=')[1].split(';')[0];
                }
            }

            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        body: body ? JSON.parse(body) : null
                    });
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        body: body
                    });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

function recordTest(name, passed, details = {}) {
    testResults.totalTests++;
    if (passed) {
        testResults.passed++;
    } else {
        testResults.failed++;
    }
    testResults.testDetails.push({
        name,
        passed,
        ...details
    });
}

function logSection(title) {
    console.log('\n' + '='.repeat(80));
    console.log(title);
    console.log('='.repeat(80));
}

function logTest(testNum, testName, status, details = '') {
    const symbol = status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : '⚠';
    console.log(`[${testNum}] ${testName}: ${symbol} ${status}`);
    if (details) {
        console.log(`    ${details}`);
    }
}

// ============================================================================
// DATABASE INSPECTION
// ============================================================================

async function inspectDatabase() {
    return new Promise((resolve, reject) => {
        logSection('DATABASE SCHEMA INSPECTION');

        const schema = {};

        db.all(`SELECT name FROM sqlite_master WHERE type='table'`, [], (err, tables) => {
            if (err) {
                reject(err);
                return;
            }

            console.log(`\nFound ${tables.length} tables:`);
            tables.forEach(table => {
                console.log(`  - ${table.name}`);
            });

            let processed = 0;
            tables.forEach(table => {
                db.all(`PRAGMA table_info(${table.name})`, [], (err, columns) => {
                    if (!err) {
                        schema[table.name] = columns;
                        console.log(`\n${table.name} (${columns.length} columns):`);
                        columns.forEach(col => {
                            console.log(`  ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
                        });
                    }
                    processed++;
                    if (processed === tables.length) {
                        resolve(schema);
                    }
                });
            });
        });
    });
}

// ============================================================================
// AUTHENTICATION TESTS
// ============================================================================

async function testAuthentication() {
    logSection('PHASE 1: AUTHENTICATION TESTS');

    // Test 1: Login with valid credentials
    try {
        const response = await makeRequest('POST', '/api/v1/auth/login', {
            email: 'admin@example.com',
            password: 'password'
        });

        if (response.status === 200 && response.body.user) {
            logTest(1, 'Login with valid credentials', 'PASS',
                `User: ${response.body.user.email}, Role: ${response.body.user.role}`);
            recordTest('Login - Valid credentials', true, { response });
            return response.body.user;
        } else {
            logTest(1, 'Login with valid credentials', 'FAIL',
                `Status: ${response.status}, Body: ${JSON.stringify(response.body)}`);
            recordTest('Login - Valid credentials', false, { response });
            throw new Error('Login failed - cannot continue tests');
        }
    } catch (error) {
        logTest(1, 'Login with valid credentials', 'FAIL', error.message);
        recordTest('Login - Valid credentials', false, { error: error.message });
        throw error;
    }
}

async function testAuthValidation() {
    logSection('PHASE 2: AUTHENTICATION VALIDATION TESTS');

    // Test 2: Login with invalid credentials
    try {
        const response = await makeRequest('POST', '/api/v1/auth/login', {
            email: 'admin@example.com',
            password: 'wrongpassword'
        }, ''); // Empty cookies to test fresh login

        if (response.status === 401) {
            logTest(2, 'Login with invalid password', 'PASS', 'Correctly rejected');
            recordTest('Login - Invalid password', true);
        } else {
            logTest(2, 'Login with invalid password', 'FAIL', `Expected 401, got ${response.status}`);
            recordTest('Login - Invalid password', false);
        }
    } catch (error) {
        logTest(2, 'Login with invalid password', 'FAIL', error.message);
        recordTest('Login - Invalid password', false, { error: error.message });
    }

    // Test 3: Login with missing fields
    try {
        const response = await makeRequest('POST', '/api/v1/auth/login', {
            email: 'admin@example.com'
        }, '');

        if (response.status === 400 || response.status === 401) {
            logTest(3, 'Login with missing password', 'PASS', 'Correctly rejected');
            recordTest('Login - Missing password', true);
        } else {
            logTest(3, 'Login with missing password', 'FAIL', `Expected 400/401, got ${response.status}`);
            recordTest('Login - Missing password', false);
        }
    } catch (error) {
        logTest(3, 'Login with missing password', 'FAIL', error.message);
        recordTest('Login - Missing password', false, { error: error.message });
    }

    // Test 4: Access protected endpoint without auth
    try {
        const response = await makeRequest('GET', '/api/v1/clients', null, '');

        if (response.status === 401) {
            logTest(4, 'Access protected endpoint without auth', 'PASS', 'Correctly rejected');
            recordTest('Auth - Protected endpoint without auth', true);
        } else {
            logTest(4, 'Access protected endpoint without auth', 'FAIL', `Expected 401, got ${response.status}`);
            recordTest('Auth - Protected endpoint without auth', false);
        }
    } catch (error) {
        logTest(4, 'Access protected endpoint without auth', 'FAIL', error.message);
        recordTest('Auth - Protected endpoint without auth', false, { error: error.message });
    }
}

// ============================================================================
// CREATE TEST_CASE DATA
// ============================================================================

async function createTestCaseData() {
    logSection('PHASE 3: CREATE TEST_CASE DATA');

    const testCaseData = {
        client: null,
        matter: null,
        timeEntries: [],
        expenses: []
    };

    // Test 5: Create TEST_CASE Client
    try {
        const clientData = {
            name: 'TEST_CASE Client',
            client_number: 'TC-' + Date.now(),
            email: 'testcase@example.com',
            phone: '(555) 123-4567',
            address: '123 Test Street',
            address_line2: 'Suite 100',
            city: 'Test City',
            state: 'CA',
            zip_code: '90210',
            country: 'USA',
            default_hourly_rate: 350.00
        };

        const response = await makeRequest('POST', '/api/v1/clients', clientData);

        if (response.status === 201 && response.body && response.body.id) {
            testCaseData.client = response.body;
            logTest(5, 'Create TEST_CASE Client', 'PASS',
                `Client ID: ${response.body.id}, Name: ${clientData.name}`);
            recordTest('Create TEST_CASE Client', true, { client: response.body });
        } else {
            logTest(5, 'Create TEST_CASE Client', 'FAIL',
                `Status: ${response.status}, Body: ${JSON.stringify(response.body)}`);
            recordTest('Create TEST_CASE Client', false, { response });
            return testCaseData;
        }
    } catch (error) {
        logTest(5, 'Create TEST_CASE Client', 'FAIL', error.message);
        recordTest('Create TEST_CASE Client', false, { error: error.message });
        return testCaseData;
    }

    // Test 6: Create TEST_CASE Matter
    try {
        const matterData = {
            client_id: testCaseData.client.id,
            matter_number: 'TC-MAT-' + Date.now(),
            name: 'TEST_CASE Matter',
            description: 'Comprehensive test case for all billing workflows',
            status: 'active',
            billing_type: 'hourly',
            hourly_rate: 400.00,
            open_date: new Date().toISOString().split('T')[0],
            matter_type: 'Litigation',
            court_name: 'Superior Court of California',
            case_number: 'TC-2025-001',
            opposing_party: 'Test Defendant',
            opposing_counsel: 'Defense Attorney LLC',
            priority: 'high',
            practice_area: 'Civil Litigation',
            retainer_amount: 10000.00,
            estimated_hours: 50,
            attorney_hourly_rate: 400.00,
            notes: 'Test case matter for comprehensive E2E testing'
        };

        const response = await makeRequest('POST', '/api/v1/matters', matterData);

        if (response.status === 201 && response.body && response.body.id) {
            testCaseData.matter = response.body;
            logTest(6, 'Create TEST_CASE Matter', 'PASS',
                `Matter ID: ${response.body.id}, Name: ${matterData.name}`);
            recordTest('Create TEST_CASE Matter', true, { matter: response.body });
        } else {
            logTest(6, 'Create TEST_CASE Matter', 'FAIL',
                `Status: ${response.status}, Body: ${JSON.stringify(response.body)}`);
            recordTest('Create TEST_CASE Matter', false, { response });
            return testCaseData;
        }
    } catch (error) {
        logTest(6, 'Create TEST_CASE Matter', 'FAIL', error.message);
        recordTest('Create TEST_CASE Matter', false, { error: error.message });
        return testCaseData;
    }

    // Test 7-9: Create multiple time entries
    const timeEntryData = [
        {
            matter_id: testCaseData.matter.id,
            entry_date: new Date().toISOString().split('T')[0],
            duration_minutes: 120,
            description: 'Initial client consultation and case review',
            hourly_rate: 400.00,
            billable: 1
        },
        {
            matter_id: testCaseData.matter.id,
            entry_date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
            duration_minutes: 90,
            description: 'Legal research and document preparation',
            hourly_rate: 400.00,
            billable: 1
        },
        {
            matter_id: testCaseData.matter.id,
            entry_date: new Date(Date.now() - 172800000).toISOString().split('T')[0],
            duration_minutes: 60,
            description: 'Court filing and administrative tasks',
            hourly_rate: 400.00,
            billable: 1
        }
    ];

    for (let i = 0; i < timeEntryData.length; i++) {
        try {
            const response = await makeRequest('POST', '/api/v1/time-entries', timeEntryData[i]);

            if (response.status === 201 && response.body && response.body.id) {
                testCaseData.timeEntries.push(response.body);
                logTest(7 + i, `Create Time Entry ${i + 1}`, 'PASS',
                    `Entry ID: ${response.body.id}, Duration: ${timeEntryData[i].duration_minutes}min`);
                recordTest(`Create Time Entry ${i + 1}`, true, { timeEntry: response.body });
            } else {
                logTest(7 + i, `Create Time Entry ${i + 1}`, 'FAIL',
                    `Status: ${response.status}`);
                recordTest(`Create Time Entry ${i + 1}`, false, { response });
            }
        } catch (error) {
            logTest(7 + i, `Create Time Entry ${i + 1}`, 'FAIL', error.message);
            recordTest(`Create Time Entry ${i + 1}`, false, { error: error.message });
        }
    }

    // Test 10-12: Create multiple expenses
    const expenseData = [
        {
            matter_id: testCaseData.matter.id,
            expense_date: new Date().toISOString().split('T')[0],
            category: 'Court Fees',
            description: 'Filing fee for initial complaint',
            vendor: 'Superior Court',
            amount: 435.00,
            markup_percentage: 0,
            billable: 1
        },
        {
            matter_id: testCaseData.matter.id,
            expense_date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
            category: 'Travel',
            description: 'Client meeting - mileage reimbursement',
            vendor: 'N/A',
            amount: 75.50,
            markup_percentage: 0,
            billable: 1
        },
        {
            matter_id: testCaseData.matter.id,
            expense_date: new Date(Date.now() - 172800000).toISOString().split('T')[0],
            category: 'Research',
            description: 'Westlaw legal research',
            vendor: 'Thomson Reuters',
            amount: 250.00,
            markup_percentage: 10,
            billable: 1
        }
    ];

    for (let i = 0; i < expenseData.length; i++) {
        try {
            const response = await makeRequest('POST', '/api/v1/expenses', expenseData[i]);

            if (response.status === 201 && response.body && response.body.id) {
                testCaseData.expenses.push(response.body);
                logTest(10 + i, `Create Expense ${i + 1}`, 'PASS',
                    `Expense ID: ${response.body.id}, Amount: $${expenseData[i].amount}`);
                recordTest(`Create Expense ${i + 1}`, true, { expense: response.body });
            } else {
                logTest(10 + i, `Create Expense ${i + 1}`, 'FAIL',
                    `Status: ${response.status}`);
                recordTest(`Create Expense ${i + 1}`, false, { response });
            }
        } catch (error) {
            logTest(10 + i, `Create Expense ${i + 1}`, 'FAIL', error.message);
            recordTest(`Create Expense ${i + 1}`, false, { error: error.message });
        }
    }

    return testCaseData;
}

// ============================================================================
// COMPREHENSIVE CRUD TESTS
// ============================================================================

async function testCRUDOperations(testCaseData) {
    logSection('PHASE 4: COMPREHENSIVE CRUD OPERATIONS');

    let testNum = 13;

    // Test: Read Client
    try {
        const response = await makeRequest('GET', `/api/v1/clients/${testCaseData.client.id}`);

        if (response.status === 200 && response.body && response.body.name === 'TEST_CASE Client') {
            logTest(testNum++, 'Read TEST_CASE Client', 'PASS',
                `Retrieved: ${response.body.name}`);
            recordTest('Read Client', true);
        } else {
            logTest(testNum++, 'Read TEST_CASE Client', 'FAIL',
                `Status: ${response.status}`);
            recordTest('Read Client', false);
        }
    } catch (error) {
        logTest(testNum++, 'Read TEST_CASE Client', 'FAIL', error.message);
        recordTest('Read Client', false);
    }

    // Test: Update Client
    try {
        const updateData = {
            phone: '(555) 999-8888',
            email: 'testcase_updated@example.com'
        };

        const response = await makeRequest('PATCH', `/api/v1/clients/${testCaseData.client.id}`, updateData);

        if (response.status === 200) {
            logTest(testNum++, 'Update TEST_CASE Client', 'PASS',
                `Updated phone: ${updateData.phone}`);
            recordTest('Update Client', true);
        } else {
            logTest(testNum++, 'Update TEST_CASE Client', 'FAIL',
                `Status: ${response.status}`);
            recordTest('Update Client', false);
        }
    } catch (error) {
        logTest(testNum++, 'Update TEST_CASE Client', 'FAIL', error.message);
        recordTest('Update Client', false);
    }

    // Test: Read Matter
    try {
        const response = await makeRequest('GET', `/api/v1/matters/${testCaseData.matter.id}`);

        if (response.status === 200 && response.body && response.body.name === 'TEST_CASE Matter') {
            logTest(testNum++, 'Read TEST_CASE Matter', 'PASS',
                `Retrieved: ${response.body.name}`);
            recordTest('Read Matter', true);
        } else {
            logTest(testNum++, 'Read TEST_CASE Matter', 'FAIL',
                `Status: ${response.status}`);
            recordTest('Read Matter', false);
        }
    } catch (error) {
        logTest(testNum++, 'Read TEST_CASE Matter', 'FAIL', error.message);
        recordTest('Read Matter', false);
    }

    // Test: Get unbilled time entries
    try {
        const response = await makeRequest('GET', '/api/v1/time-entries/unbilled');

        if (response.status === 200) {
            const testCaseEntries = response.body.filter(e => e.matter_id === testCaseData.matter.id);
            logTest(testNum++, 'Get Unbilled Time Entries', 'PASS',
                `Found ${testCaseEntries.length} unbilled entries for TEST_CASE`);
            recordTest('Get Unbilled Time', true, { count: testCaseEntries.length });
        } else {
            logTest(testNum++, 'Get Unbilled Time Entries', 'FAIL',
                `Status: ${response.status}`);
            recordTest('Get Unbilled Time', false);
        }
    } catch (error) {
        logTest(testNum++, 'Get Unbilled Time Entries', 'FAIL', error.message);
        recordTest('Get Unbilled Time', false);
    }

    // Test: Get unbilled expenses
    try {
        const response = await makeRequest('GET', '/api/v1/expenses/unbilled');

        if (response.status === 200) {
            const testCaseExpenses = response.body.filter(e => e.matter_id === testCaseData.matter.id);
            logTest(testNum++, 'Get Unbilled Expenses', 'PASS',
                `Found ${testCaseExpenses.length} unbilled expenses for TEST_CASE`);
            recordTest('Get Unbilled Expenses', true, { count: testCaseExpenses.length });
        } else {
            logTest(testNum++, 'Get Unbilled Expenses', 'FAIL',
                `Status: ${response.status}`);
            recordTest('Get Unbilled Expenses', false);
        }
    } catch (error) {
        logTest(testNum++, 'Get Unbilled Expenses', 'FAIL', error.message);
        recordTest('Get Unbilled Expenses', false);
    }
}

// ============================================================================
// INPUT VALIDATION TESTS
// ============================================================================

async function testInputValidation() {
    logSection('PHASE 5: INPUT VALIDATION TESTS');

    let testNum = 20;

    // Test: Create client with missing required fields
    try {
        const response = await makeRequest('POST', '/api/v1/clients', {
            name: '', // Empty name
            email: 'invalid-email' // Invalid email format
        });

        if (response.status === 400 || response.status === 422) {
            logTest(testNum++, 'Client validation - Empty/invalid fields', 'PASS',
                'Correctly rejected invalid data');
            recordTest('Validation - Client invalid fields', true);
        } else {
            logTest(testNum++, 'Client validation - Empty/invalid fields', 'FAIL',
                `Expected 400/422, got ${response.status}`);
            recordTest('Validation - Client invalid fields', false);
        }
    } catch (error) {
        logTest(testNum++, 'Client validation - Empty/invalid fields', 'FAIL', error.message);
        recordTest('Validation - Client invalid fields', false);
    }

    // Test: Create matter without required client_id
    try {
        const response = await makeRequest('POST', '/api/v1/matters', {
            name: 'Test Matter',
            description: 'Test',
            // Missing client_id
        });

        if (response.status === 400 || response.status === 422) {
            logTest(testNum++, 'Matter validation - Missing client_id', 'PASS',
                'Correctly rejected');
            recordTest('Validation - Matter missing client_id', true);
        } else {
            logTest(testNum++, 'Matter validation - Missing client_id', 'FAIL',
                `Expected 400/422, got ${response.status}`);
            recordTest('Validation - Matter missing client_id', false);
        }
    } catch (error) {
        logTest(testNum++, 'Matter validation - Missing client_id', 'FAIL', error.message);
        recordTest('Validation - Matter missing client_id', false);
    }

    // Test: Create time entry with negative duration
    try {
        const response = await makeRequest('POST', '/api/v1/time-entries', {
            matter_id: 1,
            entry_date: new Date().toISOString().split('T')[0],
            duration_minutes: -60, // Negative duration
            description: 'Test'
        });

        if (response.status === 400 || response.status === 422) {
            logTest(testNum++, 'Time entry validation - Negative duration', 'PASS',
                'Correctly rejected');
            recordTest('Validation - Time entry negative duration', true);
        } else {
            logTest(testNum++, 'Time entry validation - Negative duration', 'FAIL',
                `Expected 400/422, got ${response.status}`);
            recordTest('Validation - Time entry negative duration', false);
        }
    } catch (error) {
        logTest(testNum++, 'Time entry validation - Negative duration', 'FAIL', error.message);
        recordTest('Validation - Time entry negative duration', false);
    }

    // Test: Create expense with negative amount
    try {
        const response = await makeRequest('POST', '/api/v1/expenses', {
            matter_id: 1,
            expense_date: new Date().toISOString().split('T')[0],
            category: 'Test',
            description: 'Test',
            amount: -100.00 // Negative amount
        });

        if (response.status === 400 || response.status === 422) {
            logTest(testNum++, 'Expense validation - Negative amount', 'PASS',
                'Correctly rejected');
            recordTest('Validation - Expense negative amount', true);
        } else {
            logTest(testNum++, 'Expense validation - Negative amount', 'FAIL',
                `Expected 400/422, got ${response.status}`);
            recordTest('Validation - Expense negative amount', false);
        }
    } catch (error) {
        logTest(testNum++, 'Expense validation - Negative amount', 'FAIL', error.message);
        recordTest('Validation - Expense negative amount', false);
    }
}

// ============================================================================
// EDGE CASE TESTS
// ============================================================================

async function testEdgeCases() {
    logSection('PHASE 6: EDGE CASE TESTS');

    let testNum = 30;

    // Test: Client with special characters in name
    try {
        const response = await makeRequest('POST', '/api/v1/clients', {
            name: "O'Brien & Smith, LLC <Test>",
            email: 'special@example.com',
            phone: '555-1234'
        });

        if (response.status === 201) {
            logTest(testNum++, 'Client with special characters', 'PASS');
            recordTest('Edge - Client special chars', true);

            // Clean up
            if (response.body && response.body.id) {
                await makeRequest('DELETE', `/api/v1/clients/${response.body.id}`);
            }
        } else {
            logTest(testNum++, 'Client with special characters', 'FAIL',
                `Status: ${response.status}`);
            recordTest('Edge - Client special chars', false);
        }
    } catch (error) {
        logTest(testNum++, 'Client with special characters', 'FAIL', error.message);
        recordTest('Edge - Client special chars', false);
    }

    // Test: Time entry with maximum duration (24 hours)
    try {
        const response = await makeRequest('POST', '/api/v1/time-entries', {
            matter_id: 1,
            entry_date: new Date().toISOString().split('T')[0],
            duration_minutes: 1440, // 24 hours
            description: 'Edge case: 24 hour entry',
            hourly_rate: 300.00,
            billable: 1
        });

        if (response.status === 201) {
            logTest(testNum++, 'Time entry - 24 hour duration', 'PASS');
            recordTest('Edge - Time entry 24hrs', true);

            // Clean up
            if (response.body && response.body.id) {
                await makeRequest('DELETE', `/api/v1/time-entries/${response.body.id}`);
            }
        } else {
            logTest(testNum++, 'Time entry - 24 hour duration', 'FAIL',
                `Status: ${response.status}`);
            recordTest('Edge - Time entry 24hrs', false);
        }
    } catch (error) {
        logTest(testNum++, 'Time entry - 24 hour duration', 'FAIL', error.message);
        recordTest('Edge - Time entry 24hrs', false);
    }

    // Test: Get non-existent client
    try {
        const response = await makeRequest('GET', '/api/v1/clients/999999');

        if (response.status === 404) {
            logTest(testNum++, 'Get non-existent client', 'PASS',
                'Correctly returns 404');
            recordTest('Edge - Non-existent client', true);
        } else {
            logTest(testNum++, 'Get non-existent client', 'FAIL',
                `Expected 404, got ${response.status}`);
            recordTest('Edge - Non-existent client', false);
        }
    } catch (error) {
        logTest(testNum++, 'Get non-existent client', 'FAIL', error.message);
        recordTest('Edge - Non-existent client', false);
    }

    // Test: Delete non-existent matter
    try {
        const response = await makeRequest('DELETE', '/api/v1/matters/999999');

        if (response.status === 404) {
            logTest(testNum++, 'Delete non-existent matter', 'PASS',
                'Correctly returns 404');
            recordTest('Edge - Delete non-existent matter', true);
        } else {
            logTest(testNum++, 'Delete non-existent matter', 'FAIL',
                `Expected 404, got ${response.status}`);
            recordTest('Edge - Delete non-existent matter', false);
        }
    } catch (error) {
        logTest(testNum++, 'Delete non-existent matter', 'FAIL', error.message);
        recordTest('Edge - Delete non-existent matter', false);
    }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function runComprehensiveTests() {
    console.log('\n');
    logSection('COMPREHENSIVE END-TO-END TEST EXECUTION');
    console.log('Test Execution Specialist - No Code Modification Mode');
    console.log('Testing Against: ' + BASE_URL);
    console.log('Start Time: ' + new Date().toISOString());

    try {
        // Phase 1: Inspect database
        const schema = await inspectDatabase();

        // Phase 2: Test authentication
        const user = await testAuthentication();
        await testAuthValidation();

        // Phase 3: Create TEST_CASE data
        const testCaseData = await createTestCaseData();

        // Phase 4: CRUD operations
        if (testCaseData.client && testCaseData.matter) {
            await testCRUDOperations(testCaseData);
        }

        // Phase 5: Input validation
        await testInputValidation();

        // Phase 6: Edge cases
        await testEdgeCases();

        // Final Report
        logSection('COMPREHENSIVE TEST REPORT');
        console.log('\nEXECUTIVE SUMMARY:');
        console.log(`Total Tests Executed: ${testResults.totalTests}`);
        console.log(`Passed: ${testResults.passed} (${((testResults.passed / testResults.totalTests) * 100).toFixed(1)}%)`);
        console.log(`Failed: ${testResults.failed} (${((testResults.failed / testResults.totalTests) * 100).toFixed(1)}%)`);
        console.log(`Errors: ${testResults.errors.length}`);

        console.log('\nTEST_CASE DATA CREATED:');
        if (testCaseData.client) {
            console.log(`Client ID: ${testCaseData.client.id}`);
            console.log(`Client Name: TEST_CASE Client`);
        }
        if (testCaseData.matter) {
            console.log(`Matter ID: ${testCaseData.matter.id}`);
            console.log(`Matter Name: TEST_CASE Matter`);
        }
        console.log(`Time Entries Created: ${testCaseData.timeEntries.length}`);
        console.log(`Expenses Created: ${testCaseData.expenses.length}`);

        console.log('\nDETAILED TEST RESULTS:');
        testResults.testDetails.forEach((test, idx) => {
            const symbol = test.passed ? '✓' : '✗';
            console.log(`${symbol} ${test.name}`);
        });

        console.log('\nEnd Time: ' + new Date().toISOString());
        console.log('='.repeat(80));

    } catch (error) {
        console.error('\n\nFATAL ERROR:', error.message);
        console.error(error.stack);
    } finally {
        db.close();
    }
}

// Run the tests
runComprehensiveTests();
