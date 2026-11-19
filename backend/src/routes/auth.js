/**
 * Auth Routes
 */
const express = require('express');
const router = express.Router();
const { signup, verifyEmail, resendCode, login, getMe, forgotPassword, resetPassword } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { loginLimiter, signupLimiter, forgotPasswordLimiter, resetPasswordLimiter, resendCodeLimiter, verifyEmailLimiter } = require('../middleware/rateLimiter');

// Public routes
router.post('/signup', signupLimiter, signup);
router.post('/login', loginLimiter, login);
router.post('/forgot-password', forgotPasswordLimiter, forgotPassword);
router.post('/reset-password', resetPasswordLimiter, resetPassword);

// Protected routes (require JWT)
router.post('/verify-email', authenticate, verifyEmailLimiter, verifyEmail);
router.post('/resend-code', authenticate, resendCodeLimiter, resendCode);
router.get('/me', authenticate, getMe);

module.exports = router;
