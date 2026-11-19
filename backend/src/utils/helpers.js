/**
 * Helper utilities
 */

/**
 * Generate a random 6-digit verification code
 */
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generate a unique order reference
 */
function generateOrderReference(packageType = 'personal') {
  const prefix = packageType === 'business' ? 'WCBIZ' : 'WC';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Sanitize phone number (remove spaces, dashes)
 */
function sanitizePhone(phone) {
  return phone.replace(/[\s\-\(\)]/g, '');
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate a person's name.
 * Allows Unicode letters (covers Albanian ë, ç, etc.), spaces, hyphens, apostrophes, and dots.
 * Rejects HTML tags, template expressions, and other injection payloads.
 */
function isValidName(name) {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 50) return false;
  // Only Unicode letters, spaces, hyphens, apostrophes, dots
  return /^[\p{L}\p{M}'\-\. ]+$/u.test(trimmed);
}

module.exports = {
  generateVerificationCode,
  generateOrderReference,
  sanitizePhone,
  isValidEmail,
  isValidName,
};
