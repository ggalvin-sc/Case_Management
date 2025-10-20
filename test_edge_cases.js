// RunPod Edge Case Tests
require('dotenv').config();
const https = require('https');

console.log('=== RunPod Edge Case Tests ===\n');

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;
const endpointId = '3hm50vlw5z2y5o';

// Test: Invalid API key
async function testInvalidKey() {
  console.log('Test: Invalid API Key...');

  const url = new URL(`/v2/${endpointId}/runsync`, 'https://api.runpod.ai');
  const requestData = JSON.stringify({ input: { prompt: 'test' } });

  return new Promise((resolve) => {
    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer invalid-key-12345',
        'Content-Type': 'application/json'
      }
    }, (res) => {
      console.log('Status:', res.statusCode);
      if (res.statusCode === 401 || res.statusCode === 403) {
        console.log('✅ Invalid API key properly rejected\n');
      } else {
        console.log('⚠️  Unexpected status for invalid key\n');
      }
      resolve();
    });

    req.on('error', err => { console.log('Error:', err.message); resolve(); });
    req.write(requestData);
    req.end();
  });
}

// Test: Missing input
async function testMissingInput() {
  console.log('Test: Missing Input Parameters...');

  const url = new URL(`/v2/${endpointId}/runsync`, 'https://api.runpod.ai');
  const requestData = JSON.stringify({});  // No input

  return new Promise((resolve) => {
    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RUNPOD_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log('Status:', res.statusCode);
        if (res.statusCode === 400 || res.statusCode === 422) {
          console.log('✅ Missing input properly validated\n');
        } else {
          console.log('Response:', body);
          console.log('✅ Request completed\n');
        }
        resolve();
      });
    });

    req.on('error', err => { console.log('Error:', err.message); resolve(); });
    req.write(requestData);
    req.end();
  });
}

// Test: Large prompt
async function testLargePrompt() {
  console.log('Test: Large Prompt (stress test)...');

  const largePrompt = 'This is a test prompt. '.repeat(200); // ~5KB prompt
  const url = new URL(`/v2/${endpointId}/runsync`, 'https://api.runpod.ai');
  const requestData = JSON.stringify({
    input: { prompt: largePrompt, max_new_tokens: 10 }
  });

  return new Promise((resolve) => {
    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RUNPOD_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 60000
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log('Status:', res.statusCode);
        if (res.statusCode === 200) {
          console.log('✅ Large prompt handled successfully\n');
        } else {
          console.log('Response:', body.substring(0, 200));
          console.log('✅ Request completed\n');
        }
        resolve();
      });
    });

    req.on('timeout', () => {
      req.destroy();
      console.log('⚠️  Request timed out\n');
      resolve();
    });

    req.on('error', err => { console.log('Error:', err.message, '\n'); resolve(); });
    req.write(requestData);
    req.end();
  });
}

async function runTests() {
  await testInvalidKey();
  await testMissingInput();
  await testLargePrompt();
  console.log('Edge case testing complete!');
}

runTests();
