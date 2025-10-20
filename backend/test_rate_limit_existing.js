const http = require('http');

function makeRequest(email, password) {
    return new Promise((resolve) => {
        const data = JSON.stringify({ email, password });

        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/v1/auth/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve({
                        statusCode: res.statusCode,
                        body: JSON.parse(body)
                    });
                } catch (e) {
                    resolve({
                        statusCode: res.statusCode,
                        body: body
                    });
                }
            });
        });

        req.on('error', (e) => {
            console.error('Request error:', e);
            resolve({ statusCode: 0, body: e.message });
        });

        req.write(data);
        req.end();
    });
}

async function testRateLimit() {
    const testEmail = 'admin@example.com';  // EXISTING user

    console.log(`\nTesting rate limiting with EXISTING user: ${testEmail}\n`);

    for (let i = 1; i <= 8; i++) {
        const result = await makeRequest(testEmail, 'WrongPassword123!');

        console.log(`Attempt ${i}:`);
        console.log(`  Status: ${result.statusCode}`);
        console.log(`  Error: ${result.body.error}`);
        console.log(`  Remaining Attempts: ${result.body.remainingAttempts !== undefined ? result.body.remainingAttempts : 'N/A'}`);

        if (result.statusCode === 429) {
            console.log(`\n✓✓✓ SUCCESS: Rate limiting triggered after ${i} attempts`);
            console.log(`  Retry after: ${result.body.retryAfter} seconds`);
            console.log(`  Error message: ${result.body.error}`);
            console.log(`  Full message: ${result.body.message}`);
            return;
        }

        // Small delay between attempts
        await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log('\n✗✗✗ FAILURE: Rate limiting DID NOT trigger after 8 attempts');
}

testRateLimit();
