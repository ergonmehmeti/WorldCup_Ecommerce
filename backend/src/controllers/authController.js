/**
 * Auth Controller
 * Handles: Sign Up, Email Verification, Login, Resend Code, Password Reset
 */
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { generateVerificationCode, sanitizePhone, isValidEmail, isValidName } = require('../utils/helpers');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/emailService');

/**
 * POST /api/auth/signup
 * Register a new user and send verification code
 */
async function signup(req, res) {
  try {
    const { firstName, lastName, email, phone, password } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !phone || !password) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    if (!isValidName(firstName)) {
      return res.status(400).json({ error: 'First name may only contain letters, spaces, hyphens, and apostrophes (2–50 characters).' });
    }

    if (!isValidName(lastName)) {
      return res.status(400).json({ error: 'Last name may only contain letters, spaces, hyphens, and apostrophes (2–50 characters).' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    // Check if email already exists
    const existing = await db.query('SELECT id, email_verified FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      if (existing.rows[0].email_verified) {
        // Verified user — block re-registration
        return res.status(409).json({ error: 'An account with this email already exists.' });
      } else {
        // Unverified user — delete and allow re-registration
        await db.query('DELETE FROM users WHERE id = $1', [existing.rows[0].id]);
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Generate verification code
    const verificationCode = generateVerificationCode();
    const codeExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Insert user
    const result = await db.query(
      `INSERT INTO users (first_name, last_name, email, phone, password_hash, verification_code, verification_code_expires)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, first_name, last_name, email, phone, email_verified`,
      [firstName.trim(), lastName.trim(), email.toLowerCase().trim(), sanitizePhone(phone), passwordHash, verificationCode, codeExpires]
    );

    const user = result.rows[0];

    // Send verification email
    await sendVerificationEmail(user.email, user.first_name, verificationCode);

    // Generate JWT
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    res.status(201).json({
      message: 'Account created! Please check your email for the verification code.',
      token,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        phone: user.phone,
        emailVerified: user.email_verified,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * POST /api/auth/verify-email
 * Verify the email with the 6-digit code
 */
async function verifyEmail(req, res) {
  try {
    const { code } = req.body;
    const userId = req.user.id;

    if (!code || code.length !== 6) {
      return res.status(400).json({ error: 'Please provide a valid 6-digit code.' });
    }

    // Get user's verification code
    const result = await db.query(
      'SELECT verification_code, verification_code_expires, email_verified FROM users WHERE id = $1',
      [userId]
    );

    const user = result.rows[0];

    if (user.email_verified) {
      return res.status(400).json({ error: 'Email is already verified.' });
    }

    if (!user.verification_code) {
      return res.status(400).json({ error: 'No verification code found. Please request a new one.' });
    }

    if (new Date() > new Date(user.verification_code_expires)) {
      return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
    }

    if (user.verification_code !== code) {
      return res.status(400).json({ error: 'Invalid verification code.' });
    }

    // Mark email as verified
    await db.query(
      'UPDATE users SET email_verified = TRUE, verification_code = NULL, verification_code_expires = NULL WHERE id = $1',
      [userId]
    );

    res.json({ message: 'Emaili u verifikua me sukses! Mirë se vini në Vala Botërori.' });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * POST /api/auth/resend-code
 * Resend verification code
 */
async function resendCode(req, res) {
  try {
    const userId = req.user.id;

    const result = await db.query(
      'SELECT first_name, email, email_verified FROM users WHERE id = $1',
      [userId]
    );

    const user = result.rows[0];

    if (user.email_verified) {
      return res.status(400).json({ error: 'Email is already verified.' });
    }

    // Generate new code
    const verificationCode = generateVerificationCode();
    const codeExpires = new Date(Date.now() + 15 * 60 * 1000);

    await db.query(
      'UPDATE users SET verification_code = $1, verification_code_expires = $2 WHERE id = $3',
      [verificationCode, codeExpires, userId]
    );

    // Send email
    await sendVerificationEmail(user.email, user.first_name, verificationCode);

    res.json({ message: 'A new verification code has been sent to your email.' });
  } catch (error) {
    console.error('Resend code error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * POST /api/auth/login
 * Login with email and password
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // Find user
    const result = await db.query(
      `SELECT id, first_name, last_name, email, phone, password_hash, email_verified,
              payment_status, ott_username, ott_password, ott_provisioned,
              biz_payment_status, biz_ott_username, biz_ott_password, biz_ott_provisioned,
              role
       FROM users WHERE email = $1`,
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Email ose fjalëkalimi është i gabuar.' });
    }

    const user = result.rows[0];

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Fjalëkalimi është i gabuar. Ju lutem provoni përsëri.' });
    }

    // Generate JWT
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        phone: user.phone,
        emailVerified: user.email_verified,
        paymentStatus: user.payment_status,
        ottUsername: user.ott_provisioned ? user.ott_username : null,
        ottPassword: user.ott_provisioned ? user.ott_password : null,
        ottProvisioned: user.ott_provisioned,
        bizPaymentStatus: user.biz_payment_status,
        bizOttUsername: user.biz_ott_provisioned ? user.biz_ott_username : null,
        bizOttPassword: user.biz_ott_provisioned ? user.biz_ott_password : null,
        bizOttProvisioned: user.biz_ott_provisioned,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * GET /api/auth/me
 * Get current user profile
 */
async function getMe(req, res) {
  try {
    const user = req.user;
    res.json({
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        phone: user.phone,
        emailVerified: user.email_verified,
        paymentStatus: user.payment_status,
        ottUsername: user.ott_provisioned ? user.ott_username : null,
        ottPassword: user.ott_provisioned ? user.ott_password : null,
        ottProvisioned: user.ott_provisioned,
        bizPaymentStatus: user.biz_payment_status,
        bizOttUsername: user.biz_ott_provisioned ? user.biz_ott_username : null,
        bizOttPassword: user.biz_ott_provisioned ? user.biz_ott_password : null,
        bizOttProvisioned: user.biz_ott_provisioned,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * POST /api/auth/forgot-password
 * Request a password reset link (sent via email)
 * Always returns success to prevent email enumeration
 */
async function forgotPassword(req, res) {
  try {
    const { email } = req.body;

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    const result = await db.query(
      'SELECT id, first_name, email_verified FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      // Generic response to prevent email enumeration
      return res.json({ message: 'Nëse ky email ekziston, do të merrni një link për rivendosje.' });
    }

    const user = result.rows[0];

    // Generate a random token, store its hash in DB
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.query(
      'UPDATE users SET reset_token_hash = $1, reset_token_expires = $2 WHERE id = $3',
      [tokenHash, expires, user.id]
    );

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetLink = `${frontendUrl}/reset-password?token=${rawToken}`;

    await sendPasswordResetEmail(email.toLowerCase().trim(), user.first_name, resetLink);
    console.log(`✅ Password reset email sent to ${email}`);

    res.json({ message: 'Reset link sent! Check your email.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * POST /api/auth/reset-password
 * Submit new password using the token from the reset email
 */
async function resetPassword(req, res) {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    // Hash the provided token to compare with the stored hash
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const result = await db.query(
      'SELECT id, reset_token_expires FROM users WHERE reset_token_hash = $1',
      [tokenHash]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset link.' });
    }

    const user = result.rows[0];

    if (new Date() > new Date(user.reset_token_expires)) {
      return res.status(400).json({ error: 'Reset link has expired. Please request a new one.' });
    }

    // Set new password and clear the reset token (single-use)
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db.query(
      'UPDATE users SET password_hash = $1, reset_token_hash = NULL, reset_token_expires = NULL WHERE id = $2',
      [passwordHash, user.id]
    );

    res.json({ message: 'Password reset successfully. You can now log in with your new password.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

module.exports = { signup, verifyEmail, resendCode, login, getMe, forgotPassword, resetPassword };
