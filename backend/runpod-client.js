// RunPod Serverless Client
// Provides functions to interact with RunPod serverless endpoints
// Uses Node.js built-in https module (no external dependencies)

const https = require('https');
const http = require('http');

/**
 * RunPod API Configuration
 * Loaded from environment variables
 */
const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;
const RUNPOD_API_BASE = 'https://api.runpod.ai/v2/';
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const DEFAULT_POLL_INTERVAL = 2000; // 2 seconds

/**
 * Makes an HTTP request to RunPod API
 *
 * @param {string} method - HTTP method (GET, POST, etc.)
 * @param {string} path - API path (e.g., '/endpoint-id/run')
 * @param {Object|null} data - Request body data
 * @param {number} timeout - Request timeout in milliseconds
 * @returns {Promise<Object>} Response data
 * @throws {Error} If request fails or times out
 */
function makeRunPodRequest(method, path, data = null, timeout = DEFAULT_TIMEOUT) {
    return new Promise((resolve, reject) => {
        if (!RUNPOD_API_KEY) {
            reject(new Error('RUNPOD_API_KEY not configured. Please set it in .env file.'));
            return;
        }

        const url = new URL(path, RUNPOD_API_BASE);

        const options = {
            method: method,
            headers: {
                'Authorization': `Bearer ${RUNPOD_API_KEY}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            timeout: timeout
        };

        console.log(`[RunPod] → ${method} ${url.toString()}`);

        const req = https.request(url, options, (res) => {
            let body = '';

            res.on('data', chunk => {
                body += chunk;
            });

            res.on('end', () => {
                try {
                    const responseData = body ? JSON.parse(body) : null;
                    console.log(`[RunPod] ← ${res.statusCode} ${method} ${path}`);

                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve({
                            success: true,
                            statusCode: res.statusCode,
                            data: responseData
                        });
                    } else {
                        const errorMessage = responseData?.error || responseData?.message || 'Unknown error';
                        reject(new Error(`RunPod API error (${res.statusCode}): ${errorMessage}`));
                    }
                } catch (e) {
                    console.error('[RunPod] Parse error:', e.message);
                    reject(new Error('Invalid JSON response from RunPod API'));
                }
            });
        });

        req.on('error', (error) => {
            console.error('[RunPod] Connection error:', error.message);
            reject(new Error(`RunPod connection error: ${error.message}`));
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error(`RunPod request timeout after ${timeout}ms`));
        });

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

/**
 * Execute a RunPod serverless endpoint
 * Supports both synchronous and asynchronous execution
 *
 * @param {string} endpointId - The RunPod endpoint ID
 * @param {Object} input - Input data for the endpoint
 * @param {Object} options - Execution options
 * @param {boolean} options.sync - If true, wait for result (sync). If false, return job ID (async)
 * @param {number} options.timeout - Request timeout in milliseconds
 * @returns {Promise<Object>} Job result or job ID
 *
 * @example
 * // Synchronous execution (waits for result)
 * const result = await callRunPodEndpoint('my-endpoint-id', { prompt: 'Hello' }, { sync: true });
 * console.log(result.output);
 *
 * @example
 * // Asynchronous execution (returns job ID)
 * const job = await callRunPodEndpoint('my-endpoint-id', { prompt: 'Hello' }, { sync: false });
 * console.log(job.id); // Use getJobStatus() to check later
 */
async function callRunPodEndpoint(endpointId, input, options = {}) {
    const { sync = false, timeout = DEFAULT_TIMEOUT } = options;

    if (!endpointId) {
        throw new Error('endpointId is required');
    }

    if (!input || typeof input !== 'object') {
        throw new Error('input must be an object');
    }

    const endpoint = sync ? 'runsync' : 'run';
    const path = `${endpointId}/${endpoint}`;

    try {
        const response = await makeRunPodRequest('POST', path, { input }, timeout);

        if (sync) {
            // Synchronous execution returns result immediately
            return {
                id: response.data.id,
                status: response.data.status,
                output: response.data.output,
                executionTime: response.data.executionTime,
                delayTime: response.data.delayTime
            };
        } else {
            // Asynchronous execution returns job ID
            return {
                id: response.data.id,
                status: response.data.status || 'IN_QUEUE'
            };
        }
    } catch (error) {
        console.error('[RunPod] Endpoint execution failed:', error.message);
        throw error;
    }
}

/**
 * Get the status of an asynchronous job
 *
 * @param {string} endpointId - The RunPod endpoint ID
 * @param {string} jobId - The job ID returned from async execution
 * @returns {Promise<Object>} Job status and result (if completed)
 *
 * @example
 * const status = await getJobStatus('my-endpoint-id', 'job-123');
 * if (status.status === 'COMPLETED') {
 *   console.log(status.output);
 * }
 */
async function getJobStatus(endpointId, jobId) {
    if (!endpointId) {
        throw new Error('endpointId is required');
    }

    if (!jobId) {
        throw new Error('jobId is required');
    }

    const path = `${endpointId}/status/${jobId}`;

    try {
        const response = await makeRunPodRequest('GET', path);

        return {
            id: response.data.id,
            status: response.data.status,
            output: response.data.output,
            executionTime: response.data.executionTime,
            delayTime: response.data.delayTime
        };
    } catch (error) {
        console.error('[RunPod] Status check failed:', error.message);
        throw error;
    }
}

/**
 * Cancel a running job
 *
 * @param {string} endpointId - The RunPod endpoint ID
 * @param {string} jobId - The job ID to cancel
 * @returns {Promise<Object>} Cancellation result
 *
 * @example
 * await cancelJob('my-endpoint-id', 'job-123');
 */
async function cancelJob(endpointId, jobId) {
    if (!endpointId) {
        throw new Error('endpointId is required');
    }

    if (!jobId) {
        throw new Error('jobId is required');
    }

    const path = `${endpointId}/cancel/${jobId}`;

    try {
        const response = await makeRunPodRequest('POST', path);

        return {
            id: response.data.id,
            status: response.data.status
        };
    } catch (error) {
        console.error('[RunPod] Job cancellation failed:', error.message);
        throw error;
    }
}

/**
 * Poll a job until it completes or times out
 * Useful for async jobs where you want to wait for the result
 *
 * @param {string} endpointId - The RunPod endpoint ID
 * @param {string} jobId - The job ID to poll
 * @param {Object} options - Polling options
 * @param {number} options.maxWaitTime - Maximum time to wait in milliseconds (default: 300000 = 5 minutes)
 * @param {number} options.pollInterval - Time between checks in milliseconds (default: 2000 = 2 seconds)
 * @returns {Promise<Object>} Final job result
 * @throws {Error} If job fails or times out
 *
 * @example
 * const job = await callRunPodEndpoint('my-endpoint-id', { prompt: 'Hello' }, { sync: false });
 * const result = await pollJobUntilComplete('my-endpoint-id', job.id);
 * console.log(result.output);
 */
async function pollJobUntilComplete(endpointId, jobId, options = {}) {
    const { maxWaitTime = 300000, pollInterval = DEFAULT_POLL_INTERVAL } = options;

    const startTime = Date.now();

    while (true) {
        const elapsed = Date.now() - startTime;

        if (elapsed > maxWaitTime) {
            throw new Error(`Job polling timeout after ${maxWaitTime}ms`);
        }

        const status = await getJobStatus(endpointId, jobId);

        console.log(`[RunPod] Job ${jobId} status: ${status.status}`);

        if (status.status === 'COMPLETED') {
            return status;
        }

        if (status.status === 'FAILED') {
            throw new Error(`Job failed: ${status.error || 'Unknown error'}`);
        }

        if (status.status === 'CANCELLED') {
            throw new Error('Job was cancelled');
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
}

/**
 * Health check for RunPod API connectivity
 * Tests if the API key is valid and API is reachable
 *
 * @returns {Promise<Object>} Health check result
 *
 * @example
 * const health = await healthCheck();
 * if (health.healthy) {
 *   console.log('RunPod API is accessible');
 * }
 */
async function healthCheck() {
    if (!RUNPOD_API_KEY) {
        return {
            healthy: false,
            error: 'RUNPOD_API_KEY not configured'
        };
    }

    const defaultEndpointId = process.env.RUNPOD_DEFAULT_ENDPOINT_ID;

    if (!defaultEndpointId) {
        return {
            healthy: false,
            error: 'RUNPOD_DEFAULT_ENDPOINT_ID not configured'
        };
    }

    try {
        // Check the default endpoint's health
        const response = await makeRunPodRequest('GET', `${defaultEndpointId}/health`, null, 5000);
        return {
            healthy: true,
            endpoint: defaultEndpointId,
            workers: response.data?.workers,
            jobs: response.data?.jobs
        };
    } catch (error) {
        return {
            healthy: false,
            error: error.message
        };
    }
}

module.exports = {
    callRunPodEndpoint,
    getJobStatus,
    cancelJob,
    pollJobUntilComplete,
    healthCheck
};
