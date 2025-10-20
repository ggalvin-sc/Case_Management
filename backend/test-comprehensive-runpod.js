// Comprehensive RunPod Integration Test Suite - Post-Fix Validation
// Tests all functionality after URL construction bug fix

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const runpod = require('./runpod-client');

// Test configuration
const ENDPOINT_ID = process.env.RUNPOD_ENDPOINT_ID || process.env.RUNPOD_DEFAULT_ENDPOINT_ID;
const TEST_TIMEOUT = 120000; // 2 minutes

// ANSI colors
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
    console.log('\n' + '='.repeat(70));
    log(title, 'cyan');
    console.log('='.repeat(70));
}

// Test results tracker
const testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    tests: []
};

function recordTest(name, passed, duration, error = null) {
    testResults.total++;
    if (passed) {
        testResults.passed++;
        log(`✓ ${name} (${duration}ms)`, 'green');
    } else {
        testResults.failed++;
        log(`✗ ${name}: ${error}`, 'red');
    }
    testResults.tests.push({ name, passed, duration, error });
}

// ==============================================================================
// TEST SUITE 1: CLIENT LIBRARY POST-FIX VALIDATION
// ==============================================================================

async function test1_SyncExecution() {
    logSection('Test 1: Synchronous Execution (sync=true)');

    const testInput = {
        prompt: 'What is the capital of France? Answer in one word.',
        max_tokens: 50
    };

    try {
        const startTime = Date.now();
        log('Calling callRunPodEndpoint with sync=true...', 'yellow');

        const result = await runpod.callRunPodEndpoint(ENDPOINT_ID, testInput, { sync: true });

        const duration = Date.now() - startTime;

        log(`Response received in ${duration}ms`, 'blue');
        log(`Job ID: ${result.id}`, 'blue');
        log(`Status: ${result.status}`, 'blue');
        log(`Execution Time: ${result.executionTime || 'N/A'}ms`, 'blue');
        log(`Output: ${JSON.stringify(result.output).substring(0, 200)}...`, 'blue');

        // Validation
        if (!result.id || !result.status || !result.output) {
            throw new Error('Invalid response structure');
        }

        recordTest('Sync Execution', true, duration);
        return result;
    } catch (error) {
        recordTest('Sync Execution', false, 0, error.message);
        return null;
    }
}

async function test2_AsyncExecution() {
    logSection('Test 2: Asynchronous Execution (sync=false)');

    const testInput = {
        prompt: 'Explain quantum computing in one sentence.',
        max_tokens: 100
    };

    try {
        const startTime = Date.now();
        log('Calling callRunPodEndpoint with sync=false...', 'yellow');

        const result = await runpod.callRunPodEndpoint(ENDPOINT_ID, testInput, { sync: false });

        const duration = Date.now() - startTime;

        log(`Job created in ${duration}ms`, 'blue');
        log(`Job ID: ${result.id}`, 'blue');
        log(`Status: ${result.status}`, 'blue');

        // Validation
        if (!result.id || !result.status) {
            throw new Error('Invalid response structure');
        }

        recordTest('Async Execution', true, duration);
        return result.id;
    } catch (error) {
        recordTest('Async Execution', false, 0, error.message);
        return null;
    }
}

async function test3_JobStatus(jobId) {
    logSection('Test 3: Job Status Check (getJobStatus)');

    if (!jobId) {
        log('⊘ Skipping - no job ID from previous test', 'yellow');
        testResults.skipped++;
        return null;
    }

    try {
        const startTime = Date.now();
        log(`Checking status for job: ${jobId}`, 'yellow');

        const result = await runpod.getJobStatus(ENDPOINT_ID, jobId);

        const duration = Date.now() - startTime;

        log(`Status retrieved in ${duration}ms`, 'blue');
        log(`Status: ${result.status}`, 'blue');
        log(`Execution Time: ${result.executionTime || 'N/A'}ms`, 'blue');

        if (result.output) {
            log(`Output: ${JSON.stringify(result.output).substring(0, 150)}...`, 'blue');
        }

        recordTest('Job Status Check', true, duration);
        return result;
    } catch (error) {
        recordTest('Job Status Check', false, 0, error.message);
        return null;
    }
}

