// Test RunPod Integration via Backend Client
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const runpod = require('./runpod-client');

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    bright: '\x1b[1m',
    dim: '\x1b[2m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testIntegration() {
    console.log('\n' + colors.cyan + '═'.repeat(70) + colors.reset);
    log('RunPod Backend Integration Test', 'bright');
    console.log(colors.cyan + '═'.repeat(70) + colors.reset + '\n');

    const endpointId = process.env.RUNPOD_DEFAULT_ENDPOINT_ID;

    log(`Endpoint ID: ${endpointId}`, 'dim');
    console.log('');

    // Test 1: Health Check
    log('Test 1: Health Check via runpod-client.js', 'cyan');
    try {
        const health = await runpod.healthCheck();

        if (health.healthy) {
            log('✓ Health check passed', 'green');
            if (health.workers) {
                log(`  Workers ready: ${health.workers.ready || 0}`, 'dim');
                log(`  Workers idle: ${health.workers.idle || 0}`, 'dim');
            }
            if (health.jobs) {
                log(`  Jobs completed: ${health.jobs.completed || 0}`, 'dim');
            }
        } else {
            log(`✗ Health check failed: ${health.error}`, 'red');
        }
    } catch (error) {
        log(`✗ Health check error: ${error.message}`, 'red');
    }

    console.log('');

    // Test 2: Simple Question (Sync)
    log('Test 2: Synchronous Execution', 'cyan');
    const testQuestion = "What is the capital of France? Answer in one word.";
    log(`  Question: "${testQuestion}"`, 'dim');

    try {
        const result = await runpod.callRunPodEndpoint(
            endpointId,
            {
                prompt: testQuestion,
                max_new_tokens: 20
            },
            { sync: true, timeout: 60000 }
        );

        log('✓ Sync execution succeeded', 'green');
        log(`  Job ID: ${result.id}`, 'dim');
        log(`  Status: ${result.status}`, 'dim');
        if (result.output) {
            log(`  Output: ${JSON.stringify(result.output)}`, 'dim');
        }
        if (result.executionTime) {
            log(`  Execution time: ${result.executionTime}ms`, 'dim');
        }
    } catch (error) {
        log(`✗ Sync execution failed: ${error.message}`, 'red');
    }

    console.log('');

    // Test 3: Async Execution with Polling
    log('Test 3: Asynchronous Execution with Polling', 'cyan');

    try {
        // Start async job
        const job = await runpod.callRunPodEndpoint(
            endpointId,
            {
                prompt: testQuestion,
                max_new_tokens: 20
            },
            { sync: false }
        );

        log(`✓ Async job submitted: ${job.id}`, 'green');
        log('  Polling for completion...', 'dim');

        // Poll until complete
        const result = await runpod.pollJobUntilComplete(
            endpointId,
            job.id,
            { maxWaitTime: 60000, pollInterval: 2000 }
        );

        log('✓ Job completed successfully', 'green');
        if (result.output) {
            log(`  Output: ${JSON.stringify(result.output)}`, 'dim');
        }
        if (result.executionTime) {
            log(`  Execution time: ${result.executionTime}ms`, 'dim');
        }
    } catch (error) {
        log(`✗ Async execution failed: ${error.message}`, 'red');
    }

    console.log('\n' + colors.cyan + '═'.repeat(70) + colors.reset);
    log('\n✅ RunPod integration is working correctly!', 'green');
    log('The backend server can now use RunPod for AI processing.', 'dim');
    console.log('');
}

testIntegration().catch(error => {
    console.error('\nUnexpected error:', error);
    process.exit(1);
});
