/**
 * Admin Controller
 * Handles admin and admin_operator actions
 */
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { provisionCredentials } = require('../services/ottService');
const { sendCredentialsEmail } = require('../services/emailService');
const { isValaNumber } = require('../services/valaGiftService');
const { sendOscGift } = require('../services/oscRechargeService');

// Phone validation: accepts +xxx... (international) or 0xxx... (local)
const PHONE_REGEX = /^(\+\d{1,15}|0\d{1,14})$/;

/**
 * GET /api/admin/users
 * Returns full customer list (admin + admin_operator)
 */
async function getUsers(req, res) {
  try {
    const result = await db.query(`
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        u.email_verified,
        u.role,
        u.payment_status,
        u.payment_date,
        u.payment_amount,
        u.payment_reference,
        u.ott_provisioned,
        u.ott_username,
        u.ott_password,
        u.ott_subscriber_id,
        u.biz_payment_status,
        u.biz_payment_date,
        u.biz_payment_amount,
        u.biz_ott_provisioned,
        u.biz_ott_username,
        u.biz_ott_password,
        u.biz_ott_subscriber_id,
        u.valaboterori_gift,
        u.valaboterori_gift_at,
        u.valaboterori_biz_gift,
        u.valaboterori_biz_gift_at,
        u.vala_email_sent,
        u.vala_email_sent_at,
        u.vala_email_failed,
        u.vala_email_failed_at,
        u.vala_biz_email_sent,
        u.vala_biz_email_sent_at,
        u.vala_biz_email_failed,
        u.vala_biz_email_failed_at,
        u.osc_gift_attempted,
        u.osc_gift_attempted_at,
        u.osc_gift_error,
        u.osc_transaction_id,
        u.osc_biz_gift_attempted,
        u.osc_biz_gift_attempted_at,
        u.osc_biz_gift_error,
        u.osc_biz_transaction_id,
        u.mobile_package,
        p.mobile_package AS payment_mobile_package,
        u.created_at
      FROM users u
      LEFT JOIN LATERAL (
        SELECT mobile_package 
        FROM payments 
        WHERE user_id = u.id AND package_type = 'personal' AND mobile_package IS NOT NULL
        ORDER BY created_at DESC 
        LIMIT 1
      ) p ON true
      WHERE u.role = 'customer'
      ORDER BY u.created_at DESC
    `);

    res.json({ users: result.rows });
  } catch (error) {
    console.error('Admin getUsers error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * GET /api/admin/stats
 * Returns summary counts (admin + admin_operator)
 */
async function getStats(req, res) {
  try {
    const result = await db.query(`
      SELECT
        COUNT(*)                                          AS total_customers,
        COUNT(*) FILTER (WHERE payment_status = 'paid')  AS total_paid_personal,
        COUNT(*) FILTER (WHERE biz_payment_status = 'paid') AS total_paid_business,
        COUNT(*) FILTER (WHERE payment_status = 'paid' OR biz_payment_status = 'paid') AS total_paid_any,
        COUNT(*) FILTER (WHERE ott_provisioned = TRUE)   AS total_provisioned_personal,
        COUNT(*) FILTER (WHERE biz_ott_provisioned = TRUE) AS total_provisioned_business,
        COUNT(*) FILTER (WHERE payment_status = 'paid' AND ott_provisioned = FALSE) AS paid_not_provisioned_personal,
        COUNT(*) FILTER (WHERE biz_payment_status = 'paid' AND biz_ott_provisioned = FALSE) AS paid_not_provisioned_business
      FROM users
      WHERE role = 'customer'
    `);

    // Get detailed breakdown for PERSONAL packages
    const personalBreakdown = await db.query(`
      SELECT
        p.mobile_package,
        u.payment_amount AS amount,
        COUNT(*) FILTER (WHERE u.ott_provisioned = TRUE) AS provisioned_count
      FROM users u
      LEFT JOIN LATERAL (
        SELECT mobile_package
        FROM payments
        WHERE user_id = u.id AND package_type = 'personal' 
        ORDER BY created_at DESC
        LIMIT 1
      ) p ON true
      WHERE u.role = 'customer' AND u.payment_status = 'paid'
      GROUP BY p.mobile_package, u.payment_amount
    `);

    // Get detailed breakdown for BUSINESS packages
    const businessBreakdown = await db.query(`
      SELECT COUNT(*) FILTER (WHERE biz_ott_provisioned = TRUE) AS provisioned_count
      FROM users
      WHERE role = 'customer' AND biz_payment_status = 'paid'
    `);

    // Debug logging
    console.log('Personal breakdown:', JSON.stringify(personalBreakdown.rows, null, 2));
    console.log('Business breakdown:', JSON.stringify(businessBreakdown.rows, null, 2));

    // Convert package breakdown to an object
    const provisionedByPackage = {
      BIZ: 0,
      Personal: 0,
      PlayOFF: 0,
      FazaFinale: 0,
      XXL: 0,
      XL: 0,
      L: 0,
      M: 0,
      S: 0
    };

    // Handle business packages
    const bizCount = parseInt(businessBreakdown.rows[0]?.provisioned_count) || 0;
    provisionedByPackage.BIZ = bizCount;

    // Map personal packages based on mobile_package and amount
    personalBreakdown.rows.forEach(row => {
      const pkg = row.mobile_package;
      const amount = parseInt(row.amount) || 0;
      const count = parseInt(row.provisioned_count) || 0;
      
      console.log(`Processing personal row: pkg=${pkg}, amount=${amount}, count=${count}`);
      
      // Skip business packages (they're already counted)
      if (amount === 3499) {
        console.log(`Skipping business package (amount=3499)`);
        return;
      }
      
      if (pkg && ['XXL', 'XL', 'L', 'M', 'S'].includes(pkg)) {
        // Mobile packages (€19.99 with mobile_package specified)
        provisionedByPackage[pkg] += count;
      } else if (!pkg && amount === 1499) {
        // PlayOFF: Personal at €14.99 without mobile package (OLD PRICE)
        provisionedByPackage.PlayOFF += count;
      } else if (!pkg && amount === 999) {
        // FazaFinale: Personal at €9.99 without mobile package (NEW PRICE)
        provisionedByPackage.FazaFinale += count;
      } else if (!pkg && amount === 1999) {
        // Personal: Personal at €19.99 without mobile package
        provisionedByPackage.Personal += count;
      } else {
        // Log unexpected cases
        console.warn(`Unexpected personal package: mobile_package=${pkg}, amount=${amount}, count=${count}`);
        // Default fallback based on amount
        if (amount === 1499 || amount === 1500) {
          provisionedByPackage.PlayOFF += count;
        } else if (amount === 999 || amount === 1000) {
          provisionedByPackage.FazaFinale += count;
        } else if (amount === 1999) {
          provisionedByPackage.Personal += count;
        } else {
          provisionedByPackage.FazaFinale += count; // Final fallback
        }
      }
    });

    console.log('Final provisionedByPackage:', provisionedByPackage);

    res.json({ 
      stats: {
        ...result.rows[0],
        provisionedByPackage
      }
    });
  } catch (error) {
    console.error('Admin getStats error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * GET /api/admin/operators
 * Returns list of all admin and admin_operator accounts (admin only)
 */
async function getOperators(req, res) {
  try {
    const result = await db.query(`
      SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.role, u.created_at,
        u.payment_status, u.payment_date, u.payment_amount, u.payment_reference,
        u.ott_provisioned, u.ott_username, u.ott_password, u.ott_subscriber_id,
        u.biz_payment_status, u.biz_payment_date, u.biz_payment_amount,
        u.biz_ott_provisioned, u.biz_ott_username, u.biz_ott_password, u.biz_ott_subscriber_id,
        u.valaboterori_gift, u.valaboterori_gift_at,
        u.valaboterori_biz_gift, u.valaboterori_biz_gift_at,
        u.vala_email_sent, u.vala_email_sent_at, u.vala_email_failed, u.vala_email_failed_at,
        u.vala_biz_email_sent, u.vala_biz_email_sent_at, u.vala_biz_email_failed, u.vala_biz_email_failed_at,
        u.osc_gift_attempted, u.osc_gift_attempted_at, u.osc_gift_error, u.osc_transaction_id,
        u.osc_biz_gift_attempted, u.osc_biz_gift_attempted_at, u.osc_biz_gift_error, u.osc_biz_transaction_id,
        u.mobile_package,
        p.mobile_package AS payment_mobile_package
      FROM users u
      LEFT JOIN LATERAL (
        SELECT mobile_package 
        FROM payments 
        WHERE user_id = u.id AND package_type = 'personal' AND mobile_package IS NOT NULL
        ORDER BY created_at DESC 
        LIMIT 1
      ) p ON true
      WHERE role IN ('admin', 'admin_operator')
      ORDER BY role, created_at DESC
    `);

    res.json({ operators: result.rows });
  } catch (error) {
    console.error('Admin getOperators error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * POST /api/admin/operators
 * Create a new admin or admin_operator account (admin only)
 * No email verification required
 */
async function createOperator(req, res) {
  try {
    const { firstName, lastName, email, password, role, phone } = req.body;

    if (!firstName || !lastName || !email || !password || !role || !phone) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    if (!['admin', 'admin_operator'].includes(role)) {
      return res.status(400).json({ error: 'Role must be admin or admin_operator.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await db.query(
      `INSERT INTO users (first_name, last_name, email, phone, password_hash, email_verified, role)
       VALUES ($1, $2, $3, $4, $5, TRUE, $6)
       RETURNING id, first_name, last_name, email, role`,
      [firstName.trim(), lastName.trim(), email.toLowerCase().trim(), phone.trim(), passwordHash, role]
    );

    res.status(201).json({
      message: `Account created successfully with role: ${role}.`,
      operator: result.rows[0],
    });
  } catch (error) {
    console.error('Create operator error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * DELETE /api/admin/operators/:id
 * Remove an admin or admin_operator account (admin only, cannot delete yourself)
 * Blocked if the account has a payment — must demote to customer instead
 */
async function deleteOperator(req, res) {
  try {
    const { id } = req.params;

    if (parseInt(id, 10) === req.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own account.' });
    }

    // Check if account has payment
    const check = await db.query(
      "SELECT id, payment_status FROM users WHERE id = $1 AND role IN ('admin', 'admin_operator')",
      [id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found.' });
    }

    if (check.rows[0].payment_status === 'paid') {
      return res.status(409).json({
        error: 'This account has a payment record and cannot be deleted. Demote to customer instead.',
        code: 'HAS_PAYMENT',
      });
    }

    await db.query(
      "DELETE FROM users WHERE id = $1 AND role IN ('admin', 'admin_operator')",
      [id]
    );

    res.json({ message: 'Account removed successfully.' });
  } catch (error) {
    console.error('Delete operator error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * PUT /api/admin/operators/:id/demote
 * Demote an admin or admin_operator to customer role (admin only)
 */
async function demoteToCustomer(req, res) {
  try {
    const { id } = req.params;

    if (parseInt(id, 10) === req.user.id) {
      return res.status(400).json({ error: 'You cannot demote your own account.' });
    }

    const result = await db.query(
      "UPDATE users SET role = 'customer' WHERE id = $1 AND role IN ('admin', 'admin_operator') RETURNING id, email, role",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found.' });
    }

    res.json({ message: 'Account demoted to customer.', user: result.rows[0] });
  } catch (error) {
    console.error('Demote operator error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * PUT /api/admin/users/:id/promote
 * Promote a customer to admin_operator (admin only)
 */
async function promoteToOperator(req, res) {
  try {
    const { id } = req.params;

    const result = await db.query(
      "UPDATE users SET role = 'admin_operator' WHERE id = $1 AND role = 'customer' RETURNING id, email, role",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    res.json({ message: 'User promoted to admin_operator.', user: result.rows[0] });
  } catch (error) {
    console.error('Promote to operator error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * PUT /api/admin/operators/:id/promote-admin
 * Promote an admin_operator to admin (admin only)
 */
async function promoteToAdmin(req, res) {
  try {
    const { id } = req.params;

    if (parseInt(id, 10) === req.user.id) {
      return res.status(400).json({ error: 'You cannot change your own role.' });
    }

    const result = await db.query(
      "UPDATE users SET role = 'admin' WHERE id = $1 AND role = 'admin_operator' RETURNING id, email, role",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Admin Operator not found.' });
    }

    res.json({ message: 'User promoted to admin.', user: result.rows[0] });
  } catch (error) {
    console.error('Promote to admin error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * POST /api/admin/users/:id/provision-ott
 * Manually trigger OTT provisioning for a paid customer who was not provisioned (admin + admin_operator)
 * Body: { packageType: 'personal' | 'business' }
 */
async function manualProvisionOtt(req, res) {
  try {
    const { id } = req.params;
    const packageType = req.body.packageType || 'personal';

    if (!['personal', 'business'].includes(packageType)) {
      return res.status(400).json({ error: 'Invalid package type.' });
    }

    const isBiz = packageType === 'business';
    const statusCol = isBiz ? 'biz_payment_status' : 'payment_status';
    const provCol = isBiz ? 'biz_ott_provisioned' : 'ott_provisioned';

    const userResult = await db.query(
      `SELECT id, first_name, last_name, email, phone, ${statusCol} AS pkg_status, ${provCol} AS pkg_provisioned FROM users WHERE id = $1`,
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const user = userResult.rows[0];

    if (user.pkg_status !== 'paid') {
      return res.status(400).json({ error: 'Cannot provision OTT: customer has not paid for this package.' });
    }

    if (user.pkg_provisioned) {
      return res.status(400).json({ error: 'OTT is already provisioned for this package.' });
    }

    const ottResult = await provisionCredentials({
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      phone: user.phone,
    }, packageType);

    if (!ottResult.success) {
      return res.status(502).json({ error: 'OTT provisioning failed: ' + ottResult.error });
    }

    const userCol = isBiz ? 'biz_ott_username' : 'ott_username';
    const passCol = isBiz ? 'biz_ott_password' : 'ott_password';
    const subCol = isBiz ? 'biz_ott_subscriber_id' : 'ott_subscriber_id';

    await db.query(
      `UPDATE users SET ${userCol} = $1, ${passCol} = $2, ${subCol} = $3, ${provCol} = TRUE WHERE id = $4`,
      [ottResult.credentials.username, ottResult.credentials.password, ottResult.subscriberId, user.id]
    );

    try {
      await sendCredentialsEmail(user.email, user.first_name, ottResult.credentials.username, ottResult.credentials.password, packageType, user.phone);
    } catch (emailErr) {
      console.error('Failed to send credentials email after manual provision:', emailErr.message);
    }

    res.json({ message: `OTT provisioned successfully (${packageType}).`, username: ottResult.credentials.username });
  } catch (error) {
    console.error('Manual OTT provision error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * PATCH /api/admin/users/:id/phone
 * Update user's phone number (admin only)
 */
async function updateUserPhone(req, res) {
  try {
    const { id } = req.params;
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const cleaned = phone.trim();
    if (!PHONE_REGEX.test(cleaned)) {
      return res.status(400).json({ error: 'Invalid phone format. Use +xxx... or 0xxx...' });
    }

    await db.query('UPDATE users SET phone = $1 WHERE id = $2', [cleaned, id]);

    res.json({ message: 'Phone number updated successfully', phone: cleaned });
  } catch (error) {
    console.error('Update phone error:', error);
    res.status(500).json({ error: 'Failed to update phone number' });
  }
}

/**
 * POST /api/admin/users/:id/send-gift
 * Manually send VALA gift (admin or operator)
 */
async function sendGiftManually(req, res) {
  try {
    const { id } = req.params;
    const { packageType } = req.body;

    if (!['personal', 'business'].includes(packageType)) {
      return res.status(400).json({ error: 'Invalid package type' });
    }

    const userResult = await db.query(
      'SELECT phone, payment_status, biz_payment_status, valaboterori_gift, valaboterori_biz_gift FROM users WHERE id = $1',
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    const paymentStatus = packageType === 'business' ? user.biz_payment_status : user.payment_status;
    if (paymentStatus !== 'paid') {
      return res.status(400).json({ error: `Payment not completed for ${packageType} package` });
    }

    const giftSent = packageType === 'business' ? user.valaboterori_biz_gift : user.valaboterori_gift;
    if (giftSent) {
      return res.status(400).json({ error: `Gift already sent for ${packageType} package` });
    }

    if (req.user.role === 'admin_operator') {
      if (!isValaNumber(user.phone)) {
        return res.status(400).json({ error: 'Phone number is not a valid VALA number' });
      }
    }

    const giftResult = await sendValaGift(user.phone, packageType);

    if (giftResult.success) {
      const giftColumn = packageType === 'business' ? 'valaboterori_biz_gift' : 'valaboterori_gift';
      const giftAtColumn = packageType === 'business' ? 'valaboterori_biz_gift_at' : 'valaboterori_gift_at';

      await db.query(
        `UPDATE users SET ${giftColumn} = TRUE, ${giftAtColumn} = NOW() WHERE id = $1`,
        [id]
      );

      res.json({ message: 'Gift sent successfully', phone: user.phone, packageType });
    } else {
      res.status(500).json({ error: giftResult.error || 'Failed to send gift' });
    }
  } catch (error) {
    console.error('Send gift manually error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST /api/admin/users/:id/retry-osc-gift
 * Manually retry an OSC/Recharge gift for a customer whose gift failed (admin + admin_operator)
 * Body: { packageType: 'personal' | 'business' }
 */
async function retryOscGift(req, res) {
  try {
    const { id } = req.params;
    const packageType = req.body.packageType || 'personal';

    if (!['personal', 'business'].includes(packageType)) {
      return res.status(400).json({ error: 'Invalid package type.' });
    }

    const isBiz = packageType === 'business';
    const paymentCol   = isBiz ? 'biz_payment_status'       : 'payment_status';
    const giftCol      = isBiz ? 'valaboterori_biz_gift'     : 'valaboterori_gift';
    const giftAtCol    = isBiz ? 'valaboterori_biz_gift_at'  : 'valaboterori_gift_at';
    const attemptedCol = isBiz ? 'osc_biz_gift_attempted'    : 'osc_gift_attempted';
    const attemptedAt  = isBiz ? 'osc_biz_gift_attempted_at' : 'osc_gift_attempted_at';
    const errorCol     = isBiz ? 'osc_biz_gift_error'        : 'osc_gift_error';
    const txnCol       = isBiz ? 'osc_biz_transaction_id'    : 'osc_transaction_id';

    // Fetch latest payment order_reference for this user/package
    const paymentResult = await db.query(
      `SELECT order_reference FROM payments WHERE user_id = $1 AND package_type = $2 AND status = 'completed' ORDER BY created_at DESC LIMIT 1`,
      [id, packageType]
    );

    const userResult = await db.query(
      `SELECT id, phone, ${paymentCol} AS pkg_status, ${giftCol} AS gift_sent, ${errorCol} AS osc_error FROM users WHERE id = $1 AND role = 'customer'`,
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    const user = userResult.rows[0];

    if (user.pkg_status !== 'paid') {
      return res.status(400).json({ error: `Customer has not paid for ${packageType} package.` });
    }

    if (user.gift_sent) {
      return res.status(400).json({ error: `OSC gift already sent for ${packageType} package.` });
    }

    if (user.osc_error?.startsWith('[OSC]')) {
      return res.status(400).json({ error: `OSC Recharge returned a definitive failure: ${user.osc_error}. Retry is not allowed.` });
    }

    if (!isValaNumber(user.phone)) {
      return res.status(400).json({ error: 'Phone number is not a valid VALA number.' });
    }

    const orderReference = paymentResult.rows.length > 0
      ? paymentResult.rows[0].order_reference
      : `RETRY-${id}-${Date.now()}`;

    const oscResult = await sendOscGift(user.phone, packageType, orderReference, user.id);

    if (oscResult.success) {
      await db.query(
        `UPDATE users SET
           ${giftCol} = TRUE, ${giftAtCol} = NOW(),
           ${attemptedCol} = TRUE, ${attemptedAt} = NOW(), ${errorCol} = NULL,
           ${txnCol} = $1
         WHERE id = $2`,
        [oscResult.transactionId, id]
      );
      return res.json({ success: true, transactionId: oscResult.transactionId });
    } else {
      await db.query(
        `UPDATE users SET
           ${attemptedCol} = TRUE, ${attemptedAt} = NOW(), ${errorCol} = $1
         WHERE id = $2`,
        [oscResult.error, id]
      );
      return res.status(502).json({ success: false, error: oscResult.error });
    }
  } catch (error) {
    console.error('Retry OSC gift error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * GET /api/admin/payments/export
 * Export payments as CSV (admin only)
 * Query params: from, to (ISO date strings, optional)
 */
async function exportPaymentsCsv(req, res) {
  try {
    const { from, to } = req.query;

    const conditions = [];
    const params = [];

    if (from) {
      params.push(from);
      conditions.push(`p.created_at >= $${params.length}`);
    }
    if (to) {
      params.push(to);
      conditions.push(`p.created_at <= $${params.length}::date + interval '1 day'`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await db.query(`
      SELECT
        p.order_reference,
        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        p.package_type,
        p.mobile_package AS payment_mobile_package,
        u.mobile_package AS user_mobile_package,
        ROUND(p.amount::numeric / 100, 2) AS amount_eur,
        p.currency,
        p.status,
        p.bank_transaction_id,
        p.bank_response->>'Response' AS bank_status,
        p.bank_response->>'ErrMsg'   AS bank_error,
        p.created_at
      FROM payments p
      JOIN users u ON u.id = p.user_id
      ${whereClause}
      ORDER BY p.created_at DESC
    `, params);

    const rows = result.rows;

    const headers = [
      'Order Reference', 'First Name', 'Last Name', 'Email', 'Phone',
      'Package', 'Mobile Package (Ordered)', 'Mobile Package (Delivered)', 'Amount (EUR)', 'Currency', 'Status',
      'Bank Transaction ID', 'Bank Status', 'Bank Error', 'Created At',
    ];

    const escape = (val) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvLines = [
      headers.join(','),
      ...rows.map((r) => [
        r.order_reference, r.first_name, r.last_name, r.email, r.phone,
        r.package_type, r.payment_mobile_package, r.user_mobile_package, r.amount_eur, r.currency, r.status,
        r.bank_transaction_id, r.bank_status, r.bank_error,
        r.created_at ? new Date(r.created_at).toISOString() : '',
      ].map(escape).join(',')),
    ];

    const csv = csvLines.join('\n');
    const filename = from && to
      ? `payments_${from}_to_${to}.csv`
      : `payments_all_${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    console.error('Export payments CSV error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

module.exports = { getUsers, getStats, getOperators, createOperator, deleteOperator, demoteToCustomer, promoteToOperator, promoteToAdmin, manualProvisionOtt, updateUserPhone, sendGiftManually, retryOscGift, exportPaymentsCsv };

