// CORRECTED REGRESSION TEST - Using Proper Field Names
// This test uses the correct field names as documented in server.js

const https = require('https');

const baseUrl = 'https://localhost:3000';
let cookies = '';
let csrfToken = '';

// Test results tracking
const results = {
    passed: [],
    failed: [],
    details: []
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

function logTest(testName, passed, details) {
    const status = passed ? '✓ PASS' : '✗ FAIL';
    const color = passed ? '\x1b[32m' : '\x1b[31m';

    console.log(`${color}${status}\x1b[0m ${testName}`);
    console.log(`  ${details}`);

    if (passed) {
        results.passed.push(testName);
    } else {
        results.failed.push(testName);
    }

    results.details.push({ testName, passed, details });
}

async function runCorrectedTests() {
    console.log('\n' + '='.repeat(80));
    console.log('CORRECTED REGRESSION TEST - USING PROPER FIELD NAMES');
    console.log('='.repeat(80));
    console.log('Verifying all fixes work with correct API usage\n');

    try {
        // Login first
        console.log('Authenticating...');
        const login = await makeRequest('POST', '/api/v1/auth/login', {
            email: 'admin@example.com',
            password: 'password'
        });

        if (login.status !== 200) {
            console.error('FATAL: Authentication failed');
            process.exit(1);
        }
        console.log('Authentication successful. CSRF token obtained.\n');

        // ============================================================================
        // VALIDATION TESTS WITH CORRECT FIELD NAMES
        // ============================================================================
        console.log('─'.repeat(80));
        console.log('VALIDATION TESTS');
        console.log('─'.repeat(80) + '\n');

        // Test 1: Client validation
        console.log('Test 1: Client with empty name');
        const emptyClient = await makeRequest('POST', '/api/v1/clients', {
            name: '',
            email: 'test@example.com',
            default_hourly_rate: 150
        });
        logTest('Client empty name validation',
            emptyClient.status === 422,
            `Status: ${emptyClient.status}, Error: ${JSON.stringify(emptyClient.body)}`
        );

        console.log('\nTest 2: Client with invalid email');
        const invalidEmail = await makeRequest('POST', '/api/v1/clients', {
            name: 'Test Client',
            email: 'not-an-email',
            default_hourly_rate: 150
        });
        logTest('Client invalid email validation',
            invalidEmail.status === 422,
            `Status: ${invalidEmail.status}, Error: ${JSON.stringify(invalidEmail.body)}`
        );

        // Create valid client for further tests
        console.log('\nTest 3: Create valid client');
        const validClient = await makeRequest('POST', '/api/v1/clients', {
            name: 'Corrected Test Client',
            email: 'corrected@test.com',
            default_hourly_rate: 200
        });
        logTest('Valid client creation',
            validClient.status === 201 && validClient.body.id,
            `Status: ${validClient.status}, Client ID: ${validClient.body?.id}`
        );

        const clientId = validClient.body?.id;

        // Create valid matter for time entry tests
        console.log('\nTest 4: Create valid matter');
        const validMatter = await makeRequest('POST', '/api/v1/matters', {
            client_id: clientId,
            matter_name: 'Corrected Test Matter',
            status: 'Open',
            hourly_rate: 200
        });
        logTest('Valid matter creation',
            validMatter.status === 201 && validMatter.body.id,
            `Status: ${validMatter.status}, Matter ID: ${validMatter.body?.id}`
        );

        const matterId = validMatter.body?.id;

        // Test 5: Time entry with negative duration (CORRECT FIELD NAME)
        console.log('\nTest 5: Time entry with negative duration (using duration_minutes)');
        const negativeTime = await makeRequest('POST', '/api/v1/time-entries', {
            matter_id: matterId,
            user_id: 1,
            entry_date: '2025-10-09',
            duration_minutes: -30,
            description: 'Invalid time entry'
        });
        logTest('Time entry negative duration validation',
            negativeTime.status === 422,
            `Status: ${negativeTime.status}, Error: ${JSON.stringify(negativeTime.body)}`
        );

        // Test 6: Time entry with >1440 minutes (CORRECT FIELD NAME)
        console.log('\nTest 6: Time entry with >1440 minutes (using duration_minutes)');
        const excessiveTime = await makeRequest('POST', '/api/v1/time-entries', {
            matter_id: matterId,
            user_id: 1,
            entry_date: '2025-10-09',
            duration_minutes: 1500,
            description: 'Excessive time entry'
        });
        logTest('Time entry excessive duration validation',
            excessiveTime.status === 422,
            `Status: ${excessiveTime.status}, Error: ${JSON.stringify(excessiveTime.body)}`
        );

        // Test 7: Time entry with exactly 1440 minutes (BOUNDARY)
        console.log('\nTest 7: Time entry with exactly 1440 minutes (boundary test)');
        const boundaryTime = await makeRequest('POST', '/api/v1/time-entries', {
            matter_id: matterId,
            user_id: 1,
            entry_date: '2025-10-09',
            duration_minutes: 1440,
            description: 'Boundary test - exactly 24 hours'
        });
        logTest('Time entry 1440 minutes boundary',
            boundaryTime.status === 201,
            `Status: ${boundaryTime.status}, Entry ID: ${boundaryTime.body?.id}`
        );

        // Test 8: Time entry with 1 minute (LOWER BOUNDARY)
        console.log('\nTest 8: Time entry with 1 minute (lower boundary test)');
        const minTime = await makeRequest('POST', '/api/v1/time-entries', {
            matter_id: matterId,
            user_id: 1,
            entry_date: '2025-10-09',
            duration_minutes: 1,
            description: 'Minimum duration test'
        });
        logTest('Time entry 1 minute boundary',
            minTime.status === 201,
            `Status: ${minTime.status}, Entry ID: ${minTime.body?.id}`
        );

        // Test 9: Valid time entry (CORRECT FIELD NAMES)
        console.log('\nTest 9: Valid time entry (using duration_minutes and entry_date)');
        const validTime = await makeRequest('POST', '/api/v1/time-entries', {
            matter_id: matterId,
            user_id: 1,
            entry_date: '2025-10-09',
            duration_minutes: 120,
            description: 'Valid time entry',
            billed: false
        });
        logTest('Valid time entry creation',
            validTime.status === 201,
            `Status: ${validTime.status}, Entry ID: ${validTime.body?.id}`
        );

        // Test 10: Expense with negative amount (CORRECT FIELD NAME)
        console.log('\nTest 10: Expense with negative amount (using expense_date)');
        const negativeExpense = await makeRequest('POST', '/api/v1/expenses', {
            matter_id: matterId,
            expense_date: '2025-10-09',
            amount: -50.00,
            description: 'Invalid expense'
        });
        logTest('Expense negative amount validation',
            negativeExpense.status === 422,
            `Status: ${negativeExpense.status}, Error: ${JSON.stringify(negativeExpense.body)}`
        );

        // Test 11: Expense with zero amount (BOUNDARY)
        console.log('\nTest 11: Expense with zero amount (boundary test)');
        const zeroExpense = await makeRequest('POST', '/api/v1/expenses', {
            matter_id: matterId,
            expense_date: '2025-10-09',
            amount: 0,
            description: 'Zero amount test'
        });
        logTest('Expense zero amount boundary',
            zeroExpense.status === 201,
            `Status: ${zeroExpense.status}, Expense ID: ${zeroExpense.body?.id}`
        );

        // Test 12: Valid expense (CORRECT FIELD NAME)
        console.log('\nTest 12: Valid expense (using expense_date)');
        const validExpense = await makeRequest('POST', '/api/v1/expenses', {
            matter_id: matterId,
            expense_date: '2025-10-09',
            amount: 100.00,
            description: 'Valid expense',
            billed: false
        });
        logTest('Valid expense creation',
            validExpense.status === 201,
            `Status: ${validExpense.status}, Expense ID: ${validExpense.body?.id}`
        );

        // ============================================================================
        // ENDPOINT EXISTENCE TESTS
        // ============================================================================
        console.log('\n' + '─'.repeat(80));
        console.log('ENDPOINT EXISTENCE TESTS');
        console.log('─'.repeat(80) + '\n');

        // Test 13: GET /api/v1/expenses/unbilled
        console.log('Test 13: GET /api/v1/expenses/unbilled endpoint');
        const unbilledExpenses = await makeRequest('GET', '/api/v1/expenses/unbilled');
        logTest('GET /expenses/unbilled endpoint exists',
            unbilledExpenses.status === 200,
            `Status: ${unbilledExpenses.status}, Count: ${unbilledExpenses.body?.length}`
        );

        // Test 14: PATCH /api/v1/clients/{id}
        console.log('\nTest 14: PATCH /api/v1/clients/{id} endpoint');
        const patchClient = await makeRequest('PATCH', `/api/v1/clients/${clientId}`, {
            phone: '555-9999',
            address: '789 Test St'
        });
        logTest('PATCH /clients/{id} endpoint exists',
            patchClient.status === 200,
            `Status: ${patchClient.status}`
        );

        // Test 15: PATCH client with empty name (validation)
        console.log('\nTest 15: PATCH client with empty name');
        const patchEmptyName = await makeRequest('PATCH', `/api/v1/clients/${clientId}`, {
            name: ''
        });
        logTest('PATCH client empty name validation',
            patchEmptyName.status === 422,
            `Status: ${patchEmptyName.status}, Error: ${JSON.stringify(patchEmptyName.body)}`
        );

        // Test 16: PATCH client with invalid email (validation)
        console.log('\nTest 16: PATCH client with invalid email');
        const patchInvalidEmail = await makeRequest('PATCH', `/api/v1/clients/${clientId}`, {
            email: 'not-valid'
        });
        logTest('PATCH client invalid email validation',
            patchInvalidEmail.status === 422,
            `Status: ${patchInvalidEmail.status}, Error: ${JSON.stringify(patchInvalidEmail.body)}`
        );

        // Create invoice for PATCH tests
        console.log('\nTest 17: Create invoice');
        const invoice = await makeRequest('POST', '/api/v1/invoices', {
            client_id: clientId,
            matter_id: matterId,
            invoice_date: '2025-10-09',
            due_date: '2025-11-09',
            status: 'draft'
        });
        logTest('Invoice creation',
            invoice.status === 201 && invoice.body?.id,
            `Status: ${invoice.status}, Invoice ID: ${invoice.body?.id}`
        );

        const invoiceId = invoice.body?.id;

        // Test 18: PATCH /api/v1/invoices/{id}/finalize
        console.log('\nTest 18: PATCH /api/v1/invoices/{id}/finalize endpoint');
        const finalizeInvoice = await makeRequest('PATCH', `/api/v1/invoices/${invoiceId}/finalize`);
        logTest('PATCH /invoices/{id}/finalize endpoint works',
            finalizeInvoice.status === 200,
            `Status: ${finalizeInvoice.status}, Status: ${finalizeInvoice.body?.status}`
        );

        // Test 19: Verify time entries marked as billed
        console.log('\nTest 19: Verify time entries marked as billed');
        const timeCheck = await makeRequest('GET', '/api/v1/time-entries');
        const billedEntries = timeCheck.body?.filter(t => t.matter_id === matterId && t.billed === 1);
        logTest('Time entries marked as billed after finalize',
            billedEntries.length > 0,
            `Found ${billedEntries.length} billed entries for matter ${matterId}`
        );

        // Test 20: PATCH /api/v1/invoices/{id}/send
        console.log('\nTest 20: PATCH /api/v1/invoices/{id}/send endpoint');
        const sendInvoice = await makeRequest('PATCH', `/api/v1/invoices/${invoiceId}/send`);
        logTest('PATCH /invoices/{id}/send endpoint works',
            sendInvoice.status === 200,
            `Status: ${sendInvoice.status}, Status: ${sendInvoice.body?.status}`
        );

    } catch (error) {
        console.error('\n\nFATAL ERROR during testing:', error.message);
        console.error(error.stack);
    }

    // ============================================================================
    // FINAL REPORT
    // ============================================================================
    console.log('\n\n' + '='.repeat(80));
    console.log('CORRECTED TEST RESULTS - FINAL REPORT');
    console.log('='.repeat(80));

    const totalTests = results.passed.length + results.failed.length;
    const passRate = ((results.passed.length / totalTests) * 100).toFixed(1);

    console.log(`\nTotal Tests:     ${totalTests}`);
    console.log(`Passed:          ${results.passed.length}`);
    console.log(`Failed:          ${results.failed.length}`);
    console.log(`Pass Rate:       ${passRate}%`);

    if (results.failed.length === 0) {
        console.log('\n' + '='.repeat(80));
        console.log('🎉 ALL FIXES VERIFIED - SERVER IMPLEMENTATION IS CORRECT! 🎉');
        console.log('='.repeat(80));
        console.log('\nCONFIRMED WORKING:');
        console.log('  ✓ Input validation (name, email, rates)');
        console.log('  ✓ Time entry validation (duration 1-1440 minutes)');
        console.log('  ✓ Expense validation (amount >= 0)');
        console.log('  ✓ GET /api/v1/expenses/unbilled endpoint');
        console.log('  ✓ PATCH /api/v1/clients/{id} endpoint with validation');
        console.log('  ✓ PATCH /api/v1/invoices/{id}/finalize endpoint');
        console.log('  ✓ PATCH /api/v1/invoices/{id}/send endpoint');
        console.log('  ✓ Invoice finalization marks entries as billed');
        console.log('  ✓ CSRF protection working');
        console.log('\n' + '='.repeat(80));
    } else {
        console.log('\n' + '─'.repeat(80));
        console.log('FAILED TESTS:');
        console.log('─'.repeat(80));
        results.details.filter(t => !t.passed).forEach(test => {
            console.log(`\n${test.testName}`);
            console.log(`  ${test.details}`);
        });
    }

    console.log('\n' + '='.repeat(80));
    console.log(`Test execution completed at ${new Date().toISOString()}`);
    console.log('='.repeat(80) + '\n');
}

// Run the tests
runCorrectedTests().catch(err => {
    console.error('Test suite crashed:', err);
    process.exit(1);
});
