require('dotenv').config();

const express = require('express');
const path = require('path');
const morgan = require('morgan');
const authRoutes = require('./routes/auth');
const homeRoutes = require('./routes/home');

const app = express();

app.use(morgan('dev'));
app.use(express.json());

// API routes MUST come before static file serving
app.use('/auth', authRoutes);
app.use('/dashboard', homeRoutes);

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Serve the main HTML file for any unmatched routes (SPA behavior)
// This should be LAST to avoid catching API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`VetFlow server running on port ${port}`));
}

module.exports = app;