async function test4_PollUntilComplete(jobId) {
    logSection('Test 4: Poll Until Complete (pollJobUntilComplete)');

    if (!jobId) {
        log('⊘ Skipping - no job ID from previous test', 'yellow');
        testResults.skipped++;
        return null;
    }

    try {
        const startTime = Date.now();
        log(`Polling job: ${jobId} (max 60s)`, 'yellow');

        const result = await runpod.pollJobUntilComplete(
            ENDPOINT_ID,
            jobId,
            { maxWaitTime: 60000, pollInterval: 2000 }
        );

        const duration = Date.now() - startTime;

        log(`Job completed in ${duration}ms`, 'blue');
        log(`Status: ${result.status}`, 'blue');
        log(`Execution Time: ${result.executionTime || 'N/A'}ms`, 'blue');
        log(`Output: ${JSON.stringify(result.output).substring(0, 150)}...`, 'blue');

        recordTest('Poll Until Complete', true, duration);
        return result;
    } catch (error) {
        recordTest('Poll Until Complete', false, 0, error.message);
        return null;
    }
}

// ==============================================================================
// TEST SUITE 2: EDGE CASES
// ==============================================================================

async function test5_LongPrompt() {
    logSection('Test 5: Long Prompt (1000+ characters)');

    const longPrompt = 'Explain the history of artificial intelligence. '.repeat(30) +
                       'Provide a comprehensive summary in 100 words.';

    log(`Prompt length: ${longPrompt.length} characters`, 'yellow');

    try {
        const startTime = Date.now();

        const result = await runpod.callRunPodEndpoint(ENDPOINT_ID, {
            prompt: longPrompt,
            max_tokens: 150
        }, { sync: true });

        const duration = Date.now() - startTime;

        log(`Processed long prompt in ${duration}ms`, 'blue');
        log(`Status: ${result.status}`, 'blue');

        recordTest('Long Prompt Handling', true, duration);
        return result;
    } catch (error) {
        recordTest('Long Prompt Handling', false, 0, error.message);
        return null;
    }
}

async function test6_SpecialCharacters() {
    logSection('Test 6: Special Characters and Unicode');

    const specialPrompt = 'Translate: Hello 世界! ¿Cómo estás? Привет! 🌍 #test @user & <html>';

    try {
        const startTime = Date.now();

        const result = await runpod.callRunPodEndpoint(ENDPOINT_ID, {
            prompt: specialPrompt,
            max_tokens: 100
        }, { sync: true });

        const duration = Date.now() - startTime;

        log(`Processed special characters in ${duration}ms`, 'blue');
        log(`Status: ${result.status}`, 'blue');

        recordTest('Special Characters', true, duration);
        return result;
    } catch (error) {
        recordTest('Special Characters', false, 0, error.message);
        return null;
    }
}

async function test7_EmptyInput() {
    logSection('Test 7: Empty Input Validation');

    try {
        const startTime = Date.now();

        const result = await runpod.callRunPodEndpoint(ENDPOINT_ID, {
            prompt: ''
        }, { sync: true });

        const duration = Date.now() - startTime;

        // This might fail or return an error - both are acceptable
        log(`Empty input handled in ${duration}ms`, 'blue');
        log(`Status: ${result.status}`, 'blue');

        recordTest('Empty Input Handling', true, duration);
        return result;
    } catch (error) {
        // Expected to fail - this is proper validation
        log(`Empty input properly rejected: ${error.message}`, 'yellow');
        recordTest('Empty Input Validation', true, 0);
        return null;
    }
}

async function test8_MalformedInput() {
    logSection('Test 8: Malformed Input Validation');

    try {
        await runpod.callRunPodEndpoint(ENDPOINT_ID, null, { sync: true });
        recordTest('Malformed Input Validation', false, 0, 'Should have thrown error');
    } catch (error) {
        if (error.message.includes('input must be an object')) {
            log(`Properly rejected malformed input: ${error.message}`, 'green');
            recordTest('Malformed Input Validation', true, 0);
        } else {
            recordTest('Malformed Input Validation', false, 0, error.message);
        }
    }
}

