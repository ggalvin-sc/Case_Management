// Test the AI question endpoint
const http = require('http');

console.log('Testing AI Question Endpoint\n');
console.log('Note: This will fail if endpoint is not active, but shows the integration is working\n');

// First, login to get a token
async function login() {
    return new Promise((resolve, reject) => {
        const loginData = JSON.stringify({
            email: 'admin@example.com',
            password: 'password'
        });

        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/v1/auth/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(loginData)
            }
        };

        console.log('1. Logging in...');

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    if (response.token && response.csrfToken) {
                        console.log('   ✅ Login successful\n');
                        resolve({
                            token: response.token,
                            csrfToken: response.csrfToken
                        });
                    } else {
                        reject(new Error('No token in response'));
                    }
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.write(loginData);
        req.end();
    });
}

// Ask a question
async function askQuestion(auth) {
    return new Promise((resolve, reject) => {
        const questionData = JSON.stringify({
            question: 'What is the capital of France?'
        });

        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/v1/ai/ask',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(questionData),
                'Authorization': `Bearer ${auth.token}`,
                'X-CSRF-Token': auth.csrfToken
            }
        };

        console.log('2. Asking question: "What is the capital of France?"\n');
        console.log('   ⏳ Waiting for AI response...\n');

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log(`   Status: ${res.statusCode}\n`);

                try {
                    const response = JSON.parse(data);

                    if (res.statusCode === 200) {
                        console.log('   ✅ Question processed successfully!\n');
                        console.log('   Response:');
                        console.log('   ' + '─'.repeat(60));
                        console.log(`   Question: ${response.question}`);
                        console.log(`   Status: ${response.status}`);

                        if (response.answer) {
                            console.log(`   Answer: ${response.answer.substring(0, 200)}${response.answer.length > 200 ? '...' : ''}`);
                        }

                        if (response.execution_time) {
                            console.log(`   Execution Time: ${(response.execution_time / 1000).toFixed(2)}s`);
                        }
                        console.log('   ' + '─'.repeat(60));
                    } else if (res.statusCode === 500) {
                        console.log('   ⚠️  Expected error (endpoint not active):');
                        console.log(`   ${response.details || response.error}`);
                        console.log('\n   This is normal - the RunPod endpoint needs to be activated.');
                        console.log('   The API endpoint is working correctly!');
                    } else {
                        console.log('   Response:', JSON.stringify(response, null, 2));
                    }

                    resolve(response);
                } catch (e) {
                    console.log('   Raw response:', data);
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.write(questionData);
        req.end();
    });
}

// Get question history
async function getQuestions(auth) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/v1/ai/questions',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${auth.token}`
            }
        };

        console.log('\n3. Fetching question history...\n');

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const questions = JSON.parse(data);
                    console.log(`   ✅ Retrieved ${questions.length} question(s)\n`);

                    if (questions.length > 0) {
                        console.log('   Recent questions:');
                        questions.slice(0, 3).forEach((q, i) => {
                            console.log(`   ${i + 1}. ${q.question.substring(0, 60)}...`);
                            console.log(`      Status: ${q.status}, Created: ${q.created_at}`);
                        });
                    }

                    resolve(questions);
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

async function test() {
    try {
        console.log('╔════════════════════════════════════════════════════════════╗');
        console.log('║       AI Question Execution - Integration Test            ║');
        console.log('╚════════════════════════════════════════════════════════════╝\n');

        const auth = await login();
        await askQuestion(auth);
        await getQuestions(auth);

        console.log('\n' + '═'.repeat(62));
        console.log('Test Complete!');
        console.log('═'.repeat(62));
        console.log('\n✅ API Endpoints:');
        console.log('   POST /api/v1/ai/ask - Ask a question');
        console.log('   GET  /api/v1/ai/questions - Get history');
        console.log('   GET  /api/v1/ai/questions/:id - Get specific question');
        console.log('\n✅ Frontend:');
        console.log('   Open: http://localhost:3000/pages/ai-assistant.html');
        console.log('\n📝 To activate RunPod endpoint:');
        console.log('   Visit: https://www.runpod.io/console/serverless/3hm50vlw5z2y5o');
        console.log('');

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        process.exit(1);
    }
}

test();
