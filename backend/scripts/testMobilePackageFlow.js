#!/usr/bin/env node
/**
 * Test Mobile Package Payment Flow (Without Real Payment)
 * 
 * IMPORTANT: User must be registered via website FIRST!
 * This script simulates payment for an existing user and tests:
 * - OTT credentials provisioning
 * - OSC gift (104GB) sending
 * - Mobile package OSC gift (XXL, XL, L, M, S)
 * - Email sending with mobile package details
 * 
 * Usage:
 *   1. Delete existing user:     node backend/scripts/deleteUser.js test.user@example.com
 *   2. Register via website:     Go to website and register test.user@example.com
 *   3. Run this script:
 *      node backend/scripts/testMobilePackageFlow.js XXL    # Test XXL package
 *      node backend/scripts/testMobilePackageFlow.js XL     # Test XL package
 *      node backend/scripts/testMobilePackageFlow.js L      # Test L package
 *      node backend/scripts/testMobilePackageFlow.js M      # Test M package
 *      node backend/scripts/testMobilePackageFlow.js S      # Test S package
 *      node backend/scripts/testMobilePackageFlow.js        # Test personal (no mobile package)
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const db = require('../src/config/db');
const { processSuccessfulPayment } = require('../src/controllers/paymentController');
const { generateOrderReference } = require('../src/utils/helpers');

// ── Test User Configuration ──────────────────────────────────────
// User must be registered via website FIRST before running this script
const TEST_USER = {
  email: 'test.user@example.com',
};

// ── CLI Args ─────────────────────────────────────────────────────
const mobilePackage = process.argv[2]; // XXL, XL, L, M, S or undefined
const validPackages = ['XXL', 'XL', 'L', 'M', 'S'];

if (mobilePackage && !validPackages.includes(mobilePackage)) {
  console.error(`❌ Invalid package: ${mobilePackage}`);
  console.error(`Valid packages: ${validPackages.join(', ')}`);
  process.exit(1);
}

// ── Main Flow ────────────────────────────────────────────────────
async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  Mobile Package Flow Test (Skip Payment)                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('📋 Test Configuration:');
  console.log(`   Email:           ${TEST_USER.email}`);
  console.log(`   Package Type:    personal`);
  console.log(`   Mobile Package:  ${mobilePackage || 'None (standard)'}`);
  console.log(`   Amount:          €${mobilePackage ? '19.99' : '9.99'}\n`);

  try {
    // Step 1: Find existing user (must be registered via website first)
    console.log('🔍 Step 1: Looking up existing user...');
    const userResult = await db.query(
      'SELECT id, first_name, last_name, email, phone, email_verified, payment_status FROM users WHERE email = $1',
      [TEST_USER.email]
    );

    if (userResult.rows.length === 0) {
      console.error(`❌ User not found: ${TEST_USER.email}`);
      console.error(`   Please register this user through the website first!`);
      process.exit(1);
    }

    const user = userResult.rows[0];
    console.log(`✅ User found: ID ${user.id}`);
    console.log(`   Name:            ${user.first_name} ${user.last_name}`);
    console.log(`   Phone:           ${user.phone}`);
    console.log(`   Email Verified:  ${user.email_verified}`);
    console.log(`   Payment Status:  ${user.payment_status}\n`);

    if (!user.email_verified) {
      console.error('❌ Email not verified. Please verify email first!');
      process.exit(1);
    }

    // Step 2: Create fake payment record
    console.log('💳 Step 2: Creating payment record (simulated)...');
    const payment = await createFakePayment(user.id, mobilePackage);
    console.log(`✅ Payment created: ${payment.order_reference}\n`);

    // Step 3: Process payment using REAL payment processing function
    console.log('⚙️  Step 3: Processing payment (using real payment flow)...');
    console.log('   This will call the actual payment processing code that:');
    console.log('   - Provisions OTT credentials');
    console.log('   - Sends credentials email');
    console.log('   - Sends 104GB OSC gift');
    if (mobilePackage) {
      console.log(`   - Sends ${mobilePackage} mobile package OSC gift\n`);
    } else {
      console.log('');
    }

    // Simulate bank response
    const fakeResult = {
      transactionId: `TEST-${payment.order_reference}`,
      approved: true,
      authCode: 'TEST123',
    };
    const fakeRawParams = {
      Response: 'Approved',
      ProcReturnCode: '00',
      mdStatus: '1',
      clientid: payment.order_reference,
    };

    // Call the REAL payment processing function
    await processSuccessfulPayment(payment, fakeResult, fakeRawParams);

    // Step 4: Show final status
    console.log('\n📊 Final Status:');
    const finalUser = await db.query(
      'SELECT payment_status, ott_provisioned, ott_username, ott_password, valaboterori_gift, mobile_package FROM users WHERE id = $1',
      [user.id]
    );
    const u = finalUser.rows[0];
    console.log(`   Payment Status:     ${u.payment_status}`);
    console.log(`   OTT Provisioned:    ${u.ott_provisioned}`);
    if (u.ott_username) {
      console.log(`   OTT Username:       ${u.ott_username}`);
      console.log(`   OTT Password:       ${u.ott_password}`);
    }
    console.log(`   104GB Gift:         ${u.valaboterori_gift}`);
    console.log(`   Mobile Package:     ${u.mobile_package || 'NULL'}`);

    console.log('\n✨ Test completed successfully!\n');
    console.log(`📧 Check your email: ${TEST_USER.email}`);
    console.log('   You should receive credentials email with:');
    if (mobilePackage) {
      console.log(`   - Package: ValaBoterori + ${mobilePackage}`);
      console.log(`   - Yellow box: Mobile package ${mobilePackage} activation notice`);
    } else {
      console.log('   - Package: ValaBoterori');
    }
    console.log('   - Purple box: OTT credentials (username & password)');
    console.log('   - Green box: 104 GB FALAS notice\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// ── Helper Functions ─────────────────────────────────────────────

async function createFakePayment(userId, mobilePackage) {
  const orderReference = generateOrderReference('personal');
  const amount = mobilePackage ? 1999 : 999; // €19.99 for mobile packages, €9.99 for standard

  // Cancel any existing pending payments
  await db.query(
    'UPDATE payments SET status = $1 WHERE user_id = $2 AND status = $3',
    ['cancelled', userId, 'pending']
  );

  // Create new payment record and return full payment object
  const result = await db.query(
    `INSERT INTO payments (user_id, order_reference, amount, currency, status, package_type, mobile_package)
     VALUES ($1, $2, $3, 'EUR', 'pending', 'personal', $4)
     RETURNING id, user_id, order_reference, amount, currency, status, package_type, mobile_package`,
    [userId, orderReference, amount, mobilePackage]
  );

  return result.rows[0];
}

// ── Run ──────────────────────────────────────────────────────────
main();
