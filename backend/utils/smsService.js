const twilio = require('twilio');
const config = require('../config/config');

if (!config.twilio.accountSid || !config.twilio.authToken || !config.twilio.phoneNumber) {
  console.warn('Warning: Twilio configuration incomplete. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in environment.');
}

const client = twilio(config.twilio.accountSid, config.twilio.authToken);

/**
 * Send an SMS message
 * @param {string} to - Recipient phone number (in E.164 format, e.g. +1234567890)
 * @param {string} body - Message text
 * @returns {Promise<Object>} - SMS send result
 */
async function sendSMS(to, body) {
  if (!config.twilio.accountSid || !config.twilio.authToken || !config.twilio.phoneNumber) {
    throw new Error('SMS service not configured');
  }

  if (!to || !body) {
    throw new Error('Phone number and message body are required');
  }

  try {
    const message = await client.messages.create({
      body,
      from: config.twilio.phoneNumber,
      to,
    });
    
    console.log('SMS sent successfully:', message.sid);
    return message;
  } catch (err) {
    console.error('Error sending SMS:', err);
    throw new Error(`Failed to send SMS: ${err.message}`);
  }
}

module.exports = { sendSMS };
