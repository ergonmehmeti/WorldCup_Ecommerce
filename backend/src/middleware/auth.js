const jwt = require('jsonwebtoken');
const db = require('../config/db');

/**
 * Middleware to verify JWT token and attach user to request
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch fresh user data from DB
    const result = await db.query(
      `SELECT id, first_name, last_name, email, phone, email_verified,
              payment_status, ott_username, ott_password, ott_provisioned,
              biz_payment_status, biz_ott_username, biz_ott_password, biz_ott_provisioned,
              role
       FROM users WHERE id = $1`,
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found.' });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired.' });
    }
    return res.status(401).json({ error: 'Invalid token.' });
  }
};

/**
 * Middleware to check if user's email is verified
 */
const requireVerified = (req, res, next) => {
  if (!req.user.email_verified) {
    return res.status(403).json({ error: 'Email not verified. Please verify your email first.' });
  }
  next();
};

/**
 * Middleware to restrict access to admins only
 */
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admins only.' });
  }
  next();
};

/**
 * Middleware to restrict access to admin or admin_operator
 */
const requireAdminOrOperator = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'admin_operator') {
    return res.status(403).json({ error: 'Access denied.' });
  }
  next();
};

module.exports = { authenticate, requireVerified, requireAdmin, requireAdminOrOperator };
