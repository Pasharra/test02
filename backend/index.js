require('dotenv').config();
const express = require('express');
const app = express();
const stripeWebhookRoute = require('./src/webhooks/stripe');
// Stripe webhook must be registered before express.json()
app.use('/webhooks/stripe', stripeWebhookRoute);
const profileRoute = require('./src/routes/profile');
const notificationRoute = require('./src/routes/notification');
const subscriptionRoute = require('./src/routes/subscription');

app.use(express.json());

const FRONTEND_URI = process.env.FRONTEND_URI;

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', FRONTEND_URI);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.get('/health', (req, res) => {
  console.log('AUTH0_DOMAIN: ' + process.env.AUTH0_DOMAIN);
  console.log('S3_AVATAR_BUCKET: ' + process.env.S3_AVATAR_BUCKET);
  res.json({ status: 'ok', message: 'AI Content Web App backend is running.' });
});

app.use('/api/profile', profileRoute);
app.use('/api/notification', notificationRoute);
app.use('/api/subscription', subscriptionRoute);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 