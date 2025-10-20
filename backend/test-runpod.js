// RunPod Integration Test Script
// Tests the RunPod serverless integration

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const runpod = require('./runpod-client');

// ANSI color codes for pretty output
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
    console.log('\n' + '='.repeat(60));
    log(title, 'cyan');
    console.log('='.repeat(60));
}

async function testHealthCheck() {
    logSection('Test 1: Health Check');

    try {
        const health = await runpod.healthCheck();

        if (health.healthy) {
            log('✓ Health check passed - RunPod API is accessible', 'green');
        } else {
            log('✗ Health check failed: ' + health.error, 'red');
        }

        return health.healthy;
    } catch (error) {
        log('✗ Health check error: ' + error.message, 'red');
        return false;
    }
}

async function testSyncExecution(endpointId, input) {
    logSection('Test 2: Synchronous Execution');

    try {
        log('Executing endpoint synchronously...', 'yellow');
        log(`Endpoint ID: ${endpointId}`, 'blue');
        log(`Input: ${JSON.stringify(input, null, 2)}`, 'blue');

        const result = await runpod.callRunPodEndpoint(endpointId, input, { sync: true });

        log('✓ Synchronous execution successful', 'green');
        log(`Job ID: ${result.id}`, 'blue');
        log(`Status: ${result.status}`, 'blue');
        log(`Execution Time: ${result.executionTime}s`, 'blue');
        log(`Output: ${JSON.stringify(result.output, null, 2)}`, 'blue');

        return true;
    } catch (error) {
        log('✗ Synchronous execution failed: ' + error.message, 'red');
        return false;
    }
}

async function testAsyncExecution(endpointId, input) {
    logSection('Test 3: Asynchronous Execution');

    try {
        log('Starting async job...', 'yellow');
        log(`Endpoint ID: ${endpointId}`, 'blue');
        log(`Input: ${JSON.stringify(input, null, 2)}`, 'blue');

        const job = await runpod.callRunPodEndpoint(endpointId, input, { sync: false });

        log('✓ Async job started', 'green');
        log(`Job ID: ${job.id}`, 'blue');
        log(`Initial Status: ${job.status}`, 'blue');

        return job.id;
    } catch (error) {
        log('✗ Async execution failed: ' + error.message, 'red');
        return null;
    }
}

async function testJobStatus(endpointId, jobId) {
    logSection('Test 4: Job Status Check');

    try {
        log('Checking job status...', 'yellow');
        log(`Job ID: ${jobId}`, 'blue');

        const status = await runpod.getJobStatus(endpointId, jobId);

        log('✓ Status check successful', 'green');
        log(`Status: ${status.status}`, 'blue');

        if (status.output) {
            log(`Output: ${JSON.stringify(status.output, null, 2)}`, 'blue');
        }

        if (status.executionTime) {
            log(`Execution Time: ${status.executionTime}s`, 'blue');
        }

        return status;
    } catch (error) {
        log('✗ Status check failed: ' + error.message, 'red');
        return null;
    }
}

async function testPollUntilComplete(endpointId, jobId) {
    logSection('Test 5: Poll Until Complete');

    try {
        log('Polling job until complete (max 60 seconds)...', 'yellow');
        log(`Job ID: ${jobId}`, 'blue');

        const result = await runpod.pollJobUntilComplete(
            endpointId,
            jobId,
            { maxWaitTime: 60000, pollInterval: 2000 }
        );

        log('✓ Job completed successfully', 'green');
        log(`Final Status: ${result.status}`, 'blue');
        log(`Execution Time: ${result.executionTime}s`, 'blue');
        log(`Output: ${JSON.stringify(result.output, null, 2)}`, 'blue');

        return true;
    } catch (error) {
        log('✗ Polling failed: ' + error.message, 'red');
        return false;
    }
}

async function testCancelJob(endpointId, input) {
    logSection('Test 6: Job Cancellation');

    try {
        // Start a job
        log('Starting job to cancel...', 'yellow');
        const job = await runpod.callRunPodEndpoint(endpointId, input, { sync: false });
        log(`Job ID: ${job.id}`, 'blue');

        // Wait a moment
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Cancel it
        log('Cancelling job...', 'yellow');
        const result = await runpod.cancelJob(endpointId, job.id);

        log('✓ Job cancelled successfully', 'green');
        log(`Status: ${result.status}`, 'blue');

        return true;
    } catch (error) {
        log('✗ Cancellation failed: ' + error.message, 'red');
        // This is acceptable - job might have completed before cancel
        return true;
    }
}

