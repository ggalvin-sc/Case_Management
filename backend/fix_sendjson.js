// Script to update all sendJSON calls to include req parameter
const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, 'server.js');
let content = fs.readFileSync(serverPath, 'utf8');

// Replace all instances of sendJSON(res, with sendJSON(req, res,
content = content.replace(/sendJSON\(res,/g, 'sendJSON(req, res,');

fs.writeFileSync(serverPath, content, 'utf8');
console.log('✓ Updated all sendJSON calls');
