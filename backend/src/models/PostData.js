const { getPostStatusName } = require('../utils/postStatusHelper');

class PostData {
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
    status = 'DRAFT',
    labels = [],
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
    this.status = status;
    this.labels = labels;
  }

  /**
   * Create a PostData instance from a DB row (snake_case to camelCase)
   */
  static fromDbRow(row) {
    if (!row) return null;
    return new PostData({
      id: row.Id,
      image: row.Image,
      title: row.Title,
      content: row.Content,
      preview: row.Preview,
      readingTime: row.ReadingTime,
      createdOn: row.CreatedOn,
      updatedOn: row.UpdatedOn,
      isPremium: row.IsPremium,
      status: getPostStatusName(row.Status !== undefined ? row.Status : 0), // Default to DRAFT if not set
      labels: row.labels || [], // This will be populated separately
    });
  }
}

module.exports = PostData; 