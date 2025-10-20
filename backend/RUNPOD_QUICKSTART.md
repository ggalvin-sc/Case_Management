# RunPod Integration - Quick Start Guide

Get started with RunPod serverless in 5 minutes!

## Prerequisites

- Node.js installed
- RunPod account (free tier available)
- This case management application running

## Step 1: Get Your RunPod API Key (2 minutes)

1. Go to [RunPod.io](https://www.runpod.io) and sign up (or log in)
2. Navigate to [User Settings](https://www.runpod.io/console/user/settings)
3. Scroll to "API Keys" section
4. Click "Create API Key"
5. Copy your API key (starts with something like `YOUR_KEY_HERE`)

## Step 2: Configure Environment (30 seconds)

Open `.env` file in the project root and update:

```env
RUNPOD_API_KEY=your-actual-api-key-here
```

Save the file.

## Step 3: Create or Use a Serverless Endpoint (2 minutes)

### Option A: Use an Existing Template

1. Go to [RunPod Serverless Console](https://www.runpod.io/console/serverless)
2. Click "Quick Deploy" on any template (e.g., Stable Diffusion, LLaMA, etc.)
3. Wait for deployment (30 seconds)
4. Copy the Endpoint ID (looks like `abc123def456`)

### Option B: Create Your Own

1. Go to [RunPod Serverless Console](https://www.runpod.io/console/serverless)
2. Click "New Endpoint"
3. Configure your endpoint (Docker image, GPU type, etc.)
4. Deploy and copy the Endpoint ID

## Step 4: Test the Integration (1 minute)

### Test via Command Line

```bash
cd backend
node test-runpod.js YOUR_ENDPOINT_ID
```

Expected output:
```
✓ Health check passed - RunPod API is accessible
✓ Synchronous execution successful
✓ Async job started
...
```

### Test via API

Start your server:
```bash
node backend/server.js
```

Test health check:
```bash
curl http://localhost:3000/api/v1/runpod/health
```

Execute an endpoint (synchronous):
```bash
curl -X POST http://localhost:3000/api/v1/runpod/execute \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint_id": "YOUR_ENDPOINT_ID",
    "input": {"prompt": "Hello!"},
    "sync": true
  }'
```

## Step 5: Use in Your Application

### JavaScript Example

```javascript
// In your frontend or backend code
const response = await fetch('http://localhost:3000/api/v1/runpod/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    endpoint_id: 'YOUR_ENDPOINT_ID',
    input: { prompt: 'Analyze this legal document...' },
    sync: true
  })
});

const result = await response.json();
console.log(result.output);
```

### Node.js Backend Example

```javascript
const runpod = require('./backend/runpod-client');

// Quick execution
const result = await runpod.callRunPodEndpoint(
  'YOUR_ENDPOINT_ID',
  { prompt: 'Hello!' },
  { sync: true }
);

console.log(result.output);
```

## Common Use Cases

### 1. Document Analysis
```javascript
const result = await runpod.callRunPodEndpoint('document-analysis-endpoint', {
  document: 'Contract text here...',
  analysis_type: 'risk_assessment'
}, { sync: false });

// Poll for result
const final = await runpod.pollJobUntilComplete('document-analysis-endpoint', result.id);
```

### 2. Text Generation
```javascript
const result = await runpod.callRunPodEndpoint('text-gen-endpoint', {
  prompt: 'Summarize this case:',
  max_length: 500
}, { sync: true });
```

### 3. Image Generation
```javascript
const result = await runpod.callRunPodEndpoint('stable-diffusion-endpoint', {
  prompt: 'Professional law firm logo',
  steps: 30
}, { sync: false });

const final = await runpod.pollJobUntilComplete('stable-diffusion-endpoint', result.id);
```

## Pricing

RunPod serverless is pay-per-second:
- You only pay when your code is running
- No charges for idle time
- Typical costs: $0.0001 - $0.001 per second (depending on GPU)
- Free tier includes some credits

Example: A 10-second inference on an A100 GPU costs ~$0.01

## Troubleshooting

### "RUNPOD_API_KEY not configured"
- Check your `.env` file has the correct key
- Make sure `.env` is in the project root
- Restart your server after changing `.env`

### "RunPod API error (401)"
- Your API key is invalid or expired
- Generate a new key from RunPod settings

### "RunPod API error (404)"
- The endpoint ID doesn't exist
- Check the endpoint ID in RunPod console
- Make sure the endpoint is deployed

### Timeout Errors
- Use async mode for long-running tasks
- Increase timeout: `{ sync: true, timeout: 60000 }`
- Consider using `pollJobUntilComplete()`

### Connection Errors
- Check your internet connection
- Verify firewall isn't blocking HTTPS to api.runpod.ai
- Check RunPod status: https://status.runpod.io

## Next Steps

- Read the full documentation: `RUNPOD_INTEGRATION.md`
- Explore examples: `runpod-examples.js`
- Check out RunPod docs: https://docs.runpod.io
- Join RunPod Discord for support

## Support

- RunPod Documentation: https://docs.runpod.io
- RunPod Discord: https://discord.gg/runpod
- Integration Issues: Create an issue in this repository

## Cost Optimization Tips

1. Use sync mode for quick tasks (< 10 seconds)
2. Batch multiple requests together
3. Cancel jobs you no longer need
4. Choose the smallest GPU that meets your needs
5. Monitor your usage in RunPod console

Happy coding! 🚀
