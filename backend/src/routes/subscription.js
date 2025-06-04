const express = require('express');
const router = express.Router();
const { getSubscriptionStatus, createCheckoutSession, createCustomerPortalSession } = require('../services/subscriptionService');
const { expressjwt: jwt } = require('express-jwt');
const jwksRsa = require('jwks-rsa');

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE || `https://${AUTH0_DOMAIN}/api/v2/`;

// JWT middleware (copied from profile.js)
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

// GET /api/subscription/status
router.get('/status', checkJwt, async (req, res) => {
  const userId = req.auth && req.auth.sub;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const status = await getSubscriptionStatus(userId);
    res.json(status);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch subscription status.' });
  }
});

// POST /api/subscription/create-checkout-session
router.post('/create-checkout-session', checkJwt, async (req, res) => {
  const userId = req.auth && req.auth.sub;
  const { plan } = req.body; // 'monthly' or 'yearly'
  if (!userId || !plan || !['monthly', 'yearly'].includes(plan)) return res.status(400).json({ error: 'Missing or invalid plan' });
  try {
    const session = await createCheckoutSession(userId, plan);
    res.json(session);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create Stripe Checkout session.' });
  }
});

// POST /api/subscription/create-customer-portal-session
router.post('/create-customer-portal-session', checkJwt, async (req, res) => {
  const userId = req.auth && req.auth.sub;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const session = await createCustomerPortalSession(userId);
    res.json(session);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create Stripe Customer Portal session.' });
  }
});

module.exports = router; 