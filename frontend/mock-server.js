// Simple mock API server for testing frontend
const http = require('http');
const url = require('url');

const PORT = 3000;

// Mock data
const users = [
    { id: '1', email: 'admin@example.com', password: 'password', first_name: 'Admin', last_name: 'User', role: 'admin' },
    { id: '2', email: 'attorney@example.com', password: 'password', first_name: 'John', last_name: 'Attorney', role: 'attorney' }
];

const matters = [
    { id: '1', matter_number: 'M-2025-001', client_id: '1', client_name: 'Acme Corp', name: 'Contract Dispute', status: 'active', attorney_name: 'John Attorney', unbilled_amount: 2500.00 },
    { id: '2', matter_number: 'M-2025-002', client_id: '2', client_name: 'Tech Inc', name: 'Patent Filing', status: 'active', attorney_name: 'John Attorney', unbilled_amount: 1200.00 }
];

const timeEntries = [
    { id: '1', matter_id: '1', matter_name: 'Contract Dispute', user_id: '2', user_name: 'John Attorney', entry_date: '2025-10-05', duration_minutes: 180, description: 'Legal research on contract terms', hourly_rate: 300, amount: 900, billed: false },
    { id: '2', matter_id: '1', matter_name: 'Contract Dispute', user_id: '2', user_name: 'John Attorney', entry_date: '2025-10-04', duration_minutes: 120, description: 'Client meeting and strategy discussion', hourly_rate: 300, amount: 600, billed: false }
];

const expenses = [
    { id: '1', matter_id: '1', matter_name: 'Contract Dispute', expense_date: '2025-10-05', category: 'filing_fees', description: 'Court filing fee', vendor: 'County Clerk', amount: 350, markup_percentage: 0, billed_amount: 350, billed: false },
    { id: '2', matter_id: '2', matter_name: 'Patent Filing', expense_date: '2025-10-04', category: 'travel', description: 'Travel to USPTO', vendor: 'Airlines', amount: 450, markup_percentage: 10, billed_amount: 495, billed: false }
];

const clients = [
    { id: '1', name: 'Acme Corp', client_number: 'CL-001' },
    { id: '2', name: 'Tech Inc', client_number: 'CL-002' }
];

