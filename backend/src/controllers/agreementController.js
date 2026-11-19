/**
 * Agreement Controller
 * Logs user acceptance of Terms & Conditions before payment
 */
const db = require('../config/db');

/**
 * POST /api/agreements/accept
 * Record that the authenticated user has accepted the terms
 */
async function acceptAgreement(req, res) {
  try {
    const userId = req.user.id;
    const packageType = req.body.packageType || 'premium';
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'] || null;

    await db.query(
      `INSERT INTO agreements (user_id, package_type, ip_address, user_agent)
       VALUES ($1, $2, $3, $4)`,
      [userId, packageType, ipAddress, userAgent]
    );

    res.json({ message: 'Agreement recorded.' });
  } catch (error) {
    console.error('Agreement error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

module.exports = { acceptAgreement };
