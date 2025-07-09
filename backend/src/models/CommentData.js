class CommentData {
  constructor({
    id = null,
    userId = null,
    postId = null,
    content = '',
    createdOn = null,
    userFirstName = '',
    userLastName = '',
    userAvatar = '',
  } = {}) {
    this.id = id;
    this.userId = userId;
    this.postId = postId;
    this.content = content;
    this.createdOn = createdOn;
    this.userFirstName = userFirstName;
    this.userLastName = userLastName;
    this.userAvatar = userAvatar;
  }
}

module.exports = CommentData; 