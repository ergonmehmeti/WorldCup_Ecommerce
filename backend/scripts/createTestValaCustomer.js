/**
 * Create two test VALA customers for testing OSC Retry button in admin dashboard.
 *
 * Both are PAID with OSC gift FAILED (timeout) → Retry button visible.
 * Customer 1: +38344123456 (prepaid — should succeed on server)
 * Customer 2: 44987654     (check OSC response)
 *
 * Usage: node scripts/createTestValaCustomer.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const db = require('../src/config/db');

const PASSWORD = '12345678';

const CUSTOMERS = [
  { email: 'test.vala1@example.com', firstName: 'Test1', lastName: 'Vala', phone: '+38344123456' },
  { email: 'test.vala2@example.com', firstName: 'Test2', lastName: 'Vala', phone: '44987654' },
];

async function upsertCustomer({ email, firstName, lastName, phone }) {
  const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);

  if (existing.rowCount > 0) {
    await db.query(
      `UPDATE users SET
        payment_status = 'paid',
        payment_date = NOW(),
        phone = $1,
        valaboterori_gift = FALSE,
        vala_email_sent = FALSE,
        vala_email_sent_at = NULL,
        vala_email_failed = FALSE,
        vala_email_failed_at = NULL,
        osc_gift_attempted = TRUE,
        osc_gift_attempted_at = NOW(),
        osc_gift_error = 'Request timed out (15s)',
        osc_transaction_id = NULL
      WHERE id = $2`,
      [phone, existing.rows[0].id]
    );
    console.log(`ℹ️  ${email} already exists (id: ${existing.rows[0].id}) — reset to paid + OSC failed.`);
  } else {
    const passwordHash = await bcrypt.hash(PASSWORD, 12);
    const res = await db.query(
      `INSERT INTO users
        (first_name, last_name, email, phone, password_hash, email_verified, role, payment_status, payment_date,
         osc_gift_attempted, osc_gift_attempted_at, osc_gift_error)
       VALUES ($1, $2, $3, $4, $5, TRUE, 'customer', 'paid', NOW(), TRUE, NOW(), 'Request timed out (15s)')
       RETURNING id`,
      [firstName, lastName, email, phone, passwordHash]
    );
    console.log(`✅ Created ${email} (id: ${res.rows[0].id})`);
  }
  console.log(`   Phone: ${phone} | osc_gift_error: Request timed out (15s)`);
}

async function run() {
  for (const c of CUSTOMERS) {
    await upsertCustomer(c);
  }

  console.log(`\n→ Open admin dashboard → find both users → OSC Recharge column shows ❌ + Retry button.`);
  console.log(`→ Click Retry on each — check if response is Mock (dev) or real OSC response (server).`);

  await db.pool.end();
}

run().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
