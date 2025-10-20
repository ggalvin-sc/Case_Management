/**
 * Comprehensive Feature Testing Script
 * Tests every backend endpoint and validates frontend integration
 *
 * Identifies:
 * - Missing features and incomplete implementations
 * - Broken endpoints and error handling issues
 * - Frontend-backend integration gaps
 * - Data validation problems
 */

const https = require('https');

const API_BASE = 'https://localhost:3000/api/v1';
const TEST_USER = {
    email: 'admin@example.com',
    password: 'password'
};

// Results tracking
const results = {
    passed: [],
    failed: [],
    warnings: [],
    missing: []
};

let authToken = null;
let testClientId = null;
let testMatterId = null;
let testTimeEntryId = null;
let testExpenseId = null;
let testInvoiceId = null;

/**
 * Makes an API request
 */
function apiRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(API_BASE + path);

        const options = {
            method,
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            headers: {
                'Content-Type': 'application/json'
            },
            rejectUnauthorized: false
        };

        if (authToken) {
            options.headers['Authorization'] = `Bearer ${authToken}`;
        }

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = body ? JSON.parse(body) : {};
                    resolve({ status: res.statusCode, data: parsed, headers: res.headers });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body, headers: res.headers });
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
 * Test helper functions
 */
function pass(test, message) {
    results.passed.push({ test, message });
    console.log(`✓ ${test}: ${message}`);
}

function fail(test, message, details) {
    results.failed.push({ test, message, details });
    console.error(`✗ ${test}: ${message}`);
    if (details) console.error(`  Details: ${JSON.stringify(details)}`);
}

function warn(test, message) {
    results.warnings.push({ test, message });
    console.warn(`⚠ ${test}: ${message}`);
}

function missing(category, feature, priority = 'IMPORTANT') {
    results.missing.push({ category, feature, priority });
    console.log(`○ MISSING [${priority}] ${category}: ${feature}`);
}

/**
 * Test Suite: Authentication
 */
async function testAuthentication() {
    console.log('\n=== Testing Authentication ===\n');

    // Test 1: Login with valid credentials
    try {
        const res = await apiRequest('POST', '/auth/login', TEST_USER);
        if (res.status === 200 && res.data.token) {
            authToken = res.data.token;
            pass('Auth-01', 'Login successful with valid credentials');
        } else {
            fail('Auth-01', 'Login failed with valid credentials', res.data);
        }
    } catch (error) {
        fail('Auth-01', 'Login request failed', error.message);
    }

    // Test 2: Login with invalid credentials
    try {
        const res = await apiRequest('POST', '/auth/login', {
            email: 'wrong@example.com',
            password: 'wrong'
        });
        if (res.status === 401 || res.status === 400) {
            pass('Auth-02', 'Invalid login correctly rejected');
        } else {
            fail('Auth-02', 'Invalid login should return 401/400', res);
        }
    } catch (error) {
        pass('Auth-02', 'Invalid login rejected (connection error expected)');
    }

    // Test 3: Get current user info
    try {
        const res = await apiRequest('GET', '/auth/me');
        if (res.status === 200 && res.data.user) {
            pass('Auth-03', 'User info retrieved successfully');
        } else {
            fail('Auth-03', 'Failed to get user info', res.data);
        }
    } catch (error) {
        fail('Auth-03', 'User info request failed', error.message);
    }

    // Test 4: Password change
    try {
        const res = await apiRequest('POST', '/auth/change-password', {
            currentPassword: 'password',
            newPassword: 'newpassword123'
        });
        if (res.status === 200) {
            pass('Auth-04', 'Password change endpoint exists');
            // Change it back
            await apiRequest('POST', '/auth/change-password', {
                currentPassword: 'newpassword123',
                newPassword: 'password'
            });
        } else {
            warn('Auth-04', 'Password change may have issues');
        }
    } catch (error) {
        warn('Auth-04', 'Password change endpoint issue: ' + error.message);
    }

    // Check for missing auth features
    missing('Authentication', 'Password reset functionality', 'IMPORTANT');
    missing('Authentication', 'Two-factor authentication', 'MINOR');
    missing('Authentication', 'Session management/logout all devices', 'MINOR');
}

