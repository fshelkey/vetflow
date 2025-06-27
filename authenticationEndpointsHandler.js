const express = require('express')
const rateLimit = require('express-rate-limit')
const { body, validationResult } = require('express-validator')
const authService = require('../services/authService')
const authMiddleware = require('../middleware/authMiddleware')

const router = express.Router()

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  handler: (req, res) => {
    res.status(429).json({ error: 'Too many login attempts, please try again later.' })
  },
})

const loginValidation = [
  body('email')
    .exists().withMessage('Email is required')
    .bail()
    .isEmail().withMessage('Email must be a valid email address'),
  body('password')
    .exists().withMessage('Password is required')
    .bail()
    .isString().withMessage('Password must be a string')
    .bail()
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
]

router.post(
  '/login',
  loginLimiter,
  loginValidation,
  async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }
    const { email, password } = req.body
    try {
      const { token, user } = await authService.signIn({ email, password })
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 1000 * 60 * 60 * 24,
      }
      res.cookie('jwt', token, cookieOptions)
      const safeUser = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      }
      res.json({ user: safeUser })
    } catch (err) {
      next(err)
    }
  }
)

router.get(
  '/session',
  authMiddleware,
  (req, res) => {
    const { id, email, name, role } = req.user
    res.json({ user: { id, email, name, role } })
  }
)

router.post(
  '/logout',
  authMiddleware,
  async (req, res, next) => {
    try {
      await authService.signOut({ userId: req.user.id })
      res.clearCookie('jwt', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      })
      res.json({ success: true })
    } catch (err) {
      next(err)
    }
  }
)

module.exports = router