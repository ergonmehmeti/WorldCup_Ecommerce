#!/usr/bin/env node
/**
 * Lookup payments by phone number + show DB age (to detect resets).
 *
 * Usage:
 *   node backend/scripts/fixOscGift.js 044123456
 *   node backend/scripts/fixOscGift.js +38344123456
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Pool } = require('pg');

const phone = process.argv[2];

if (!phone) {
  console.error('Usage: node backend/scripts/fixOscGift.js <phone>');
  process.exit(1);
}

const ADMIN_EMAIL = process.env.ADMIN_EMAIL; // 🔒 real admin account hidden — set in .env

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

function normalizePhone(p) {
  p = p.replace(/\s+/g, '');
  if (p.startsWith('+383')) p = p.slice(4);
  if (p.startsWith('383'))  p = p.slice(3);
  if (p.startsWith('0'))    p = p.slice(1);
  return p;
}

const fmt = (cents) => cents ? `€${(cents / 100).toFixed(2)}` : '—';
const dt  = (d) => d ? new Date(d).toLocaleString('sq-AL', { timeZone: 'Europe/Belgrade' }) : '—';

async function main() {
  const normalized = normalizePhone(phone);

  // ── Admin account age (DB reset detection) ────────────────────
  const { rows: adminRows } = await pool.query(
    `SELECT id, created_at FROM users WHERE LOWER(email) = LOWER($1)`,
    [ADMIN_EMAIL]
  );

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  DB AGE CHECK');
  console.log('═══════════════════════════════════════════════════════');
  if (adminRows.length > 0) {
    console.log(`  ${ADMIN_EMAIL}`);
    console.log(`  Created: ${dt(adminRows[0].created_at)}`);
    console.log(`  (If this date is recent, the DB was likely reset around that time)`);
  } else {
    console.log(`  ⚠️  Admin account not found: ${ADMIN_EMAIL}`);
  }

  // ── User lookup by phone ──────────────────────────────────────
  const { rows: users } = await pool.query(
    `SELECT id, first_name, last_name, email, phone, created_at,
            payment_status, payment_amount,
            biz_payment_status, biz_payment_amount,
            ott_provisioned, biz_ott_provisioned,
            valaboterori_gift, valaboterori_biz_gift,
            osc_gift_attempted, osc_transaction_id, osc_gift_error,
            osc_biz_gift_attempted, osc_biz_transaction_id, osc_biz_gift_error
     FROM users
     WHERE REGEXP_REPLACE(phone, '^(\\+383|383|0)', '') = $1`,
    [normalized]
  );

  console.log('\n═══════════════════════════════════════════════════════');
  console.log(`  PHONE LOOKUP: ${phone} → ${normalized}`);
  console.log('═══════════════════════════════════════════════════════');

  if (users.length === 0) {
    console.log(`  ❌ No user found with phone: ${phone}`);
    console.log('     (Record may have been lost in a DB reset)\n');
    await pool.end();
    return;
  }

  const u = users[0];
  console.log(`  ID:          ${u.id}`);
  console.log(`  Name:        ${u.first_name} ${u.last_name}`);
  console.log(`  Email:       ${u.email}`);
  console.log(`  Phone (DB):  ${u.phone}`);
  console.log(`  Registered:  ${dt(u.created_at)}`);

  console.log('\n── PERSONAL ─────────────────────────────────────────────');
  console.log(`  Payment:     ${u.payment_status} ${fmt(u.payment_amount)}`);
  console.log(`  OTT:         ${u.ott_provisioned ? '✅' : '⏳'}`);
  console.log(`  OSC gift:    ${u.osc_gift_attempted ? (u.valaboterori_gift ? `✅ txn: ${u.osc_transaction_id}` : `❌ ${u.osc_gift_error}`) : '⏳ not attempted'}`);

  console.log('\n── BUSINESS ─────────────────────────────────────────────');
  console.log(`  Payment:     ${u.biz_payment_status} ${fmt(u.biz_payment_amount)}`);
  console.log(`  OTT:         ${u.biz_ott_provisioned ? '✅' : '⏳'}`);
  console.log(`  OSC gift:    ${u.osc_biz_gift_attempted ? (u.valaboterori_biz_gift ? `✅ txn: ${u.osc_biz_transaction_id}` : `❌ ${u.osc_biz_gift_error}`) : '⏳ not attempted'}`);

  // ── Payment history ───────────────────────────────────────────
  const { rows: payments } = await pool.query(
    `SELECT id, order_reference, amount, status, package_type,
            bank_transaction_id, bank_response, created_at
     FROM payments WHERE user_id = $1 ORDER BY created_at DESC`,
    [u.id]
  );

  if (payments.length > 0) {
    console.log('\n── PAYMENT HISTORY ──────────────────────────────────────');
    for (const p of payments) {
      const br = p.bank_response || {};
      const errMsg   = br.ErrMsg || br.errmsg || '';
      const retCode  = br.ProcReturnCode || br.procreturncode || '';
      const mdStatus = br.mdStatus || br.mdstatus || '';
      console.log(`\n  [${p.status.toUpperCase()}] ${p.package_type} — ${fmt(p.amount)} — ${dt(p.created_at)}`);
      console.log(`    Order ref:  ${p.order_reference}`);
      if (p.bank_transaction_id) console.log(`    TEB txn ID: ${p.bank_transaction_id}`);
      if (retCode)  console.log(`    ReturnCode: ${retCode}`);
      if (mdStatus) console.log(`    mdStatus:   ${mdStatus}`);
      if (errMsg)   console.log(`    Error:      ${errMsg}`);
    }
  } else {
    console.log('\n  ℹ️  No payment records found.');
  }

  console.log('\n═══════════════════════════════════════════════════════\n');
  await pool.end();
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  pool.end();
  process.exit(1);
});
