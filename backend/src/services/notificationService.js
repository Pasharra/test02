// Notification Service: Handles unified notification events, channel formatting, queue dispatching, and logging. 

const config = require('../utils/config');
const twilio = require('twilio');

const TWILIO_ACCOUNT_SID = config.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = config.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = config.TWILIO_PHONE_NUMBER;

const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

/**
 * Send a phone verification code via SMS using Twilio
 * @param {string} phone - E.164 formatted phone number
 * @param {string} code - 6-digit verification code
 * @returns {Promise}
 */
async function sendVerificationCode(phone, code) {
  return client.messages.create({
    body: `Your verification code is: ${code}`,
    from: TWILIO_PHONE_NUMBER,
    to: phone,
  });
}

module.exports = {
  sendVerificationCode,
}; 