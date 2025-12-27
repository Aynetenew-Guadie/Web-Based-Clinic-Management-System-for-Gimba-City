const nodemailer = require('nodemailer');
const config = require('../config/config');

// Simple in-memory store for recent emails (dev only)
const recentEmails = [];

// Build transporter based on explicit SMTP config (host) or provider
let transporter = null;
try {
  if (config.email.host) {
    const smtpOptions = {
      host: config.email.host,
      port: config.email.port || 587,
      secure: !!config.email.secure, // true for 465, false for other ports
      auth: config.email.user ? { user: config.email.user, pass: config.email.pass } : undefined,
    };
    transporter = nodemailer.createTransport(smtpOptions);
  } else if (config.email.provider === 'gmail' || (config.email.user && config.email.user.includes('@gmail.com'))) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.email.user,
        pass: config.email.pass,
      }
    });
  } else if (config.email.user && config.email.pass) {
    // Default smtp with common host inference
    transporter = nodemailer.createTransport({
      host: 'smtp.' + config.email.user.split('@')[1],
      port: 587,
      secure: false,
      auth: {
        user: config.email.user,
        pass: config.email.pass
      }
    });
  } else {
    console.warn('Warning: Email configuration incomplete. Set EMAIL_USER and EMAIL_PASS or EMAIL_HOST/EMAIL_PORT in environment.');
  }
} catch (err) {
  console.error('Failed to create mail transporter:', err.message);
}

/**
 * Send an email
 * @param {object} opts
 * @param {string} opts.to - Recipient
 * @param {string} opts.subject
 * @param {string} opts.text
 * @param {string} [opts.html]
 */
async function sendEmail({ to, subject, text, html }) {
  const from = config.email.from || config.email.user || 'no-reply@example.com';

  // store preview immediately for debugging (dev)
  const preview = { to, subject, text, html, from, timestamp: new Date().toISOString() };
  recentEmails.unshift(preview);
  if (recentEmails.length > 50) recentEmails.pop();

  if (!transporter) {
    const errMsg = 'Email transporter not configured. Set EMAIL_USER/EMAIL_PASS or EMAIL_HOST/EMAIL_PORT.';
    console.warn('🔴', errMsg);
    // Rethrow so controller can handle returning a generic success to user
    throw new Error(errMsg);
  }

  const mailOptions = { from, to, subject, text, html };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId, 'to', to);
    // Attach result to preview for convenience
    preview.info = { messageId: info.messageId, response: info.response };
    return info;
  } catch (err) {
    console.error('Error sending email:', err && err.message ? err.message : err);

    // Helpful hint for common Gmail auth error
    if (err && err.code === 'EAUTH' && config.email.user && config.email.user.includes('@gmail.com')) {
      console.warn('\n🔸 Gmail auth failed. If you use Gmail, enable an App Password for your account and set it as EMAIL_PASS, or configure OAuth2. See: https://support.google.com/accounts/answer/185833\n');
    }

    // Save error details into preview for local debugging
    preview.error = err && err.message ? err.message : String(err);

    // Rethrow so caller can decide how to respond (we generally don't want to expose internal errors to users)
    throw new Error(`Failed to send email: ${err.message}`);
  }
}

function getRecentEmails(limit = 20) {
  return recentEmails.slice(0, limit);
}

module.exports = { sendEmail, getRecentEmails };
