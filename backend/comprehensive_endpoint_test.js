// Comprehensive endpoint testing script
const https = require('https');

const baseUrl = 'https://localhost:3000';
let cookies = '';

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
            rejectUnauthorized: false // Accept self-signed certs
        };

        if (cookies) {
            options.headers['Cookie'] = cookies;
        }

        const req = https.request(options, (res) => {
            let body = '';

            // Save cookies from login
            if (res.headers['set-cookie']) {
                cookies = res.headers['set-cookie'].map(c => c.split(';')[0]).join('; ');
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

async function runTests() {
    console.log('='.repeat(70));
    console.log('COMPREHENSIVE BACKEND ENDPOINT TESTING');
    console.log('='.repeat(70));
    console.log();

    const results = {
        passed: [],
        failed: [],
        errors: []
    };

    try {
        // Test 1: Login
        console.log('TEST 1: Authentication - Login');
        const login = await makeRequest('POST', '/api/v1/auth/login', {
            email: 'admin@example.com',
            password: 'password'
        });
        if (login.status === 200 && login.body.user) {
            console.log('  ✓ PASS - Login successful');
            console.log('  User:', login.body.user.email, '(Role:', login.body.user.role + ')');
            results.passed.push('Login');
        } else {
            console.log('  ✗ FAIL - Login failed');
            results.failed.push('Login');
        }
        console.log();

        // Test 2: Dashboard Stats (GET - requires auth)
        console.log('TEST 2: Dashboard Stats');
        const stats = await makeRequest('GET', '/api/v1/dashboard/stats');
        console.log('  Status:', stats.status);
        console.log('  Response:', JSON.stringify(stats.body).substring(0, 100));
        if (stats.status === 200) {
            console.log('  ✓ PASS');
            results.passed.push('Dashboard Stats');
        } else {
            console.log('  ✗ FAIL - Expected 200, got', stats.status);
            results.failed.push('Dashboard Stats');
        }
        console.log();

        // Test 3: Firm Settings (GET - requires auth + admin role)
        console.log('TEST 3: Firm Settings (GET)');
        const firmSettings = await makeRequest('GET', '/api/v1/firm-settings');
        console.log('  Status:', firmSettings.status);
        console.log('  Response:', JSON.stringify(firmSettings.body).substring(0, 150));
        if (firmSettings.status === 200) {
            console.log('  ✓ PASS');
            results.passed.push('Firm Settings GET');
        } else {
            console.log('  ✗ FAIL - Expected 200, got', firmSettings.status);
            results.failed.push('Firm Settings GET');
        }
        console.log();

        // Test 4: Clients List (GET - requires auth)
        console.log('TEST 4: Clients List');
        const clients = await makeRequest('GET', '/api/v1/clients');
        console.log('  Status:', clients.status);
        if (clients.status === 200) {
            console.log('  ✓ PASS - Found', clients.body ? clients.body.length : 0, 'clients');
            results.passed.push('Clients List');
        } else {
            console.log('  ✗ FAIL - Expected 200, got', clients.status);
            results.failed.push('Clients List');
        }
        console.log();

        // Test 5: Matters List (GET - requires auth)
        console.log('TEST 5: Matters List');
        const matters = await makeRequest('GET', '/api/v1/matters');
        console.log('  Status:', matters.status);
        if (matters.status === 200) {
            console.log('  ✓ PASS - Found', matters.body ? matters.body.length : 0, 'matters');
            results.passed.push('Matters List');
        } else {
            console.log('  ✗ FAIL - Expected 200, got', matters.status);
            results.failed.push('Matters List');
        }
        console.log();

        // Test 6: Time Entries (GET - requires auth)
        console.log('TEST 6: Time Entries');
        const timeEntries = await makeRequest('GET', '/api/v1/time-entries');
        console.log('  Status:', timeEntries.status);
        if (timeEntries.status === 200) {
            console.log('  ✓ PASS');
            results.passed.push('Time Entries');
        } else {
            console.log('  ✗ FAIL - Expected 200, got', timeEntries.status);
            results.failed.push('Time Entries');
        }
        console.log();

        // Test 7: Unbilled Time (GET - requires auth)
        console.log('TEST 7: Unbilled Time');
        const unbilled = await makeRequest('GET', '/api/v1/time-entries/unbilled');
        console.log('  Status:', unbilled.status);
        if (unbilled.status === 200) {
            console.log('  ✓ PASS');
            results.passed.push('Unbilled Time');
        } else {
            console.log('  ✗ FAIL - Expected 200, got', unbilled.status);
            results.failed.push('Unbilled Time');
        }
        console.log();

        // Test 8: Expenses (GET - requires auth)
        console.log('TEST 8: Expenses');
        const expenses = await makeRequest('GET', '/api/v1/expenses');
        console.log('  Status:', expenses.status);
        if (expenses.status === 200) {
            console.log('  ✓ PASS');
            results.passed.push('Expenses');
        } else {
            console.log('  ✗ FAIL - Expected 200, got', expenses.status);
            results.failed.push('Expenses');
        }
        console.log();

        // Test 9: Invoices (GET - requires auth)
        console.log('TEST 9: Invoices');
        const invoices = await makeRequest('GET', '/api/v1/invoices');
        console.log('  Status:', invoices.status);
        if (invoices.status === 200) {
            console.log('  ✓ PASS');
            results.passed.push('Invoices');
        } else {
            console.log('  ✗ FAIL - Expected 200, got', invoices.status);
            results.failed.push('Invoices');
        }
        console.log();

    } catch (error) {
        console.error('ERROR during testing:', error.message);
        results.errors.push(error.message);
    }

    // Summary
    console.log();
    console.log('='.repeat(70));
    console.log('TEST SUMMARY');
    console.log('='.repeat(70));
    console.log('Passed:', results.passed.length);
    console.log('Failed:', results.failed.length);
    console.log('Errors:', results.errors.length);
    console.log();

    if (results.failed.length > 0) {
        console.log('Failed tests:');
        results.failed.forEach(t => console.log('  -', t));
        console.log();
    }

    const successRate = ((results.passed.length / (results.passed.length + results.failed.length)) * 100).toFixed(1);
    console.log('Success Rate:', successRate + '%');
    console.log('='.repeat(70));
}

runTests();
