const express = require('express');
const router = express.Router();
const { resendAllFailed } = require('../controllers/valaGiftController');
const { authenticate, requireAdmin } = require('../middleware/auth');

// All VALA gift routes require admin only (not admin_operator)
router.post('/resend-all-failed', authenticate, requireAdmin, resendAllFailed);

module.exports = router;
