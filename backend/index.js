require('dotenv').config();
const express = require('express');
const app = express();
const profileRoute = require('./src/routes/profile');

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'AI Content Web App backend is running.' });
});

app.use('/api/profile', profileRoute);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 