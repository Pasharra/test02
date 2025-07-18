const express = require('express');
const router = express.Router();
const { checkJwt, checkAdmin } = require('../utils/authHelper');
const { getPostList, getPostById, createPost, updatePost, updatePostStatus, getMetrics } = require('../services/adminContentService');
const PostData = require('../models/PostData');
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const path = require('path');
const crypto = require('crypto');
const config = require('../utils/config');
const { getPostStatusDBValue, isValidPostStatus, getValidPostStatuses } = require('../utils/postStatusHelper');
const { isValidPostSort, getValidPostSorts, DEFAULT_POST_SORT } = require('../utils/postSortHelper');
const PostFilter = require('../models/PostFilter');

// Configure S3 client
const s3 = new S3Client({
  region: config.AWS_REGION,
  credentials: {
    accessKeyId: config.AWS_ACCESS_KEY_ID,
    secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
  },
});

// Configure multer for file upload (2MB limit)
const upload = multer({ limits: { fileSize: 2 * 1024 * 1024 } });

// All admin routes require authentication and admin role
router.use(checkJwt, checkAdmin);

// POST /api/admin/image/upload
router.post('/image/upload', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  // Validate file type
  const ext = path.extname(req.file.originalname).toLowerCase();
  if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
    return res.status(400).json({ error: 'Invalid file type. Only JPG, PNG, and WEBP are allowed.' });
  }

  // Generate unique filename using timestamp and random string
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(8).toString('hex');
  const filename = `post-${timestamp}-${randomString}${ext}`;

  // Use same S3 bucket as avatars (or add separate config for post images)
  const bucket = config.S3_AVATAR_BUCKET;
  const prefix = config.S3_POST_IMAGES_PREFIX || 'post-images';
  const key = `${prefix}/${filename}`;

  try {
    // Upload to S3
    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    }));

    // Construct the public URL
    const baseurl = config.AWS_CLOUDFRONT_URI;
    const url = `${baseurl}/${key}`;
    console.log('S3 upload success:', url);
    res.json({ url });
  } catch (err) {
    console.error('S3 upload error:', err);
    res.status(500).json({ error: 'Failed to upload image.' });
  }
});

/**
 * Validate PostData request body
 * @param {object} body - Request body
 * @returns {object} { isValid, errors, validatedData }
 */
function validatePostData(body) {
  const { title, content, image, readingTime, isPremium, labels, status } = body;
  const errors = [];
  
  // Required fields validation (always required since frontend sends all fields)
  if (!title || !content) {
    errors.push('Missing required fields: title, content.');
    return { isValid: false, errors };
  }
  
  // Validate title (always required)
  if (typeof title !== 'string' || title.trim().length === 0) {
    errors.push('Title must be a non-empty string.');
  } else if (title.length > 500) {
    errors.push('Title must be 500 characters or less.');
  }
  
  // Validate content (always required)
  if (typeof content !== 'string' || content.trim().length === 0) {
    errors.push('Content must be a non-empty string.');
  }
  
  // Validate image (optional but must be string if provided)
  if (image !== undefined && typeof image !== 'string') {
    errors.push('Image must be a string.');
  }
  
  // Validate reading time (optional but must be positive number if provided)
  if (readingTime !== undefined && readingTime !== null) {
    if (isNaN(readingTime) || readingTime < 0) {
      errors.push('Reading time must be a positive number.');
    }
  }
  
  // Validate isPremium (always required)
  if (isPremium === undefined || typeof isPremium !== 'boolean') {
    errors.push('isPremium must be a boolean value.');
  }

  // Validate labels (always required)
  if (!labels || !Array.isArray(labels)) {
    errors.push('Labels must be an array.');
  } else if (labels.length === 0) {
    errors.push('At least one label is required.');
  } else {
    // Check if all labels are strings
    for (const label of labels) {
      if (typeof label !== 'string') {
        errors.push('All labels must be strings.');
        break;
      }
    }
    
    // Check if there's at least one non-empty label after trimming
    const nonEmptyLabels = labels.filter(label => typeof label === 'string' && label.trim().length > 0);
    if (nonEmptyLabels.length === 0) {
      errors.push('At least one label must contain non-whitespace characters.');
    }
  }

  // Validate status (always required)
  if (!status || !isValidPostStatus(status)) {
    errors.push(`Status must be one of: ${getValidPostStatuses().join(', ')}.`);
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }
  
  // Return validated data with proper defaults and sanitization
  const validatedData = {};
  validatedData.title = title.trim();
  validatedData.content = content;
  validatedData.image = image || null;
  validatedData.readingTime = readingTime || null;
  validatedData.isPremium = isPremium || false;
  
  // Remove duplicates and empty strings, then trim
  const trimmedLabels = labels.map(label => label.trim()).filter(label => label.length > 0);
  const distinctLabels = [...new Set(trimmedLabels)];
  validatedData.labels = distinctLabels;
  validatedData.status = status;
  return { isValid: true, errors: [], validatedData };
}

