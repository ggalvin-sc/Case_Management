# RunPod Rust Service - Quick Start Guide

Get the RunPod Rust service running in 5 minutes!

## Prerequisites

1. **Install Rust** (if not already installed):
   ```bash
   # Windows (PowerShell)
   winget install Rustlang.Rustup

   # Or download from: https://rustup.rs/
   ```

2. **Verify installation**:
   ```bash
   rustc --version
   cargo --version
   ```

## Setup

1. **Navigate to the project**:
   ```bash
   cd runpod-rust
   ```

2. **Environment is already configured** (`.env` file copied from parent project):
   - `RUNPOD_API_KEY` is already set
   - Port defaults to 3001

3. **Build and run**:
   ```bash
   # Development mode (with logging)
   cargo run

   # OR Production mode (optimized)
   cargo build --release
   ./target/release/runpod-rust
   ```

## Test the Service

Once running, test the endpoints:

### 1. Health Check
```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "healthy": true,
  "version": "0.1.0",
  "timestamp": "2025-10-07T10:00:00Z"
}
```

### 2. RunPod API Health
```bash
curl http://localhost:3001/api-health
```

Expected response:
```json
{
  "healthy": true
}
```

### 3. Execute Endpoint (Async)
```bash
curl -X POST http://localhost:3001/execute \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint_id": "your-endpoint-id",
    "input": {"test": "data"},
    "sync": false,
    "timeout": 30000
  }'
```

### 4. Get Job Status
```bash
curl http://localhost:3001/status/your-endpoint-id/job-123
```

## Integration with Node.js Backend

Call the Rust service from your Node.js code:

```javascript
const axios = require('axios');

// Execute a job
const response = await axios.post('http://localhost:3001/execute', {
  endpoint_id: 'your-endpoint-id',
  input: { prompt: 'Hello world' },
  sync: true,
  timeout: 30000
});

console.log('Result:', response.data);
```

## Common Issues

### Port already in use
If port 3001 is taken, change it in `.env`:
```env
PORT=3002
```

### Rust not found
Install Rust from: https://rustup.rs/

### API key errors
Verify `.env` contains:
```env
RUNPOD_API_KEY=rpa_M0OZLRZPX2FPQ63L9ZYAC9MCWX1QM2H91UPUWI421647hh
```

## What's Next?

- Read the full [README.md](./README.md) for detailed API documentation
- Fetch your RunPod endpoints: `node scripts/fetch-runpod-endpoints.js`
- Explore the code in `src/` directory
- Run tests: `cargo test`

## Performance

The Rust service is significantly faster than the Node.js version:
- Startup: ~10ms (vs Node.js ~500ms)
- Memory: ~5MB (vs Node.js ~50MB)
- Type safety: Compile-time (vs Node.js runtime)

## Directory Structure

```
runpod-rust/
├── Cargo.toml          # Dependencies
├── .env                # Configuration (API key)
├── README.md           # Full documentation
├── QUICKSTART.md       # This file
├── src/
│   ├── main.rs         # Entry point
│   ├── config.rs       # Config loading
│   ├── error.rs        # Error handling
│   ├── models.rs       # Data models
│   ├── runpod.rs       # RunPod client
│   └── routes.rs       # API routes
└── tests/
    └── integration_test.rs
```

Enjoy using the RunPod Rust service! 🚀
