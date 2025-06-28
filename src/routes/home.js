const express = require('express');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, (req, res) => {
  const name =
    (req.user.user_metadata &&
      (req.user.user_metadata.name || req.user.user_metadata.full_name)) ||
    req.user.email;
  res.json({ message: `Welcome, ${name}` });
});

module.exports = router;
