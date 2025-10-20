// Test a real question through RunPod API
const https = require('https');
require('dotenv').config();

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;
const ENDPOINT_ID = '3hm50vlw5z2y5o'; // vLLM endpoint

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║         Testing Real Question Through RunPod API         ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

console.log('Endpoint: vLLM -fb');
console.log('Endpoint ID:', ENDPOINT_ID);
console.log('Question: "What are the three branches of the U.S. government?"\n');

function askQuestion() {
    return new Promise((resolve) => {
        const requestData = JSON.stringify({
            input: {
                prompt: 'What are the three branches of the U.S. government? Please provide a brief answer.',
                max_tokens: 150,
                temperature: 0.7
            }
        });

        const options = {
            hostname: 'api.runpod.io',
            port: 443,
            path: `/v2/${ENDPOINT_ID}/runsync`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(requestData),
                'Authorization': `Bearer ${RUNPOD_API_KEY}`
            },
            timeout: 60000
        };

        console.log('📤 Sending request to RunPod...\n');

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', chunk => {
                data += chunk;
                process.stdout.write('.');
            });

            res.on('end', () => {
                console.log('\n\n📥 Response received!\n');
                console.log('Status Code:', res.statusCode);
                console.log('─'.repeat(60) + '\n');

                try {
                    const response = JSON.parse(data);

                    console.log('Full Response:');
                    console.log(JSON.stringify(response, null, 2));
                    console.log('\n' + '─'.repeat(60) + '\n');

                    if (response.status === 'COMPLETED' && response.output) {
                        console.log('✅ SUCCESS!\n');
                        console.log('Answer:');
                        console.log('─'.repeat(60));

                        // Try to extract the text from various possible response formats
                        let answer = '';
                        if (typeof response.output === 'string') {
                            answer = response.output;
                        } else if (response.output.text) {
                            answer = response.output.text;
                        } else if (response.output.choices && response.output.choices[0]) {
                            answer = response.output.choices[0].text || response.output.choices[0].message?.content || '';
                        } else if (response.output[0]) {
                            answer = response.output[0];
                        } else {
                            answer = JSON.stringify(response.output);
                        }

                        console.log(answer);
                        console.log('─'.repeat(60));

                        if (response.executionTime) {
                            console.log(`\n⏱️  Execution Time: ${response.executionTime}ms`);
                        }
                        if (response.delayTime) {
                            console.log(`⏱️  Delay Time: ${response.delayTime}ms`);
                        }
                    } else if (response.error) {
                        console.log('❌ Error:', response.error);
                    } else if (response.status === 'IN_QUEUE') {
                        console.log('⏳ Job is in queue...');
                        console.log('Job ID:', response.id);
                    } else {
                        console.log('⚠️  Unexpected response status:', response.status);
                    }
                } catch (e) {
                    console.log('❌ Error parsing JSON response:', e.message);
                    console.log('\nRaw response:');
                    console.log(data);
                }

                resolve();
            });
        });

        req.on('error', (error) => {
            console.log('\n❌ Request failed:', error.message);
            resolve();
        });

        req.on('timeout', () => {
            console.log('\n⏱️  Request timed out');
            req.destroy();
            resolve();
        });

        req.write(requestData);
        req.end();
    });
}

// Also test async request
async function askQuestionAsync() {
    return new Promise((resolve) => {
        console.log('\n\n╔═══════════════════════════════════════════════════════════╗');
        console.log('║         Testing Async Request (Non-blocking)             ║');
        console.log('╚═══════════════════════════════════════════════════════════╝\n');

        const requestData = JSON.stringify({
            input: {
                prompt: 'What is 2+2? Answer with just the number.',
                max_tokens: 10
            }
        });

        const options = {
            hostname: 'api.runpod.io',
            port: 443,
            path: `/v2/${ENDPOINT_ID}/run`,  // Note: /run instead of /runsync
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(requestData),
                'Authorization': `Bearer ${RUNPOD_API_KEY}`
            }
        };

        console.log('📤 Sending async request...\n');

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log('📥 Response received!\n');

                try {
                    const response = JSON.parse(data);
                    console.log('Response:');
                    console.log(JSON.stringify(response, null, 2));

                    if (response.id) {
                        console.log('\n✅ Async job created successfully!');
                        console.log('Job ID:', response.id);
                        console.log('Status:', response.status);
                        console.log('\nℹ️  To get results, poll: GET /v2/' + ENDPOINT_ID + '/status/' + response.id);
                    }
                } catch (e) {
                    console.log('Error:', e.message);
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

async function run() {
    if (!RUNPOD_API_KEY) {
        console.log('❌ RUNPOD_API_KEY not set');
        return;
    }

    await askQuestion();
    await askQuestionAsync();
}

run();
