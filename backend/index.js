const config = require('./src/utils/config');
require('dotenv').config();
const express = require('express');
const app = express();
const stripeWebhookRoute = require('./src/webhooks/stripe');
// Stripe webhook must be registered before express.json()
app.use('/webhooks/stripe', stripeWebhookRoute);
const profileRoute = require('./src/routes/profile');
const notificationRoute = require('./src/routes/notification');
const subscriptionRoute = require('./src/routes/subscription');
const contentRoute = require('./src/routes/content');
const adminRoute = require('./src/routes/admin');
const chatRoute = require('./src/routes/chat');

app.use(express.json());

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', config.FRONTEND_URI);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.get('/health', async (req, res) => {
  console.log('AUTH0_DOMAIN: ' + config.AUTH0_DOMAIN);
  console.log('S3_AVATAR_BUCKET: ' + config.S3_AVATAR_BUCKET);
  
  // Test database connection
  const db = require('./src/db');
  let dbStatus = 'disconnected';
  let dbError = null;
  
  try {
    // Test basic connection
    await db.raw('SELECT 1 as test');
    dbStatus = 'connected';
    console.log('✅ Database connection healthy');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    dbStatus = 'error';
    dbError = {
      message: error.message,
      code: error.code
    };
  }
  
  res.json({ 
    status: 'ok', 
    message: 'AI Content Web App backend is running.',
    database: {
      status: dbStatus,
      error: dbError
    }
  });
});

app.use('/api/profile', profileRoute);
app.use('/api/notification', notificationRoute);
app.use('/api/subscription', subscriptionRoute);
app.use('/api/content', contentRoute);
app.use('/api/admin', adminRoute);
app.use('/api/chat', chatRoute);

const PORT = config.PORT;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 