class PostListData {
    constructor({
      id = null,
      image = '',
      title = '',
      preview = '',
      readingTime = null,
      createdOn = null,
      isPremium = null,
      reaction = null,
      numberOfLikes = null,
      numberOfDislikes = null,
      numberOfComments = null,
      labels = [],
    } = {}) {
      this.id = id;
      this.image = image;
      this.title = title;
      this.preview = preview;
      this.readingTime = readingTime;
      this.createdOn = createdOn;
      this.isPremium = isPremium;
      this.reaction = reaction;
      this.numberOfLikes = numberOfLikes;
      this.numberOfDislikes = numberOfDislikes;
      this.numberOfComments = numberOfComments;
      this.labels = labels;
    }
  }
  
  module.exports = PostListData; 