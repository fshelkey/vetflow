require('dotenv').config();

const express = require('express');
const morgan = require('morgan');
const authRoutes = require('./routes/auth');
const homeRoutes = require('./routes/home');

const app = express();

app.use(morgan('dev'));
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/', homeRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Server running on port ${port}`));
}

module.exports = app;