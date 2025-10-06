// Sync data from Kimai to local database
const https = require('https');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const KIMAI_API_URL = process.env.KIMAI_API_URL;
const KIMAI_API_TOKEN = process.env.KIMAI_API_TOKEN;
const dbPath = path.join(__dirname, 'billing.db');

const db = new sqlite3.Database(dbPath);

function callKimaiAPI(path) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, KIMAI_API_URL);
        const options = {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${KIMAI_API_TOKEN}`,
                'Accept': 'application/json'
            }
        };

        https.get(url, options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

async function syncCustomers() {
    console.log('Syncing customers from Kimai...');
    const customers = await callKimaiAPI('/api/customers');

    for (const customer of customers) {
        await new Promise((resolve, reject) => {
            db.run(`
                INSERT OR REPLACE INTO clients (id, name, client_number, email, phone, address, kimai_customer_id)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                customer.id,
                customer.name,
                customer.number || `CL-${customer.id}`,
                customer.email || '',
                customer.phone || customer.mobile || '',
                customer.address || '',
                customer.id
            ], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    console.log(`✓ Synced ${customers.length} customers`);
}

async function syncProjects() {
    console.log('Syncing projects (matters) from Kimai...');
    const projects = await callKimaiAPI('/api/projects');

    for (const project of projects) {
        await new Promise((resolve, reject) => {
            db.run(`
                INSERT OR REPLACE INTO matters (id, matter_number, client_id, name, description, status, billing_type, hourly_rate, open_date, kimai_project_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                project.id,
                project.number || `M-${project.id}`,
                project.customer,
                project.name,
                project.comment || '',
                project.visible ? 'active' : 'closed',
                'hourly',
                null,
                project.start || new Date().toISOString().split('T')[0],
                project.id
            ], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    console.log(`✓ Synced ${projects.length} projects/matters`);
}

async function syncTimesheets() {
    console.log('Syncing timesheets from Kimai...');
    const timesheets = await callKimaiAPI('/api/timesheets');

    for (const timesheet of timesheets) {
        if (!timesheet.end) continue; // Skip running timers

        const duration = Math.floor(timesheet.duration / 60); // Convert seconds to minutes

        await new Promise((resolve, reject) => {
            db.run(`
                INSERT OR REPLACE INTO time_entries (id, matter_id, user_id, entry_date, duration_minutes, description, hourly_rate, amount, billable, billed, kimai_timesheet_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                timesheet.id,
                timesheet.project,
                timesheet.user || 1,
                timesheet.begin ? timesheet.begin.split('T')[0] : new Date().toISOString().split('T')[0],
                duration,
                timesheet.description || '',
                timesheet.hourlyRate || 0,
                timesheet.rate || 0,
                timesheet.billable ? 1 : 0,
                timesheet.exported ? 1 : 0,
                timesheet.id
            ], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    console.log(`✓ Synced ${timesheets.length} timesheets`);
}

async function syncAll() {
    console.log('\n' + '='.repeat(60));
    console.log('  Syncing Kimai Data to Local Database');
    console.log('='.repeat(60) + '\n');

    try {
        await syncCustomers();
        await syncProjects();
        await syncTimesheets();

        console.log('\n✓ Sync completed successfully!\n');
    } catch (error) {
        console.error('\n✗ Sync failed:', error.message, '\n');
    } finally {
        db.close();
    }
}

syncAll();