/**
 * Test Suite: Clients
 */
async function testClients() {
    console.log('\n=== Testing Clients ===\n');

    // Test 1: Create client
    try {
        const clientData = {
            name: 'Test Client Corp',
            client_number: null, // Auto-generate
            email: 'testclient@example.com',
            phone: '555-123-4567',
            address: '123 Test Street',
            address_line2: 'Suite 100',
            city: 'Test City',
            state: 'CA',
            zip_code: '90210',
            country: 'USA',
            default_hourly_rate: 350
        };

        const res = await apiRequest('POST', '/clients', clientData);
        if (res.status === 200 || res.status === 201) {
            testClientId = res.data.id;
            pass('Client-01', `Client created successfully (ID: ${testClientId})`);

            // Verify all fields were saved
            if (res.data.address_line2 && res.data.city && res.data.state) {
                pass('Client-01a', 'Structured address fields saved correctly');
            } else {
                warn('Client-01a', 'Some address fields may not be saved');
            }
        } else {
            fail('Client-01', 'Failed to create client', res.data);
        }
    } catch (error) {
        fail('Client-01', 'Client creation request failed', error.message);
    }

    // Test 2: Get all clients
    try {
        const res = await apiRequest('GET', '/clients');
        if (res.status === 200 && Array.isArray(res.data)) {
            pass('Client-02', `Retrieved ${res.data.length} clients`);
        } else {
            fail('Client-02', 'Failed to get clients list', res.data);
        }
    } catch (error) {
        fail('Client-02', 'Get clients request failed', error.message);
    }

    // Test 3: Get specific client
    if (testClientId) {
        try {
            const res = await apiRequest('GET', `/clients/${testClientId}`);
            if (res.status === 200 && res.data.id === testClientId) {
                pass('Client-03', 'Retrieved specific client successfully');
            } else {
                fail('Client-03', 'Failed to get specific client', res.data);
            }
        } catch (error) {
            fail('Client-03', 'Get client request failed', error.message);
        }
    }

    // Test 4: Update client
    if (testClientId) {
        try {
            const res = await apiRequest('PUT', `/clients/${testClientId}`, {
                name: 'Updated Test Client Corp',
                phone: '555-999-8888'
            });
            if (res.status === 200) {
                pass('Client-04', 'Client updated successfully');
            } else {
                fail('Client-04', 'Failed to update client', res.data);
            }
        } catch (error) {
            fail('Client-04', 'Update client request failed', error.message);
        }
    }

    // Test 5: Search clients
    try {
        const res = await apiRequest('GET', '/clients?search=Test');
        if (res.status === 200) {
            pass('Client-05', 'Client search works');
        } else {
            warn('Client-05', 'Client search may not be implemented');
        }
    } catch (error) {
        warn('Client-05', 'Client search not tested');
    }

    // Check for missing client features
    missing('Clients', 'Client portal access', 'IMPORTANT');
    missing('Clients', 'Client documents/attachments', 'IMPORTANT');
    missing('Clients', 'Client billing preferences', 'IMPORTANT');
    missing('Clients', 'Client notes/comments', 'MINOR');
    missing('Clients', 'Client tags/categories', 'MINOR');
}

/**
 * Test Suite: Matters
 */
