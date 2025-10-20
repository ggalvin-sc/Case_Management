// Test script to check firm_settings table
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'billing.db');
const db = new sqlite3.Database(dbPath);

console.log('Checking firm_settings table...\n');

// Check if table exists
db.all(`SELECT name FROM sqlite_master WHERE type='table' AND name='firm_settings'`, (err, tables) => {
    if (err) {
        console.error('Error checking tables:', err);
        return;
    }

    console.log('Tables found:', tables);

    if (tables.length === 0) {
        console.log('\nERROR: firm_settings table does NOT exist!');
        console.log('This is the root cause of the settings page failure.\n');

        // Show all tables
        db.all(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`, (err, allTables) => {
            console.log('All tables in database:');
            allTables.forEach(t => console.log('  -', t.name));
            db.close();
        });
    } else {
        // Table exists, check schema
        db.all(`PRAGMA table_info(firm_settings)`, (err, schema) => {
            console.log('\nTable schema:');
            schema.forEach(col => {
                console.log(`  ${col.name} (${col.type})`);
            });

            // Check if there's any data
            db.all(`SELECT * FROM firm_settings`, (err, rows) => {
                console.log(`\nRows in table: ${rows ? rows.length : 0}`);
                if (rows && rows.length > 0) {
                    console.log('Data:', JSON.stringify(rows[0], null, 2));
                }
                db.close();
            });
        });
    }
});