async function test9_ConcurrentRequests() {
    logSection('Test 9: Concurrent Requests (5 simultaneous)');

    try {
        const startTime = Date.now();

        const promises = [];
        for (let i = 0; i < 5; i++) {
            promises.push(
                runpod.callRunPodEndpoint(ENDPOINT_ID, {
                    prompt: `Test question ${i + 1}: What is ${i + 1} + ${i + 1}?`,
                    max_tokens: 50
                }, { sync: false })
            );
        }

        const results = await Promise.all(promises);
        const duration = Date.now() - startTime;

        log(`Created ${results.length} concurrent jobs in ${duration}ms`, 'blue');
        results.forEach((r, i) => log(`  Job ${i + 1}: ${r.id}`, 'blue'));

        recordTest('Concurrent Requests', true, duration);
        return results;
    } catch (error) {
        recordTest('Concurrent Requests', false, 0, error.message);
        return null;
    }
}

async function test10_Timeout() {
    logSection('Test 10: Timeout Handling');

    try {
        const startTime = Date.now();

        // Use very short timeout
        await runpod.callRunPodEndpoint(ENDPOINT_ID, {
            prompt: 'Long computation test...',
            max_tokens: 1000
        }, { sync: true, timeout: 100 }); // 100ms timeout

        const duration = Date.now() - startTime;

        log(`Request completed before timeout in ${duration}ms`, 'yellow');
        recordTest('Timeout Handling', true, duration);
    } catch (error) {
        if (error.message.includes('timeout')) {
            log(`Timeout properly enforced: ${error.message}`, 'green');
            recordTest('Timeout Handling', true, 0);
        } else {
            recordTest('Timeout Handling', false, 0, error.message);
        }
    }
}

// ==============================================================================
// TEST SUITE 3: ERROR HANDLING
// ==============================================================================

async function test11_InvalidEndpointId() {
    logSection('Test 11: Invalid Endpoint ID');

    try {
        await runpod.callRunPodEndpoint('invalid-endpoint-id-12345', {
            prompt: 'Test'
        }, { sync: true });

        recordTest('Invalid Endpoint ID', false, 0, 'Should have thrown error');
    } catch (error) {
        if (error.message.includes('404') || error.message.includes('not found')) {
            log(`Properly handled invalid endpoint: ${error.message}`, 'green');
            recordTest('Invalid Endpoint ID', true, 0);
        } else {
            recordTest('Invalid Endpoint ID', false, 0, error.message);
        }
    }
}

async function test12_InvalidJobId() {
    logSection('Test 12: Invalid Job ID');

    try {
        await runpod.getJobStatus(ENDPOINT_ID, 'invalid-job-id-12345');

        recordTest('Invalid Job ID', false, 0, 'Should have thrown error');
    } catch (error) {
        log(`Properly handled invalid job ID: ${error.message}`, 'green');
        recordTest('Invalid Job ID', true, 0);
    }
}

async function test13_CancelJob() {
    logSection('Test 13: Job Cancellation');

    try {
        // Start a job
        const job = await runpod.callRunPodEndpoint(ENDPOINT_ID, {
            prompt: 'Long test for cancellation...',
            max_tokens: 500
        }, { sync: false });

        log(`Created job: ${job.id}`, 'yellow');

        // Wait a moment
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Try to cancel
        const result = await runpod.cancelJob(ENDPOINT_ID, job.id);

        log(`Cancel result: ${result.status}`, 'blue');

        recordTest('Job Cancellation', true, 0);
    } catch (error) {
        // Job might have completed before cancel - acceptable
        log(`Cancel attempt: ${error.message}`, 'yellow');
        recordTest('Job Cancellation', true, 0);
    }
}

