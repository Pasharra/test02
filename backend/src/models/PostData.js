class PostData {
  constructor({
    id = null,
    image = '',
    title = '',
    content = '',
    // TODO: calculate preview based on content
    preview = '',
    readingTime = null,
    createdOn = null,
    updatedOn = null,
    isPremium = null,
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
    });
  }
}

module.exports = PostData; 