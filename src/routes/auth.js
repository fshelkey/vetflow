const express = require('express');
const { signInWithPassword } = require('../../supabaseAuthJwtManager');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

console.log('Auth routes module loaded');

// Initialize Supabase client for registration
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

console.log('Supabase client initialized for auth routes');

router.post('/login', async (req, res) => {
  console.log('Login route hit');
  try {
    const { email, password } = req.body;
    console.log('Login attempt for:', email);
    
    const session = await signInWithPassword(email, password);
    console.log('Login successful');
    
    return res.json({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
  } catch (err) {
    console.error('Login error:', err);
    const status = err.status || 401;
    return res.status(status).json({ error: err.message || 'Invalid credentials' });
  }
});

router.post('/register', async (req, res) => {
  console.log('Register route hit');
  console.log('Request body:', req.body);
  
  try {
    const { email, password, fullName } = req.body;

    // Validate input
    if (!email || !password || !fullName) {
      console.log('Missing required fields');
      return res.status(400).json({ error: 'Email, password, and full name are required' });
    }

    if (password.length < 8) {
      console.log('Password too short');
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    console.log('Creating user with Supabase...');
    
    // Create user with Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        name: fullName,
        role: 'admin' // Set as admin by default for first registration
      },
      email_confirm: true // Auto-confirm email for admin registration
    });

    if (error) {
      console.error('Supabase registration error:', error);
      return res.status(400).json({ 
        error: error.message || 'Registration failed' 
      });
    }

    console.log('User created successfully:', data.user.id);

    // Return success response
    return res.status(201).json({
      message: 'Admin account created successfully',
      user: {
        id: data.user.id,
        email: data.user.email,
        name: fullName
      }
    });

  } catch (err) {
    console.error('Registration error:', err);
    const status = err.status || 500;
    return res.status(status).json({ 
      error: err.message || 'Registration failed' 
    });
  }
});

// Test route for auth module
router.get('/test', (req, res) => {
  console.log('Auth test route hit');
  res.json({ message: 'Auth routes are working' });
});

console.log('Auth routes configured');

module.exports = router;