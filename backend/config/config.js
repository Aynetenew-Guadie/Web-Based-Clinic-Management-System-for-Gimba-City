require('dotenv').config();

const config = {
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '12345678',
    database: process.env.DB_NAME || 'clinic_db',
  },
  jwtSecret: process.env.JWT_SECRET || 'dev_insecure_jwt_secret',
  email: {
    user: process.env.EMAIL_USER || 'feredeworkineh4@gmail.com',
    pass: process.env.EMAIL_PASS || 'fd2127',
    // Optional SMTP override (use these to configure custom SMTP instead of nodemailer 'service')
    host: process.env.EMAIL_HOST || undefined,
    port: process.env.EMAIL_PORT ? Number(process.env.EMAIL_PORT) : undefined,
    secure: process.env.EMAIL_SECURE === 'true' || false, // true for 465, false for 587
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'no-reply@example.com',
    provider: process.env.EMAIL_PROVIDER || (process.env.EMAIL_USER && process.env.EMAIL_USER.includes('@gmail.com') ? 'gmail' : undefined)
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || 'AC3e04863e27b2ebec9367',
    authToken: process.env.TWILIO_AUTH_TOKEN || 'e3d492371f813ed60295466ebcdfe6a3',
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || '+251943577124',
  },
  port: Number(process.env.PORT) || 5000,
  // If set to 'false' explicitly, self-service password reset is allowed; otherwise admin-only mode is enabled by default
  adminOnlyPasswordReset: process.env.ADMIN_ONLY_PASSWORD_RESET !== 'false'
};

if (!process.env.JWT_SECRET) {
  console.warn('Warning: JWT_SECRET is not set. Using an insecure default. Set JWT_SECRET in your environment.');
}

console.log(`Admin-only password reset: ${config.adminOnlyPasswordReset}`);

module.exports = config;
