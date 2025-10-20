// Comprehensive CRUD testing
const https = require('https');

const baseUrl = 'https://localhost:3000';
let cookies = '';
let csrfToken = '';

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

        if (csrfToken && ['POST', 'PATCH', 'DELETE'].includes(method)) {
            options.headers['X-CSRF-Token'] = csrfToken;
        }

        const req = https.request(options, (res) => {
            let body = '';

            if (res.headers['set-cookie']) {
                const cookieArray = res.headers['set-cookie'];
                cookies = cookieArray.map(c => c.split(';')[0]).join('; ');

                // Extract CSRF token
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

        req.on('error', reject);

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

async function testCRUD() {
    console.log('='.repeat(70));
    console.log('COMPREHENSIVE CRUD OPERATIONS TEST');
    console.log('='.repeat(70));
    console.log();

    const results = { passed: 0, failed: 0, errors: [] };
    let createdClientId = null;
    let createdMatterId = null;
    let createdTimeEntryId = null;
    let createdExpenseId = null;

    try {
        // LOGIN
        console.log('[1] LOGIN');
        const login = await makeRequest('POST', '/api/v1/auth/login', {
            email: 'admin@example.com',
            password: 'password'
        });
        if (login.status === 200) {
            console.log('  ✓ Login successful');
            console.log('  CSRF Token:', csrfToken.substring(0, 20) + '...');
            results.passed++;
        } else {
            console.log('  ✗ Login failed');
            results.failed++;
            return;
        }
        console.log();

        // CREATE CLIENT
        console.log('[2] CREATE CLIENT');
        const newClient = {
            name: 'Test Client ' + Date.now(),
            email: 'test@example.com',
            phone: '555-1234',
            address: '123 Test St',
            city: 'Test City',
            state: 'TS',
            zip_code: '12345',
            default_hourly_rate: 250.00
        };

        const createClient = await makeRequest('POST', '/api/v1/clients', newClient);
        console.log('  Status:', createClient.status);
        console.log('  Response:', JSON.stringify(createClient.body).substring(0, 150));

        if (createClient.status === 201 && createClient.body && createClient.body.id) {
            createdClientId = createClient.body.id;
            console.log('  ✓ Client created with ID:', createdClientId);
            results.passed++;
        } else {
            console.log('  ✗ Client creation failed');
            results.failed++;
        }
        console.log();

        // READ CLIENT
        if (createdClientId) {
            console.log('[3] READ CLIENT');
            const readClient = await makeRequest('GET', `/api/v1/clients/${createdClientId}`);
            console.log('  Status:', readClient.status);

            if (readClient.status === 200 && readClient.body && readClient.body.name === newClient.name) {
                console.log('  ✓ Client read successfully');
                console.log('  Name:', readClient.body.name);
                results.passed++;
            } else {
                console.log('  ✗ Client read failed');
                results.failed++;
            }
            console.log();
        }

        // CREATE MATTER
        if (createdClientId) {
            console.log('[4] CREATE MATTER');
            const newMatter = {
                client_id: createdClientId,
                name: 'Test Matter ' + Date.now(),
                description: 'Test matter description',
                status: 'active',
                billing_type: 'hourly',
                hourly_rate: 300.00,
                open_date: new Date().toISOString().split('T')[0]
            };

            const createMatter = await makeRequest('POST', '/api/v1/matters', newMatter);
            console.log('  Status:', createMatter.status);
            console.log('  Response:', JSON.stringify(createMatter.body).substring(0, 150));

            if (createMatter.status === 201 && createMatter.body && createMatter.body.id) {
                createdMatterId = createMatter.body.id;
                console.log('  ✓ Matter created with ID:', createdMatterId);
                results.passed++;
            } else {
                console.log('  ✗ Matter creation failed');
                results.failed++;
            }
            console.log();
        }

        // CREATE TIME ENTRY
        if (createdMatterId) {
            console.log('[5] CREATE TIME ENTRY');
            const newTimeEntry = {
                matter_id: createdMatterId,
                entry_date: new Date().toISOString().split('T')[0],
                duration_minutes: 120,
                description: 'Test time entry',
                hourly_rate: 300.00,
                billable: 1
            };

            const createTime = await makeRequest('POST', '/api/v1/time-entries', newTimeEntry);
            console.log('  Status:', createTime.status);
            console.log('  Response:', JSON.stringify(createTime.body).substring(0, 150));

            if (createTime.status === 201 && createTime.body && createTime.body.id) {
                createdTimeEntryId = createTime.body.id;
                console.log('  ✓ Time entry created with ID:', createdTimeEntryId);
                results.passed++;
            } else {
                console.log('  ✗ Time entry creation failed');
                results.failed++;
            }
            console.log();
        }

        // CREATE EXPENSE
        if (createdMatterId) {
            console.log('[6] CREATE EXPENSE');
            const newExpense = {
                matter_id: createdMatterId,
                expense_date: new Date().toISOString().split('T')[0],
                category: 'Travel',
                description: 'Test expense',
                vendor: 'Test Vendor',
                amount: 50.00,
                billable: 1
            };

            const createExpense = await makeRequest('POST', '/api/v1/expenses', newExpense);
            console.log('  Status:', createExpense.status);
            console.log('  Response:', JSON.stringify(createExpense.body).substring(0, 150));

            if (createExpense.status === 201 && createExpense.body && createExpense.body.id) {
                createdExpenseId = createExpense.body.id;
                console.log('  ✓ Expense created with ID:', createdExpenseId);
                results.passed++;
            } else {
                console.log('  ✗ Expense creation failed');
                results.failed++;
            }
            console.log();
        }

        // UPDATE TIME ENTRY
        if (createdTimeEntryId) {
            console.log('[7] UPDATE TIME ENTRY');
            const updateData = {
                duration_minutes: 180,
                description: 'Updated test time entry'
            };

            const updateTime = await makeRequest('PATCH', `/api/v1/time-entries/${createdTimeEntryId}`, updateData);
            console.log('  Status:', updateTime.status);

            if (updateTime.status === 200) {
                console.log('  ✓ Time entry updated');
                results.passed++;
            } else {
                console.log('  ✗ Time entry update failed');
                results.failed++;
            }
            console.log();
        }

        // DELETE TIME ENTRY
        if (createdTimeEntryId) {
            console.log('[8] DELETE TIME ENTRY');
            const deleteTime = await makeRequest('DELETE', `/api/v1/time-entries/${createdTimeEntryId}`);
            console.log('  Status:', deleteTime.status);

            if (deleteTime.status === 200) {
                console.log('  ✓ Time entry deleted');
                results.passed++;
            } else {
                console.log('  ✗ Time entry deletion failed');
                results.failed++;
            }
            console.log();
        }

        // DELETE EXPENSE
        if (createdExpenseId) {
            console.log('[9] DELETE EXPENSE');
            const deleteExpense = await makeRequest('DELETE', `/api/v1/expenses/${createdExpenseId}`);
            console.log('  Status:', deleteExpense.status);

            if (deleteExpense.status === 200) {
                console.log('  ✓ Expense deleted');
                results.passed++;
            } else {
                console.log('  ✗ Expense deletion failed');
                results.failed++;
            }
            console.log();
        }

        // DELETE MATTER
        if (createdMatterId) {
            console.log('[10] DELETE MATTER');
            const deleteMatter = await makeRequest('DELETE', `/api/v1/matters/${createdMatterId}`);
            console.log('  Status:', deleteMatter.status);

            if (deleteMatter.status === 200) {
                console.log('  ✓ Matter deleted');
                results.passed++;
            } else {
                console.log('  ✗ Matter deletion failed');
                results.failed++;
            }
            console.log();
        }

    } catch (error) {
        console.error('ERROR:', error.message);
        results.errors.push(error.message);
    }

    // Summary
    console.log();
    console.log('='.repeat(70));
    console.log('CRUD TEST SUMMARY');
    console.log('='.repeat(70));
    console.log('Passed:', results.passed);
    console.log('Failed:', results.failed);
    console.log('Errors:', results.errors.length);
    console.log('Success Rate:', ((results.passed / (results.passed + results.failed)) * 100).toFixed(1) + '%');
    console.log('='.repeat(70));
}

testCRUD();
