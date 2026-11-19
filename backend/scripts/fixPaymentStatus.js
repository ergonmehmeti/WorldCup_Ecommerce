#!/usr/bin/env node
/**
 * Fix payment_status for a user whose status was incorrectly reset to 'unpaid'
 * despite having a completed payment (race condition bug — now fixed).
 *
 * Usage:
 *   node backend/scripts/fixPaymentStatus.js customer@email.com
 *   node backend/scripts/fixPaymentStatus.js customer@email.com --biz   # fix business package instead
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Pool } = require('pg');

const email = process.argv[2];
const isBiz = process.argv.includes('--biz');

if (!email || !email.includes('@')) {
  console.error('Usage: node backend/scripts/fixPaymentStatus.js customer@email.com [--biz]');
  process.exit(1);
}

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function main() {
  // Find user
  const { rows } = await pool.query(
    `SELECT id, first_name, last_name, email, payment_status, biz_payment_status,
            ott_provisioned, biz_ott_provisioned
     FROM users WHERE LOWER(email) = LOWER($1)`,
    [email]
  );

  if (rows.length === 0) {
    console.error(`❌ No user found with email: ${email}`);
    await pool.end();
    process.exit(1);
  }

  const u = rows[0];
  const col = isBiz ? 'biz_payment_status' : 'payment_status';
  const ottCol = isBiz ? 'biz_ott_provisioned' : 'ott_provisioned';
  const currentStatus = isBiz ? u.biz_payment_status : u.payment_status;
  const isProvisioned = isBiz ? u.biz_ott_provisioned : u.ott_provisioned;

  console.log(`\n  User:        ${u.first_name} ${u.last_name} (ID: ${u.id})`);
  console.log(`  Email:       ${u.email}`);
  console.log(`  Package:     ${isBiz ? 'Business' : 'Personal'}`);
  console.log(`  Current:     ${col} = '${currentStatus}'`);
  console.log(`  OTT:         ${isProvisioned ? '✅ provisioned' : '⏳ not provisioned'}`);

  // Safety check — verify there's a completed payment
  const { rows: payments } = await pool.query(
    `SELECT id, order_reference, amount, created_at FROM payments
     WHERE user_id = $1 AND status = 'completed' AND package_type = $2
     ORDER BY created_at DESC LIMIT 1`,
    [u.id, isBiz ? 'business' : 'personal']
  );

  if (payments.length === 0) {
    console.error(`\n❌ No completed payment found for this user/package. Aborting.`);
    await pool.end();
    process.exit(1);
  }

  const p = payments[0];
  console.log(`\n  ✅ Confirmed completed payment found:`);
  console.log(`     Order ref: ${p.order_reference}`);
  console.log(`     Amount:    €${(p.amount / 100).toFixed(2)}`);

  if (currentStatus === 'paid') {
    console.log(`\n  ℹ️  ${col} is already 'paid'. Nothing to fix.`);
    await pool.end();
    return;
  }

  // Apply fix
  await pool.query(
    `UPDATE users SET ${col} = 'paid', updated_at = NOW() WHERE id = $1`,
    [u.id]
  );

  console.log(`\n  ✅ Fixed: ${col} → 'paid' for user ${u.id} (${u.email})\n`);
  await pool.end();
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  pool.end();
  process.exit(1);
});
