// Subscription Service: Handles Stripe integration, webhook listeners, subscription status updates, and trial logic. 

const config = require('../utils/config');
const Stripe = require('stripe');
const stripe = Stripe(config.STRIPE_SECRET_KEY);
const { getUserProfile, updateUserProfile } = require('./authService');
const { UserMetadata, StripeMetadata, SubscriptionData } = require('../models/UserMetadata');

const MONTHLY_PRICE_ID = config.STRIPE_MONTHLY_PRICE_ID;
const YEARLY_PRICE_ID = config.STRIPE_YEARLY_PRICE_ID;
const SUCCESS_URL = config.STRIPE_SUCCESS_URL;
const CANCEL_URL = config.STRIPE_CANCEL_URL;
const CUSTOMER_PORTAL_RETURN_URL = config.STRIPE_CUSTOMER_PORTAL_RETURN_URL;

function getStripeCustomerId(user) {
  const userMeta = UserMetadata.fromUser(user);
  return userMeta.stripe.stripeCustomerId;
}

async function getOrCreateStripeCustomer(userId) {
  let user = await getUserProfile(userId);
  let userMeta = UserMetadata.fromUser(user);
  let stripeCustomerId = userMeta.stripe.stripeCustomerId;
  if (stripeCustomerId) {
    const customer = await stripe.customers.retrieve(stripeCustomerId);
    if (customer && !customer.deleted) return customer;
  }
  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email: user.email,
    metadata: { auth0_user_id: userId },
  });
  userMeta.stripe.stripeCustomerId = customer.id;
  userMeta.stripe.updated = new Date().toISOString();
  await updateUserProfile(userId, { user_metadata: userMeta.toObject() });
  return customer;
}

async function getSubscriptionStatusInternal(subs = undefined) {
  if (!subs || !subs.data.length) {
    return new SubscriptionData();
  }
  // Take the most recently created subscription
  const sub = subs.data.reduce((latest, s) => (!latest || s.created > latest.created ? s : latest), null);
  // If status is incomplete, past_due, or requires_payment_method, treat as syncing
  if (["incomplete", "past_due", "incomplete_expired", "unpaid"].includes(sub.status)) {
    return new SubscriptionData({ active: false, syncing: true, plan: '', renewal: '', status: sub.status });
  }
  // Otherwise, active or trialing
  const plan = sub.items.data[0].price.id === MONTHLY_PRICE_ID ? 'Monthly' :
    sub.items.data[0].price.id === YEARLY_PRICE_ID ? 'Yearly' :
    'Unknown';
  const renewal = new Date(sub.current_period_end * 1000).toLocaleDateString();
  return new SubscriptionData({
    active: ["active", "trialing"].includes(sub.status),
    syncing: false,
    plan,
    renewal,
    status: sub.status.charAt(0).toUpperCase() + sub.status.slice(1),
  });
}

async function getSubscriptionStatus(userId) {
  let user = await getUserProfile(userId);
  let userMeta = UserMetadata.fromUser(user);
  let stripeCustomerId = userMeta.stripe.stripeCustomerId;
  if (!stripeCustomerId) {
    return getSubscriptionStatusInternal();
  }
  let result = userMeta.stripe.subscription;
  // If data is less than 15 minutes old, return the cached result
  if (result && result.active && userMeta.stripe.updated && new Date(userMeta.stripe.updated) > new Date(Date.now() - 1000 * 60 * 15)) {
    return new SubscriptionData(result);
  }
  // Get all subscriptions for this customer
  const subs = await stripe.subscriptions.list({ customer: stripeCustomerId, status: 'all' });
  result = getSubscriptionStatusInternal(subs);
  userMeta.stripe.subscription = result;
  userMeta.stripe.updated = new Date().toISOString();
  await updateUserProfile(userId, { user_metadata: userMeta.toObject() });
  return result;
}

async function createCheckoutSession(userId, plan) {
  const customer = await getOrCreateStripeCustomer(userId);
  const priceId = plan === 'yearly' ? YEARLY_PRICE_ID : MONTHLY_PRICE_ID;
  // Check if user is new (no active sub)
  const subs = await stripe.subscriptions.list({ customer: customer.id, status: 'all', limit: 1 });
  const isNew = !subs.data.length;
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer: customer.id,
    line_items: [
      { price: priceId, quantity: 1 },
    ],
    allow_promotion_codes: true,
    subscription_data: {
      trial_period_days: isNew ? 7 : undefined,
    },
    success_url: SUCCESS_URL,
    cancel_url: CANCEL_URL,
  });
  return { url: session.url };
}

async function createCustomerPortalSession(userId) {
  let user = await getUserProfile(userId);
  let userMeta = UserMetadata.fromUser(user);
  let stripeCustomerId = userMeta.stripe.stripeCustomerId;
  if (!stripeCustomerId) throw new Error('No Stripe customer');
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: CUSTOMER_PORTAL_RETURN_URL,
  });
  return { url: session.url };
}

/**
 * Get the total number of active subscriptions from Stripe
 * @returns {Promise<number>} Number of active subscriptions
 */
async function getNumberOfActiveSubscriptions() {
  try {
    let totalActiveSubscriptions = 0;
    let hasMore = true;
    let startingAfter = null;
    
    // Iterate through all subscriptions with pagination
    while (hasMore) {
      const params = {
        status: 'active',
        limit: 100, // Maximum allowed by Stripe
      };
      
      if (startingAfter) {
        params.starting_after = startingAfter;
      }
      
      const subscriptions = await stripe.subscriptions.list(params);
      
      // Count active and trialing subscriptions
      const activeCount = subscriptions.data.filter(sub => 
        ['active', 'trialing'].includes(sub.status)
      ).length;
      
      totalActiveSubscriptions += activeCount;
      
      // Check if there are more subscriptions to fetch
      hasMore = subscriptions.has_more;
      if (hasMore && subscriptions.data.length > 0) {
        startingAfter = subscriptions.data[subscriptions.data.length - 1].id;
      }
    }
    
    return totalActiveSubscriptions;
  } catch (error) {
    console.error('Error getting number of active subscriptions:', error);
    // Return 0 on error to avoid breaking the metrics
    return 0;
  }
}

module.exports = {
  getSubscriptionStatus,
  createCheckoutSession,
  createCustomerPortalSession,
  getNumberOfActiveSubscriptions,
}; 