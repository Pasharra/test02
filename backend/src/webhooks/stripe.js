const config = require('../utils/config');
const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const stripe = Stripe(config.STRIPE_SECRET_KEY);
const { getUserProfile, updateUserProfile } = require('../services/authService');

// Install Stripe CLI (Recommended for Local Testing)
// Login:
// $stripe login
// Forward Webhooks to Your Local Server:
// $stripe listen --forward-to localhost:4000/webhooks/stripe
// This will print a webhook signing secret, e.g.:
// Ready! Your webhook signing secret is whsec_...
// Add this to your .env:
// STRIPE_WEBHOOK_SECRET=whsec_...
const endpointSecret = config.STRIPE_WEBHOOK_SECRET;

router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle subscription events
  if (event.type.startsWith('customer.subscription.')) {
    const sub = event.data.object;
    const stripeCustomerId = sub.customer;
    // Find Auth0 user by stripeCustomerId (assume only one user per customer)
    // This requires scanning all users or keeping a mapping in your DB; here we assume it's in user_metadata
    // For demo, let's say we have a helper to find userId by stripeCustomerId (not implemented here)
    // You may need to implement this with a DB or Auth0 Management API search
    // For now, let's update all users with this customerId (not efficient, but demo only)
    try {
      // TODO: Replace with efficient lookup
      // Example: updateUserByStripeCustomerId(stripeCustomerId, ...)
      // For now, skip actual lookup and just log
      console.log('Received Stripe subscription event ' + event.type + ' for customer: ' + stripeCustomerId);
      // You would update user_metadata here
      // await updateUserProfile(userId, { user_metadata: { ... } });
    } catch (err) {
      console.error('Failed to update user profile from Stripe webhook:', err.message);
    }
  }

  res.json({ received: true });
});

module.exports = router; 