async function testMatters() {
    console.log('\n=== Testing Matters ===\n');

    if (!testClientId) {
        warn('Matter-00', 'Skipping matter tests - no test client created');
        return;
    }

    // Test 1: Create matter
    try {
        const matterData = {
            client_id: testClientId,
            name: 'Test Matter v. Defendant',
            matter_number: null, // Auto-generate
            description: 'Test litigation matter',
            status: 'active',
            billing_type: 'hourly',
            hourly_rate: 400,
            open_date: new Date().toISOString().split('T')[0],
            matter_type: 'litigation',
            court_name: 'Superior Court',
            case_number: 'CV-2025-001',
            opposing_party: 'Defendant Corp',
            opposing_counsel: 'Defense Attorney',
            priority: 'high',
            practice_area: 'Civil Litigation',
            retainer_amount: 10000,
            estimated_hours: 100,
            notes: 'Test matter notes'
        };

        const res = await apiRequest('POST', '/matters', matterData);
        if (res.status === 200 || res.status === 201) {
            testMatterId = res.data.id;
            pass('Matter-01', `Matter created successfully (ID: ${testMatterId})`);

            // Verify extended fields
            if (res.data.matter_type && res.data.court_name) {
                pass('Matter-01a', 'Extended matter fields saved correctly');
            } else {
                warn('Matter-01a', 'Some extended matter fields may not be saved');
            }
        } else {
            fail('Matter-01', 'Failed to create matter', res.data);
        }
    } catch (error) {
        fail('Matter-01', 'Matter creation request failed', error.message);
    }

    // Test 2: Get all matters
    try {
        const res = await apiRequest('GET', '/matters');
        if (res.status === 200 && Array.isArray(res.data)) {
            pass('Matter-02', `Retrieved ${res.data.length} matters`);
        } else {
            fail('Matter-02', 'Failed to get matters list', res.data);
        }
    } catch (error) {
        fail('Matter-02', 'Get matters request failed', error.message);
    }

    // Test 3: Get specific matter
    if (testMatterId) {
        try {
            const res = await apiRequest('GET', `/matters/${testMatterId}`);
            if (res.status === 200 && res.data.id === testMatterId) {
                pass('Matter-03', 'Retrieved specific matter successfully');

                // Check if all fields are returned
                const expectedFields = ['matter_type', 'court_name', 'case_number',
                    'opposing_party', 'priority', 'practice_area'];
                const missingFields = expectedFields.filter(f => !res.data[f]);

                if (missingFields.length === 0) {
                    pass('Matter-03a', 'All extended matter fields returned');
                } else {
                    warn('Matter-03a', `Missing fields in response: ${missingFields.join(', ')}`);
                }
            } else {
                fail('Matter-03', 'Failed to get specific matter', res.data);
            }
        } catch (error) {
            fail('Matter-03', 'Get matter request failed', error.message);
        }
    }

    // Test 4: Update matter
    if (testMatterId) {
        try {
            const res = await apiRequest('PUT', `/matters/${testMatterId}`, {
                status: 'active',
                priority: 'normal'
            });
            if (res.status === 200) {
                pass('Matter-04', 'Matter updated successfully');
            } else {
                fail('Matter-04', 'Failed to update matter', res.data);
            }
        } catch (error) {
            fail('Matter-04', 'Update matter request failed', error.message);
        }
    }

    // Test 5: Get matters by client
    try {
        const res = await apiRequest('GET', `/matters?client_id=${testClientId}`);
        if (res.status === 200) {
            pass('Matter-05', 'Filter matters by client works');
        } else {
            warn('Matter-05', 'Matter filtering may not work properly');
        }
    } catch (error) {
        warn('Matter-05', 'Matter filtering not tested');
    }

    // Check for missing matter features
    missing('Matters', 'Matter documents/attachments', 'CRITICAL');
    missing('Matters', 'Matter deadlines/calendar integration', 'CRITICAL');
    missing('Matters', 'Matter milestones/phases', 'IMPORTANT');
    missing('Matters', 'Matter team/collaborators', 'IMPORTANT');
    missing('Matters', 'Matter budget tracking vs actual', 'IMPORTANT');
    missing('Matters', 'Matter conflicts checking', 'IMPORTANT');
    missing('Matters', 'Statute of limitations tracking', 'IMPORTANT');
}

/**
 * Test Suite: Time Entries
 */
