const express = require('express');
const router = express.Router();
const { updateUserProfile, getUserProfile, resendEmailVerification } = require('../services/authService');
const { expressjwt: jwt } = require('express-jwt');
const jwksRsa = require('jwks-rsa');
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const path = require('path');

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE || `https://${AUTH0_DOMAIN}/api/v2/`;

// JWT middleware
const checkJwt = jwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${AUTH0_DOMAIN}/.well-known/jwks.json`,
  }),
  audience: AUTH0_AUDIENCE,
  issuer: `https://${AUTH0_DOMAIN}/`,
  algorithms: ['RS256'],
});

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const upload = multer({ limits: { fileSize: 2 * 1024 * 1024 } }); // 2MB

// POST /api/profile
// Body: { firstName, lastName, picture }
router.post('/', checkJwt, async (req, res) => {
  const { firstName, lastName, picture } = req.body;
  const user_id = req.auth && req.auth.sub;
  if (!user_id || !firstName || !lastName) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }
  try {
    const updates = {
      given_name: firstName,
      family_name: lastName,
    };
    if (picture !== undefined) updates.picture = picture;
    //console.log('updates: ' + JSON.stringify(updates));
    const updated = await updateUserProfile(user_id, updates);
    res.json({ success: true, user: updated });
  } catch (err) {
    console.error('Profile update error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Could not update profile. Please try again.' });
  }
});

// POST /api/profile/change-password
// Body: { current, new }
router.post('/change-password', checkJwt, async (req, res) => {
  const { current, new: newPassword } = req.body;
  const user_id = req.auth && req.auth.sub;
  if (!user_id || !current || !newPassword) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }
  if (current === newPassword) {
    return res.status(400).json({ error: 'New password must be different from the current password.' });
  }
  try {
    const updates = {
      password: newPassword,
      //connection: 'Username-Password-Authentication',
    };
    const updated = await updateUserProfile(user_id, updates);
    res.json({ success: true, user: updated });
  } catch (err) {
    console.error('Profile update error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Could not update profile. Please try again.' });
  }
});

// POST /api/profile/resend-verification
router.post('/resend-verification', checkJwt, async (req, res) => {
  const user_id = req.auth && req.auth.sub;
  if (!user_id) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }
  try {
    const data = await resendEmailVerification(user_id);
    //console.log('resend-verification data: ' + JSON.stringify(data));
    res.json({ success: true, data });
  } catch (err) {
    console.error('resend-verification error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Could not resend verification email. Please try again.' });
  }
});

// POST /api/avatar/upload
router.post('/avatar/upload', checkJwt, upload.single('avatar'), async (req, res) => {
  //console.log('starting api/avatar/upload');
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
  const user_id = req.auth && req.auth.sub;
  //console.log('api/avatar/upload user_id: ' + user_id);
  const ext = path.extname(req.file.originalname).toLowerCase();
  if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
    return res.status(400).json({ error: 'Invalid file type.' });
  }
  const bucket = process.env.S3_AVATAR_BUCKET;
  const prefix = process.env.S3_AVATAR_PREFIX;
  const parts = user_id.split('|');
  const key = `${prefix}/${parts.join('/')}${ext}`;
  //console.log('api/avatar/upload key: ' + key);
  try {
    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      //ACL: 'public-read',
    }));
    const baseurl = process.env.AWS_CLOUDFRONT_URI;
    const url = `${baseurl}/${key}`;
    //console.log('api/avatar/upload url: ' + url);
    res.json({ url });
  } catch (err) {
    console.error('S3 upload error:', err);
    res.status(500).json({ error: 'Failed to upload avatar.' });
  }
});

// GET /api/profile
router.get('/', checkJwt, async (req, res) => {
  try {
    const user_id = req.auth && req.auth.sub;
    if (!user_id) return res.status(401).json({ error: 'Unauthorized' });
    const user = await getUserProfile(user_id);
    res.json(user);
  } catch (err) {
    console.error('GET /api/profile error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch user profile.' });
  }
});

module.exports = router; 