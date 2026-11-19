/**
 * Payment Controller
 * Handles: Create payment, TEB NestPay 3D callback, Payment status
 * Supports two packages: 'personal' (ValaBoterori) and 'business' (ValaBoterori BIZ)
 */
const db = require('../config/db');
const { generateOrderReference } = require('../utils/helpers');
const { buildPaymentForm, verifyResponseHash, parsePaymentResponse } = require('../services/bankService');
const { provisionCredentials } = require('../services/ottService');
const { sendCredentialsEmail, sendPaymentConfirmedEmail } = require('../services/emailService');
const { isValaNumber } = require('../services/valaGiftService');
const { sendOscGift } = require('../services/oscRechargeService');

// Package pricing in cents
const PACKAGE_PRICES = {
  personal: 999,      // €9.99
  business: 3499,     // €34.99
};

// Column mappings per package type
function getColumns(packageType) {
  if (packageType === 'business') {
    return {
      paymentStatus: 'biz_payment_status',
      paymentReference: 'biz_payment_reference',
      paymentDate: 'biz_payment_date',
      paymentAmount: 'biz_payment_amount',
      ottUsername: 'biz_ott_username',
      ottPassword: 'biz_ott_password',
      ottSubscriberId: 'biz_ott_subscriber_id',
      ottProvisioned: 'biz_ott_provisioned',
    };
  }
  // Mobile packages and personal use the same columns
  return {
    paymentStatus: 'payment_status',
    paymentReference: 'payment_reference',
    paymentDate: 'payment_date',
    paymentAmount: 'payment_amount',
    ottUsername: 'ott_username',
    ottPassword: 'ott_password',
    ottSubscriberId: 'ott_subscriber_id',
    ottProvisioned: 'ott_provisioned',
  };
}

/**
 * POST /api/payment/create
 * Create a payment order and return TEB form params for 3D redirect
 * Body: { packageType: 'personal' | 'business', mobilePackage?: 'XXL' | 'XL' | 'L' | 'M' | 'S' }
 */
