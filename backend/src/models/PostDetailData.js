class PostDetailData {
  constructor({
    id = null,
    image = '',
    title = '',
    content = '',
    preview = '',
    readingTime = null,
    createdOn = null,
    updatedOn = null,
    isPremium = null,
    reaction = null,
    isFavorite = null,
    numberOfLikes = null,
    numberOfDislikes = null,
    numberOfComments = null,
    labels = [],
    comments = [],
    status = 'DRAFT', // String status for API responses
  } = {}) {
    this.id = id;
    this.image = image;
    this.title = title;
    this.content = content;
    this.preview = preview;
    this.readingTime = readingTime;
    this.createdOn = createdOn;
    this.updatedOn = updatedOn;
    this.isPremium = isPremium;
    this.reaction = reaction;
    this.isFavorite = isFavorite;
    this.numberOfLikes = numberOfLikes;
    this.numberOfDislikes = numberOfDislikes;
    this.numberOfComments = numberOfComments;
    this.labels = labels;
    this.comments = comments;
    this.status = status;
  }
}

module.exports = PostDetailData; 