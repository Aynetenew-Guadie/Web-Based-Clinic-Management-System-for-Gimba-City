// Test reset flow for a real DB user
// Run: node scripts/test-reset-real-user.js

const jwt = require('jsonwebtoken');
const config = require('../config/config');

(async () => {
  try {
    const email = 'reset.test.user@example.com';
    const password = 'OldPass123';

    console.log('1) Registering user');
    const regRes = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'resetuser', email, password, role: 'admin', first_name: 'Reset', last_name: 'Test', phone: '' })
    });
    console.log('Register status:', regRes.status);
    const regBody = await regRes.text();
    console.log('Register body:', regBody);

    // Find user via debug endpoint (if available) or assume registration succeeded

    // Create token payload by finding user through login to get id
    console.log('2) Logging in to get user id');
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const loginBody = await loginRes.json();
    console.log('Login status:', loginRes.status, loginBody);
    if (!loginBody || !loginBody.success) {
      console.log('Cannot login to get id; aborting');
      return;
    }

    // Token from forgot password should encode id
    const userId = loginBody.user.id;
    const token = jwt.sign({ id: userId }, config.jwtSecret, { expiresIn: '1h' });

    console.log('3) Verifying token (query param)');
    const verifyResQ = await fetch(`http://localhost:5000/api/auth/verify-reset-token?token=${encodeURIComponent(token)}`);
    console.log('Verify (query) status:', verifyResQ.status, await verifyResQ.text());

    console.log('4) Verifying token (path param)');
    const verifyResP = await fetch(`http://localhost:5000/api/auth/verify-reset-token/${encodeURIComponent(token)}`);
    console.log('Verify (path) status:', verifyResP.status, await verifyResP.text());

    console.log('5) Resetting password to NewPass1234');
    const resetRes = await fetch('http://localhost:5000/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword: 'NewPass1234' })
    });
    console.log('Reset status:', resetRes.status, await resetRes.text());

    console.log('6) Logging in with new password');
    const newLoginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'NewPass1234' })
    });
    console.log('New login status:', newLoginRes.status, await newLoginRes.text());

    console.log('Test finished');
  } catch (err) {
    console.error('Test failed:', err);
  }
})();