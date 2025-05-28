const express = require('express');
const router = express.Router();
const { updateUserProfile } = require('../services/authService');
const { expressjwt: jwt } = require('express-jwt');
const jwksRsa = require('jwks-rsa');

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
    const updated = await updateUserProfile(user_id, updates);
    res.json({ success: true, user: updated });
  } catch (err) {
    console.error('Profile update error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Could not update profile. Please try again.' });
  }
});

module.exports = router; 