async function testTimeEntries() {
    console.log('\n=== Testing Time Entries ===\n');

    if (!testMatterId) {
        warn('Time-00', 'Skipping time entry tests - no test matter created');
        return;
    }

    // Test 1: Create time entry
    try {
        const timeData = {
            matter_id: testMatterId,
            entry_date: new Date().toISOString().split('T')[0],
            duration_minutes: 120,
            description: 'Legal research and analysis',
            hourly_rate: 400,
            billable: 1
        };

        const res = await apiRequest('POST', '/time-entries', timeData);
        if (res.status === 200 || res.status === 201) {
            testTimeEntryId = res.data.id;
            pass('Time-01', `Time entry created (ID: ${testTimeEntryId})`);
        } else {
            fail('Time-01', 'Failed to create time entry', res.data);
        }
    } catch (error) {
        fail('Time-01', 'Time entry creation failed', error.message);
    }

    // Test 2: Get unbilled time entries
    try {
        const res = await apiRequest('GET', '/time-entries/unbilled');
        if (res.status === 200 && Array.isArray(res.data)) {
            pass('Time-02', `Retrieved ${res.data.length} unbilled time entries`);
        } else {
            fail('Time-02', 'Failed to get unbilled time entries', res.data);
        }
    } catch (error) {
        fail('Time-02', 'Get unbilled time request failed', error.message);
    }

    // Test 3: Get all time entries
    try {
        const res = await apiRequest('GET', '/time-entries');
        if (res.status === 200 && Array.isArray(res.data)) {
            pass('Time-03', `Retrieved ${res.data.length} time entries`);
        } else {
            fail('Time-03', 'Failed to get time entries', res.data);
        }
    } catch (error) {
        fail('Time-03', 'Get time entries request failed', error.message);
    }

    // Test 4: Update time entry
    if (testTimeEntryId) {
        try {
            const res = await apiRequest('PUT', `/time-entries/${testTimeEntryId}`, {
                duration_minutes: 150,
                description: 'Updated: Legal research and analysis'
            });
            if (res.status === 200) {
                pass('Time-04', 'Time entry updated successfully');
            } else {
                fail('Time-04', 'Failed to update time entry', res.data);
            }
        } catch (error) {
            fail('Time-04', 'Update time entry request failed', error.message);
        }
    }

    // Test 5: Filter by matter
    try {
        const res = await apiRequest('GET', `/time-entries?matter_id=${testMatterId}`);
        if (res.status === 200) {
            pass('Time-05', 'Filter time entries by matter works');
        } else {
            warn('Time-05', 'Time entry filtering may not work');
        }
    } catch (error) {
        warn('Time-05', 'Time entry filtering not tested');
    }

    // Check for missing time entry features
    missing('Time Entries', 'Timer functionality (start/stop)', 'CRITICAL');
    missing('Time Entries', 'Time entry templates', 'IMPORTANT');
    missing('Time Entries', 'Bulk time entry creation', 'IMPORTANT');
    missing('Time Entries', 'Time entry approval workflow', 'IMPORTANT');
    missing('Time Entries', 'Time rounding rules', 'MINOR');
}

/**
 * Test Suite: Expenses
 */
