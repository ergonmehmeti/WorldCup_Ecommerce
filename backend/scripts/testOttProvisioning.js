/**
 * OTT Provisioning Test Script
 * Creates a test user, marks payment as confirmed, and tests OTT provisioning
 * Skips email sending for fast testing
 * 
 * Usage:
 *   node scripts/testOttProvisioning.js [firstName] [lastName] [email] [options]
 * 
 * Options:
 *   --delete    Delete test user after provisioning
 *   --mock      Force mock mode (skip real OTT API)
 * 
 * Examples:
 *   node scripts/testOttProvisioning.js
 *   node scripts/testOttProvisioning.js "John" "Doe" "test@example.com"
 *   node scripts/testOttProvisioning.js "Jane" "Smith" "jane@test.com" --delete
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { provisionCredentials } = require('../src/services/ottService');

// Parse command line arguments
const args = process.argv.slice(2);
const flags = {
  delete: args.includes('--delete'),
  mock: args.includes('--mock'),
};

// Remove flags from args
const cleanArgs = args.filter(arg => !arg.startsWith('--'));

// Test user data
const testUser = {
  firstName: cleanArgs[0] || 'John',
  lastName: cleanArgs[1] || 'Doe',
  email: cleanArgs[2] || `testuser${Date.now()}@worldcuptv.test`,
  phone: '+38349123456',
  password: 'TestPassword123!',
};

// Database connection
const dbPassword = process.env.DB_PASSWORD ? String(process.env.DB_PASSWORD) : '';
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: dbPassword,
});

/**
 * Create or update test user in database
 */
async function createTestUser() {
  console.log('\n👤 ══════════════════════════════════════');
  console.log('👤  Creating Test User');
  console.log('👤 ══════════════════════════════════════');
  console.log(`👤  Name: ${testUser.firstName} ${testUser.lastName}`);
  console.log(`👤  Email: ${testUser.email}`);
  console.log(`👤  Phone: ${testUser.phone}`);

  const passwordHash = await bcrypt.hash(testUser.password, 10);

  // Check if user exists
  const existingUser = await pool.query(
    'SELECT id FROM users WHERE email = $1',
    [testUser.email]
  );

  let userId;

  if (existingUser.rows.length > 0) {
    userId = existingUser.rows[0].id;
    console.log(`👤  User exists (ID: ${userId}) - updating...`);

    // Update existing user
    await pool.query(
      `UPDATE users SET 
        first_name = $1, 
        last_name = $2, 
        phone = $3,
        email_verified = TRUE,
        payment_status = 'paid',
        payment_date = NOW(),
        payment_amount = 2000
      WHERE id = $4`,
      [testUser.firstName, testUser.lastName, testUser.phone, userId]
    );
  } else {
    console.log('👤  Creating new user...');

    // Create new user
    const result = await pool.query(
      `INSERT INTO users (
        first_name, last_name, email, phone, password_hash,
        email_verified, payment_status, payment_date, payment_amount
      ) VALUES ($1, $2, $3, $4, $5, TRUE, 'paid', NOW(), 2000)
      RETURNING id`,
      [testUser.firstName, testUser.lastName, testUser.email, testUser.phone, passwordHash]
    );
    userId = result.rows[0].id;
  }

  console.log(`✅ Test user ready (ID: ${userId})`);
  console.log('👤 ══════════════════════════════════════\n');

  return userId;
}

/**
 * Test OTT provisioning
 */
