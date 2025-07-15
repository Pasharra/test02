// Content Service: Handles post creation, editing, deletion, markdown rendering, media references, and label management. 

const db = require('../db');
const UserData = require('../models/UserData');
const PostData = require('../models/PostData');
const PostListData = require('../models/PostListData');
const PostDetailData = require('../models/PostDetailData');
const CommentData = require('../models/CommentData');
const MetricsData = require('../models/MetricsData');
const { getNumberOfActiveSubscriptions } = require('./subscriptionService');

/**
 * Verifies a user exists in the DB. Return the DB user Id if found, null otherwise.
 * @param {string} auth0Id
 * @returns {Promise<number>} The DB user Id
 */
async function tryGetUserId(auth0Id) {
  if (!auth0Id) return null;
  const [row] = await db('Users').where({ Auth0Id: auth0Id }).first();
  return row ? row.Id : null;
}

/**
 * Create a user in the DB. Return the DB user Id.
 * @param {UserData} userData
 * @param {string} auth0Id
 * @param {boolean} isAdmin
 * @returns {Promise<number>} The DB user Id
 */
async function createUser(userData, auth0Id, isAdmin = false) {
  // Insert new user
  const insertFields = {
    Avatar: userData.picture,
    FirstName: userData.given_name,
    LastName: userData.family_name,
    Email: userData.email,
    Auth0Id: auth0Id,
    IsAdmin: !!isAdmin,
  };
  const [row] = await db('Users').insert(insertFields).returning('*');
  return row.Id;
}

/**
 * Update a user in the database by Auth0Id with data from a UserData object.
 * @param {UserData} userData - The user data to update.
 * @param {string} auth0Id - The Auth0 user id.
 * @param {boolean} isAdmin
 * @returns {Promise<number>} The DB user Id
 */
async function updateUser(userData, auth0Id, isAdmin = false) {
  const userId = await tryGetUserId(auth0Id);
  if (!userId)
    return createUser(userData, auth0Id, isAdmin);
  const updateFields = {
    Avatar: userData.picture,
    FirstName: userData.given_name,
    LastName: userData.family_name,
    // Email: userData.email, // (removed per last edit)
  };
  // Perform the update directly
  const [updated] = await db('Users')
    .where({ Auth0Id: auth0Id })
    .update(updateFields)
    .returning('*');
  return updated.Id;
}

/**
 * Ensure a user exists in the DB. If not, create it. Return the DB user Id.
 * @param {UserData} userData
 * @param {string} auth0Id
 * @param {boolean} isAdmin
 * @returns {Promise<number>} The DB user Id
 */
async function getOrCreateUser(userData, auth0Id, isAdmin = false) {
  // Try to find the user
  const userId = await tryGetUserId(auth0Id);
  return userId ? userId : createUser(userData, auth0Id, isAdmin);
}

/**
 * Create a new post in the Posts table.
 * @param {PostData} postData
 */
async function createPost(postData) {
  const insertFields = {
    Image: postData.image,
    Title: postData.title,
    Content: postData.content,
    Preview: truncateContent(postData.content),
    ReadingTime: postData.readingTime,
    CreatedOn: db.fn.now(),
    UpdatedOn: db.fn.now(),
    IsPremium: postData.isPremium,
  };
  await db('Posts').insert(insertFields);
}

/**
 * Update an existing post in the Posts table by id.
 * @param {PostData} postData
 */
async function updatePost(postData) {
  if (!postData.id) throw new Error('Post id is required for update');
  const updateFields = {};
  
  // Only update fields that are provided
  if (postData.image !== undefined) updateFields.Image = postData.image;
  if (postData.title !== undefined) updateFields.Title = postData.title;
  if (postData.content !== undefined) {
    updateFields.Content = postData.content;
    updateFields.Preview = truncateContent(postData.content);
  }
  if (postData.readingTime !== undefined) updateFields.ReadingTime = postData.readingTime;
  if (postData.isPremium !== undefined) updateFields.IsPremium = postData.isPremium;
  
  updateFields.UpdatedOn = db.fn.now();
  
  await db('Posts')
    .where({ Id: postData.id })
    .update(updateFields);
}

