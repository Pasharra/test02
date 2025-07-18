class PostFilter {
    constructor({
      title = null,
      labels = [],
      status = null
    } = {}) {
      this.title = title;
      this.labels = labels;
      this.status = status;
    }

    /**
     * Check if any filters are active
     * @returns {boolean} True if any filters are set
     */
    hasFilters() {
      return !!(this.title || this.status || (this.labels && this.labels.length > 0));
    }
  }
  
  module.exports = PostFilter; 