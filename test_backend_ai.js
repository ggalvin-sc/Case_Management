const https = require('https');

// Test the backend AI endpoint
const question = 'How far is the earth from the sun?';

const requestData = JSON.stringify({
    question: question
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/v1/ai/ask',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestData)
        // Note: This will fail CSRF check, but we'll see the Groq API response
    },
    rejectUnauthorized: false  // Accept self-signed certificate
};

console.log('🧪 Testing backend AI endpoint...');
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

            console.log('--- RESPONSE ---');
            console.log(JSON.stringify(result, null, 2));

            if (result.answer) {
                console.log('\n🎯 ANSWER:\n');
                console.log(result.answer);
            } else if (result.error) {
                console.log('\n⚠️  Error:', result.error);

                if (result.error.includes('Invalid API Key') || result.error.includes('Groq')) {
                    console.log('\n💡 Solution:');
                    console.log('   1. Get free API key: https://console.groq.com/keys');
                    console.log('   2. Edit backend/server.js line 2762');
                    console.log('   3. Replace placeholder key with your key');
                    console.log('   4. Restart backend');
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
    console.log('\n💡 Make sure backend is running:');
    console.log('   cd backend && node server.js');
});

req.write(requestData);
req.end();
