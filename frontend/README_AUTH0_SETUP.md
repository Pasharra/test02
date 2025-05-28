# Auth0 Setup Instructions

To enable authentication and signup, you need to set up Auth0 for this project.

## 1. Create an Auth0 Account
- Go to https://auth0.com and sign up for a free account.

## 2. Create an Application
- In the Auth0 dashboard, go to Applications > Applications > Create Application.
- Name: AI Content Web App
- Type: Single Page Application (SPA)

## 3. Configure Allowed URLs
- Allowed Callback URLs: `http://localhost:3000`
- Allowed Logout URLs: `http://localhost:3000`
- Allowed Web Origins: `http://localhost:3000`

## 4. Enable Google Social Login (Optional)
- In Auth0 dashboard, go to Authentication > Social > Google.
- Follow the instructions to enable Google login.

## 5. Get Your Credentials
- From your Application settings, copy:
  - Domain
  - Client ID
  - (Optional) API Audience if using Auth0 APIs

## 6. Configure Your .env File
- In the `frontend` folder, create a `.env` file:

```
REACT_APP_AUTH0_DOMAIN=your-auth0-domain
REACT_APP_AUTH0_CLIENT_ID=your-auth0-client-id
REACT_APP_AUTH0_AUDIENCE=your-auth0-api-audience (optional)
REACT_APP_AUTH0_REDIRECT_URI=http://localhost:3000
```

- Replace the placeholders with your actual Auth0 values.

## 7. Restart the Dev Server
- After editing `.env`, restart your React dev server if it's running.

---

**You are now ready to use Auth0 authentication in the app!** 