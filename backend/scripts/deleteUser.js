#!/usr/bin/env node
/**
 * Delete User and All Dependencies
 * 
 * Removes a user and all related records from the database
 * 
 * Usage:
 *   node backend/scripts/deleteUser.js user@example.com
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const db = require('../src/config/db');

const email = process.argv[2];

if (!email) {
  console.error('❌ Usage: node backend/scripts/deleteUser.js <email>');
  console.error('   Example: node backend/scripts/deleteUser.js user@example.com');
  process.exit(1);
}

async function deleteUser() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  Delete User and All Dependencies                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log(`🔍 Searching for user: ${email}\n`);

  try {
    // Check if user exists
    const userResult = await db.query('SELECT id, first_name, last_name, email, phone FROM users WHERE email = $1', [email]);

    if (userResult.rows.length === 0) {
      console.log(`⚠️  User not found: ${email}`);
      process.exit(0);
    }

    const user = userResult.rows[0];
    console.log('✅ User found:');
    console.log(`   ID:    ${user.id}`);
    console.log(`   Name:  ${user.first_name} ${user.last_name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Phone: ${user.phone}\n`);

    // Note: verification_code and reset_token_hash are columns in users table,
    // not separate tables, so they will be deleted automatically with the user

    // Delete payments
    console.log('🗑️  Deleting payments...');
    const paymentsResult = await db.query('DELETE FROM payments WHERE user_id = $1 RETURNING id', [user.id]);
    console.log(`   ✅ Deleted ${paymentsResult.rows.length} payment(s)\n`);

    // Delete agreements
    console.log('🗑️  Deleting agreements...');
    const agreementsResult = await db.query('DELETE FROM agreements WHERE user_id = $1 RETURNING id', [user.id]);
    console.log(`   ✅ Deleted ${agreementsResult.rows.length} agreement(s)\n`);

    // Finally, delete the user
    console.log('🗑️  Deleting user...');
    await db.query('DELETE FROM users WHERE id = $1', [user.id]);
    console.log(`   ✅ User deleted\n`);

    console.log('✨ User and all dependencies deleted successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error deleting user:', error);
    process.exit(1);
  }
}

deleteUser();
