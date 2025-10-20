// Check what was actually created in the database
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'billing.db');
const db = new sqlite3.Database(dbPath);

console.log('Checking recently created test data...\n');

// Check clients
db.all(`SELECT id, name, client_number FROM clients ORDER BY id DESC LIMIT 5`, (err, clients) => {
    console.log('Recent Clients:');
    clients.forEach(c => console.log(`  ID ${c.id}: ${c.name} (${c.client_number})`));
    console.log();

    // Check matters
    db.all(`SELECT id, name, matter_number, client_id FROM matters ORDER BY id DESC LIMIT 5`, (err, matters) => {
        console.log('Recent Matters:');
        matters.forEach(m => console.log(`  ID ${m.id}: ${m.name} (${m.matter_number}) - Client ${m.client_id}`));
        console.log();

        // Check time entries
        db.all(`SELECT id, matter_id, description, duration_minutes FROM time_entries ORDER BY id DESC LIMIT 5`, (err, times) => {
            console.log('Recent Time Entries:');
            times.forEach(t => console.log(`  ID ${t.id}: Matter ${t.matter_id} - ${t.duration_minutes}min - ${t.description}`));
            console.log();

            // Check expenses
            db.all(`SELECT id, matter_id, description, amount FROM expenses ORDER BY id DESC LIMIT 5`, (err, expenses) => {
                console.log('Recent Expenses:');
                expenses.forEach(e => console.log(`  ID ${e.id}: Matter ${e.matter_id} - $${e.amount} - ${e.description}`));
                console.log();

                db.close();
            });
        });
    });
});
