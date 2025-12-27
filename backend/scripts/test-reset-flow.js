// Simple sanity script to test forgot/reset login flow
// Run: node scripts/test-reset-flow.js

// Use global fetch (Node 18+). No external dependency required.
const jwt = require('jsonwebtoken');
const config = require('../config/config');

(async () => {
  try {
    const email = 'dr.michael@clinic.com';
    console.log('1) Requesting forgot-password');
    const forgotRes = await fetch('http://localhost:5000/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    console.log('Forgot response status:', forgotRes.status);
    console.log(await forgotRes.text());

    // Generate token (server-side secret)
    const token = jwt.sign({ email }, config.jwtSecret, { expiresIn: '1h' });

    console.log('2) Verifying token');
    const verifyRes = await fetch(`http://localhost:5000/api/auth/verify-reset-token/${encodeURIComponent(token)}`);
    console.log('Verify status:', verifyRes.status, await verifyRes.text());

    console.log('3) Resetting password');
    const resetRes = await fetch('http://localhost:5000/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword: 'test1234' })
    });
    console.log('Reset status:', resetRes.status, await resetRes.text());

    console.log('4) Logging in with new password');
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'test1234' })
    });
    console.log('Login status:', loginRes.status, await loginRes.text());

    console.log('Test finished');
  } catch (err) {
    console.error('Test failed:', err);
  }
})();