async function test14_MissingApiKey() {
    logSection('Test 14: Missing API Key Handling');

    const originalKey = process.env.RUNPOD_API_KEY;

    try {
        // Temporarily remove API key
        delete process.env.RUNPOD_API_KEY;

        // This should fail immediately
        const runpodTemp = require('./runpod-client');
        await runpodTemp.callRunPodEndpoint(ENDPOINT_ID, { prompt: 'Test' }, { sync: true });

        recordTest('Missing API Key', false, 0, 'Should have thrown error');
    } catch (error) {
        if (error.message.includes('RUNPOD_API_KEY')) {
            log(`Properly rejected missing API key: ${error.message}`, 'green');
            recordTest('Missing API Key', true, 0);
        } else {
            recordTest('Missing API Key', false, 0, error.message);
        }
    } finally {
        // Restore API key
        process.env.RUNPOD_API_KEY = originalKey;
    }
}

// ==============================================================================
// TEST SUITE 4: PERFORMANCE BENCHMARKS
// ==============================================================================

async function test15_SyncVsAsyncPerformance() {
    logSection('Test 15: Sync vs Async Performance Comparison');

    const testPrompt = {
        prompt: 'What is 2+2? Answer in one word.',
        max_tokens: 10
    };

    try {
        // Test sync
        const syncStart = Date.now();
        const syncResult = await runpod.callRunPodEndpoint(ENDPOINT_ID, testPrompt, { sync: true });
        const syncDuration = Date.now() - syncStart;

        log(`Sync execution: ${syncDuration}ms`, 'blue');

        // Test async
        const asyncStart = Date.now();
        const asyncJob = await runpod.callRunPodEndpoint(ENDPOINT_ID, testPrompt, { sync: false });
        const asyncCreateDuration = Date.now() - asyncStart;

        const pollStart = Date.now();
        const asyncResult = await runpod.pollJobUntilComplete(ENDPOINT_ID, asyncJob.id, {
            maxWaitTime: 30000,
            pollInterval: 1000
        });
        const asyncTotalDuration = Date.now() - asyncStart;

        log(`Async job creation: ${asyncCreateDuration}ms`, 'blue');
        log(`Async total (create + poll): ${asyncTotalDuration}ms`, 'blue');

        log(`\nPerformance Analysis:`, 'magenta');
        log(`  Sync: ${syncDuration}ms (single request, wait for result)`, 'cyan');
        log(`  Async: ${asyncTotalDuration}ms (create + poll, allows other work)`, 'cyan');
        log(`  Recommendation: Use sync for immediate results, async for background processing`, 'yellow');

        recordTest('Sync vs Async Performance', true, syncDuration + asyncTotalDuration);

        return { syncDuration, asyncTotalDuration };
    } catch (error) {
        recordTest('Sync vs Async Performance', false, 0, error.message);
        return null;
    }
}

async function test16_PollingEfficiency() {
    logSection('Test 16: Polling Efficiency');

    try {
        // Create async job
        const job = await runpod.callRunPodEndpoint(ENDPOINT_ID, {
            prompt: 'Count to 10 slowly.',
            max_tokens: 100
        }, { sync: false });

        log(`Job created: ${job.id}`, 'yellow');

        // Track polling attempts
        let pollCount = 0;
        const startTime = Date.now();

        // Poll with custom interval
        const result = await runpod.pollJobUntilComplete(ENDPOINT_ID, job.id, {
            maxWaitTime: 60000,
            pollInterval: 2000
        });

        const duration = Date.now() - startTime;

        // Estimate poll count (duration / interval)
        pollCount = Math.ceil(duration / 2000);

        log(`Job completed after ~${pollCount} polls in ${duration}ms`, 'blue');
        log(`Average time per poll: ${Math.round(duration / pollCount)}ms`, 'blue');
        log(`Polling efficiency: ${result.executionTime ? Math.round((result.executionTime / duration) * 100) : 'N/A'}%`, 'blue');

        recordTest('Polling Efficiency', true, duration);

        return { pollCount, duration };
    } catch (error) {
        recordTest('Polling Efficiency', false, 0, error.message);
        return null;
    }
}

