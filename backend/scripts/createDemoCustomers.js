/**
 * Create 8 demo customers for operator training session.
 *
 * Covers every possible state visible in the Admin Dashboard:
 *   1. customer1@alfa.com  — Unpaid / fresh signup (VALA number)
 *   2. customer2@alfa.com  — Paid Personal + OTT OK  (non-VALA → OSC N/A)
 *   3. customer3@alfa.com  — Paid Personal + OTT OK  + VALA + OSC ✅ Success
 *   4. customer4@alfa.com  — Paid Personal + OTT ❌ NOT provisioned (Wifi button) + VALA OSC Pending
 *   5. customer5@alfa.com  — Paid Personal + OTT OK  + VALA + OSC ❌ transient fail (Retry button)
 *   6. customer6@alfa.com  — Paid Personal + OTT OK  + VALA + OSC ❌ definitive fail (no Retry)
 *   7. customer7@alfa.com  — Paid BOTH packages + both OTT OK + VALA + Personal OSC OK + BIZ OSC transient
 *   8. customer8@alfa.com  — Paid Personal + OTT OK  + VALA + OSC ✅ + email also sent to CRM
 *
 * Usage:
 *   cd backend
 *   node scripts/createDemoCustomers.js
 *
 * To reset all demo customers and start fresh, run again — it upserts by email.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const db = require('../src/config/db');

const PASSWORD = '12345678';

async function hash() {
  return bcrypt.hash(PASSWORD, 12);
}

async function upsert(email, fields) {
  const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rowCount > 0) {
    const id = existing.rows[0].id;
    const keys = Object.keys(fields);
    const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
    await db.query(
      `UPDATE users SET ${setClause} WHERE id = $${keys.length + 1}`,
      [...Object.values(fields), id]
    );
    return { id, created: false };
  } else {
    const cols = Object.keys(fields).join(', ');
    const placeholders = Object.keys(fields).map((_, i) => `$${i + 1}`).join(', ');
    const res = await db.query(
      `INSERT INTO users (${cols}) VALUES (${placeholders}) RETURNING id`,
      Object.values(fields)
    );
    return { id: res.rows[0].id, created: true };
  }
}

async function run() {
  const pw = await hash();

  const customers = [
    // ─── 1. Fresh signup — unpaid ───────────────────────────────────────────
    {
      label: '1 — Unpaid / fresh signup (VALA)',
      email: 'customer1@alfa.com',
      fields: {
        first_name: 'Arben', last_name: 'Krasniqi',
        email: 'customer1@alfa.com',
        phone: '044100001',
        password_hash: pw,
        email_verified: true,
        role: 'customer',
        payment_status: 'unpaid',
        biz_payment_status: 'unpaid',
        valaboterori_gift: false, valaboterori_biz_gift: false,
        osc_gift_attempted: false, osc_biz_gift_attempted: false,
        vala_email_sent: false, vala_biz_email_sent: false,
      },
    },

    // ─── 2. Paid Personal + OTT OK — non-VALA ──────────────────────────────
    {
      label: '2 — Paid Personal + OTT OK (non-VALA → OSC N/A)',
      email: 'customer2@alfa.com',
      fields: {
        first_name: 'Blerim', last_name: 'Hoxha',
        email: 'customer2@alfa.com',
        phone: '049200002',
        password_hash: pw,
        email_verified: true,
        role: 'customer',
        payment_status: 'paid', payment_date: new Date(), payment_amount: 3499,
        ott_username: 'VB_blerim2026', ott_password: 'Xk9#mP2z', ott_provisioned: true,
        biz_payment_status: 'unpaid',
        valaboterori_gift: false, osc_gift_attempted: false,
        vala_email_sent: false,
      },
    },

    // ─── 3. Paid Personal + OTT OK + VALA + OSC ✅ ─────────────────────────
    {
      label: '3 — Paid Personal + OTT OK + VALA + OSC ✅ Success',
      email: 'customer3@alfa.com',
      fields: {
        first_name: 'Donika', last_name: 'Berisha',
        email: 'customer3@alfa.com',
        phone: '044300003',
        password_hash: pw,
        email_verified: true,
        role: 'customer',
        payment_status: 'paid', payment_date: new Date(), payment_amount: 3499,
        ott_username: 'VB_donika2026', ott_password: 'Rq7$vN5w', ott_provisioned: true,
        biz_payment_status: 'unpaid',
        valaboterori_gift: true, valaboterori_gift_at: new Date(),
        osc_gift_attempted: true, osc_gift_attempted_at: new Date(),
        osc_gift_error: null, osc_transaction_id: '149218300',
        vala_email_sent: false,
      },
    },

    // ─── 4. Paid Personal + OTT NOT provisioned (Wifi button!) ─────────────
    {
      label: '4 — Paid Personal + OTT ❌ not provisioned (Wifi button visible)',
      email: 'customer4@alfa.com',
      fields: {
        first_name: 'Faton', last_name: 'Gashi',
        email: 'customer4@alfa.com',
        phone: '045400004',
        password_hash: pw,
        email_verified: true,
        role: 'customer',
        payment_status: 'paid', payment_date: new Date(), payment_amount: 3499,
        ott_provisioned: false,
        biz_payment_status: 'unpaid',
        valaboterori_gift: false,
        osc_gift_attempted: false,
        vala_email_sent: false,
      },
    },

    // ─── 5. Paid Personal + OTT OK + VALA + OSC ❌ transient (Retry button) ─
    {
      label: '5 — Paid Personal + OTT OK + VALA + OSC ❌ transient fail (Retry visible)',
      email: 'customer5@alfa.com',
      fields: {
        first_name: 'Genta', last_name: 'Morina',
        email: 'customer5@alfa.com',
        phone: '044500005',
        password_hash: pw,
        email_verified: true,
        role: 'customer',
        payment_status: 'paid', payment_date: new Date(), payment_amount: 3499,
        ott_username: 'VB_genta2026', ott_password: 'Lp4!qB8n', ott_provisioned: true,
        biz_payment_status: 'unpaid',
        valaboterori_gift: false,
        osc_gift_attempted: true, osc_gift_attempted_at: new Date(),
        osc_gift_error: 'Request timed out (15s)',
        osc_transaction_id: null,
        vala_email_sent: false,
      },
    },

    // ─── 6. Paid Personal + OTT OK + VALA + OSC ❌ definitive (no Retry) ───
    {
      label: '6 — Paid Personal + OTT OK + VALA + OSC ❌ definitive [OSC] (no Retry)',
      email: 'customer6@alfa.com',
      fields: {
        first_name: 'Hana', last_name: 'Bajrami',
        email: 'customer6@alfa.com',
        phone: '046600006',
        password_hash: pw,
        email_verified: true,
        role: 'customer',
        payment_status: 'paid', payment_date: new Date(), payment_amount: 3499,
        ott_username: 'VB_hana2026', ott_password: 'Wm3@kT6j', ott_provisioned: true,
        biz_payment_status: 'unpaid',
        valaboterori_gift: false,
        osc_gift_attempted: true, osc_gift_attempted_at: new Date(),
        osc_gift_error: '[OSC] Number not eligible for gift',
        osc_transaction_id: null,
        vala_email_sent: false,
      },
    },

    // ─── 7. Paid BOTH packages + VALA + Personal OSC OK + BIZ OSC transient ─
    {
      label: '7 — Paid BOTH packages + VALA + Personal OSC ✅ + BIZ OSC ❌ transient',
      email: 'customer7@alfa.com',
      fields: {
        first_name: 'Ilir', last_name: 'Kelmendi',
        email: 'customer7@alfa.com',
        phone: '044700007',
        password_hash: pw,
        email_verified: true,
        role: 'customer',
        // Personal
        payment_status: 'paid', payment_date: new Date(), payment_amount: 3499,
        ott_username: 'VB_ilir2026', ott_password: 'Zt5#fX9c', ott_provisioned: true,
        valaboterori_gift: true, valaboterori_gift_at: new Date(),
        osc_gift_attempted: true, osc_gift_attempted_at: new Date(),
        osc_gift_error: null, osc_transaction_id: '149218400',
        vala_email_sent: false,
        // BIZ
        biz_payment_status: 'paid', biz_payment_date: new Date(), biz_payment_amount: 3499,
        biz_ott_username: 'VBB_ilir2026', biz_ott_password: 'Ht6$bR3m', biz_ott_provisioned: true,
        valaboterori_biz_gift: false,
        osc_biz_gift_attempted: true, osc_biz_gift_attempted_at: new Date(),
        osc_biz_gift_error: 'Connection refused',
        osc_biz_transaction_id: null,
        vala_biz_email_sent: false,
      },
    },

    // ─── 8. Paid Personal + OTT OK + VALA + OSC ✅ + CRM email also sent ───
    {
      label: '8 — Paid Personal + OTT OK + VALA + OSC ✅ + CRM email sent',
      email: 'customer8@alfa.com',
      fields: {
        first_name: 'Jeta', last_name: 'Syla',
        email: 'customer8@alfa.com',
        phone: '044800008',
        password_hash: pw,
        email_verified: true,
        role: 'customer',
        payment_status: 'paid', payment_date: new Date(), payment_amount: 3499,
        ott_username: 'VB_jeta2026', ott_password: 'Np2@vD7k', ott_provisioned: true,
        biz_payment_status: 'unpaid',
        valaboterori_gift: true, valaboterori_gift_at: new Date(),
        osc_gift_attempted: true, osc_gift_attempted_at: new Date(),
        osc_gift_error: null, osc_transaction_id: '149218500',
        // Email also sent manually (edge case: OSC handled it but email cron ran before OSC)
        vala_email_sent: true, vala_email_sent_at: new Date(),
      },
    },
  ];

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Creating demo customers for operator training session');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  for (const { label, email, fields } of customers) {
    const { id, created } = await upsert(email, fields);
    const icon = created ? '✅ Created' : 'ℹ️  Updated';
    console.log(`${icon}  #${id}  ${email}  (${label})`);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  All accounts: password = 12345678');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('  customer1@alfa.com  →  Unpaid (fresh signup, VALA 044)');
  console.log('  customer2@alfa.com  →  Paid + OTT OK, non-VALA (049) — OSC N/A');
  console.log('  customer3@alfa.com  →  Paid + OTT OK, VALA 044 — OSC ✅');
  console.log('  customer4@alfa.com  →  Paid + OTT NOT done (Wifi button!) VALA 045');
  console.log('  customer5@alfa.com  →  Paid + OTT OK, VALA 044 — OSC ❌ timeout (Retry button)');
  console.log('  customer6@alfa.com  →  Paid + OTT OK, VALA 046 — OSC ❌ [OSC] definitive (no Retry)');
  console.log('  customer7@alfa.com  →  Paid BOTH packages, VALA 044 — Personal OSC ✅, BIZ OSC ❌ (Retry)');
  console.log('  customer8@alfa.com  →  Paid + OTT OK, VALA 044 — OSC ✅ + CRM email sent\n');

  await db.pool.end();
}

run().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