async function testOttProvisioning(userId) {
  console.log('📺 ══════════════════════════════════════');
  console.log('📺  Testing OTT Provisioning');
  console.log('📺 ══════════════════════════════════════');

  // Override NODE_ENV if mock flag is set
  const originalEnv = process.env.NODE_ENV;
  if (flags.mock) {
    console.log('📺  Mode: MOCK (forced)');
    process.env.NODE_ENV = 'development';
  } else {
    console.log(`📺  Mode: ${process.env.NODE_ENV === 'production' ? 'PRODUCTION (Real OTT API)' : 'DEVELOPMENT (Mock)'}`);
  }

  try {
    // Call OTT provisioning
    const ottResult = await provisionCredentials({
      firstName: testUser.firstName,
      lastName: testUser.lastName,
      email: testUser.email,
      phone: testUser.phone,
    });

    // Restore original environment
    process.env.NODE_ENV = originalEnv;

    if (ottResult.success) {
      console.log('✅ OTT Provisioning successful!\n');

      // Save credentials to database
      await pool.query(
        `UPDATE users SET 
          ott_username = $1,
          ott_password = $2,
          ott_subscriber_id = $3,
          ott_provisioned = TRUE
        WHERE id = $4`,
        [ottResult.credentials.username, ottResult.credentials.password, ottResult.subscriberId, userId]
      );

      console.log('📊 ══════════════════════════════════════');
      console.log('📊  Results');
      console.log('📊 ══════════════════════════════════════');
      console.log(`📊  Username:      ${ottResult.credentials.username}`);
      console.log(`📊  Password:      ${ottResult.credentials.password}`);
      console.log(`📊  Subscriber ID: ${ottResult.subscriberId}`);
      console.log(`📊  Packages:      ${ottResult.packagesAssigned !== undefined ? (ottResult.packagesAssigned ? 'All assigned ✅' : 'Some failed ⚠️') : 'N/A (mock)'}`);
      console.log('📊 ══════════════════════════════════════\n');

      return { success: true, userId, ottResult };
    } else {
      console.error('❌ OTT Provisioning failed!');
      console.error(`❌ Error: ${ottResult.error}\n`);
      return { success: false, userId, error: ottResult.error };
    }
  } catch (error) {
    process.env.NODE_ENV = originalEnv;
    console.error('💥 Unexpected error during OTT provisioning:', error.message);
    return { success: false, userId, error: error.message };
  }
}

/**
 * Verify data in database
 */
async function verifyDatabase(userId) {
  console.log('🔍 ══════════════════════════════════════');
  console.log('🔍  Database Verification');
  console.log('🔍 ══════════════════════════════════════');

  const result = await pool.query(
    `SELECT 
      email, first_name, last_name, phone,
      email_verified, payment_status, payment_date,
      ott_username, ott_password, ott_subscriber_id, ott_provisioned
    FROM users WHERE id = $1`,
    [userId]
  );

  const user = result.rows[0];

  if (!user) {
    console.log('❌ User not found in database!');
    return;
  }

  console.log(`🔍  Email Verified:  ${user.email_verified ? '✅' : '❌'}`);
  console.log(`🔍  Payment Status:  ${user.payment_status} ${user.payment_status === 'paid' ? '✅' : '❌'}`);
  console.log(`🔍  OTT Provisioned: ${user.ott_provisioned ? '✅' : '❌'}`);
  console.log(`🔍  OTT Username:    ${user.ott_username || '(none)'}`);
  console.log(`🔍  OTT Password:    ${user.ott_password || '(none)'}`);
  console.log(`🔍  Subscriber ID:   ${user.ott_subscriber_id || '(none)'}`);
  console.log('🔍 ══════════════════════════════════════\n');
}

/**
 * Delete test user
 */
async function deleteTestUser(userId) {
  console.log('🗑️  ══════════════════════════════════════');
  console.log('🗑️   Deleting Test User');
  console.log('🗑️  ══════════════════════════════════════');

  await pool.query('DELETE FROM users WHERE id = $1', [userId]);
  
  console.log(`✅ Test user deleted (ID: ${userId})`);
  console.log('🗑️  ══════════════════════════════════════\n');
}

/**
 * Main execution
 */
async function main() {
  console.log('\n🚀 ════════════════════════════════════════════════');
  console.log('🚀  OTT PROVISIONING TEST SCRIPT');
  console.log('🚀 ════════════════════════════════════════════════\n');

  try {
    // Step 1: Create test user
    const userId = await createTestUser();

    // Step 2: Test OTT provisioning
    const result = await testOttProvisioning(userId);

    // Step 3: Verify database
    await verifyDatabase(userId);

    // Step 4: Delete user if requested
    if (flags.delete) {
      await deleteTestUser(userId);
    } else {
      console.log('💡 Tip: Run with --delete flag to remove test user automatically\n');
    }

    if (result.success) {
      console.log('✨ Test completed successfully!\n');
      process.exit(0);
    } else {
      console.log('⚠️  Test completed with errors. Check logs above.\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('💥 Test failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
main();
