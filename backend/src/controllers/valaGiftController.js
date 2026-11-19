/**
 * VALA Gift Controller
 * Handles VALA gift management (email export + future OSC endpoints)
 * All routes require admin role only.
 */
const { resendAllFailedValaEmails } = require('../services/valaGiftEmailService');

/**
 * POST /api/admin/vala-gifts/resend-all-failed
 * Bulk resend all failed/unsent VALA gift emails (admin only)
 */
async function resendAllFailed(req, res) {
  try {
    const result = await resendAllFailedValaEmails(req.user.email);

    if (!result.success) {
      return res.status(500).json({
        error: result.error || 'Failed to resend VALA gift emails',
      });
    }

    return res.json({
      message: result.count === 0
        ? 'No failed numbers to resend'
        : `Successfully sent ${result.count} VALA numbers`,
      count: result.count,
    });
  } catch (error) {
    console.error('Error resending VALA gift emails:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  resendAllFailed,
};
