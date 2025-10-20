const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./billing.db');

db.all('PRAGMA table_info(time_entries);', (err, rows) => {
    if (err) {
        console.error(err);
        db.close();
        return;
    }

    const hasInvoiceId = rows.some(r => r.name === 'invoice_id');
    if (!hasInvoiceId) {
        db.run('ALTER TABLE time_entries ADD COLUMN invoice_id INTEGER;', (err) => {
            if (err) console.error('Error:', err.message);
            else console.log('Added invoice_id to time_entries');
            db.close();
        });
    } else {
        console.log('time_entries already has invoice_id');
        db.close();
    }
});
