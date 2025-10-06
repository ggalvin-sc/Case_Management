# Case Management System - Developer Guide

**Last Updated:** October 6, 2025
**Version:** 1.0

---

## Quick Start

### Starting the System

```bash
# Terminal 1 - Backend
cd backend
node server.js

# Terminal 2 - Frontend
cd frontend
python -m http.server 8000
```

**Access:**
- Frontend: http://localhost:8000/login.html
- Backend API: http://localhost:3000/api/v1
- Kimai Server: https://kimai-glg-u11035.vm.elestio.app

**Login:**
- Email: `admin@example.com`
- Password: `password`

---

## Architecture Overview

### Technology Stack

**Frontend:**
- Vanilla HTML/CSS/JavaScript (no build tools)
- Tailwind CSS (via CDN)
- Font Awesome icons (via CDN)
- No frameworks - direct DOM manipulation

**Backend:**
- Node.js with built-in `http` module
- SQLite3 database (local file: `backend/billing.db`)
- RESTful API architecture
- CORS enabled for localhost

**External Integration:**
- Kimai Time Tracking API
- Token-based authentication to Kimai

---

## Database Connection

### Local SQLite Database

**Location:** `backend/billing.db`

**Connection Code (in server.js):**
```javascript
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(path.join(__dirname, 'billing.db'));
```

**Schema:**
```sql
-- Users table
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    role TEXT,
    kimai_user_id INTEGER
);

-- Clients table
CREATE TABLE clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    client_number TEXT UNIQUE,
    email TEXT,
    phone TEXT,
    address TEXT,
    kimai_customer_id INTEGER
);

-- Matters table
CREATE TABLE matters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    matter_number TEXT UNIQUE,
    client_id INTEGER,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active',
    attorney_id INTEGER,
    billing_type TEXT,
    hourly_rate DECIMAL(10,2),
    open_date DATE,
    close_date DATE,
    kimai_project_id INTEGER,
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (attorney_id) REFERENCES users(id)
);

-- Time entries table
CREATE TABLE time_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    matter_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    entry_date DATE NOT NULL,
    duration_minutes INTEGER NOT NULL,
    description TEXT NOT NULL,
    activity_code TEXT,
    hourly_rate DECIMAL(10,2),
    amount DECIMAL(10,2),
    billable BOOLEAN DEFAULT 1,
    billed BOOLEAN DEFAULT 0,
    kimai_timesheet_id INTEGER,
    FOREIGN KEY (matter_id) REFERENCES matters(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Expenses table
CREATE TABLE expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    matter_id INTEGER NOT NULL,
    expense_date DATE NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    vendor TEXT,
    amount DECIMAL(10,2) NOT NULL,
    markup_percentage DECIMAL(5,2),
    billed_amount DECIMAL(10,2),
    billable BOOLEAN DEFAULT 1,
    billed BOOLEAN DEFAULT 0,
    reimbursable BOOLEAN DEFAULT 0,
    receipt_url TEXT,
    invoice_id INTEGER,
    FOREIGN KEY (matter_id) REFERENCES matters(id),
    FOREIGN KEY (invoice_id) REFERENCES invoices(id)
);

-- Invoices table
CREATE TABLE invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_number TEXT UNIQUE,
    matter_id INTEGER NOT NULL,
    client_id INTEGER NOT NULL,
    issue_date DATE NOT NULL,
    due_date DATE,
    status TEXT DEFAULT 'draft',
    subtotal DECIMAL(10,2) DEFAULT 0,
    tax_rate DECIMAL(5,4) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    payment_terms TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    finalized_at TIMESTAMP,
    sent_at TIMESTAMP,
    paid_at TIMESTAMP,
    paid_amount DECIMAL(10,2) DEFAULT 0,
    FOREIGN KEY (matter_id) REFERENCES matters(id),
    FOREIGN KEY (client_id) REFERENCES clients(id)
);

-- Invoice line items table
CREATE TABLE invoice_line_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL,
    item_type TEXT NOT NULL,  -- 'time' or 'expense'
    item_id INTEGER,  -- Reference to time_entry or expense
    description TEXT NOT NULL,
    quantity DECIMAL(10,2) DEFAULT 1,
    rate DECIMAL(10,2) DEFAULT 0,
    amount DECIMAL(10,2) DEFAULT 0,
    line_order INTEGER DEFAULT 0,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id)
);
```

**Note:** Time entries also have an `invoice_id` column added to track which invoice they belong to.

**Helper Functions:**
```javascript
// Promisified database queries
function dbAll(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function dbGet(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function dbRun(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve({ id: this.lastID, changes: this.changes });
        });
    });
}
```