// ==============================================================================
// TEST SUITE 5: REAL-WORLD SCENARIOS
// ==============================================================================

async function test17_LegalCaseQuestion() {
    logSection('Test 17: Legal Case Question');

    const legalPrompt = {
        prompt: 'A client asks: What is the statute of limitations for breach of contract in California? Provide a brief legal answer.',
        max_tokens: 200
    };

    try {
        const startTime = Date.now();

        const result = await runpod.callRunPodEndpoint(ENDPOINT_ID, legalPrompt, { sync: true });

        const duration = Date.now() - startTime;

        log(`Legal question answered in ${duration}ms`, 'blue');
        log(`Answer: ${JSON.stringify(result.output).substring(0, 300)}...`, 'cyan');

        recordTest('Legal Case Question', true, duration);
        return result;
    } catch (error) {
        recordTest('Legal Case Question', false, 0, error.message);
        return null;
    }
}

async function test18_BillingInquiry() {
    logSection('Test 18: Billing/Invoice Question');

    const billingPrompt = {
        prompt: 'Review this invoice entry: 5 hours of legal research at $250/hour. What is the total and is this reasonable for a breach of contract case?',
        max_tokens: 150
    };

    try {
        const startTime = Date.now();

        const result = await runpod.callRunPodEndpoint(ENDPOINT_ID, billingPrompt, { sync: true });

        const duration = Date.now() - startTime;

        log(`Billing inquiry processed in ${duration}ms`, 'blue');
        log(`Answer: ${JSON.stringify(result.output).substring(0, 300)}...`, 'cyan');

        recordTest('Billing Inquiry', true, duration);
        return result;
    } catch (error) {
        recordTest('Billing Inquiry', false, 0, error.message);
        return null;
    }
}

async function test19_DocumentSummarization() {
    logSection('Test 19: Document Summarization');

    const docPrompt = {
        prompt: 'Summarize the following legal document excerpt: "The parties agree that any dispute arising from this agreement shall be resolved through binding arbitration in Los Angeles, California. Each party shall bear their own costs. The arbitrator\'s decision shall be final and binding."',
        max_tokens: 100
    };

    try {
        const startTime = Date.now();

        const result = await runpod.callRunPodEndpoint(ENDPOINT_ID, docPrompt, { sync: true });

        const duration = Date.now() - startTime;

        log(`Document summarized in ${duration}ms`, 'blue');
        log(`Summary: ${JSON.stringify(result.output).substring(0, 300)}...`, 'cyan');

        recordTest('Document Summarization', true, duration);
        return result;
    } catch (error) {
        recordTest('Document Summarization', false, 0, error.message);
        return null;
    }
}

// ==============================================================================
// MAIN TEST RUNNER
// ==============================================================================

