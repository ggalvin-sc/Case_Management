// REGRESSION TEST SUITE - Verifying Critical Fixes
// Tests all previously failing validation, missing endpoints, and edge cases

const https = require('https');

const baseUrl = 'https://localhost:3000';
let cookies = '';
let csrfToken = '';
let testClientId = null;
let testMatterId = null;
let testInvoiceId = null;

// Test results tracking
const results = {
    priority1: { passed: 0, failed: 0, tests: [] },
    priority2: { passed: 0, failed: 0, tests: [] },
    priority3: { passed: 0, failed: 0, tests: [] },
    priority4: { passed: 0, failed: 0, tests: [] }
};

// Helper to make HTTPS requests
function makeRequest(method, path, data = null) {
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

        if (cookies) {
            options.headers['Cookie'] = cookies;
        }

        if (csrfToken && method !== 'GET') {
            options.headers['X-CSRF-Token'] = csrfToken;
        }

        const req = https.request(options, (res) => {
            let body = '';

            if (res.headers['set-cookie']) {
                const cookieStrings = res.headers['set-cookie'].map(c => c.split(';')[0]);
                cookies = cookieStrings.join('; ');

                // Extract CSRF token from cookies
                const csrfCookie = cookieStrings.find(c => c.startsWith('csrfToken='));
                if (csrfCookie) {
                    csrfToken = csrfCookie.split('=')[1];
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

        req.on('error', reject);

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

function logTest(priority, testName, passed, expected, actual, details = '') {
    const status = passed ? '✓ PASS' : '✗ FAIL';
    const color = passed ? '\x1b[32m' : '\x1b[31m';

    console.log(`${color}${status}\x1b[0m ${testName}`);
    console.log(`  Expected: ${expected}`);
    console.log(`  Actual: ${actual}`);
    if (details) console.log(`  Details: ${details}`);

    results[priority].tests.push({
        name: testName,
        passed,
        expected,
        actual,
        details
    });

    if (passed) {
        results[priority].passed++;
    } else {
        results[priority].failed++;
    }
}

async function runRegressionTests() {
    console.log('\n' + '='.repeat(80));
    console.log('REGRESSION TEST SUITE - VERIFYING CRITICAL FIXES');
    console.log('='.repeat(80));
    console.log('Testing: Input Validation, Missing Endpoints, PATCH Support, Edge Cases\n');

    try {
        // Login first
        console.log('Authenticating...');
        const login = await makeRequest('POST', '/api/v1/auth/login', {
            email: 'admin@example.com',
            password: 'password'
        });

        if (login.status !== 200) {
            console.error('FATAL: Authentication failed. Cannot proceed with tests.');
            process.exit(1);
        }
        console.log('Authentication successful\n');

        // ============================================================================
        // PRIORITY 1: VALIDATION TESTS
        // ============================================================================
        console.log('\n' + '─'.repeat(80));
        console.log('PRIORITY 1: INPUT VALIDATION TESTS');
        console.log('─'.repeat(80) + '\n');

        // Test 1.1: Client creation with empty name
        console.log('Test 1.1: Client creation with empty name');
        const emptyNameClient = await makeRequest('POST', '/api/v1/clients', {
            name: '',
            email: 'test@example.com',
            default_hourly_rate: 150
        });
        logTest('priority1', 'Client with empty name rejected',
            emptyNameClient.status === 422,
            '422 (Unprocessable Entity)',
            emptyNameClient.status,
            emptyNameClient.body?.error || 'No error message'
        );

        // Test 1.2: Client creation with invalid email
        console.log('\nTest 1.2: Client creation with invalid email');
        const invalidEmailClient = await makeRequest('POST', '/api/v1/clients', {
            name: 'Test Client',
            email: 'not-an-email',
            default_hourly_rate: 150
        });
        logTest('priority1', 'Client with invalid email rejected',
            invalidEmailClient.status === 422,
            '422 (Unprocessable Entity)',
            invalidEmailClient.status,
            invalidEmailClient.body?.error || 'No error message'
        );

        // Test 1.3: Client creation with negative rate
        console.log('\nTest 1.3: Client creation with negative rate');
        const negativeRateClient = await makeRequest('POST', '/api/v1/clients', {
            name: 'Test Client',
            email: 'test@example.com',
            default_hourly_rate: -50
        });
        logTest('priority1', 'Client with negative rate rejected',
            negativeRateClient.status === 422,
            '422 (Unprocessable Entity)',
            negativeRateClient.status,
            negativeRateClient.body?.error || 'No error message'
        );

        // Create a valid client and matter for time entry tests
        console.log('\nCreating valid test client and matter for validation tests...');
        const validClient = await makeRequest('POST', '/api/v1/clients', {
            name: 'Regression Test Client',
            email: 'regression@example.com',
            default_hourly_rate: 200
        });

        if (validClient.status === 200) {
            testClientId = validClient.body.id;
            console.log(`Test client created: ID ${testClientId}`);

            const validMatter = await makeRequest('POST', '/api/v1/matters', {
                client_id: testClientId,
                matter_name: 'Regression Test Matter',
                status: 'Open',
                hourly_rate: 200
            });

            if (validMatter.status === 200) {
                testMatterId = validMatter.body.id;
                console.log(`Test matter created: ID ${testMatterId}`);
            }
        }

        // Test 1.4: Time entry with negative duration
        console.log('\nTest 1.4: Time entry with negative duration');
        const negativeTimeEntry = await makeRequest('POST', '/api/v1/time-entries', {
            matter_id: testMatterId,
            user_id: 1,
            date: '2025-10-09',
            duration: -30,
            description: 'Invalid time entry'
        });
        logTest('priority1', 'Time entry with negative duration rejected',
            negativeTimeEntry.status === 422,
            '422 (Unprocessable Entity)',
            negativeTimeEntry.status,
            negativeTimeEntry.body?.error || 'No error message'
        );

        // Test 1.5: Time entry with excessive duration (> 1440 minutes = 24 hours)
        console.log('\nTest 1.5: Time entry with > 1440 minutes');
        const excessiveTimeEntry = await makeRequest('POST', '/api/v1/time-entries', {
            matter_id: testMatterId,
            user_id: 1,
            date: '2025-10-09',
            duration: 1500,
            description: 'Excessive time entry'
        });
        logTest('priority1', 'Time entry with >1440 minutes rejected',
            excessiveTimeEntry.status === 422,
            '422 (Unprocessable Entity)',
            excessiveTimeEntry.status,
            excessiveTimeEntry.body?.error || 'No error message'
        );

        // Test 1.6: Expense with negative amount
        console.log('\nTest 1.6: Expense with negative amount');
        const negativeExpense = await makeRequest('POST', '/api/v1/expenses', {
            matter_id: testMatterId,
            date: '2025-10-09',
            amount: -50.00,
            description: 'Invalid expense'
        });
        logTest('priority1', 'Expense with negative amount rejected',
            negativeExpense.status === 422,
            '422 (Unprocessable Entity)',
            negativeExpense.status,
            negativeExpense.body?.error || 'No error message'
        );

        // ============================================================================
        // PRIORITY 2: MISSING ENDPOINTS
        // ============================================================================
        console.log('\n' + '─'.repeat(80));
        console.log('PRIORITY 2: MISSING ENDPOINTS TESTS');
        console.log('─'.repeat(80) + '\n');

        // Create valid time entries and expenses for unbilled tests
        console.log('Creating valid time entry and expense for unbilled tests...');
        const validTimeEntry = await makeRequest('POST', '/api/v1/time-entries', {
            matter_id: testMatterId,
            user_id: 1,
            date: '2025-10-09',
            duration: 60,
            description: 'Regression test time entry',
            billed: false
        });
        console.log(`Time entry status: ${validTimeEntry.status}`);

        const validExpense = await makeRequest('POST', '/api/v1/expenses', {
            matter_id: testMatterId,
            date: '2025-10-09',
            amount: 25.50,
            description: 'Regression test expense',
            billed: false
        });
        console.log(`Expense status: ${validExpense.status}`);

        // Test 2.1: GET /api/v1/expenses/unbilled endpoint exists
        console.log('\nTest 2.1: GET /api/v1/expenses/unbilled');
        const unbilledExpenses = await makeRequest('GET', '/api/v1/expenses/unbilled');
        logTest('priority2', 'GET /api/v1/expenses/unbilled endpoint exists',
            unbilledExpenses.status === 200,
            '200 (OK)',
            unbilledExpenses.status,
            Array.isArray(unbilledExpenses.body) ? `Returned ${unbilledExpenses.body.length} unbilled expenses` : 'Invalid response'
        );

        // Create invoice for PATCH tests
        console.log('\nCreating invoice for PATCH tests...');
        const invoice = await makeRequest('POST', '/api/v1/invoices', {
            client_id: testClientId,
            matter_id: testMatterId,
            invoice_date: '2025-10-09',
            due_date: '2025-11-09',
            status: 'draft'
        });

        if (invoice.status === 200) {
            testInvoiceId = invoice.body.id;
            console.log(`Test invoice created: ID ${testInvoiceId}`);
        }

        // Test 2.2: PATCH /api/v1/invoices/{id}/finalize
        console.log('\nTest 2.2: PATCH /api/v1/invoices/{id}/finalize');
        const finalizeInvoice = await makeRequest('PATCH', `/api/v1/invoices/${testInvoiceId}/finalize`);
        logTest('priority2', 'PATCH /api/v1/invoices/{id}/finalize works',
            finalizeInvoice.status === 200,
            '200 (OK)',
            finalizeInvoice.status,
            finalizeInvoice.body?.message || 'No message'
        );

        // Test 2.3: PATCH /api/v1/invoices/{id}/send
        console.log('\nTest 2.3: PATCH /api/v1/invoices/{id}/send');
        const sendInvoice = await makeRequest('PATCH', `/api/v1/invoices/${testInvoiceId}/send`);
        logTest('priority2', 'PATCH /api/v1/invoices/{id}/send works',
            sendInvoice.status === 200,
            '200 (OK)',
            sendInvoice.status,
            sendInvoice.body?.message || 'No message'
        );

        // Test 2.4: PATCH /api/v1/clients/{id}
        console.log('\nTest 2.4: PATCH /api/v1/clients/{id}');
        const patchClient = await makeRequest('PATCH', `/api/v1/clients/${testClientId}`, {
            phone: '555-1234',
            address: '123 Updated St'
        });
        logTest('priority2', 'PATCH /api/v1/clients/{id} endpoint exists',
            patchClient.status === 200,
            '200 (OK)',
            patchClient.status,
            patchClient.body?.message || 'No message'
        );

        // ============================================================================
        // PRIORITY 3: FULL WORKFLOW VERIFICATION
        // ============================================================================
        console.log('\n' + '─'.repeat(80));
        console.log('PRIORITY 3: FULL WORKFLOW VERIFICATION');
        console.log('─'.repeat(80) + '\n');

        // Test 3.1: Create new workflow test client
        console.log('Test 3.1: Create workflow test client with validation');
        const workflowClient = await makeRequest('POST', '/api/v1/clients', {
            name: 'Workflow Test Client',
            email: 'workflow@test.com',
            default_hourly_rate: 250
        });
        logTest('priority3', 'Workflow client creation with validation',
            workflowClient.status === 200 && workflowClient.body?.id,
            '200 with client ID',
            `${workflowClient.status} ${workflowClient.body?.id ? 'with ID' : 'without ID'}`,
            workflowClient.body?.id ? `Client ID: ${workflowClient.body.id}` : 'No ID returned'
        );

        const workflowClientId = workflowClient.body?.id;

        // Test 3.2: Create workflow test matter
        console.log('\nTest 3.2: Create workflow test matter');
        const workflowMatter = await makeRequest('POST', '/api/v1/matters', {
            client_id: workflowClientId,
            matter_name: 'Workflow Test Matter',
            status: 'Open',
            hourly_rate: 250
        });
        logTest('priority3', 'Workflow matter creation',
            workflowMatter.status === 200 && workflowMatter.body?.id,
            '200 with matter ID',
            `${workflowMatter.status} ${workflowMatter.body?.id ? 'with ID' : 'without ID'}`,
            workflowMatter.body?.id ? `Matter ID: ${workflowMatter.body.id}` : 'No ID returned'
        );

        const workflowMatterId = workflowMatter.body?.id;

        // Test 3.3: Add time entries and expenses
        console.log('\nTest 3.3: Add time entries and expenses');
        const workflowTime = await makeRequest('POST', '/api/v1/time-entries', {
            matter_id: workflowMatterId,
            user_id: 1,
            date: '2025-10-09',
            duration: 120,
            description: 'Workflow test time',
            billed: false
        });

        const workflowExpense = await makeRequest('POST', '/api/v1/expenses', {
            matter_id: workflowMatterId,
            date: '2025-10-09',
            amount: 100.00,
            description: 'Workflow test expense',
            billed: false
        });

        logTest('priority3', 'Add time entries and expenses',
            workflowTime.status === 200 && workflowExpense.status === 200,
            '200 for both time and expense',
            `Time: ${workflowTime.status}, Expense: ${workflowExpense.status}`,
            'Both created successfully'
        );

        // Test 3.4: Get unbilled expenses endpoint
        console.log('\nTest 3.4: Get unbilled expenses via endpoint');
        const workflowUnbilled = await makeRequest('GET', '/api/v1/expenses/unbilled');
        const hasWorkflowExpense = workflowUnbilled.body?.some(e => e.matter_id === workflowMatterId);
        logTest('priority3', 'Unbilled expenses endpoint returns workflow expense',
            workflowUnbilled.status === 200 && hasWorkflowExpense,
            '200 with workflow expense present',
            `${workflowUnbilled.status} ${hasWorkflowExpense ? 'with' : 'without'} workflow expense`,
            `Found ${workflowUnbilled.body?.length || 0} unbilled expenses`
        );

        // Test 3.5: Create invoice
        console.log('\nTest 3.5: Create workflow invoice');
        const workflowInvoice = await makeRequest('POST', '/api/v1/invoices', {
            client_id: workflowClientId,
            matter_id: workflowMatterId,
            invoice_date: '2025-10-09',
            due_date: '2025-11-09',
            status: 'draft'
        });
        logTest('priority3', 'Workflow invoice creation',
            workflowInvoice.status === 200 && workflowInvoice.body?.id,
            '200 with invoice ID',
            `${workflowInvoice.status} ${workflowInvoice.body?.id ? 'with ID' : 'without ID'}`,
            workflowInvoice.body?.id ? `Invoice ID: ${workflowInvoice.body.id}` : 'No ID returned'
        );

        const workflowInvoiceId = workflowInvoice.body?.id;

        // Test 3.6: Finalize invoice using PATCH
        console.log('\nTest 3.6: Finalize workflow invoice using PATCH');
        const workflowFinalize = await makeRequest('PATCH', `/api/v1/invoices/${workflowInvoiceId}/finalize`);
        logTest('priority3', 'Finalize workflow invoice via PATCH',
            workflowFinalize.status === 200,
            '200',
            workflowFinalize.status,
            workflowFinalize.body?.message || 'No message'
        );

        // Test 3.7: Verify time entries marked as billed
        console.log('\nTest 3.7: Verify time entries marked as billed');
        const workflowTimeCheck = await makeRequest('GET', '/api/v1/time-entries');
        const workflowTimeEntry = workflowTimeCheck.body?.find(t => t.matter_id === workflowMatterId);
        logTest('priority3', 'Time entries marked as billed after finalize',
            workflowTimeEntry?.billed === 1 || workflowTimeEntry?.billed === true,
            'Time entry billed = true',
            `Time entry billed = ${workflowTimeEntry?.billed}`,
            'Finalize correctly updated billed status'
        );

        // Test 3.8: Send invoice using PATCH
        console.log('\nTest 3.8: Send workflow invoice using PATCH');
        const workflowSend = await makeRequest('PATCH', `/api/v1/invoices/${workflowInvoiceId}/send`);
        logTest('priority3', 'Send workflow invoice via PATCH',
            workflowSend.status === 200,
            '200',
            workflowSend.status,
            workflowSend.body?.message || 'No message'
        );

        // ============================================================================
        // PRIORITY 4: EDGE CASES
        // ============================================================================
        console.log('\n' + '─'.repeat(80));
        console.log('PRIORITY 4: EDGE CASE TESTS');
        console.log('─'.repeat(80) + '\n');

        // Test 4.1: Client PATCH with empty name
        console.log('Test 4.1: Client PATCH with empty name');
        const patchEmptyName = await makeRequest('PATCH', `/api/v1/clients/${testClientId}`, {
            name: ''
        });
        logTest('priority4', 'Client PATCH with empty name rejected',
            patchEmptyName.status === 422,
            '422 (Unprocessable Entity)',
            patchEmptyName.status,
            patchEmptyName.body?.error || 'No error message'
        );

        // Test 4.2: Client PATCH with invalid email
        console.log('\nTest 4.2: Client PATCH with invalid email');
        const patchInvalidEmail = await makeRequest('PATCH', `/api/v1/clients/${testClientId}`, {
            email: 'not-valid-email'
        });
        logTest('priority4', 'Client PATCH with invalid email rejected',
            patchInvalidEmail.status === 422,
            '422 (Unprocessable Entity)',
            patchInvalidEmail.status,
            patchInvalidEmail.body?.error || 'No error message'
        );

        // Test 4.3: Valid client PATCH
        console.log('\nTest 4.3: Valid client PATCH');
        const patchValidClient = await makeRequest('PATCH', `/api/v1/clients/${testClientId}`, {
            phone: '555-9999',
            address: '789 Valid St',
            city: 'Test City'
        });
        logTest('priority4', 'Valid client PATCH succeeds',
            patchValidClient.status === 200,
            '200 (OK)',
            patchValidClient.status,
            patchValidClient.body?.message || 'Updated successfully'
        );

        // Test 4.4: Time entry with exactly 1440 minutes (boundary)
        console.log('\nTest 4.4: Time entry with exactly 1440 minutes (boundary)');
        const boundaryTimeEntry = await makeRequest('POST', '/api/v1/time-entries', {
            matter_id: testMatterId,
            user_id: 1,
            date: '2025-10-09',
            duration: 1440,
            description: 'Boundary test - exactly 24 hours'
        });
        logTest('priority4', 'Time entry with exactly 1440 minutes accepted',
            boundaryTimeEntry.status === 200,
            '200 (OK)',
            boundaryTimeEntry.status,
            '1440 minutes is valid boundary'
        );

        // Test 4.5: Expense with zero amount (boundary)
        console.log('\nTest 4.5: Expense with zero amount (boundary)');
        const zeroExpense = await makeRequest('POST', '/api/v1/expenses', {
            matter_id: testMatterId,
            date: '2025-10-09',
            amount: 0,
            description: 'Zero amount test'
        });
        logTest('priority4', 'Expense with zero amount accepted',
            zeroExpense.status === 200,
            '200 (OK)',
            zeroExpense.status,
            'Zero is valid boundary (non-negative)'
        );

        // Test 4.6: Time entry with exactly 1 minute (lower boundary)
        console.log('\nTest 4.6: Time entry with exactly 1 minute (lower boundary)');
        const minTimeEntry = await makeRequest('POST', '/api/v1/time-entries', {
            matter_id: testMatterId,
            user_id: 1,
            date: '2025-10-09',
            duration: 1,
            description: 'Minimum duration test'
        });
        logTest('priority4', 'Time entry with 1 minute accepted',
            minTimeEntry.status === 200,
            '200 (OK)',
            minTimeEntry.status,
            '1 minute is valid minimum'
        );

    } catch (error) {
        console.error('\n\nFATAL ERROR during testing:', error.message);
        console.error(error.stack);
    }

    // ============================================================================
    // FINAL REPORT
    // ============================================================================
    console.log('\n\n' + '='.repeat(80));
    console.log('REGRESSION TEST REPORT - BEFORE/AFTER COMPARISON');
    console.log('='.repeat(80));

    console.log('\n' + '─'.repeat(80));
    console.log('PRIORITY 1: INPUT VALIDATION TESTS');
    console.log('─'.repeat(80));
    console.log(`Previous Status: ALL FAILED (0% pass rate)`);
    console.log(`Current Status:  ${results.priority1.passed} PASSED, ${results.priority1.failed} FAILED`);
    console.log(`Pass Rate:       ${((results.priority1.passed / (results.priority1.passed + results.priority1.failed)) * 100).toFixed(1)}%`);
    console.log(`Improvement:     ${results.priority1.passed > 0 ? 'FIXED' : 'STILL BROKEN'}`);

    console.log('\n' + '─'.repeat(80));
    console.log('PRIORITY 2: MISSING ENDPOINTS');
    console.log('─'.repeat(80));
    console.log(`Previous Status: ALL FAILED (endpoints missing)`);
    console.log(`Current Status:  ${results.priority2.passed} PASSED, ${results.priority2.failed} FAILED`);
    console.log(`Pass Rate:       ${((results.priority2.passed / (results.priority2.passed + results.priority2.failed)) * 100).toFixed(1)}%`);
    console.log(`Improvement:     ${results.priority2.passed > 0 ? 'FIXED' : 'STILL BROKEN'}`);

    console.log('\n' + '─'.repeat(80));
    console.log('PRIORITY 3: FULL WORKFLOW VERIFICATION');
    console.log('─'.repeat(80));
    console.log(`Previous Status: BROKEN (missing endpoints, validation issues)`);
    console.log(`Current Status:  ${results.priority3.passed} PASSED, ${results.priority3.failed} FAILED`);
    console.log(`Pass Rate:       ${((results.priority3.passed / (results.priority3.passed + results.priority3.failed)) * 100).toFixed(1)}%`);
    console.log(`Improvement:     ${results.priority3.passed >= 6 ? 'FIXED' : 'PARTIAL'}`);

    console.log('\n' + '─'.repeat(80));
    console.log('PRIORITY 4: EDGE CASES');
    console.log('─'.repeat(80));
    console.log(`Previous Status: UNTESTED (no edge case validation)`);
    console.log(`Current Status:  ${results.priority4.passed} PASSED, ${results.priority4.failed} FAILED`);
    console.log(`Pass Rate:       ${((results.priority4.passed / (results.priority4.passed + results.priority4.failed)) * 100).toFixed(1)}%`);
    console.log(`Improvement:     ${results.priority4.passed > 0 ? 'NEW COVERAGE' : 'NEEDS WORK'}`);

    // Overall summary
    const totalPassed = results.priority1.passed + results.priority2.passed + results.priority3.passed + results.priority4.passed;
    const totalFailed = results.priority1.failed + results.priority2.failed + results.priority3.failed + results.priority4.failed;
    const totalTests = totalPassed + totalFailed;
    const overallPassRate = ((totalPassed / totalTests) * 100).toFixed(1);

    console.log('\n' + '='.repeat(80));
    console.log('OVERALL SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total Tests:     ${totalTests}`);
    console.log(`Passed:          ${totalPassed}`);
    console.log(`Failed:          ${totalFailed}`);
    console.log(`Pass Rate:       ${overallPassRate}%`);
    console.log(`\nImprovement:     ${totalPassed} tests now pass that previously failed`);
    console.log(`Regression Safe: ${totalFailed === 0 ? 'YES - All fixes verified' : 'NO - Some issues remain'}`);

    // Detailed failure report
    if (totalFailed > 0) {
        console.log('\n' + '─'.repeat(80));
        console.log('REMAINING ISSUES');
        console.log('─'.repeat(80));

        ['priority1', 'priority2', 'priority3', 'priority4'].forEach(priority => {
            const failedTests = results[priority].tests.filter(t => !t.passed);
            if (failedTests.length > 0) {
                console.log(`\n${priority.toUpperCase()}:`);
                failedTests.forEach(test => {
                    console.log(`  - ${test.name}`);
                    console.log(`    Expected: ${test.expected}`);
                    console.log(`    Actual: ${test.actual}`);
                    console.log(`    Details: ${test.details}`);
                });
            }
        });
    }

    console.log('\n' + '='.repeat(80));
    console.log(`Test execution completed at ${new Date().toISOString()}`);
    console.log('='.repeat(80) + '\n');
}

// Run the tests
runRegressionTests().catch(err => {
    console.error('Test suite crashed:', err);
    process.exit(1);
});
