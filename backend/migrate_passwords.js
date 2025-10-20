/**
 * Password Migration Script
 *
 * This script migrates plain-text passwords to bcrypt hashed passwords.
 * Run this ONCE after upgrading to the secure authentication system.
 *
 * Usage: node migrate_passwords.js
 */

const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const SALT_ROUNDS = 10;
const dbPath = path.join(__dirname, 'billing.db');

function dbGet(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function dbAll(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}

function dbRun(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve({ id: this.lastID, changes: this.changes });
        });
    });
}

async function migratePasswords() {
    console.log('🔐 Password Migration Script');
    console.log('=' .repeat(50));

    const db = new sqlite3.Database(dbPath);

    try {
        // Get all users
        const users = await dbAll(db, 'SELECT id, email, password FROM users');

        console.log(`\nFound ${users.length} user(s) in database`);

        let migratedCount = 0;
        let skippedCount = 0;

        for (const user of users) {
            // Check if password is already hashed (bcrypt hashes start with $2b$)
            if (user.password.startsWith('$2b$')) {
                console.log(`⏭️  Skipping ${user.email} (already hashed)`);
                skippedCount++;
                continue;
            }

            // Hash the plain-text password
            console.log(`🔒 Hashing password for ${user.email}...`);
            const hashedPassword = await bcrypt.hash(user.password, SALT_ROUNDS);

            // Update the database
            await dbRun(db, 'UPDATE users SET password = ? WHERE id = ?', [hashedPassword, user.id]);

            console.log(`✓  Migrated ${user.email}`);
            migratedCount++;
        }

        console.log('\n' + '='.repeat(50));
        console.log(`✅ Migration complete!`);
        console.log(`   Migrated: ${migratedCount}`);
        console.log(`   Skipped: ${skippedCount}`);
        console.log(`   Total: ${users.length}`);
        console.log('='.repeat(50));

    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        process.exit(1);
    } finally {
        db.close();
    }
}

// Run migration
migratePasswords().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