/**
 * Get a list of posts with aggregated data for the post feed.
 * @param {number} userId - Optional user ID to get user-specific reactions
 * @param {number} limit - Optional limit for pagination (default: 50)
 * @param {number} offset - Optional offset for pagination (default: 0)
 * @returns {Promise<PostListData[]>} Array of PostListData objects
 */
// TODO: add search parameters - title & labels
async function getPostList(userId = null, limit = 50, offset = 0) {
  // Build the main query with subqueries for aggregated data
  const query = db('Posts as p')
    .select([
      'p.Id as id',
      'p.Image as image',
      'p.Title as title',
      'p.Preview as preview',
      'p.ReadingTime as readingTime',
      'p.CreatedOn as createdOn',
      'p.IsPremium as isPremium',
      // User's reaction (if userId provided)
      userId ? 
        db.raw(`(SELECT upr.Reaction FROM UserPostReaction upr WHERE upr.PostId = p.Id AND upr.UserId = ?) as reaction`, [userId]) :
        db.raw('NULL as reaction'),
      // Count of likes (reaction = 1)
      db.raw(`(SELECT COUNT(*) FROM UserPostReaction upr WHERE upr.PostId = p.Id AND upr.Reaction = 1) as numberOfLikes`),
      // Count of dislikes (reaction = -1)
      db.raw(`(SELECT COUNT(*) FROM UserPostReaction upr WHERE upr.PostId = p.Id AND upr.Reaction = -1) as numberOfDislikes`),
      // Count of comments
      db.raw(`(SELECT COUNT(*) FROM PostComments pc WHERE pc.PostId = p.Id) as numberOfComments`)
    ])
    .orderBy('p.CreatedOn', 'desc')
    .limit(limit)
    .offset(offset);

  const posts = await query;

  // Get labels for all posts in a separate query to avoid N+1 problem
  const postIds = posts.map(post => post.id);
  let labelsMap = {};
  
  if (postIds.length > 0) {
    const labelsQuery = await db('PostLabels as pl')
      .join('Labels as l', 'pl.LabelId', 'l.Id')
      .select('pl.PostId', 'l.Caption')
      .whereIn('pl.PostId', postIds);

    // Group labels by post ID
    labelsMap = labelsQuery.reduce((acc, row) => {
      if (!acc[row.PostId]) {
        acc[row.PostId] = [];
      }
      acc[row.PostId].push(row.Caption);
      return acc;
    }, {});
  }

  // Transform the results into PostListData objects
  return posts.map(post => new PostListData({
    id: post.id,
    image: post.image,
    title: post.title,
    preview: post.preview,
    readingTime: post.readingTime,
    createdOn: post.createdOn,
    isPremium: post.isPremium,
    reaction: post.reaction,
    numberOfLikes: parseInt(post.numberOfLikes) || 0,
    numberOfDislikes: parseInt(post.numberOfDislikes) || 0,
    numberOfComments: parseInt(post.numberOfComments) || 0,
    labels: labelsMap[post.id] || []
  }));
}

/**
 * Get a single post by ID with aggregated data.
 * @param {number} postId - The post ID to retrieve
 * @param {number} userId - Optional user ID to get user-specific reactions
 * @returns {Promise<PostDetailData|null>} PostDetailData object or null if not found
 */
async function getPostById(postId, userId = null) {
  // Build the query with subqueries for aggregated data
  const query = db('Posts as p')
    .select([
      'p.Id as id',
      'p.Image as image',
      'p.Title as title',
      'p.Content as content',
      'p.Preview as preview',
      'p.ReadingTime as readingTime',
      'p.CreatedOn as createdOn',
      'p.UpdatedOn as updatedOn',
      'p.IsPremium as isPremium',
      // User's reaction (if userId provided)
      userId ? 
        db.raw(`(SELECT upr.Reaction FROM UserPostReaction upr WHERE upr.PostId = p.Id AND upr.UserId = ?) as reaction`, [userId]) :
        db.raw('NULL as reaction'),
      // Count of likes (reaction = 1)
      db.raw(`(SELECT COUNT(*) FROM UserPostReaction upr WHERE upr.PostId = p.Id AND upr.Reaction = 1) as numberOfLikes`),
      // Count of dislikes (reaction = -1)
      db.raw(`(SELECT COUNT(*) FROM UserPostReaction upr WHERE upr.PostId = p.Id AND upr.Reaction = -1) as numberOfDislikes`),
      // Count of comments
      db.raw(`(SELECT COUNT(*) FROM PostComments pc WHERE pc.PostId = p.Id) as numberOfComments`)
    ])
    .where('p.Id', postId)
    .first();

  const post = await query;
  
  if (!post) {
    return null;
  }

  // Get labels for this post
  const labelsQuery = await db('PostLabels as pl')
    .join('Labels as l', 'pl.LabelId', 'l.Id')
    .select('l.Caption')
    .where('pl.PostId', postId);

  const labels = labelsQuery.map(row => row.Caption);

  // Return PostDetailData object (which includes content field)
  return new PostDetailData({
    id: post.id,
    image: post.image,
    title: post.title,
    content: post.content,
    preview: post.preview,
    readingTime: post.readingTime,
    createdOn: post.createdOn,
    updatedOn: post.updatedOn,
    isPremium: post.isPremium,
    reaction: post.reaction,
    numberOfLikes: parseInt(post.numberOfLikes) || 0,
    numberOfDislikes: parseInt(post.numberOfDislikes) || 0,
    numberOfComments: parseInt(post.numberOfComments) || 0,
    labels: labels
  });
}

