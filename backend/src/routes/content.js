const express = require('express');
const router = express.Router();
const { isUserAdmin } = require('../utils/authHelper');
const { getPostList, getPostById, tryGetUserId } = require('../services/contentService');
const { getSubscriptionStatus } = require('../services/subscriptionService');

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

module.exports = router; 