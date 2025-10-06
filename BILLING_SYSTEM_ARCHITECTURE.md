# Case Management Billing System - Architecture Plan

**Project:** Legal Case Management & Billing System
**Backend:** Rust API
**Database:** To be determined (PostgreSQL recommended)
**Frontend:** To be discussed
**Working Directory:** C:\Users\gregg\OneDrive\Documents\_code\Case_Management_2025-10-6

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Design Components (from Figma)](#2-design-components-from-figma)
3. [Database Architecture](#3-database-architecture)
4. [Rust API Backend Architecture](#4-rust-api-backend-architecture)
5. [Frontend Options & Recommendations](#5-frontend-options--recommendations)
6. [Integration with Kimai](#6-integration-with-kimai)
7. [Core Features & Modules](#7-core-features--modules)
8. [API Endpoints Specification](#8-api-endpoints-specification)
9. [Security & Authentication](#9-security--authentication)
10. [Development Roadmap](#10-development-roadmap)
11. [Technology Stack](#11-technology-stack)

---

## 1. System Overview

### Purpose
Build a comprehensive case management and billing system for legal professionals that integrates time tracking, expense management, matter (case) management, and invoicing.

### Key Requirements
- **Time Tracking Integration** - Connect with Kimai for time entry
- **Matter Management** - Track cases/matters with clients
- **Billing & Invoicing** - Generate invoices from time entries and expenses
- **Expense Tracking** - Record and categorize expenses per matter
- **Reporting** - Dashboard with analytics and insights
- **Multi-user Support** - Handle multiple attorneys/staff with different roles

### Figma Design Files
1. **Dashboard.fig** - Main overview/analytics screen
2. **Matters.fig** - List view of all matters/cases
3. **Matter_detail.fig** - Individual matter details
4. **Billing_Entry.fig** - Time/fee entry interface
5. **Expenses.fig** - Expense tracking and management

---

## 2. Design Components (from Figma)

### 2.1 Dashboard
**Assumed Components:**
- Active matters count
- Total unbilled time
- Total unbilled expenses
- Recent activity feed
- Revenue metrics (this month, this year)
- Time entry summary by attorney
- Upcoming deadlines/tasks
- Quick actions (new matter, new time entry, new expense)

### 2.2 Matters List
**Assumed Components:**
- Searchable/filterable table of matters
- Columns: Matter #, Client Name, Matter Name, Status, Assigned Attorney, Open Date, Unbilled Amount
- Filters: Status (Active/Closed), Attorney, Client, Date Range
- Sorting capabilities
- Actions: View, Edit, Archive
- Create new matter button

### 2.3 Matter Detail
**Assumed Components:**
- Matter header (client, matter name, description, status)
- Tabs:
  - Overview (summary, billing info, rates)
  - Time Entries (list of billable time)
  - Expenses (list of expenses)
  - Invoices (generated invoices)
  - Documents (attachments)
  - Notes
- Financial summary (total billed, unbilled, paid, outstanding)
- Activity timeline

### 2.4 Billing Entry
**Assumed Components:**
- Date/time picker
- Matter selection (dropdown/autocomplete)
- Activity/task type selection
- Description field (rich text)
- Duration entry (hours/minutes or start/end time)
- Rate (hourly or flat fee)
- Billable/non-billable toggle
- Attorney/staff selection
- Save as draft / Submit

### 2.5 Expenses
**Assumed Components:**
- Expense list/table
- Add expense form:
  - Date
  - Matter selection
  - Expense category (filing fees, travel, copies, etc.)
  - Description
  - Amount
  - Receipt upload
  - Billable/non-billable
  - Reimbursable toggle
- Total expenses summary
- Export functionality

---

## 3. Database Architecture

### 3.1 Database Choice: PostgreSQL

**Why PostgreSQL:**
- Excellent Rust support (sqlx, diesel)
- JSONB for flexible metadata
- Strong ACID compliance (critical for billing)
- Advanced features (CTEs, window functions for reporting)
- Full-text search capabilities
- Robust transaction support

### 3.2 Schema Design

#### Core Tables

**users**
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL, -- 'admin', 'attorney', 'paralegal', 'billing_clerk'
    hourly_rate DECIMAL(10, 2),
    kimai_user_id INTEGER, -- Link to Kimai user
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

**clients**
```sql
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    client_number VARCHAR(50) UNIQUE NOT NULL,
    contact_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    billing_address TEXT,
    tax_id VARCHAR(50),
    kimai_customer_id INTEGER, -- Link to Kimai customer
    notes TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clients_client_number ON clients(client_number);
CREATE INDEX idx_clients_name ON clients(name);
```

**matters**
```sql
CREATE TABLE matters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matter_number VARCHAR(50) UNIQUE NOT NULL,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    matter_type VARCHAR(100), -- 'litigation', 'corporate', 'real_estate', etc.
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active', 'closed', 'on_hold', 'archived'
    responsible_attorney_id UUID REFERENCES users(id),
    originating_attorney_id UUID REFERENCES users(id),
    open_date DATE NOT NULL,
    close_date DATE,
    billing_type VARCHAR(50) NOT NULL, -- 'hourly', 'flat_fee', 'contingency', 'mixed'
    hourly_rate DECIMAL(10, 2),
    flat_fee_amount DECIMAL(10, 2),
    contingency_percentage DECIMAL(5, 2),
    retainer_amount DECIMAL(10, 2),
    trust_balance DECIMAL(10, 2) DEFAULT 0,
    kimai_project_id INTEGER, -- Link to Kimai project
    metadata JSONB, -- Flexible storage for custom fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_matters_matter_number ON matters(matter_number);
CREATE INDEX idx_matters_client_id ON matters(client_id);
CREATE INDEX idx_matters_status ON matters(status);
CREATE INDEX idx_matters_responsible_attorney ON matters(responsible_attorney_id);
```

**time_entries**
```sql
CREATE TABLE time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matter_id UUID NOT NULL REFERENCES matters(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES users(id),
    entry_date DATE NOT NULL,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    duration_minutes INTEGER NOT NULL,
    description TEXT NOT NULL,
    activity_code VARCHAR(50), -- 'research', 'drafting', 'court', 'meeting', etc.
    hourly_rate DECIMAL(10, 2) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    billable BOOLEAN DEFAULT true,
    billed BOOLEAN DEFAULT false,
    invoice_id UUID REFERENCES invoices(id),
    kimai_timesheet_id INTEGER, -- Link to Kimai timesheet
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_time_entries_matter_id ON time_entries(matter_id);
CREATE INDEX idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX idx_time_entries_entry_date ON time_entries(entry_date);
CREATE INDEX idx_time_entries_billable ON time_entries(billable);
CREATE INDEX idx_time_entries_billed ON time_entries(billed);
CREATE INDEX idx_time_entries_invoice_id ON time_entries(invoice_id);
```

**expenses**
```sql
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matter_id UUID NOT NULL REFERENCES matters(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES users(id),
    expense_date DATE NOT NULL,
    category VARCHAR(100) NOT NULL, -- 'filing_fees', 'travel', 'copies', 'postage', etc.
    description TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    markup_percentage DECIMAL(5, 2) DEFAULT 0,
    billed_amount DECIMAL(10, 2) NOT NULL,
    billable BOOLEAN DEFAULT true,
    reimbursable BOOLEAN DEFAULT false,
    billed BOOLEAN DEFAULT false,
    invoice_id UUID REFERENCES invoices(id),
    receipt_url VARCHAR(500),
    vendor VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_expenses_matter_id ON expenses(matter_id);
CREATE INDEX idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX idx_expenses_billed ON expenses(billed);
CREATE INDEX idx_expenses_invoice_id ON expenses(invoice_id);
```

**invoices**
```sql
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    matter_id UUID NOT NULL REFERENCES matters(id) ON DELETE RESTRICT,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft', -- 'draft', 'sent', 'paid', 'partial', 'overdue', 'void'
    subtotal_time DECIMAL(10, 2) NOT NULL DEFAULT 0,
    subtotal_expenses DECIMAL(10, 2) NOT NULL DEFAULT 0,
    subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    tax_amount DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,
    paid_amount DECIMAL(10, 2) DEFAULT 0,
    balance_due DECIMAL(10, 2) NOT NULL,
    notes TEXT,
    terms TEXT,
    sent_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_matter_id ON invoices(matter_id);
CREATE INDEX idx_invoices_client_id ON invoices(client_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_invoice_date ON invoices(invoice_date);
```

**payments**
```sql
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
    payment_date DATE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50), -- 'check', 'wire', 'credit_card', 'trust_transfer'
    reference_number VARCHAR(100),
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX idx_payments_payment_date ON payments(payment_date);
```

**activity_codes**
```sql
CREATE TABLE activity_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    default_billable BOOLEAN DEFAULT true,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**expense_categories**
```sql
CREATE TABLE expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    default_markup_percentage DECIMAL(5, 2) DEFAULT 0,
    default_billable BOOLEAN DEFAULT true,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 4. Rust API Backend Architecture

### 4.1 Technology Stack

**Core Framework:**
- **axum** - Modern, ergonomic web framework (recommended)
  - OR **actix-web** - High performance alternative
  - OR **rocket** - Developer-friendly alternative

**Database:**
- **sqlx** - Async SQL toolkit with compile-time checking
  - OR **diesel** - Type-safe ORM (synchronous)

**Authentication:**
- **jsonwebtoken** - JWT token handling
- **argon2** - Password hashing

**Serialization:**
- **serde** - Serialization/deserialization
- **serde_json** - JSON support

**Validation:**
- **validator** - Input validation

**Date/Time:**
- **chrono** - Date and time handling

**UUID:**
- **uuid** - UUID generation

**HTTP Client:**
- **reqwest** - For Kimai API integration

**Environment:**
- **dotenvy** - Environment variable loading

**Configuration:**
- **config** - Configuration management

**Logging:**
- **tracing** - Structured logging
- **tracing-subscriber** - Log output

**Testing:**
- **tokio-test** - Async testing utilities

### 4.2 Project Structure

```
billing-api/
├── Cargo.toml
├── .env.example
├── .env
├── migrations/
│   ├── 001_create_users.sql
│   ├── 002_create_clients.sql
│   ├── 003_create_matters.sql
│   ├── 004_create_time_entries.sql
│   ├── 005_create_expenses.sql
│   └── 006_create_invoices.sql
├── src/
│   ├── main.rs
│   ├── lib.rs
│   ├── config.rs
│   ├── error.rs
│   ├── models/
│   │   ├── mod.rs
│   │   ├── user.rs
│   │   ├── client.rs
│   │   ├── matter.rs
│   │   ├── time_entry.rs
│   │   ├── expense.rs
│   │   └── invoice.rs
│   ├── handlers/
│   │   ├── mod.rs
│   │   ├── auth.rs
│   │   ├── users.rs
│   │   ├── clients.rs
│   │   ├── matters.rs
│   │   ├── time_entries.rs
│   │   ├── expenses.rs
│   │   └── invoices.rs
│   ├── services/
│   │   ├── mod.rs
│   │   ├── auth_service.rs
│   │   ├── matter_service.rs
│   │   ├── billing_service.rs
│   │   ├── invoice_service.rs
│   │   └── kimai_service.rs
│   ├── db/
│   │   ├── mod.rs
│   │   └── pool.rs
│   ├── middleware/
│   │   ├── mod.rs
│   │   ├── auth.rs
│   │   └── logging.rs
│   ├── routes/
│   │   ├── mod.rs
│   │   ├── api_v1.rs
│   │   └── health.rs
│   └── utils/
│       ├── mod.rs
│       ├── jwt.rs
│       └── validation.rs
└── tests/
    ├── integration/
    │   ├── auth_tests.rs
    │   ├── matter_tests.rs
    │   └── billing_tests.rs
    └── common/
        └── mod.rs
```

### 4.3 Key Code Examples

#### Cargo.toml
```toml
[package]
name = "billing-api"
version = "0.1.0"
edition = "2021"

[dependencies]
# Web framework
axum = "0.7"
tokio = { version = "1", features = ["full"] }
tower = "0.4"
tower-http = { version = "0.5", features = ["cors", "trace"] }

# Database
sqlx = { version = "0.7", features = ["runtime-tokio-rustls", "postgres", "uuid", "chrono", "json"] }

# Serialization
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"

# Authentication
jsonwebtoken = "9"
argon2 = "0.5"

# Validation
validator = { version = "0.18", features = ["derive"] }

# Date/Time
chrono = { version = "0.4", features = ["serde"] }

# UUID
uuid = { version = "1.0", features = ["v4", "serde"] }

# HTTP Client (for Kimai)
reqwest = { version = "0.11", features = ["json"] }

# Environment
dotenvy = "0.15"

# Configuration
config = "0.14"

# Logging
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }

# Error handling
anyhow = "1.0"
thiserror = "1.0"

[dev-dependencies]
tokio-test = "0.4"
```

#### src/main.rs
```rust
use axum::{
    Router,
    routing::{get, post},
};
use sqlx::postgres::PgPoolOptions;
use std::net::SocketAddr;
use tower_http::cors::CorsLayer;
use tracing_subscriber;

mod config;
mod error;
mod models;
mod handlers;
mod services;
mod db;
mod middleware;
mod routes;
mod utils;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize tracing
    tracing_subscriber::fmt::init();

    // Load configuration
    dotenvy::dotenv().ok();
    let config = config::Config::from_env()?;

    // Setup database connection pool
    let db_pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&config.database_url)
        .await?;

    // Run migrations
    sqlx::migrate!("./migrations").run(&db_pool).await?;

    // Build application state
    let app_state = AppState {
        db: db_pool,
        config: config.clone(),
    };

    // Build router
    let app = Router::new()
        .route("/health", get(routes::health::health_check))
        .nest("/api/v1", routes::api_v1::routes(app_state.clone()))
        .layer(CorsLayer::permissive())
        .layer(middleware::logging::logging_middleware());

    // Start server
    let addr = SocketAddr::from(([0, 0, 0, 0], config.port));
    tracing::info!("Listening on {}", addr);

    axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await?;

    Ok(())
}

#[derive(Clone)]
pub struct AppState {
    pub db: sqlx::PgPool,
    pub config: config::Config,
}
```

#### src/models/matter.rs
```rust
use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use validator::Validate;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Matter {
    pub id: Uuid,
    pub matter_number: String,
    pub client_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub matter_type: Option<String>,
    pub status: String,
    pub responsible_attorney_id: Option<Uuid>,
    pub originating_attorney_id: Option<Uuid>,
    pub open_date: NaiveDate,
    pub close_date: Option<NaiveDate>,
    pub billing_type: String,
    pub hourly_rate: Option<rust_decimal::Decimal>,
    pub flat_fee_amount: Option<rust_decimal::Decimal>,
    pub contingency_percentage: Option<rust_decimal::Decimal>,
    pub retainer_amount: Option<rust_decimal::Decimal>,
    pub trust_balance: rust_decimal::Decimal,
    pub kimai_project_id: Option<i32>,
    pub metadata: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct CreateMatterRequest {
    #[validate(length(min = 1, max = 255))]
    pub name: String,
    pub client_id: Uuid,
    pub description: Option<String>,
    pub matter_type: Option<String>,
    pub responsible_attorney_id: Option<Uuid>,
    pub open_date: NaiveDate,
    #[validate(length(min = 1, max = 50))]
    pub billing_type: String,
    pub hourly_rate: Option<rust_decimal::Decimal>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateMatterRequest {
    #[validate(length(min = 1, max = 255))]
    pub name: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub responsible_attorney_id: Option<Uuid>,
    pub close_date: Option<NaiveDate>,
    pub hourly_rate: Option<rust_decimal::Decimal>,
}
```

#### src/handlers/matters.rs
```rust
use axum::{
    extract::{Path, State, Query},
    http::StatusCode,
    Json,
};
use uuid::Uuid;
use validator::Validate;

use crate::{
    error::ApiError,
    models::matter::{Matter, CreateMatterRequest, UpdateMatterRequest},
    services::matter_service,
    AppState,
};

pub async fn list_matters(
    State(state): State<AppState>,
    Query(params): Query<ListMattersQuery>,
) -> Result<Json<Vec<Matter>>, ApiError> {
    let matters = matter_service::list_matters(&state.db, params).await?;
    Ok(Json(matters))
}

pub async fn get_matter(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Matter>, ApiError> {
    let matter = matter_service::get_matter_by_id(&state.db, id).await?;
    Ok(Json(matter))
}

pub async fn create_matter(
    State(state): State<AppState>,
    Json(payload): Json<CreateMatterRequest>,
) -> Result<(StatusCode, Json<Matter>), ApiError> {
    payload.validate()?;
    let matter = matter_service::create_matter(&state.db, payload).await?;
    Ok((StatusCode::CREATED, Json(matter)))
}

pub async fn update_matter(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateMatterRequest>,
) -> Result<Json<Matter>, ApiError> {
    payload.validate()?;
    let matter = matter_service::update_matter(&state.db, id, payload).await?;
    Ok(Json(matter))
}

pub async fn delete_matter(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    matter_service::delete_matter(&state.db, id).await?;
    Ok(StatusCode::NO_CONTENT)
}
```

---

## 5. Frontend Options & Recommendations

### 5.1 Selected Option: Vanilla HTML/CSS/JavaScript with Tailwind CSS ✅

**Why This Choice:**
- **Zero build tools** - No npm, webpack, or compilation needed
- **Immediate development** - Just open HTML files in browser
- **Easy to understand** - Simple, straightforward code
- **Fast iteration** - Edit and refresh to see changes
- **No dependencies** - Uses CDN for Tailwind and Font Awesome
- **Perfect for rapid prototyping** - Get working UI in minutes
- **Easy deployment** - Just upload files to any web server
- **Low barrier to entry** - Anyone can edit HTML/CSS/JS

**Tech Stack:**
- **HTML5** - Structure
- **Vanilla JavaScript** - Logic (no framework overhead)
- **Tailwind CSS** - Styling via CDN
- **Font Awesome** - Icons via CDN
- **No build process** - Direct browser execution

**Project Structure:**
```
frontend/
├── index.html              # Dashboard
├── login.html              # Login page
├── js/
│   ├── api.js             # API client wrapper
│   └── auth.js            # Authentication utilities
└── pages/
    ├── matters.html       # Matters list & create
    ├── matter-detail.html # Matter details with tabs
    ├── billing.html       # Time entry form
    └── expenses.html      # Expense tracking
```

**Features Implemented:**
- ✅ Dashboard with stats and activity
- ✅ Matter management (list, create, detail)
- ✅ Time entry with duration calculator and timer
- ✅ Expense tracking with markup calculation
- ✅ Authentication (login/logout)
- ✅ Simple API client
- ✅ Responsive design with Tailwind
- ✅ No build tools required

### 5.2 Alternative Options (Not Selected)

**Option: React + TypeScript + Vite**
- More complex setup required
- Build tools needed
- Better for larger teams
- TypeScript adds type safety

**Option: Next.js 14**
- Server-side rendering
- SEO benefits
- More overhead for simple app

**Option: Leptos (Rust Frontend)**
- Full-stack Rust
- WebAssembly compilation
- Steeper learning curve

---

## 6. Integration with Kimai

### 6.1 Sync Strategy

**Two-Way Sync:**
1. **Kimai → Billing System** (Primary)
   - Time entries from Kimai sync to billing system
   - Use Kimai as time tracking interface
   - Polling or webhook-based sync

2. **Billing System → Kimai** (Optional)
   - Create customers/projects in Kimai when matters created
   - Bidirectional sync for consistency

### 6.2 Sync Service (Rust)

```rust
use reqwest::Client;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone)]
pub struct KimaiService {
    client: Client,
    base_url: String,
    api_token: String,
}

impl KimaiService {
    pub fn new(base_url: String, api_token: String) -> Self {
        Self {
            client: Client::new(),
            base_url,
            api_token,
        }
    }

    pub async fn get_timesheets(
        &self,
        begin: &str,
        end: &str,
    ) -> Result<Vec<KimaiTimesheet>, Box<dyn std::error::Error>> {
        let url = format!("{}/api/timesheets", self.base_url);

        let response = self.client
            .get(&url)
            .header("Authorization", format!("Bearer {}", self.api_token))
            .query(&[("begin", begin), ("end", end)])
            .send()
            .await?;

        let timesheets = response.json::<Vec<KimaiTimesheet>>().await?;
        Ok(timesheets)
    }

    pub async fn create_project(
        &self,
        customer_id: i32,
        name: &str,
    ) -> Result<KimaiProject, Box<dyn std::error::Error>> {
        let url = format!("{}/api/projects", self.base_url);

        let payload = serde_json::json!({
            "customer": customer_id,
            "name": name,
            "visible": true,
            "billable": true,
        });

        let response = self.client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.api_token))
            .json(&payload)
            .send()
            .await?;

        let project = response.json::<KimaiProject>().await?;
        Ok(project)
    }

    pub async fn sync_timesheets_to_billing(
        &self,
        db: &sqlx::PgPool,
    ) -> Result<usize, Box<dyn std::error::Error>> {
        // Get last sync timestamp
        let last_sync = get_last_sync_timestamp(db).await?;

        // Fetch timesheets since last sync
        let timesheets = self.get_timesheets(&last_sync, "now").await?;

        let mut synced_count = 0;

        for timesheet in timesheets {
            // Check if already synced
            let exists = check_timesheet_exists(db, timesheet.id).await?;

            if !exists {
                // Convert and insert
                create_time_entry_from_kimai(db, &timesheet).await?;
                synced_count += 1;
            }
        }

        // Update last sync timestamp
        update_last_sync_timestamp(db).await?;

        Ok(synced_count)
    }
}

#[derive(Debug, Deserialize)]
struct KimaiTimesheet {
    id: i32,
    begin: String,
    end: Option<String>,
    duration: i32,
    description: String,
    project: i32,
    activity: i32,
    user: i32,
    rate: f64,
}
```

---

## 7. Core Features & Modules

### 7.1 Phase 1: MVP Features

**Must-Have:**
1. ✅ User authentication & authorization
2. ✅ Client management (CRUD)
3. ✅ Matter management (CRUD)
4. ✅ Time entry creation and editing
5. ✅ Expense tracking
6. ✅ Basic dashboard
7. ✅ Kimai time sync
8. ✅ Invoice generation (basic)

### 7.2 Phase 2: Enhanced Features

**Should-Have:**
1. Advanced reporting and analytics
2. Invoice customization and templates
3. Payment tracking
4. Trust accounting
5. Document management
6. Email notifications
7. Batch operations
8. Advanced search and filtering

### 7.3 Phase 3: Advanced Features

**Nice-to-Have:**
1. Automated billing rules
2. Conflict checking
3. Calendar integration
4. Mobile app
5. Client portal
6. Advanced permissions/roles
7. Audit logging
8. API webhooks

---

## 8. API Endpoints Specification

### 8.1 Authentication

```
POST   /api/v1/auth/register      - Register new user
POST   /api/v1/auth/login         - Login (returns JWT)
POST   /api/v1/auth/refresh       - Refresh token
POST   /api/v1/auth/logout        - Logout
GET    /api/v1/auth/me            - Get current user
```

### 8.2 Clients

```
GET    /api/v1/clients            - List clients
GET    /api/v1/clients/:id        - Get client
POST   /api/v1/clients            - Create client
PUT    /api/v1/clients/:id        - Update client
DELETE /api/v1/clients/:id        - Delete client
GET    /api/v1/clients/:id/matters - Get client matters
```

### 8.3 Matters

```
GET    /api/v1/matters            - List matters
GET    /api/v1/matters/:id        - Get matter details
POST   /api/v1/matters            - Create matter
PUT    /api/v1/matters/:id        - Update matter
DELETE /api/v1/matters/:id        - Delete matter
GET    /api/v1/matters/:id/time-entries - Get matter time entries
GET    /api/v1/matters/:id/expenses     - Get matter expenses
GET    /api/v1/matters/:id/invoices     - Get matter invoices
GET    /api/v1/matters/:id/summary      - Get financial summary
```

### 8.4 Time Entries

```
GET    /api/v1/time-entries       - List time entries
GET    /api/v1/time-entries/:id   - Get time entry
POST   /api/v1/time-entries       - Create time entry
PUT    /api/v1/time-entries/:id   - Update time entry
DELETE /api/v1/time-entries/:id   - Delete time entry
POST   /api/v1/time-entries/bulk  - Bulk create
```

### 8.5 Expenses

```
GET    /api/v1/expenses           - List expenses
GET    /api/v1/expenses/:id       - Get expense
POST   /api/v1/expenses           - Create expense
PUT    /api/v1/expenses/:id       - Update expense
DELETE /api/v1/expenses/:id       - Delete expense
POST   /api/v1/expenses/:id/receipt - Upload receipt
```

### 8.6 Invoices

```
GET    /api/v1/invoices           - List invoices
GET    /api/v1/invoices/:id       - Get invoice
POST   /api/v1/invoices           - Create invoice
PUT    /api/v1/invoices/:id       - Update invoice
DELETE /api/v1/invoices/:id       - Delete invoice
POST   /api/v1/invoices/:id/send  - Send invoice
POST   /api/v1/invoices/:id/payments - Record payment
GET    /api/v1/invoices/:id/pdf   - Download PDF
```

### 8.7 Dashboard

```
GET    /api/v1/dashboard/stats    - Get dashboard statistics
GET    /api/v1/dashboard/activity - Get recent activity
GET    /api/v1/dashboard/revenue  - Get revenue metrics
```

### 8.8 Sync

```
POST   /api/v1/sync/kimai/timesheets - Sync Kimai timesheets
POST   /api/v1/sync/kimai/projects   - Sync projects
GET    /api/v1/sync/status           - Get sync status
```

---

## 9. Security & Authentication

### 9.1 Authentication Flow

1. **User Login** → Username/password
2. **JWT Generation** → Access token (15 min) + Refresh token (7 days)
3. **Token Storage** → HTTP-only cookie or localStorage
4. **Protected Routes** → JWT middleware validates token
5. **Token Refresh** → Automatic refresh before expiry
6. **Logout** → Token blacklist or revocation

### 9.2 Role-Based Access Control (RBAC)

**Roles:**
- **Admin** - Full system access
- **Attorney** - Own matters + assigned matters
- **Paralegal** - Assigned matters (limited)
- **Billing Clerk** - View all, manage invoices
- **Client** - View own matters/invoices only

**Permission Checks:**
```rust
#[derive(Debug, Clone, PartialEq)]
pub enum Permission {
    ViewMatter,
    CreateMatter,
    EditMatter,
    DeleteMatter,
    ViewTimeEntry,
    CreateTimeEntry,
    EditOwnTimeEntry,
    EditAnyTimeEntry,
    DeleteTimeEntry,
    ViewInvoice,
    CreateInvoice,
    EditInvoice,
    SendInvoice,
    ViewClient,
    EditClient,
    ManageUsers,
    ViewReports,
}

pub fn check_permission(
    user_role: &str,
    permission: Permission,
) -> bool {
    match (user_role, permission) {
        ("admin", _) => true,
        ("attorney", Permission::ViewMatter) => true,
        ("attorney", Permission::CreateMatter) => true,
        // ... more rules
        _ => false,
    }
}
```

---

## 10. Development Roadmap

### Phase 1: Foundation (Weeks 1-4)

**Week 1: Setup & Database**
- [ ] Setup Rust project structure
- [ ] Configure PostgreSQL database
- [ ] Create database schema and migrations
- [ ] Setup development environment

**Week 2: Core Backend**
- [ ] Implement authentication system
- [ ] Create user management endpoints
- [ ] Implement client management
- [ ] Implement matter management

**Week 3: Billing Core**
- [ ] Create time entry endpoints
- [ ] Create expense endpoints
- [ ] Implement Kimai sync service
- [ ] Create basic invoice generation

**Week 4: Frontend Setup**
- [ ] Setup React + Vite project
- [ ] Implement authentication UI
- [ ] Create layout components
- [ ] Setup routing

### Phase 2: Core Features (Weeks 5-8)

**Week 5: Matter Management UI**
- [ ] Matters list page
- [ ] Matter detail page
- [ ] Create/edit matter forms
- [ ] Client selection UI

**Week 6: Time & Expenses UI**
- [ ] Billing entry form
- [ ] Time entry list/table
- [ ] Expense entry form
- [ ] Expense list/table

**Week 7: Dashboard & Reporting**
- [ ] Dashboard statistics
- [ ] Activity feed
- [ ] Basic reports
- [ ] Charts and visualizations

**Week 8: Invoice Generation**
- [ ] Invoice creation UI
- [ ] Invoice preview
- [ ] PDF generation
- [ ] Email sending

### Phase 3: Polish & Deploy (Weeks 9-10)

**Week 9: Testing & Refinement**
- [ ] Integration testing
- [ ] E2E testing
- [ ] Bug fixes
- [ ] Performance optimization

**Week 10: Deployment**
- [ ] Docker containerization
- [ ] CI/CD pipeline
- [ ] Production deployment
- [ ] Documentation

---

## 11. Technology Stack Summary

### Backend (Rust)
```
Framework:     axum
Database ORM:  sqlx
Database:      PostgreSQL
Auth:          jsonwebtoken + argon2
API Client:    reqwest (Kimai integration)
Validation:    validator
Logging:       tracing
```

### Frontend (Recommended)
```
Framework:     React 18
Language:      TypeScript
Build Tool:    Vite
Data Fetching: TanStack Query
Routing:       React Router
UI Library:    shadcn/ui + Tailwind CSS
State:         Zustand
Forms:         React Hook Form + Zod
```

### Infrastructure
```
Database:      PostgreSQL 15+
Cache:         Redis (optional)
File Storage:  S3 or local (receipts/documents)
Email:         SendGrid or AWS SES
Hosting:       Docker + Cloud (AWS/GCP/DigitalOcean)
```

---

## Next Steps

1. **Review Figma Designs** - Share screenshots or export Figma designs to PNG/PDF so we can align technical implementation with visual design

2. **Confirm Technology Choices**
   - Backend: Rust (confirmed)
   - Frontend: React vs Next.js vs other?
   - Database: PostgreSQL (recommended)?

3. **Define MVP Scope** - Which features are critical for initial release?

4. **Setup Development Environment** - Install tools, create projects, setup database

5. **Start Development** - Begin with Phase 1, Week 1 tasks

---

## Questions to Discuss

1. **Figma Designs** - Can you share screenshots or exports of the Figma files?

2. **Frontend Framework** - Do you have a preference? React recommended, but open to alternatives.

3. **Hosting/Deployment** - Where will this be deployed? (Cloud, on-premise, local?)

4. **Kimai Integration** - Bidirectional sync or one-way (Kimai → Billing)?

5. **Multi-tenancy** - Single firm or need to support multiple law firms?

6. **Payment Processing** - Need credit card processing integration? (Stripe, Square?)

7. **Document Management** - How important is document storage/management?

8. **Email Integration** - Need email sending for invoices/notifications?

9. **Existing Systems** - Any other systems to integrate with?

10. **Team Size** - Who will be working on this? Solo or team?

---

**Next Action:** Please share your thoughts on the architecture plan and any screenshots/exports of the Figma designs so we can refine the technical implementation to match your visual design.
