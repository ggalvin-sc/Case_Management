const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./billing.db');

db.all('SELECT id, email, password FROM users', (err, rows) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }

    console.log('\nUsers in database:');
    console.log('==================');
    rows.forEach(row => {
        const isBcrypt = /^\$2[aby]\$\d{2}\$/.test(row.password);
        console.log(`\nID: ${row.id}`);
        console.log(`Email: ${row.email}`);
        console.log(`Password: ${row.password.substring(0, 30)}...`);
        console.log(`Format: ${isBcrypt ? 'BCRYPT (secure)' : 'PLAIN TEXT (INSECURE!)'}`);
    });

    db.close();
});
