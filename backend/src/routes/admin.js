const express = require('express');
const router = express.Router();
const { checkJwt, checkAdmin } = require('../utils/authHelper');
const { createPost, updatePost, getMetrics } = require('../services/contentService');
const PostData = require('../models/PostData');
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const path = require('path');
const crypto = require('crypto');
const config = require('../utils/config');
const { getPostStatusDBValue, isValidPostStatus, getValidPostStatuses } = require('../utils/postStatusHelper');

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
 * @param {boolean} isUpdate - Whether this is an update operation (allows partial data)
 * @returns {object} { isValid, errors, validatedData }
 */
function validatePostData(body, isUpdate = false) {
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
  
  validatedData.status = getPostStatusDBValue(status);
  
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