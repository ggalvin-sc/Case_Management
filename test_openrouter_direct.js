const https = require('https');

// Test OpenRouter API directly
const question = 'How far is the earth from the sun?';

const requestData = JSON.stringify({
    model: 'meta-llama/llama-3.2-3b-instruct:free',
    messages: [
        {
            role: 'system',
            content: 'You are a helpful AI assistant. Provide clear, accurate answers to questions.'
        },
        {
            role: 'user',
            content: question
        }
    ]
});

const options = {
    hostname: 'openrouter.ai',
    path: '/api/v1/chat/completions',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer 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',
        'HTTP-Referer': 'https://localhost:3000',
        'X-Title': 'Case Management AI Assistant',
        'Content-Length': Buffer.byteLength(requestData)
    }
};

console.log('🌍 Testing OpenRouter API...');
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
                    console.log('\n✅ OpenRouter API is working perfectly!');
                } else {
                    console.log('\n⚠️  Unexpected response format');
                }
            } else {
                console.log('❌ Error Response:');
                console.log(JSON.stringify(result, null, 2));
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
