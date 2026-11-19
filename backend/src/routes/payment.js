/**
 * Payment Routes
 */
const express = require('express');
const router = express.Router();
const { createPayment, tebReturn, tebCallback, getPaymentStatus, resetPending } = require('../controllers/paymentController');
const { authenticate, requireVerified } = require('../middleware/auth');

// Protected routes (require JWT + verified email)
router.post('/create', authenticate, requireVerified, createPayment);
router.get('/status', authenticate, getPaymentStatus);
router.post('/reset-pending', authenticate, resetPending);

// TEB NestPay return — user's browser is redirected here via POST after 3D Secure
router.post('/teb-return', tebReturn);

// TEB NestPay server-to-server callback
router.post('/teb-callback', tebCallback);

module.exports = router;