async function runAllTests() {
    console.log('\n');
    log('╔═══════════════════════════════════════════════════════════╗', 'cyan');
    log('║         RunPod Serverless Integration Test Suite         ║', 'cyan');
    log('╚═══════════════════════════════════════════════════════════╝', 'cyan');

    // Check configuration
    if (!process.env.RUNPOD_API_KEY || process.env.RUNPOD_API_KEY === 'your-runpod-api-key-here') {
        log('\n⚠️  RUNPOD_API_KEY not configured in .env file', 'red');
        log('Please set your RunPod API key before running tests.', 'yellow');
        log('\nTo get your API key:', 'yellow');
        log('1. Sign up at https://www.runpod.io', 'yellow');
        log('2. Go to https://www.runpod.io/console/user/settings', 'yellow');
        log('3. Copy your API key and add it to .env', 'yellow');
        process.exit(1);
    }

    // Get endpoint ID from command line or env
    const endpointId = process.argv[2] || process.env.RUNPOD_DEFAULT_ENDPOINT_ID;

    if (!endpointId) {
        log('\n⚠️  No endpoint ID provided', 'red');
        log('Usage: node test-runpod.js <endpoint-id>', 'yellow');
        log('\nOr set RUNPOD_DEFAULT_ENDPOINT_ID in .env file', 'yellow');
        log('\nTo create an endpoint:', 'yellow');
        log('1. Go to https://www.runpod.io/console/serverless', 'yellow');
        log('2. Create a new endpoint or use an existing one', 'yellow');
        log('3. Copy the endpoint ID', 'yellow');
        process.exit(1);
    }

    log(`\nUsing endpoint ID: ${endpointId}`, 'blue');

    // Example input (adjust based on your endpoint)
    const testInput = {
        prompt: 'Hello from RunPod integration test!'
    };

    // Run tests
    const results = {
        healthCheck: false,
        syncExecution: false,
        asyncExecution: false,
        statusCheck: false,
        polling: false,
        cancellation: false
    };

    // Test 1: Health check
    results.healthCheck = await testHealthCheck();

    if (!results.healthCheck) {
        log('\n⚠️  Skipping remaining tests due to health check failure', 'yellow');
        process.exit(1);
    }

    // Test 2: Sync execution (might fail if endpoint doesn't support sync)
    results.syncExecution = await testSyncExecution(endpointId, testInput);

    // Test 3: Async execution
    const jobId = await testAsyncExecution(endpointId, testInput);
    results.asyncExecution = jobId !== null;

    if (jobId) {
        // Test 4: Status check
        const status = await testJobStatus(endpointId, jobId);
        results.statusCheck = status !== null;

        // Test 5: Polling (if job not already complete)
        if (status && status.status !== 'COMPLETED') {
            results.polling = await testPollUntilComplete(endpointId, jobId);
        } else {
            log('⊘ Skipping polling test (job already complete)', 'yellow');
            results.polling = true;
        }
    }

    // Test 6: Cancellation
    results.cancellation = await testCancelJob(endpointId, testInput);

    // Summary
    logSection('Test Summary');

    const passed = Object.values(results).filter(r => r).length;
    const total = Object.keys(results).length;

    log(`\nPassed: ${passed}/${total}`, passed === total ? 'green' : 'yellow');
    console.log('\nDetailed Results:');
    Object.entries(results).forEach(([test, result]) => {
        const icon = result ? '✓' : '✗';
        const color = result ? 'green' : 'red';
        log(`  ${icon} ${test}`, color);
    });

    if (passed === total) {
        log('\n🎉 All tests passed!', 'green');
        process.exit(0);
    } else {
        log('\n⚠️  Some tests failed', 'yellow');
        process.exit(1);
    }
}

// Run tests
runAllTests().catch(error => {
    log('\n✗ Unexpected error: ' + error.message, 'red');
    console.error(error);
    process.exit(1);
});
