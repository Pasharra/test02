/**
 * Post Status Helper
 * Handles conversion between string and integer values for post status enum
 */

// Post status enum mappings
const POST_STATUS = {
  DRAFT: 0,
  PUBLISHED: 1,
  ARCHIVED: 2
};

// Reverse mapping for integer to string conversion
const POST_STATUS_NAMES = {
  0: 'DRAFT',
  1: 'PUBLISHED',
  2: 'ARCHIVED'
};

/**
 * Convert post status string to database integer value
 * @param {string} statusString - Status string (DRAFT, PUBLISHED, ARCHIVED)
 * @returns {number} Integer value for database storage
 * @throws {Error} If status string is invalid
 */
function getPostStatusDBValue(statusString) {
  if (!statusString || typeof statusString !== 'string') {
    throw new Error('Status string is required and must be a string');
  }
  
  const upperStatus = statusString.toUpperCase().trim();
  
  if (POST_STATUS.hasOwnProperty(upperStatus)) {
    return POST_STATUS[upperStatus];
  }
  
  throw new Error(`Invalid post status: ${statusString}. Valid values are: ${Object.keys(POST_STATUS).join(', ')}`);
}

/**
 * Convert database integer value to post status string
 * @param {number} statusInt - Integer value from database
 * @returns {string} Status string (DRAFT, PUBLISHED, ARCHIVED)
 * @throws {Error} If status integer is invalid
 */
function getPostStatusName(statusInt) {
  if (typeof statusInt !== 'number' && statusInt !== null && statusInt !== undefined) {
    throw new Error('Status must be a number');
  }
  
  // Handle null/undefined by returning default
  if (statusInt === null || statusInt === undefined) {
    return 'DRAFT';
  }
  
  if (POST_STATUS_NAMES.hasOwnProperty(statusInt)) {
    return POST_STATUS_NAMES[statusInt];
  }
  
  throw new Error(`Invalid post status value: ${statusInt}. Valid values are: ${Object.keys(POST_STATUS_NAMES).join(', ')}`);
}

/**
 * Get all valid post status strings
 * @returns {string[]} Array of valid status strings
 */
function getValidPostStatuses() {
  return Object.keys(POST_STATUS);
}

/**
 * Check if a status string is valid
 * @param {string} statusString - Status string to validate
 * @returns {boolean} True if valid, false otherwise
 */
function isValidPostStatus(statusString) {
  if (!statusString || typeof statusString !== 'string') {
    return false;
  }
  
  const upperStatus = statusString.toUpperCase().trim();
  return POST_STATUS.hasOwnProperty(upperStatus);
}

module.exports = {
  getPostStatusDBValue,
  getPostStatusName,
  getValidPostStatuses,
  isValidPostStatus,
  POST_STATUS,
  POST_STATUS_NAMES
}; 