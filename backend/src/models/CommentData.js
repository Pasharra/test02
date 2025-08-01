class CommentData {
  constructor({
    id = null,
    content = '',
    createdOn = null,
    userFirstName = '',
    userLastName = '',
    userAvatar = '',
  } = {}) {
    this.id = id;
    this.content = content;
    this.createdOn = createdOn;
    this.userFirstName = userFirstName;
    this.userLastName = userLastName;
    this.userAvatar = userAvatar;
  }
}

module.exports = CommentData; 