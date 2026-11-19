/**
 * Rate Limiter Middleware
 * Protects auth endpoints from brute force and abuse
 */
const rateLimit = require('express-rate-limit');

/**
 * Login rate limiter
 * Max 10 attempts per IP per 15 minutes
 * Covers brute force password attacks
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Only count failed attempts
});

/**
 * Signup rate limiter
 * Max 5 signups per IP per hour
 * Prevents fake account spam
 */
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { error: 'Too many accounts created from this IP. Please try again in an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Password reset request limiter
 * Max 5 requests per IP per hour
 * Prevents email flooding and email enumeration
 */
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { error: 'Too many password reset requests. Please try again in an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Reset password submit limiter
 * Max 10 attempts per IP per 15 minutes
 * Prevents token brute-forcing
 */
const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many reset attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Resend verification code limiter
 * Max 5 requests per IP per hour
 * Prevents email spam abuse
 */
const resendCodeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { error: 'Too many code requests. Please try again in an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Verify email code limiter
 * Max 10 attempts per IP per 15 minutes
 * Prevents brute-forcing the 6-digit code
 */
const verifyEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many verification attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

module.exports = {
  loginLimiter,
  signupLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
  resendCodeLimiter,
  verifyEmailLimiter,
};
