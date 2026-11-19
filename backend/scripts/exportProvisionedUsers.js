#!/usr/bin/env node
/**
 * Export all provisioned users (personal and/or business) as CSV and send to admin.
 * Includes: Name, Surname, Phone, Email, Personal Username, Biz Username, Registration Date.
 *
 * Usage:
 *   node backend/scripts/exportProvisionedUsers.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Pool } = require('pg');
const nodemailer = require('nodemailer');

// 🔒 Internal recipients hidden — set REPORT_RECIPIENTS in .env (comma-separated)
const RECIPIENTS = (process.env.REPORT_RECIPIENTS || '').split(',').map((e) => e.trim()).filter(Boolean);

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

function buildCsv(rows) {
  const escape = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headers = [
    'First Name',
    'Last Name',
    'Phone',
    'Email',
    'Personal Username',
    'Personal Package',
    'Biz Username',
    'Biz Package',
    'Registered At',
  ];

  const lines = [
    headers.join(','),
    ...rows.map((r) => [
      r.first_name,
      r.last_name,
      r.phone,
      r.email,
      r.ott_username,
      r.ott_provisioned ? 'Active' : '',
      r.biz_ott_username,
      r.biz_ott_provisioned ? 'Active' : '',
      r.created_at ? new Date(r.created_at).toISOString().slice(0, 19).replace('T', ' ') : '',
    ].map(escape).join(',')),
  ];

  return lines.join('\n');
}

async function main() {
  const { rows } = await pool.query(`
    SELECT
      first_name,
      last_name,
      phone,
      email,
      ott_username,
      ott_provisioned,
      biz_ott_username,
      biz_ott_provisioned,
      created_at
    FROM users
    WHERE role = 'customer'
      AND (ott_provisioned = TRUE OR biz_ott_provisioned = TRUE)
    ORDER BY created_at DESC
  `);

  if (rows.length === 0) {
    console.log('No provisioned users found. Nothing to send.');
    await pool.end();
    return;
  }

  const personalCount = rows.filter((r) => r.ott_provisioned).length;
  const bizCount = rows.filter((r) => r.biz_ott_provisioned).length;
  const bothCount = rows.filter((r) => r.ott_provisioned && r.biz_ott_provisioned).length;

  console.log(`Found ${rows.length} provisioned user(s):`);
  console.log(`  Personal: ${personalCount}`);
  console.log(`  Business: ${bizCount}`);
  console.log(`  Both:     ${bothCount}`);
  console.log('Building CSV...');

  const csv = buildCsv(rows);
  const today = new Date().toISOString().slice(0, 10);
  const filename = `provisioned_users_${today}.csv`;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    ignoreTLS: true,
    requireTLS: false,
    tls: { rejectUnauthorized: false },
    ...(process.env.SMTP_USER && process.env.SMTP_PASSWORD
      ? { auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } }
      : {}),
  });

  const FROM = process.env.EMAIL_FROM || '"Vala Botërori" <noreply@worldcuptv.com>';

  await transporter.sendMail({
    from: FROM,
    to: RECIPIENTS.join(', '),
    subject: `Provisioned Users Report – ${today} (${rows.length} total | Personal: ${personalCount} | BIZ: ${bizCount})`,
    text: [
      `Hello,`,
      ``,
      `Attached is the provisioned users report as of ${today}.`,
      ``,
      `  Total provisioned : ${rows.length}`,
      `  Personal package  : ${personalCount}`,
      `  Business package  : ${bizCount}`,
      `  Both packages     : ${bothCount}`,
      ``,
      `Best,`,
      `Vala Botërori System`,
    ].join('\n'),
    attachments: [
      {
        filename,
        content: csv,
        contentType: 'text/csv',
      },
    ],
  });

  console.log(`✅ Email sent to ${RECIPIENTS.join(', ')} with attachment: ${filename}`);
  await pool.end();
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
