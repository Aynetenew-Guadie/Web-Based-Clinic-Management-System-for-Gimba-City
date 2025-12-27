(async () => {
  try {
    const unique = Date.now();
    const email = `reset.user.${unique}@example.com`;
    const initialPassword = 'Initial123!';
    const resetPassword = 'NewPass123!';

    // Wait for server to be ready before starting the test
    const waitForServer = async (url, retries = 20, delayMs = 500) => {
      for (let i = 0; i < retries; i++) {
        try {
          const r = await fetch(url);
          if (r.ok) return true;
        } catch (e) {
          // ignore
        }
        await new Promise((res) => setTimeout(res, delayMs));
      }
      throw new Error(`Server not available at ${url} after ${retries * delayMs}ms`);
    };

    console.log('Waiting for backend to be ready...');
    await waitForServer('http://localhost:5000/api/test', 40, 250);

    console.log('1) Registering a new user');
    const regRes = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: `resetuser${unique}`, email, password: initialPassword, role: 'patient', first_name: 'Reset', last_name: 'Flow', phone: '' })
    });
    const regBody = await regRes.json().catch(() => null);
    console.log('Register status:', regRes.status, regBody);
    if (!regBody || !regBody.user) {
      console.error('Registration failed or returned unexpected body; aborting');
      return;
    }

    const userId = regBody.user.id;

    console.log('2) Login as admin to get token');
    const adminLogin = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'feredeworkineh4@gmail.com', password: 'fd@2127!' })
    });
    const adminBody = await adminLogin.json().catch(() => null);
    console.log('Admin login:', adminLogin.status, adminBody);
    if (!adminBody || !adminBody.success) return console.error('Admin login failed');

    const adminToken = adminBody.token;

    console.log('3) Admin resetting user password to:', resetPassword);
    const resetRes = await fetch(`http://localhost:5000/api/admin/users/${userId}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({ password: resetPassword })
    });
    const resetBody = await resetRes.json().catch(() => null);
    console.log('Reset response:', resetRes.status, resetBody);

    console.log('4) Attempt login as user with new password');
    const userLogin = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: resetPassword })
    });
    const userLoginBody = await userLogin.json().catch(() => null);
    console.log('User login response:', userLogin.status, userLoginBody);

    if (userLoginBody && userLoginBody.success) {
      console.log('✅ Admin reset flow succeeded: user can login with new password');
    } else {
      console.error('❌ Admin reset flow failed: user cannot login with new password');
    }

  } catch (err) {
    console.error('Test failed:', err);
  }
})();