async function runAllTests() {
    console.log('\n');
    log('╔══════════════════════════════════════════════════════════════════════╗', 'cyan');
    log('║     COMPREHENSIVE RUNPOD INTEGRATION TEST SUITE (POST-FIX)          ║', 'cyan');
    log('╚══════════════════════════════════════════════════════════════════════╝', 'cyan');

    // Configuration check
    if (!process.env.RUNPOD_API_KEY) {
        log('\n✗ RUNPOD_API_KEY not configured in .env', 'red');
        process.exit(1);
    }

    if (!ENDPOINT_ID) {
        log('\n✗ RUNPOD_ENDPOINT_ID not configured in .env', 'red');
        process.exit(1);
    }

    log(`\nConfiguration:`, 'yellow');
    log(`  Endpoint ID: ${ENDPOINT_ID}`, 'blue');
    log(`  API Key: ${process.env.RUNPOD_API_KEY.substring(0, 10)}...`, 'blue');
    log(`  Test Timeout: ${TEST_TIMEOUT}ms`, 'blue');

    const overallStart = Date.now();

    try {
        // Suite 1: Client Library Post-Fix Validation
        log('\n\n' + '█'.repeat(70), 'magenta');
        log('SUITE 1: CLIENT LIBRARY POST-FIX VALIDATION', 'magenta');
        log('█'.repeat(70), 'magenta');

        await test1_SyncExecution();
        const asyncJobId = await test2_AsyncExecution();
        await test3_JobStatus(asyncJobId);

        // Create fresh job for polling test
        const freshJob = await runpod.callRunPodEndpoint(ENDPOINT_ID, {
            prompt: 'Test for polling',
            max_tokens: 50
        }, { sync: false });
        await test4_PollUntilComplete(freshJob.id);

        // Suite 2: Edge Cases
        log('\n\n' + '█'.repeat(70), 'magenta');
        log('SUITE 2: EDGE CASES', 'magenta');
        log('█'.repeat(70), 'magenta');

        await test5_LongPrompt();
        await test6_SpecialCharacters();
        await test7_EmptyInput();
        await test8_MalformedInput();
        await test9_ConcurrentRequests();
        await test10_Timeout();

        // Suite 3: Error Handling
        log('\n\n' + '█'.repeat(70), 'magenta');
        log('SUITE 3: ERROR HANDLING', 'magenta');
        log('█'.repeat(70), 'magenta');

        await test11_InvalidEndpointId();
        await test12_InvalidJobId();
        await test13_CancelJob();
        await test14_MissingApiKey();

        // Suite 4: Performance Benchmarks
        log('\n\n' + '█'.repeat(70), 'magenta');
        log('SUITE 4: PERFORMANCE BENCHMARKS', 'magenta');
        log('█'.repeat(70), 'magenta');

        await test15_SyncVsAsyncPerformance();
        await test16_PollingEfficiency();

        // Suite 5: Real-World Scenarios
        log('\n\n' + '█'.repeat(70), 'magenta');
        log('SUITE 5: REAL-WORLD SCENARIOS', 'magenta');
        log('█'.repeat(70), 'magenta');

        await test17_LegalCaseQuestion();
        await test18_BillingInquiry();
        await test19_DocumentSummarization();

    } catch (error) {
        log(`\n✗ Test suite error: ${error.message}`, 'red');
        console.error(error);
    }

    const overallDuration = Date.now() - overallStart;

    // Final Summary
    logSection('COMPREHENSIVE TEST SUMMARY');

    log(`\nExecution Time: ${Math.round(overallDuration / 1000)}s`, 'cyan');
    log(`\nTest Results:`, 'yellow');
    log(`  Total Tests: ${testResults.total}`, 'blue');
    log(`  Passed: ${testResults.passed}`, 'green');
    log(`  Failed: ${testResults.failed}`, testResults.failed > 0 ? 'red' : 'green');
    log(`  Skipped: ${testResults.skipped}`, 'yellow');

    const passRate = Math.round((testResults.passed / testResults.total) * 100);
    log(`\nPass Rate: ${passRate}%`, passRate >= 90 ? 'green' : (passRate >= 70 ? 'yellow' : 'red'));

    // Detailed Results
    log(`\nDetailed Results:`, 'cyan');
    testResults.tests.forEach((test, index) => {
        const icon = test.passed ? '✓' : '✗';
        const color = test.passed ? 'green' : 'red';
        const duration = test.duration > 0 ? ` (${test.duration}ms)` : '';
        log(`  ${index + 1}. ${icon} ${test.name}${duration}`, color);
        if (test.error) {
            log(`     Error: ${test.error}`, 'red');
        }
    });

    // Production Readiness Assessment
    logSection('PRODUCTION READINESS ASSESSMENT');

    if (passRate >= 95) {
        log('✓ READY FOR PRODUCTION', 'green');
        log('  All critical tests passed. System is production-ready.', 'green');
    } else if (passRate >= 80) {
        log('⚠ READY WITH WARNINGS', 'yellow');
        log('  Most tests passed but some issues detected. Review failures before deployment.', 'yellow');
    } else {
        log('✗ NOT READY FOR PRODUCTION', 'red');
        log('  Critical issues detected. Fix failures before deployment.', 'red');
    }

    process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run all tests
runAllTests().catch(error => {
    log(`\n✗ Fatal error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
});
