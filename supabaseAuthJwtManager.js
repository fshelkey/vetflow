const { existsSync } = require('fs');

let createClient;
try {
  ({ createClient } = require('@supabase/supabase-js'));
} catch (err) {
  throw new Error(
    "Missing dependency '@supabase/supabase-js'. Please run 'npm install @supabase/supabase-js'"
  );
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase environment variables');
}

const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  }
);

const supabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

async function signInWithPassword(email, password) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

async function signOut(accessToken) {
  const token = accessToken.startsWith('Bearer ')
    ? accessToken.split(' ')[1]
    : accessToken;

  // Retrieve user so we can revoke all sessions for that user
  const { data: userData, error: getUserError } = await supabaseAdmin.auth.getUser(token);
  if (getUserError) throw getUserError;
  const userId = userData.user.id;

  // Invalidate all sessions for this user (revokes tokens)
  const { error: revokeError } = await supabaseAdmin.auth.admin.invalidateUserSessions(userId);
  if (revokeError) throw revokeError;
}

async function refreshSession(refreshToken) {
  const { data, error } = await supabaseClient.auth.refreshSession({ refresh_token: refreshToken });
  if (error) throw error;
  return data.session;
}

async function verifyToken(authorizationHeader) {
  if (!authorizationHeader) throw new Error('No authorization header provided');
  const token = authorizationHeader.startsWith('Bearer ')
    ? authorizationHeader.split(' ')[1]
    : authorizationHeader;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error) throw error;
  return data.user;
}

function authMiddleware() {
  return async (req, res, next) => {
    try {
      const user = await verifyToken(req.headers.authorization || '');
      req.user = user;
      next();
    } catch (error) {
      console.error('Authentication error:', error);
      const status = error.status || 401;
      const message = error.message || 'Unauthorized';
      res.status(status).json({ error: message });
    }
  };
}

module.exports = {
  signInWithPassword,
  signOut,
  refreshSession,
  verifyToken,
  authMiddleware
};