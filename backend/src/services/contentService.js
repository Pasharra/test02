// Content Service: Handles post creation, editing, deletion, markdown rendering, media references, and label management. 

const db = require('../db');
const UserData = require('../models/UserData');
const PostData = require('../models/PostData');
const PostListData = require('../models/PostListData');

/**
 * Update a user in the database by Auth0Id with data from a UserData object.
 * @param {UserData} userData - The user data to update.
 * @param {string} auth0Id - The Auth0 user id.
 * @returns {Promise<object|null>} The updated user row, or null if not found.
 */
async function updateUserIfExists(userData, auth0Id) {
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
  return updated || null;
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
  const existing = await db('Users').where({ Auth0Id: auth0Id }).first();
  if (existing) {
    return existing.Id;
  }
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
 * Create a new post in the Posts table.
 * @param {PostData} postData
 */
async function createPost(postData) {
  const insertFields = {
    Image: postData.image,
    Title: postData.title,
    Content: postData.content,
    Preview: postData.preview,
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
  const updateFields = {
    Image: postData.image,
    Title: postData.title,
    Content: postData.content,
    Preview: postData.preview,
    ReadingTime: postData.readingTime,
    UpdatedOn: db.fn.now(),
    IsPremium: postData.isPremium,
  };
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

module.exports = {
  updateUserIfExists,
  createPost,
  updatePost,
  getOrCreateUser,
  getPostList,
}; 