const express = require('express');
const auth = require('../middleware/auth');

const router = express.Router();

// Public landing page
router.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to VetFlow API',
    endpoints: {
      login: 'POST /auth/login',
      dashboard: 'GET /dashboard (requires authentication)'
    }
  });
});

// Protected dashboard route
router.get('/dashboard', auth, (req, res) => {
  const name =
    (req.user.user_metadata &&
      (req.user.user_metadata.name || req.user.user_metadata.full_name)) ||
    req.user.email;
  res.json({ message: `Welcome to your dashboard, ${name}` });
});

module.exports = router;