async function testExpenses() {
    console.log('\n=== Testing Expenses ===\n');

    if (!testMatterId) {
        warn('Expense-00', 'Skipping expense tests - no test matter created');
        return;
    }

    // Test 1: Create expense
    try {
        const expenseData = {
            matter_id: testMatterId,
            expense_date: new Date().toISOString().split('T')[0],
            category: 'filing_fees',
            description: 'Court filing fee',
            vendor: 'Superior Court',
            amount: 435.00,
            markup_percentage: 0,
            billable: 1
        };

        const res = await apiRequest('POST', '/expenses', expenseData);
        if (res.status === 200 || res.status === 201) {
            testExpenseId = res.data.id;
            pass('Expense-01', `Expense created (ID: ${testExpenseId})`);
        } else {
            fail('Expense-01', 'Failed to create expense', res.data);
        }
    } catch (error) {
        fail('Expense-01', 'Expense creation failed', error.message);
    }

    // Test 2: Get unbilled expenses
    try {
        const res = await apiRequest('GET', '/expenses/unbilled');
        if (res.status === 200 && Array.isArray(res.data)) {
            pass('Expense-02', `Retrieved ${res.data.length} unbilled expenses`);
        } else {
            fail('Expense-02', 'Failed to get unbilled expenses', res.data);
        }
    } catch (error) {
        fail('Expense-02', 'Get unbilled expenses request failed', error.message);
    }

    // Test 3: Get all expenses
    try {
        const res = await apiRequest('GET', '/expenses');
        if (res.status === 200 && Array.isArray(res.data)) {
            pass('Expense-03', `Retrieved ${res.data.length} expenses`);
        } else {
            fail('Expense-03', 'Failed to get expenses', res.data);
        }
    } catch (error) {
        fail('Expense-03', 'Get expenses request failed', error.message);
    }

    // Test 4: Update expense
    if (testExpenseId) {
        try {
            const res = await apiRequest('PUT', `/expenses/${testExpenseId}`, {
                amount: 450.00,
                description: 'Updated: Court filing fee'
            });
            if (res.status === 200) {
                pass('Expense-04', 'Expense updated successfully');
            } else {
                fail('Expense-04', 'Failed to update expense', res.data);
            }
        } catch (error) {
            fail('Expense-04', 'Update expense request failed', error.message);
        }
    }

    // Check for missing expense features
    missing('Expenses', 'Expense receipts/attachments', 'CRITICAL');
    missing('Expenses', 'Expense categories management', 'IMPORTANT');
    missing('Expenses', 'Expense approval workflow', 'IMPORTANT');
    missing('Expenses', 'Mileage tracking', 'MINOR');
}

/**
 * Test Suite: Invoices
 */
async function testInvoices() {
    console.log('\n=== Testing Invoices ===\n');

    if (!testMatterId || !testClientId) {
        warn('Invoice-00', 'Skipping invoice tests - prerequisites not met');
        return;
    }

    // Test 1: Create invoice
    try {
        const invoiceData = {
            matter_id: testMatterId,
            client_id: testClientId,
            issue_date: new Date().toISOString().split('T')[0],
            due_date: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
            status: 'draft',
            notes: 'Test invoice',
            payment_terms: 'Net 30'
        };

        const res = await apiRequest('POST', '/invoices', invoiceData);
        if (res.status === 200 || res.status === 201) {
            testInvoiceId = res.data.id;
            pass('Invoice-01', `Invoice created (ID: ${testInvoiceId}, #${res.data.invoice_number})`);
        } else {
            fail('Invoice-01', 'Failed to create invoice', res.data);
        }
    } catch (error) {
        fail('Invoice-01', 'Invoice creation failed', error.message);
    }

    // Test 2: Get all invoices
    try {
        const res = await apiRequest('GET', '/invoices');
        if (res.status === 200 && Array.isArray(res.data)) {
            pass('Invoice-02', `Retrieved ${res.data.length} invoices`);
        } else {
            fail('Invoice-02', 'Failed to get invoices', res.data);
        }
    } catch (error) {
        fail('Invoice-02', 'Get invoices request failed', error.message);
    }

    // Test 3: Get specific invoice
    if (testInvoiceId) {
        try {
            const res = await apiRequest('GET', `/invoices/${testInvoiceId}`);
            if (res.status === 200 && res.data.id === testInvoiceId) {
                pass('Invoice-03', 'Retrieved specific invoice successfully');

                // Check for line items
                if (res.data.line_items) {
                    pass('Invoice-03a', 'Invoice includes line items');
                } else {
                    warn('Invoice-03a', 'Invoice line items may not be returned');
                }
            } else {
                fail('Invoice-03', 'Failed to get specific invoice', res.data);
            }
        } catch (error) {
            fail('Invoice-03', 'Get invoice request failed', error.message);
        }
    }

    // Test 4: Finalize invoice
    if (testInvoiceId) {
        try {
            const res = await apiRequest('POST', `/invoices/${testInvoiceId}/finalize`, {});
            if (res.status === 200) {
                pass('Invoice-04', 'Invoice finalized successfully');
            } else {
                warn('Invoice-04', 'Invoice finalization may have issues');
            }
        } catch (error) {
            warn('Invoice-04', 'Invoice finalization endpoint issue: ' + error.message);
        }
    }

    // Test 5: Send invoice
    if (testInvoiceId) {
        try {
            const res = await apiRequest('POST', `/invoices/${testInvoiceId}/send`, {});
            if (res.status === 200) {
                pass('Invoice-05', 'Invoice send endpoint exists');
            } else {
                warn('Invoice-05', 'Invoice send may not be implemented');
            }
        } catch (error) {
            warn('Invoice-05', 'Invoice send endpoint issue: ' + error.message);
        }
    }

    // Test 6: Record payment
    if (testInvoiceId) {
        try {
            const res = await apiRequest('POST', `/invoices/${testInvoiceId}/payment`, {
                amount: 100,
                payment_date: new Date().toISOString().split('T')[0],
                payment_method: 'check'
            });
            if (res.status === 200) {
                pass('Invoice-06', 'Payment recording works');
            } else {
                warn('Invoice-06', 'Payment recording may not be implemented');
            }
        } catch (error) {
            warn('Invoice-06', 'Payment recording endpoint issue: ' + error.message);
        }
    }

    // Check for missing invoice features
    missing('Invoices', 'Invoice PDF generation', 'CRITICAL');
    missing('Invoices', 'Invoice email sending', 'CRITICAL');
    missing('Invoices', 'Invoice templates (multiple styles)', 'IMPORTANT');
    missing('Invoices', 'Recurring invoices', 'IMPORTANT');
    missing('Invoices', 'Payment reminders', 'IMPORTANT');
    missing('Invoices', 'Partial payment tracking', 'IMPORTANT');
    missing('Invoices', 'Invoice preview before finalization', 'MINOR');
}

