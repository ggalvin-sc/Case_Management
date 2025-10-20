# Rust Backend for Case Management System

## Quick Start

```bash
# 1. Navigate to directory
cd backend-rust

# 2. Build the project
cargo build

# 3. Run the server
cargo run

# 4. Access the API
# Server will be at http://localhost:3000
# Frontend will be served from http://localhost:3000/
```

## Current Implementation Status

### ✅ Completed
- Project structure with Cargo.toml
- Configuration module (config.rs)
- Error handling (error.rs)
- Database models (db/models.rs)
- Database connection pool (db/mod.rs)
- Authentication module (auth/mod.rs)
- Password hashing and validation

### 🚧 In Progress
- JWT token generation and validation (auth/jwt.rs)
- Authentication middleware (auth/middleware.rs)
- API route handlers (routes/)
- Main server setup (main.rs)

### 📋 To Do
- Complete all route handlers
- Integrate RunPod module
- Add Kimai API client
- Static file serving
- Comprehensive testing
- Performance benchmarking

## File Structure

```
backend-rust/
├── Cargo.toml           # Project dependencies
├── README.md            # This file
├── src/
│   ├── main.rs          # Server entry point (TO CREATE)
│   ├── lib.rs           # Library exports (TO CREATE)
│   ├── config.rs        # ✅ Configuration
│   ├── error.rs         # ✅ Error handling
│   ├── db/
│   │   ├── mod.rs       # ✅ Database module
│   │   └── models.rs    # ✅ Data models
│   ├── auth/
│   │   ├── mod.rs       # ✅ Auth module
│   │   ├── jwt.rs       # 🚧 JWT handling
│   │   └── middleware.rs # 🚧 Auth middleware
│   └── routes/          # 📋 API handlers
│       ├── mod.rs
│       ├── auth.rs
│       ├── dashboard.rs
│       ├── clients.rs
│       ├── matters.rs
│       └── ... (other routes)
```

## Next Steps

To complete the implementation, you need to create:

1. **auth/jwt.rs** - JWT token generation and validation
2. **auth/middleware.rs** - Axum middleware for auth
3. **routes/** - All API route handlers
4. **main.rs** - Server setup with Axum router

See `RUST_MIGRATION_GUIDE.md` in the project root for detailed implementation guide.

## Building and Running

### Development Mode
```bash
cargo run
```

### Release Mode (Optimized)
```bash
cargo run --release
```

### Running Tests
```bash
cargo test
```

### Checking Code
```bash
# Check for compilation errors
cargo check

# Format code
cargo fmt

# Lint code
cargo clippy
```

## Environment Variables

Create a `.env` file or use the root project `.env`:

```bash
# Required
JWT_SECRET=your-super-secret-jwt-key-here
DATABASE_URL=sqlite:../backend/billing.db

# Optional (with defaults)
APP_HOST=0.0.0.0
APP_PORT=3000
APP_ENV=development
ALLOWED_ORIGINS=http://localhost:8000,http://localhost:3000
```

## Database

Uses the existing SQLite database from the Node.js backend:
- Location: `../backend/billing.db`
- No migrations needed - uses existing schema
- Shared with Node.js backend during transition

## Dependencies

Key dependencies (see Cargo.toml for full list):
- **axum**: Web framework
- **sqlx**: Database with compile-time SQL verification
- **tokio**: Async runtime
- **jsonwebtoken**: JWT authentication
- **bcrypt**: Password hashing
- **tower-http**: CORS, logging, file serving
- **reqwest**: HTTP client for external APIs

## Performance

Expected improvements over Node.js:
- 5-10x lower memory usage
- 2-3x higher request throughput
- 30-50% faster response times
- Better concurrency handling

## Troubleshooting

### Build Errors

**Missing dependencies:**
```bash
cargo build
# This will download and compile all dependencies
```

**SQLx compile-time verification errors:**
```bash
# Set offline mode for development
export SQLX_OFFLINE=true
cargo build
```

### Runtime Errors

**Database not found:**
```bash
# Ensure billing.db exists
ls -la ../backend/billing.db

# Or update DATABASE_URL in .env
```

**Port already in use:**
```bash
# Change port in .env
echo "APP_PORT=8080" >> .env
```

## Development Workflow

1. Make changes to Rust code
2. Run `cargo check` to verify compilation
3. Run `cargo run` to test
4. Test endpoints with curl or frontend
5. Run `cargo test` before committing

## Deployment

### Building for Production

```bash
# Build optimized binary
cargo build --release

# Binary location
./target/release/backend-rust

# Run binary
./target/release/backend-rust
```

### Docker

See `RUST_MIGRATION_GUIDE.md` for Docker deployment instructions.

## Support

- See `RUST_MIGRATION_GUIDE.md` for comprehensive guide
- Check `../DEV_GUIDE.md` for API endpoint documentation
- Review `../backend/server.js` for Node.js implementation reference

---

**Created**: 2025-10-07
**Status**: Foundation complete, implementation in progress
**Version**: 1.0.0
