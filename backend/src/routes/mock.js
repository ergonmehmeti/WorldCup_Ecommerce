/**
 * Mock Routes
 * These simulate external APIs (Bank, OTT) for development.
 * Remove or disable in production.
 */
const express = require('express');
const router = express.Router();

/**
 * POST /mock/bank/simulate-callback
 * Manually trigger a bank callback (for testing payment flow)
 * Call this to simulate the bank confirming a payment.
 */
router.post('/bank/simulate-callback', async (req, res) => {
  const { orderReference, status = 'success' } = req.body;

  if (!orderReference) {
    return res.status(400).json({ error: 'orderReference is required.' });
  }

  try {
    console.log(`\n🏦 Mock bank callback triggered for order: ${orderReference}`);
    
    // Use Node's built-in http module for internal request
    const http = require('http');
    const crypto = require('crypto');
    
    // Look up the actual payment amount from DB
    const db = require('../config/db');
    const paymentResult = await db.query(
      'SELECT amount FROM payments WHERE order_reference = $1',
      [orderReference]
    );
    const amount = paymentResult.rows.length > 0
      ? paymentResult.rows[0].amount
      : (parseInt(process.env.SUBSCRIPTION_PRICE) || 1999);

    const secretKey = process.env.BANK_SECRET_KEY;
    const dataToHash = `${amount}${orderReference}${secretKey}`;
    const signature = crypto.createHash('sha256').update(dataToHash).digest('hex');
    
    const callbackData = JSON.stringify({
      orderReference,
      status,
      transactionId: 'MOCK_TXN_' + Date.now(),
      amount,
      signature,
    });

    const options = {
      hostname: 'localhost',
      port: process.env.PORT || 5000,
      path: '/api/payment/bank-callback',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(callbackData),
      },
    };

    const request = http.request(options, (response) => {
      let data = '';
      response.on('data', (chunk) => (data += chunk));
      response.on('end', () => {
        console.log('✅ Mock bank callback completed');
        res.json({ 
          message: 'Mock bank callback sent successfully.',
          status: response.statusCode,
          result: data ? JSON.parse(data) : null,
        });
      });
    });

    request.on('error', (error) => {
      console.error('❌ Mock callback error:', error.message);
      res.status(500).json({ error: 'Failed to simulate callback: ' + error.message });
    });

    request.write(callbackData);
    request.end();
  } catch (error) {
    console.error('❌ Mock callback error:', error);
    res.status(500).json({ error: 'Failed to simulate callback: ' + error.message });
  }
});

module.exports = router;