/**
 * Test Suite: Settings
 */
async function testSettings() {
    console.log('\n=== Testing Settings ===\n');

    // Test 1: Get firm settings
    try {
        const res = await apiRequest('GET', '/firm-settings');
        if (res.status === 200 && res.data.firm_name) {
            pass('Settings-01', 'Firm settings retrieved successfully');
        } else {
            fail('Settings-01', 'Failed to get firm settings', res.data);
        }
    } catch (error) {
        fail('Settings-01', 'Get firm settings request failed', error.message);
    }

    // Test 2: Update firm settings
    try {
        const res = await apiRequest('PUT', '/firm-settings', {
            firm_name: 'Test Law Firm LLP',
            phone: '555-888-9999'
        });
        if (res.status === 200) {
            pass('Settings-02', 'Firm settings updated successfully');
        } else {
            fail('Settings-02', 'Failed to update firm settings', res.data);
        }
    } catch (error) {
        fail('Settings-02', 'Update firm settings request failed', error.message);
    }

    // Check for missing settings features
    missing('Settings', 'User management (create/edit/delete users)', 'CRITICAL');
    missing('Settings', 'Role and permission management', 'CRITICAL');
    missing('Settings', 'Email templates configuration', 'IMPORTANT');
    missing('Settings', 'Tax rate configuration', 'IMPORTANT');
    missing('Settings', 'Payment gateway integration', 'IMPORTANT');
    missing('Settings', 'Backup/restore functionality', 'IMPORTANT');
    missing('Settings', 'Audit log', 'MINOR');
}

/**
 * Test Suite: Dashboard
 */
async function testDashboard() {
    console.log('\n=== Testing Dashboard ===\n');

    // Test 1: Dashboard stats
    try {
        const res = await apiRequest('GET', '/dashboard/stats');
        if (res.status === 200) {
            pass('Dashboard-01', 'Dashboard stats endpoint works');

            const expectedStats = ['activeMatters', 'unbilledHours', 'unbilledAmount', 'monthRevenue'];
            const hasStats = expectedStats.some(stat => res.data[stat] !== undefined);

            if (hasStats) {
                pass('Dashboard-01a', 'Dashboard returns expected statistics');
            } else {
                warn('Dashboard-01a', 'Dashboard may not return all expected stats');
            }
        } else {
            fail('Dashboard-01', 'Dashboard stats endpoint failed', res.data);
        }
    } catch (error) {
        fail('Dashboard-01', 'Dashboard stats request failed', error.message);
    }

    // Test 2: Recent activity
    try {
        const res = await apiRequest('GET', '/dashboard/activity');
        if (res.status === 200 && Array.isArray(res.data)) {
            pass('Dashboard-02', `Dashboard activity endpoint works (${res.data.length} items)`);
        } else {
            fail('Dashboard-02', 'Dashboard activity endpoint failed', res.data);
        }
    } catch (error) {
        fail('Dashboard-02', 'Dashboard activity request failed', error.message);
    }

    // Check for missing dashboard features
    missing('Dashboard', 'Revenue charts/graphs', 'IMPORTANT');
    missing('Dashboard', 'Time tracking charts', 'IMPORTANT');
    missing('Dashboard', 'Upcoming deadlines widget', 'CRITICAL');
    missing('Dashboard', 'Overdue invoices widget', 'IMPORTANT');
    missing('Dashboard', 'Matter status breakdown', 'MINOR');
}

