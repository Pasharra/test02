// Subscription Service: Handles Stripe integration, webhook listeners, subscription status updates, and trial logic. 

const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const { getUserProfile, updateUserProfile } = require('./authService');

const MONTHLY_PRICE_ID = process.env.STRIPE_MONTHLY_PRICE_ID;
const YEARLY_PRICE_ID = process.env.STRIPE_YEARLY_PRICE_ID;
const SUCCESS_URL = process.env.STRIPE_SUCCESS_URL;
const CANCEL_URL = process.env.STRIPE_CANCEL_URL;
const CUSTOMER_PORTAL_RETURN_URL = process.env.STRIPE_CUSTOMER_PORTAL_RETURN_URL;

function getStripeCustomerId(user) {
  return user.user_metadata && user.user_metadata.stripe && user.user_metadata.stripe.stripeCustomerId;
}

async function getOrCreateStripeCustomer(userId) {
  // Try to get Stripe customer ID from Auth0 user_metadata
  let user = await getUserProfile(userId);
  let stripeCustomerId = getStripeCustomerId(user);
  if (stripeCustomerId) {
    const customer = await stripe.customers.retrieve(stripeCustomerId);
    if (customer && !customer.deleted) return customer;
  }
  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email: user.email,
    metadata: { auth0_user_id: userId },
  });
  // Save to Auth0 user_metadata
  const stripeMeta = { stripeCustomerId: customer.id, updated: new Date().toISOString() };
  await updateUserProfile(userId, {
    user_metadata: { ...user.user_metadata, stripe: stripeMeta },
  });
  return customer;
}

async function getSubscriptionStatusInternal(subs = undefined) {
    if (!subs || !subs.data.length) {
        return { active: false, syncing: false, plan: '', renewal: '', status: '' };
    }
    // Take the most recently created subscription
    const sub = subs.data.reduce((latest, s) => (!latest || s.created > latest.created ? s : latest), null);
    // If status is incomplete, past_due, or requires_payment_method, treat as syncing
    if (["incomplete", "past_due", "incomplete_expired", "unpaid"].includes(sub.status)) {
        return { active: false, syncing: true, plan: '', renewal: '', status: sub.status };
    }
    // Otherwise, active or trialing
    const plan = sub.items.data[0].price.id === MONTHLY_PRICE_ID ? 'Monthly' :
        sub.items.data[0].price.id === YEARLY_PRICE_ID ? 'Yearly' :
        'Unknown';
    const renewal = new Date(sub.current_period_end * 1000).toLocaleDateString();
    return {
        active: ["active", "trialing"].includes(sub.status),
        syncing: false,
        plan,
        renewal,
        status: sub.status.charAt(0).toUpperCase() + sub.status.slice(1),
    };
}

async function getSubscriptionStatus(userId) {
  let user = await getUserProfile(userId);
  let stripeCustomerId = getStripeCustomerId(user);
  if (!stripeCustomerId) {
    return getSubscriptionStatusInternal();
  }
  let data = user.user_metadata.stripe;
  let result = data.stripe;
  // If data is less than 15 minutes old, return the cached result
  if (result && result.active && data.updated && new Date(data.updated) > new Date(Date.now() - 1000 * 60 * 15)) {
    return result;
  }
  // Get all subscriptions for this customer
  const subs = await stripe.subscriptions.list({ customer: stripeCustomerId, status: 'all' });
  result = getSubscriptionStatusInternal(subs);
  data.stripe = result;
  data.updated = new Date().toISOString();
  await updateUserProfile(userId, {
    user_metadata: { ...user.user_metadata, stripe: data },
  });
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
  let stripeCustomerId = getStripeCustomerId(user);
  if (!stripeCustomerId) throw new Error('No Stripe customer');
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: CUSTOMER_PORTAL_RETURN_URL,
  });
  return { url: session.url };
}

module.exports = {
  getSubscriptionStatus,
  createCheckoutSession,
  createCustomerPortalSession,
}; 