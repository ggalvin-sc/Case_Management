// RunPod Integration Examples
// Demonstrates common usage patterns for RunPod serverless endpoints

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const runpod = require('./runpod-client');

/**
 * Example 1: Simple Synchronous Execution
 * Best for quick tasks that complete in < 30 seconds
 */
async function example1_syncExecution() {
    console.log('\n=== Example 1: Synchronous Execution ===\n');

    const endpointId = 'your-endpoint-id';
    const input = {
        prompt: 'Generate a summary of the meeting notes',
        max_length: 100
    };

    try {
        const result = await runpod.callRunPodEndpoint(endpointId, input, { sync: true });

        console.log('Job completed!');
        console.log('Output:', result.output);
        console.log('Execution time:', result.executionTime, 'seconds');
    } catch (error) {
        console.error('Error:', error.message);
    }
}

/**
 * Example 2: Asynchronous Execution with Manual Status Checks
 * Best for long-running tasks where you want control over polling
 */
async function example2_asyncWithManualPolling() {
    console.log('\n=== Example 2: Async with Manual Polling ===\n');

    const endpointId = 'your-endpoint-id';
    const input = {
        task: 'Process large dataset',
        data: [/* ... */]
    };

    try {
        // Start the job
        console.log('Starting async job...');
        const job = await runpod.callRunPodEndpoint(endpointId, input, { sync: false });
        console.log('Job ID:', job.id);

        // Poll manually every 5 seconds
        let attempts = 0;
        const maxAttempts = 20; // Max 100 seconds

        while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

            const status = await runpod.getJobStatus(endpointId, job.id);
            console.log(`Attempt ${attempts + 1}: Status = ${status.status}`);

            if (status.status === 'COMPLETED') {
                console.log('Job completed!');
                console.log('Output:', status.output);
                return;
            }

            if (status.status === 'FAILED') {
                console.error('Job failed');
                return;
            }

            attempts++;
        }

        console.warn('Job still running after max attempts');
    } catch (error) {
        console.error('Error:', error.message);
    }
}

/**
 * Example 3: Automatic Polling with pollJobUntilComplete
 * Best for when you want automatic status checking
 */
async function example3_asyncWithAutoPolling() {
    console.log('\n=== Example 3: Async with Auto Polling ===\n');

    const endpointId = 'your-endpoint-id';
    const input = {
        task: 'Generate report'
    };

    try {
        // Start the job
        console.log('Starting async job...');
        const job = await runpod.callRunPodEndpoint(endpointId, input, { sync: false });
        console.log('Job ID:', job.id);

        // Automatically poll until complete (max 5 minutes)
        console.log('Waiting for completion...');
        const result = await runpod.pollJobUntilComplete(
            endpointId,
            job.id,
            {
                maxWaitTime: 300000,  // 5 minutes
                pollInterval: 2000     // Check every 2 seconds
            }
        );

        console.log('Job completed!');
        console.log('Output:', result.output);
        console.log('Execution time:', result.executionTime, 'seconds');
    } catch (error) {
        console.error('Error:', error.message);
    }
}

/**
 * Example 4: Batch Processing
 * Process multiple inputs concurrently
 */
async function example4_batchProcessing() {
    console.log('\n=== Example 4: Batch Processing ===\n');

    const endpointId = 'your-endpoint-id';
    const inputs = [
        { prompt: 'Summarize document 1' },
        { prompt: 'Summarize document 2' },
        { prompt: 'Summarize document 3' }
    ];

    try {
        // Start all jobs concurrently
        console.log('Starting batch jobs...');
        const jobs = await Promise.all(
            inputs.map(input =>
                runpod.callRunPodEndpoint(endpointId, input, { sync: false })
            )
        );

        console.log(`Started ${jobs.length} jobs`);
        jobs.forEach((job, i) => {
            console.log(`  Job ${i + 1}: ${job.id}`);
        });

        // Poll all jobs concurrently
        console.log('\nWaiting for all jobs to complete...');
        const results = await Promise.all(
            jobs.map(job =>
                runpod.pollJobUntilComplete(endpointId, job.id, { maxWaitTime: 300000 })
            )
        );

        console.log('\nAll jobs completed!');
        results.forEach((result, i) => {
            console.log(`\nJob ${i + 1} result:`, result.output);
        });
    } catch (error) {
        console.error('Error:', error.message);
    }
}

/**
 * Example 5: Error Handling and Retries
 * Robust error handling with exponential backoff
 */
