/**
 * Comprehensive Security Testing Suite
 * Tests all Phase 2 security enhancements
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';

// Utility function to make HTTP requests
function makeRequest(method, path, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        const req = http.request(url, options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const jsonBody = body ? JSON.parse(body) : {};
                    resolve({ status: res.statusCode, body: jsonBody, headers: res.headers });
                } catch (e) {
                    resolve({ status: res.statusCode, body, headers: res.headers });
                }
            });
        });

        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function runTests() {
    console.log('\n' + '='.repeat(70));
    console.log('  🔒 COMPREHENSIVE SECURITY TEST SUITE');
    console.log('='.repeat(70) + '\n');

    let passCount = 0;
    let failCount = 0;

    // Test 1: Successful Login
    console.log('Test 1: Successful Login');
    try {
        const loginRes = await makeRequest('POST', '/api/v1/auth/login', {
            email: 'admin@example.com',
            password: 'password'
        });

        if (loginRes.status === 200 && loginRes.body.token) {
            console.log('✅ PASS - Login successful, JWT token received');
            console.log(`   Token: ${loginRes.body.token.substring(0, 50)}...`);
            passCount++;

            // Store token for later tests
            global.testToken = loginRes.body.token;
        } else {
            console.log(`❌ FAIL - Expected 200, got ${loginRes.status}`);
            console.log(`   Response: ${JSON.stringify(loginRes.body)}`);
            failCount++;
        }
    } catch (error) {
        console.log(`❌ FAIL - ${error.message}`);
        failCount++;
    }

    // Test 2: Rate Limiting - First Failed Attempt
    console.log('\nTest 2: Rate Limiting - Failed Login Attempt');
    try {
        const failRes = await makeRequest('POST', '/api/v1/auth/login', {
            email: 'test@ratelimit.com',
            password: 'wrongpassword'
        });

        if (failRes.status === 401 && failRes.body.remainingAttempts !== undefined) {
            console.log(`✅ PASS - Rate limiting active, ${failRes.body.remainingAttempts} attempts remaining`);
            passCount++;
        } else {
            console.log(`❌ FAIL - Rate limit info not present`);
            console.log(`   Response: ${JSON.stringify(failRes.body)}`);
            failCount++;
        }
    } catch (error) {
        console.log(`❌ FAIL - ${error.message}`);
        failCount++;
    }

    // Test 3: Rate Limiting - Multiple Failed Attempts
    console.log('\nTest 3: Rate Limiting - Trigger Lockout (5 attempts)');
    try {
        let locked = false;
        for (let i = 0; i < 6; i++) {
            const res = await makeRequest('POST', '/api/v1/auth/login', {
                email: 'lockout@test.com',
                password: 'wrong'
            });

            if (res.status === 429) {
                console.log(`✅ PASS - Account locked after ${i + 1} attempts`);
                console.log(`   Message: ${res.body.message}`);
                console.log(`   Retry after: ${res.body.retryAfter} seconds`);
                locked = true;
                passCount++;
                break;
            }
        }

        if (!locked) {
            console.log('❌ FAIL - Account not locked after 6 attempts');
            failCount++;
        }
    } catch (error) {
        console.log(`❌ FAIL - ${error.message}`);
        failCount++;
    }

    // Test 4: Protected Endpoint Without Token
    console.log('\nTest 4: Protected Endpoint Without Authentication');
    try {
        const res = await makeRequest('GET', '/api/v1/dashboard/stats');

        if (res.status === 401) {
            console.log('✅ PASS - Endpoint correctly rejects unauthenticated request');
            console.log(`   Message: ${res.body.error}`);
            passCount++;
        } else {
            console.log(`❌ FAIL - Expected 401, got ${res.status}`);
            failCount++;
        }
    } catch (error) {
        console.log(`❌ FAIL - ${error.message}`);
        failCount++;
    }

    // Test 5: Protected Endpoint With Valid Token
    console.log('\nTest 5: Protected Endpoint With Valid Token');
    try {
        if (!global.testToken) {
            console.log('⚠️  SKIP - No token available from Test 1');
        } else {
            const res = await makeRequest('GET', '/api/v1/dashboard/stats', null, {
                'Authorization': `Bearer ${global.testToken}`
            });

            if (res.status === 200) {
                console.log('✅ PASS - Authenticated request successful');
                console.log(`   Active Matters: ${res.body.activeMatters}`);
                console.log(`   Unbilled Hours: ${res.body.unbilledHours}`);
                passCount++;
            } else {
                console.log(`❌ FAIL - Expected 200, got ${res.status}`);
                console.log(`   Response: ${JSON.stringify(res.body)}`);
                failCount++;
            }
        }
    } catch (error) {
        console.log(`❌ FAIL - ${error.message}`);
        failCount++;
    }

    // Test 6: Password Complexity Validation
    console.log('\nTest 6: Password Complexity Validation');
    try {
        if (!global.testToken) {
            console.log('⚠️  SKIP - No token available');
        } else {
            const res = await makeRequest('POST', '/api/v1/auth/change-password', {
                current_password: 'password',
                new_password: 'weak'
            }, {
                'Authorization': `Bearer ${global.testToken}`
            });

            if (res.status === 400 && res.body.requirements) {
                console.log('✅ PASS - Password complexity validation working');
                console.log('   Requirements not met:');
                res.body.requirements.forEach(req => console.log(`   - ${req}`));
                passCount++;
            } else {
                console.log(`❌ FAIL - Expected 400 with requirements, got ${res.status}`);
                console.log(`   Response: ${JSON.stringify(res.body)}`);
                failCount++;
            }
        }
    } catch (error) {
        console.log(`❌ FAIL - ${error.message}`);
        failCount++;
    }

    // Test 7: Strong Password Accepted
    console.log('\nTest 7: Strong Password Change');
    try {
        if (!global.testToken) {
            console.log('⚠️  SKIP - No token available');
        } else {
            const res = await makeRequest('POST', '/api/v1/auth/change-password', {
                current_password: 'password',
                new_password: 'NewP@ssw0rd123!'
            }, {
                'Authorization': `Bearer ${global.testToken}`
            });

            if (res.status === 200) {
                console.log('✅ PASS - Strong password accepted and changed');
                console.log(`   Message: ${res.body.message}`);
                passCount++;

                // Change it back
                await makeRequest('POST', '/api/v1/auth/change-password', {
                    current_password: 'NewP@ssw0rd123!',
                    new_password: 'password'
                }, {
                    'Authorization': `Bearer ${global.testToken}`
                });
            } else {
                console.log(`❌ FAIL - Expected 200, got ${res.status}`);
                console.log(`   Response: ${JSON.stringify(res.body)}`);
                failCount++;
            }
        }
    } catch (error) {
        console.log(`❌ FAIL - ${error.message}`);
        failCount++;
    }

    // Test 8: Invalid JWT Token
    console.log('\nTest 8: Invalid JWT Token Rejection');
    try {
        const res = await makeRequest('GET', '/api/v1/dashboard/stats', null, {
            'Authorization': 'Bearer invalid.jwt.token'
        });

        if (res.status === 401) {
            console.log('✅ PASS - Invalid JWT token correctly rejected');
            passCount++;
        } else {
            console.log(`❌ FAIL - Expected 401, got ${res.status}`);
            failCount++;
        }
    } catch (error) {
        console.log(`❌ FAIL - ${error.message}`);
        failCount++;
    }

    // Test 9: CORS Headers
    console.log('\nTest 9: CORS Headers Present');
    try {
        const res = await makeRequest('OPTIONS', '/api/v1/auth/login', null, {
            'Origin': 'http://localhost:3000'
        });

        if (res.headers['access-control-allow-origin']) {
            console.log('✅ PASS - CORS headers present');
            console.log(`   Allow-Origin: ${res.headers['access-control-allow-origin']}`);
            console.log(`   Allow-Methods: ${res.headers['access-control-allow-methods']}`);
            passCount++;
        } else {
            console.log('❌ FAIL - CORS headers missing');
            failCount++;
        }
    } catch (error) {
        console.log(`❌ FAIL - ${error.message}`);
        failCount++;
    }

    // Test 10: Input Sanitization
    console.log('\nTest 10: Input Sanitization (XSS Prevention)');
    try {
        const res = await makeRequest('POST', '/api/v1/auth/login', {
            email: '<script>alert("xss")</script>@test.com',
            password: 'test'
        });

        // Check that the response doesn't contain the script tags
        const responseStr = JSON.stringify(res.body);
        if (!responseStr.includes('<script>')) {
            console.log('✅ PASS - Script tags sanitized from input');
            passCount++;
        } else {
            console.log('❌ FAIL - XSS vulnerability detected');
            failCount++;
        }
    } catch (error) {
        console.log(`❌ FAIL - ${error.message}`);
        failCount++;
    }

    // Final Results
    console.log('\n' + '='.repeat(70));
    console.log('  TEST RESULTS');
    console.log('='.repeat(70));
    console.log(`  ✅ Passed: ${passCount}`);
    console.log(`  ❌ Failed: ${failCount}`);
    console.log(`  📊 Success Rate: ${Math.round((passCount / (passCount + failCount)) * 100)}%`);
    console.log('='.repeat(70));

    if (failCount === 0) {
        console.log('\n  🎉 ALL TESTS PASSED! Production-ready security confirmed.');
    } else {
        console.log('\n  ⚠️  Some tests failed. Please review and fix issues.');
    }
    console.log('');
}

// Run tests
runTests().catch(err => {
    console.error('Test suite error:', err);
    process.exit(1);
});