// GET /api/admin/posts
// Query params: limit, offset, sort, title, status, labels (all optional)
router.get('/posts', async (req, res) => {
  try {
    // Parse query parameters
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset) : 0;
    const sort = req.query.sort || DEFAULT_POST_SORT;
    
    // Parse filter parameters
    const filterOptions = {};
    if (req.query.title) {
      filterOptions.title = req.query.title;
    }
    if (req.query.status) {
      filterOptions.status = req.query.status;
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
    if (!isValidPostSort(sort)) {
      return res.status(400).json({ 
        error: `Invalid sort parameter. Must be one of: ${getValidPostSorts().join(', ')}.` 
      });
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

    // Validate status filter if provided
    if (filter.status && !isValidPostStatus(filter.status)) {
      return res.status(400).json({ 
        error: `Invalid status filter. Must be one of: ${getValidPostStatuses().join(', ')}.` 
      });
    }

    // Get posts list using admin service
    const posts = await getPostList(limit, offset, sort, filter.hasFilters() ? filter : null);
    
    res.json({
      success: true,
      posts,
      pagination: {
        limit,
        offset,
        sort,
        count: posts.length
      },
      filters: filter.hasFilters() ? {
        title: filter.title,
        status: filter.status,
        labels: filter.labels
      } : null
    });
  } catch (err) {
    console.error('GET /api/admin/posts error:', err.message);
    res.status(500).json({ error: 'Failed to fetch posts.' });
  }
});

// GET /api/admin/posts/:id
router.get('/posts/:id', async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    
    // Validate post ID
    if (isNaN(postId) || postId <= 0) {
      return res.status(400).json({ error: 'Invalid post ID.' });
    }

    // Get the post by ID using admin service
    const post = await getPostById(postId);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }
    
    res.json({
      success: true,
      post
    });
  } catch (err) {
    console.error('GET /api/admin/posts/:id error:', err.message);
    res.status(500).json({ error: 'Failed to fetch post.' });
  }
});

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
    const post = await createPost(postData);
    
    res.status(201).json({
      success: true,
      message: 'Post created successfully.',
      post: {
        id: post.Id,
        ...validation.validatedData
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
    
    // Create PostData instance with ID
    const postData = new PostData({
      id: postId,
      ...validation.validatedData
    });
    console.log('Post data:', postData);
    
    // Update the post
    await updatePost(postData);
    
    res.json({
      success: true,
      message: 'Post updated successfully.',
      post: postData
    });
  } catch (err) {
    console.error('PUT /api/admin/posts/:id error:', err.message);
    if (err.message.includes('Post id is required')) {
      return res.status(400).json({ error: 'Invalid post data.' });
    }
    res.status(500).json({ error: 'Failed to update post.' });
  }
});

// POST /api/admin/posts/:id/:status
router.post('/posts/:id/:status', async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const status = req.params.status;
    
    // Validate post ID
    if (isNaN(postId) || postId <= 0) {
      return res.status(400).json({ error: 'Invalid post ID.' });
    }
    
    // Validate status
    if (!isValidPostStatus(status)) {
      return res.status(400).json({ 
        error: `Invalid status. Must be one of: ${getValidPostStatuses().join(', ')}.` 
      });
    }
    
    // Update the post status
    const success = await updatePostStatus(postId, status);
    
    if (!success) {
      return res.status(404).json({ error: 'Post not found.' });
    }
    
    res.json({
      success: true,
      message: `Post status updated to ${status} successfully.`
    });
  } catch (err) {
    console.error('POST /api/admin/posts/:id/:status error:', err.message);
    res.status(500).json({ error: 'Failed to update post status.' });
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