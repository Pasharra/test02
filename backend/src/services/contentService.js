// Content Service: Handles post creation, editing, deletion, markdown rendering, media references, and label management. 

const db = require('../db');
const UserData = require('../models/UserData');
const PostListData = require('../models/PostListData');
const PostDetailData = require('../models/PostDetailData');
const CommentData = require('../models/CommentData');
const PostFilter = require('../models/PostFilter');

const { getPostStatusName, getPostStatusDBValue } = require('../utils/postStatusHelper');

/**
 * Verifies a user exists in the DB. Return the DB user Id if found, null otherwise.
 * @param {string} auth0Id
 * @returns {Promise<number>} The DB user Id
 */
async function tryGetUserId(auth0Id) {
  if (!auth0Id) return null;
  const [row] = await db('Users').where({ Auth0Id: auth0Id });
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
 * Get a list of posts with aggregated data for the post feed.
 * @param {number} userId - Optional user ID to get user-specific reactions
 * @param {number} limit - Optional limit for pagination (default: 50)
 * @param {number} offset - Optional offset for pagination (default: 0)
 * @param {PostFilter} filter - Optional filter parameters
 * @param {boolean} favoriteOnly - If true and userId provided, show only favorite posts (default: false)
 * @returns {Promise<PostListData[]>} Array of PostListData objects
 */
async function getPostList(userId = null, limit = 50, offset = 0, filter = null, favoriteOnly = false) {
  // Build the main query using counter fields from Posts table
  let query = db('Posts as p')
    .select([
      'p.Id as id',
      'p.Image as image',
      'p.Title as title',
      'p.Preview as preview',
      'p.ReadingTime as readingTime',
      'p.CreatedOn as createdOn',
      'p.IsPremium as isPremium',
      'p.Status as status',
      'p.Likes as numberOfLikes',
      'p.Dislikes as numberOfDislikes',
      'p.Comments as numberOfComments',
      // User's reaction (if userId provided)
      userId ? 
        db.raw(`(SELECT upr."Reaction" FROM "UserPostReaction" upr WHERE upr."PostId" = p."Id" AND upr."UserId" = ?) as reaction`, [userId]) :
        db.raw('NULL as reaction'),
      // User's favorite status (if userId provided)
      userId ? 
        db.raw(`(SELECT CASE WHEN EXISTS (SELECT 1 FROM "FavoritePosts" fp WHERE fp."UserId" = ? AND fp."PostId" = p."Id") THEN true ELSE false END) as "isFavorite"`, [userId]) :
        db.raw('NULL as "isFavorite"')
    ])
    .where('p.Status', 1); // Only include published posts

  // Apply favorite filter if requested
  if (favoriteOnly && userId) {
    query = query.whereExists(function() {
      this.select('*')
        .from('FavoritePosts as fp')
        .whereRaw('"fp"."PostId" = "p"."Id"')
        .where('fp.UserId', userId);
    });
  }

  // Apply filters if provided
  if (filter && filter.hasFilters()) {
    // Title filter - starts with
    if (filter.title) {
      query = query.where('p.Title', 'ilike', `${filter.title}%`);
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

  // Apply sorting and pagination
  query = query
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
    isFavorite: post.isFavorite,
    numberOfLikes: post.numberOfLikes || 0,
    numberOfDislikes: post.numberOfDislikes || 0,
    numberOfComments: post.numberOfComments || 0,
    labels: labelsMap[post.id] || [],
    status: getPostStatusName(post.status)
  }));
}

/**
 * Get a single post by ID with aggregated data.
 * @param {number} postId - The post ID to retrieve
 * @param {number} userId - Optional user ID to get user-specific reactions
 * @returns {Promise<PostDetailData|null>} PostDetailData object or null if not found
 */