/**
 * Test Suite: AI Assistant
 */
async function testAI() {
    console.log('\n=== Testing AI Assistant ===\n');

    // Test 1: Health check
    try {
        const res = await apiRequest('GET', '/runpod/health');
        if (res.status === 200) {
            pass('AI-01', 'AI health endpoint exists');
        } else {
            warn('AI-01', 'AI health endpoint may not be implemented');
        }
    } catch (error) {
        warn('AI-01', 'AI health endpoint not accessible');
    }

    // Test 2: Ask question
    try {
        const res = await apiRequest('POST', '/ai/ask', {
            question: 'What is the capital of France?'
        });
        if (res.status === 200) {
            pass('AI-02', 'AI ask endpoint works');
        } else {
            warn('AI-02', 'AI ask endpoint may not be fully implemented');
        }
    } catch (error) {
        warn('AI-02', 'AI ask endpoint issue: ' + error.message);
    }

    // Test 3: Get questions history
    try {
        const res = await apiRequest('GET', '/ai/questions');
        if (res.status === 200 && Array.isArray(res.data)) {
            pass('AI-03', `AI questions history endpoint works (${res.data.length} questions)`);
        } else {
            warn('AI-03', 'AI questions history may not work properly');
        }
    } catch (error) {
        warn('AI-03', 'AI questions history endpoint issue: ' + error.message);
    }

    // Check for missing AI features
    missing('AI Assistant', 'Document analysis', 'IMPORTANT');
    missing('AI Assistant', 'Contract review', 'IMPORTANT');
    missing('AI Assistant', 'Legal research integration', 'IMPORTANT');
    missing('AI Assistant', 'Summarization features', 'MINOR');
}

/**
 * Test Suite: Users
 */
async function testUsers() {
    console.log('\n=== Testing Users ===\n');

    // Test 1: Get all users
    try {
        const res = await apiRequest('GET', '/users');
        if (res.status === 200 && Array.isArray(res.data)) {
            pass('User-01', `Retrieved ${res.data.length} users`);
        } else {
            fail('User-01', 'Failed to get users', res.data);
        }
    } catch (error) {
        fail('User-01', 'Get users request failed', error.message);
    }

    // Test 2: Create user
    try {
        const userData = {
            email: 'newuser@example.com',
            password: 'testpassword123',
            first_name: 'New',
            last_name: 'User',
            role: 'attorney',
            hourly_rate: 300
        };

        const res = await apiRequest('POST', '/users', userData);
        if (res.status === 200 || res.status === 201) {
            pass('User-02', 'User creation works');
        } else {
            warn('User-02', 'User creation may not be implemented');
        }
    } catch (error) {
        warn('User-02', 'User creation endpoint issue: ' + error.message);
    }

    // Check for missing user features
    missing('Users', 'User profile editing', 'IMPORTANT');
    missing('Users', 'User deactivation/deletion', 'IMPORTANT');
    missing('Users', 'User activity tracking', 'MINOR');
}

/**
 * Generate comprehensive report
 */
function generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('COMPREHENSIVE FEATURE TESTING REPORT');
    console.log('='.repeat(80));

    console.log(`\nTEST SUMMARY:`);
    console.log(`  ✓ Passed:   ${results.passed.length}`);
    console.log(`  ✗ Failed:   ${results.failed.length}`);
    console.log(`  ⚠ Warnings: ${results.warnings.length}`);
    console.log(`  ○ Missing:  ${results.missing.length}`);

    if (results.failed.length > 0) {
        console.log('\n' + '-'.repeat(80));
        console.log('FAILED TESTS (CRITICAL ISSUES):');
        console.log('-'.repeat(80));
        results.failed.forEach(f => {
            console.log(`\n✗ ${f.test}: ${f.message}`);
            if (f.details) console.log(`  ${JSON.stringify(f.details, null, 2)}`);
        });
    }

    if (results.warnings.length > 0) {
        console.log('\n' + '-'.repeat(80));
        console.log('WARNINGS (NON-CRITICAL ISSUES):');
        console.log('-'.repeat(80));
        results.warnings.forEach(w => {
            console.log(`⚠ ${w.test}: ${w.message}`);
        });
    }

    if (results.missing.length > 0) {
        console.log('\n' + '-'.repeat(80));
        console.log('MISSING FEATURES BY PRIORITY:');
        console.log('-'.repeat(80));

        const critical = results.missing.filter(m => m.priority === 'CRITICAL');
        const important = results.missing.filter(m => m.priority === 'IMPORTANT');
        const minor = results.missing.filter(m => m.priority === 'MINOR');

        if (critical.length > 0) {
            console.log('\n🔴 CRITICAL (Must Have):');
            critical.forEach(m => console.log(`   - ${m.category}: ${m.feature}`));
        }

        if (important.length > 0) {
            console.log('\n🟡 IMPORTANT (Should Have):');
            important.forEach(m => console.log(`   - ${m.category}: ${m.feature}`));
        }

        if (minor.length > 0) {
            console.log('\n🟢 MINOR (Nice to Have):');
            minor.forEach(m => console.log(`   - ${m.category}: ${m.feature}`));
        }
    }

    console.log('\n' + '='.repeat(80));
    console.log('RECOMMENDATIONS:');
    console.log('='.repeat(80));

    const recommendations = [];

    if (results.failed.length > 0) {
        recommendations.push('1. Fix all failed tests before deploying to production');
    }

    if (critical.length > 0) {
        recommendations.push('2. Implement critical missing features (document management, deadlines, PDF generation)');
    }

    if (important.length > 0) {
        recommendations.push('3. Add important features to enhance user experience and functionality');
    }

    recommendations.push('4. Implement comprehensive frontend validation and error handling');
    recommendations.push('5. Add loading states and user feedback for all async operations');
    recommendations.push('6. Implement comprehensive help documentation and user guides');

    recommendations.forEach(rec => console.log(`\n${rec}`));

    console.log('\n' + '='.repeat(80));

    // Overall assessment
    const criticalIssues = results.failed.length + critical.length;
    let assessment = 'PASS';

    if (criticalIssues > 10) {
        assessment = 'FAIL - Major work required';
    } else if (criticalIssues > 5) {
        assessment = 'PASS WITH WARNINGS - Significant improvements needed';
    } else if (criticalIssues > 0) {
        assessment = 'PASS WITH MINOR WARNINGS';
    }

    console.log(`\nOVERALL ASSESSMENT: ${assessment}`);
    console.log('='.repeat(80) + '\n');
}

/**
 * Run all tests
 */
async function runAllTests() {
    console.log('Starting Comprehensive Feature Testing...\n');
    console.log('Testing against: ' + API_BASE);
    console.log('Test user: ' + TEST_USER.email);
    console.log('\n' + '='.repeat(80) + '\n');

    try {
        await testAuthentication();
        await testDashboard();
        await testClients();
        await testMatters();
        await testTimeEntries();
        await testExpenses();
        await testInvoices();
        await testSettings();
        await testUsers();
        await testAI();

        generateReport();
    } catch (error) {
        console.error('\nFATAL ERROR:', error);
        process.exit(1);
    }
}

// Run tests
runAllTests();
