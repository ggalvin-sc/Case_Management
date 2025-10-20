const http = require('http');

// Test Ollama endpoint with correct Ollama format
const testQuestion = 'How far is the earth from the sun?';

// Ollama expects this format
const requestData = JSON.stringify({
    endpoint_id: 'jk5momzbmdxhk9', // Ollama endpoint
    input: {
        model: 'llama2',  // or whatever model is configured
        prompt: testQuestion,
        stream: false
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

console.log('🧪 Testing Ollama endpoint with Ollama format...\n');
console.log(`📝 Question: "${testQuestion}"\n`);

const startTime = Date.now();

const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        const elapsed = Date.now() - startTime;
        console.log(`⏱️  Response received in ${elapsed}ms\n`);

        try {
            const result = JSON.parse(data);

            console.log('📊 Job Status:', result.status);
            console.log('\n--- RAW RESPONSE ---');
            console.log(JSON.stringify(result, null, 2));

            // Try to extract response from Ollama format
            if (result.output) {
                console.log('\n--- EXTRACTED OUTPUT ---');

                let answer = null;

                if (Array.isArray(result.output)) {
                    const output = result.output[0];
                    // Ollama format
                    if (output.response) {
                        answer = output.response;
                    } else if (output.text) {
                        answer = output.text;
                    } else if (output.message && output.message.content) {
                        answer = output.message.content;
                    }
                } else if (result.output.response) {
                    answer = result.output.response;
                }

                if (answer) {
                    console.log('\n🎯 ANSWER:\n');
                    console.log(answer);
                    console.log('\n✅ Ollama endpoint is working!');
                } else {
                    console.log('Could not extract answer. Output structure:');
                    console.log(JSON.stringify(result.output, null, 2));
                }
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