async function createPayment(req, res) {
  try {
    const userId = req.user.id;
    const packageType = req.body.packageType || 'personal';
    const mobilePackage = req.body.mobilePackage || null; // XXL, XL, L, M, S or null

    const validPackages = ['personal', 'business'];
    if (!validPackages.includes(packageType)) {
      return res.status(400).json({ error: 'Invalid package type.' });
    }

    // Validate mobile package if provided
    if (mobilePackage && !['XXL', 'XL', 'L', 'M', 'S'].includes(mobilePackage)) {
      return res.status(400).json({ error: 'Invalid mobile package type.' });
    }

    const cols = getColumns(packageType);

    // Check if already paid for this package
    const userResult = await db.query(
      `SELECT ${cols.paymentStatus} AS pkg_status, email, first_name, last_name, phone FROM users WHERE id = $1`,
      [userId]
    );
    const user = userResult.rows[0];

    if (user.pkg_status === 'paid') {
      return res.status(400).json({ error: 'You have already paid for this package.' });
    }

    // Cancel any pending payments for this package (and clear mobile_package)
    if (user.pkg_status === 'pending') {
      await db.query(
        'UPDATE payments SET status = $1, mobile_package = NULL WHERE user_id = $2 AND status = $3 AND package_type = $4',
        ['cancelled', userId, 'pending', packageType]
      );
    }

    // Determine price based on package type and mobile package
    let amount;
    if (mobilePackage) {
      amount = 1999; // €19.99 for all mobile packages
    } else {
      amount = PACKAGE_PRICES[packageType];
    }
    
    const currency = process.env.SUBSCRIPTION_CURRENCY || 'EUR';
    const orderReference = generateOrderReference(packageType);

    // Save payment record with package_type and mobile_package
    await db.query(
      'INSERT INTO payments (user_id, order_reference, amount, currency, status, package_type, mobile_package) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [userId, orderReference, amount, currency, 'pending', packageType, mobilePackage]
    );

    // Update user package status
    await db.query(
      `UPDATE users SET ${cols.paymentStatus} = $1, ${cols.paymentReference} = $2 WHERE id = $3`,
      ['pending', orderReference, userId]
    );

    // Build callback URLs
    const backendUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;

    // Build TEB form params
    const { gatewayUrl, formParams } = buildPaymentForm({
      orderReference,
      amount,
      okUrl: `${backendUrl}/api/payment/teb-return`,
      failUrl: `${backendUrl}/api/payment/teb-return`,
      callbackUrl: `${backendUrl}/api/payment/teb-callback`,
      userEmail: user.email,
      userName: `${user.first_name} ${user.last_name} ${user.email}`,
    });

    res.json({
      message: 'Payment form ready.',
      gatewayUrl,
      formParams,
      orderReference,
      amount,
      currency,
      packageType,
    });
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * Send an HTML page that redirects the top-level window.
 * TEB 3D Secure often runs inside an iframe, so res.redirect()
 * only navigates the iframe. This breaks out to the main window.
 */
function sendTopRedirect(res, url) {
  res.send(`<!DOCTYPE html>
<html><head>
<meta http-equiv="refresh" content="2;url=${url}">
</head><body>
<script>
  if (window.top) { window.top.location.href = "${url}"; }
  else { window.location.href = "${url}"; }
</script>
<noscript><a href="${url}">Duke u ridrejtuar... Kliko këtu nëse nuk ridrejtoheni automatikisht.</a></noscript>
</body></html>`);
}

/**
 * POST /api/payment/teb-return
 * TEB redirects the user's browser here (okUrl / failUrl) via POST.
 * Verifies hash, processes payment, then redirects user to frontend.
 */
async function tebReturn(req, res) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  try {
    const postParams = req.body;
    const orderId = postParams.oid;

    console.log('\n🏦 ══════════════════════════════════════');
    console.log('🏦  TEB RETURN — User redirected back');
    console.log(`🏦  Order: ${orderId}`);
    console.log(`🏦  Response: ${postParams.Response}`);
    console.log(`🏦  mdStatus: ${postParams.mdStatus}`);
    console.log(`🏦  ProcReturnCode: ${postParams.ProcReturnCode}`);
    console.log(`🏦  ErrMsg: ${postParams.ErrMsg}`);
    console.log(`🏦  AuthCode: ${postParams.AuthCode}`);
    console.log(`🏦  TransId: ${postParams.TransId}`);
    console.log('🏦  Full response:', JSON.stringify(postParams, null, 2));
    console.log('🏦 ══════════════════════════════════════\n');

    // Verify hash
    if (!verifyResponseHash(postParams)) {
      console.error('🏦 ❌ Hash verification failed on teb-return');
      return sendTopRedirect(res, `${frontendUrl}/payment-failed`);
    }

    // Parse response
    const result = parsePaymentResponse(postParams);

    // Find the payment
    const paymentResult = await db.query(
      'SELECT id, user_id, status, package_type, mobile_package, order_reference FROM payments WHERE order_reference = $1',
      [orderId]
    );

    if (paymentResult.rows.length === 0) {
      console.error(`🏦 Payment not found for order: ${orderId}`);
      return sendTopRedirect(res, `${frontendUrl}/payment-failed`);
    }

    const payment = paymentResult.rows[0];

    if (payment.status === 'completed') {
      // Already processed (callback beat the redirect)
      return sendTopRedirect(res, `${frontendUrl}/payment-success`);
    }

    if (payment.status === 'failed' || payment.status === 'cancelled') {
      // Late return for an already-failed/cancelled payment — do NOT touch the user row
      console.log(`🏦 Late teb-return for already-${payment.status} payment ${payment.id}, redirecting to failed`);
      return sendTopRedirect(res, `${frontendUrl}/payment-failed`);
    }

    if (result.success) {
      // Redirect user immediately — OTT provisioning runs in the background.
      // Dashboard polling will pick up credentials once ready.
      sendTopRedirect(res, `${frontendUrl}/payment-success`);

      processSuccessfulPayment(payment, result, postParams).catch(err => {
        console.error('⚠️ Background payment processing error (teb-return):', err);
      });
      return;
    } else {
      // Payment failed — quick DB update then redirect
      await db.query(
        'UPDATE payments SET status = $1, bank_transaction_id = $2, bank_response = $3 WHERE id = $4',
        ['failed', result.transactionId, JSON.stringify(postParams), payment.id]
      );

      const cols = getColumns(payment.package_type || 'personal');
      await db.query(
        `UPDATE users SET ${cols.paymentStatus} = $1 WHERE id = $2`,
        ['unpaid', payment.user_id]
      );

      return sendTopRedirect(res, `${frontendUrl}/payment-failed`);
    }
  } catch (error) {
    console.error('TEB return error:', error);
    return sendTopRedirect(res, `${frontendUrl}/payment-failed`);
  }
}

/**
 * POST /api/payment/teb-callback
 * Server-to-server callback from TEB (callbackUrl).
 * This is a backup — processes payment if teb-return hasn't already.
 */
async function tebCallback(req, res) {
  try {
    const postParams = req.body;
    const orderId = postParams.oid;

    console.log('\n🏦 ══════════════════════════════════════');
    console.log('🏦  TEB CALLBACK — Server-to-server');
    console.log(`🏦  Order: ${orderId}`);
    console.log(`🏦  Response: ${postParams.Response}`);
    console.log(`🏦  mdStatus: ${postParams.mdStatus}`);
    console.log('🏦 ══════════════════════════════════════\n');

    // Verify hash
    if (!verifyResponseHash(postParams)) {
      console.error('🏦 ❌ Hash verification failed on teb-callback');
      return res.status(403).send('Invalid hash');
    }

    const result = parsePaymentResponse(postParams);

    const paymentResult = await db.query(
      'SELECT id, user_id, status, package_type, mobile_package, order_reference FROM payments WHERE order_reference = $1',
      [orderId]
    );

    if (paymentResult.rows.length === 0) {
      return res.status(404).send('Payment not found');
    }

    const payment = paymentResult.rows[0];

    if (payment.status === 'completed') {
      return res.send('Already processed');
    }

    if (payment.status === 'failed' || payment.status === 'cancelled') {
      // Late callback for an already-failed/cancelled payment — do NOT touch the user row
      // (a newer successful payment may have already set payment_status = 'paid')
      console.log(`🏦 Late callback for already-${payment.status} payment ${payment.id}, ignoring user update`);
      return res.send('Already processed');
    }

    if (result.success) {
      await processSuccessfulPayment(payment, result, postParams);
      return res.send('OK');
    } else {
      // Clear mobile_package on payment failure
      await db.query(
        'UPDATE payments SET status = $1, bank_transaction_id = $2, bank_response = $3, mobile_package = NULL WHERE id = $4',
        ['failed', result.transactionId, JSON.stringify(postParams), payment.id]
      );

      const cols = getColumns(payment.package_type || 'personal');
      await db.query(
        `UPDATE users SET ${cols.paymentStatus} = $1 WHERE id = $2`,
        ['unpaid', payment.user_id]
      );

      return res.send('FAIL');
    }
  } catch (error) {
    console.error('TEB callback error:', error);
    return res.status(500).send('Error');
  }
}

/**
 * Shared logic for processing a successful payment.
 * Updates DB, provisions OTT credentials, sends email.
 */
async function processSuccessfulPayment(payment, result, rawPostParams) {
  const packageType = payment.package_type || 'personal';
  const mobilePackage = payment.mobile_package || null; // XXL, XL, L, M, S or null
  const cols = getColumns(packageType);

  // Atomically claim this payment to prevent double processing
  const claimed = await db.query(
    'UPDATE payments SET status = $1, bank_transaction_id = $2, bank_response = $3 WHERE id = $4 AND status != $1 RETURNING id',
    ['completed', result.transactionId, JSON.stringify(rawPostParams), payment.id]
  );
  if (claimed.rows.length === 0) {
    console.log(`🏦 Payment ${payment.id} already processed, skipping`);
    return;
  }

  // Get user data for OTT provisioning
  const userResult = await db.query(
    'SELECT id, first_name, last_name, email, phone FROM users WHERE id = $1',
    [payment.user_id]
  );
  const user = userResult.rows[0];

  // Provision OTT credentials
  const ottResult = await provisionCredentials({
    firstName: user.first_name,
    lastName: user.last_name,
    email: user.email,
    phone: user.phone,
  }, packageType);

  // Store the amount TEB actually charged (convert from EUR string to cents integer)
  const paidAmount = rawPostParams.amount ? Math.round(parseFloat(rawPostParams.amount) * 100) : null;

  if (ottResult.success) {
    // Save OTT credentials (mobile_package will be set when OSC confirms)
    await db.query(
      `UPDATE users SET ${cols.paymentStatus} = $1, ${cols.paymentDate} = NOW(),
       ${cols.paymentAmount} = $2,
       ${cols.ottUsername} = $3, ${cols.ottPassword} = $4, ${cols.ottSubscriberId} = $5, ${cols.ottProvisioned} = TRUE
       WHERE id = $6`,
      ['paid', paidAmount, ottResult.credentials.username, ottResult.credentials.password, ottResult.subscriberId, user.id]
    );

    // Send credentials email
    try {
      await sendCredentialsEmail(
        user.email,
        user.first_name,
        ottResult.credentials.username,
        ottResult.credentials.password,
        packageType,
        user.phone,
        mobilePackage
      );
      console.log(`✅ Credentials email sent successfully (${packageType}${mobilePackage ? ` + ${mobilePackage}` : ''})`);
    } catch (emailError) {
      console.error('❌ Failed to send credentials email:', emailError.message);
    }
  } else {
    // OTT provisioning failed — mark as paid but not provisioned
    await db.query(
      `UPDATE users SET ${cols.paymentStatus} = $1, ${cols.paymentDate} = NOW(), ${cols.paymentAmount} = $2 WHERE id = $3`,
      ['paid', paidAmount, user.id]
    );
    console.error(`⚠️ OTT provisioning failed for user ${user.id} (${packageType}):`, ottResult.error);

    try {
      await sendPaymentConfirmedEmail(user.email, user.first_name, packageType);
      console.log('✅ Payment confirmed email sent (OTT provisioning will be retried)');
    } catch (emailError) {
      console.error('❌ Failed to send payment confirmed email:', emailError.message);
    }
  }

  // Set mobile_package to PENDING if this is a mobile package payment
  if (mobilePackage) {
    await db.query(
      'UPDATE users SET mobile_package = $1 WHERE id = $2',
      ['PENDING', user.id]
    );
    console.log(`📱 Mobile package ${mobilePackage} marked as PENDING (waiting for OSC)`);
  }

  // Try OSC/Recharge gift — runs regardless of OTT result (payment is confirmed)
  if (isValaNumber(user.phone)) {
    const oscGiftCol      = packageType === 'business' ? 'valaboterori_biz_gift'        : 'valaboterori_gift';
    const oscGiftAtCol    = packageType === 'business' ? 'valaboterori_biz_gift_at'     : 'valaboterori_gift_at';
    const oscAttemptedCol = packageType === 'business' ? 'osc_biz_gift_attempted'       : 'osc_gift_attempted';
    const oscAttemptedAt  = packageType === 'business' ? 'osc_biz_gift_attempted_at'    : 'osc_gift_attempted_at';
    const oscErrorCol     = packageType === 'business' ? 'osc_biz_gift_error'           : 'osc_gift_error';
    const oscTxnCol       = packageType === 'business' ? 'osc_biz_transaction_id'       : 'osc_transaction_id';

    console.log(`🎁 User has VALA number, attempting OSC gift (${packageType}${mobilePackage ? ` - ${mobilePackage}` : ''})`);
    const oscResult = await sendOscGift(user.phone, packageType, payment.order_reference, user.id);

    if (oscResult.success) {
      await db.query(
        `UPDATE users SET
           ${oscGiftCol} = TRUE, ${oscGiftAtCol} = NOW(),
           ${oscAttemptedCol} = TRUE, ${oscAttemptedAt} = NOW(), ${oscErrorCol} = NULL,
           ${oscTxnCol} = $1
         WHERE id = $2`,
        [oscResult.transactionId, user.id]
      );
      console.log(`✅ OSC gift sent successfully to ${user.phone} | TxnID: ${oscResult.transactionId}${oscResult.mock ? ' [MOCK]' : ''}`);
    } else {
      await db.query(
        `UPDATE users SET
           ${oscAttemptedCol} = TRUE, ${oscAttemptedAt} = NOW(), ${oscErrorCol} = $1
         WHERE id = $2`,
        [oscResult.error, user.id]
      );
      console.error(`⚠️ OSC gift failed for ${user.phone}: ${oscResult.error}`);
    }

    // For mobile packages, make a second OSC request with unique STAN after 2 seconds
    if (mobilePackage && oscResult.success) {
      console.log(`📱 Mobile package detected: ${mobilePackage}, scheduling second OSC request after 2s`);
      
      setTimeout(async () => {
        try {
          // Generate unique STAN for mobile package (different from 104GB STAN)
          const mobileOrderRef = `${payment.order_reference}-M`;
          
          console.log(`📱 Executing second OSC request for mobile package: ${mobilePackage} | STAN: ${mobileOrderRef}`);
          const mobileOscResult = await sendOscGift(user.phone, mobilePackage, mobileOrderRef, user.id);
          
          if (mobileOscResult.success) {
            // Update users.mobile_package only when OSC confirms delivery
            await db.query(
              'UPDATE users SET mobile_package = $1 WHERE id = $2',
              [mobilePackage, user.id]
            );
            console.log(`✅ Mobile package ${mobilePackage} OSC gift sent successfully | TxnID: ${mobileOscResult.transactionId}${mobileOscResult.mock ? ' [MOCK]' : ''}`);
          } else {
            console.error(`⚠️ Mobile package OSC gift failed: ${mobileOscResult.error}`);
            // Mark as FAILED in database for admin visibility
            await db.query(
              'UPDATE users SET mobile_package = $1 WHERE id = $2',
              ['FAILED', user.id]
            );
          }
        } catch (mobileError) {
          console.error(`❌ Mobile package OSC request threw error:`, mobileError.message);
          console.error(`   Stack:`, mobileError.stack);
          try {
            await db.query(
              'UPDATE users SET mobile_package = $1 WHERE id = $2',
              ['FAILED', user.id]
            );
          } catch (dbError) {
            console.error(`❌ Failed to update mobile_package to FAILED:`, dbError.message);
          }
        }
      }, 2000); // 2 second delay between OSC requests
    }
  } else {
    console.log(`ℹ️ User phone ${user.phone} is not a VALA number, skipping OSC gift`);
  }
}

/**
 * GET /api/payment/status
 * Check payment status for the logged-in user (both packages)
 */
async function getPaymentStatus(req, res) {
  try {
    const userId = req.user.id;

    const result = await db.query(
      `SELECT payment_status, payment_date, ott_username, ott_password, ott_provisioned,
              biz_payment_status, biz_payment_date, biz_ott_username, biz_ott_password, biz_ott_provisioned
       FROM users WHERE id = $1`,
      [userId]
    );

    const user = result.rows[0];

    res.json({
      personal: {
        paymentStatus: user.payment_status,
        paymentDate: user.payment_date,
        ottProvisioned: user.ott_provisioned,
        ottUsername: user.ott_provisioned ? user.ott_username : null,
        ottPassword: user.ott_provisioned ? user.ott_password : null,
      },
      business: {
        paymentStatus: user.biz_payment_status,
        paymentDate: user.biz_payment_date,
        ottProvisioned: user.biz_ott_provisioned,
        ottUsername: user.biz_ott_provisioned ? user.biz_ott_username : null,
        ottPassword: user.biz_ott_provisioned ? user.biz_ott_password : null,
      },
    });
  } catch (error) {
    console.error('Payment status error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * POST /api/payment/reset-pending
 * Reset pending payment status back to unpaid.
 * Called when user returns to Dashboard without completing payment at TEB.
 * Safe because teb-callback (server-to-server) will still set 'paid' if TEB processed the charge.
 */
async function resetPending(req, res) {
  try {
    const userId = req.user.id;

    await db.query(
      `UPDATE users SET payment_status = 'unpaid' WHERE id = $1 AND payment_status = 'pending'`,
      [userId]
    );
    await db.query(
      `UPDATE users SET biz_payment_status = 'unpaid' WHERE id = $1 AND biz_payment_status = 'pending'`,
      [userId]
    );

    res.json({ message: 'OK' });
  } catch (error) {
    console.error('Reset pending error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

module.exports = { createPayment, tebReturn, tebCallback, getPaymentStatus, resetPending, processSuccessfulPayment };
