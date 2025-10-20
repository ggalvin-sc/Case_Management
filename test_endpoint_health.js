/**
 * RunPod Endpoint Health Check and Test Script
 *
 * Tests RunPod endpoint health and sends a simple test question
 * to verify the LLM is working correctly.
 *
 * Usage: node test_endpoint_health.js
 */

const https = require('https');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Configuration
const ENDPOINT_ID = '3hm50vlw5z2y5o';
const TEST_QUESTION = 'What is 2+2?';
const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;
const API_BASE = 'api.runpod.io';

// ANSI color codes for output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
};

/**
 * Log a colored message to console
 *
 * @param {string} message - Message to log
 * @param {string} color - Color name from colors object
 */
function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Print a section header
 *
 * @param {string} title - Section title
 */
function logSection(title) {
    console.log('\n' + '='.repeat(60));
    log(title, 'cyan');
    console.log('='.repeat(60));
}

/**
 * Make an HTTPS request to RunPod API
 *
 * @param {string} method - HTTP method (GET, POST)
 * @param {string} path - API path
 * @param {Object|null} data - Request body data
 * @returns {Promise<Object>} Response data
 */
function makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: API_BASE,
            port: 443,
            path: path,
            method: method,
            headers: {
                'Authorization': `Bearer ${RUNPOD_API_KEY}`,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let body = '';

            res.on('data', chunk => {
                body += chunk;
            });

            res.on('end', () => {
                try {
                    const responseData = body ? JSON.parse(body) : {};
                    resolve({
                        statusCode: res.statusCode,
                        data: responseData
                    });
                } catch (e) {
                    reject(new Error(`Failed to parse JSON response: ${e.message}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(new Error(`Connection error: ${error.message}`));
        });

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

/**
 * Check the health status of the RunPod endpoint
 *
 * @returns {Promise<boolean>} True if healthy, false otherwise
 */
async function checkHealth() {
    logSection('Step 1: Health Check');

    log(`Checking endpoint: ${ENDPOINT_ID}`, 'blue');
    log(`URL: https://${API_BASE}/v2/${ENDPOINT_ID}/health`, 'blue');

    try {
        const response = await makeRequest('GET', `/v2/${ENDPOINT_ID}/health`);

        log(`\nStatus Code: ${response.statusCode}`, 'yellow');
        log(`Response: ${JSON.stringify(response.data, null, 2)}`, 'yellow');

        if (response.statusCode === 200) {
            log('\n✓ Health check PASSED - Endpoint is healthy', 'green');

            // Display health details if available
            if (response.data.jobs) {
                log(`\nEndpoint Status:`, 'cyan');
                log(`  - Queued jobs: ${response.data.jobs.queued || 0}`, 'blue');
                log(`  - In progress: ${response.data.jobs.inProgress || 0}`, 'blue');
                log(`  - Completed: ${response.data.jobs.completed || 0}`, 'blue');
                log(`  - Failed: ${response.data.jobs.failed || 0}`, 'blue');
            }

            if (response.data.workers) {
                log(`  - Active workers: ${response.data.workers.running || 0}`, 'blue');
                log(`  - Idle workers: ${response.data.workers.idle || 0}`, 'blue');
            }

            return true;
        } else if (response.statusCode === 404) {
            log('\n⚠️  Health endpoint not available (404)', 'yellow');
            log('This endpoint may not support the /health route.', 'yellow');
            log('Will proceed with test question anyway...', 'yellow');
            return true; // Continue despite missing health endpoint
        } else {
            log('\n✗ Health check FAILED - Unexpected status code', 'red');
            return false;
        }
    } catch (error) {
        log(`\n✗ Health check FAILED: ${error.message}`, 'red');
        return false;
    }
}

/**
 * Send a test question to the endpoint asynchronously
 *
 * @returns {Promise<string|null>} Job ID if successful, null otherwise
 */
async function sendTestQuestion() {
    logSection('Step 2: Send Test Question');

    log(`Question: "${TEST_QUESTION}"`, 'blue');
    log(`URL: https://${API_BASE}/v2/${ENDPOINT_ID}/run`, 'blue');

    const requestData = {
        input: {
            prompt: TEST_QUESTION,
            max_new_tokens: 100,
            temperature: 0.7
        }
    };

    log(`\nRequest payload:`, 'yellow');
    log(JSON.stringify(requestData, null, 2), 'yellow');

    try {
        const response = await makeRequest('POST', `/v2/${ENDPOINT_ID}/run`, requestData);

        log(`\nStatus Code: ${response.statusCode}`, 'yellow');
        log(`Response: ${JSON.stringify(response.data, null, 2)}`, 'yellow');

        if (response.statusCode === 200 && response.data.id) {
            log(`\n✓ Job submitted successfully`, 'green');
            log(`Job ID: ${response.data.id}`, 'cyan');
            log(`Status: ${response.data.status || 'IN_QUEUE'}`, 'cyan');
            return response.data.id;
        } else {
            log('\n✗ Failed to submit job', 'red');
            return null;
        }
    } catch (error) {
        log(`\n✗ Failed to send test question: ${error.message}`, 'red');
        return null;
    }
}

/**
 * Poll job status until complete or timeout
 *
 * @param {string} jobId - Job ID to poll
 * @param {number} maxAttempts - Maximum polling attempts
 * @param {number} interval - Polling interval in milliseconds
 * @returns {Promise<Object|null>} Job result if successful, null otherwise
 */
async function pollJobStatus(jobId, maxAttempts = 30, interval = 2000) {
    logSection('Step 3: Poll Job Status');

    log(`Job ID: ${jobId}`, 'blue');
    log(`Max attempts: ${maxAttempts}`, 'blue');
    log(`Poll interval: ${interval}ms`, 'blue');

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            log(`\nAttempt ${attempt}/${maxAttempts}...`, 'yellow');

            const response = await makeRequest('GET', `/v2/${ENDPOINT_ID}/status/${jobId}`);

            const status = response.data.status;
            log(`Status: ${status}`, 'cyan');

            if (status === 'COMPLETED') {
                log('\n✓ Job COMPLETED successfully!', 'green');
                log(`\nExecution time: ${response.data.executionTime || 'N/A'}s`, 'cyan');
                log(`Delay time: ${response.data.delayTime || 'N/A'}s`, 'cyan');

                if (response.data.output) {
                    log(`\nOutput:`, 'magenta');
                    log(JSON.stringify(response.data.output, null, 2), 'magenta');
                }

                return response.data;
            } else if (status === 'FAILED') {
                log('\n✗ Job FAILED', 'red');
                if (response.data.error) {
                    log(`Error: ${JSON.stringify(response.data.error, null, 2)}`, 'red');
                }
                return null;
            } else if (status === 'CANCELLED') {
                log('\n✗ Job was CANCELLED', 'red');
                return null;
            } else {
                // Still in progress (IN_QUEUE or IN_PROGRESS)
                log(`Job is ${status}, waiting...`, 'yellow');

                // Wait before next poll
                await new Promise(resolve => setTimeout(resolve, interval));
            }
        } catch (error) {
            log(`\n✗ Error polling status: ${error.message}`, 'red');

            // Continue polling on error
            if (attempt < maxAttempts) {
                log(`Retrying in ${interval}ms...`, 'yellow');
                await new Promise(resolve => setTimeout(resolve, interval));
            }
        }
    }

    log('\n✗ Polling timeout - job did not complete in time', 'red');
    return null;
}

/**
 * Main execution flow
 */
async function main() {
    console.log('\n');
    log('╔═══════════════════════════════════════════════════════════╗', 'cyan');
    log('║      RunPod Endpoint Health & Test Question Script       ║', 'cyan');
    log('╚═══════════════════════════════════════════════════════════╝', 'cyan');

    // Validate API key
    if (!RUNPOD_API_KEY) {
        log('\n✗ ERROR: RUNPOD_API_KEY not found in .env file', 'red');
        log('\nPlease set RUNPOD_API_KEY in your .env file:', 'yellow');
        log('  RUNPOD_API_KEY=your-api-key-here', 'yellow');
        process.exit(1);
    }

    log(`\nAPI Key: ${RUNPOD_API_KEY.substring(0, 10)}...`, 'blue');
    log(`Endpoint ID: ${ENDPOINT_ID}`, 'blue');

    // Step 1: Health check
    const isHealthy = await checkHealth();

    if (!isHealthy) {
        log('\n⚠️  Endpoint is not healthy, stopping here.', 'yellow');
        log('\nPossible issues:', 'yellow');
        log('  - Endpoint ID may be incorrect', 'yellow');
        log('  - Endpoint may not be deployed', 'yellow');
        log('  - Endpoint may be warming up', 'yellow');
        process.exit(1);
    }

    // Step 2: Send test question
    const jobId = await sendTestQuestion();

    if (!jobId) {
        log('\n⚠️  Failed to submit test question, stopping here.', 'yellow');
        log('\nTroubleshooting tips:', 'cyan');
        log('  1. Verify the endpoint ID is correct', 'yellow');
        log('  2. Check if the endpoint is deployed and active', 'yellow');
        log('  3. Visit https://www.runpod.io/console/serverless to view your endpoints', 'yellow');
        log('  4. Make sure the endpoint supports text generation (LLM)', 'yellow');
        log('\nTo list your endpoints, run:', 'cyan');
        log('  node scripts/fetch-runpod-endpoints.js', 'yellow');
        process.exit(1);
    }

    // Step 3: Poll for results
    const result = await pollJobStatus(jobId);

    // Final summary
    logSection('Summary');

    if (result && result.status === 'COMPLETED') {
        log('✓ All tests passed!', 'green');
        log('\nThe endpoint is healthy and responding to LLM requests.', 'green');

        if (result.output) {
            log('\n--- LLM Response ---', 'cyan');

            // Try to extract text from common output formats
            let outputText = '';
            if (typeof result.output === 'string') {
                outputText = result.output;
            } else if (result.output.text) {
                outputText = result.output.text;
            } else if (result.output.response) {
                outputText = result.output.response;
            } else if (result.output.generated_text) {
                outputText = result.output.generated_text;
            } else {
                outputText = JSON.stringify(result.output, null, 2);
            }

            log(outputText, 'magenta');
            log('--- End Response ---', 'cyan');
        }

        process.exit(0);
    } else {
        log('✗ Tests failed or incomplete', 'red');
        log('\nThe endpoint may need configuration or troubleshooting.', 'yellow');
        process.exit(1);
    }
}

// Run the main function
main().catch(error => {
    log(`\n✗ Unexpected error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
});
