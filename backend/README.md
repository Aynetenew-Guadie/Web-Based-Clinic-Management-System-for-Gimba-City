EMAIL setup

This backend can send password reset emails using SMTP (Gmail or any SMTP provider). To enable it, set these environment variables (recommended via a `.env` file):

Required (for sending real emails):
- EMAIL_USER: SMTP username (e.g., your email)
- EMAIL_PASS: SMTP password (for Gmail use an App Password if 2FA is enabled)

Optional (use to override provider defaults):
- EMAIL_HOST: SMTP host (e.g., smtp.gmail.com)
- EMAIL_PORT: SMTP port (e.g., 587)
- EMAIL_SECURE: 'true' if using TLS on port 465
- EMAIL_FROM: sender address (defaults to EMAIL_USER)
- EMAIL_PROVIDER: optional provider name (e.g., 'gmail')
- FRONTEND_URL: URL of the frontend (defaults to http://localhost:3000)

Dev / Debugging:
- If SMTP fails locally, a dev-only preview endpoint is provided at `GET /api/dev/emails` (only available when NODE_ENV !== 'production'). This returns a small list of recent email previews so you can verify reset links without a working SMTP server.

Gmail notes:
- If you use Gmail, create an App Password (if your account uses 2FA) and set that value in `EMAIL_PASS`. Regular account passwords are usually rejected by Gmail for SMTP (you will see an EAUTH/BadCredentials error). See: https://support.google.com/accounts/answer/185833

Security:
- The API endpoints intentionally return a generic success message for forgot-password to avoid revealing which emails exist in the system.
