// Database connectivity test script
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'billing.db');
console.log('Testing database at:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('ERROR: Cannot connect to database:', err.message);
        process.exit(1);
    }
    console.log('✓ Successfully connected to database');
});

// Test queries
const tests = [
    {
        name: 'Count users',
        sql: 'SELECT COUNT(*) as count FROM users'
    },
    {
        name: 'Count clients',
        sql: 'SELECT COUNT(*) as count FROM clients'
    },
    {
        name: 'Count matters',
        sql: 'SELECT COUNT(*) as count FROM matters'
    },
    {
        name: 'Count time_entries',
        sql: 'SELECT COUNT(*) as count FROM time_entries'
    },
    {
        name: 'Count expenses',
        sql: 'SELECT COUNT(*) as count FROM expenses'
    },
    {
        name: 'Count invoices',
        sql: 'SELECT COUNT(*) as count FROM invoices'
    },
    {
        name: 'Check firm_settings',
        sql: 'SELECT COUNT(*) as count FROM firm_settings'
    },
    {
        name: 'Verify table structure',
        sql: "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    }
];

async function runTests() {
    for (const test of tests) {
        try {
            const result = await new Promise((resolve, reject) => {
                if (test.name === 'Verify table structure') {
                    db.all(test.sql, (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows);
                    });
                } else {
                    db.get(test.sql, (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    });
                }
            });
            console.log(`✓ ${test.name}:`, JSON.stringify(result));
        } catch (error) {
            console.error(`✗ ${test.name}:`, error.message);
        }
    }

    db.close((err) => {
        if (err) {
            console.error('ERROR closing database:', err.message);
        } else {
            console.log('\n✓ Database connection closed successfully');
        }
    });
}

runTests();
