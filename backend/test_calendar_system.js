/**
 * Comprehensive Calendar & Deadlines System Test
 * Tests all calendar endpoints and functionality
 */

const https = require('https');
const process = require('process');

const BASE_URL = 'https://localhost:3000';
let authToken = '';
let csrfToken = '';
let testEventId = null;
let testMatterId = null;

// HTTPS agent that ignores self-signed certificates
const agent = new https.Agent({
    rejectUnauthorized: false
});

// Helper function to make API requests
function makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `token=${authToken}; csrfToken=${csrfToken}`,
                'X-CSRF-Token': csrfToken
            },
            agent: agent
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const parsedBody = body ? JSON.parse(body) : {};
                    resolve({ status: res.statusCode, headers: res.headers, body: parsedBody });
                } catch (e) {
                    resolve({ status: res.statusCode, headers: res.headers, body: body });
                }
            });
        });

        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

// Test counter
let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

function logTest(name, passed, message = '') {
    testsRun++;
    if (passed) {
        testsPassed++;
        console.log(`✓ ${name}`);
    } else {
        testsFailed++;
        console.log(`✗ ${name} - ${message}`);
    }
}

async function runTests() {
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║     Calendar & Deadlines System - Comprehensive Test Suite    ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    try {
        // Test 1: Login
        console.log('1. AUTHENTICATION');
        const loginRes = await makeRequest('POST', '/api/v1/auth/login', {
            email: 'admin@example.com',
            password: 'password'
        });

        if (loginRes.status === 200) {
            const cookies = loginRes.headers['set-cookie'];
            if (cookies) {
                cookies.forEach(cookie => {
                    if (cookie.startsWith('token=')) {
                        authToken = cookie.split(';')[0].split('=')[1];
                    } else if (cookie.startsWith('csrfToken=')) {
                        csrfToken = cookie.split(';')[0].split('=')[1];
                    }
                });
            }
            logTest('Login successful', true);
        } else {
            logTest('Login failed', false, `Status: ${loginRes.status}`);
            process.exit(1);
        }

        // Test 2: Get a test matter for event association
        console.log('\n2. SETUP - Get Test Matter');
        const mattersRes = await makeRequest('GET', '/api/v1/matters');
        if (mattersRes.status === 200 && mattersRes.body.length > 0) {
            testMatterId = mattersRes.body[0].id;
            logTest('Retrieved test matter', true);
        } else {
            logTest('Get test matter', false, 'No matters found');
        }

        // Test 3: Create calendar event
        console.log('\n3. CREATE CALENDAR EVENT');
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        const createEventRes = await makeRequest('POST', '/api/v1/calendar/events', {
            event_type: 'court_date',
            title: 'Hearing - Smith vs. Jones',
            description: 'Preliminary hearing at Superior Court',
            matter_id: testMatterId,
            event_date: tomorrowStr,
            event_time: '10:00',
            location: 'Superior Court, Room 301',
            priority: 'high',
            reminder_days: 1
        });

        if (createEventRes.status === 201) {
            testEventId = createEventRes.body.id;
            logTest('Create calendar event', true);
            logTest('Event has ID', !!testEventId);
            logTest('Event has correct title', createEventRes.body.title === 'Hearing - Smith vs. Jones');
            logTest('Event has correct type', createEventRes.body.event_type === 'court_date');
            logTest('Event has correct priority', createEventRes.body.priority === 'high');
        } else {
            logTest('Create calendar event', false, `Status: ${createEventRes.status}, Body: ${JSON.stringify(createEventRes.body)}`);
        }

        // Test 4: Create deadline event
        const deadlineDate = new Date();
        deadlineDate.setDate(deadlineDate.getDate() + 7);
        const deadlineDateStr = deadlineDate.toISOString().split('T')[0];

        const createDeadlineRes = await makeRequest('POST', '/api/v1/calendar/events', {
            event_type: 'filing_deadline',
            title: 'Motion Filing Deadline',
            description: 'Deadline to file motion for summary judgment',
            matter_id: testMatterId,
            event_date: deadlineDateStr,
            priority: 'critical',
            reminder_days: 3
        });

        logTest('Create deadline event', createDeadlineRes.status === 201);

        // Test 5: Create appointment
        const apptDate = new Date();
        apptDate.setDate(apptDate.getDate() + 3);
        const apptDateStr = apptDate.toISOString().split('T')[0];

        const createApptRes = await makeRequest('POST', '/api/v1/calendar/events', {
            event_type: 'appointment',
            title: 'Client Meeting',
            description: 'Review case strategy',
            matter_id: testMatterId,
            event_date: apptDateStr,
            event_time: '14:30',
            location: 'Office Conference Room B',
            priority: 'medium',
            all_day: 0
        });

        logTest('Create appointment event', createApptRes.status === 201);

        // Test 6: Get all calendar events
        console.log('\n4. RETRIEVE CALENDAR EVENTS');
        const getEventsRes = await makeRequest('GET', '/api/v1/calendar/events');

        if (getEventsRes.status === 200) {
            logTest('Get all events', true);
            logTest('Events is array', Array.isArray(getEventsRes.body));
            logTest('Events contains created events', getEventsRes.body.length >= 3);
        } else {
            logTest('Get all events', false, `Status: ${getEventsRes.status}`);
        }

        // Test 7: Get single event
        const getSingleEventRes = await makeRequest('GET', `/api/v1/calendar/events/${testEventId}`);
        logTest('Get single event', getSingleEventRes.status === 200);
        logTest('Single event has correct ID', getSingleEventRes.body.id === testEventId);

        // Test 8: Filter events by type
        const filterByTypeRes = await makeRequest('GET', '/api/v1/calendar/events?event_type=court_date');
        logTest('Filter events by type', filterByTypeRes.status === 200);
        logTest('Filtered events match type', filterByTypeRes.body.every(e => e.event_type === 'court_date'));

        // Test 9: Filter events by matter
        const filterByMatterRes = await makeRequest('GET', `/api/v1/calendar/events?matter_id=${testMatterId}`);
        logTest('Filter events by matter', filterByMatterRes.status === 200);
        logTest('Filtered events match matter', filterByMatterRes.body.every(e => e.matter_id === testMatterId));

        // Test 10: Get upcoming events
        console.log('\n5. UPCOMING DEADLINES');
        const upcomingRes = await makeRequest('GET', '/api/v1/calendar/upcoming?days=30&limit=10');

        if (upcomingRes.status === 200) {
            logTest('Get upcoming deadlines', true);
            logTest('Upcoming events is array', Array.isArray(upcomingRes.body));
            logTest('Upcoming events includes created events', upcomingRes.body.length >= 3);
            logTest('Upcoming events sorted by date', upcomingRes.body.length > 1 ?
                upcomingRes.body[0].event_date <= upcomingRes.body[1].event_date : true);
        } else {
            logTest('Get upcoming deadlines', false, `Status: ${upcomingRes.status}`);
        }

        // Test 11: Get matter-specific events
        console.log('\n6. MATTER-SPECIFIC EVENTS');
        const matterEventsRes = await makeRequest('GET', `/api/v1/matters/${testMatterId}/events`);

        if (matterEventsRes.status === 200) {
            logTest('Get matter events', true);
            logTest('Matter events is array', Array.isArray(matterEventsRes.body));
            logTest('Matter events match matter ID', matterEventsRes.body.every(e => e.matter_id === testMatterId));
        } else {
            logTest('Get matter events', false, `Status: ${matterEventsRes.status}`);
        }

        // Test 12: Update event
        console.log('\n7. UPDATE CALENDAR EVENT');
        const updateEventRes = await makeRequest('PATCH', `/api/v1/calendar/events/${testEventId}`, {
            title: 'Hearing - Smith vs. Jones (UPDATED)',
            location: 'Superior Court, Room 302 (UPDATED)',
            priority: 'critical'
        });

        if (updateEventRes.status === 200) {
            logTest('Update event', true);
            logTest('Updated title persisted', updateEventRes.body.title.includes('UPDATED'));
            logTest('Updated location persisted', updateEventRes.body.location.includes('UPDATED'));
            logTest('Updated priority persisted', updateEventRes.body.priority === 'critical');
        } else {
            logTest('Update event', false, `Status: ${updateEventRes.status}`);
        }

        // Test 13: Mark event as completed
        const completeEventRes = await makeRequest('PATCH', `/api/v1/calendar/events/${testEventId}`, {
            completed: 1
        });
        logTest('Mark event completed', completeEventRes.status === 200);
        logTest('Completed status persisted', completeEventRes.body.completed === 1);

        // Test 14: Input validation
        console.log('\n8. INPUT VALIDATION');

        // Missing required fields
        const invalidRes1 = await makeRequest('POST', '/api/v1/calendar/events', {
            event_type: 'deadline'
            // Missing title and event_date
        });
        logTest('Reject event without required fields', invalidRes1.status === 400);

        // Invalid event type
        const invalidRes2 = await makeRequest('POST', '/api/v1/calendar/events', {
            event_type: 'invalid_type',
            title: 'Test',
            event_date: '2025-01-01'
        });
        logTest('Reject invalid event type', invalidRes2.status === 400);

        // Invalid priority
        const invalidRes3 = await makeRequest('POST', '/api/v1/calendar/events', {
            event_type: 'deadline',
            title: 'Test',
            event_date: '2025-01-01',
            priority: 'super_urgent' // Invalid
        });
        logTest('Reject invalid priority', invalidRes3.status === 400);

        // Test 15: Delete event
        console.log('\n9. DELETE CALENDAR EVENT');
        const deleteEventRes = await makeRequest('DELETE', `/api/v1/calendar/events/${testEventId}`);
        logTest('Delete event', deleteEventRes.status === 200);

        // Verify deletion
        const verifyDeleteRes = await makeRequest('GET', `/api/v1/calendar/events/${testEventId}`);
        logTest('Event no longer exists', verifyDeleteRes.status === 404);

        // Test 16: Security - authentication required
        console.log('\n10. SECURITY CHECKS');

        // Save current tokens
        const savedToken = authToken;
        const savedCsrf = csrfToken;

        // Clear tokens
        authToken = '';
        csrfToken = '';

        const noAuthRes = await makeRequest('GET', '/api/v1/calendar/events');
        logTest('Reject unauthenticated request', noAuthRes.status === 401);

        // Restore tokens
        authToken = savedToken;
        csrfToken = savedCsrf;

    } catch (error) {
        console.error('\n❌ Test suite error:', error);
        testsFailed++;
    }

    // Print summary
    console.log('\n' + '='.repeat(70));
    console.log('TEST SUMMARY');
    console.log('='.repeat(70));
    console.log(`Total Tests:   ${testsRun}`);
    console.log(`Passed:        ${testsPassed} ✓`);
    console.log(`Failed:        ${testsFailed} ✗`);
    console.log(`Success Rate:  ${((testsPassed / testsRun) * 100).toFixed(1)}%`);
    console.log('='.repeat(70));

    if (testsFailed === 0) {
        console.log('\n🎉 ALL TESTS PASSED! Calendar system is working correctly.\n');
        process.exit(0);
    } else {
        console.log('\n⚠️  SOME TESTS FAILED! Review the failures above.\n');
        process.exit(1);
    }
}

// Run tests
runTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