---

## Kimai API Integration

### Configuration

**Environment Variables (`.env` file):**
```bash
KIMAI_API_URL=https://kimai-glg-u11035.vm.elestio.app
KIMAI_API_TOKEN=00d1c3f02410b298ac3bc2624
```

### API Connection Code

**Making Requests:**
```javascript
const https = require('https');

function callKimaiAPI(path) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, KIMAI_API_URL);
        const options = {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${KIMAI_API_TOKEN}`,
                'Accept': 'application/json'
            }
        };

        https.get(url, options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}
```

**Common Kimai Endpoints:**
```javascript
// Get all customers
const customers = await callKimaiAPI('/api/customers');

// Get all projects (matters)
const projects = await callKimaiAPI('/api/projects');

// Get timesheets
const timesheets = await callKimaiAPI('/api/timesheets');

// Get activities for a specific project
const activities = await callKimaiAPI(`/api/activities?project=${projectId}`);

// Get user details
const user = await callKimaiAPI('/api/users/1');
```

**Syncing Data from Kimai:**
```bash
# Run sync script to import data from Kimai to local DB
cd backend
node sync-kimai.js
```

---

## API Endpoints Reference

### Base URL
`http://localhost:3000/api/v1`

### Authentication
```javascript
POST /auth/login
Body: { email, password }
Response: { token, user }

GET /auth/me
Headers: { Authorization: Bearer <token> }
Response: { id, email, first_name, last_name, role }
```

### Dashboard
```javascript
GET /dashboard/stats
Response: { activeMatters, unbilledHours, unbilledAmount, monthRevenue }

GET /dashboard/activity
Response: [{ type, description, timestamp }]
```

### Clients
```javascript
GET /clients
Response: [{ id, name, client_number, email, phone, address }]

POST /clients
Body: { name, email, phone, address }
```

### Matters
```javascript
GET /matters
Query: ?status=active&client_id=1
Response: [{ id, matter_number, client_id, name, status, unbilled_amount }]

GET /matters/:id
Response: { id, matter_number, client_id, client_name, name, description, status }

POST /matters
Body: { client_id, name, description, billing_type, hourly_rate, open_date }

GET /matters/:id/summary
Response: { total_billed, unbilled_time, unbilled_expenses, outstanding }

GET /matters/:id/time-entries
GET /matters/:id/expenses
GET /matters/:id/invoices
```

### Time Entries
```javascript
GET /time-entries
Query: ?billed=false&matter_id=1
Response: [{ id, matter_id, entry_date, duration_minutes, description, amount, billed }]

POST /time-entries
Body: {
    matter_id,
    entry_date,
    duration_minutes,
    description,
    activity_code,
    hourly_rate,
    billable
}
```

### Expenses
```javascript
GET /expenses
Query: ?billed=false&matter_id=1

POST /expenses
Body: {
    matter_id,
    expense_date,
    category,
    description,
    vendor,
    amount,
    markup_percentage,
    billable
}
```

### Invoices
```javascript
GET /invoices
Query: ?status=draft&matter_id=1&client_id=1
Response: [{
    id, invoice_number, matter_id, client_id,
    issue_date, due_date, status,
    subtotal, tax_amount, total_amount,
    client_name, matter_name, line_item_count
}]

GET /invoices/:id
Response: {
    ...invoice fields,
    line_items: [{
        id, item_type, description,
        quantity, rate, amount
    }]
}

POST /invoices
Body: {
    matter_id,
    client_id,
    time_entry_ids: [1, 2, 3],
    expense_ids: [1, 2],
    issue_date,
    due_date,
    notes,
    payment_terms
}
Response: { id, ...invoice }

POST /invoices/:id/finalize
# Locks invoice, generates invoice number, marks items as billed
Response: { ...updated invoice }

POST /invoices/:id/send
# Marks invoice as sent
Response: { ...updated invoice }

POST /invoices/:id/payment
Body: { amount, payment_date }
# Records payment, updates status to 'paid' when fully paid
Response: { ...updated invoice }

PATCH /invoices/:id/status
Body: { status: 'void' }
# Manually update invoice status

PATCH /invoices/:id
Body: { due_date, tax_rate, notes, payment_terms }
# Update invoice fields (draft/review only)

DELETE /invoices/:id
# Delete draft invoice

GET /matters/:id/unbilled
# Get unbilled time entries and expenses for a matter
Response: {
    time_entries: [...],
    expenses: [...]
}
```

