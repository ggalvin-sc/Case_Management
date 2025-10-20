// Script to add authentication checks to all protected endpoints
const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, 'server.js');
let content = fs.readFileSync(serverPath, 'utf8');

// Define patterns for endpoints that need authentication
// Each pattern has a regex to find the endpoint and the location to insert auth check
const endpointsToProtect = [
    // Clients
    { pattern: /(if \(pathname === '\/api\/v1\/clients' && method === 'POST'\) \{)\n/g, name: 'POST /api/v1/clients' },
    { pattern: /(if \(pathname\.match\(\/\^\\\/api\\\/v1\\\/clients\\\/\\d\+\$\/\) && method === 'GET'\) \{)\n/g, name: 'GET /api/v1/clients/:id' },

    // Matters
    { pattern: /(if \(pathname === '\/api\/v1\/matters' && method === 'GET'\) \{)\n/g, name: 'GET /api/v1/matters' },
    { pattern: /(if \(pathname\.match\(\/\^\\\/api\\\/v1\\\/matters\\\/\\d\+\$\/\) && method === 'GET'\) \{)\n/g, name: 'GET /api/v1/matters/:id' },
    { pattern: /(if \(pathname\.match\(\/\^\\\/api\\\/v1\\\/matters\\\/\\d\+\\\/summary\$\/\) && method === 'GET'\) \{)\n/g, name: 'GET /api/v1/matters/:id/summary' },
    { pattern: /(if \(pathname\.match\(\/\^\\\/api\\\/v1\\\/matters\\\/\\d\+\\\/time-entries\$\/\) && method === 'GET'\) \{)\n/g, name: 'GET /api/v1/matters/:id/time-entries' },
    { pattern: /(if \(pathname\.match\(\/\^\\\/api\\\/v1\\\/matters\\\/\\d\+\\\/expenses\$\/\) && method === 'GET'\) \{)\n/g, name: 'GET /api/v1/matters/:id/expenses' },
    { pattern: /(if \(pathname\.match\(\/\^\\\/api\\\/v1\\\/matters\\\/\\d\+\\\/invoices\$\/\) && method === 'GET'\) \{)\n/g, name: 'GET /api/v1/matters/:id/invoices' },
    { pattern: /(if \(pathname === '\/api\/v1\/matters' && method === 'POST'\) \{)\n/g, name: 'POST /api/v1/matters' },
    { pattern: /(if \(pathname\.match\(\/\^\\\/api\\\/v1\\\/matters\\\/\\d\+\$\/\) && method === 'PATCH'\) \{)\n/g, name: 'PATCH /api/v1/matters/:id' },
    { pattern: /(if \(pathname\.match\(\/\^\\\/api\\\/v1\\\/matters\\\/\\d\+\\\/unbilled\$\/\) && method === 'GET'\) \{)\n/g, name: 'GET /api/v1/matters/:id/unbilled' },

    // Users
    { pattern: /(if \(pathname === '\/api\/v1\/users' && method === 'GET'\) \{)\n/g, name: 'GET /api/v1/users' },

    // Time Entries
    { pattern: /(if \(pathname === '\/api\/v1\/time-entries' && method === 'GET'\) \{)\n/g, name: 'GET /api/v1/time-entries' },
    { pattern: /(if \(pathname === '\/api\/v1\/time-entries' && method === 'POST'\) \{)\n/g, name: 'POST /api/v1/time-entries' },
    { pattern: /(if \(pathname\.match\(\/\^\\\/api\\\/v1\\\/time-entries\\\/\\d\+\$\/\) && method === 'PATCH'\) \{)\n/g, name: 'PATCH /api/v1/time-entries/:id' },

    // Expenses
    { pattern: /(if \(pathname === '\/api\/v1\/expenses' && method === 'GET'\) \{)\n/g, name: 'GET /api/v1/expenses' },
    { pattern: /(if \(pathname === '\/api\/v1\/expenses' && method === 'POST'\) \{)\n/g, name: 'POST /api/v1/expenses' },

    // Invoices
    { pattern: /(if \(pathname === '\/api\/v1\/invoices' && method === 'GET'\) \{)\n/g, name: 'GET /api/v1/invoices' },
    { pattern: /(if \(pathname\.match\(\/\^\\\/api\\\/v1\\\/invoices\\\/\\d\+\$\/\) && method === 'GET'\) \{)\n/g, name: 'GET /api/v1/invoices/:id' },
    { pattern: /(if \(pathname === '\/api\/v1\/invoices' && method === 'POST'\) \{)\n/g, name: 'POST /api/v1/invoices' },
    { pattern: /(if \(pathname\.match\(\/\^\\\/api\\\/v1\\\/invoices\\\/\\d\+\\\/finalize\$\/\) && method === 'POST'\) \{)\n/g, name: 'POST /api/v1/invoices/:id/finalize' },
    { pattern: /(if \(pathname\.match\(\/\^\\\/api\\\/v1\\\/invoices\\\/\\d\+\\\/send\$\/\) && method === 'POST'\) \{)\n/g, name: 'POST /api/v1/invoices/:id/send' },
    { pattern: /(if \(pathname\.match\(\/\^\\\/api\\\/v1\\\/invoices\\\/\\d\+\\\/payment\$\/\) && method === 'POST'\) \{)\n/g, name: 'POST /api/v1/invoices/:id/payment' },
    { pattern: /(if \(pathname\.match\(\/\^\\\/api\\\/v1\\\/invoices\\\/\\d\+\\\/status\$\/\) && method === 'PATCH'\) \{)\n/g, name: 'PATCH /api/v1/invoices/:id/status' },
    { pattern: /(if \(pathname\.match\(\/\^\\\/api\\\/v1\\\/invoices\\\/\\d\+\$\/\) && method === 'PATCH'\) \{)\n/g, name: 'PATCH /api/v1/invoices/:id' },
    { pattern: /(if \(pathname\.match\(\/\^\\\/api\\\/v1\\\/invoices\\\/\\d\+\$\/\) && method === 'DELETE'\) \{)\n/g, name: 'DELETE /api/v1/invoices/:id' },

    // Firm Settings
    { pattern: /(if \(pathname === '\/api\/v1\/firm-settings' && method === 'GET'\) \{)\n/g, name: 'GET /api/v1/firm-settings' },
    { pattern: /(if \(pathname === '\/api\/v1\/firm-settings' && method === 'PATCH'\) \{)\n/g, name: 'PATCH /api/v1/firm-settings' },

    // Sync
    { pattern: /(if \(pathname === '\/api\/v1\/sync\/kimai\/timesheets' && method === 'POST'\) \{)\n/g, name: 'POST /api/v1/sync/kimai/timesheets' },

    // RunPod (these might be intentionally public or need different auth)
    { pattern: /(if \(pathname === '\/api\/v1\/runpod\/health' && method === 'GET'\) \{)\n/g, name: 'GET /api/v1/runpod/health' },
    { pattern: /(if \(pathname === '\/api\/v1\/runpod\/execute' && method === 'POST'\) \{)\n/g, name: 'POST /api/v1/runpod/execute' },
    { pattern: /(if \(pathname\.match\(\/\^\\\/api\\\/v1\\\/runpod\\\/status\\\/\[\\w-\]\+\\\/\[\\w-\]\+\$\/\) && method === 'GET'\) \{)\n/g, name: 'GET /api/v1/runpod/status/:endpoint/:job' },
    { pattern: /(if \(pathname\.match\(\/\^\\\/api\\\/v1\\\/runpod\\\/cancel\\\/\[\\w-\]\+\\\/\[\\w-\]\+\$\/\) && method === 'POST'\) \{)\n/g, name: 'POST /api/v1/runpod/cancel/:endpoint/:job' },
    { pattern: /(if \(pathname === '\/api\/v1\/runpod\/execute-and-wait' && method === 'POST'\) \{)\n/g, name: 'POST /api/v1/runpod/execute-and-wait' },
];

const authCheck = `                const user = requireAuth(req, res);
                if (!user) return;

`;

let protectedCount = 0;
let skippedCount = 0;

console.log('🔒 Adding authentication checks to protected endpoints...\n');

for (const endpoint of endpointsToProtect) {
    const matches = content.match(endpoint.pattern);

    if (matches) {
        for (let i = 0; i < matches.length; i++) {
            const match = matches[i];
            const matchIndex = content.indexOf(match);

            // Check if auth check already exists right after this line
            const afterMatch = content.substring(matchIndex, matchIndex + match.length + 200);

            if (afterMatch.includes('const user = requireAuth(req, res)')) {
                console.log(`⏭️  ${endpoint.name} - Already protected`);
                skippedCount++;
            } else {
                // Insert auth check after the if statement
                content = content.replace(match, match + authCheck);
                console.log(`✓  ${endpoint.name} - Protected`);
                protectedCount++;
            }
        }
    }
}

fs.writeFileSync(serverPath, content, 'utf8');

console.log('\n' + '='.repeat(60));
console.log(`✅ Authentication enforcement complete!`);
console.log(`   Protected: ${protectedCount} endpoints`);
console.log(`   Skipped: ${skippedCount} endpoints (already protected)`);
console.log('='.repeat(60));
