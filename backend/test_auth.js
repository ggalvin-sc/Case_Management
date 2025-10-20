// Test authentication and token verification
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const JWT_SECRET = process.env.JWT_SECRET;
const dbPath = path.join(__dirname, 'billing.db');
const db = new sqlite3.Database(dbPath);

// The token from our login
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkBleGFtcGxlLmNvbSIsInJvbGUiOiJhZG1pbiIsInRva2VuVmVyc2lvbiI6MCwiaWF0IjoxNzU5OTI0MTk2LCJleHAiOjE3NjAwMTA1OTZ9.FvY_N2GgXT8OMLCwkMPqc2hR0ExJKtTcqcBC0rez15s';

console.log('Testing JWT verification...\n');
console.log('JWT_SECRET:', JWT_SECRET ? 'Set (length: ' + JWT_SECRET.length + ')' : 'NOT SET');

try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('\nDecoded token:', JSON.stringify(decoded, null, 2));

    // Check user in database
    db.get('SELECT id, email, role, token_version FROM users WHERE id = ?', [decoded.id], (err, user) => {
        if (err) {
            console.error('Database error:', err);
        } else if (!user) {
            console.error('ERROR: User not found in database!');
        } else {
            console.log('\nUser from database:', JSON.stringify(user, null, 2));

            const userTokenVersion = user.token_version || 0;
            const tokenTokenVersion = decoded.tokenVersion || 0;

            console.log('\nToken version check:');
            console.log('  User token_version:', userTokenVersion);
            console.log('  Token tokenVersion:', tokenTokenVersion);
            console.log('  Match:', userTokenVersion === tokenTokenVersion ? 'YES' : 'NO');
            console.log('  User role:', user.role);
            console.log('  Is admin:', user.role === 'admin' ? 'YES' : 'NO');
        }
        db.close();
    });
} catch (error) {
    console.error('Token verification failed:', error.message);
    db.close();
}
