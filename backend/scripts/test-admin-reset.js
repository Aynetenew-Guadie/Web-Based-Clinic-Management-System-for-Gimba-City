(async () => {
  try {
    const adminEmail = 'feredeworkineh4@gmail.com';
    const adminPassword = 'fd@2127!';
    const targetUserId = 2; // try resetting user 2
    const newPassword = '12345678';

    console.log('Logging in as admin...');
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: adminPassword })
    });

    const loginBody = await loginRes.json().catch(() => null);
    console.log('Login status:', loginRes.status, loginBody);
    if (!loginBody || !loginBody.success) {
      console.error('Failed to login as admin; aborting');
      return;
    }

    const token = loginBody.token;

    console.log('Calling admin reset-password for user', targetUserId);
    const resetRes = await fetch(`http://localhost:5000/api/admin/users/${targetUserId}/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ password: newPassword })
    });

    const resetBody = await resetRes.json().catch(() => null);
    console.log('Reset status:', resetRes.status, resetBody);
  } catch (err) {
    console.error('Error running test-admin-reset:', err);
  }
})();