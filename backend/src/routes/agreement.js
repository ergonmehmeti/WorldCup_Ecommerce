/**
 * Agreement Routes
 */
const express = require('express');
const router = express.Router();
const { acceptAgreement } = require('../controllers/agreementController');
const { authenticate } = require('../middleware/auth');

// Must be logged in to record agreement
router.post('/accept', authenticate, acceptAgreement);

module.exports = router;
