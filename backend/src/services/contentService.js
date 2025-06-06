// Content Service: Handles post creation, editing, deletion, markdown rendering, media references, and label management. 

const db = require('../db');
const UserData = require('../models/UserData');

/**
 * Update a user in the database by Auth0Id with data from a UserData object.
 * @param {UserData} userData - The user data to update.
 * @param {string} auth0Id - The Auth0 user id.
 * @returns {Promise<object|null>} The updated user row, or null if not found.
 */
async function updateUserIfExists(userData, auth0Id) {
  // Map UserData fields to DB columns
  const updateFields = {
    Avatar: userData.picture,
    FirstName: userData.given_name,
    LastName: userData.family_name,
  };
  // Only update if user exists
  const existing = await db('Users').where({ Auth0Id: auth0Id }).first();
  if (!existing) return null;
  const [updated] = await db('Users')
    .where({ Auth0Id: auth0Id })
    .update(updateFields)
    .returning('*');
  return updated;
}

module.exports = {
  updateUserIfExists,
}; 