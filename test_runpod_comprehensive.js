// RunPod API Comprehensive Diagnostic Test
// Tests API connectivity, endpoint status, and both sync/async execution modes
// No external dependencies - uses Node.js built-in https module

const https = require('https');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// ANSI color codes for colorful terminal output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',

    // Foreground colors
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',

    // Background colors
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
    bgBlue: '\x1b[44m',
    bgCyan: '\x1b[46m'
};

// Configuration from environment
const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;
const RUNPOD_DEFAULT_ENDPOINT_ID = process.env.RUNPOD_DEFAULT_ENDPOINT_ID;
const TEST_ENDPOINT_ID = '3hm50vlw5z2y5o'; // Hardcoded test endpoint
const API_BASE_HOST = 'api.runpod.ai';

// Test question
const TEST_QUESTION = "What is 2+2? Answer with just the number.";

/**
 * Format and print colored output
 * @param {string} message - Message to print
 * @param {string} color - Color name from colors object
 */
function log(message, color = 'reset') {
    console.log(`${colors[color] || colors.reset}${message}${colors.reset}`);
}

/**
 * Print a section header
 * @param {string} title - Section title
 * @param {number} testNumber - Test number
 */
function logSection(title, testNumber) {
    console.log('\n' + colors.cyan + '═'.repeat(70) + colors.reset);
    log(`${colors.bright}${colors.cyan}Test ${testNumber}: ${title}${colors.reset}`, 'reset');
    console.log(colors.cyan + '═'.repeat(70) + colors.reset);
}

/**
 * Print a success message
 * @param {string} message - Success message
 */
function logSuccess(message) {
    log(`${colors.bgGreen}${colors.black} ✓ ${colors.reset} ${colors.green}${message}${colors.reset}`, 'reset');
}

/**
 * Print an error message
 * @param {string} message - Error message
 */
function logError(message) {
    log(`${colors.bgRed}${colors.white} ✗ ${colors.reset} ${colors.red}${message}${colors.reset}`, 'reset');
}

/**
 * Print an info message
 * @param {string} message - Info message
 */
function logInfo(message) {
    log(`${colors.cyan}ℹ ${message}${colors.reset}`, 'reset');
}

/**
 * Print a warning message
 * @param {string} message - Warning message
 */
function logWarning(message) {
    log(`${colors.yellow}⚠ ${message}${colors.reset}`, 'reset');
}

/**
 * Make an HTTPS request to RunPod API
 * @param {string} method - HTTP method
 * @param {string} path - API path
 * @param {Object|null} data - Request body
 * @param {number} timeout - Request timeout in ms
 * @returns {Promise<Object>} Response object with statusCode, headers, and data
 */
function makeRequest(method, path, data = null, timeout = 30000) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: API_BASE_HOST,
            port: 443,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            timeout: timeout
        };

        // Add authorization header if API key is available
        if (RUNPOD_API_KEY) {
            options.headers['Authorization'] = `Bearer ${RUNPOD_API_KEY}`;
        }

        // Add content length for POST requests
        if (data) {
            const postData = JSON.stringify(data);
            options.headers['Content-Length'] = Buffer.byteLength(postData);
        }

        logInfo(`${method} https://${API_BASE_HOST}${path}`);

        const req = https.request(options, (res) => {
            let body = '';

            res.on('data', chunk => {
                body += chunk;
            });

            res.on('end', () => {
                let parsedData = null;
                let parseError = null;

                // Try to parse JSON response
                if (body) {
                    try {
                        parsedData = JSON.parse(body);
                    } catch (e) {
                        parseError = e.message;
                    }
                }

                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    data: parsedData,
                    rawBody: body,
                    parseError: parseError
                });
            });
        });

        req.on('error', (error) => {
            reject(new Error(`Connection error: ${error.message}`));
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error(`Request timeout after ${timeout}ms`));
        });

        // Write request body if provided
        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

