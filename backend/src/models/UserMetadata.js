const SubscriptionData = require('./SubscriptionData');

class NotificationsMetadata {
  constructor({
    email = true,
    sms = false,
    webpush = false,
    phone = '',
    phoneVerified = false,
    verificationCode = undefined,
    ...rest
  } = {}) {
    this.email = email;
    this.sms = sms;
    this.webpush = webpush;
    this.phone = phone;
    this.phoneVerified = phoneVerified;
    this.verificationCode = verificationCode;
    Object.assign(this, rest);
  }
}

class StripeMetadata {
  constructor({
    stripeCustomerId = '',
    updated = '',
    subscription = {},
    ...rest
  } = {}) {
    this.stripeCustomerId = stripeCustomerId;
    this.updated = updated;
    this.subscription = subscription instanceof SubscriptionData ? subscription : new SubscriptionData(subscription);
    Object.assign(this, rest);
  }
}

class UserMetadata {
  constructor({ notifications = {}, stripe = {} } = {}) {
    this.notifications = notifications instanceof NotificationsMetadata ? notifications : new NotificationsMetadata(notifications);
    this.stripe = stripe instanceof StripeMetadata ? stripe : new StripeMetadata(stripe);
  }

  static fromUser(user) {
    const meta = (user && user.user_metadata) || {};
    return new UserMetadata({
      notifications: meta.notifications || {},
      stripe: meta.stripe || {},
    });
  }

  toObject() {
    return {
      notifications: { ...this.notifications },
      stripe: { ...this.stripe, subscription: { ...this.stripe.subscription } },
    };
  }
}

module.exports = { UserMetadata, NotificationsMetadata, StripeMetadata, SubscriptionData }; 