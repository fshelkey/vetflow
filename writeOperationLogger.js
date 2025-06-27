const db = require('../db');
const MAX_BODY_LENGTH = Number(process.env.MAX_LOG_BODY_LENGTH) || 10000;
const MAX_ROUTE_LENGTH = Number(process.env.MAX_LOG_ROUTE_LENGTH) || 2048;
const SENSITIVE_FIELDS = ['password', 'pass', 'pwd', 'token', 'accessToken', 'refreshToken', 'authorization', 'auth', 'ssn', 'creditCard', 'ccv', 'cvv', 'secret'];

function sanitize(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(sanitize);
  }
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_FIELDS.some(field => field.toLowerCase() === lowerKey)) {
      result[key] = '[FILTERED]';
    } else {
      result[key] = sanitize(value);
    }
  }
  return result;
}

async function writeOperationLogger(req, res, next) {
  const { method } = req;
  if (['POST', 'PUT', 'DELETE'].includes(method)) {
    const userId = req.user?.id || null;
    let route = req.originalUrl || req.url || '';
    if (route.length > MAX_ROUTE_LENGTH) {
      route = route.slice(0, MAX_ROUTE_LENGTH) + '...';
    }

    let bodyString;
    try {
      const sanitized = sanitize(req.body || {});
      bodyString = JSON.stringify(sanitized);
      if (bodyString.length > MAX_BODY_LENGTH) {
        bodyString = bodyString.slice(0, MAX_BODY_LENGTH) + '...';
      }
    } catch (err) {
      console.error('writeOperationLogger sanitization error:', err);
      bodyString = '[Unserializable]';
    }

    const timestamp = new Date().toISOString();
    try {
      await db.query(
        `INSERT INTO audit_logs (user_id, route, method, body, timestamp)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, route, method, bodyString, timestamp]
      );
    } catch (err) {
      console.error('writeOperationLogger DB error:', err);
      // Consider pushing to a retry queue or external logging service here
    }
  }
  next();
}

module.exports = writeOperationLogger;