/**
 * Test 1: Validate API Key
 * Tests if the API key is configured and valid by querying GraphQL API
 */
async function testApiKeyValidation() {
    logSection('API Key Validation', 1);

    if (!RUNPOD_API_KEY) {
        logError('RUNPOD_API_KEY not found in .env file');
        logInfo('Please set RUNPOD_API_KEY in your .env file');
        return { success: false, error: 'API key not configured' };
    }

    // Mask the API key for display (show first 10 and last 4 characters)
    const maskedKey = RUNPOD_API_KEY.length > 14
        ? `${RUNPOD_API_KEY.substring(0, 10)}...${RUNPOD_API_KEY.substring(RUNPOD_API_KEY.length - 4)}`
        : RUNPOD_API_KEY.substring(0, 10) + '...';

    logInfo(`API Key: ${maskedKey}`);

    try {
        // Query GraphQL API to validate the key
        const query = {
            query: `query { myself { id } }`
        };

        const response = await makeRequest('POST', '/graphql', query, 10000);

        if (response.parseError) {
            logError(`Invalid JSON response: ${response.parseError}`);
            logInfo(`Raw response: ${response.rawBody.substring(0, 200)}`);
            return { success: false, error: 'Invalid response format' };
        }

        if (response.statusCode === 200 && response.data && response.data.data) {
            logSuccess('API key is valid and authenticated');
            if (response.data.data.myself && response.data.data.myself.id) {
                logInfo(`User ID: ${response.data.data.myself.id}`);
            }
            return { success: true };
        } else if (response.statusCode === 401 || response.statusCode === 403) {
            logError('API key authentication failed (401/403)');
            logInfo('Please verify your RUNPOD_API_KEY in .env file');
            return { success: false, error: 'Authentication failed' };
        } else {
            logError(`Unexpected status code: ${response.statusCode}`);
            if (response.data) {
                logInfo(`Response: ${JSON.stringify(response.data, null, 2)}`);
            }
            return { success: false, error: `Status ${response.statusCode}` };
        }
    } catch (error) {
        logError(`Request failed: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * Test 2: Verify Endpoint Exists
 * Checks if the specified endpoint exists and is accessible
 */
async function testEndpointStatus() {
    logSection('Endpoint Status Check', 2);

    const endpointId = TEST_ENDPOINT_ID || RUNPOD_DEFAULT_ENDPOINT_ID;

    if (!endpointId) {
        logWarning('No endpoint ID specified (using hardcoded test endpoint)');
        return { success: false, error: 'No endpoint ID' };
    }

    logInfo(`Testing endpoint: ${endpointId}`);

    try {
        // Try to get endpoint status via GraphQL
        const query = {
            query: `query {
                myself {
                    endpoints {
                        id
                        name
                        gpuIds
                        workersIdle
                        workersRunning
                    }
                }
            }`
        };

        const response = await makeRequest('POST', '/graphql', query, 10000);

        if (response.statusCode === 200 && response.data && response.data.data) {
            const endpoints = response.data.data.myself?.endpoints || [];

            logSuccess(`Found ${endpoints.length} endpoint(s) in your account`);

            const targetEndpoint = endpoints.find(ep => ep.id === endpointId);

            if (targetEndpoint) {
                logSuccess(`Endpoint ${endpointId} exists and is accessible`);
                logInfo(`Name: ${targetEndpoint.name || 'Unnamed'}`);
                logInfo(`GPUs: ${targetEndpoint.gpuIds || 'None'}`);
                logInfo(`Workers Idle: ${targetEndpoint.workersIdle || 0}`);
                logInfo(`Workers Running: ${targetEndpoint.workersRunning || 0}`);
                return { success: true, endpoint: targetEndpoint };
            } else {
                logWarning(`Endpoint ${endpointId} not found in your account`);

                if (endpoints.length > 0) {
                    logInfo('Available endpoints:');
                    endpoints.forEach(ep => {
                        log(`  - ${ep.id} (${ep.name || 'Unnamed'})`, 'dim');
                    });
                }

                return { success: false, error: 'Endpoint not found', endpoints };
            }
        } else {
            logError(`Failed to query endpoints: Status ${response.statusCode}`);
            return { success: false, error: `Status ${response.statusCode}` };
        }
    } catch (error) {
        logError(`Request failed: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * Test 3: Synchronous Execution
 * Tests the /runsync endpoint with a simple question
 */
async function testSyncExecution() {
    logSection('Synchronous Execution (/runsync)', 3);

    const endpointId = TEST_ENDPOINT_ID || RUNPOD_DEFAULT_ENDPOINT_ID;

    if (!endpointId) {
        logError('No endpoint ID available for testing');
        return { success: false, error: 'No endpoint ID' };
    }

    logInfo(`Question: "${TEST_QUESTION}"`);
    logInfo('Sending to /runsync endpoint...');

    try {
        const requestData = {
            input: {
                prompt: TEST_QUESTION,
                max_new_tokens: 10
            }
        };

        const response = await makeRequest(
            'POST',
            `/v2/${endpointId}/runsync`,
            requestData,
            60000 // 60 second timeout for sync
        );

        if (response.parseError) {
            logError(`Invalid JSON response: ${response.parseError}`);
            logInfo(`Raw response: ${response.rawBody.substring(0, 500)}`);
            return { success: false, error: 'Invalid response format' };
        }

        logInfo(`Status Code: ${response.statusCode}`);

        if (response.statusCode === 200) {
            logSuccess('Synchronous execution succeeded');

            if (response.data) {
                logInfo(`Response structure: ${JSON.stringify(Object.keys(response.data))}`);

                // Display output based on response structure
                if (response.data.output) {
                    log(`\n${colors.bright}${colors.green}Output:${colors.reset}`, 'reset');
                    log(JSON.stringify(response.data.output, null, 2), 'white');
                }

                if (response.data.status) {
                    logInfo(`Status: ${response.data.status}`);
                }

                if (response.data.executionTime) {
                    logInfo(`Execution Time: ${response.data.executionTime}ms`);
                }
            }

            return { success: true, response: response.data };
        } else if (response.statusCode === 404) {
            logError('Endpoint not found (404)');
            logInfo('The endpoint ID may be incorrect or the endpoint may not exist');
            return { success: false, error: 'Endpoint not found' };
        } else if (response.statusCode === 401 || response.statusCode === 403) {
            logError('Authentication failed (401/403)');
            logInfo('API key may be invalid or lack permissions');
            return { success: false, error: 'Authentication failed' };
        } else {
            logError(`Request failed with status ${response.statusCode}`);

            if (response.data) {
                log(`\n${colors.yellow}Response:${colors.reset}`, 'reset');
                log(JSON.stringify(response.data, null, 2), 'dim');
            }

            return { success: false, error: `Status ${response.statusCode}`, data: response.data };
        }
    } catch (error) {
        logError(`Request failed: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * Test 4: Asynchronous Execution
 * Tests the /run endpoint (async) and returns job ID
 */
async function testAsyncExecution() {
    logSection('Asynchronous Execution (/run)', 4);

    const endpointId = TEST_ENDPOINT_ID || RUNPOD_DEFAULT_ENDPOINT_ID;

    if (!endpointId) {
        logError('No endpoint ID available for testing');
        return { success: false, error: 'No endpoint ID' };
    }

    logInfo(`Question: "${TEST_QUESTION}"`);
    logInfo('Sending to /run endpoint (async)...');

    try {
        const requestData = {
            input: {
                prompt: TEST_QUESTION,
                max_new_tokens: 10
            }
        };

        const response = await makeRequest(
            'POST',
            `/v2/${endpointId}/run`,
            requestData,
            30000
        );

        if (response.parseError) {
            logError(`Invalid JSON response: ${response.parseError}`);
            return { success: false, error: 'Invalid response format' };
        }

        logInfo(`Status Code: ${response.statusCode}`);

        if (response.statusCode === 200) {
            logSuccess('Asynchronous job submitted successfully');

            if (response.data) {
                if (response.data.id) {
                    log(`\n${colors.bright}${colors.green}Job ID: ${response.data.id}${colors.reset}`, 'reset');
                }

                if (response.data.status) {
                    logInfo(`Initial Status: ${response.data.status}`);
                }

                logInfo(`Full response: ${JSON.stringify(response.data, null, 2)}`);
            }

            return {
                success: true,
                jobId: response.data?.id,
                status: response.data?.status,
                response: response.data
            };
        } else if (response.statusCode === 404) {
            logError('Endpoint not found (404)');
            return { success: false, error: 'Endpoint not found' };
        } else if (response.statusCode === 401 || response.statusCode === 403) {
            logError('Authentication failed (401/403)');
            return { success: false, error: 'Authentication failed' };
        } else {
            logError(`Request failed with status ${response.statusCode}`);

            if (response.data) {
                log(`\n${colors.yellow}Response:${colors.reset}`, 'reset');
                log(JSON.stringify(response.data, null, 2), 'dim');
            }

            return { success: false, error: `Status ${response.statusCode}` };
        }
    } catch (error) {
        logError(`Request failed: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * Test 5: Check Job Status
 * Polls the job status endpoint to get results
 */
async function testJobStatus(jobId) {
    logSection('Job Status Check', 5);

    const endpointId = TEST_ENDPOINT_ID || RUNPOD_DEFAULT_ENDPOINT_ID;

    if (!endpointId || !jobId) {
        logError('Missing endpoint ID or job ID for status check');
        return { success: false, error: 'Missing parameters' };
    }

    logInfo(`Checking status for job: ${jobId}`);
    logInfo('Polling for completion (max 30 seconds)...');

    const maxAttempts = 15;
    const pollInterval = 2000; // 2 seconds

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            log(`\n${colors.dim}Attempt ${attempt}/${maxAttempts}...${colors.reset}`, 'reset');

            const response = await makeRequest(
                'GET',
                `/v2/${endpointId}/status/${jobId}`,
                null,
                10000
            );

            if (response.statusCode === 200 && response.data) {
                const status = response.data.status;
                logInfo(`Status: ${status}`);

                if (status === 'COMPLETED') {
                    logSuccess('Job completed successfully');

                    if (response.data.output) {
                        log(`\n${colors.bright}${colors.green}Output:${colors.reset}`, 'reset');
                        log(JSON.stringify(response.data.output, null, 2), 'white');
                    }

                    if (response.data.executionTime) {
                        logInfo(`Execution Time: ${response.data.executionTime}ms`);
                    }

                    return { success: true, status: status, response: response.data };
                } else if (status === 'FAILED') {
                    logError('Job failed');

                    if (response.data.error) {
                        log(`Error: ${response.data.error}`, 'red');
                    }

                    return { success: false, error: 'Job failed', response: response.data };
                } else if (status === 'CANCELLED') {
                    logWarning('Job was cancelled');
                    return { success: false, error: 'Job cancelled' };
                } else {
                    // Job still in progress (IN_QUEUE, IN_PROGRESS, etc.)
                    if (attempt < maxAttempts) {
                        await new Promise(resolve => setTimeout(resolve, pollInterval));
                    }
                }
            } else {
                logError(`Status check failed with code ${response.statusCode}`);

                if (attempt === maxAttempts) {
                    return { success: false, error: `Status ${response.statusCode}` };
                }
            }
        } catch (error) {
            logError(`Status check error: ${error.message}`);

            if (attempt === maxAttempts) {
                return { success: false, error: error.message };
            }

            await new Promise(resolve => setTimeout(resolve, pollInterval));
        }
    }

    logWarning('Job did not complete within timeout period');
    return { success: false, error: 'Timeout waiting for completion' };
}

/**
 * Main test runner
 */
async function runComprehensiveDiagnostics() {
    console.log('\n');
    log('╔═══════════════════════════════════════════════════════════════════╗', 'cyan');
    log('║                                                                   ║', 'cyan');
    log('║          RunPod API Comprehensive Diagnostic Test Suite          ║', 'cyan');
    log('║                                                                   ║', 'cyan');
    log('╚═══════════════════════════════════════════════════════════════════╝', 'cyan');
    console.log('\n');

    const results = {
        apiKeyValidation: null,
        endpointStatus: null,
        syncExecution: null,
        asyncExecution: null,
        jobStatus: null
    };

    // Test 1: API Key Validation
    results.apiKeyValidation = await testApiKeyValidation();

    if (!results.apiKeyValidation.success) {
        logWarning('\nStopping tests - API key validation failed');
        printSummary(results);
        process.exit(1);
    }

    // Test 2: Endpoint Status
    results.endpointStatus = await testEndpointStatus();

    // Test 3: Synchronous Execution
    results.syncExecution = await testSyncExecution();

    // Test 4: Asynchronous Execution
    results.asyncExecution = await testAsyncExecution();

    // Test 5: Job Status (only if async execution succeeded)
    if (results.asyncExecution.success && results.asyncExecution.jobId) {
        results.jobStatus = await testJobStatus(results.asyncExecution.jobId);
    } else {
        logWarning('\nSkipping job status check - no job ID from async execution');
    }

    // Print summary
    printSummary(results);

    // Exit with appropriate code
    const allCriticalTestsPassed =
        results.apiKeyValidation.success &&
        (results.syncExecution.success || results.asyncExecution.success);

    process.exit(allCriticalTestsPassed ? 0 : 1);
}

/**
 * Print test summary
 * @param {Object} results - Test results object
 */
function printSummary(results) {
    console.log('\n');
    log('╔═══════════════════════════════════════════════════════════════════╗', 'cyan');
    log('║                         Test Summary                              ║', 'cyan');
    log('╚═══════════════════════════════════════════════════════════════════╝', 'cyan');
    console.log('\n');

    const tests = [
        { name: 'API Key Validation', result: results.apiKeyValidation },
        { name: 'Endpoint Status Check', result: results.endpointStatus },
        { name: 'Sync Execution (/runsync)', result: results.syncExecution },
        { name: 'Async Execution (/run)', result: results.asyncExecution },
        { name: 'Job Status Polling', result: results.jobStatus }
    ];

    let passed = 0;
    let failed = 0;
    let skipped = 0;

    tests.forEach(test => {
        if (test.result === null) {
            log(`  ${colors.dim}⊘ ${test.name} - SKIPPED${colors.reset}`, 'reset');
            skipped++;
        } else if (test.result.success) {
            logSuccess(`${test.name} - PASSED`);
            passed++;
        } else {
            logError(`${test.name} - FAILED`);
            if (test.result.error) {
                log(`    ${colors.dim}Error: ${test.result.error}${colors.reset}`, 'reset');
            }
            failed++;
        }
    });

    console.log('\n' + '─'.repeat(70));
    log(`\n  Total: ${tests.length} tests`, 'white');
    log(`  ${colors.bgGreen}${colors.black} Passed: ${passed} ${colors.reset}`, 'reset');
    log(`  ${colors.bgRed}${colors.white} Failed: ${failed} ${colors.reset}`, 'reset');
    log(`  ${colors.dim}Skipped: ${skipped}${colors.reset}`, 'reset');

    if (failed === 0 && passed > 0) {
        console.log('\n');
        log('🎉 All tests passed! RunPod API is fully operational.', 'green');
    } else if (failed > 0) {
        console.log('\n');
        logWarning('Some tests failed. Review the errors above for diagnostic information.');
    }

    console.log('\n');
}

// Run the diagnostic tests
runComprehensiveDiagnostics().catch(error => {
    console.error('\n');
    logError(`Unexpected error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
});
