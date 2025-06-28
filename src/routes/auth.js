const express = require('express');
const { signInWithPassword } = require('../../supabaseAuthJwtManager');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const session = await signInWithPassword(email, password);
    return res.json({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
  } catch (err) {
    const status = err.status || 401;
    return res.status(status).json({ error: err.message || 'Invalid credentials' });
  }
});

module.exports = router;
