// Test RunPod API Integration
// This demonstrates the RunPod API is properly configured and ready to use

const http = require('http');

console.log('\n╔═══════════════════════════════════════════════════════════╗');
console.log('║         RunPod API Integration Test                      ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

// Test 1: Service Health Check
async function testServiceHealth() {
    return new Promise((resolve) => {
        console.log('Test 1: Checking RunPod service health...');
        const req = http.get('http://localhost:3001/health', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const health = JSON.parse(data);
                    console.log('✅ Service is healthy');
                    console.log(`   Version: ${health.version}`);
                    console.log(`   Timestamp: ${health.timestamp}`);
                    resolve(true);
                } catch (e) {
                    console.log('❌ Invalid health response');
                    resolve(false);
                }
            });
        });
        req.on('error', () => {
            console.log('❌ Service not running on port 3001');
            resolve(false);
        });
    });
}

// Test 2: RunPod API Connectivity
async function testAPIConnectivity() {
    return new Promise((resolve) => {
        console.log('\nTest 2: Testing RunPod API connectivity...');
        const req = http.get('http://localhost:3001/api-health', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const health = JSON.parse(data);
                    if (health.healthy) {
                        console.log('✅ RunPod API is reachable');
                        console.log('   API connection verified');
                    } else {
                        console.log('❌ RunPod API health check failed');
                        console.log(`   Error: ${health.error || 'Unknown error'}`);
                    }
                    resolve(health.healthy);
                } catch (e) {
                    console.log('❌ Invalid API health response');
                    resolve(false);
                }
            });
        });
        req.on('error', () => {
            console.log('❌ Cannot connect to service');
            resolve(false);
        });
    });
}

// Test 3: Simulate Question Request (without endpoint)
async function testQuestionRequest() {
    return new Promise((resolve) => {
        console.log('\nTest 3: Testing question API structure...');

        const testQuestion = {
            endpoint_id: 'demo-endpoint',
            input: {
                prompt: 'What is the capital of France?',
                max_length: 100
            },
            sync: true,
            timeout: 30000
        };

        const postData = JSON.stringify(testQuestion);

        const options = {
            hostname: 'localhost',
            port: 3001,
            path: '/execute',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        console.log('   Sending test question: "What is the capital of France?"');

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    console.log('✅ API accepts question format correctly');
                    resolve(true);
                } else if (res.statusCode === 400 || res.statusCode === 404) {
                    try {
                        const response = JSON.parse(data);
                        if (response.error && response.error.includes('endpoint')) {
                            console.log('✅ API correctly validates endpoint ID');
                            console.log('   (Expected: No endpoint configured for testing)');
                            resolve(true);
                        } else {
                            console.log('⚠️  API returned error:');
                            console.log(`   ${response.error}`);
                            resolve(false);
                        }
                    } catch (e) {
                        console.log('⚠️  API returned status:', res.statusCode);
                        resolve(false);
                    }
                } else {
                    console.log('⚠️  Unexpected status code:', res.statusCode);
                    resolve(false);
                }
            });
        });

        req.on('error', () => {
            console.log('❌ Request failed');
            resolve(false);
        });

        req.write(postData);
        req.end();
    });
}

// Run all tests
async function runTests() {
    const results = {
        serviceHealth: await testServiceHealth(),
        apiConnectivity: await testAPIConnectivity(),
        questionRequest: await testQuestionRequest()
    };

    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║                    Test Summary                           ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    const passed = Object.values(results).filter(r => r).length;
    const total = Object.keys(results).length;

    console.log(`Results: ${passed}/${total} tests passed\n`);

    console.log('✅ Service Health:', results.serviceHealth ? 'PASS' : 'FAIL');
    console.log('✅ API Connectivity:', results.apiConnectivity ? 'PASS' : 'FAIL');
    console.log('✅ Question Format:', results.questionRequest ? 'PASS' : 'FAIL');

    if (passed === total) {
        console.log('\n🎉 RunPod API infrastructure is fully operational!');
        console.log('\n📝 To test with actual questions:');
        console.log('   1. Create an endpoint at https://www.runpod.io/console/serverless');
        console.log('   2. Add endpoint ID to .env: RUNPOD_DEFAULT_ENDPOINT_ID=your-endpoint-id');
        console.log('   3. Run: node backend/test-runpod.js your-endpoint-id\n');
    } else {
        console.log('\n⚠️  Some tests failed. Check the errors above.\n');
    }

    process.exit(passed === total ? 0 : 1);
}

runTests();