function handleCORS(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function sendJSON(res, statusCode, data) {
    handleCORS(res);
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
}

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;
    const method = req.method;

    // Handle OPTIONS (CORS preflight)
    if (method === 'OPTIONS') {
        handleCORS(res);
        res.writeHead(204);
        res.end();
        return;
    }

    console.log(`${method} ${path}`);

    // Parse body for POST/PUT requests
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });

    req.on('end', () => {
        const data = body ? JSON.parse(body) : {};

        // Routes
        if (path === '/api/v1/auth/login' && method === 'POST') {
            const user = users.find(u => u.email === data.email && u.password === data.password);
            if (user) {
                sendJSON(res, 200, {
                    token: 'mock-jwt-token-' + user.id,
                    user: { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name, role: user.role }
                });
            } else {
                sendJSON(res, 401, { error: 'Invalid credentials' });
            }
        }
        else if (path === '/api/v1/auth/me' && method === 'GET') {
            sendJSON(res, 200, users[1]);
        }
        else if (path === '/api/v1/dashboard/stats' && method === 'GET') {
            sendJSON(res, 200, {
                activeMatters: 2,
                unbilledHours: 5,
                unbilledAmount: 3700,
                monthRevenue: 12500
            });
        }
        else if (path === '/api/v1/dashboard/activity' && method === 'GET') {
            sendJSON(res, 200, [
                { type: 'time_entry', description: 'Logged 3 hours on Contract Dispute', timestamp: new Date().toISOString() },
                { type: 'expense', description: 'Added $350 expense for Court filing fee', timestamp: new Date(Date.now() - 3600000).toISOString() },
                { type: 'matter', description: 'Created new matter: Patent Filing', timestamp: new Date(Date.now() - 7200000).toISOString() }
            ]);
        }
        else if (path === '/api/v1/matters' && method === 'GET') {
            sendJSON(res, 200, matters);
        }
        else if (path.startsWith('/api/v1/matters/') && method === 'GET') {
            const id = path.split('/')[4];
            if (path.includes('/summary')) {
                sendJSON(res, 200, {
                    total_billed: 5000,
                    unbilled_time: 1500,
                    unbilled_expenses: 350,
                    outstanding: 2000
                });
            } else if (path.includes('/time-entries')) {
                sendJSON(res, 200, timeEntries.filter(e => e.matter_id === id));
            } else if (path.includes('/expenses')) {
                sendJSON(res, 200, expenses.filter(e => e.matter_id === id));
            } else if (path.includes('/invoices')) {
                sendJSON(res, 200, []);
            } else {
                const matter = matters.find(m => m.id === id);
                if (matter) {
                    sendJSON(res, 200, {
                        ...matter,
                        description: 'Detailed description of the matter',
                        matter_type: 'litigation',
                        attorney_name: 'John Attorney',
                        open_date: '2025-01-15',
                        billing_type: 'hourly',
                        hourly_rate: 300,
                        trust_balance: 5000
                    });
                } else {
                    sendJSON(res, 404, { error: 'Not found' });
                }
            }
        }
        else if (path === '/api/v1/matters' && method === 'POST') {
            const newMatter = {
                id: String(matters.length + 1),
                matter_number: `M-2025-${String(matters.length + 1).padStart(3, '0')}`,
                ...data,
                unbilled_amount: 0
            };
            matters.push(newMatter);
            sendJSON(res, 201, newMatter);
        }
        else if (path === '/api/v1/clients' && method === 'GET') {
            sendJSON(res, 200, clients);
        }
        else if (path === '/api/v1/users' && method === 'GET') {
            sendJSON(res, 200, users.map(u => ({ id: u.id, first_name: u.first_name, last_name: u.last_name, role: u.role })));
        }
        else if (path === '/api/v1/time-entries' && method === 'GET') {
            sendJSON(res, 200, timeEntries);
        }
        else if (path === '/api/v1/time-entries' && method === 'POST') {
            const newEntry = {
                id: String(timeEntries.length + 1),
                ...data,
                user_name: 'John Attorney',
                matter_name: matters.find(m => m.id === data.matter_id)?.name || 'Unknown',
                billed: false
            };
            timeEntries.push(newEntry);
            sendJSON(res, 201, newEntry);
        }
        else if (path === '/api/v1/expenses' && method === 'GET') {
            sendJSON(res, 200, expenses);
        }
        else if (path === '/api/v1/expenses' && method === 'POST') {
            const newExpense = {
                id: String(expenses.length + 1),
                ...data,
                matter_name: matters.find(m => m.id === data.matter_id)?.name || 'Unknown',
                billed: false
            };
            expenses.push(newExpense);
            sendJSON(res, 201, newExpense);
        }
        else if (path === '/api/v1/sync/kimai/timesheets' && method === 'POST') {
            sendJSON(res, 200, { count: 3, message: 'Synced 3 timesheets from Kimai' });
        }
        else {
            sendJSON(res, 404, { error: 'Not found' });
        }
    });
});

server.listen(PORT, () => {
    console.log(`Mock API server running at http://localhost:${PORT}`);
    console.log('');
    console.log('Available endpoints:');
    console.log('  POST   /api/v1/auth/login');
    console.log('  GET    /api/v1/dashboard/stats');
    console.log('  GET    /api/v1/matters');
    console.log('  POST   /api/v1/matters');
    console.log('  GET    /api/v1/time-entries');
    console.log('  POST   /api/v1/time-entries');
    console.log('  GET    /api/v1/expenses');
    console.log('  POST   /api/v1/expenses');
    console.log('');
    console.log('Demo credentials:');
    console.log('  admin@example.com / password');
    console.log('  attorney@example.com / password');
});
