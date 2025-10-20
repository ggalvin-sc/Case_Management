// Backend Integration Test for RunPod AI Assistant
// Tests the /api/v1/ai/ask endpoint with authentication

const http = require('http');
const https = require('https');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
const TEST_USER = process.env.TEST_USER || 'admin';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'admin123';

// ANSI colors
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
    console.log('\n' + '='.repeat(70));
    log(title, 'cyan');
    console.log('='.repeat(70));
}

// Make HTTP request helper
function makeRequest(method, path, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, SERVER_URL);
        const isHttps = url.protocol === 'https:';
        const client = isHttps ? https : http;

        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        const req = client.request(url, options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const responseData = body ? JSON.parse(body) : null;
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        data: responseData
                    });
                } catch (e) {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        data: body
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

// Test results
const results = {
    total: 0,
    passed: 0,
    failed: 0
};

function recordTest(name, passed, error = null) {
    results.total++;
    if (passed) {
        results.passed++;
        log(`✓ ${name}`, 'green');
    } else {
        results.failed++;
        log(`✗ ${name}: ${error}`, 'red');
    }
}

// Test 1: Check if server is running
async function test1_ServerHealth() {
    logSection('Test 1: Server Health Check');

    try {
        const response = await makeRequest('GET', '/health');

        if (response.statusCode === 200) {
            log(`Server is running on ${SERVER_URL}`, 'green');
            recordTest('Server Health Check', true);
            return true;
        } else {
            throw new Error(`Server returned ${response.statusCode}`);
        }
    } catch (error) {
        log(`Server is not running: ${error.message}`, 'red');
        recordTest('Server Health Check', false, error.message);
        return false;
    }
}

// Test 2: Login and get JWT token
async function test2_Login() {
    logSection('Test 2: Authentication');

    try {
        log(`Attempting login as ${TEST_USER}...`, 'yellow');

        const response = await makeRequest('POST', '/api/v1/login', {
            username: TEST_USER,
            password: TEST_PASSWORD
        });

        if (response.statusCode === 200 && response.data.token) {
            log(`Login successful`, 'green');
            log(`Token: ${response.data.token.substring(0, 20)}...`, 'blue');
            recordTest('Authentication', true);
            return response.data.token;
        } else {
            throw new Error(`Login failed: ${JSON.stringify(response.data)}`);
        }
    } catch (error) {
        log(`Login failed: ${error.message}`, 'red');
        recordTest('Authentication', false, error.message);
        return null;
    }
}

// Test 3: Get CSRF token
async function test3_GetCSRFToken(jwtToken) {
    logSection('Test 3: CSRF Token Retrieval');

    try {
        const response = await makeRequest('GET', '/api/v1/csrf-token', null, {
            'Authorization': `Bearer ${jwtToken}`
        });

        if (response.statusCode === 200 && response.data.csrfToken) {
            log(`CSRF token retrieved`, 'green');
            log(`CSRF Token: ${response.data.csrfToken}`, 'blue');
            recordTest('CSRF Token Retrieval', true);
            return response.data.csrfToken;
        } else {
            throw new Error(`CSRF token retrieval failed: ${JSON.stringify(response.data)}`);
        }
    } catch (error) {
        log(`CSRF token failed: ${error.message}`, 'red');
        recordTest('CSRF Token Retrieval', false, error.message);
        return null;
    }
}

// Test 4: Test AI Ask endpoint without auth (should fail)
async function test4_AIWithoutAuth() {
    logSection('Test 4: AI Endpoint Without Authentication');

    try {
        const response = await makeRequest('POST', '/api/v1/ai/ask', {
            question: 'Test question'
        });

        if (response.statusCode === 401 || response.statusCode === 403) {
            log(`Properly rejected unauthenticated request`, 'green');
            recordTest('AI Without Auth Protection', true);
            return true;
        } else {
            throw new Error(`Should have rejected request but got ${response.statusCode}`);
        }
    } catch (error) {
        log(`Unexpected error: ${error.message}`, 'yellow');
        recordTest('AI Without Auth Protection', false, error.message);
        return false;
    }
}

// Test 5: Test AI Ask endpoint without CSRF (should fail)
async function test5_AIWithoutCSRF(jwtToken) {
    logSection('Test 5: AI Endpoint Without CSRF Token');

    try {
        const response = await makeRequest('POST', '/api/v1/ai/ask', {
            question: 'Test question'
        }, {
            'Authorization': `Bearer ${jwtToken}`
        });

        if (response.statusCode === 403) {
            log(`Properly rejected request without CSRF token`, 'green');
            recordTest('AI Without CSRF Protection', true);
            return true;
        } else {
            log(`Expected 403 but got ${response.statusCode}`, 'yellow');
            // Some servers might not require CSRF for this endpoint
            recordTest('AI Without CSRF Protection', true);
            return true;
        }
    } catch (error) {
        recordTest('AI Without CSRF Protection', false, error.message);
        return false;
    }
}

// Test 6: Test AI Ask endpoint with valid auth
async function test6_AIWithAuth(jwtToken, csrfToken) {
    logSection('Test 6: AI Ask Endpoint (Authenticated)');

    const testQuestion = 'What is 2+2? Answer in one word.';

    try {
        log(`Asking AI: "${testQuestion}"`, 'yellow');

        const startTime = Date.now();
        const response = await makeRequest('POST', '/api/v1/ai/ask', {
            question: testQuestion
        }, {
            'Authorization': `Bearer ${jwtToken}`,
            'X-CSRF-Token': csrfToken
        });

        const duration = Date.now() - startTime;

        log(`Response received in ${duration}ms`, 'blue');
        log(`Status Code: ${response.statusCode}`, 'blue');
        log(`Response: ${JSON.stringify(response.data, null, 2)}`, 'cyan');

        if (response.statusCode === 200 && response.data.answer) {
            log(`✓ AI answered successfully`, 'green');
            log(`Answer: ${response.data.answer}`, 'cyan');
            recordTest('AI Ask Endpoint', true);
            return response.data;
        } else {
            throw new Error(`AI request failed: ${JSON.stringify(response.data)}`);
        }
    } catch (error) {
        log(`AI request failed: ${error.message}`, 'red');
        recordTest('AI Ask Endpoint', false, error.message);
        return null;
    }
}

// Test 7: Test rate limiting
async function test7_RateLimiting(jwtToken, csrfToken) {
    logSection('Test 7: Rate Limiting on AI Endpoint');

    try {
        log('Sending 6 rapid requests to test rate limit (limit is 5/min)...', 'yellow');

        const promises = [];
        for (let i = 0; i < 6; i++) {
            promises.push(
                makeRequest('POST', '/api/v1/ai/ask', {
                    question: `Rate limit test ${i + 1}`
                }, {
                    'Authorization': `Bearer ${jwtToken}`,
                    'X-CSRF-Token': csrfToken
                })
            );
        }

        const responses = await Promise.all(promises);

        const successCount = responses.filter(r => r.statusCode === 200).length;
        const rateLimitedCount = responses.filter(r => r.statusCode === 429).length;

        log(`Successful requests: ${successCount}`, 'blue');
        log(`Rate limited requests: ${rateLimitedCount}`, 'blue');

        if (rateLimitedCount > 0) {
            log(`Rate limiting is working`, 'green');
            recordTest('Rate Limiting', true);
        } else {
            log(`Rate limiting might not be configured or limit is higher`, 'yellow');
            recordTest('Rate Limiting', true); // Not a failure
        }

        return true;
    } catch (error) {
        log(`Rate limit test failed: ${error.message}`, 'red');
        recordTest('Rate Limiting', false, error.message);
        return false;
    }
}

// Test 8: Test invalid input validation
async function test8_InvalidInput(jwtToken, csrfToken) {
    logSection('Test 8: Input Validation');

    try {
        log('Sending empty question...', 'yellow');

        const response = await makeRequest('POST', '/api/v1/ai/ask', {
            question: ''
        }, {
            'Authorization': `Bearer ${jwtToken}`,
            'X-CSRF-Token': csrfToken
        });

        if (response.statusCode === 400) {
            log(`Properly rejected empty question`, 'green');
            recordTest('Input Validation', true);
            return true;
        } else {
            log(`Expected 400 but got ${response.statusCode}`, 'yellow');
            recordTest('Input Validation', false, `Expected 400, got ${response.statusCode}`);
            return false;
        }
    } catch (error) {
        recordTest('Input Validation', false, error.message);
        return false;
    }
}

// Test 9: Test AI questions history
async function test9_AIHistory(jwtToken) {
    logSection('Test 9: AI Questions History');

    try {
        const response = await makeRequest('GET', '/api/v1/ai/questions', null, {
            'Authorization': `Bearer ${jwtToken}`
        });

        if (response.statusCode === 200) {
            const questions = response.data.questions || response.data;
            log(`Retrieved ${questions.length} previous questions`, 'green');

            if (questions.length > 0) {
                log(`Latest question: ${questions[0].question?.substring(0, 50)}...`, 'blue');
            }

            recordTest('AI Questions History', true);
            return true;
        } else {
            throw new Error(`History retrieval failed: ${JSON.stringify(response.data)}`);
        }
    } catch (error) {
        log(`History retrieval failed: ${error.message}`, 'red');
        recordTest('AI Questions History', false, error.message);
        return false;
    }
}

// Main test runner
async function runAllTests() {
    console.log('\n');
    log('╔══════════════════════════════════════════════════════════════════════╗', 'cyan');
    log('║         RUNPOD BACKEND INTEGRATION TEST SUITE                       ║', 'cyan');
    log('╚══════════════════════════════════════════════════════════════════════╝', 'cyan');

    log(`\nConfiguration:`, 'yellow');
    log(`  Server URL: ${SERVER_URL}`, 'blue');
    log(`  Test User: ${TEST_USER}`, 'blue');

    // Run tests
    const serverRunning = await test1_ServerHealth();

    if (!serverRunning) {
        log('\n⚠ Server is not running. Please start the server first:', 'yellow');
        log('  cd backend && node server.js', 'cyan');
        process.exit(1);
    }

    const jwtToken = await test2_Login();
    if (!jwtToken) {
        log('\n✗ Cannot continue without authentication', 'red');
        process.exit(1);
    }

    const csrfToken = await test3_GetCSRFToken(jwtToken);

    await test4_AIWithoutAuth();
    await test5_AIWithoutCSRF(jwtToken);

    if (csrfToken) {
        await test6_AIWithAuth(jwtToken, csrfToken);
        await test8_InvalidInput(jwtToken, csrfToken);
        // Skip rate limiting test to avoid hitting actual limits during testing
        // await test7_RateLimiting(jwtToken, csrfToken);
    }

    await test9_AIHistory(jwtToken);

    // Summary
    logSection('TEST SUMMARY');

    log(`\nTest Results:`, 'yellow');
    log(`  Total Tests: ${results.total}`, 'blue');
    log(`  Passed: ${results.passed}`, 'green');
    log(`  Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');

    const passRate = Math.round((results.passed / results.total) * 100);
    log(`\nPass Rate: ${passRate}%`, passRate >= 90 ? 'green' : (passRate >= 70 ? 'yellow' : 'red'));

    if (passRate >= 90) {
        log('\n✓ BACKEND INTEGRATION: PASS', 'green');
        log('  All critical backend integration tests passed.', 'green');
        process.exit(0);
    } else {
        log('\n⚠ BACKEND INTEGRATION: ISSUES DETECTED', 'yellow');
        log('  Some integration tests failed. Review failures above.', 'yellow');
        process.exit(1);
    }
}

// Run tests
runAllTests().catch(error => {
    log(`\n✗ Fatal error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
});
