const express = require('express');
const router = express.Router();
const { isUserAdmin, checkJwt } = require('../utils/authHelper');
const { getPostList, getPostById, tryGetUserId, setUserPostReaction } = require('../services/contentService');
const { getSubscriptionStatus } = require('../services/subscriptionService');
const PostFilter = require('../models/PostFilter');

// Middleware to optionally parse JWT token
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // If there's an auth header, use checkJwt middleware
    checkJwt(req, res, next);
  } else {
    // No auth header, continue without authentication
    next();
  }
};

// GET /api/content/posts
// Query params: limit, offset, title, labels, favoriteOnly (all optional)
// Note: status filter is not supported as public API only shows published posts
router.get('/posts', optionalAuth, async (req, res) => {
  try {
    // Parse query parameters
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset) : 0;
    const favoriteOnly = req.query.favoriteOnly === 'true';
    
    // Parse filter parameters (excluding status since public API only shows published posts)
    const filterOptions = {};
    if (req.query.title) {
      filterOptions.title = req.query.title;
    }
    if (req.query.labels) {
      // Support both single label and comma-separated labels
      if (Array.isArray(req.query.labels)) {
        filterOptions.labels = req.query.labels;
      } else {
        filterOptions.labels = req.query.labels.split(',').map(label => label.trim()).filter(label => label.length > 0);
      }
    }

    // Create filter object
    const filter = new PostFilter(filterOptions);
    
    // Validate query parameters
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return res.status(400).json({ error: 'Invalid limit parameter. Must be between 1 and 100.' });
    }
    if (isNaN(offset) || offset < 0) {
      return res.status(400).json({ error: 'Invalid offset parameter. Must be 0 or greater.' });
    }

    // Basic filter validation
    if (filter.title && (typeof filter.title !== 'string' || filter.title.trim().length === 0)) {
      return res.status(400).json({ error: 'Title filter must be a non-empty string.' });
    }
    if (filter.labels && filter.labels.length > 0) {
      if (!Array.isArray(filter.labels)) {
        return res.status(400).json({ error: 'Labels filter must be an array.' });
      }
      for (const label of filter.labels) {
        if (typeof label !== 'string' || label.trim().length === 0) {
          return res.status(400).json({ error: 'All label filters must be non-empty strings.' });
        }
      }
    }

    // Try to get auth0 user id from auth token (optional)
    const auth0Id = req.auth && req.auth.sub;
    // Try to resolve DB user id by auth0 id
    const userId = await tryGetUserId(auth0Id);

    // Get posts list
    const posts = await getPostList(userId, limit, offset, filter.hasFilters() ? filter : null, favoriteOnly);
    
    res.json({
      success: true,
      posts,
      pagination: {
        limit,
        offset,
        count: posts.length
      },
      filters: filter.hasFilters() ? {
        title: filter.title,
        labels: filter.labels
      } : null,
      favoriteOnly
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

// Helper function for post reactions
async function handlePostReaction(req, res, reaction, actionName) {
  try {
    const postId = parseInt(req.params.id);
    const userId = await tryGetUserId(req.auth.sub);

    if (!postId || isNaN(postId)) {
      return res.status(400).json({ error: 'Invalid post ID' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'User not found' });
    }

    const result = await setUserPostReaction(userId, postId, reaction);

    if (result.error) {
      return res.status(result.status || 500).json({ error: result.error });
    }

    res.json({
      success: true,
      reaction: reaction,
      likes: result.likes,
      dislikes: result.dislikes
    });

  } catch (err) {
    console.error(`POST /api/content/posts/:id/${actionName} error:`, err);
    res.status(500).json({ error: `Failed to ${actionName} post.` });
  }
}

// POST /api/content/posts/:id/like
router.post('/posts/:id/like', checkJwt, async (req, res) => {
  await handlePostReaction(req, res, 1, 'like'); // 1 = like
});

// POST /api/content/posts/:id/dislike
router.post('/posts/:id/dislike', checkJwt, async (req, res) => {
  await handlePostReaction(req, res, 2, 'dislike'); // 2 = dislike
});

module.exports = router; 