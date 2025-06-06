const express = require('express');
const router = express.Router();
const { sendVerificationCode, getNotificationsMetadata, updateNotificationsMetadata } = require('../services/notificationService');
const { getUserProfile } = require('../services/authService');
const { checkJwt } = require('../utils/authHelper');
const { NotificationsMetadata } = require('../models/UserMetadata');

// POST /api/notification/send-verification-code
// Body: { phone }
router.post('/send-verification-code', checkJwt, async (req, res) => {
  const user_id = req.auth && req.auth.sub;
  const { phone } = req.body;
  if (!user_id || !phone) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }
  try {
    // Fetch current notifications metadata
    const user = await getUserProfile(user_id);
    const notifications = getNotificationsMetadata(user);
    // If phone is already verified and matches, skip verification
    if (notifications.phone && notifications.phoneVerified === true && notifications.phone === phone) {
      return res.json({ success: true, message: 'Phone already verified.' });
    }
    // Generate a 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await sendVerificationCode(phone, code);
    // Merge new fields
    const updatedNotifications = new NotificationsMetadata({
      ...notifications,
      verificationCode: code,
      phone,
      phoneVerified: false
    });
    await updateNotificationsMetadata(user_id, updatedNotifications);
    console.log(`Verification code for ${phone}: ${code}`);
    res.json({ success: true, message: 'Verification code sent.' });
  } catch (err) {
    console.error('Send verification code error:', err.message);
    res.status(500).json({ error: 'Could not send verification code.' });
  }
});

// POST /api/notification/verify-code
// Body: { code, phone }
router.post('/verify-code', checkJwt, async (req, res) => {
  const user_id = req.auth && req.auth.sub;
  const { code, phone } = req.body;
  if (!user_id || !code || !phone) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }
  try {
    const user = await getUserProfile(user_id);
    const notifications = getNotificationsMetadata(user);
    if (
      notifications.verificationCode &&
      notifications.verificationCode === code &&
      notifications.phone &&
      notifications.phone === phone
    ) {
      // Mark phone as verified and clear code
      const updatedNotifications = new NotificationsMetadata({
        ...notifications,
        phoneVerified: true,
        verificationCode: undefined
      });
      await updateNotificationsMetadata(user_id, updatedNotifications);
      res.json({ success: true, message: 'Phone number verified.' });
    } else {
      res.status(400).json({ error: 'Verification failed. Please try again.' });
    }
  } catch (err) {
    console.error('Verify code error:', err.message);
    res.status(500).json({ error: 'Could not verify code.' });
  }
});

module.exports = router; 