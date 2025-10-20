# RunPod Serverless Integration

This document describes the RunPod serverless integration for the Case Management system.

## Overview

RunPod serverless endpoints allow you to run AI/ML workloads on-demand without paying for idle time. This integration provides:

- Synchronous and asynchronous execution
- Job status polling
- Job cancellation
- Automatic retry and error handling
- Zero external dependencies (pure Node.js)

## Setup

### 1. Get Your RunPod API Key

1. Sign up at [RunPod](https://www.runpod.io)
2. Go to [User Settings](https://www.runpod.io/console/user/settings)
3. Copy your API key

### 2. Configure Environment Variables

Add to your `.env` file:

```env
RUNPOD_API_KEY=your-api-key-here
RUNPOD_DEFAULT_ENDPOINT_ID=your-default-endpoint-id  # Optional
```

### 3. Create a Serverless Endpoint

1. Go to [RunPod Serverless Console](https://www.runpod.io/console/serverless)
2. Create a new endpoint or use an existing one
3. Copy the endpoint ID (e.g., `abc123def456`)

## API Reference

### Health Check

Check if RunPod API is accessible.

**Request:**
```bash
GET /api/v1/runpod/health
```

**Response:**
```json
{
  "healthy": true
}
```

### Execute Endpoint (Synchronous)

Run an endpoint and wait for the result (max 30 seconds).

**Request:**
```bash
POST /api/v1/runpod/execute
Content-Type: application/json

{
  "endpoint_id": "abc123def456",
  "input": {
    "prompt": "Hello, world!",
    "temperature": 0.7
  },
  "sync": true
}
```

**Response:**
```json
{
  "id": "job-xyz789",
  "status": "COMPLETED",
  "output": {
    "result": "Generated output..."
  },
  "executionTime": 2.5,
  "delayTime": 0.1
}
```

### Execute Endpoint (Asynchronous)

Start a job and get the job ID for later status checking.

**Request:**
```bash
POST /api/v1/runpod/execute
Content-Type: application/json

{
  "endpoint_id": "abc123def456",
  "input": {
    "prompt": "Long running task..."
  },
  "sync": false
}
```

**Response:**
```json
{
  "id": "job-xyz789",
  "status": "IN_QUEUE"
}
```

### Get Job Status

Check the status of an asynchronous job.

**Request:**
```bash
GET /api/v1/runpod/status/{endpoint_id}/{job_id}
```

**Example:**
```bash
GET /api/v1/runpod/status/abc123def456/job-xyz789
```

**Response:**
```json
{
  "id": "job-xyz789",
  "status": "COMPLETED",
  "output": {
    "result": "Generated output..."
  },
  "executionTime": 15.2,
  "delayTime": 2.3
}
```

**Possible Status Values:**
- `IN_QUEUE` - Job is waiting to be processed
- `IN_PROGRESS` - Job is currently running
- `COMPLETED` - Job finished successfully
- `FAILED` - Job failed with an error
- `CANCELLED` - Job was cancelled

### Cancel Job

Cancel a running job.

**Request:**
```bash
POST /api/v1/runpod/cancel/{endpoint_id}/{job_id}
```

**Example:**
```bash
POST /api/v1/runpod/cancel/abc123def456/job-xyz789
```

**Response:**
```json
{
  "id": "job-xyz789",
  "status": "CANCELLED"
}
```

### Execute and Wait

Start an async job and automatically poll until it completes (useful for long-running tasks).

**Request:**
```bash
POST /api/v1/runpod/execute-and-wait
Content-Type: application/json

{
  "endpoint_id": "abc123def456",
  "input": {
    "prompt": "Generate a detailed report..."
  },
  "max_wait_time": 300000,  // Optional: max 5 minutes (default: 300000ms)
  "poll_interval": 2000      // Optional: check every 2 seconds (default: 2000ms)
}
```

**Response:**
```json
{
  "id": "job-xyz789",
  "status": "COMPLETED",
  "output": {
    "result": "Generated output..."
  },
  "executionTime": 45.2,
  "delayTime": 5.3
}
```

## Usage Examples

### JavaScript/Node.js

```javascript
// Synchronous execution (quick tasks < 30s)
const response = await fetch('http://localhost:3000/api/v1/runpod/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    endpoint_id: 'your-endpoint-id',
    input: { prompt: 'Hello!' },
    sync: true
  })
});

const result = await response.json();
console.log(result.output);
```

```javascript
// Asynchronous execution (long tasks)
const response = await fetch('http://localhost:3000/api/v1/runpod/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    endpoint_id: 'your-endpoint-id',
    input: { prompt: 'Long task...' },
    sync: false
  })
});

const job = await response.json();
console.log('Job ID:', job.id);

// Check status later
const statusResponse = await fetch(
  `http://localhost:3000/api/v1/runpod/status/${endpoint_id}/${job.id}`
);
const status = await statusResponse.json();
console.log('Status:', status.status);
```

### cURL

```bash
# Synchronous execution
curl -X POST http://localhost:3000/api/v1/runpod/execute \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint_id": "your-endpoint-id",
    "input": {"prompt": "Hello!"},
    "sync": true
  }'

# Asynchronous execution
curl -X POST http://localhost:3000/api/v1/runpod/execute \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint_id": "your-endpoint-id",
    "input": {"prompt": "Long task..."},
    "sync": false
  }'

