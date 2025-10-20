// Simple RunPod Endpoint Test
// Tests the actual endpoint execution without GraphQL dependencies

const https = require('https');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;
const ENDPOINT_ID = process.env.RUNPOD_DEFAULT_ENDPOINT_ID || '3hm50vlw5z2y5o';
const API_HOST = 'api.runpod.ai';

// ANSI colors
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    bright: '\x1b[1m',
    dim: '\x1b[2m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(method, path, data = null, timeout = 30000) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: API_HOST,
            port: 443,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${RUNPOD_API_KEY}`
            },
            timeout: timeout
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const parsedData = body ? JSON.parse(body) : null;
                    resolve({
                        statusCode: res.statusCode,
                        data: parsedData,
                        rawBody: body
                    });
                } catch (e) {
                    resolve({
                        statusCode: res.statusCode,
                        data: null,
                        rawBody: body,
                        parseError: e.message
                    });
                }
            });
        });

        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error(`Timeout after ${timeout}ms`));
        });

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

async function runTests() {
    console.log('\n' + colors.cyan + '═'.repeat(70) + colors.reset);
    log('RunPod Endpoint Test Suite', 'bright');
    console.log(colors.cyan + '═'.repeat(70) + colors.reset + '\n');

    log(`API Host: ${API_HOST}`, 'dim');
    log(`Endpoint ID: ${ENDPOINT_ID}`, 'dim');
    log(`API Key: ${RUNPOD_API_KEY.substring(0, 15)}...`, 'dim');
    console.log('');

    // Test 1: Health Check
    log('Test 1: Health Check', 'cyan');
    try {
        const response = await makeRequest('GET', `/v2/${ENDPOINT_ID}/health`);
        if (response.statusCode === 200) {
            log('✓ Health check passed', 'green');
            log(`  Workers ready: ${response.data.workers?.ready || 0}`, 'dim');
            log(`  Workers idle: ${response.data.workers?.idle || 0}`, 'dim');
            log(`  Jobs completed: ${response.data.jobs?.completed || 0}`, 'dim');
        } else {
            log(`✗ Health check failed (${response.statusCode})`, 'red');
        }
    } catch (error) {
        log(`✗ Health check error: ${error.message}`, 'red');
    }

    console.log('');

    // Test 2: Synchronous Execution
    log('Test 2: Synchronous Execution', 'cyan');
    const testQuestion = "What is 2+2? Answer with just the number.";
    log(`  Question: "${testQuestion}"`, 'dim');

    try {
        const response = await makeRequest(
            'POST',
            `/v2/${ENDPOINT_ID}/runsync`,
            {
                input: {
                    prompt: testQuestion,
                    max_new_tokens: 10
                }
            },
            60000
        );

        if (response.statusCode === 200) {
            log('✓ Synchronous execution succeeded', 'green');
            if (response.data.output) {
                log(`  Output: ${JSON.stringify(response.data.output)}`, 'dim');
            }
            if (response.data.executionTime) {
                log(`  Execution time: ${response.data.executionTime}ms`, 'dim');
            }
        } else {
            log(`✗ Sync execution failed (${response.statusCode})`, 'red');
            if (response.data) {
                log(`  ${JSON.stringify(response.data)}`, 'dim');
            }
        }
    } catch (error) {
        log(`✗ Sync execution error: ${error.message}`, 'red');
    }

    console.log('');

    // Test 3: Asynchronous Execution
    log('Test 3: Asynchronous Execution', 'cyan');

    try {
        const response = await makeRequest(
            'POST',
            `/v2/${ENDPOINT_ID}/run`,
            {
                input: {
                    prompt: testQuestion,
                    max_new_tokens: 10
                }
            }
        );

        if (response.statusCode === 200 && response.data.id) {
            log('✓ Async job submitted', 'green');
            log(`  Job ID: ${response.data.id}`, 'dim');

            // Poll for result
            log('  Polling for result...', 'dim');
            const jobId = response.data.id;
            let attempts = 0;
            const maxAttempts = 15;

            while (attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                attempts++;

                const statusResponse = await makeRequest(
                    'GET',
                    `/v2/${ENDPOINT_ID}/status/${jobId}`
                );

                if (statusResponse.statusCode === 200) {
                    const status = statusResponse.data.status;
                    log(`  Status: ${status}`, 'dim');

                    if (status === 'COMPLETED') {
                        log('✓ Job completed successfully', 'green');
                        if (statusResponse.data.output) {
                            log(`  Output: ${JSON.stringify(statusResponse.data.output)}`, 'dim');
                        }
                        break;
                    } else if (status === 'FAILED') {
                        log('✗ Job failed', 'red');
                        break;
                    }
                }
            }

            if (attempts >= maxAttempts) {
                log('⚠ Job did not complete within timeout', 'yellow');
            }
        } else {
            log(`✗ Async execution failed (${response.statusCode})`, 'red');
        }
    } catch (error) {
        log(`✗ Async execution error: ${error.message}`, 'red');
    }

    console.log('\n' + colors.cyan + '═'.repeat(70) + colors.reset + '\n');
}

if (!RUNPOD_API_KEY) {
    log('✗ RUNPOD_API_KEY not found in .env file', 'red');
    process.exit(1);
}

runTests().catch(error => {
    console.error(error);
    process.exit(1);
});
