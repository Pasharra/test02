const express = require('express');
const router = express.Router();
const { checkJwt, checkAdmin } = require('../utils/authHelper');
const { createPost, updatePost, getMetrics } = require('../services/contentService');
const PostData = require('../models/PostData');

// All admin routes require authentication and admin role
router.use(checkJwt, checkAdmin);

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

// POST /api/admin/posts
// Body: { title, content, image, readingTime, isPremium }
router.post('/posts', async (req, res) => {
  try {
    // Validate request data
    const validation = validatePostData(req.body, false);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.errors.join(' ') });
    }
    
    // Create PostData instance
    const postData = new PostData(validation.validatedData);
    
    // Create the post
    await createPost(postData);
    
    res.status(201).json({
      success: true,
      message: 'Post created successfully.',
      post: {
        title: postData.title,
        isPremium: postData.isPremium,
        readingTime: postData.readingTime,
      }
    });
  } catch (err) {
    console.error('POST /api/admin/posts error:', err.message);
    res.status(500).json({ error: 'Failed to create post.' });
  }
});

// PUT /api/admin/posts/:id
// Body: { title, content, image, readingTime, isPremium } (all optional)
router.put('/posts/:id', async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    
    // Validate post ID
    if (isNaN(postId) || postId <= 0) {
      return res.status(400).json({ error: 'Invalid post ID.' });
    }
    
    // Validate request data (allow partial updates)
    const validation = validatePostData(req.body, true);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.errors.join(' ') });
    }
    
    // Check if there's at least one field to update
    if (Object.keys(validation.validatedData).length === 0) {
      return res.status(400).json({ error: 'At least one field must be provided for update.' });
    }
    
    // Create PostData instance with ID
    const postData = new PostData({
      id: postId,
      ...validation.validatedData
    });
    
    // Update the post
    await updatePost(postData);
    
    res.json({
      success: true,
      message: 'Post updated successfully.',
      post: {
        id: postData.id,
        ...validation.validatedData
      }
    });
  } catch (err) {
    console.error('PUT /api/admin/posts/:id error:', err.message);
    if (err.message.includes('Post id is required')) {
      return res.status(400).json({ error: 'Invalid post data.' });
    }
    res.status(500).json({ error: 'Failed to update post.' });
  }
});

// GET /api/admin/metrics
router.get('/metrics', async (req, res) => {
  try {
    // Get comprehensive metrics data
    const metrics = await getMetrics();
    res.json(metrics);
  } catch (err) {
    console.error('GET /api/admin/metrics error:', err.message);
    res.status(500).json({ error: 'Failed to fetch metrics.' });
  }
});

module.exports = router; 