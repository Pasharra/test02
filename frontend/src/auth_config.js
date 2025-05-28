const authConfig = {
  domain: process.env.REACT_APP_AUTH0_DOMAIN,
  clientId: process.env.REACT_APP_AUTH0_CLIENT_ID,
  audience: process.env.REACT_APP_AUTH0_AUDIENCE, // optional
  redirectUri: process.env.REACT_APP_AUTH0_REDIRECT_URI || window.location.origin,
};

export default authConfig; 