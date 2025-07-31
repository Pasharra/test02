const config = require('./config');
const { expressjwt: jwt } = require('express-jwt');
const jwksRsa = require('jwks-rsa');

const checkJwt = jwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${config.AUTH0_DOMAIN}/.well-known/jwks.json`,
  }),
  audience: config.AUTH0_AUDIENCE,
  issuer: `https://${config.AUTH0_DOMAIN}/`,
  algorithms: ['RS256'],
});

/**
 * Check if the authenticated user has admin role
 * @param {object} req - Express request object with auth token
 * @returns {boolean} - True if user is admin
 */
function isUserAdmin(req) {
  const roles = req.auth && req.auth["https://aiweb.app/roles"];
  return roles && roles.includes('Admin');
}

/**
 * Middleware to check if user is admin
 */
function checkAdmin(req, res, next) {
  if (!isUserAdmin(req)) {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
}

/**
 * Middleware to check if user is logged in
 */
function checkLoggedIn(req, res, next) {
  if (!req.auth) {
    return res.status(403).json({ error: 'User not logged in.' });
  }
  next();
}

module.exports = { checkJwt, isUserAdmin, checkAdmin, checkLoggedIn }; 