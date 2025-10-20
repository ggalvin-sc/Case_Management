const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./billing.db');

db.get('SELECT * FROM users WHERE email = ?', ['admin@example.com'], async (err, user) => {
    if (err) {
        console.error('DB Error:', err);
        db.close();
        return;
    }

    if (!user) {
        console.log('User not found');
        db.close();
        return;
    }

    console.log('User found:', user.email);
    console.log('Stored password hash:', user.password);

    // Test wrong password
    const wrongMatch = await bcrypt.compare('WrongPassword123!', user.password);
    console.log('\nWrong password match:', wrongMatch);

    // Test correct password
    const correctMatch = await bcrypt.compare('password', user.password);
    console.log('Correct password match:', correctMatch);

    db.close();
});
