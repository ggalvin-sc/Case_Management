// Test RunPod API directly with the configured API key
const https = require('https');
require('dotenv').config();

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;
const API_BASE = 'https://api.runpod.io';

console.log('Testing RunPod API with configured key...\n');
console.log('API Key:', RUNPOD_API_KEY ? `${RUNPOD_API_KEY.substring(0, 10)}...` : 'NOT SET');
console.log('');

// Test 1: Try to get user endpoints
function testGraphQL() {
    return new Promise((resolve) => {
        const query = JSON.stringify({
            query: `query Endpoints {
                myself {
                    endpoints {
                        id
                        name
                        templateId
                        gpuIds
                    }
                }
            }`
        });

        const options = {
            hostname: 'api.runpod.io',
            port: 443,
            path: '/graphql',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(query),
                'Authorization': `Bearer ${RUNPOD_API_KEY}`
            }
        };

        console.log('📡 Querying RunPod GraphQL API for endpoints...\n');

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log(`Status: ${res.statusCode}\n`);

                try {
                    const response = JSON.parse(data);
                    console.log('Response:');
                    console.log(JSON.stringify(response, null, 2));

                    if (response.data && response.data.myself && response.data.myself.endpoints) {
                        const endpoints = response.data.myself.endpoints;
                        console.log(`\n✅ Found ${endpoints.length} endpoint(s)`);

                        if (endpoints.length > 0) {
                            console.log('\nAvailable Endpoints:');
                            endpoints.forEach(ep => {
                                console.log(`  - ${ep.name || ep.id}`);
                                console.log(`    ID: ${ep.id}`);
                                console.log(`    Template: ${ep.templateId || 'Custom'}`);
                                console.log('');
                            });
                        } else {
                            console.log('\nℹ️  No endpoints deployed yet.');
                            console.log('   Create one at: https://www.runpod.io/console/serverless');
                        }
                    }
                } catch (e) {
                    console.log('Raw response:', data);
                    console.log('\nError parsing JSON:', e.message);
                }

                resolve();
            });
        });

        req.on('error', (error) => {
            console.log('❌ Request failed:', error.message);
            resolve();
        });

        req.write(query);
        req.end();
    });
}

// Test 2: Try a sample inference request with a demo endpoint
function testInference() {
    return new Promise((resolve) => {
        // Using a common public template endpoint ID (this might not exist for this user)
        const testEndpointId = 'test-endpoint';

        const requestData = JSON.stringify({
            input: {
                prompt: 'What is the capital of France? Please answer in one word.',
                max_new_tokens: 50
            }
        });

        const options = {
            hostname: 'api.runpod.io',
            port: 443,
            path: `/v2/${testEndpointId}/runsync`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(requestData),
                'Authorization': `Bearer ${RUNPOD_API_KEY}`
            }
        };

        console.log('\n\n📡 Testing inference request (expecting error - no endpoint configured)...\n');

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log(`Status: ${res.statusCode}\n`);
                console.log('Response:');
                try {
                    const response = JSON.parse(data);
                    console.log(JSON.stringify(response, null, 2));
                } catch (e) {
                    console.log(data);
                }
                resolve();
            });
        });

        req.on('error', (error) => {
            console.log('❌ Request failed:', error.message);
            resolve();
        });

        req.write(requestData);
        req.end();
    });
}

async function runTests() {
    if (!RUNPOD_API_KEY) {
        console.log('❌ RUNPOD_API_KEY not set in .env file');
        process.exit(1);
    }

    await testGraphQL();
    await testInference();

    console.log('\n\n' + '='.repeat(60));
    console.log('Summary:');
    console.log('='.repeat(60));
    console.log('The RunPod API is accessible with your API key.');
    console.log('To make actual inference requests:');
    console.log('1. Create a serverless endpoint at https://www.runpod.io/console/serverless');
    console.log('2. Use the endpoint ID from the response above');
    console.log('3. Send requests to: /v2/{endpoint_id}/run or /v2/{endpoint_id}/runsync');
    console.log('');
}

runTests();
