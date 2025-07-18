// Admin Content Service: Handles admin-specific content operations

const db = require('../db');
const AdminPostListData = require('../models/AdminPostListData');
const PostData = require('../models/PostData');
const PostListData = require('../models/PostListData');
const MetricsData = require('../models/MetricsData');
const { getPostStatusName, getPostStatusDBValue } = require('../utils/postStatusHelper');
const { getNumberOfActiveSubscriptions } = require('./subscriptionService');
const { getPostSortColumn, DEFAULT_POST_SORT } = require('../utils/postSortHelper');
const PostFilter = require('../models/PostFilter');

// In-memory cache for metrics
let metricsCache = {
  data: null,
  timestamp: null,
  ttl: 15 * 60 * 1000 // 15 minutes in milliseconds
};

/**
 * Get a list of posts with aggregated data for admin management.
 * @param {number} limit - Optional limit for pagination (default: 50)
 * @param {number} offset - Optional offset for pagination (default: 0)
 * @param {string} sort - Optional sort parameter (default: 'date')
 * @param {PostFilter} filter - Optional filter parameters
 * @returns {Promise<AdminPostListData[]>} Array of AdminPostListData objects
 */
async function getPostList(limit = 50, offset = 0, sort = DEFAULT_POST_SORT, filter = null) {
    // Build the main query using counter fields from Posts table
  let query = db('Posts as p')
    .select([
      'p.Id as id',
      'p.Title as title',
      'p.CreatedOn as createdOn',
      'p.UpdatedOn as updatedOn',
      'p.Status as status',
      'p.Likes as numberOfLikes',
      'p.Dislikes as numberOfDislikes',
      'p.Comments as numberOfComments',
      'p.Views as numberOfViews'
    ]);

  // Apply filters if provided
  if (filter && filter.hasFilters()) {
    // Title filter - starts with
    if (filter.title) {
      query = query.where('p.Title', 'ilike', `${filter.title}%`);
    }

    // Status filter - exact match
    if (filter.status) {
      const statusValue = getPostStatusDBValue(filter.status);
      query = query.where('p.Status', statusValue);
    }

    // Labels filter - post must have all specified labels
    if (filter.labels && filter.labels.length > 0) {
      // For each label, ensure the post has it
      filter.labels.forEach(label => {
        query = query.whereExists(function() {
          this.select('*')
            .from('PostLabels as pl')
            .join('Labels as l', 'pl.LabelId', 'l.Id')
            .whereRaw('"pl"."PostId" = "p"."Id"')
            .where('l.Caption', label);
        });
      });
    }
  }

  // Apply sorting, pagination
  query = query
    .orderBy(`p.${getPostSortColumn(sort)}`, 'desc')
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

  // Transform the results into AdminPostListData objects
  return posts.map(post => new AdminPostListData({
    id: post.id,
    title: post.title,
    createdOn: post.createdOn,
    updatedOn: post.updatedOn,
    status: getPostStatusName(post.status),
    numberOfLikes: post.numberOfLikes || 0,
    numberOfDislikes: post.numberOfDislikes || 0,
    numberOfComments: post.numberOfComments || 0,
    numberOfViews: post.numberOfViews || 0,
    labels: labelsMap[post.id] || []
  }));
}

/**
 * Get a single post by ID for admin management.
 * @param {number} postId - The post ID to retrieve
 * @returns {Promise<PostData|null>} PostData object or null if not found
 */