**Invoice Workflow:**
1. **Draft** → Can edit, add/remove items, delete
2. **Review** → Ready for review, can still edit
3. **Finalized** → Locked, invoice number assigned, items marked as billed
4. **Sent** → Marked as sent to client
5. **Paid** → Payment recorded, full or partial
6. **Void** → Cancelled invoice

### Time Entry Updates
```javascript
PATCH /time-entries/:id
Body: { billed: true, invoice_id: 123 }
# Mark time entry as billed and link to invoice
```

### Kimai Sync
```javascript
POST /sync/kimai/timesheets
Response: { count, message }
```

---

## Frontend Architecture

### File Structure
```
frontend/
├── index.html              # Dashboard
├── login.html              # Login page
├── js/
│   ├── api.js             # API client wrapper
│   └── auth.js            # Authentication helper
└── pages/
    ├── matters.html        # Matters list
    ├── matter-detail.html  # Matter details with tabs
    ├── billing.html        # Time entry form
    ├── expenses.html       # Expense tracking
    ├── unbilled-time.html  # Unbilled time management
    ├── invoices.html       # Invoice list with filters
    └── invoice-detail.html # Invoice detail and workflow
```

### API Client (`js/api.js`)

```javascript
const API_BASE_URL = 'http://localhost:3000/api/v1';

const api = {
    async get(endpoint, params = {}) {
        const url = new URL(API_BASE_URL + endpoint);
        Object.keys(params).forEach(key =>
            url.searchParams.append(key, params[key])
        );

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.status === 401) {
            window.location.href = '/login.html';
            return;
        }

        return await response.json();
    },

    async post(endpoint, data) {
        const response = await fetch(API_BASE_URL + endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(data)
        });

        if (response.status === 401) {
            window.location.href = '/login.html';
            return;
        }

        return await response.json();
    },

    async patch(endpoint, data) { /* similar to post */ },
    async delete(endpoint) { /* similar to get */ }
};
```

### Authentication (`js/auth.js`)

```javascript
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login.html';
        return false;
    }
    return true;
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
}
```

---

## Common Development Patterns

### Table with Search and Sort

**HTML Structure:**
```html
<!-- Search bar -->
<div class="mb-4">
    <div class="relative">
        <input type="text" id="searchInput" placeholder="Search..."
               class="w-full border border-gray-300 rounded-md pl-10 pr-3 py-2">
        <i class="fas fa-search absolute left-3 top-3 text-gray-400"></i>
    </div>
</div>

<!-- Table with sortable columns -->
<table class="min-w-full divide-y divide-gray-200">
    <thead class="bg-gray-50">
        <tr>
            <th onclick="sortTable('column_name')"
                class="cursor-pointer hover:bg-gray-100">
                Column Name <i class="fas fa-sort ml-1"></i>
            </th>
        </tr>
    </thead>
    <tbody id="tableBody"></tbody>
</table>
```

**JavaScript Pattern:**
```javascript
let allData = [];
let filteredData = [];
let sortColumn = 'id';
let sortDirection = 'asc';
let searchTerm = '';

async function loadData() {
    allData = await api.get('/endpoint');
    filteredData = allData;
    applyFiltersAndSort();
}

function applyFiltersAndSort() {
    // Apply search filter
    filteredData = allData.filter(item => {
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            return (item.name && item.name.toLowerCase().includes(search)) ||
                   (item.description && item.description.toLowerCase().includes(search));
        }
        return true;
    });

    // Sort
    filteredData.sort((a, b) => {
        let aVal = a[sortColumn];
        let bVal = b[sortColumn];

        if (aVal == null) aVal = '';
        if (bVal == null) bVal = '';

        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();

        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    renderTable();
}

function sortTable(column) {
    if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = column;
        sortDirection = 'asc';
    }
    applyFiltersAndSort();
}

function renderTable() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = filteredData.map(item => `
        <tr>
            <td>${item.name}</td>
            <td>${item.value}</td>
        </tr>
    `).join('');
}

// Event listeners
document.getElementById('searchInput').addEventListener('input', () => {
    searchTerm = document.getElementById('searchInput').value;
    applyFiltersAndSort();
});
```

---

## Development Workflow

### Making Changes

1. **Database Schema Changes:**
   ```bash
   # Backup database first
   cp backend/billing.db backend/billing.db.backup

   # Delete database to recreate with new schema
   rm backend/billing.db

   # Restart server (will recreate DB with new schema)
   node backend/server.js

   # Re-sync data from Kimai
   node backend/sync-kimai.js
   ```

2. **Adding New API Endpoint:**
   ```javascript
   // In backend/server.js
   if (path === '/api/v1/new-endpoint' && method === 'GET') {
       const data = await dbAll('SELECT * FROM table');
       sendJSON(res, 200, data);
       return;
   }
   ```

