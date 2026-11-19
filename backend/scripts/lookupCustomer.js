#!/usr/bin/env node
/**
 * Customer Lookup Script
 *
 * Usage:
 *   node backend/scripts/lookupCustomer.js customer@email.com
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Pool } = require('pg');

const email = process.argv[2];

if (!email || !email.includes('@')) {
  console.error('Usage: node backend/scripts/lookupCustomer.js customer@email.com');
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
  // ── User info ─────────────────────────────────────────────────
  const { rows: users } = await pool.query(
    `SELECT id, first_name, last_name, email, phone, created_at,
            email_verified,
            -- Personal package
            payment_status, payment_amount, payment_date,
            ott_provisioned, ott_username,
            valaboterori_gift, valaboterori_gift_at,
            osc_gift_attempted, osc_transaction_id, osc_gift_error,
            -- Business package
            biz_payment_status, biz_payment_amount, biz_payment_date,
            biz_ott_provisioned, biz_ott_username,
            valaboterori_biz_gift, valaboterori_biz_gift_at,
            osc_biz_gift_attempted, osc_biz_transaction_id, osc_biz_gift_error
     FROM users WHERE LOWER(email) = LOWER($1)`,
    [email]
  );

  if (users.length === 0) {
    console.log(`\n❌ No customer found with email: ${email}`);
    await pool.end();
    return;
  }

  const u = users[0];
  const fmt = (cents) => cents ? `€${(cents / 100).toFixed(2)}` : '—';
  const dt  = (d) => d ? new Date(d).toLocaleString('sq-AL', { timeZone: 'Europe/Belgrade' }) : '—';

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  CUSTOMER INFO');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  ID:            ${u.id}`);
  console.log(`  Name:          ${u.first_name} ${u.last_name}`);
  console.log(`  Email:         ${u.email} ${u.email_verified ? '✅' : '⚠️  NOT VERIFIED'}`);
  console.log(`  Phone:         ${u.phone}`);
  console.log(`  Registered:    ${dt(u.created_at)}`);

  console.log('\n── PERSONAL PACKAGE (ValaBoterori) ─────────────────────');
  console.log(`  Payment:       ${u.payment_status} ${u.payment_amount ? fmt(u.payment_amount) : ''}`);
  if (u.payment_date) console.log(`  Paid at:       ${dt(u.payment_date)}`);
  console.log(`  OTT:           ${u.ott_provisioned ? `✅ provisioned (${u.ott_username})` : '⏳ not provisioned'}`);
  console.log(`  OSC gift:      ${u.osc_gift_attempted ? (u.valaboterori_gift ? `✅ done (txn: ${u.osc_transaction_id})` : `❌ failed — ${u.osc_gift_error || 'unknown error'}`) : '⏳ not attempted'}`);

  console.log('\n── BUSINESS PACKAGE (ValaBoterori_BIZ) ─────────────────');
  console.log(`  Payment:       ${u.biz_payment_status} ${u.biz_payment_amount ? fmt(u.biz_payment_amount) : ''}`);
  if (u.biz_payment_date) console.log(`  Paid at:       ${dt(u.biz_payment_date)}`);
  console.log(`  OTT:           ${u.biz_ott_provisioned ? `✅ provisioned (${u.biz_ott_username})` : '⏳ not provisioned'}`);
  console.log(`  OSC gift:      ${u.osc_biz_gift_attempted ? (u.valaboterori_biz_gift ? `✅ done (txn: ${u.osc_biz_transaction_id})` : `❌ failed — ${u.osc_biz_gift_error || 'unknown error'}`) : '⏳ not attempted'}`);

  // ── Payment history ───────────────────────────────────────────
  const { rows: payments } = await pool.query(
    `SELECT id, order_reference, amount, status, package_type,
            bank_transaction_id, bank_response, created_at
     FROM payments WHERE user_id = $1 ORDER BY created_at DESC`,
    [u.id]
  );

  if (payments.length > 0) {
    console.log('\n── PAYMENT HISTORY ─────────────────────────────────────');
    for (const p of payments) {
      const br = p.bank_response || {};
      const errMsg = br.ErrMsg || br.errmsg || '';
      const retCode = br.ProcReturnCode || br.procreturncode || '';
      const mdStatus = br.mdStatus || br.mdstatus || '';
      console.log(`\n  [${p.status.toUpperCase()}] ${p.package_type} — ${fmt(p.amount)} — ${dt(p.created_at)}`);
      console.log(`    Order ref:   ${p.order_reference}`);
      if (p.bank_transaction_id) console.log(`    TEB txn ID:  ${p.bank_transaction_id}`);
      if (retCode)  console.log(`    ReturnCode:  ${retCode}`);
      if (mdStatus) console.log(`    mdStatus:    ${mdStatus}`);
      if (errMsg)   console.log(`    Error:       ${errMsg}`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════\n');
  await pool.end();
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  pool.end();
  process.exit(1);
});