async function example5_errorHandlingWithRetry() {
    console.log('\n=== Example 5: Error Handling with Retry ===\n');

    const endpointId = 'your-endpoint-id';
    const input = { prompt: 'Process this' };

    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
        try {
            console.log(`Attempt ${attempt + 1}...`);

            const result = await runpod.callRunPodEndpoint(endpointId, input, { sync: true });

            console.log('Success!');
            console.log('Output:', result.output);
            return;
        } catch (error) {
            console.error(`Attempt ${attempt + 1} failed:`, error.message);

            attempt++;

            if (attempt < maxRetries) {
                // Exponential backoff: 1s, 2s, 4s
                const delay = Math.pow(2, attempt) * 1000;
                console.log(`Retrying in ${delay / 1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    console.error('All retry attempts failed');
}

/**
 * Example 6: Cancelling Long-Running Jobs
 * Cancel jobs that are taking too long or no longer needed
 */
async function example6_jobCancellation() {
    console.log('\n=== Example 6: Job Cancellation ===\n');

    const endpointId = 'your-endpoint-id';
    const input = { task: 'Long running task' };

    try {
        // Start a job
        console.log('Starting job...');
        const job = await runpod.callRunPodEndpoint(endpointId, input, { sync: false });
        console.log('Job ID:', job.id);

        // Simulate user deciding to cancel after 5 seconds
        await new Promise(resolve => setTimeout(resolve, 5000));

        console.log('User requested cancellation...');
        const result = await runpod.cancelJob(endpointId, job.id);

        console.log('Job cancelled:', result.status);
    } catch (error) {
        console.error('Error:', error.message);
    }
}

/**
 * Example 7: Fallback Strategy
 * Try sync first, fallback to async if timeout
 */
async function example7_fallbackStrategy() {
    console.log('\n=== Example 7: Fallback Strategy ===\n');

    const endpointId = 'your-endpoint-id';
    const input = { prompt: 'Process this' };

    try {
        // Try synchronous execution first
        console.log('Attempting synchronous execution...');

        const result = await runpod.callRunPodEndpoint(
            endpointId,
            input,
            { sync: true, timeout: 10000 }  // 10 second timeout
        );

        console.log('Sync execution succeeded!');
        console.log('Output:', result.output);
    } catch (error) {
        if (error.message.includes('timeout')) {
            // Fallback to async execution
            console.log('Sync timeout, falling back to async execution...');

            const job = await runpod.callRunPodEndpoint(endpointId, input, { sync: false });
            console.log('Async job started:', job.id);

            const result = await runpod.pollJobUntilComplete(endpointId, job.id);
            console.log('Async execution completed!');
            console.log('Output:', result.output);
        } else {
            throw error;
        }
    }
}

/**
 * Example 8: Integration with Case Management System
 * Using RunPod for legal document analysis
 */
async function example8_legalDocumentAnalysis() {
    console.log('\n=== Example 8: Legal Document Analysis ===\n');

    const endpointId = 'your-document-analysis-endpoint';

    // Example: Analyze a contract for a case
    const documentText = `
        This Agreement is made and entered into as of...
        [Full contract text here]
    `;

    const input = {
        task: 'contract_analysis',
        document: documentText,
        analysis_type: 'risk_assessment'
    };

    try {
        console.log('Analyzing legal document...');

        const result = await runpod.callRunPodEndpoint(endpointId, input, { sync: false });
        console.log('Analysis job started:', result.id);

        const finalResult = await runpod.pollJobUntilComplete(
            endpointId,
            result.id,
            { maxWaitTime: 180000 }  // 3 minutes max
        );

        console.log('\nAnalysis Complete:');
        console.log('Risk Score:', finalResult.output.risk_score);
        console.log('Key Issues:', finalResult.output.issues);
        console.log('Recommendations:', finalResult.output.recommendations);

        // Store results in database
        // await db.run('INSERT INTO document_analysis (matter_id, analysis) VALUES (?, ?)', [...]);
    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Main function to run examples
async function main() {
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║           RunPod Integration Usage Examples              ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');

    // Check configuration
    if (!process.env.RUNPOD_API_KEY || process.env.RUNPOD_API_KEY === 'your-runpod-api-key-here') {
        console.error('\n⚠️  Please configure RUNPOD_API_KEY in .env file');
        process.exit(1);
    }

    console.log('\nNote: These are example patterns. Replace endpoint IDs and inputs with your actual values.\n');
    console.log('Uncomment the examples you want to run below:\n');

    // Uncomment to run specific examples:
    // await example1_syncExecution();
    // await example2_asyncWithManualPolling();
    // await example3_asyncWithAutoPolling();
    // await example4_batchProcessing();
    // await example5_errorHandlingWithRetry();
    // await example6_jobCancellation();
    // await example7_fallbackStrategy();
    // await example8_legalDocumentAnalysis();

    console.log('To run an example, uncomment it in the main() function.');
}

// Export examples for use in other modules
module.exports = {
    example1_syncExecution,
    example2_asyncWithManualPolling,
    example3_asyncWithAutoPolling,
    example4_batchProcessing,
    example5_errorHandlingWithRetry,
    example6_jobCancellation,
    example7_fallbackStrategy,
    example8_legalDocumentAnalysis
};

// Run if called directly
if (require.main === module) {
    main().catch(error => {
        console.error('Error:', error);
        process.exit(1);
    });
}
