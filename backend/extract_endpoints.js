const fs = require('fs');

const content = fs.readFileSync('server.js', 'utf8');
const endpoints = new Set();

// Match patterns like: if (pathname === '/api/v1/...' && method === 'GET')
const regex = /if\s*\(\s*pathname\s*===\s*['"]([^'"]+)['"]\s*&&\s*method\s*===\s*['"]([A-Z]+)['"]/g;
let match;

while ((match = regex.exec(content)) !== null) {
    endpoints.add(`${match[2]} ${match[1]}`);
}

// Also check for startsWith patterns
const startsWithRegex = /if\s*\(\s*pathname\.startsWith\(['"]([^'"]+)['"]\)/g;
while ((match = startsWithRegex.exec(content)) !== null) {
    endpoints.add(`* ${match[1]}`);
}

console.log('='.repeat(70));
console.log('IDENTIFIED API ENDPOINTS');
console.log('='.repeat(70));
Array.from(endpoints).sort().forEach(e => console.log(e));
console.log('='.repeat(70));
console.log(`Total endpoints found: ${endpoints.size}`);