# Check job status
curl http://localhost:3000/api/v1/runpod/status/your-endpoint-id/job-xyz789

# Cancel job
curl -X POST http://localhost:3000/api/v1/runpod/cancel/your-endpoint-id/job-xyz789
```

### Python

```python
import requests

# Synchronous execution
response = requests.post('http://localhost:3000/api/v1/runpod/execute', json={
    'endpoint_id': 'your-endpoint-id',
    'input': {'prompt': 'Hello!'},
    'sync': True
})

result = response.json()
print(result['output'])

# Asynchronous execution
response = requests.post('http://localhost:3000/api/v1/runpod/execute', json={
    'endpoint_id': 'your-endpoint-id',
    'input': {'prompt': 'Long task...'},
    'sync': False
})

job = response.json()
print(f"Job ID: {job['id']}")

# Check status
status_response = requests.get(
    f"http://localhost:3000/api/v1/runpod/status/{endpoint_id}/{job['id']}"
)
status = status_response.json()
print(f"Status: {status['status']}")
```

## Using the RunPod Client Directly

You can also use the `runpod-client.js` module directly in your Node.js code:

```javascript
const runpod = require('./backend/runpod-client');

// Synchronous execution
const result = await runpod.callRunPodEndpoint(
  'your-endpoint-id',
  { prompt: 'Hello!' },
  { sync: true }
);
console.log(result.output);

// Asynchronous execution
const job = await runpod.callRunPodEndpoint(
  'your-endpoint-id',
  { prompt: 'Long task...' },
  { sync: false }
);

// Poll until complete
const finalResult = await runpod.pollJobUntilComplete(
  'your-endpoint-id',
  job.id,
  { maxWaitTime: 300000, pollInterval: 2000 }
);
console.log(finalResult.output);
```

## Error Handling

All endpoints return appropriate HTTP status codes:

- `200 OK` - Request successful
- `400 Bad Request` - Missing required parameters
- `500 Internal Server Error` - RunPod API error or network failure
- `503 Service Unavailable` - Health check failed

Error responses include a message:

```json
{
  "error": "RUNPOD_API_KEY not configured. Please set it in .env file."
}
```

## Best Practices

### 1. Choose Sync vs Async Based on Task Duration

- **Sync (`sync: true`)**: For tasks that complete in < 30 seconds
  - Simple and immediate
  - No need to poll for status
  - Limited by 30-second timeout

- **Async (`sync: false`)**: For tasks that take > 30 seconds
  - Can run for hours
  - Requires status polling
  - More scalable for long-running jobs

### 2. Handle Timeouts

```javascript
try {
  const result = await runpod.callRunPodEndpoint(endpointId, input, {
    sync: true,
    timeout: 60000  // 60 seconds
  });
} catch (error) {
  if (error.message.includes('timeout')) {
    // Retry with async mode
    const job = await runpod.callRunPodEndpoint(endpointId, input, { sync: false });
  }
}
```

### 3. Implement Retry Logic

```javascript
async function executeWithRetry(endpointId, input, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await runpod.callRunPodEndpoint(endpointId, input, { sync: true });
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

### 4. Monitor Job Status

```javascript
const job = await runpod.callRunPodEndpoint(endpointId, input, { sync: false });

// Check status every 5 seconds
const checkInterval = setInterval(async () => {
  const status = await runpod.getJobStatus(endpointId, job.id);

  if (status.status === 'COMPLETED') {
    clearInterval(checkInterval);
    console.log('Job completed:', status.output);
  } else if (status.status === 'FAILED') {
    clearInterval(checkInterval);
    console.error('Job failed');
  }
}, 5000);
```

### 5. Cost Optimization

- Use sync mode for quick tasks (cheaper, no cold start)
- Use async mode for batch processing
- Cancel jobs if they're no longer needed
- Monitor execution times and optimize your endpoint

## Troubleshooting

### "RUNPOD_API_KEY not configured"

Make sure you've set `RUNPOD_API_KEY` in your `.env` file.

### "RunPod API error (401)"

Your API key is invalid or expired. Get a new one from RunPod settings.

### "RunPod API error (404)"

The endpoint ID doesn't exist. Check your endpoint ID in the RunPod console.

### "Job polling timeout"

The job took too long. Increase `max_wait_time` or check if your endpoint is configured correctly.

### Connection Errors

- Check your internet connection
- Verify RunPod's API status at https://status.runpod.io
- Check if you're behind a firewall

## Architecture

```
┌─────────────────┐
│  Case Mgmt App  │
└────────┬────────┘
         │
         │ HTTP Request
         │
┌────────▼────────┐
│  server.js      │  /api/v1/runpod/*
│  (Express-like) │
└────────┬────────┘
         │
         │ require()
         │
┌────────▼────────────┐
│ runpod-client.js    │
│                     │
│ • callRunPodEndpoint│
│ • getJobStatus      │
│ • cancelJob         │
│ • pollUntilComplete │
│ • healthCheck       │
└────────┬────────────┘
         │
         │ HTTPS
         │
┌────────▼────────────┐
│  RunPod API         │
│  api.runpod.ai/v2   │
└─────────────────────┘
```

## License

This integration is part of the Case Management System project.

## Support

For RunPod-specific issues, see [RunPod Documentation](https://docs.runpod.io).

For integration issues, create an issue in this repository.
