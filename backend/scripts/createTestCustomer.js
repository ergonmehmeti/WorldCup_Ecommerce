/**
 * Create a test customer account for local dev/testing.
 * - Email: customer1.test@alfa.com
 * - Password: 12345678
 * - Phone: 044000001 (VALA number)
 * - Role: customer, email verified, payment_status: pending
 *
 * Use this to test the FULL automatic payment → OTT → Mock OSC flow.
 * Go through checkout as this user — after payment completes, OSC mock
 * should auto-fire and populate the OSC Recharge column in the dashboard.
 *
 * Usage: node scripts/createTestCustomer.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../src/config/db');

const EMAIL = 'customer1.test@alfa.com';
const PASSWORD = '12345678';
const PHONE = '044000001';

async function run() {
  const existing = await db.query('SELECT id, email, payment_status, ott_provisioned FROM users WHERE email = $1', [EMAIL]);

  if (existing.rowCount > 0) {
    const user = existing.rows[0];
    const passwordHash = await bcrypt.hash(PASSWORD, 12);
    await db.query(
      `UPDATE users SET
         password_hash = $1,
         phone = $2,
         payment_status = 'pending',
         payment_date = NULL,
         valaboterori_gift = FALSE,
         osc_gift_attempted = FALSE,
         osc_gift_attempted_at = NULL,
         osc_gift_error = NULL,
         osc_transaction_id = NULL
       WHERE id = $3`,
      [passwordHash, PHONE, user.id]
    );
    console.log(`ℹ️  Account already exists (id: ${user.id}) — reset to pending (unpaid).`);
  } else {
    const passwordHash = await bcrypt.hash(PASSWORD, 12);
    const result = await db.query(
      `INSERT INTO users
         (first_name, last_name, email, phone, password_hash, email_verified, role, payment_status)
       VALUES ($1, $2, $3, $4, $5, TRUE, 'customer', 'pending')
       RETURNING id, email`,
      ['Test1', 'Customer1', EMAIL, PHONE, passwordHash]
    );
    console.log(`✅ Created test customer: ${result.rows[0].email} (id: ${result.rows[0].id})`);
  }

  console.log(`   Email:          ${EMAIL}`);
  console.log(`   Password:       ${PASSWORD}`);
  console.log(`   Phone:          ${PHONE} (VALA number)`);
  console.log(`   payment_status: pending`);
  console.log(`\n→ Log in as this user, go through checkout — after payment the Mock OSC should auto-fire.`);

  await db.pool.end();
}

run().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
