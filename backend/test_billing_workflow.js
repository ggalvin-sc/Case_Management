// TEST BILLING WORKFLOW FOR TEST_CASE DATA
// Tests the complete unbilled → invoice → finalize workflow

const https = require('https');

let authCookies = '';
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

        if (authCookies) {
            options.headers['Cookie'] = authCookies;
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

        req.on('error', reject);

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

async function testBillingWorkflow() {
    console.log('='.repeat(80));
    console.log('BILLING WORKFLOW TEST - TEST_CASE DATA');
    console.log('='.repeat(80));
    console.log();

    try {
        // Step 1: Login
        console.log('[1] LOGIN');
        const login = await makeRequest('POST', '/api/v1/auth/login', {
            email: 'admin@example.com',
            password: 'password'
        });

        if (login.status !== 200) {
            console.log('✗ Login failed');
            return;
        }
        console.log('✓ Login successful\n');

        // Step 2: Get TEST_CASE client
        console.log('[2] FIND TEST_CASE CLIENT');
        const clients = await makeRequest('GET', '/api/v1/clients');
        const testClient = clients.body.find(c => c.name === 'TEST_CASE Client');

        if (!testClient) {
            console.log('✗ TEST_CASE Client not found');
            return;
        }
        console.log(`✓ Found TEST_CASE Client - ID: ${testClient.id}`);
        console.log(`  Name: ${testClient.name}`);
        console.log(`  Email: ${testClient.email}`);
        console.log(`  Phone: ${testClient.phone}\n`);

        // Step 3: Get TEST_CASE matter
        console.log('[3] FIND TEST_CASE MATTER');
        const matters = await makeRequest('GET', '/api/v1/matters');
        const testMatter = matters.body.find(m => m.name === 'TEST_CASE Matter' && m.client_id === testClient.id);

        if (!testMatter) {
            console.log('✗ TEST_CASE Matter not found');
            return;
        }
        console.log(`✓ Found TEST_CASE Matter - ID: ${testMatter.id}`);
        console.log(`  Name: ${testMatter.name}`);
        console.log(`  Status: ${testMatter.status}`);
        console.log(`  Billing Type: ${testMatter.billing_type}`);
        console.log(`  Hourly Rate: $${testMatter.hourly_rate}\n`);

        // Step 4: Get unbilled time entries for this matter
        console.log('[4] GET UNBILLED TIME ENTRIES');
        const unbilledTime = await makeRequest('GET', '/api/v1/time-entries/unbilled');
        const testTimeEntries = unbilledTime.body.filter(e => e.matter_id === testMatter.id);

        console.log(`✓ Found ${testTimeEntries.length} unbilled time entries:`);
        let totalTimeAmount = 0;
        testTimeEntries.forEach((entry, idx) => {
            const hours = (entry.duration_minutes / 60).toFixed(2);
            console.log(`  ${idx + 1}. ${entry.entry_date}: ${hours}hrs @ $${entry.hourly_rate}/hr = $${entry.amount}`);
            console.log(`     ${entry.description}`);
            totalTimeAmount += entry.amount;
        });
        console.log(`  Total Time Amount: $${totalTimeAmount.toFixed(2)}\n`);

        // Step 5: Get unbilled expenses for this matter
        console.log('[5] GET UNBILLED EXPENSES');
        const unbilledExpenses = await makeRequest('GET', '/api/v1/expenses/unbilled');

        if (unbilledExpenses.status === 200) {
            const testExpenses = unbilledExpenses.body.filter(e => e.matter_id === testMatter.id);

            console.log(`✓ Found ${testExpenses.length} unbilled expenses:`);
            let totalExpenseAmount = 0;
            testExpenses.forEach((expense, idx) => {
                const billedAmount = expense.billed_amount || expense.amount;
                console.log(`  ${idx + 1}. ${expense.expense_date}: ${expense.category} - $${expense.amount}`);
                console.log(`     ${expense.description}`);
                console.log(`     Vendor: ${expense.vendor}, Billed: $${billedAmount}`);
                totalExpenseAmount += billedAmount;
            });
            console.log(`  Total Expense Amount: $${totalExpenseAmount.toFixed(2)}\n`);
        } else {
            console.log(`⚠ Could not retrieve unbilled expenses (Status: ${unbilledExpenses.status})`);
            console.log(`  This may be a missing endpoint\n`);
        }

        // Step 6: Get billing preview
        console.log('[6] GET BILLING PREVIEW');
        const preview = await makeRequest('GET', `/api/v1/matters/${testMatter.id}/billing-preview`);

        if (preview.status === 200) {
            console.log('✓ Billing preview retrieved:');
            console.log(`  Time Entries: ${preview.body.timeEntries?.length || 0}`);
            console.log(`  Expenses: ${preview.body.expenses?.length || 0}`);
            console.log(`  Total Time: $${preview.body.totalTime || 0}`);
            console.log(`  Total Expenses: $${preview.body.totalExpenses || 0}`);
            console.log(`  Grand Total: $${preview.body.grandTotal || 0}\n`);
        } else {
            console.log(`⚠ Could not get billing preview (Status: ${preview.status})\n`);
        }

        // Step 7: Create invoice
        console.log('[7] CREATE INVOICE FROM UNBILLED ITEMS');
        const today = new Date().toISOString().split('T')[0];
        const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const invoiceData = {
            matter_id: testMatter.id,
            client_id: testClient.id,
            issue_date: today,
            due_date: dueDate,
            notes: 'Invoice for TEST_CASE Matter - Comprehensive Test',
            payment_terms: 'Payment due within 30 days',
            time_entry_ids: testTimeEntries.map(e => e.id)
        };

        const createInvoice = await makeRequest('POST', '/api/v1/invoices', invoiceData);

        if (createInvoice.status === 201 && createInvoice.body) {
            console.log('✓ Invoice created successfully:');
            console.log(`  Invoice ID: ${createInvoice.body.id}`);
            console.log(`  Invoice Number: ${createInvoice.body.invoice_number}`);
            console.log(`  Status: ${createInvoice.body.status}`);
            console.log(`  Issue Date: ${createInvoice.body.issue_date}`);
            console.log(`  Due Date: ${createInvoice.body.due_date}`);
            console.log(`  Subtotal: $${createInvoice.body.subtotal}`);
            console.log(`  Total: $${createInvoice.body.total_amount}\n`);

            const invoiceId = createInvoice.body.id;

            // Step 8: Get invoice details
            console.log('[8] GET INVOICE DETAILS');
            const invoiceDetails = await makeRequest('GET', `/api/v1/invoices/${invoiceId}`);

            if (invoiceDetails.status === 200) {
                console.log('✓ Invoice details retrieved:');
                console.log(`  Line Items: ${invoiceDetails.body.line_items?.length || 0}`);
                console.log(`  Client: ${invoiceDetails.body.client_name}`);
                console.log(`  Matter: ${invoiceDetails.body.matter_name}\n`);

                if (invoiceDetails.body.line_items) {
                    console.log('  Line Items:');
                    invoiceDetails.body.line_items.forEach((item, idx) => {
                        console.log(`    ${idx + 1}. ${item.item_type}: ${item.description}`);
                        console.log(`       Qty: ${item.quantity}, Rate: $${item.rate}, Amount: $${item.amount}`);
                    });
                    console.log();
                }
            } else {
                console.log(`⚠ Could not get invoice details (Status: ${invoiceDetails.status})\n`);
            }

            // Step 9: Finalize invoice
            console.log('[9] FINALIZE INVOICE');
            const finalize = await makeRequest('PATCH', `/api/v1/invoices/${invoiceId}/finalize`);

            if (finalize.status === 200) {
                console.log('✓ Invoice finalized successfully');
                console.log(`  Status: ${finalize.body.status}`);
                console.log(`  Finalized At: ${finalize.body.finalized_at}\n`);
            } else {
                console.log(`⚠ Could not finalize invoice (Status: ${finalize.status})\n`);
            }

            // Step 10: Verify time entries are now billed
            console.log('[10] VERIFY TIME ENTRIES MARKED AS BILLED');
            const unbilledAfter = await makeRequest('GET', '/api/v1/time-entries/unbilled');
            const testTimeEntriesAfter = unbilledAfter.body.filter(e => e.matter_id === testMatter.id);

            console.log(`✓ Unbilled time entries after invoicing: ${testTimeEntriesAfter.length}`);
            console.log(`  (Should be 0 if all entries were billed)\n`);

            // Step 11: Test invoice status transitions
            console.log('[11] TEST INVOICE STATUS TRANSITIONS');

            // Try to mark as sent
            const markSent = await makeRequest('PATCH', `/api/v1/invoices/${invoiceId}/send`);
            if (markSent.status === 200) {
                console.log('✓ Invoice marked as sent');
                console.log(`  Status: ${markSent.body.status}`);
                console.log(`  Sent At: ${markSent.body.sent_at}\n`);
            } else {
                console.log(`⚠ Could not mark invoice as sent (Status: ${markSent.status})\n`);
            }

            // Try to record payment
            const recordPayment = await makeRequest('PATCH', `/api/v1/invoices/${invoiceId}/payment`, {
                amount: createInvoice.body.total_amount,
                payment_date: today
            });

            if (recordPayment.status === 200) {
                console.log('✓ Payment recorded');
                console.log(`  Status: ${recordPayment.body.status}`);
                console.log(`  Paid Amount: $${recordPayment.body.paid_amount}`);
                console.log(`  Paid At: ${recordPayment.body.paid_at}\n`);
            } else {
                console.log(`⚠ Could not record payment (Status: ${recordPayment.status})\n`);
            }

        } else {
            console.log(`✗ Invoice creation failed (Status: ${createInvoice.status})`);
            console.log(`  Response: ${JSON.stringify(createInvoice.body)}\n`);
        }

        console.log('='.repeat(80));
        console.log('BILLING WORKFLOW TEST COMPLETED');
        console.log('='.repeat(80));

    } catch (error) {
        console.error('\n✗ ERROR:', error.message);
        console.error(error.stack);
    }
}

testBillingWorkflow();