3. **Adding New Page:**
   - Copy existing page as template
   - Update navigation in all pages
   - Follow existing patterns for API calls
   - Add search/sort if table-based

### Testing

**Manual Testing Checklist:**
- [ ] Login works
- [ ] Dashboard loads with data
- [ ] Can create new matter
- [ ] Can log time entry
- [ ] Time entry appears in matter detail
- [ ] Search works on all tables
- [ ] Sort works on all columns
- [ ] Kimai sync imports data

**Testing with curl:**
```bash
# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'

# Get matters (with token)
curl http://localhost:3000/api/v1/matters \
  -H "Authorization: Bearer <token>"
```

---

## Troubleshooting

### Common Issues

**Backend won't start:**
```bash
# Check if port 3000 is in use
netstat -ano | findstr :3000

# Kill process if needed
taskkill /PID <process_id> /F

# Reinstall dependencies
cd backend
npm install
```

**Frontend not loading:**
```bash
# Check if port 8000 is in use
netstat -ano | findstr :8000

# Try different port
python -m http.server 8001
```

**Database errors:**
```bash
# Recreate database
rm backend/billing.db
node backend/server.js
node backend/sync-kimai.js
```

**Kimai connection fails:**
- Check `.env` file has correct credentials
- Test Kimai API manually:
  ```bash
  curl -H "Authorization: Bearer 00d1c3f02410b298ac3bc2624" \
       https://kimai-glg-u11035.vm.elestio.app/api/ping
  ```

---

## Environment Configuration

### `.env` File Template

```bash
# Kimai API Configuration
KIMAI_API_URL=https://kimai-glg-u11035.vm.elestio.app
KIMAI_API_TOKEN=00d1c3f02410b298ac3bc2624

# Database Configuration (for future PostgreSQL migration)
DB_TYPE=sqlite
DB_HOST=localhost
DB_PORT=3306
DB_NAME=kimai
DB_USER=kimai
DB_PASSWORD=your_password_here

# Application Configuration
APP_ENV=development
APP_PORT=3000
APP_HOST=0.0.0.0

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# CORS Configuration
CORS_ALLOWED_ORIGINS=http://localhost:8000,http://127.0.0.1:8000

# Logging
LOG_LEVEL=debug

# Feature Flags
ENABLE_KIMAI_SYNC=true
ENABLE_AUTO_SYNC=false
SYNC_INTERVAL_MINUTES=30
```

---

## Key Design Decisions

### Why These Technologies?

1. **Vanilla JavaScript (no framework)**
   - Simplest setup possible
   - No build process required
   - Easy to understand and debug
   - Direct DOM manipulation

2. **SQLite (not PostgreSQL)**
   - No external database server needed
   - Single file database
   - Perfect for development
   - Easy backups

3. **Node.js built-in HTTP (no Express)**
   - Minimal dependencies
   - Full control over routing
   - Educational - understand how servers work

4. **Tailwind CSS via CDN**
   - No build process
   - Professional UI components
   - Responsive by default

### Default Settings

- **Default hourly rate:** $350 (from Kimai user preferences)
- **Default billing type:** Hourly
- **Time entry format:** Decimal hours (1.5 = 1hr 30min)
- **Activities:** Loaded dynamically from Kimai per matter
- **Timezone:** America/New_York (from Kimai)

---

## Production Deployment Checklist

Before deploying to production:

- [ ] Change JWT_SECRET in .env
- [ ] Hash passwords (implement bcrypt)
- [ ] Migrate from SQLite to PostgreSQL
- [ ] Enable HTTPS
- [ ] Configure proper CORS origins
- [ ] Add rate limiting
- [ ] Set up monitoring/logging
- [ ] Implement database backups
- [ ] Add error tracking (Sentry, etc.)
- [ ] Test on production-like environment
- [ ] Document deployment process
- [ ] Set up CI/CD pipeline

---

## Additional Resources

**Documentation Files:**
- `BILLING_SYSTEM_ARCHITECTURE.md` - Full system architecture
- `KIMAI_DEVELOPER_MANUAL.md` - Complete Kimai API reference
- `SYSTEM_STATUS.md` - Current status and test results
- `README.md` - Project overview

**Kimai Resources:**
- Official Docs: https://www.kimai.org/documentation/
- API Docs: https://demo.kimai.org/api/doc
- Your Instance: https://kimai-glg-u11035.vm.elestio.app

---

**Questions or Issues?**
This guide should help you recreate the system consistently. All patterns are documented here for easy reference when building new features or debugging issues.
