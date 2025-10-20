const Database = require('better-sqlite3');
const db = new Database('./billing.db');

console.log('\n=== MATTER 15 DATA ===\n');

// Get matter details
const matter = db.prepare(`
    SELECT
        m.*,
        c.name as client_name,
        u.first_name || ' ' || u.last_name as attorney_name,
        COALESCE(
            (SELECT SUM(amount) FROM trust_transactions WHERE matter_id = m.id),
            0
        ) as trust_balance
    FROM matters m
    LEFT JOIN clients c ON m.client_id = c.id
    LEFT JOIN users u ON m.attorney_id = u.id
    WHERE m.id = 15
`).get();

console.log('Matter Object:', JSON.stringify(matter, null, 2));

// Get summary
const summary = db.prepare(`
    SELECT
        COALESCE(SUM(CASE WHEN te.billed = 1 THEN te.amount ELSE 0 END), 0) as total_billed,
        COALESCE(SUM(CASE WHEN te.billed = 0 THEN te.amount ELSE 0 END), 0) as unbilled_time,
        COALESCE(SUM(CASE WHEN e.billed = 0 THEN e.billed_amount ELSE 0 END), 0) as unbilled_expenses,
        COALESCE(SUM(i.balance_due), 0) as outstanding
    FROM matters m
    LEFT JOIN time_entries te ON m.id = te.matter_id
    LEFT JOIN expenses e ON m.id = e.matter_id
    LEFT JOIN invoices i ON m.id = i.matter_id AND i.status != 'paid'
    WHERE m.id = 15
    GROUP BY m.id
`).get();

console.log('\nSummary Object:', JSON.stringify(summary, null, 2));

db.close();
