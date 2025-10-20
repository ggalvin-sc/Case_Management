# RunPod Rust Service

A high-performance Rust-based HTTP service for interacting with RunPod serverless API. This service provides a clean RESTful API to execute jobs, check status, cancel operations, and poll for results.

## Features

- **RESTful API** - Clean HTTP endpoints for all RunPod operations
- **Async/Await** - Built on Tokio for high-performance async operations
- **Type Safety** - Leverages Rust's type system for compile-time guarantees
- **Error Handling** - Comprehensive error handling with proper HTTP status codes
- **CORS Support** - Cross-origin requests enabled for web integration
- **Logging** - Structured logging with tracing for debugging
- **Health Checks** - Built-in health endpoints for monitoring

## Installation

### Prerequisites

- Rust 1.70+ ([Install Rust](https://rustup.rs/))
- RunPod API key ([Get your key](https://www.runpod.io/console/user/settings))

### Setup

1. Clone or navigate to the project:
   ```bash
   cd runpod-rust
   ```

2. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

3. Edit `.env` and add your RunPod API key:
   ```env
   RUNPOD_API_KEY=your_api_key_here
   PORT=3001
   ```

4. Build the project:
   ```bash
   cargo build --release
   ```

5. Run the service:
   ```bash
   cargo run --release
   ```

The service will start on `http://127.0.0.1:3001` by default.

## API Endpoints

### Health Check

**GET /health**

Check if the service is running.

```bash
curl http://localhost:3001/health
```

Response:
```json
{
  "healthy": true,
  "version": "0.1.0",
  "timestamp": "2025-10-07T10:00:00Z"
}
```

---

### Execute Endpoint

**POST /execute**

Execute a RunPod serverless endpoint.

**Synchronous Execution:**
```bash
curl -X POST http://localhost:3001/execute \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint_id": "your-endpoint-id",
    "input": {"prompt": "Hello world"},
    "sync": true,
    "timeout": 30000
  }'
```

Response:
```json
{
  "id": "job-123",
  "status": "COMPLETED",
  "output": {"result": "..."},
  "execution_time": 1234.5,
  "delay_time": 10.2
}
```

**Asynchronous Execution:**
```bash
curl -X POST http://localhost:3001/execute \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint_id": "your-endpoint-id",
    "input": {"prompt": "Hello world"},
    "sync": false,
    "timeout": 30000
  }'
```

Response:
```json
{
  "id": "job-123",
  "status": "IN_QUEUE"
}
```

---

### Get Job Status

**GET /status/:endpoint_id/:job_id**

Check the status of an asynchronous job.

```bash
curl http://localhost:3001/status/your-endpoint-id/job-123
```

Response:
```json
{
  "id": "job-123",
  "status": "COMPLETED",
  "output": {"result": "..."},
  "execution_time": 1234.5,
  "delay_time": 10.2
}
```

Possible status values:
- `IN_QUEUE` - Job is waiting to be processed
- `IN_PROGRESS` - Job is currently running
- `COMPLETED` - Job finished successfully
- `FAILED` - Job failed with error
- `CANCELLED` - Job was cancelled

---

### Cancel Job

**POST /cancel/:endpoint_id/:job_id**

Cancel a running or queued job.

```bash
curl -X POST http://localhost:3001/cancel/your-endpoint-id/job-123
```

Response:
```json
{
  "id": "job-123",
  "status": "CANCELLED"
}
```

---

### Poll Job Until Complete

**POST /poll/:endpoint_id/:job_id**

Poll a job status until it completes or times out.

```bash
curl -X POST http://localhost:3001/poll/your-endpoint-id/job-123 \
  -H "Content-Type: application/json" \
  -d '{
    "max_wait_time": 300000,
    "poll_interval": 2000
  }'
```

Request body (optional):
- `max_wait_time` - Maximum time to wait in milliseconds (default: 300000 = 5 minutes)
- `poll_interval` - Time between status checks in milliseconds (default: 2000 = 2 seconds)

Response:
```json
{
  "id": "job-123",
  "status": "COMPLETED",
  "output": {"result": "..."},
  "execution_time": 1234.5,
  "delay_time": 10.2
}
```

---

### RunPod API Health Check

**GET /api-health**

Test connectivity to the RunPod API.

```bash
curl http://localhost:3001/api-health
```

Response:
```json
{
  "healthy": true
}
```

## Integration with Node.js Backend

The Rust service runs on port 3001 and can be called from your Node.js backend on port 3000:

```javascript
// Example: Call Rust service from Node.js
const axios = require('axios');

async function executeRunPodJob() {
  const response = await axios.post('http://localhost:3001/execute', {
    endpoint_id: 'your-endpoint-id',
    input: { prompt: 'Hello from Node.js' },
    sync: true,
    timeout: 30000
  });

  console.log('Result:', response.data);
}
```

## Configuration

Environment variables (`.env` file):

```env
# Required
RUNPOD_API_KEY=your_api_key_here

# Optional
RUNPOD_API_BASE=https://api.runpod.ai/v2
RUNPOD_DEFAULT_ENDPOINT_ID=
HOST=127.0.0.1
PORT=3001
RUST_LOG=info
```

### Logging Levels

Set `RUST_LOG` to control verbosity:
- `error` - Only errors
- `warn` - Warnings and errors
- `info` - General information (default)
- `debug` - Detailed debugging
- `trace` - Very verbose

Example:
```bash
RUST_LOG=debug cargo run
```

## Error Handling

The service returns appropriate HTTP status codes:

- `200 OK` - Request successful
- `400 Bad Request` - Invalid input/validation error
- `408 Request Timeout` - Job polling timeout
- `499 Client Closed Request` - Job was cancelled
- `500 Internal Server Error` - Server/configuration error
- `502 Bad Gateway` - Failed to communicate with RunPod API

Error response format:
```json
{
  "error": "Error message",
  "details": "Additional details (optional)"
}
```

## Testing

Run tests:
```bash
cargo test
```

Run with output:
```bash
cargo test -- --nocapture
```

## Performance

- Built on Tokio async runtime for high concurrency
- Efficient HTTP/2 with `reqwest` and `axum`
- Low memory footprint compared to Node.js
- Fast startup and response times

## Comparison with Node.js Client

| Feature | Node.js Client | Rust Service |
|---------|---------------|--------------|
| Language | JavaScript | Rust |
| Runtime | Node.js | Native binary |
| Type Safety | Weak (runtime) | Strong (compile-time) |
| Memory | ~50MB | ~5MB |
| Startup | ~500ms | ~10ms |
| Concurrency | Event loop | Tokio async |
| Deployment | Requires Node.js | Standalone binary |

## Deployment

### Development
```bash
cargo run
```

### Production
```bash
# Build optimized binary
cargo build --release

# Binary location
./target/release/runpod-rust

# Run with environment file
./target/release/runpod-rust
```

### Docker (Optional)

Create a `Dockerfile`:
```dockerfile
FROM rust:1.70 as builder
WORKDIR /app
COPY . .
RUN cargo build --release

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/target/release/runpod-rust /usr/local/bin/
EXPOSE 3001
CMD ["runpod-rust"]
```

Build and run:
```bash
docker build -t runpod-rust .
docker run -p 3001:3001 --env-file .env runpod-rust
```

## Troubleshooting

### Service won't start

1. Check if port 3001 is available:
   ```bash
   netstat -an | grep 3001
   ```

2. Verify API key is set:
   ```bash
   grep RUNPOD_API_KEY .env
   ```

3. Check logs:
   ```bash
   RUST_LOG=debug cargo run
   ```

### API errors

1. Test API connectivity:
   ```bash
   curl http://localhost:3001/api-health
   ```

2. Verify your RunPod API key at: https://www.runpod.io/console/user/settings

3. Check RunPod service status: https://status.runpod.io/

## Development

### Project Structure
```
runpod-rust/
├── Cargo.toml           # Dependencies and metadata
├── .env.example         # Environment template
├── README.md            # This file
├── src/
│   ├── main.rs          # Entry point and server setup
│   ├── config.rs        # Configuration loading
│   ├── error.rs         # Error types and handling
│   ├── models.rs        # Request/response models
│   ├── runpod.rs        # RunPod API client
│   └── routes.rs        # HTTP route handlers
└── tests/
    └── integration_test.rs
```

### Adding New Features

1. Add models to `src/models.rs`
2. Implement client methods in `src/runpod.rs`
3. Add route handlers in `src/routes.rs`
4. Register routes in `src/routes.rs::build_router()`
5. Add tests in `tests/`

## License

Part of the Case Management System project.

## Support

For issues or questions:
1. Check the logs with `RUST_LOG=debug`
2. Verify RunPod API status
3. Review the main project documentation

## Related Documentation

- [RunPod API Documentation](https://docs.runpod.io/)
- [Axum Web Framework](https://github.com/tokio-rs/axum)
- [Tokio Async Runtime](https://tokio.rs/)
