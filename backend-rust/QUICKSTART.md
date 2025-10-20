# Rust Backend - Quick Start Guide

## Current Status

✅ **Foundation Complete** - The Rust backend structure is ready with:
- Project configuration and dependencies
- Database models and SQLx integration
- JWT authentication system
- All route definitions (some with stub implementations)
- Error handling and logging
- CORS and security middleware

⚠️ **Needs Completion** - Some route handlers have TODO stubs and need full implementation.

## Prerequisites

1. **Rust** (1.70 or later):
   ```bash
   # Install Rust
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

   # Verify installation
   rustc --version
   cargo --version
   ```

2. **Existing database**:
   - Ensure `backend/billing.db` exists
   - The Rust backend uses the same database as Node.js

## Build and Run

### Step 1: Navigate to Project
```bash
cd backend-rust
```

### Step 2: Build the Project
```bash
# This will download dependencies and compile (first time takes 5-10 minutes)
cargo build

# Or build with optimizations (slower build, faster runtime)
cargo build --release
```

### Step 3: Set Environment Variables
The backend uses `.env` from the project root. Ensure these variables are set:

```bash
# Required
JWT_SECRET=your-super-secret-jwt-key-here
DATABASE_URL=sqlite:../backend/billing.db

# Optional (with defaults)
APP_HOST=0.0.0.0
APP_PORT=3000
```

### Step 4: Run the Server
```bash
# Development mode (with debug logging)
cargo run

# OR production mode (optimized)
cargo run --release
```

### Step 5: Test the API
```bash
# Health check
curl http://localhost:3000/health

# Login (get JWT token)
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'

# Use token for authenticated requests
curl http://localhost:3000/api/v1/clients \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## What Works Now

### ✅ Fully Implemented
- **POST /api/v1/auth/login** - User authentication with JWT
- **GET /api/v1/auth/me** - Get current user info
- **POST /api/v1/auth/change-password** - Change password
- **GET /api/v1/clients** - List all clients
- **GET /api/v1/clients/:id** - Get single client
- **POST /api/v1/clients** - Create new client
- **GET /api/v1/matters** - List all matters
- **GET /api/v1/matters/:id** - Get single matter
- **GET /api/v1/users** - List users
- **GET /api/v1/time-entries** - List time entries
- **GET /api/v1/expenses** - List expenses
- **GET /api/v1/invoices** - List invoices
- **GET /api/v1/invoices/:id** - Get single invoice
- **GET /api/v1/firm-settings** - Get firm settings
- **GET /health** - Health check

### 🚧 Stub Implementations (TODO)
These endpoints exist but return placeholder responses:
- Matter creation and updates
- Time entry creation and updates
- Expense creation
- Invoice creation, updates, and workflow (finalize, send, payment)
- Firm settings updates
- Kimai sync

## Next Steps to Complete

1. **Implement remaining route handlers**:
   - Copy business logic from `../backend/server.js`
   - Convert Node.js SQL to Rust SQLx queries
   - Each TODO comment marks where implementation is needed

2. **Add authentication middleware to routes**:
   - Currently disabled to allow testing
   - Uncomment `.layer(middleware::from_fn_with_state(...))` in main.rs

3. **Test thoroughly**:
   - Test each endpoint with curl or Postman
   - Compare responses with Node.js backend
   - Verify database changes

4. **Add RunPod integration**:
   - Copy modules from `../runpod-rust/src/`
   - Add RunPod routes to router

5. **Add Kimai client**:
   - Implement HTTP client for Kimai API
   - Add sync functionality

## Development Workflow

```bash
# Check for compilation errors (fast)
cargo check

# Run tests
cargo test

# Format code
cargo fmt

# Lint code
cargo clippy

# Watch for changes and auto-reload (install cargo-watch first)
cargo install cargo-watch
cargo watch -x run
```

## Troubleshooting

### Build Errors

**Error: `could not compile`**
- Read the error message carefully
- Check for typos in code
- Ensure all imports are correct

**Error: `cannot find type`**
- Check module imports
- Ensure types are public (`pub`)
- Check spelling and module paths

### Runtime Errors

**Error: `JWT_SECRET not configured`**
```bash
# Add to .env file
echo 'JWT_SECRET=my-secret-key-123456' >> ../.env
```

**Error: `failed to connect to database`**
```bash
# Check database exists
ls -la ../backend/billing.db

# Check DATABASE_URL
grep DATABASE_URL ../.env
```

**Error: `Address already in use`**
```bash
# Node.js backend is still running on port 3000
# Stop it or change Rust port
echo 'APP_PORT=8080' >> ../.env
```

## Migration from Node.js

### Side-by-Side Testing
Run both backends simultaneously:

1. **Terminal 1 - Node.js (port 3000)**:
   ```bash
   cd backend
   node server.js
   ```

2. **Terminal 2 - Rust (port 8080)**:
   ```bash
   cd backend-rust
   APP_PORT=8080 cargo run
   ```

3. **Compare responses**:
   ```bash
   # Node.js
   curl http://localhost:3000/api/v1/clients

   # Rust
   curl http://localhost:8080/api/v1/clients
   ```

### Switching Frontend
Once Rust backend is complete and tested:

1. Stop Node.js backend
2. Start Rust backend on port 3000
3. Frontend will automatically connect to Rust backend

## File Structure Reference

```
backend-rust/
├── Cargo.toml              # Dependencies
├── README.md               # Detailed guide
├── QUICKSTART.md          # This file
├── src/
│   ├── main.rs            # Server entry point ✅
│   ├── lib.rs             # Library exports ✅
│   ├── config.rs          # Configuration ✅
│   ├── error.rs           # Error handling ✅
│   ├── db/
│   │   ├── mod.rs         # Database module ✅
│   │   └── models.rs      # Data models ✅
│   ├── auth/
│   │   ├── mod.rs         # Auth module ✅
│   │   ├── jwt.rs         # JWT handling ✅
│   │   └── middleware.rs  # Auth middleware ✅
│   └── routes/
│       ├── mod.rs         # Route module ✅
│       ├── auth.rs        # Auth routes ✅
│       ├── clients.rs     # Client routes ✅
│       ├── matters.rs     # Matter routes 🚧
│       ├── users.rs       # User routes ✅
│       ├── time_entries.rs # Time routes 🚧
│       ├── expenses.rs    # Expense routes 🚧
│       ├── invoices.rs    # Invoice routes 🚧
│       ├── firm_settings.rs # Settings 🚧
│       ├── dashboard.rs   # Dashboard 🚧
│       └── sync.rs        # Kimai sync 🚧
```

✅ = Fully implemented
🚧 = Stub/partial implementation

## Performance Expectations

When fully implemented, expect:
- **Memory**: ~10-20 MB (vs ~50-100 MB for Node.js)
- **Startup**: <1 second (vs ~2-3 seconds)
- **Response time**: 30-50% faster
- **Concurrent requests**: 2-3x higher throughput

## Need Help?

1. Check `RUST_MIGRATION_GUIDE.md` for detailed documentation
2. Review `../backend/server.js` for business logic reference
3. Check `../DEV_GUIDE.md` for API endpoint documentation
4. Read Axum docs: https://docs.rs/axum/
5. Read SQLx docs: https://docs.rs/sqlx/

---

**Created**: 2025-10-07
**Status**: Foundation complete, ready for implementation
**Next**: Complete TODO route handlers
