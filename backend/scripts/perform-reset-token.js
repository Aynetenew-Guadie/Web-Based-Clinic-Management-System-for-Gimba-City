// perform-reset-token.js
// Usage: node scripts/perform-reset-token.js <token> <newPassword>


let token = process.argv[2];
const newPassword = process.argv[3] || 'NewPass!234';

(async () => {
  if (!token) {
    // read from latest-reset-link.txt if present
    try {
      const data = require('fs').readFileSync('latest-reset-link.txt', 'utf8');
      token = data.split('token=')[1].trim();
      console.log('Using token from latest-reset-link.txt');
    } catch (err) {
      console.error('Usage: node perform-reset-token.js <token> [newPassword]');
      process.exit(1);
    }
  }

  try {
    console.log('1) Verifying token (query param)');
    let verifyRes = await fetch(`http://localhost:5000/api/auth/verify-reset-token?token=${encodeURIComponent(token)}`);
    let verifyText = await verifyRes.text();
    console.log('verify (query) status', verifyRes.status, verifyText);

    if (verifyRes.status >= 400) {
      console.log('Query verification failed, trying path-style verification');
      verifyRes = await fetch(`http://localhost:5000/api/auth/verify-reset-token/${encodeURIComponent(token)}`);
      verifyText = await verifyRes.text();
      console.log('verify (path) status', verifyRes.status, verifyText);
    }

    console.log('2) Resetting password');
    const resetRes = await fetch('http://localhost:5000/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword })
    });
    console.log('reset status', resetRes.status, await resetRes.text());

    console.log('3) Attempt login with new password');
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'reset.test.user@example.com', password: newPassword })
    });
    console.log('login status', loginRes.status, await loginRes.text());

  } catch (err) {
    console.error('Error during test flow:', err);
  }
})();