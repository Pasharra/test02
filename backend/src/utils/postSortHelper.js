// Post Sort Helper: Constants and utilities for post sorting

// Sorting constants
const POST_SORT_DATE = 'date';
const POST_SORT_LIKES = 'likes';
const POST_SORT_COMMENTS = 'comments';
const POST_SORT_VIEWS = 'views';

// Array of valid sort options
const VALID_POST_SORTS = [
  POST_SORT_DATE,
  POST_SORT_LIKES,
  POST_SORT_COMMENTS,
  POST_SORT_VIEWS
];

// Default sort option
const DEFAULT_POST_SORT = POST_SORT_DATE;

/**
 * Check if a sort option is valid
 * @param {string} sort - The sort option to validate
 * @returns {boolean} True if valid, false otherwise
 */
function isValidPostSort(sort) {
  return VALID_POST_SORTS.includes(sort);
}

/**
 * Get all valid sort options
 * @returns {string[]} Array of valid sort options
 */
function getValidPostSorts() {
  return [...VALID_POST_SORTS];
}

/**
 * Get the database column name for a sort option
 * @param {string} sort - The sort option
 * @returns {string} The corresponding database column name
 */
function getPostSortColumn(sort) {
  switch (sort) {
    case POST_SORT_DATE:
      return 'UpdatedOn';
    case POST_SORT_LIKES:
      return 'Likes';
    case POST_SORT_COMMENTS:
      return 'Comments';
    case POST_SORT_VIEWS:
      return 'Views';
    default:
      return 'UpdatedOn'; // Default fallback
  }
}

module.exports = {
  POST_SORT_DATE,
  POST_SORT_LIKES,
  POST_SORT_COMMENTS,
  POST_SORT_VIEWS,
  VALID_POST_SORTS,
  DEFAULT_POST_SORT,
  isValidPostSort,
  getValidPostSorts,
  getPostSortColumn
}; 