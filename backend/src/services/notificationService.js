// Notification Service: Handles unified notification events, channel formatting, queue dispatching, and logging. 

const twilio = require('twilio');

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

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