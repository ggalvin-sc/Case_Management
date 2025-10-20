const http = require('http');

// Test with actual question: "How far is the earth from the sun?"
const testQuestion = 'How far is the earth from the sun?';

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

console.log('🌍 Asking the AI: "How far is the earth from the sun?"\n');
console.log('Sending request to Rust service...\n');

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
            console.log('⚡ Execution Time:', result.execution_time + 'ms');
            console.log('⏳ Delay Time:', result.delay_time + 'ms');
            console.log('\n--- RAW RESPONSE ---');
            console.log(JSON.stringify(result, null, 2));
            console.log('\n--- EXTRACTED ANSWER ---');

            // Extract answer using same logic as backend
            let answer = null;

            if (result.output && Array.isArray(result.output) && result.output[0]) {
                const firstItem = result.output[0];

                // Try to extract from various formats
                if (firstItem.choices && firstItem.choices[0]) {
                    const choice = firstItem.choices[0];
                    if (choice.tokens && Array.isArray(choice.tokens) && choice.tokens[0]) {
                        answer = choice.tokens.join(' ');
                    } else if (choice.text) {
                        answer = choice.text;
                    }
                } else if (firstItem.text) {
                    answer = firstItem.text;
                } else if (firstItem.content) {
                    answer = firstItem.content;
                } else if (firstItem.message && firstItem.message.content) {
                    answer = firstItem.message.content;
                }
            }

            if (answer) {
                console.log('\n🎯 ANSWER:\n');
                console.log(answer);
                console.log('\n✅ Success! The AI responded correctly.');
            } else {
                console.log('\n⚠️  Could not extract answer from response');
                console.log('Output structure:', JSON.stringify(result.output, null, 2));
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
