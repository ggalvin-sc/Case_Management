/**
 * Generate self-signed TLS certificates for development
 *
 * This script creates a self-signed certificate for HTTPS support.
 * For production, use proper CA-signed certificates.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const certsDir = path.join(__dirname, 'certs');

// Create certs directory if it doesn't exist
if (!fs.existsSync(certsDir)) {
    fs.mkdirSync(certsDir, { recursive: true });
}

console.log('Generating self-signed TLS certificates...');
console.log('Directory:', certsDir);

try {
    // Try to use openssl with explicit config
    const command = `openssl req -x509 -newkey rsa:4096 -keyout "${path.join(certsDir, 'server-key.pem')}" -out "${path.join(certsDir, 'server-cert.pem')}" -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Development/CN=localhost"`;

    execSync(command, {
        stdio: 'inherit',
        env: { ...process.env, OPENSSL_CONF: '' }
    });

    console.log('\n✓ Certificates generated successfully!');
    console.log('  - server-key.pem');
    console.log('  - server-cert.pem');
    console.log('\nNote: These are self-signed certificates for development only.');
    console.log('For production, use proper CA-signed certificates.\n');
} catch (error) {
    console.error('\n✗ OpenSSL failed. Trying alternative method...\n');

    // Alternative: Use selfsigned npm package
    try {
        const selfsigned = require('selfsigned');

        const attrs = [
            { name: 'commonName', value: 'localhost' },
            { name: 'countryName', value: 'US' },
            { name: 'stateOrProvinceName', value: 'State' },
            { name: 'localityName', value: 'City' },
            { name: 'organizationName', value: 'Development' }
        ];

        const pems = selfsigned.generate(attrs, {
            keySize: 4096,
            days: 365,
            algorithm: 'sha256',
            extensions: [
                { name: 'subjectAltName', altNames: [{ type: 2, value: 'localhost' }] }
            ]
        });

        fs.writeFileSync(path.join(certsDir, 'server-key.pem'), pems.private);
        fs.writeFileSync(path.join(certsDir, 'server-cert.pem'), pems.cert);

        console.log('✓ Certificates generated using Node.js!');
        console.log('  - server-key.pem');
        console.log('  - server-cert.pem');
        console.log('\nNote: These are self-signed certificates for development only.\n');
    } catch (requireError) {
        console.error('✗ selfsigned package not found. Installing...');
        execSync('npm install selfsigned', { stdio: 'inherit' });
        console.log('\nPlease run this script again: node generate-certs.js\n');
    }
}
