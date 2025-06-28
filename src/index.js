require('dotenv').config();

const express = require('express');
const path = require('path');
const morgan = require('morgan');
const authRoutes = require('./routes/auth');
const homeRoutes = require('./routes/home');

const app = express();

// Enable detailed logging
app.use(morgan('combined'));
app.use(express.json());

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Body:', req.body);
  }
  next();
});

// API routes MUST come before static file serving
console.log('Setting up /auth routes...');
app.use('/auth', authRoutes);

console.log('Setting up /dashboard routes...');
app.use('/dashboard', homeRoutes);

// Test route to verify server is working
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is working', timestamp: new Date().toISOString() });
});

// Serve static files
console.log('Setting up static file serving...');
app.use(express.static(path.join(__dirname, '../public')));

// Serve the main HTML file for any unmatched routes (SPA behavior)
// This should be LAST to avoid catching API routes
app.get('*', (req, res) => {
  console.log(`Serving index.html for: ${req.url}`);
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`VetFlow server running on port ${port}`);
    console.log('Available routes:');
    console.log('- POST /auth/login');
    console.log('- POST /auth/register');
    console.log('- GET /dashboard');
    console.log('- GET /api/test');
  });
}

module.exports = app;