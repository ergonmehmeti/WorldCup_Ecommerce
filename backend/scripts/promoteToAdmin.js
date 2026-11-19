/**
 * Create or promote an admin user.
 * If the user already exists, promotes them to admin and marks both packages as paid.
 * If not, creates the account, sets role to admin, and marks both packages as paid.
 *
 * Usage: node scripts/promoteToAdmin.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const db = require('../src/config/db');

// 🔒 Real admin account hidden — set these in .env
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_FIRST_NAME = process.env.ADMIN_FIRST_NAME || 'Admin';
const ADMIN_LAST_NAME = process.env.ADMIN_LAST_NAME || 'User';

async function run() {
  const existing = await db.query(
    'SELECT id, email, role FROM users WHERE email = $1',
    [ADMIN_EMAIL]
  );

  if (existing.rowCount > 0) {
    const user = existing.rows[0];
    await db.query(
      `UPDATE users SET
         role = 'admin',
         payment_status = 'paid',
         payment_date = NOW(),
         payment_amount = 1999,
         payment_reference = 'ADMIN_GRANT',
         biz_payment_status = 'paid',
         biz_payment_date = NOW(),
         biz_payment_amount = 3499,
         biz_payment_reference = 'ADMIN_GRANT'
       WHERE id = $1`,
      [user.id]
    );
    console.log(`✅ ${user.email} (id: ${user.id}) → admin + both packages marked as paid.`);
  } else {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    const result = await db.query(
      `INSERT INTO users
         (first_name, last_name, email, phone, password_hash, email_verified, role,
          payment_status, payment_date, payment_amount, payment_reference,
          biz_payment_status, biz_payment_date, biz_payment_amount, biz_payment_reference)
       VALUES ($1, $2, $3, $4, $5, TRUE, 'admin',
               'paid', NOW(), 1999, 'ADMIN_GRANT',
               'paid', NOW(), 3499, 'ADMIN_GRANT')
       RETURNING id, email`,
      [ADMIN_FIRST_NAME, ADMIN_LAST_NAME, ADMIN_EMAIL, 'N/A', passwordHash]
    );
    console.log(`✅ Created admin account for ${result.rows[0].email} (id: ${result.rows[0].id}) with both packages paid.`);
  }

  await db.pool.end();
}

run().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
