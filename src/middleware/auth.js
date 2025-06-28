const { verifyToken } = require('../../supabaseAuthJwtManager');

module.exports = async function auth(req, res, next) {
  try {
    const user = await verifyToken(req.headers.authorization || '');
    req.user = user;
    return next();
  } catch (err) {
    const status = err.status || 401;
    return res.status(status).json({ error: err.message || 'Unauthorized' });
  }
};