/**
 * Truncate text to maximum of 500 characters, ending at word boundary
 * @param {string} text - The text to truncate
 * @returns {string} Truncated text with "..." appended if truncated
 */
function truncateContent(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  // If text is already 500 characters or less, return as is
  if (text.length <= 500) {
    return text;
  }
  
  // Find the last space within the first 500 characters
  const truncated = text.substring(0, 500);
  const lastSpaceIndex = truncated.lastIndexOf(' ');
  
  // If no space found, just truncate at 500 characters
  if (lastSpaceIndex === -1) {
    return truncated + '...';
  }
  
  // Truncate at the last word boundary and append "..."
  return truncated.substring(0, lastSpaceIndex) + '...';
}

/**
 * Get metrics data for the dashboard.
 * @returns {Promise<MetricsData>} MetricsData object
 */
async function getMetrics() {
  // TODO: cache this in memory
  try {
    // Call stored procedures and get active subscriptions in parallel
    const [dbResult, activeSubscriptions, mostLikedResult, mostCommentedResult] = await Promise.all([
      db.raw('SELECT * FROM get_dashboard_metrics()'),
      getNumberOfActiveSubscriptions(),
      db.raw('SELECT * FROM get_most_liked_posts(5)'),
      db.raw('SELECT * FROM get_most_commented_posts(5)')
    ]);
    
    const metrics = dbResult.rows[0];
    const top5MostLikedPosts = mostLikedResult.rows.map(row => new PostListData({
      title: row.title,
      numberOfLikes: parseInt(row.number_of_likes) || 0
    }));
    const top5MostCommentedPosts = mostCommentedResult.rows.map(row => new PostListData({
      title: row.title,
      numberOfComments: parseInt(row.number_of_comments) || 0
    }));
    
    // Create MetricsData object with the stored procedure results and subscription count
    return new MetricsData({
      totalUsers: parseInt(metrics.total_users) || 0,
      newUsersInLast7Days: parseInt(metrics.new_users_in_last_7_days) || 0,
      newUsersInLast30Days: parseInt(metrics.new_users_in_last_30_days) || 0,
      totalPublishedPosts: parseInt(metrics.total_published_posts) || 0,
      newPublishedPostsInLast7Days: parseInt(metrics.new_published_posts_in_last_7_days) || 0,
      newPublishedPostsInLast30Days: parseInt(metrics.new_published_posts_in_last_30_days) || 0,
      totalActiveSubscriptions: activeSubscriptions,
      top5MostLikedPosts: top5MostLikedPosts,
      top5MostCommentedPosts: top5MostCommentedPosts,
      // TODO: Remove this once we have a real data source
      userSignups: [10, 8, 3, 11, 15, 6, 7],
      publishedPosts: [3, 2, 5, 1, 7, 4, 4],
    });
  } catch (error) {
    console.error('Error getting metrics:', error);
    // Return empty MetricsData object on error
    return new MetricsData();
  }
}

module.exports = {
  updateUser,
  createPost,
  updatePost,
  getOrCreateUser,
  getPostList,
  getPostById,
  tryGetUserId,
  truncateContent,
  getMetrics,
}; 