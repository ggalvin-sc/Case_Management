const https = require('https');

// Test Groq API directly
const question = 'How far is the earth from the sun?';

const requestData = JSON.stringify({
    model: 'llama-3.1-8b-instant',
    messages: [
        {
            role: 'system',
            content: 'You are a helpful AI assistant. Provide clear, accurate answers.'
        },
        {
            role: 'user',
            content: question
        }
    ],
    temperature: 0.7,
    max_tokens: 1024
});

const options = {
    hostname: 'api.groq.com',
    path: '/openai/v1/chat/completions',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer gsk_1RqMfJ8WoQUZH9Y6vXJ3WGdyb3FYGzO6P8K9QwRxZzYq',
        'Content-Length': Buffer.byteLength(requestData)
    }
};

console.log('🚀 Testing Groq API...');
console.log(`📝 Question: "${question}"\n`);

const startTime = Date.now();

const req = https.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        const elapsed = Date.now() - startTime;
        console.log(`⏱️  Response received in ${elapsed}ms\n`);
        console.log(`📊 Status Code: ${res.statusCode}\n`);

        try {
            const result = JSON.parse(data);

            if (res.statusCode === 200) {
                console.log('--- RAW RESPONSE ---');
                console.log(JSON.stringify(result, null, 2));

                if (result.choices && result.choices[0] && result.choices[0].message) {
                    const answer = result.choices[0].message.content;
                    console.log('\n🎯 ANSWER:\n');
                    console.log(answer);
                    console.log('\n✅ Groq API is working perfectly!');
                    console.log(`⚡ Speed: ${elapsed}ms (ultra-fast!)`);
                } else {
                    console.log('\n⚠️  Unexpected response format');
                }
            } else {
                console.log('❌ Error Response:');
                console.log(JSON.stringify(result, null, 2));
                console.log('\nℹ️  Get a free Groq API key at: https://console.groq.com/keys');
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
