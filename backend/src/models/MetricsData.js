class MetricsData {
  constructor({
    totalUsers = 0,
    newUsersInLast7Days = 0,
    newUsersInLast30Days = 0,
    totalPublishedPosts = 0,
    newPublishedPostsInLast7Days = 0,
    newPublishedPostsInLast30Days = 0,
    totalActiveSubscriptions = 0,
    top5MostLikedPosts = [],
    top5MostCommentedPosts = [],
    userSignups = [],
    publishedPosts = [],
  } = {}) {
    this.totalUsers = totalUsers;
    this.newUsersInLast7Days = newUsersInLast7Days;
    this.newUsersInLast30Days = newUsersInLast30Days;
    this.totalPublishedPosts = totalPublishedPosts;
    this.newPublishedPostsInLast7Days = newPublishedPostsInLast7Days;
    this.newPublishedPostsInLast30Days = newPublishedPostsInLast30Days;
    this.totalActiveSubscriptions = totalActiveSubscriptions;
    this.top5MostLikedPosts = top5MostLikedPosts;
    this.top5MostCommentedPosts = top5MostCommentedPosts;
    this.userSignups = userSignups;
    this.publishedPosts = publishedPosts;
  }
}

module.exports = MetricsData;