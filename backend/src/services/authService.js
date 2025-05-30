// Auth Service: Handles Auth0 integration, login, signup, session, RBAC, and email verification. 
const axios = require('axios');

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID;
const AUTH0_CLIENT_SECRET = process.env.AUTH0_CLIENT_SECRET;
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE || `https://${AUTH0_DOMAIN}/api/v2/`;

async function getManagementToken() {
  const url = `https://${AUTH0_DOMAIN}/oauth/token`;
  const data = {
    grant_type: 'client_credentials',
    client_id: AUTH0_CLIENT_ID,
    client_secret: AUTH0_CLIENT_SECRET,
    audience: AUTH0_AUDIENCE,
  };
  const res = await axios.post(url, data, {
    headers: { 'content-type': 'application/json' },
  });
  return res.data.access_token;
}

/**
 * Get Auth0 user profile
 * @param {string} userId - Auth0 user_id (e.g. 'auth0|abc123')
 */
async function getUserProfile(userId) {
  const token = await getManagementToken();
    const url = `https://${AUTH0_DOMAIN}/api/v2/users/${encodeURIComponent(userId)}`;
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
  });
  return response.data;
}

/**
 * Update Auth0 user profile (name fields and/or picture)
 * @param {string} userId - Auth0 user_id (e.g. 'auth0|abc123')
 * @param {object} updates - { given_name, family_name, picture }
 */
async function updateUserProfile(userId, updates) {
  const token = await getManagementToken();
  //console.log('Management API token: ', token);
  //console.log('userId: ', userId);
  const url = `https://${AUTH0_DOMAIN}/api/v2/users/${encodeURIComponent(userId)}`;
  const res = await axios.patch(url, updates, {
    headers: {
      Authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
  });
  return res.data;
}

/**
 * Resend Auth0 email verification
 * @param {string} userId - Auth0 user_id (e.g. 'auth0|abc123')
 */
async function resendEmailVerification(userId) {
  const token = await getManagementToken();
    const url = `https://${AUTH0_DOMAIN}/api/v2/jobs/verification-email`;
    const res = await axios.post(url, {
      user_id: userId,
      client_id: AUTH0_CLIENT_ID,
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
  return res.data;
}

module.exports = {
  getUserProfile,
  updateUserProfile,
  resendEmailVerification,
}; 