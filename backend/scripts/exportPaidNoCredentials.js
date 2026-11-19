#!/usr/bin/env node
/**
 * Find users who have paid but do NOT have OTT credentials yet (personal or BIZ),
 * build a CSV and send it to the admin email.
 *
 * Usage:
 *   node backend/scripts/exportPaidNoCredentials.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Pool } = require('pg');
const nodemailer = require('nodemailer');

const RECIPIENT = process.env.REPORT_RECIPIENT; // 🔒 internal recipient hidden — set in .env

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
    'ID', 'First Name', 'Last Name', 'Email', 'Phone',
    'Personal Payment Status', 'Personal Provisioned',
    'BIZ Payment Status', 'BIZ Provisioned',
    'Registered At',
  ];

  const lines = [
    headers.join(','),
    ...rows.map((r) => [
      r.id,
      r.first_name,
      r.last_name,
      r.email,
      r.phone,
      r.payment_status,
      r.ott_provisioned,
      r.biz_payment_status,
      r.biz_ott_provisioned,
      r.created_at ? new Date(r.created_at).toISOString() : '',
    ].map(escape).join(',')),
  ];

  return lines.join('\n');
}

async function main() {
  const { rows } = await pool.query(`
    SELECT
      id, first_name, last_name, email, phone,
      payment_status, ott_provisioned,
      biz_payment_status, biz_ott_provisioned,
      created_at
    FROM users
    WHERE
      (payment_status = 'paid' AND ott_provisioned = FALSE)
      OR
      (biz_payment_status = 'paid' AND biz_ott_provisioned = FALSE)
    ORDER BY created_at DESC
  `);

  if (rows.length === 0) {
    console.log('✅ No users found with paid status and missing credentials.');
    await pool.end();
    return;
  }

  console.log(`Found ${rows.length} user(s) with missing credentials. Building CSV...`);

  const csv = buildCsv(rows);
  const today = new Date().toISOString().slice(0, 10);
  const filename = `paid_no_credentials_${today}.csv`;

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
    to: RECIPIENT,
    subject: `Paid Users – Missing Credentials Report – ${today} (${rows.length} user(s))`,
    text: `Hello,\n\nAttached is the list of ${rows.length} user(s) who have completed payment but have not yet received OTT credentials (personal or BIZ), as of ${today}.\n\nPlease investigate and provision them manually if needed.\n\nBest,\nVala Botërori System`,
    attachments: [
      {
        filename,
        content: csv,
        contentType: 'text/csv',
      },
    ],
  });

  console.log(`✅ Email sent to ${RECIPIENT} with attachment: ${filename}`);
  await pool.end();
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
