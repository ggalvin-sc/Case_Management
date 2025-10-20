const http = require('http');

// Test the Rust service with the new vLLM endpoint
const testQuestion = 'What is 2+2?';

const requestData = JSON.stringify({
    endpoint_id: '3hm50vlw5z2y5o',
    input: {
        prompt: testQuestion
    },
    sync: true,
    timeout: 60000
});

const options = {
    hostname: '127.0.0.1',
    port: 3001,
    path: '/execute',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestData)
    }
};

console.log('🧪 Testing vLLM endpoint via Rust service...');
console.log(`📝 Question: "${testQuestion}"\n`);

const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log(`📊 Response Status: ${res.statusCode}\n`);

        try {
            const result = JSON.parse(data);
            console.log('✅ Raw Response:');
            console.log(JSON.stringify(result, null, 2));
            console.log('\n');

            // Try to extract answer
            if (result.output) {
                console.log('🎯 Extracted Output:');
                console.log(JSON.stringify(result.output, null, 2));
            }

            if (result.status === 'COMPLETED') {
                console.log('\n✅ SUCCESS! Endpoint is working!');
            } else if (result.status === 'FAILED') {
                console.log('\n❌ Job failed. Check the error details above.');
            } else {
                console.log(`\n⏳ Job status: ${result.status}`);
            }
        } catch (e) {
            console.error('❌ Failed to parse response:', e.message);
            console.log('Raw data:', data);
        }
    });
});

req.on('error', (error) => {
    console.error('❌ Request error:', error.message);
});

req.write(requestData);
req.end();
