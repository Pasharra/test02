const express = require('express');
const router = express.Router();
const { getSubscriptionStatus, createCheckoutSession, createCustomerPortalSession } = require('../services/subscriptionService');
const { checkJwt } = require('../utils/authHelper');

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