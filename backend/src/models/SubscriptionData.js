class SubscriptionData {
  constructor({
    active = false,
    syncing = false,
    plan = '',
    renewal = '',
    status = '',
    ...rest
  } = {}) {
    this.active = active;
    this.syncing = syncing;
    this.plan = plan;
    this.renewal = renewal;
    this.status = status;
    Object.assign(this, rest);
  }
}

module.exports = SubscriptionData; 