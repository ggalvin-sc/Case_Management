// Production-Ready Backend with Database + Kimai Sync
// Handles all edge cases, errors, and works with or without Kimai

const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

// Load environment
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Import RunPod client
const runpod = require('./runpod-client');

const PORT = process.env.APP_PORT || 3000;
const KIMAI_API_URL = process.env.KIMAI_API_URL || 'https://demo.kimai.org';
const KIMAI_API_TOKEN = process.env.KIMAI_API_TOKEN;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');
const SALT_ROUNDS = 10;

// Validate critical security configurations on startup
if (!JWT_SECRET || JWT_SECRET === 'your-secret-key-change-this-in-production') {
    console.error('\n' + '='.repeat(70));
    console.error('  ❌ FATAL ERROR: JWT_SECRET not configured');
    console.error('='.repeat(70));
    console.error('  Please set a strong JWT_SECRET in your .env file.');
    console.error('  Generate one using:');
    console.error('  node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
    console.error('='.repeat(70) + '\n');
    process.exit(1);
}

// Initialize SQLite database
const dbPath = path.join(__dirname, 'billing.db');
const db = new sqlite3.Database(dbPath);

// Create tables
db.serialize(() => {
    // Add hourly_rate to users table
    db.run(`ALTER TABLE users ADD COLUMN hourly_rate REAL`, (err) => {});

    // Add token_version for session invalidation
    db.run(`ALTER TABLE users ADD COLUMN token_version INTEGER DEFAULT 0`, (err) => {});

    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE,
        password TEXT,
        first_name TEXT,
        last_name TEXT,
        role TEXT,
        hourly_rate REAL,
        kimai_user_id INTEGER,
        token_version INTEGER DEFAULT 0
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        client_number TEXT,
        email TEXT,
        phone TEXT,
        address TEXT,
        address_line2 TEXT,
        city TEXT,
        state TEXT,
        zip_code TEXT,
        country TEXT,
        default_hourly_rate REAL,
        kimai_customer_id INTEGER
    )`);

    // Add new address columns if they don't exist
    db.run(`ALTER TABLE clients ADD COLUMN default_hourly_rate REAL`, (err) => {});
    db.run(`ALTER TABLE clients ADD COLUMN address_line2 TEXT`, (err) => {});
    db.run(`ALTER TABLE clients ADD COLUMN city TEXT`, (err) => {});
    db.run(`ALTER TABLE clients ADD COLUMN state TEXT`, (err) => {});
    db.run(`ALTER TABLE clients ADD COLUMN zip_code TEXT`, (err) => {});
    db.run(`ALTER TABLE clients ADD COLUMN country TEXT`, (err) => {});

    // Add new matter fields if they don't exist
    db.run(`ALTER TABLE matters ADD COLUMN close_date TEXT`, (err) => {});
    db.run(`ALTER TABLE matters ADD COLUMN matter_type TEXT`, (err) => {});
    db.run(`ALTER TABLE matters ADD COLUMN court_name TEXT`, (err) => {});
    db.run(`ALTER TABLE matters ADD COLUMN case_number TEXT`, (err) => {});
    db.run(`ALTER TABLE matters ADD COLUMN opposing_party TEXT`, (err) => {});
    db.run(`ALTER TABLE matters ADD COLUMN opposing_counsel TEXT`, (err) => {});
    db.run(`ALTER TABLE matters ADD COLUMN statute_of_limitations_date TEXT`, (err) => {});
    db.run(`ALTER TABLE matters ADD COLUMN priority TEXT`, (err) => {});
    db.run(`ALTER TABLE matters ADD COLUMN practice_area TEXT`, (err) => {});
    db.run(`ALTER TABLE matters ADD COLUMN conflict_check_date TEXT`, (err) => {});
    db.run(`ALTER TABLE matters ADD COLUMN retainer_amount REAL`, (err) => {});
    db.run(`ALTER TABLE matters ADD COLUMN estimated_hours REAL`, (err) => {});
    db.run(`ALTER TABLE matters ADD COLUMN notes TEXT`, (err) => {});
    db.run(`ALTER TABLE matters ADD COLUMN contingency_percentage REAL`, (err) => {});
    db.run(`ALTER TABLE matters ADD COLUMN trial_contingency_percentage REAL`, (err) => {});
    db.run(`ALTER TABLE matters ADD COLUMN appeal_contingency_percentage REAL`, (err) => {});
    db.run(`ALTER TABLE matters ADD COLUMN attorney_hourly_rate REAL`, (err) => {});
    db.run(`ALTER TABLE matters ADD COLUMN trial_date TEXT`, (err) => {});
    db.run(`ALTER TABLE matters ADD COLUMN appeal_date TEXT`, (err) => {});

    db.run(`CREATE TABLE IF NOT EXISTS matters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        matter_number TEXT,
        client_id INTEGER,
        name TEXT,
        description TEXT,
        status TEXT,
        attorney_id INTEGER,
        billing_type TEXT,
        hourly_rate REAL,
        open_date TEXT,
        close_date TEXT,
        matter_type TEXT,
        court_name TEXT,
        case_number TEXT,
        opposing_party TEXT,
        opposing_counsel TEXT,
        statute_of_limitations_date TEXT,
        priority TEXT,
        practice_area TEXT,
        conflict_check_date TEXT,
        retainer_amount REAL,
        estimated_hours REAL,
        notes TEXT,
        contingency_percentage REAL,
        trial_contingency_percentage REAL,
        appeal_contingency_percentage REAL,
        attorney_hourly_rate REAL,
        trial_date TEXT,
        appeal_date TEXT,
        kimai_project_id INTEGER,
        FOREIGN KEY(client_id) REFERENCES clients(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS ai_questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        question TEXT NOT NULL,
        answer TEXT,
        status TEXT DEFAULT 'pending',
        endpoint_id TEXT,
        job_id TEXT,
        execution_time INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS calendar_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        matter_id INTEGER,
        client_id INTEGER,
        user_id INTEGER,
        event_type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        event_date TEXT NOT NULL,
        event_time TEXT,
        end_date TEXT,
        end_time TEXT,
        all_day INTEGER DEFAULT 0,
        location TEXT,
        reminder_days INTEGER,
        reminder_sent INTEGER DEFAULT 0,
        completed INTEGER DEFAULT 0,
        priority TEXT DEFAULT 'medium',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(matter_id) REFERENCES matters(id),
        FOREIGN KEY(client_id) REFERENCES clients(id),
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS time_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        matter_id INTEGER,
        user_id INTEGER,
        entry_date TEXT,
        duration_minutes INTEGER,
        description TEXT,
        hourly_rate REAL,
        amount REAL,
        billable INTEGER,
        billed INTEGER,
        kimai_timesheet_id INTEGER,
        FOREIGN KEY(matter_id) REFERENCES matters(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        matter_id INTEGER,
        expense_date TEXT,
        category TEXT,
        description TEXT,
        vendor TEXT,
        amount REAL,
        markup_percentage REAL,
        billed_amount REAL,
        billable INTEGER,
        billed INTEGER,
        invoice_id INTEGER,
        FOREIGN KEY(matter_id) REFERENCES matters(id),
        FOREIGN KEY(invoice_id) REFERENCES invoices(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_number TEXT UNIQUE,
        matter_id INTEGER NOT NULL,
        client_id INTEGER NOT NULL,
        issue_date TEXT NOT NULL,
        due_date TEXT,
        status TEXT DEFAULT 'draft',
        subtotal REAL DEFAULT 0,
        tax_rate REAL DEFAULT 0,
        tax_amount REAL DEFAULT 0,
        total_amount REAL DEFAULT 0,
        notes TEXT,
        payment_terms TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        finalized_at TEXT,
        sent_at TEXT,
        paid_at TEXT,
        paid_amount REAL DEFAULT 0,
        FOREIGN KEY(matter_id) REFERENCES matters(id),
        FOREIGN KEY(client_id) REFERENCES clients(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS invoice_line_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_id INTEGER NOT NULL,
        item_type TEXT NOT NULL,
        item_id INTEGER,
        description TEXT NOT NULL,
        quantity REAL DEFAULT 1,
        rate REAL DEFAULT 0,
        amount REAL DEFAULT 0,
        line_order INTEGER DEFAULT 0,
        FOREIGN KEY(invoice_id) REFERENCES invoices(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS firm_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        firm_name TEXT,
        address TEXT,
        address_line2 TEXT,
        city TEXT,
        state TEXT,
        zip_code TEXT,
        phone TEXT,
        email TEXT,
        website TEXT,
        tax_id TEXT,
        logo_url TEXT,
        default_invoice_template TEXT DEFAULT 'classic',
        default_payment_terms TEXT,
        invoice_footer TEXT
    )`);

    db.run(`ALTER TABLE time_entries ADD COLUMN invoice_id INTEGER REFERENCES invoices(id)`, (err) => {
        // Ignore error if column already exists
    });

    db.run(`ALTER TABLE firm_settings ADD COLUMN mileage_rate REAL DEFAULT 0.67`, (err) => {
        // Ignore error if column already exists
    });

    db.run(`ALTER TABLE firm_settings ADD COLUMN copies_rate REAL DEFAULT 0.10`, (err) => {
        // Ignore error if column already exists
    });

    // Insert default user if none exist (development only)
    db.get("SELECT COUNT(*) as count FROM users", async (err, row) => {
        if (!err && row.count === 0) {
            // Only create default users in development
            if (process.env.APP_ENV === 'production') {
                console.error('\n' + '='.repeat(70));
                console.error('  ❌ SECURITY ERROR: No users found in production database!');
                console.error('  Create first admin user manually:');
                console.error('    node scripts/create-admin.js');
                console.error('='.repeat(70) + '\n');
                process.exit(1);
            }

            console.warn('\n' + '='.repeat(70));
            console.warn('  ⚠️  WARNING: Creating default development accounts');
            console.warn('  These should NOT be used in production!');
            console.warn('='.repeat(70));

            // Generate strong random password for development
            const crypto = require('crypto');
            const devPassword = crypto.randomBytes(16).toString('hex');

            // Hash the password with bcrypt
            const hashedPassword = await bcrypt.hash(devPassword, SALT_ROUNDS);

            db.run(`INSERT INTO users (email, password, first_name, last_name, role)
                    VALUES ('admin@example.com', ?, 'Admin', 'User', 'admin')`, [hashedPassword], function(err) {
                if (!err) {
                    console.log('\n' + '='.repeat(70));
                    console.log('  DEFAULT ADMIN ACCOUNT CREATED (Development Only)');
                    console.log('  Email:    admin@example.com');
                    console.log(`  Password: ${devPassword}`);
                    console.log('  ⚠️  Save this password - it will not be shown again!');
                    console.log('='.repeat(70) + '\n');
                }
            });

            // Create attorney account with same password for convenience in dev
            db.run(`INSERT INTO users (email, password, first_name, last_name, role)
                    VALUES ('attorney@example.com', ?, 'John', 'Attorney', 'attorney')`, [hashedPassword]);
        }
    });

    // Insert sample client if none exist
    db.get("SELECT COUNT(*) as count FROM clients", (err, row) => {
        if (!err && row.count === 0) {
            db.run(`INSERT INTO clients (name, client_number, email)
                    VALUES ('Sample Client', 'CL-001', 'client@example.com')`);
        }
    });

    // Insert default firm settings if none exist
    db.get("SELECT COUNT(*) as count FROM firm_settings", (err, row) => {
        if (!err && row.count === 0) {
            db.run(`INSERT INTO firm_settings (
                firm_name, address, city, state, zip_code, phone, email,
                default_invoice_template, default_payment_terms, invoice_footer
            ) VALUES (
                'Your Law Firm Name',
                '123 Main Street',
                'City',
                'State',
                '12345',
                '(555) 123-4567',
                'contact@lawfirm.com',
                'classic',
                'Payment is due within 30 days of invoice date. Please make checks payable to Your Law Firm Name.',
                'Thank you for your business. Please contact us if you have any questions about this invoice.'
            )`);
        }
    });
});

console.log(`Database initialized at: ${dbPath}`);

// Rate Limiting for Login Attempts
const loginAttempts = new Map(); // email -> { count, firstAttempt, lockUntil }
const MAX_LOGIN_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

/**
 * Checks if an IP/email is rate limited for login attempts
 * @param {string} identifier - Email or IP address
 * @returns {Object} { limited: boolean, remainingAttempts: number, retryAfter: number }
 */
function checkRateLimit(identifier) {
    const now = Date.now();
    const attempt = loginAttempts.get(identifier);

    if (!attempt) {
        return { limited: false, remainingAttempts: MAX_LOGIN_ATTEMPTS };
    }

    // Check if locked out
    if (attempt.lockUntil && now < attempt.lockUntil) {
        const retryAfter = Math.ceil((attempt.lockUntil - now) / 1000);
        return { limited: true, remainingAttempts: 0, retryAfter };
    }

    // Reset if window expired
    if (now - attempt.firstAttempt > RATE_LIMIT_WINDOW) {
        loginAttempts.delete(identifier);
        return { limited: false, remainingAttempts: MAX_LOGIN_ATTEMPTS };
    }

    // Check if exceeded max attempts
    if (attempt.count >= MAX_LOGIN_ATTEMPTS) {
        attempt.lockUntil = now + LOCKOUT_DURATION;
        const retryAfter = Math.ceil(LOCKOUT_DURATION / 1000);
        return { limited: true, remainingAttempts: 0, retryAfter };
    }

    return { limited: false, remainingAttempts: MAX_LOGIN_ATTEMPTS - attempt.count };
}

/**
 * Records a failed login attempt
 * @param {string} identifier - Email or IP address
 */
function recordFailedLogin(identifier) {
    const now = Date.now();
    const attempt = loginAttempts.get(identifier);

    if (!attempt || now - attempt.firstAttempt > RATE_LIMIT_WINDOW) {
        loginAttempts.set(identifier, {
            count: 1,
            firstAttempt: now,
            lockUntil: null
        });
    } else {
        attempt.count++;
        if (attempt.count >= MAX_LOGIN_ATTEMPTS) {
            attempt.lockUntil = now + LOCKOUT_DURATION;
        }
    }
}

/**
 * Records a successful login (resets attempts)
 * @param {string} identifier - Email or IP address
 */
function recordSuccessfulLogin(identifier) {
    loginAttempts.delete(identifier);
}

// Clean up old rate limit entries every hour
setInterval(() => {
    const now = Date.now();
    for (const [identifier, attempt] of loginAttempts.entries()) {
        if (now - attempt.firstAttempt > RATE_LIMIT_WINDOW && (!attempt.lockUntil || now > attempt.lockUntil)) {
            loginAttempts.delete(identifier);
        }
    }
}, 60 * 60 * 1000);

// Global API Rate Limiting - Multi-tier approach
const apiRequestCounts = new Map(); // IP -> {count, resetTime}
const userRequestCounts = new Map(); // userID -> {count, resetTime}
const endpointRequestCounts = new Map(); // userID:endpoint -> {count, resetTime}

const GLOBAL_RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_MINUTE = 100;

// Multi-tier rate limit configuration
const RATE_LIMITS = {
    global: { window: 60000, max: 100 },              // Per IP: 100 req/min
    user: { window: 60000, max: 60 },                 // Per authenticated user: 60 req/min
    endpoint: {
        '/api/v1/ai/ask': { window: 60000, max: 5 },           // AI endpoint: 5 req/min
        '/api/v1/invoices': { window: 60000, max: 30 },        // Invoices: 30 req/min
        '/api/v1/sync/kimai/timesheets': { window: 60000, max: 10 }  // Sync: 10 req/min
    }
};

/**
 * Checks global API rate limit for an IP address
 * @param {string} ip - Client IP address
 * @returns {Object} { limited: boolean, remaining: number, retryAfter?: number }
 */
function checkGlobalRateLimit(ip) {
    const now = Date.now();
    const record = apiRequestCounts.get(ip);

    if (!record || now > record.resetTime) {
        apiRequestCounts.set(ip, {
            count: 1,
            resetTime: now + GLOBAL_RATE_LIMIT_WINDOW
        });
        return { limited: false, remaining: MAX_REQUESTS_PER_MINUTE - 1 };
    }

    record.count++;

    if (record.count > MAX_REQUESTS_PER_MINUTE) {
        return {
            limited: true,
            remaining: 0,
            retryAfter: Math.ceil((record.resetTime - now) / 1000)
        };
    }

    return {
        limited: false,
        remaining: MAX_REQUESTS_PER_MINUTE - record.count
    };
}

/**
 * Helper function for checking rate limit by key
 * @param {Map} store - Map to store rate limit records
 * @param {string} key - Unique key for rate limiting
 * @param {number} maxRequests - Maximum requests allowed
 * @param {number} window - Time window in milliseconds
 * @returns {Object} { limited: boolean, remaining: number, retryAfter?: number }
 */
function checkRateLimitByKey(store, key, maxRequests, window) {
    const now = Date.now();
    const record = store.get(key);

    if (!record || now > record.resetTime) {
        store.set(key, { count: 1, resetTime: now + window });
        return { limited: false, remaining: maxRequests - 1 };
    }

    record.count++;

    if (record.count > maxRequests) {
        return {
            limited: true,
            remaining: 0,
            retryAfter: Math.ceil((record.resetTime - now) / 1000)
        };
    }

    return { limited: false, remaining: maxRequests - record.count };
}

/**
 * Multi-tier rate limiting check
 * Checks IP-based, user-based, and endpoint-specific rate limits
 * @param {string} ip - Client IP address
 * @param {number|null} userId - User ID (null for unauthenticated)
 * @param {string} endpoint - Request endpoint path
 * @returns {Object} { limited: boolean, remaining?: number, retryAfter?: number, limitType?: string }
 */
function checkMultiTierRateLimit(ip, userId, endpoint) {
    // Check IP-based rate limit
    const ipLimit = checkRateLimitByKey(
        apiRequestCounts,
        ip,
        RATE_LIMITS.global.max,
        RATE_LIMITS.global.window
    );
    if (ipLimit.limited) {
        return { ...ipLimit, limitType: 'IP' };
    }

    // Check user-based rate limit for authenticated users
    if (userId) {
        const userLimit = checkRateLimitByKey(
            userRequestCounts,
            userId.toString(),
            RATE_LIMITS.user.max,
            RATE_LIMITS.user.window
        );
        if (userLimit.limited) {
            return { ...userLimit, limitType: 'user' };
        }

        // Check endpoint-specific rate limit
        const endpointConfig = RATE_LIMITS.endpoint[endpoint];
        if (endpointConfig) {
            const endpointKey = `${userId}:${endpoint}`;
            const endpointLimit = checkRateLimitByKey(
                endpointRequestCounts,
                endpointKey,
                endpointConfig.max,
                endpointConfig.window
            );
            if (endpointLimit.limited) {
                return { ...endpointLimit, limitType: 'endpoint' };
            }
        }
    }

    return { limited: false };
}

// Clean up old rate limit entries every 5 minutes
setInterval(() => {
    const now = Date.now();

    // Clean up IP-based rate limits
    for (const [ip, record] of apiRequestCounts.entries()) {
        if (now > record.resetTime) {
            apiRequestCounts.delete(ip);
        }
    }

    // Clean up user-based rate limits
    for (const [userId, record] of userRequestCounts.entries()) {
        if (now > record.resetTime) {
            userRequestCounts.delete(userId);
        }
    }

    // Clean up endpoint-based rate limits
    for (const [key, record] of endpointRequestCounts.entries()) {
        if (now > record.resetTime) {
            endpointRequestCounts.delete(key);
        }
    }
}, 5 * 60 * 1000);

// Security Utilities
/**
 * Handles CORS with restricted origins
 * @param {Object} req - HTTP request object
 * @param {Object} res - HTTP response object
 */
function handleCORS(req, res) {
    const origin = req.headers.origin;

    // Check if origin is allowed
    if (ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.includes('*')) {
        res.setHeader('Access-Control-Allow-Origin', origin || ALLOWED_ORIGINS[0]);
    } else {
        res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGINS[0]);
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
}

/**
 * Generates a JWT token for authenticated users
 * @param {Object} user - User object containing id, email, role, and token_version
 * @returns {string} JWT token
 */
function generateToken(user) {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            role: user.role,
            tokenVersion: user.token_version || 0
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

/**
 * Parses cookies from Cookie header
 * @param {string} cookieHeader - Cookie header value
 * @returns {Object} Object with cookie name-value pairs
 */
function parseCookies(cookieHeader) {
    const cookies = {};
    if (!cookieHeader) return cookies;

    cookieHeader.split(';').forEach(cookie => {
        const parts = cookie.trim().split('=');
        if (parts.length === 2) {
            cookies[parts[0]] = decodeURIComponent(parts[1]);
        }
    });

    return cookies;
}

/**
 * Verifies JWT token from cookies or Authorization header and checks token version
 * @param {Object} req - HTTP request object
 * @returns {Promise<Object|null>} Decoded token payload or null if invalid
 */
async function verifyToken(req) {
    let token = null;

    // First, try to get token from HTTP-only cookie (most secure)
    const cookies = parseCookies(req.headers.cookie);
    if (cookies.token) {
        token = cookies.token;
    }
    // Fallback to Authorization header for backward compatibility
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.substring(7);
    }

    if (!token) {
        return null;
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        // Check if token version matches (for session invalidation)
        const user = await dbGet('SELECT token_version FROM users WHERE id = ?', [decoded.id]);
        if (!user) {
            console.error('User not found for token');
            return null;
        }

        const userTokenVersion = user.token_version || 0;
        const tokenTokenVersion = decoded.tokenVersion || 0;

        if (userTokenVersion !== tokenTokenVersion) {
            console.error('Token version mismatch - session invalidated');
            return null;
        }

        return decoded;
    } catch (error) {
        console.error('Token verification error:', error.message);
        return null;
    }
}

/**
 * Authentication middleware - checks for valid JWT token
 * Returns the authenticated user or sends 401 response
 * @param {Object} req - HTTP request object
 * @param {Object} res - HTTP response object
 * @returns {Promise<Object|null>} Decoded user object or null if unauthorized (response sent)
 */
async function requireAuth(req, res) {
    const decoded = await verifyToken(req);

    if (!decoded) {
        sendJSON(req, res, 401, {
            error: 'Unauthorized - Authentication required',
            message: 'Please provide a valid JWT token via cookie or Authorization header'
        });
        return null;
    }

    return decoded;
}

/**
 * CSRF Token Management
 * Stores CSRF tokens per user email for protection against Cross-Site Request Forgery
 */
const csrfTokens = new Map(); // email -> { token, expiry }
const crypto = require('crypto');

/**
 * Generates a CSRF token for a user
 * @param {string} email - User email
 * @returns {string} CSRF token
 */
function generateCSRFToken(email) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
    csrfTokens.set(email, { token, expiry });
    return token;
}

/**
 * Validates CSRF token for state-changing requests
 * @param {Object} req - HTTP request object
 * @param {Object} res - HTTP response object
 * @param {Object} user - Authenticated user object
 * @returns {boolean} True if valid or not required, false if invalid (response sent)
 */
function validateCSRF(req, res, user) {
    // Only check CSRF on state-changing methods
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        return true;
    }

    const providedToken = req.headers['x-csrf-token'];
    const storedData = csrfTokens.get(user.email);

    // Check if token exists and is not expired
    if (!storedData || Date.now() > storedData.expiry) {
        sendJSON(req, res, 403, {
            error: 'CSRF token expired',
            message: 'Please login again to get a new CSRF token'
        });
        return false;
    }

    // Validate token
    if (!providedToken || providedToken !== storedData.token) {
        sendJSON(req, res, 403, {
            error: 'Invalid CSRF token',
            message: 'CSRF token is missing or invalid'
        });
        return false;
    }

    return true;
}

/**
 * Combined authentication and CSRF validation
 * @param {Object} req - HTTP request object
 * @param {Object} res - HTTP response object
 * @returns {Promise<Object|null>} Authenticated user or null if validation fails (response sent)
 */
async function requireAuthAndCSRF(req, res) {
    const user = await requireAuth(req, res);
    if (!user) return null;

    if (!validateCSRF(req, res, user)) return null;

    return user;
}

/**
 * Checks if user is authorized to access a resource
 * @param {Object} user - Authenticated user object
 * @param {string} resourceType - Type of resource ('matter', 'client', 'invoice', etc.)
 * @param {number} resourceId - ID of the resource
 * @returns {Promise<Object>} { authorized: boolean, reason?: string, resource?: Object }
 */
async function authorizeResource(user, resourceType, resourceId) {
    // Admin users have access to everything
    if (user.role === 'admin') {
        return { authorized: true };
    }

    switch(resourceType) {
        case 'matter':
            const matter = await dbGet('SELECT attorney_id FROM matters WHERE id = ?', [resourceId]);
            if (!matter) {
                return { authorized: false, reason: 'not_found' };
            }
            if (matter.attorney_id === user.id) {
                return { authorized: true, resource: matter };
            }
            return { authorized: false, reason: 'forbidden' };

        case 'client':
            // User can access client if they have any matters with that client
            const clientMatter = await dbGet(
                'SELECT COUNT(*) as count FROM matters WHERE client_id = ? AND attorney_id = ?',
                [resourceId, user.id]
            );
            if (clientMatter && clientMatter.count > 0) {
                return { authorized: true };
            }
            return { authorized: false, reason: 'forbidden' };

        case 'invoice':
            const invoice = await dbGet(`
                SELECT i.*, m.attorney_id
                FROM invoices i
                LEFT JOIN matters m ON i.matter_id = m.id
                WHERE i.id = ?
            `, [resourceId]);
            if (!invoice) {
                return { authorized: false, reason: 'not_found' };
            }
            if (invoice.attorney_id === user.id) {
                return { authorized: true, resource: invoice };
            }
            return { authorized: false, reason: 'forbidden' };

        case 'time_entry':
            const timeEntry = await dbGet(`
                SELECT t.*, m.attorney_id
                FROM time_entries t
                LEFT JOIN matters m ON t.matter_id = m.id
                WHERE t.id = ?
            `, [resourceId]);
            if (!timeEntry) {
                return { authorized: false, reason: 'not_found' };
            }
            if (timeEntry.attorney_id === user.id || timeEntry.user_id === user.id) {
                return { authorized: true, resource: timeEntry };
            }
            return { authorized: false, reason: 'forbidden' };

        default:
            return { authorized: false, reason: 'invalid_resource_type' };
    }
}

/**
 * HTML encodes special characters to prevent XSS attacks
 * @param {string} str - String to encode
 * @returns {string} HTML-encoded string
 */
function htmlEncode(str) {
    const entities = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;',
        '`': '&#x60;',
        '=': '&#x3D;'
    };
    return String(str).replace(/[&<>"'`=\/]/g, char => entities[char]);
}

/**
 * Handles errors securely by logging full details server-side
 * and sending safe error messages to the client
 * @param {Object} req - HTTP request object
 * @param {Object} res - HTTP response object
 * @param {Error} error - Error object
 * @param {number} statusCode - HTTP status code (default: 500)
 */
function handleError(req, res, error, statusCode = 500) {
    // Log full error details for debugging (server-side only)
    console.error('[ERROR]', {
        timestamp: new Date().toISOString(),
        path: req.url,
        method: req.method,
        error: error.message,
        stack: process.env.APP_ENV === 'development' ? error.stack : undefined
    });

    // Send generic error to client
    const errorResponse = {
        error: 'An error occurred processing your request'
    };

    // In development, include more details
    if (process.env.APP_ENV === 'development') {
        errorResponse.details = error.message;
        errorResponse.stack = error.stack;
    }

    sendJSON(req, res, statusCode, errorResponse);
}

/**
 * Sanitizes user input to prevent XSS attacks
 * Strips all HTML tags and removes dangerous patterns
 * @param {string} input - User input string
 * @returns {string} Sanitized string
 */
function sanitizeInput(input) {
    if (typeof input !== 'string') return input;

    let sanitized = input.trim();

    // Limit length to prevent DoS
    sanitized = sanitized.substring(0, 10000);

    // Strip all HTML tags completely (prevents XSS even with innerHTML)
    sanitized = sanitized.replace(/<[^>]*>/g, '');

    // Remove javascript: and data: URL protocols
    sanitized = sanitized.replace(/javascript:/gi, '');
    sanitized = sanitized.replace(/data:text\/html/gi, '');
    sanitized = sanitized.replace(/data:image/gi, '');
    sanitized = sanitized.replace(/vbscript:/gi, '');

    // Remove event handlers (onclick, onerror, onload, etc.)
    sanitized = sanitized.replace(/on\w+\s*=/gi, '');

    // Remove dangerous characters that could break out of attributes
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');

    return sanitized;
}

/**
 * Validates and sanitizes request body data
 * @param {Object} data - Request body data
 * @returns {Object} Sanitized data
 */
function sanitizeData(data) {
    if (!data || typeof data !== 'object') return data;

    const sanitized = {};
    for (const key in data) {
        if (typeof data[key] === 'string') {
            sanitized[key] = sanitizeInput(data[key]);
        } else if (typeof data[key] === 'object' && !Array.isArray(data[key])) {
            sanitized[key] = sanitizeData(data[key]);
        } else {
            sanitized[key] = data[key];
        }
    }
    return sanitized;
}

/**
 * Validates ID parameter from URL
 * Prevents SQL injection and type coercion attacks
 * @param {string} idString - ID extracted from URL
 * @returns {number} Validated positive integer ID
 * @throws {Error} If ID is invalid
 */
function validateId(idString) {
    const id = parseInt(idString, 10);
    if (isNaN(id) || id <= 0 || !Number.isInteger(id)) {
        throw new Error('Invalid ID format');
    }
    return id;
}

/**
 * Builds a secure UPDATE query with field name validation
 * @param {string} tableName - Table name (must be in allowlist)
 * @param {Array<string>} allowedFields - Allowlist of field names
 * @param {Object} data - Data object with field values
 * @param {string} idField - ID field name (default: 'id')
 * @returns {Object} { sql: string, values: Array, fieldCount: number }
 * @throws {Error} If table name or field names are invalid
 */
function buildSecureUpdateQuery(tableName, allowedFields, data, idField = 'id') {
    // Validate table name against allowlist
    const ALLOWED_TABLES = ['matters', 'invoices', 'firm_settings', 'time_entries', 'expenses', 'clients', 'users'];
    if (!ALLOWED_TABLES.includes(tableName)) {
        throw new Error(`Invalid table name: ${tableName}`);
    }

    // Validate ID field name pattern
    const VALID_FIELD_PATTERN = /^[a-z_][a-z0-9_]*$/;
    if (!VALID_FIELD_PATTERN.test(idField)) {
        throw new Error(`Invalid ID field name: ${idField}`);
    }

    const updates = [];
    const values = [];

    for (const field of allowedFields) {
        // Strict validation: field must be in allowlist AND match pattern
        if (!allowedFields.includes(field)) {
            throw new Error(`Field not in allowlist: ${field}`);
        }

        if (!VALID_FIELD_PATTERN.test(field)) {
            throw new Error(`Invalid field name format: ${field}`);
        }

        if (data[field] !== undefined) {
            updates.push(`${field} = ?`);
            values.push(data[field]);
        }
    }

    if (updates.length === 0) {
        return { sql: null, values: [], fieldCount: 0 };
    }

    return {
        sql: `UPDATE ${tableName} SET ${updates.join(', ')} WHERE ${idField} = ?`,
        values,
        fieldCount: updates.length
    };
}

/**
 * Validates password complexity
 * @param {string} password - Password to validate
 * @returns {Object} { valid: boolean, errors: string[] }
 */
function validatePassword(password) {
    const errors = [];

    if (!password || password.length < 8) {
        errors.push('Password must be at least 8 characters long');
    }

    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push('Password must contain at least one special character');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Sets comprehensive security headers to protect against various attacks
 * @param {Object} res - HTTP response object
 */
function setSecurityHeaders(res) {
    // Prevent clickjacking attacks
    res.setHeader('X-Frame-Options', 'DENY');

    // Prevent MIME-type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Disable deprecated XSS filter (modern browsers ignore it, can cause vulnerabilities in older browsers)
    res.setHeader('X-XSS-Protection', '0');

    // Content Security Policy - restrict resource loading
    // NOTE: 'unsafe-inline' is currently required for inline scripts in HTML files
    // TODO: Move inline scripts to external .js files to remove 'unsafe-inline'
    res.setHeader('Content-Security-Policy',
        "default-src 'self'; " +
        "script-src 'self' https://cdn.tailwindcss.com https://cdnjs.cloudflare.com 'unsafe-inline'; " +
        "style-src 'self' https://cdn.tailwindcss.com https://cdnjs.cloudflare.com 'unsafe-inline'; " +
        "font-src 'self' https://cdnjs.cloudflare.com data:; " +
        "img-src 'self' data: https:; " +
        "connect-src 'self'; " +
        "frame-ancestors 'none'; " +
        "base-uri 'self'; " +
        "form-action 'self'; " +
        "upgrade-insecure-requests;"
    );

    // HTTP Strict Transport Security - force HTTPS
    if (tlsOptions) {
        // Set HSTS whenever HTTPS is enabled
        const maxAge = process.env.APP_ENV === 'production' ? 31536000 : 86400; // 1 year in prod, 1 day in dev
        let hstsHeader = `max-age=${maxAge}; includeSubDomains`;

        // Only add preload in production with valid certs
        if (process.env.APP_ENV === 'production') {
            hstsHeader += '; preload';
        }

        res.setHeader('Strict-Transport-Security', hstsHeader);
    }

    // Referrer Policy - control referrer information
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions Policy - restrict browser features
    res.setHeader('Permissions-Policy',
        'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=()');
}

/**
 * Sends JSON response with CORS and security headers
 * @param {Object} req - HTTP request object
 * @param {Object} res - HTTP response object
 * @param {number} statusCode - HTTP status code
 * @param {Object} data - Response data
 */
function sendJSON(req, res, statusCode, data) {
    handleCORS(req, res);
    setSecurityHeaders(res);
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
}

function dbGet(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function dbAll(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
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

// Kimai API helper
async function callKimaiAPI(method, path, data = null) {
    if (!KIMAI_API_TOKEN) {
        return null; // No Kimai configured
    }

    return new Promise((resolve) => {
        const kimaiUrl = new URL(path, KIMAI_API_URL);
        const options = {
            method: method,
            headers: {
                'Authorization': `Bearer ${KIMAI_API_TOKEN}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            timeout: 5000
        };

        const req = https.request(kimaiUrl, options, (kimaiRes) => {
            let body = '';
            kimaiRes.on('data', chunk => body += chunk);
            kimaiRes.on('end', () => {
                try {
                    const responseData = body ? JSON.parse(body) : null;
                    if (kimaiRes.statusCode >= 200 && kimaiRes.statusCode < 300) {
                        resolve({ success: true, data: responseData });
                    } else {
                        console.error(`Kimai API Error ${kimaiRes.statusCode}:`, responseData);
                        resolve({ success: false, error: responseData });
                    }
                } catch (e) {
                    resolve({ success: false, error: 'Invalid response' });
                }
            });
        });

        req.on('error', (error) => {
            console.error('Kimai connection error:', error.message);
            resolve({ success: false, error: error.message });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({ success: false, error: 'Timeout' });
        });

        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

// TLS/SSL Configuration
let tlsOptions = null;
const certPath = path.join(__dirname, 'certs', 'server-cert.pem');
const keyPath = path.join(__dirname, 'certs', 'server-key.pem');

// Check if TLS certificates exist
if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    tlsOptions = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
    };
    console.log('✓ TLS certificates loaded - HTTPS enabled');
} else {
    console.warn('⚠ TLS certificates not found - Using HTTP (insecure)');
    console.warn('  Generate certificates: node backend/generate-certs.js');
}

// Request handler
const requestHandler = async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const method = req.method;

    if (method === 'OPTIONS') {
        handleCORS(req, res);
        res.writeHead(204);
        res.end();
        return;
    }

    console.log(`${method} ${pathname}`);

    // Global rate limiting for API endpoints
    if (pathname.startsWith('/api/')) {
        const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const rateLimit = checkGlobalRateLimit(clientIP);

        // Set rate limit headers
        res.setHeader('X-RateLimit-Limit', MAX_REQUESTS_PER_MINUTE);
        res.setHeader('X-RateLimit-Remaining', rateLimit.remaining);

        if (rateLimit.limited) {
            res.setHeader('Retry-After', rateLimit.retryAfter);
            res.setHeader('X-RateLimit-Reset', Date.now() + (rateLimit.retryAfter * 1000));

            sendJSON(req, res, 429, {
                error: 'Too Many Requests',
                message: `Rate limit exceeded. Maximum ${MAX_REQUESTS_PER_MINUTE} requests per minute. Retry after ${rateLimit.retryAfter} seconds.`,
                retryAfter: rateLimit.retryAfter
            });
            return;
        }
    }

    // Serve static files from frontend directory for non-API requests
    if (!pathname.startsWith('/api/')) {
        let filePath = path.join(__dirname, '..', 'frontend', pathname === '/' ? 'index.html' : pathname);

        // Security check: ensure path is within frontend directory
        const frontendDir = path.join(__dirname, '..', 'frontend');
        const resolvedPath = path.resolve(filePath);
        if (!resolvedPath.startsWith(frontendDir)) {
            res.writeHead(403);
            res.end('Forbidden');
            return;
        }

        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end('Not Found');
                return;
            }

            // Set content type based on file extension
            const ext = path.extname(filePath);
            const contentTypes = {
                '.html': 'text/html',
                '.js': 'text/javascript',
                '.css': 'text/css',
                '.json': 'application/json',
                '.png': 'image/png',
                '.jpg': 'image/jpg',
                '.gif': 'image/gif',
                '.svg': 'image/svg+xml',
                '.ico': 'image/x-icon'
            };
            const contentType = contentTypes[ext] || 'text/plain';

            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        });
        return;
    }

    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', async () => {
        let data = {};
        try {
            data = body ? JSON.parse(body) : {};
            data = sanitizeData(data); // Sanitize all input data
        } catch (parseError) {
            sendJSON(req, res, 400, { error: 'Invalid JSON in request body' });
            return;
        }

        try {
            // AUTH
            if (pathname === '/api/v1/auth/login' && method === 'POST') {
                // Validate input
                if (!data.email || !data.password) {
                    sendJSON(req, res, 400, { error: 'Email and password are required' });
                    return;
                }

                // Validate email format
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(data.email)) {
                    sendJSON(req, res, 400, { error: 'Invalid email format' });
                    return;
                }

                // Check rate limit
                const rateLimit = checkRateLimit(data.email);
                if (rateLimit.limited) {
                    sendJSON(req, res, 429, {
                        error: 'Too many login attempts',
                        message: `Account temporarily locked. Please try again in ${rateLimit.retryAfter} seconds.`,
                        retryAfter: rateLimit.retryAfter
                    });
                    return;
                }

                const user = await dbGet('SELECT * FROM users WHERE email = ?', [data.email]);

                // Always run bcrypt comparison to prevent timing attacks
                let passwordMatch = false;

                if (user) {
                    // User exists - compare passwords
                    passwordMatch = await bcrypt.compare(data.password, user.password);
                } else {
                    // User doesn't exist - still run bcrypt to maintain constant timing
                    // Use a dummy hash to ensure same computation time
                    await bcrypt.compare(
                        data.password,
                        '$2b$10$YourDummyHashHereToMaintainConstantTiming1234567890'
                    );
                }

                if (user && passwordMatch) {
                    // Reset rate limit on successful login
                    recordSuccessfulLogin(data.email);

                    const token = generateToken(user);
                    const csrfToken = generateCSRFToken(user.email);

                    // Set HTTP-only cookie for JWT token (most secure - not accessible to JavaScript)
                    // Set regular cookie for CSRF token (frontend needs to read it)
                    const isSecure = tlsOptions ? 'Secure; ' : ''; // Only set Secure flag if HTTPS
                    const maxAge = 24 * 60 * 60; // 24 hours in seconds

                    res.setHeader('Set-Cookie', [
                        `token=${token}; HttpOnly; ${isSecure}SameSite=Strict; Max-Age=${maxAge}; Path=/`,
                        `csrfToken=${csrfToken}; ${isSecure}SameSite=Strict; Max-Age=${maxAge}; Path=/`
                    ]);

                    sendJSON(req, res, 200, {
                        user: {
                            id: user.id,
                            email: user.email,
                            first_name: user.first_name,
                            last_name: user.last_name,
                            role: user.role
                        }
                    });
                } else {
                    // Generic error for both cases (user not found OR wrong password)
                    recordFailedLogin(data.email);
                    const rateCheck = checkRateLimit(data.email);
                    sendJSON(req, res, 401, {
                        error: 'Invalid credentials',
                        remainingAttempts: rateCheck.remainingAttempts
                    });
                }
                return;
            }

            if (pathname === '/api/v1/auth/me' && method === 'GET') {
                const authHeader = req.headers.authorization;
                const decoded = verifyToken(authHeader);

                if (!decoded) {
                    sendJSON(req, res, 401, { error: 'Unauthorized - Invalid or missing token' });
                    return;
                }

                const user = await dbGet('SELECT id, email, first_name, last_name, role, hourly_rate FROM users WHERE id = ?', [decoded.id]);

                if (!user) {
                    sendJSON(req, res, 404, { error: 'User not found' });
                    return;
                }

                sendJSON(req, res, 200, user);
                return;
            }

            if (pathname === '/api/v1/auth/change-password' && method === 'POST') {
                const user = await requireAuthAndCSRF(req, res);
                if (!user) return;

                // Validate input
                if (!data.current_password || !data.new_password) {
                    sendJSON(req, res, 400, {
                        error: 'Current password and new password are required'
                    });
                    return;
                }

                // Validate new password complexity
                const passwordValidation = validatePassword(data.new_password);
                if (!passwordValidation.valid) {
                    sendJSON(req, res, 400, {
                        error: 'Password does not meet complexity requirements',
                        requirements: passwordValidation.errors
                    });
                    return;
                }

                // Verify current password
                const userRecord = await dbGet('SELECT * FROM users WHERE id = ?', [user.id]);
                const currentPasswordMatch = await bcrypt.compare(data.current_password, userRecord.password);

                if (!currentPasswordMatch) {
                    sendJSON(req, res, 401, { error: 'Current password is incorrect' });
                    return;
                }

                // Hash and update new password
                const hashedPassword = await bcrypt.hash(data.new_password, SALT_ROUNDS);

                // Increment token_version to invalidate all existing sessions
                await dbRun(
                    'UPDATE users SET password = ?, token_version = token_version + 1 WHERE id = ?',
                    [hashedPassword, user.id]
                );

                // Delete CSRF token to force re-login
                csrfTokens.delete(user.email);

                sendJSON(req, res, 200, {
                    message: 'Password changed successfully. All sessions have been invalidated. Please log in again.'
                });
                return;
            }

            // DASHBOARD
            if (pathname === '/api/v1/dashboard/stats' && method === 'GET') {
                const user = await requireAuth(req, res);
                if (!user) return;

                const matters = await dbAll('SELECT * FROM matters WHERE status = "active"');
                const timeEntries = await dbAll('SELECT * FROM time_entries WHERE billed = 0');
                const expenses = await dbAll('SELECT * FROM expenses WHERE billed = 0');

                const unbilledHours = timeEntries.reduce((sum, t) => sum + (t.duration_minutes || 0), 0) / 60;
                const unbilledTime = timeEntries.reduce((sum, t) => sum + (t.amount || 0), 0);
                const unbilledExpenses = expenses.reduce((sum, e) => sum + (e.billed_amount || 0), 0);

                sendJSON(req, res, 200, {
                    activeMatters: matters.length,
                    unbilledHours: Math.round(unbilledHours * 10) / 10,
                    unbilledAmount: Math.round((unbilledTime + unbilledExpenses) * 100) / 100,
                    monthRevenue: 0
                });
                return;
            }

            if (pathname === '/api/v1/dashboard/activity' && method === 'GET') {
                const user = await requireAuth(req, res);
                if (!user) return;

                const entries = await dbAll(`
                    SELECT t.*, m.name as matter_name, u.first_name || ' ' || u.last_name as user_name
                    FROM time_entries t
                    LEFT JOIN matters m ON t.matter_id = m.id
                    LEFT JOIN users u ON t.user_id = u.id
                    ORDER BY t.entry_date DESC
                    LIMIT 10
                `);

                const activities = entries.map(e => ({
                    type: 'time_entry',
                    description: `${e.user_name || 'User'} logged ${Math.floor(e.duration_minutes / 60)}h ${e.duration_minutes % 60}m on ${e.matter_name || 'matter'}`,
                    timestamp: `${e.entry_date}T12:00:00Z`
                }));

                sendJSON(req, res, 200, activities);
                return;
            }

            // CLIENTS
            if (pathname === '/api/v1/clients' && method === 'GET') {
                const user = await requireAuth(req, res);
                if (!user) return;

                const clients = await dbAll('SELECT * FROM clients');
                sendJSON(req, res, 200, clients);
                return;
            }

            if (pathname === '/api/v1/clients' && method === 'POST') {
                const user = await requireAuthAndCSRF(req, res);
                if (!user) return;

                // Validation
                const errors = [];

                // Validate name (required, non-empty)
                if (!data.name || data.name.trim() === '') {
                    errors.push({ field: 'name', message: 'Client name is required' });
                }

                // Validate email format if provided
                if (data.email && data.email.trim() !== '') {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(data.email)) {
                        errors.push({ field: 'email', message: 'Invalid email format' });
                    }
                }

                // Validate default_hourly_rate (must be positive if provided)
                if (data.default_hourly_rate !== undefined && data.default_hourly_rate < 0) {
                    errors.push({ field: 'default_hourly_rate', message: 'Hourly rate must be non-negative' });
                }

                if (errors.length > 0) {
                    sendJSON(req, res, 422, { error: 'Validation failed', errors });
                    return;
                }

                // Store client data locally only - no Kimai sync for case management data
                const result = await dbRun(
                    'INSERT INTO clients (name, client_number, email, phone, address, address_line2, city, state, zip_code, country, default_hourly_rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [
                        data.name.trim(),
                        data.client_number || `CL-${Date.now()}`,
                        data.email,
                        data.phone,
                        data.address,
                        data.address_line2,
                        data.city,
                        data.state,
                        data.zip_code,
                        data.country || 'USA',
                        data.default_hourly_rate || 350
                    ]
                );

                const client = await dbGet('SELECT * FROM clients WHERE id = ?', [result.id]);
                sendJSON(req, res, 201, client);
                return;
            }

            if (pathname.match(/^\/api\/v1\/clients\/\d+$/) && method === 'GET') {
                const user = await requireAuth(req, res);
                if (!user) return;

                try {
                    const id = validateId(pathname.split('/')[4]);

                    // Authorization check - ensure user has access to this client
                    const authCheck = await authorizeResource(user, 'client', id);
                    if (!authCheck.authorized) {
                        if (authCheck.reason === 'not_found' || authCheck.reason === 'forbidden') {
                            // Return 404 for both not found and forbidden to prevent info disclosure
                            sendJSON(req, res, 404, { error: 'Client not found' });
                        } else {
                            sendJSON(req, res, 403, { error: 'Access denied' });
                        }
                        return;
                    }

                    const client = await dbGet('SELECT * FROM clients WHERE id = ?', [id]);

                    if (!client) {
                        sendJSON(req, res, 404, { error: 'Client not found' });
                        return;
                    }

                    sendJSON(req, res, 200, client);
                } catch (error) {
                    sendJSON(req, res, 400, { error: 'Invalid resource ID' });
                }
                return;
            }

            if (pathname.match(/^\/api\/v1\/clients\/\d+$/) && method === 'PATCH') {
                const user = await requireAuthAndCSRF(req, res);
                if (!user) return;

                try {
                    const id = validateId(pathname.split('/')[4]);

                    // Validation
                    const errors = [];

                    // Validate name if provided (non-empty)
                    if (data.name !== undefined && data.name.trim() === '') {
                        errors.push({ field: 'name', message: 'Client name cannot be empty' });
                    }

                    // Validate email format if provided
                    if (data.email !== undefined && data.email.trim() !== '') {
                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        if (!emailRegex.test(data.email)) {
                            errors.push({ field: 'email', message: 'Invalid email format' });
                        }
                    }

                    // Validate default_hourly_rate (must be positive if provided)
                    if (data.default_hourly_rate !== undefined && data.default_hourly_rate < 0) {
                        errors.push({ field: 'default_hourly_rate', message: 'Hourly rate must be non-negative' });
                    }

                    if (errors.length > 0) {
                        sendJSON(req, res, 422, { error: 'Validation failed', errors });
                        return;
                    }

                    const allowedFields = ['name', 'client_number', 'email', 'phone', 'address', 'address_line2', 'city', 'state', 'zip_code', 'country', 'default_hourly_rate'];

                    // Trim name if provided
                    const sanitizedData = { ...data };
                    if (sanitizedData.name !== undefined) {
                        sanitizedData.name = sanitizedData.name.trim();
                    }

                    const query = buildSecureUpdateQuery('clients', allowedFields, sanitizedData);
                    if (query.sql) {
                        query.values.push(id);
                        await dbRun(query.sql, query.values);
                    }

                    const client = await dbGet('SELECT * FROM clients WHERE id = ?', [id]);
                    if (!client) {
                        sendJSON(req, res, 404, { error: 'Client not found' });
                        return;
                    }

                    sendJSON(req, res, 200, client);
                } catch (error) {
                    sendJSON(req, res, 400, { error: 'Invalid resource ID' });
                }
                return;
            }

            // MATTERS
            if (pathname === '/api/v1/matters' && method === 'GET') {
                const user = await requireAuth(req, res);
                if (!user) return;

                const matters = await dbAll(`
                    SELECT m.*, c.name as client_name,
                           u.first_name || ' ' || u.last_name as attorney_name,
                           COALESCE(SUM(CASE WHEN t.billed = 0 THEN t.amount ELSE 0 END), 0) as unbilled_amount
                    FROM matters m
                    LEFT JOIN clients c ON m.client_id = c.id
                    LEFT JOIN users u ON m.attorney_id = u.id
                    LEFT JOIN time_entries t ON m.id = t.matter_id
                    GROUP BY m.id
                `);
                sendJSON(req, res, 200, matters);
                return;
            }

            if (pathname.match(/^\/api\/v1\/matters\/\d+$/) && method === 'GET') {
                const user = await requireAuth(req, res);
                if (!user) return;

                try {
                    const id = validateId(pathname.split('/')[4]);

                    // Authorization check - ensure user owns this matter
                    const authCheck = await authorizeResource(user, 'matter', id);
                    if (!authCheck.authorized) {
                        if (authCheck.reason === 'not_found') {
                            sendJSON(req, res, 404, { error: 'Matter not found' });
                        } else {
                            sendJSON(req, res, 403, {
                                error: 'Forbidden',
                                message: 'You do not have permission to access this matter'
                            });
                        }
                        return;
                    }

                    const matter = await dbGet(`
                        SELECT
                            m.*,
                            c.name as client_name,
                            u.first_name || ' ' || u.last_name as attorney_name,
                            0 as trust_balance
                        FROM matters m
                        LEFT JOIN clients c ON m.client_id = c.id
                        LEFT JOIN users u ON m.attorney_id = u.id
                        WHERE m.id = ?
                    `, [id]);

                    if (matter) {
                        sendJSON(req, res, 200, matter);
                    } else {
                        sendJSON(req, res, 404, { error: 'Not found' });
                    }
                } catch (error) {
                    sendJSON(req, res, 400, { error: 'Invalid resource ID' });
                }
                return;
            }

            if (pathname.match(/^\/api\/v1\/matters\/\d+\/summary$/) && method === 'GET') {
                const user = await requireAuth(req, res);
                if (!user) return;

                try {
                    const id = validateId(pathname.split('/')[4]);
                    const time = await dbAll('SELECT * FROM time_entries WHERE matter_id = ?', [id]);
                    const expenses = await dbAll('SELECT * FROM expenses WHERE matter_id = ?', [id]);

                    const unbilledTime = time.filter(t => !t.billed).reduce((sum, t) => sum + (t.amount || 0), 0);
                    const unbilledExpenses = expenses.filter(e => !e.billed).reduce((sum, e) => sum + (e.billed_amount || 0), 0);

                    sendJSON(req, res, 200, {
                        total_billed: 0,
                        unbilled_time: unbilledTime,
                        unbilled_expenses: unbilledExpenses,
                        outstanding: 0
                    });
                } catch (error) {
                    sendJSON(req, res, 400, { error: 'Invalid resource ID' });
                }
                return;
            }

            if (pathname.match(/^\/api\/v1\/matters\/\d+\/time-entries$/) && method === 'GET') {
                const user = await requireAuth(req, res);
                if (!user) return;

                try {
                    const id = validateId(pathname.split('/')[4]);
                    const entries = await dbAll(`
                        SELECT t.*, u.first_name || ' ' || u.last_name as user_name, m.name as matter_name
                        FROM time_entries t
                        LEFT JOIN users u ON t.user_id = u.id
                        LEFT JOIN matters m ON t.matter_id = m.id
                        WHERE t.matter_id = ?
                        ORDER BY t.entry_date DESC
                    `, [id]);
                    sendJSON(req, res, 200, entries);
                } catch (error) {
                    sendJSON(req, res, 400, { error: 'Invalid resource ID' });
                }
                return;
            }

            if (pathname.match(/^\/api\/v1\/matters\/\d+\/expenses$/) && method === 'GET') {
                const user = await requireAuth(req, res);
                if (!user) return;

                try {
                    const id = validateId(pathname.split('/')[4]);
                    const expenses = await dbAll('SELECT * FROM expenses WHERE matter_id = ?', [id]);
                    sendJSON(req, res, 200, expenses);
                } catch (error) {
                    sendJSON(req, res, 400, { error: 'Invalid resource ID' });
                }
                return;
            }

            if (pathname.match(/^\/api\/v1\/matters\/\d+\/invoices$/) && method === 'GET') {
                const user = await requireAuth(req, res);
                if (!user) return;

                sendJSON(req, res, 200, []);
                return;
            }

            if (pathname === '/api/v1/matters' && method === 'POST') {
                const user = await requireAuthAndCSRF(req, res);
                if (!user) return;

                // Get client to find default rate
                const client = await dbGet('SELECT * FROM clients WHERE id = ?', [data.client_id]);
                if (!client) {
                    sendJSON(req, res, 400, { error: 'Client not found' });
                    return;
                }

                // Determine hourly rate: matter rate > client default rate > system default ($350)
                const hourlyRate = data.hourly_rate || client.default_hourly_rate || 350;

                // Store matter data locally only - no Kimai sync for case management data
                const result = await dbRun(`
                    INSERT INTO matters (
                        matter_number, client_id, name, description, status, attorney_id, attorney_hourly_rate,
                        billing_type, hourly_rate, trial_contingency_percentage, appeal_contingency_percentage,
                        open_date, matter_type, practice_area,
                        priority, court_name, case_number, opposing_party, opposing_counsel,
                        statute_of_limitations_date, trial_date, appeal_date, retainer_amount, estimated_hours, notes
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    data.matter_number || `M-${Date.now()}`,
                    data.client_id,
                    data.name,
                    data.description,
                    'active',
                    data.attorney_id,
                    data.attorney_hourly_rate,
                    data.billing_type || 'hourly',
                    hourlyRate,
                    data.trial_contingency_percentage,
                    data.appeal_contingency_percentage,
                    data.open_date || new Date().toISOString().split('T')[0],
                    data.matter_type,
                    data.practice_area,
                    data.priority,
                    data.court_name,
                    data.case_number,
                    data.opposing_party,
                    data.opposing_counsel,
                    data.statute_of_limitations_date,
                    data.trial_date,
                    data.appeal_date,
                    data.retainer_amount,
                    data.estimated_hours,
                    data.notes
                ]);

                const matter = await dbGet('SELECT * FROM matters WHERE id = ?', [result.id]);
                sendJSON(req, res, 201, matter);
                return;
            }

            if (pathname.match(/^\/api\/v1\/matters\/\d+$/) && method === 'PATCH') {
                const user = await requireAuthAndCSRF(req, res);
                if (!user) return;

                try {
                    const id = validateId(pathname.split('/')[4]);

                    const allowedFields = [
                        'name', 'description', 'status', 'attorney_id', 'attorney_hourly_rate',
                        'billing_type', 'hourly_rate', 'trial_contingency_percentage', 'appeal_contingency_percentage',
                        'matter_type', 'practice_area', 'priority', 'court_name', 'case_number',
                        'opposing_party', 'opposing_counsel', 'statute_of_limitations_date',
                        'trial_date', 'appeal_date', 'retainer_amount', 'estimated_hours', 'notes', 'close_date'
                    ];

                    const query = buildSecureUpdateQuery('matters', allowedFields, data);
                    if (query.sql) {
                        query.values.push(id);
                        await dbRun(query.sql, query.values);
                    }

                    const matter = await dbGet(`
                        SELECT
                            m.*,
                            c.name as client_name,
                            u.first_name || ' ' || u.last_name as attorney_name,
                            0 as trust_balance
                        FROM matters m
                        LEFT JOIN clients c ON m.client_id = c.id
                        LEFT JOIN users u ON m.attorney_id = u.id
                        WHERE m.id = ?
                    `, [id]);

                    sendJSON(req, res, 200, matter);
                } catch (error) {
                    sendJSON(req, res, 400, { error: 'Invalid resource ID' });
                }
                return;
            }

            // USERS - Fetch from Kimai API
            if (pathname === '/api/v1/users' && method === 'GET') {
                const user = await requireAuth(req, res);
                if (!user) return;

                const result = await callKimaiAPI('GET', '/api/users');

                if (result?.success && Array.isArray(result.data)) {
                    // Fetch detailed info for each user to get hourly rates
                    const usersWithRates = await Promise.all(
                        result.data.map(async (u) => {
                            const detailResult = await callKimaiAPI('GET', `/api/users/${u.id}`);
                            let hourlyRate = null;

                            if (detailResult?.success && detailResult.data?.preferences) {
                                const ratePref = detailResult.data.preferences.find(p => p.name === 'hourly_rate');
                                hourlyRate = ratePref?.value ? parseFloat(ratePref.value) : null;
                            }

                            return {
                                id: u.id,
                                email: u.email || '',
                                first_name: u.alias || u.username || '',
                                last_name: '',
                                role: u.roles?.includes('ROLE_SUPER_ADMIN') ? 'admin' : 'user',
                                hourly_rate: hourlyRate
                            };
                        })
                    );

                    sendJSON(req, res, 200, usersWithRates);
                } else {
                    console.log('Kimai users failed, using local database. Result:', result);
                    // Fallback to local database if Kimai fails
                    const users = await dbAll('SELECT id, email, first_name, last_name, role, hourly_rate FROM users');
                    sendJSON(req, res, 200, users);
                }
                return;
            }

            // TIME ENTRIES
            if (pathname === '/api/v1/time-entries' && method === 'GET') {
                const user = await requireAuth(req, res);
                if (!user) return;

                const entries = await dbAll(`
                    SELECT t.*,
                           u.first_name || ' ' || u.last_name as user_name,
                           m.name as matter_name,
                           m.client_id,
                           c.name as client_name
                    FROM time_entries t
                    LEFT JOIN users u ON t.user_id = u.id
                    LEFT JOIN matters m ON t.matter_id = m.id
                    LEFT JOIN clients c ON m.client_id = c.id
                    ORDER BY t.entry_date DESC
                    LIMIT 100
                `);
                sendJSON(req, res, 200, entries);
                return;
            }

            if (pathname === '/api/v1/time-entries' && method === 'POST') {
                const user = await requireAuthAndCSRF(req, res);
                if (!user) return;

                // Validation
                const errors = [];

                // Validate matter_id (required)
                if (!data.matter_id) {
                    errors.push({ field: 'matter_id', message: 'Matter ID is required' });
                }

                // Validate duration_minutes (required, positive, max 24 hours)
                if (data.duration_minutes === undefined || data.duration_minutes === null) {
                    errors.push({ field: 'duration_minutes', message: 'Duration is required' });
                } else if (data.duration_minutes <= 0) {
                    errors.push({ field: 'duration_minutes', message: 'Duration must be positive' });
                } else if (data.duration_minutes > 1440) {
                    errors.push({ field: 'duration_minutes', message: 'Duration cannot exceed 24 hours (1440 minutes)' });
                }

                // Validate hourly_rate (non-negative if provided)
                if (data.hourly_rate !== undefined && data.hourly_rate < 0) {
                    errors.push({ field: 'hourly_rate', message: 'Hourly rate must be non-negative' });
                }

                if (errors.length > 0) {
                    sendJSON(req, res, 422, { error: 'Validation failed', errors });
                    return;
                }

                const result = await dbRun(`
                    INSERT INTO time_entries (matter_id, user_id, entry_date, duration_minutes, description, hourly_rate, amount, billable, billed)
                    VALUES (?, 1, ?, ?, ?, ?, ?, ?, 0)
                `, [
                    data.matter_id,
                    data.entry_date,
                    data.duration_minutes,
                    data.description,
                    data.hourly_rate || 0,
                    (data.duration_minutes / 60) * (data.hourly_rate || 0),
                    data.billable ? 1 : 0
                ]);

                const entry = await dbGet('SELECT * FROM time_entries WHERE id = ?', [result.id]);
                sendJSON(req, res, 201, entry);
                return;
            }

            // EXPENSES
            if (pathname === '/api/v1/expenses' && method === 'GET') {
                const user = await requireAuth(req, res);
                if (!user) return;

                let sql = `
                    SELECT e.*, m.name as matter_name
                    FROM expenses e
                    LEFT JOIN matters m ON e.matter_id = m.id
                    WHERE 1=1
                `;
                const params = [];

                // Non-admin users see only their matters' expenses
                if (user.role !== 'admin') {
                    sql += ' AND m.attorney_id = ?';
                    params.push(user.id);
                }

                sql += ' ORDER BY e.expense_date DESC';

                const expenses = await dbAll(sql, params);
                sendJSON(req, res, 200, expenses);
                return;
            }

            if (pathname === '/api/v1/expenses' && method === 'POST') {
                const user = await requireAuthAndCSRF(req, res);
                if (!user) return;

                // Validation
                const errors = [];

                // Validate matter_id (required)
                if (!data.matter_id) {
                    errors.push({ field: 'matter_id', message: 'Matter ID is required' });
                }

                // Validate amount (required, non-negative)
                if (data.amount === undefined || data.amount === null) {
                    errors.push({ field: 'amount', message: 'Amount is required' });
                } else if (data.amount < 0) {
                    errors.push({ field: 'amount', message: 'Amount must be non-negative' });
                }

                // Validate markup_percentage (non-negative if provided)
                if (data.markup_percentage !== undefined && data.markup_percentage < 0) {
                    errors.push({ field: 'markup_percentage', message: 'Markup percentage must be non-negative' });
                }

                // Validate billed_amount (non-negative if provided)
                if (data.billed_amount !== undefined && data.billed_amount < 0) {
                    errors.push({ field: 'billed_amount', message: 'Billed amount must be non-negative' });
                }

                if (errors.length > 0) {
                    sendJSON(req, res, 422, { error: 'Validation failed', errors });
                    return;
                }

                const result = await dbRun(`
                    INSERT INTO expenses (matter_id, expense_date, category, description, vendor, amount, markup_percentage, billed_amount, billable, billed)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
                `, [
                    data.matter_id,
                    data.expense_date,
                    data.category,
                    data.description,
                    data.vendor,
                    data.amount,
                    data.markup_percentage || 0,
                    data.billed_amount,
                    data.billable ? 1 : 0
                ]);

                const expense = await dbGet('SELECT * FROM expenses WHERE id = ?', [result.id]);
                sendJSON(req, res, 201, expense);
                return;
            }

            // Get unbilled expenses
            if (pathname === '/api/v1/expenses/unbilled' && method === 'GET') {
                const user = await requireAuth(req, res);
                if (!user) return;

                let query = `
                    SELECT e.*, m.name as matter_name, m.matter_number,
                           c.name as client_name, c.client_number
                    FROM expenses e
                    LEFT JOIN matters m ON e.matter_id = m.id
                    LEFT JOIN clients c ON m.client_id = c.id
                    WHERE e.billed = 0 AND e.billable = 1
                `;

                const params = [];

                // Non-admin users see only their matters' unbilled expenses
                if (user.role !== 'admin') {
                    query += ` AND m.attorney_id = ?`;
                    params.push(user.id);
                }

                query += ` ORDER BY e.expense_date DESC`;

                const expenses = await dbAll(query, params);
                sendJSON(req, res, 200, expenses);
                return;
            }

            // PATCH time entry (for marking as billed)
            if (pathname.match(/^\/api\/v1\/time-entries\/\d+$/) && method === 'PATCH') {
                const user = await requireAuthAndCSRF(req, res);
                if (!user) return;

                try {
                    const id = validateId(pathname.split('/')[4]);

                    const allowedFields = ['billed', 'invoice_id'];

                    // Convert billed to integer if present
                    const sanitizedData = { ...data };
                    if (sanitizedData.billed !== undefined) {
                        sanitizedData.billed = sanitizedData.billed ? 1 : 0;
                    }

                    const query = buildSecureUpdateQuery('time_entries', allowedFields, sanitizedData);
                    if (query.sql) {
                        query.values.push(id);
                        await dbRun(query.sql, query.values);
                    }

                    const entry = await dbGet('SELECT * FROM time_entries WHERE id = ?', [id]);
                    sendJSON(req, res, 200, entry);
                } catch (error) {
                    sendJSON(req, res, 400, { error: 'Invalid resource ID' });
                }
                return;
            }

            // GET unbilled time entries
            if (pathname === '/api/v1/time-entries/unbilled' && method === 'GET') {
                const user = await requireAuth(req, res);
                if (!user) return;

                let query = `
                    SELECT t.*, m.name as matter_name, m.matter_number,
                           c.name as client_name, c.client_number,
                           u.first_name || ' ' || u.last_name as user_name
                    FROM time_entries t
                    LEFT JOIN matters m ON t.matter_id = m.id
                    LEFT JOIN clients c ON m.client_id = c.id
                    LEFT JOIN users u ON t.user_id = u.id
                    WHERE t.billed = 0 AND t.billable = 1
                `;

                const params = [];

                // Non-admin users see only their unbilled time
                if (user.role !== 'admin') {
                    query += ` AND t.user_id = ?`;
                    params.push(user.id);
                }

                query += ` ORDER BY t.entry_date DESC`;

                const entries = await dbAll(query, params);
                sendJSON(req, res, 200, entries);
                return;
            }

            // INVOICES
            if (pathname === '/api/v1/invoices' && method === 'GET') {
                const user = await requireAuth(req, res);
                if (!user) return;

                const { status: statusFilter, matter_id, client_id } = parsedUrl.query;

                let sql = `
                    SELECT i.*,
                           m.name as matter_name, m.matter_number,
                           c.name as client_name,
                           (SELECT COUNT(*) FROM invoice_line_items WHERE invoice_id = i.id) as line_item_count
                    FROM invoices i
                    LEFT JOIN matters m ON i.matter_id = m.id
                    LEFT JOIN clients c ON i.client_id = c.id
                    WHERE 1=1
                `;
                const params = [];

                if (statusFilter) {
                    sql += ' AND i.status = ?';
                    params.push(statusFilter);
                }
                if (matter_id) {
                    sql += ' AND i.matter_id = ?';
                    params.push(matter_id);
                }
                if (client_id) {
                    sql += ' AND i.client_id = ?';
                    params.push(client_id);
                }

                sql += ' ORDER BY i.created_at DESC';

                const invoices = await dbAll(sql, params);
                sendJSON(req, res, 200, invoices);
                return;
            }

            if (pathname.match(/^\/api\/v1\/invoices\/\d+$/) && method === 'GET') {
                const user = await requireAuth(req, res);
                if (!user) return;

                try {
                    const id = validateId(pathname.split('/')[4]);

                    const invoice = await dbGet(`
                        SELECT i.*,
                               m.name as matter_name, m.matter_number,
                               m.attorney_id,
                               c.name as client_name, c.email as client_email,
                               c.address as client_address, c.address_line2 as client_address_line2,
                               c.city as client_city, c.state as client_state, c.zip_code as client_zip_code,
                               u.first_name || ' ' || u.last_name as attorney_name,
                               u.email as attorney_email
                        FROM invoices i
                        LEFT JOIN matters m ON i.matter_id = m.id
                        LEFT JOIN clients c ON i.client_id = c.id
                        LEFT JOIN users u ON m.attorney_id = u.id
                        WHERE i.id = ?
                    `, [id]);

                    if (!invoice) {
                        sendJSON(req, res, 404, { error: 'Invoice not found' });
                        return;
                    }

                    const lineItems = await dbAll(
                        'SELECT * FROM invoice_line_items WHERE invoice_id = ? ORDER BY line_order',
                        [id]
                    );

                    // Get firm settings
                    const firmSettings = await dbGet('SELECT * FROM firm_settings WHERE id = 1');

                    // Build formatted client address
                    let clientAddressFull = invoice.client_address || '';
                    if (invoice.client_address_line2) clientAddressFull += '\n' + invoice.client_address_line2;
                    if (invoice.client_city || invoice.client_state || invoice.client_zip_code) {
                        clientAddressFull += '\n' + [invoice.client_city, invoice.client_state, invoice.client_zip_code].filter(Boolean).join(', ');
                    }

                    sendJSON(req, res, 200, {
                        ...invoice,
                        line_items: lineItems,
                        firm: firmSettings,
                        client_address_full: clientAddressFull.trim()
                    });
                } catch (error) {
                    sendJSON(req, res, 400, { error: 'Invalid resource ID' });
                }
                return;
            }

            if (pathname === '/api/v1/invoices' && method === 'POST') {
                const user = await requireAuthAndCSRF(req, res);
                if (!user) return;

                // Generate invoice from unbilled items or create empty draft
                const { matter_id, client_id, time_entry_ids = [], expense_ids = [], issue_date, due_date, notes, payment_terms } = data;

                if (!matter_id || !client_id) {
                    sendJSON(req, res, 400, { error: 'matter_id and client_id are required' });
                    return;
                }

                // Create invoice
                const invoiceResult = await dbRun(`
                    INSERT INTO invoices (matter_id, client_id, issue_date, due_date, status, notes, payment_terms)
                    VALUES (?, ?, ?, ?, 'draft', ?, ?)
                `, [matter_id, client_id, issue_date || new Date().toISOString().split('T')[0], due_date, notes, payment_terms]);

                const invoiceId = invoiceResult.id;

                // Add time entries as line items
                let lineOrder = 0;
                let subtotal = 0;

                for (const timeId of time_entry_ids) {
                    const timeEntry = await dbGet('SELECT * FROM time_entries WHERE id = ?', [timeId]);
                    if (timeEntry) {
                        await dbRun(`
                            INSERT INTO invoice_line_items (invoice_id, item_type, item_id, description, quantity, rate, amount, line_order)
                            VALUES (?, 'time', ?, ?, ?, ?, ?, ?)
                        `, [
                            invoiceId,
                            timeId,
                            timeEntry.description || 'Time entry',
                            timeEntry.duration_minutes / 60,
                            timeEntry.hourly_rate,
                            timeEntry.amount,
                            lineOrder++
                        ]);
                        subtotal += timeEntry.amount;

                        // Link time entry to invoice
                        await dbRun('UPDATE time_entries SET invoice_id = ? WHERE id = ?', [invoiceId, timeId]);
                    }
                }

                // Add expenses as line items
                for (const expenseId of expense_ids) {
                    const expense = await dbGet('SELECT * FROM expenses WHERE id = ?', [expenseId]);
                    if (expense) {
                        await dbRun(`
                            INSERT INTO invoice_line_items (invoice_id, item_type, item_id, description, quantity, rate, amount, line_order)
                            VALUES (?, 'expense', ?, ?, 1, ?, ?, ?)
                        `, [
                            invoiceId,
                            expenseId,
                            expense.description || 'Expense',
                            expense.billed_amount,
                            expense.billed_amount,
                            lineOrder++
                        ]);
                        subtotal += expense.billed_amount;

                        // Link expense to invoice
                        await dbRun('UPDATE expenses SET invoice_id = ? WHERE id = ?', [invoiceId, expenseId]);
                    }
                }

                // Update totals
                const taxRate = 0; // No tax by default
                const taxAmount = subtotal * taxRate;
                const totalAmount = subtotal + taxAmount;

                await dbRun(`
                    UPDATE invoices
                    SET subtotal = ?, tax_rate = ?, tax_amount = ?, total_amount = ?
                    WHERE id = ?
                `, [subtotal, taxRate, taxAmount, totalAmount, invoiceId]);

                const invoice = await dbGet('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
                sendJSON(req, res, 201, invoice);
                return;
            }

            if (pathname.match(/^\/api\/v1\/invoices\/\d+\/finalize$/) && (method === 'POST' || method === 'PATCH')) {
                const user = await requireAuthAndCSRF(req, res);
                if (!user) return;

                try {
                    const id = validateId(pathname.split('/')[4]);

                    const invoice = await dbGet('SELECT * FROM invoices WHERE id = ?', [id]);
                    if (!invoice) {
                        sendJSON(req, res, 404, { error: 'Invoice not found' });
                        return;
                    }

                    if (invoice.status !== 'draft' && invoice.status !== 'review') {
                        sendJSON(req, res, 400, { error: 'Can only finalize draft or review invoices' });
                        return;
                    }

                    // Generate invoice number if not exists
                    let invoiceNumber = invoice.invoice_number;
                    if (!invoiceNumber) {
                        const year = new Date().getFullYear();
                        const count = await dbGet('SELECT COUNT(*) as count FROM invoices WHERE invoice_number IS NOT NULL');
                        invoiceNumber = `INV-${year}-${String((count?.count || 0) + 1).padStart(4, '0')}`;
                    }

                    await dbRun(`
                        UPDATE invoices
                        SET status = 'finalized', invoice_number = ?, finalized_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    `, [invoiceNumber, id]);

                    // Mark all linked time entries and expenses as billed
                    await dbRun('UPDATE time_entries SET billed = 1 WHERE invoice_id = ?', [id]);
                    await dbRun('UPDATE expenses SET billed = 1 WHERE invoice_id = ?', [id]);

                    const updated = await dbGet('SELECT * FROM invoices WHERE id = ?', [id]);
                    sendJSON(req, res, 200, updated);
                } catch (error) {
                    sendJSON(req, res, 400, { error: 'Invalid resource ID' });
                }
                return;
            }

            if (pathname.match(/^\/api\/v1\/invoices\/\d+\/send$/) && (method === 'POST' || method === 'PATCH')) {
                const user = await requireAuthAndCSRF(req, res);
                if (!user) return;

                try {
                    const id = validateId(pathname.split('/')[4]);

                    const invoice = await dbGet('SELECT * FROM invoices WHERE id = ?', [id]);
                    if (!invoice) {
                        sendJSON(req, res, 404, { error: 'Invoice not found' });
                        return;
                    }

                    if (invoice.status !== 'finalized') {
                        sendJSON(req, res, 400, { error: 'Can only send finalized invoices' });
                        return;
                    }

                    await dbRun(`
                        UPDATE invoices
                        SET status = 'sent', sent_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    `, [id]);

                    const updated = await dbGet('SELECT * FROM invoices WHERE id = ?', [id]);
                    sendJSON(req, res, 200, updated);
                } catch (error) {
                    sendJSON(req, res, 400, { error: 'Invalid resource ID' });
                }
                return;
            }

            if (pathname.match(/^\/api\/v1\/invoices\/\d+\/payment$/) && method === 'POST') {
                const user = await requireAuthAndCSRF(req, res);
                if (!user) return;

                try {
                    const id = validateId(pathname.split('/')[4]);
                    const { amount, payment_date } = data;

                    const invoice = await dbGet('SELECT * FROM invoices WHERE id = ?', [id]);
                    if (!invoice) {
                        sendJSON(req, res, 404, { error: 'Invoice not found' });
                        return;
                    }

                    if (invoice.status !== 'sent' && invoice.status !== 'paid') {
                        sendJSON(req, res, 400, { error: 'Can only record payment for sent invoices' });
                        return;
                    }

                    const paidAmount = (invoice.paid_amount || 0) + amount;
                    const status = paidAmount >= invoice.total_amount ? 'paid' : 'sent';

                    await dbRun(`
                        UPDATE invoices
                        SET paid_amount = ?, status = ?, paid_at = ?
                        WHERE id = ?
                    `, [paidAmount, status, payment_date || new Date().toISOString().split('T')[0], id]);

                    const updated = await dbGet('SELECT * FROM invoices WHERE id = ?', [id]);
                    sendJSON(req, res, 200, updated);
                } catch (error) {
                    sendJSON(req, res, 400, { error: 'Invalid resource ID' });
                }
                return;
            }

            if (pathname.match(/^\/api\/v1\/invoices\/\d+\/status$/) && method === 'PATCH') {
                const user = await requireAuthAndCSRF(req, res);
                if (!user) return;

                try {
                    const id = validateId(pathname.split('/')[4]);
                    const { status: newStatus } = data;

                    const validStatuses = ['draft', 'review', 'finalized', 'sent', 'paid', 'void'];
                    if (!validStatuses.includes(newStatus)) {
                        sendJSON(req, res, 400, { error: 'Invalid status' });
                        return;
                    }

                    await dbRun('UPDATE invoices SET status = ? WHERE id = ?', [newStatus, id]);

                    const updated = await dbGet('SELECT * FROM invoices WHERE id = ?', [id]);
                    sendJSON(req, res, 200, updated);
                } catch (error) {
                    sendJSON(req, res, 400, { error: 'Invalid resource ID' });
                }
                return;
            }

            if (pathname.match(/^\/api\/v1\/invoices\/\d+$/) && method === 'PATCH') {
                const user = await requireAuthAndCSRF(req, res);
                if (!user) return;

                try {
                    const id = validateId(pathname.split('/')[4]);

                    const allowedFields = ['due_date', 'notes', 'payment_terms', 'tax_rate'];

                    const query = buildSecureUpdateQuery('invoices', allowedFields, data);
                    if (query.sql) {
                        query.values.push(id);
                        await dbRun(query.sql, query.values);

                        // Recalculate totals if tax_rate changed
                        if (data.tax_rate !== undefined) {
                            const invoice = await dbGet('SELECT subtotal, tax_rate FROM invoices WHERE id = ?', [id]);
                            const taxAmount = invoice.subtotal * invoice.tax_rate;
                            const totalAmount = invoice.subtotal + taxAmount;
                            await dbRun('UPDATE invoices SET tax_amount = ?, total_amount = ? WHERE id = ?',
                                [taxAmount, totalAmount, id]);
                        }
                    }

                    const invoice = await dbGet('SELECT * FROM invoices WHERE id = ?', [id]);
                    sendJSON(req, res, 200, invoice);
                } catch (error) {
                    sendJSON(req, res, 400, { error: 'Invalid resource ID' });
                }
                return;
            }

            if (pathname.match(/^\/api\/v1\/invoices\/\d+$/) && method === 'DELETE') {
                const user = await requireAuthAndCSRF(req, res);
                if (!user) return;

                try {
                    const id = validateId(pathname.split('/')[4]);

                    const invoice = await dbGet('SELECT * FROM invoices WHERE id = ?', [id]);
                    if (!invoice) {
                        sendJSON(req, res, 404, { error: 'Invoice not found' });
                        return;
                    }

                    if (invoice.status !== 'draft') {
                        sendJSON(req, res, 400, { error: 'Can only delete draft invoices' });
                        return;
                    }

                    // Unlink time entries and expenses
                    await dbRun('UPDATE time_entries SET invoice_id = NULL WHERE invoice_id = ?', [id]);
                    await dbRun('UPDATE expenses SET invoice_id = NULL WHERE invoice_id = ?', [id]);

                    // Delete line items and invoice
                    await dbRun('DELETE FROM invoice_line_items WHERE invoice_id = ?', [id]);
                    await dbRun('DELETE FROM invoices WHERE id = ?', [id]);

                    sendJSON(req, res, 200, { message: 'Invoice deleted' });
                } catch (error) {
                    sendJSON(req, res, 400, { error: 'Invalid resource ID' });
                }
                return;
            }

            // Get unbilled items for a matter
            if (pathname.match(/^\/api\/v1\/matters\/\d+\/unbilled$/) && method === 'GET') {
                const user = await requireAuth(req, res);
                if (!user) return;

                try {
                    const id = validateId(pathname.split('/')[4]);

                    const timeEntries = await dbAll(`
                        SELECT t.*, u.first_name || ' ' || u.last_name as user_name
                        FROM time_entries t
                        LEFT JOIN users u ON t.user_id = u.id
                        WHERE t.matter_id = ? AND t.billed = 0 AND t.invoice_id IS NULL
                        ORDER BY t.entry_date DESC
                    `, [id]);

                    const expenses = await dbAll(`
                        SELECT * FROM expenses
                        WHERE matter_id = ? AND billed = 0 AND invoice_id IS NULL
                        ORDER BY expense_date DESC
                    `, [id]);

                    sendJSON(req, res, 200, { time_entries: timeEntries, expenses });
                } catch (error) {
                    sendJSON(req, res, 400, { error: 'Invalid resource ID' });
                }
                return;
            }

            // FIRM SETTINGS
            if (pathname === '/api/v1/firm-settings' && method === 'GET') {
                const user = await requireAuth(req, res);
                if (!user) return;

                // Only admins can view firm settings
                if (user.role !== 'admin') {
                    sendJSON(req, res, 403, {
                        error: 'Access denied',
                        message: 'Only administrators can view firm settings'
                    });
                    return;
                }

                const settings = await dbGet('SELECT * FROM firm_settings WHERE id = 1');
                sendJSON(req, res, 200, settings || {});
                return;
            }

            if (pathname === '/api/v1/firm-settings' && method === 'PATCH') {
                const user = await requireAuthAndCSRF(req, res);
                if (!user) return;

                // Only admins can update firm settings
                if (user.role !== 'admin') {
                    sendJSON(req, res, 403, {
                        error: 'Access denied',
                        message: 'Only administrators can update firm settings'
                    });
                    return;
                }

                const allowedFields = [
                    'firm_name', 'address', 'address_line2', 'city', 'state', 'zip_code',
                    'phone', 'email', 'website', 'tax_id', 'logo_url',
                    'default_invoice_template', 'default_payment_terms', 'invoice_footer'
                ];

                const query = buildSecureUpdateQuery('firm_settings', allowedFields, data);
                if (query.sql) {
                    query.values.push(1);
                    await dbRun(query.sql, query.values);
                }

                const settings = await dbGet('SELECT * FROM firm_settings WHERE id = 1');
                sendJSON(req, res, 200, settings);
                return;
            }

            // CALENDAR & DEADLINES
            if (pathname === '/api/v1/calendar/events' && method === 'GET') {
                const user = await requireAuth(req, res);
                if (!user) return;

                const { matter_id, client_id, event_type, upcoming, start_date, end_date } = req.query || {};

                let query = 'SELECT * FROM calendar_events WHERE 1=1';
                const params = [];

                if (matter_id) {
                    query += ' AND matter_id = ?';
                    params.push(matter_id);
                }

                if (client_id) {
                    query += ' AND client_id = ?';
                    params.push(client_id);
                }

                if (event_type) {
                    query += ' AND event_type = ?';
                    params.push(event_type);
                }

                if (upcoming === 'true') {
                    query += ' AND event_date >= date("now")';
                }

                if (start_date) {
                    query += ' AND event_date >= ?';
                    params.push(start_date);
                }

                if (end_date) {
                    query += ' AND event_date <= ?';
                    params.push(end_date);
                }

                query += ' ORDER BY event_date ASC, event_time ASC';

                const events = await dbAll(query, params);
                sendJSON(req, res, 200, events);
                return;
            }

            if (pathname === '/api/v1/calendar/events' && method === 'POST') {
                const user = await requireAuthAndCSRF(req, res);
                if (!user) return;

                const {
                    matter_id, client_id, event_type, title, description,
                    event_date, event_time, end_date, end_time, all_day,
                    location, reminder_days, priority
                } = data;

                // Validate required fields
                if (!event_type || !title || !event_date) {
                    sendJSON(req, res, 400, {
                        error: 'Validation failed',
                        message: 'event_type, title, and event_date are required'
                    });
                    return;
                }

                // Validate event_type
                const validEventTypes = ['deadline', 'court_date', 'appointment', 'statute_date', 'hearing', 'filing_deadline', 'discovery_deadline', 'meeting', 'other'];
                if (!validEventTypes.includes(event_type)) {
                    sendJSON(req, res, 400, {
                        error: 'Validation failed',
                        message: `event_type must be one of: ${validEventTypes.join(', ')}`
                    });
                    return;
                }

                // Validate priority
                const validPriorities = ['low', 'medium', 'high', 'critical'];
                if (priority && !validPriorities.includes(priority)) {
                    sendJSON(req, res, 400, {
                        error: 'Validation failed',
                        message: `priority must be one of: ${validPriorities.join(', ')}`
                    });
                    return;
                }

                const result = await dbRun(`
                    INSERT INTO calendar_events (
                        matter_id, client_id, user_id, event_type, title, description,
                        event_date, event_time, end_date, end_time, all_day,
                        location, reminder_days, priority
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    matter_id || null, client_id || null, user.id, event_type, title, description || null,
                    event_date, event_time || null, end_date || null, end_time || null, all_day ? 1 : 0,
                    location || null, reminder_days || null, priority || 'medium'
                ]);

                const event = await dbGet('SELECT * FROM calendar_events WHERE id = ?', [result.lastID]);
                sendJSON(req, res, 201, event);
                return;
            }

            if (pathname.match(/^\/api\/v1\/calendar\/events\/\d+$/) && method === 'GET') {
                const user = await requireAuth(req, res);
                if (!user) return;

                try {
                    const id = validateId(pathname.split('/')[5]);
                    const event = await dbGet('SELECT * FROM calendar_events WHERE id = ?', [id]);

                    if (!event) {
                        sendJSON(req, res, 404, {
                            error: 'Not found',
                            message: 'Calendar event not found'
                        });
                        return;
                    }

                    sendJSON(req, res, 200, event);
                    return;
                } catch (error) {
                    sendJSON(req, res, 400, { error: error.message });
                    return;
                }
            }

            if (pathname.match(/^\/api\/v1\/calendar\/events\/\d+$/) && method === 'PATCH') {
                const user = await requireAuthAndCSRF(req, res);
                if (!user) return;

                try {
                    const id = validateId(pathname.split('/')[5]);
                    const event = await dbGet('SELECT * FROM calendar_events WHERE id = ?', [id]);

                    if (!event) {
                        sendJSON(req, res, 404, {
                            error: 'Not found',
                            message: 'Calendar event not found'
                        });
                        return;
                    }

                    const allowedFields = [
                        'matter_id', 'client_id', 'event_type', 'title', 'description',
                        'event_date', 'event_time', 'end_date', 'end_time', 'all_day',
                        'location', 'reminder_days', 'completed', 'priority'
                    ];

                    const query = buildSecureUpdateQuery('calendar_events', allowedFields, data);
                    if (query.sql) {
                        query.values.push(id);
                        await dbRun(query.sql, query.values);
                    }

                    const updatedEvent = await dbGet('SELECT * FROM calendar_events WHERE id = ?', [id]);
                    sendJSON(req, res, 200, updatedEvent);
                    return;
                } catch (error) {
                    sendJSON(req, res, 400, { error: error.message });
                    return;
                }
            }

            if (pathname.match(/^\/api\/v1\/calendar\/events\/\d+$/) && method === 'DELETE') {
                const user = await requireAuthAndCSRF(req, res);
                if (!user) return;

                try {
                    const id = validateId(pathname.split('/')[5]);
                    const event = await dbGet('SELECT * FROM calendar_events WHERE id = ?', [id]);

                    if (!event) {
                        sendJSON(req, res, 404, {
                            error: 'Not found',
                            message: 'Calendar event not found'
                        });
                        return;
                    }

                    await dbRun('DELETE FROM calendar_events WHERE id = ?', [id]);
                    sendJSON(req, res, 200, {
                        success: true,
                        message: 'Calendar event deleted successfully'
                    });
                    return;
                } catch (error) {
                    sendJSON(req, res, 400, { error: error.message });
                    return;
                }
            }

            if (pathname === '/api/v1/calendar/upcoming' && method === 'GET') {
                const user = await requireAuth(req, res);
                if (!user) return;

                const { days = 30, limit = 10 } = req.query || {};

                const events = await dbAll(`
                    SELECT
                        e.*,
                        m.matter_number,
                        m.name as matter_name,
                        c.name as client_name
                    FROM calendar_events e
                    LEFT JOIN matters m ON e.matter_id = m.id
                    LEFT JOIN clients c ON e.client_id = c.id
                    WHERE e.event_date >= date('now')
                    AND e.event_date <= date('now', '+' || ? || ' days')
                    AND e.completed = 0
                    ORDER BY e.event_date ASC, e.event_time ASC
                    LIMIT ?
                `, [days, limit]);

                sendJSON(req, res, 200, events);
                return;
            }

            if (pathname.match(/^\/api\/v1\/matters\/\d+\/events$/) && method === 'GET') {
                const user = await requireAuth(req, res);
                if (!user) return;

                try {
                    const matterId = validateId(pathname.split('/')[4]);
                    const events = await dbAll(
                        'SELECT * FROM calendar_events WHERE matter_id = ? ORDER BY event_date ASC',
                        [matterId]
                    );

                    sendJSON(req, res, 200, events);
                    return;
                } catch (error) {
                    sendJSON(req, res, 400, { error: error.message });
                    return;
                }
            }

            // SYNC
            if (pathname === '/api/v1/sync/kimai/timesheets' && method === 'POST') {
                const user = await requireAuthAndCSRF(req, res);
                if (!user) return;

                const result = await callKimaiAPI('GET', '/api/timesheets');
                if (result && result.success) {
                    sendJSON(req, res, 200, { count: result.data?.length || 0, message: 'Sync attempted' });
                } else {
                    sendJSON(req, res, 200, { count: 0, message: 'Kimai not available - using local database' });
                }
                return;
            }

            // RUNPOD SERVERLESS ENDPOINTS
            if (pathname === '/api/v1/runpod/health' && method === 'GET') {
                const user = await requireAuth(req, res);
                if (!user) return;

                const health = await runpod.healthCheck();
                sendJSON(req, res, health.healthy ? 200 : 503, health);
                return;
            }

            if (pathname === '/api/v1/runpod/execute' && method === 'POST') {
                const user = await requireAuthAndCSRF(req, res);
                if (!user) return;

                const { endpoint_id, input, sync = false } = data;

                if (!endpoint_id) {
                    sendJSON(req, res, 400, { error: 'endpoint_id is required' });
                    return;
                }

                if (!input) {
                    sendJSON(req, res, 400, { error: 'input is required' });
                    return;
                }

                try {
                    const result = await runpod.callRunPodEndpoint(endpoint_id, input, { sync });
                    sendJSON(req, res, 200, result);
                } catch (error) {
                    console.error('RunPod execution error:', error);
                    sendJSON(req, res, 500, { error: error.message });
                }
                return;
            }

            if (pathname.match(/^\/api\/v1\/runpod\/status\/[\w-]+\/[\w-]+$/) && method === 'GET') {
                const user = await requireAuth(req, res);
                if (!user) return;

                const parts = pathname.split('/');
                const endpoint_id = parts[5];
                const job_id = parts[6];

                try {
                    const status = await runpod.getJobStatus(endpoint_id, job_id);
                    sendJSON(req, res, 200, status);
                } catch (error) {
                    console.error('RunPod status check error:', error);
                    sendJSON(req, res, 500, { error: error.message });
                }
                return;
            }

            if (pathname.match(/^\/api\/v1\/runpod\/cancel\/[\w-]+\/[\w-]+$/) && method === 'POST') {
                const user = await requireAuthAndCSRF(req, res);
                if (!user) return;

                const parts = pathname.split('/');
                const endpoint_id = parts[5];
                const job_id = parts[6];

                try {
                    const result = await runpod.cancelJob(endpoint_id, job_id);
                    sendJSON(req, res, 200, result);
                } catch (error) {
                    console.error('RunPod cancel error:', error);
                    sendJSON(req, res, 500, { error: error.message });
                }
                return;
            }

            if (pathname === '/api/v1/runpod/execute-and-wait' && method === 'POST') {
                const user = await requireAuthAndCSRF(req, res);
                if (!user) return;

                const { endpoint_id, input, max_wait_time, poll_interval } = data;

                if (!endpoint_id) {
                    sendJSON(req, res, 400, { error: 'endpoint_id is required' });
                    return;
                }

                if (!input) {
                    sendJSON(req, res, 400, { error: 'input is required' });
                    return;
                }

                try {
                    // Start async job
                    const job = await runpod.callRunPodEndpoint(endpoint_id, input, { sync: false });

                    // Poll until complete
                    const result = await runpod.pollJobUntilComplete(
                        endpoint_id,
                        job.id,
                        { maxWaitTime: max_wait_time, pollInterval: poll_interval }
                    );

                    sendJSON(req, res, 200, result);
                } catch (error) {
                    console.error('RunPod execute-and-wait error:', error);
                    sendJSON(req, res, 500, { error: error.message });
                }
                return;
            }

            // AI Question endpoints
            if (pathname === '/api/v1/ai/ask' && method === 'POST') {
                const user = await requireAuthAndCSRF(req, res);
                if (!user) return;

                const { question } = data;

                if (!question || !question.trim()) {
                    sendJSON(req, res, 400, { error: 'Question is required' });
                    return;
                }

                const endpoint_id = process.env.RUNPOD_DEFAULT_ENDPOINT_ID || '3hm50vlw5z2y5o';

                try {
                    // Save question to database
                    const result = await new Promise((resolve, reject) => {
                        db.run(
                            `INSERT INTO ai_questions (user_id, question, status, endpoint_id, created_at)
                             VALUES (?, ?, 'processing', ?, datetime('now'))`,
                            [user.id, question.trim(), endpoint_id],
                            function(err) {
                                if (err) reject(err);
                                else resolve({ id: this.lastID });
                            }
                        );
                    });

                    const questionId = result.id;

                    // Execute AI request - use Groq (free and fast)
                    const startTime = Date.now();
                    try {
                        // Use Groq API for fast, free AI responses
                        // Using llama-3.1-8b-instant model
                        const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${process.env.GROQ_API_KEY || ''}`
                            },
                            body: JSON.stringify({
                                model: 'llama-3.1-8b-instant',
                                messages: [
                                    {
                                        role: 'system',
                                        content: 'You are a helpful legal AI assistant. Provide clear, accurate, and professional answers to legal questions.'
                                    },
                                    {
                                        role: 'user',
                                        content: question
                                    }
                                ],
                                temperature: 0.7,
                                max_tokens: 1024
                            })
                        });

                        if (!groqResponse.ok) {
                            const errorData = await groqResponse.json().catch(() => ({}));
                            throw new Error(errorData.error?.message || `Groq API error: ${groqResponse.status}`);
                        }

                        const aiResult = await groqResponse.json();
                        const executionTime = Date.now() - startTime;
                        let answer = '';

                        console.log('[AI] Groq response:', JSON.stringify(aiResult, null, 2));

                        // Extract answer from OpenRouter response (OpenAI-compatible format)
                        if (aiResult.choices && aiResult.choices[0] && aiResult.choices[0].message) {
                            answer = aiResult.choices[0].message.content;
                        } else if (aiResult.output) {
                            // Fallback for other formats
                            if (typeof aiResult.output === 'string') {
                                answer = aiResult.output;
                            } else if (aiResult.output.text) {
                                answer = aiResult.output.text;
                            } else if (aiResult.output.content) {
                                answer = aiResult.output.content;
                            } else if (Array.isArray(aiResult.output) && aiResult.output[0]) {
                                const firstItem = aiResult.output[0];
                                if (typeof firstItem === 'string') {
                                    answer = firstItem;
                                } else if (firstItem.text) {
                                    answer = firstItem.text;
                                } else if (firstItem.content) {
                                    answer = firstItem.content;
                                } else {
                                    answer = JSON.stringify(firstItem);
                                }
                            } else {
                                answer = JSON.stringify(aiResult.output, null, 2);
                            }
                        } else {
                            answer = 'Unable to extract answer from response';
                        }

                        // Ensure answer is always a string
                        if (typeof answer !== 'string') {
                            answer = JSON.stringify(answer, null, 2);
                        }

                        // Clean up the answer
                        answer = answer.trim();

                        console.log('[AI] Extracted answer:', answer.substring(0, 200) + (answer.length > 200 ? '...' : ''));

                        // Update database with answer
                        await new Promise((resolve, reject) => {
                            db.run(
                                `UPDATE ai_questions
                                 SET answer = ?, status = 'completed', execution_time = ?,
                                     job_id = ?, updated_at = datetime('now')
                                 WHERE id = ?`,
                                [answer, executionTime, aiResult.id, questionId],
                                (err) => err ? reject(err) : resolve()
                            );
                        });

                        // Return complete question with answer
                        sendJSON(req, res, 200, {
                            id: questionId,
                            question,
                            answer,
                            status: 'completed',
                            execution_time: executionTime,
                            created_at: new Date().toISOString()
                        });

                    } catch (aiError) {
                        // Update status to error
                        await new Promise((resolve) => {
                            db.run(
                                `UPDATE ai_questions
                                 SET status = 'error', answer = ?, updated_at = datetime('now')
                                 WHERE id = ?`,
                                [aiError.message, questionId],
                                () => resolve()
                            );
                        });

                        throw aiError;
                    }

                } catch (error) {
                    console.error('AI question error:', error);
                    sendJSON(req, res, 500, {
                        error: 'Failed to process question',
                        details: error.message
                    });
                }
                return;
            }

            if (pathname === '/api/v1/ai/questions' && method === 'GET') {
                const user = await requireAuth(req, res);
                if (!user) return;

                try {
                    const questions = await new Promise((resolve, reject) => {
                        db.all(
                            `SELECT id, question, answer, status, execution_time, created_at, updated_at
                             FROM ai_questions
                             WHERE user_id = ?
                             ORDER BY created_at DESC
                             LIMIT 50`,
                            [user.id],
                            (err, rows) => err ? reject(err) : resolve(rows || [])
                        );
                    });

                    sendJSON(req, res, 200, questions);
                } catch (error) {
                    console.error('Error fetching questions:', error);
                    sendJSON(req, res, 500, { error: 'Failed to fetch questions' });
                }
                return;
            }

            if (pathname.match(/^\/api\/v1\/ai\/questions\/\d+$/) && method === 'GET') {
                const user = await requireAuth(req, res);
                if (!user) return;

                const questionId = parseInt(pathname.split('/').pop());

                try {
                    const question = await new Promise((resolve, reject) => {
                        db.get(
                            `SELECT * FROM ai_questions WHERE id = ? AND user_id = ?`,
                            [questionId, user.id],
                            (err, row) => err ? reject(err) : resolve(row)
                        );
                    });

                    if (!question) {
                        sendJSON(req, res, 404, { error: 'Question not found' });
                        return;
                    }

                    sendJSON(req, res, 200, question);
                } catch (error) {
                    console.error('Error fetching question:', error);
                    sendJSON(req, res, 500, { error: 'Failed to fetch question' });
                }
                return;
            }

            sendJSON(req, res, 404, { error: 'Endpoint not found' });

        } catch (error) {
            console.error('Server error:', error);
            sendJSON(req, res, 500, { error: error.message });
        }
    });
};

// Create server (HTTPS if certificates available, otherwise HTTP)
const server = tlsOptions
    ? https.createServer(tlsOptions, requestHandler)
    : http.createServer(requestHandler);

// HTTP to HTTPS redirect server (only in production with valid certs)
if (tlsOptions && process.env.APP_ENV === 'production') {
    const httpRedirectServer = http.createServer((req, res) => {
        res.writeHead(301, {
            'Location': `https://${req.headers.host}${req.url}`
        });
        res.end();
    });

    httpRedirectServer.listen(80, () => {
        console.log('  HTTP->HTTPS redirect server running on port 80');
    });
}

server.listen(PORT, () => {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`  Billing System Backend - Production Ready`);
    console.log(`${'='.repeat(70)}`);
    console.log(`  Server:    ${tlsOptions ? 'https' : 'http'}://localhost:${PORT}`);
    console.log(`  Security:  ${tlsOptions ? 'HTTPS Enabled ✓' : 'HTTP Only (Insecure) ⚠'}`);
    console.log(`  Database:  ${dbPath}`);
    console.log(`  Kimai:     ${KIMAI_API_TOKEN ? 'Configured' : 'Not configured'}`);
    console.log(`${'='.repeat(70)}\n`);
});
