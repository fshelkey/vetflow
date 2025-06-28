require('dotenv').config();

const express = require('express');
const path = require('path');
const morgan = require('morgan');
const authRoutes = require('./routes/auth');
const homeRoutes = require('./routes/home');

const app = express();

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

app.use(morgan('dev'));
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/', homeRoutes);

// Serve the main HTML file for any unmatched routes (SPA behavior)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`VetFlow server running on port ${port}`));
}

module.exports = app;