async function getPostById(postId, userId = null) {
  // Build the query using counter fields from Posts table
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
      'p.Status as status',
      'p.Likes as numberOfLikes',
      'p.Dislikes as numberOfDislikes',
      'p.Comments as numberOfComments',
      // User's reaction (if userId provided)
      userId ? 
        db.raw(`(SELECT upr."Reaction" FROM "UserPostReaction" upr WHERE upr."PostId" = p."Id" AND upr."UserId" = ?) as reaction`, [userId]) :
        db.raw('NULL as reaction'),
      // User's favorite status (if userId provided)
      userId ? 
        db.raw(`(SELECT CASE WHEN EXISTS (SELECT 1 FROM "FavoritePosts" fp WHERE fp."UserId" = ? AND fp."PostId" = p."Id") THEN true ELSE false END) as "isFavorite"`, [userId]) :
        db.raw('NULL as "isFavorite"')
    ])
    .where('p.Id', postId)
    .where('p.Status', 1) // Only include published posts
    .first();

  const post = await query;
  
  if (!post) {
    return null;
  }

  // Get labels for this post
  const labelsQuery = await db('PostLabels as pl')
    .join('Labels as l', 'pl.LabelId', 'l.Id')
    .select('l.Caption')
    .where('pl.PostId', postId)
    .orderBy('l.Caption', 'asc');

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
    isFavorite: post.isFavorite,
    numberOfLikes: post.numberOfLikes || 0,
    numberOfDislikes: post.numberOfDislikes || 0,
    numberOfComments: post.numberOfComments || 0,
    labels: labels,
    comments: [], // TODO: add comments
    status: getPostStatusName(post.status)
  });
}

// Set user reaction to a post (like/dislike)
// reaction: 1 = like, 2 = dislike
async function setUserPostReaction(userId, postId, reaction) {
  // First, check if the post exists
  const post = await db('Posts').where('Id', postId).first();
  if (!post) {
    return { error: 'Post not found', status: 400 };
  }

  // Check if user already has a reaction to this post
  const existingReaction = await db('UserPostReaction')
    .where({ UserId: userId, PostId: postId })
    .first();

  let finalReaction = null;

  if (existingReaction) {
    if (existingReaction.Reaction === reaction) {
      // User is toggling the same reaction - remove it
      await db('UserPostReaction')
        .where({ UserId: userId, PostId: postId })
        .del();
      finalReaction = null;
    } else {
      // User is changing to a different reaction
      await db('UserPostReaction')
        .where({ UserId: userId, PostId: postId })
        .update({ Reaction: reaction });
      finalReaction = reaction;
    }
  } else {
    // Create new reaction
    await db('UserPostReaction').insert({
      UserId: userId,
      PostId: postId,
      Reaction: reaction
    });
    finalReaction = reaction;
  }

  // Recalculate likes and dislikes for the post
  const likesCount = await db('UserPostReaction')
    .where({ PostId: postId, Reaction: 1 })
    .count('* as count')
    .first();

  const dislikesCount = await db('UserPostReaction')
    .where({ PostId: postId, Reaction: 2 })
    .count('* as count')
    .first();

  const likes = parseInt(likesCount.count) || 0;
  const dislikes = parseInt(dislikesCount.count) || 0;

  // Update the post's like and dislike counts
  await db('Posts')
    .where('Id', postId)
    .update({
      Likes: likes,
      Dislikes: dislikes
    });

  return {
    success: true,
    likes: likes,
    dislikes: dislikes,
    reaction: finalReaction
  };
}

// Add post to user's favorites
async function setFavoritePost(postId, userId) {
  // First, check if the post exists
  const post = await db('Posts').where('Id', postId).first();
  if (!post) {
    return { error: 'Post not found', status: 400 };
  }

  // Check if already favorited
  const existingFavorite = await db('FavoritePosts')
    .where({ UserId: userId, PostId: postId })
    .first();

  if (!existingFavorite) {
    // Add to favorites
    await db('FavoritePosts').insert({
      UserId: userId,
      PostId: postId
    });
  }

  return { success: true, isFavorite: true };
}

// Remove post from user's favorites
async function removeFavoritePost(postId, userId) {
  // First, check if the post exists
  const post = await db('Posts').where('Id', postId).first();
  if (!post) {
    return { error: 'Post not found', status: 400 };
  }

  // Remove from favorites if exists
  await db('FavoritePosts')
    .where({ UserId: userId, PostId: postId })
    .del();

  return { success: true, isFavorite: false };
}

/**
 * Track a post view by calling the spTrackPostView stored procedure
 * @param {number} postId - The ID of the post being viewed
 * @param {number} userId - The ID of the user viewing the post
 * @returns {Promise<void>}
 */
async function TrackPostView(postId, userId) {
  try {
    await db.raw('SELECT spTrackPostView(?, ?)', [postId, userId]);
  } catch (error) {
    console.error('Error tracking post view:', error);
    // Don't throw - we don't want view tracking failures to break the main functionality
  }
}

module.exports = {
  updateUser,
  getOrCreateUser,
  getPostList,
  getPostById,
  tryGetUserId,
  setUserPostReaction,
  setFavoritePost,
  removeFavoritePost,
  TrackPostView,
}; 