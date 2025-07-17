class AdminPostListData {
    constructor({
      id = null,
      title = '',
      createdOn = null,
      updatedOn = null,
      numberOfLikes = null,
      numberOfDislikes = null,
      numberOfComments = null,
      numberOfViews = null,
      labels = [],
      status = 'DRAFT', // String status for API responses
    } = {}) {
      this.id = id;
      this.title = title;
      this.createdOn = createdOn;
      this.updatedOn = updatedOn;
      this.numberOfLikes = numberOfLikes;
      this.numberOfDislikes = numberOfDislikes;
      this.numberOfComments = numberOfComments;
      this.numberOfViews = numberOfViews;
      this.labels = labels;
      this.status = status;
    }
  }
  
  module.exports = AdminPostListData; 