async function getPostById(postId) {
  // Build the query for post data
  const query = db('Posts as p')
    .select([
      'p.Id as id',
      'p.Image as image',
      'p.Title as title',
      'p.Content as content',
      'p.Preview as preview',
      'p.ReadingTime as readingTime',
      'p.IsPremium as isPremium',
      'p.Status as status'
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

  // Return PostData object
  return new PostData({
    id: post.id,
    image: post.image,
    title: post.title,
    content: post.content,
    preview: post.preview,
    readingTime: post.readingTime,
    isPremium: post.isPremium,
    status: getPostStatusName(post.status),
    labels: labels
  });
}

/**
 * Create a new post in the Posts table.
 * @param {PostData} postData
 */
async function createPost(postData) {
  const trx = await db.transaction();
  
  try {
    // Insert the post
    const insertFields = {
      Image: postData.image,
      Title: postData.title,
      Content: postData.content,
      Preview: truncateContent(postData.content),
      ReadingTime: postData.readingTime,
      CreatedOn: db.fn.now(),
      UpdatedOn: db.fn.now(),
      IsPremium: postData.isPremium,
      Status: getPostStatusDBValue(postData.status),
      Likes: 0,
      Dislikes: 0,
      Comments: 0,
      Views: 0
    };
    
    const [post] = await trx('Posts').insert(insertFields).returning('*');
    const postId = post.Id;
    
    // Handle labels if provided
    if (postData.labels && postData.labels.length > 0) {
      await addPostLabels(trx, postId, postData.labels);
    }
    
    await trx.commit();
    return post;
  } catch (error) {
    await trx.rollback();
    throw error;
  }
}

/**
 * Add labels to a post - create labels if they don't exist and associate them with the post
 * @param {import('knex').Knex.Transaction} trx - Database transaction
 * @param {number} postId - Post ID
 * @param {string[]} labels - Array of label names
 */
async function addPostLabels(trx, postId, labels) {
  for (const labelName of labels) {
    const trimmedLabel = labelName.trim();
    if (!trimmedLabel) continue;
    
    // Try to find existing label
    let label = await trx('Labels').where('Caption', trimmedLabel).first();
    
    // Create label if it doesn't exist
    if (!label) {
      [label] = await trx('Labels').insert({ Caption: trimmedLabel }).returning('*');
    }
    
    // Associate label with post (ignore if already exists)
    await trx('PostLabels')
      .insert({ PostId: postId, LabelId: label.Id })
      .onConflict(['PostId', 'LabelId'])
      .ignore();
  }
}

/**
 * Update an existing post in the Posts table by id.
 * @param {PostData} postData
 */
async function updatePost(postData) {
  if (!postData.id) throw new Error('Post id is required for update');
  
  const trx = await db.transaction();
  
  try {
    // Update all fields as all fields are passed from frontend/admin route
    const updateFields = {
      Image: postData.image,
      Title: postData.title,
      Content: postData.content,
      Preview: truncateContent(postData.content),
      ReadingTime: postData.readingTime,
      IsPremium: postData.isPremium,
      Status: getPostStatusDBValue(postData.status),
      UpdatedOn: db.fn.now()
    };
    
    // Update the post
    await trx('Posts')
      .where({ Id: postData.id })
      .update(updateFields);
    
    // Handle labels update with comparison logic
    // Load existing post labels from DB
    const existingLabelsQuery = await trx('PostLabels as pl')
      .join('Labels as l', 'pl.LabelId', 'l.Id')
      .select('l.Caption', 'pl.LabelId')
      .where('pl.PostId', postData.id);
    
    const existingLabels = existingLabelsQuery.map(row => row.Caption);
    const newLabels = postData.labels || [];
    
    // Compare to find labels to add and delete
    const labelsToAdd = newLabels.filter(label => !existingLabels.includes(label));
    const labelsToDelete = existingLabels.filter(label => !newLabels.includes(label));
    
    // Delete labels that must be deleted
    if (labelsToDelete.length > 0) {
      const labelIdsToDelete = existingLabelsQuery
        .filter(row => labelsToDelete.includes(row.Caption))
        .map(row => row.LabelId);
      
      await trx('PostLabels')
        .where('PostId', postData.id)
        .whereIn('LabelId', labelIdsToDelete)
        .del();
    }
    
    // Add labels that must be added
    if (labelsToAdd.length > 0) {
      await addPostLabels(trx, postData.id, labelsToAdd);
    }
    
    await trx.commit();
  } catch (error) {
    await trx.rollback();
    throw error;
  }
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
 * Update the status of a post.
 * @param {number} postId - The post ID to update
 * @param {string} status - The new status (e.g., 'PUBLISHED', 'DRAFT', 'ARCHIVED')
 * @returns {Promise<boolean>} True if update succeeded, false if post not found
 */
async function updatePostStatus(postId, status) {
  // Convert status string to database value
  const statusValue = getPostStatusDBValue(status);
  
  // Update the post status and updatedOn timestamp
  const result = await db('Posts')
    .where('Id', postId)
    .update({
      Status: statusValue,
      UpdatedOn: db.fn.now()
    });
  
  // Return true if a row was updated (post found), false otherwise
  return result > 0;
}

/**
 * Get metrics data for the dashboard with 15-minute in-memory caching.
 * @returns {Promise<MetricsData>} MetricsData object
 */
async function getMetrics() {
  const now = Date.now();
  
  // Check if cached data is still valid
  if (metricsCache.data && metricsCache.timestamp && (now - metricsCache.timestamp) < metricsCache.ttl) {
    console.log('Returning cached metrics data');
    return metricsCache.data;
  }
  
  try {
    console.log('Fetching fresh metrics data');
    
    // Call stored procedures and get active subscriptions in parallel
    const [dbResult, activeSubscriptions, mostLikedResult, mostCommentedResult] = await Promise.all([
      db.raw('SELECT * FROM get_dashboard_metrics()'),
      // TODO: Pie chart or breakdown of subscription plan distribution (monthly vs. yearly)
      getNumberOfActiveSubscriptions(),
      db.raw('SELECT "Title", "Likes" FROM "Posts" WHERE "Status" = 1 ORDER BY "Likes" DESC LIMIT 5'),
      db.raw('SELECT "Title", "Comments" FROM "Posts" WHERE "Status" = 1 ORDER BY "Comments" DESC LIMIT 5')
    ]);
    
    const metrics = dbResult.rows[0];
    const top5MostLikedPosts = mostLikedResult.rows.map(row => new PostListData({
      title: row.Title,
      numberOfLikes: row.Likes
    }));
    const top5MostCommentedPosts = mostCommentedResult.rows.map(row => new PostListData({
      title: row.Title,
      numberOfComments: row.Comments
    }));
    
    // Create MetricsData object with the stored procedure results and subscription count
    const metricsData = new MetricsData({
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
    
    // Cache the result
    metricsCache.data = metricsData;
    metricsCache.timestamp = now;
    
    return metricsData;
  } catch (error) {
    console.error('Error getting metrics:', error);
    // Return empty MetricsData object on error
    return new MetricsData();
  }
}

module.exports = {
  getPostList,
  getPostById,
  createPost,
  updatePost,
  updatePostStatus,
  addPostLabels,
  truncateContent,
  getMetrics,
}; 