// generate-reset-link.js
// Usage: node scripts/generate-reset-link.js <userId> [frontendUrl]
const fs = require('fs');
const cfg = require('../config/config');
const jwt = require('jsonwebtoken');
const userId = process.argv[2] || '9';
const frontend = process.argv[3] || (process.env.FRONTEND_URL || 'http://localhost:3000');
const token = jwt.sign({ id: Number(userId) }, cfg.jwtSecret, { expiresIn: '1h' });
const link = `${frontend.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`;
fs.writeFileSync('latest-reset-link.txt', link);
console.log('Reset link generated and written to latest-reset-link.txt');
console.log(link);