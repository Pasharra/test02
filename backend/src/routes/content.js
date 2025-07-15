const express = require('express');
const router = express.Router();
const { checkJwt, checkAdmin, isUserAdmin } = require('../utils/authHelper');
const { getPostList, getPostById, tryGetUserId, truncateContent } = require('../services/contentService');
const { getSubscriptionStatus } = require('../services/subscriptionService');

/**
 * Validate PostData request body
 * @param {object} body - Request body
 * @param {boolean} isUpdate - Whether this is an update operation (allows partial data)
 * @returns {object} { isValid, errors, validatedData }
 */
function validatePostData(body, isUpdate = false) {
  const { title, content, image, readingTime, isPremium } = body;
  const errors = [];
  
  // Required fields validation (only for create, not update)
  if (!isUpdate) {
    if (!title || !content) {
      errors.push('Missing required fields: title, content.');
      return { isValid: false, errors };
    }
  }
  
  // Validate title if provided
  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim().length === 0) {
      errors.push('Title must be a non-empty string.');
    } else if (title.length > 500) {
      errors.push('Title must be 500 characters or less.');
    }
  }
  
  // Validate content if provided
  if (content !== undefined) {
    if (typeof content !== 'string' || content.trim().length === 0) {
      errors.push('Content must be a non-empty string.');
    }
  }
  

  
  // Validate image if provided
  if (image !== undefined && typeof image !== 'string') {
    errors.push('Image must be a string.');
  }
  
  // Validate reading time if provided
  if (readingTime !== undefined && readingTime !== null) {
    if (isNaN(readingTime) || readingTime < 0) {
      errors.push('Reading time must be a positive number.');
    }
  }
  
  // Validate isPremium if provided
  if (isPremium !== undefined && typeof isPremium !== 'boolean') {
    errors.push('isPremium must be a boolean value.');
  }
  
  if (errors.length > 0) {
    return { isValid: false, errors };
  }
  
  // Return validated data with proper defaults and sanitization
  const validatedData = {};
  if (title !== undefined) validatedData.title = title.trim();
  if (content !== undefined) validatedData.content = content;
  if (image !== undefined) validatedData.image = image || '';
  if (readingTime !== undefined) validatedData.readingTime = readingTime || null;
  if (isPremium !== undefined) validatedData.isPremium = isPremium || false;
  
  return { isValid: true, errors: [], validatedData };
}

// GET /api/content/posts
// Query params: limit, offset (both optional)
router.get('/posts', async (req, res) => {
  try {
    // Parse query parameters
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset) : 0;
    
    // Validate query parameters
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return res.status(400).json({ error: 'Invalid limit parameter. Must be between 1 and 100.' });
    }
    if (isNaN(offset) || offset < 0) {
      return res.status(400).json({ error: 'Invalid offset parameter. Must be 0 or greater.' });
    }

    // Try to get auth0 user id from auth token (optional)
    const auth0Id = req.auth && req.auth.sub;
    // Try to resolve DB user id by auth0 id
     const userId = await tryGetUserId(auth0Id);

    // Get posts list
    const posts = await getPostList(userId, limit, offset);
    
    res.json({
      success: true,
      posts,
      pagination: {
        limit,
        offset,
        count: posts.length
      }
    });
  } catch (err) {
    console.error('GET /api/content/posts error:', err.message);
    res.status(500).json({ error: 'Failed to fetch posts.' });
  }
});

// GET /api/content/posts/:id
router.get('/posts/:id', async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    
    // Validate post ID
    if (isNaN(postId) || postId <= 0) {
      return res.status(400).json({ error: 'Invalid post ID.' });
    }

    // Try to get auth0 user id from auth token (optional)
    const auth0Id = req.auth && req.auth.sub;
    // Try to resolve DB user id by auth0 id
    const userId = await tryGetUserId(auth0Id);

    // Get the post by ID
    const post = await getPostById(postId, userId);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }
    
    // Check if post is premium and user has access
    let contentRestricted = false;
    if (post.isPremium) {
      let hasAccess = false;
      
      // Check if user is admin
      if (isUserAdmin(req)) {
        hasAccess = true;
      } else if (auth0Id) {
        // Check if user has active subscription
        try {
          const subscriptionStatus = await getSubscriptionStatus(auth0Id);
          if (subscriptionStatus.active) {
            hasAccess = true;
          }
        } catch (subscriptionError) {
          console.error('Error checking subscription status:', subscriptionError.message);
          // Continue without subscription check - user will get preview
        }
      }
      
      // If user doesn't have access, replace content with preview
      if (!hasAccess) {
        post.content = post.preview;
        contentRestricted = true;
      }
    }
    post.preview = null;
    
    res.json({
      success: true,
      post,
      contentRestricted
    });
  } catch (err) {
    console.error('GET /api/content/posts/:id error:', err.message);
    res.status(500).json({ error: 'Failed to fetch post.' });
  }
});

// TODO: Add other content-related routes here
// Examples:
// DELETE /api/content/posts/:id - Delete post (admin only)

module.exports = router; 