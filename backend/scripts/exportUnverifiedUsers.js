#!/usr/bin/env node
/**
 * Export unverified users as CSV and send to admin email.
 *
 * Usage:
 *   node backend/scripts/exportUnverifiedUsers.js
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

  const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Registered At'];
  const lines = [
    headers.join(','),
    ...rows.map((r) => [
      r.first_name,
      r.last_name,
      r.email,
      r.phone,
      r.created_at ? new Date(r.created_at).toISOString() : '',
    ].map(escape).join(',')),
  ];
  return lines.join('\n');
}

async function main() {
  const { rows } = await pool.query(`
    SELECT first_name, last_name, email, phone, created_at
    FROM users
    WHERE email_verified = FALSE
      AND created_at >= NOW() - INTERVAL '24 hours'
    ORDER BY created_at DESC
  `);

  if (rows.length === 0) {
    console.log('No unverified users in the last 24 hours. Nothing to send.');
    await pool.end();
    return;
  }

  console.log(`Found ${rows.length} unverified user(s) in the last 24 hours. Building CSV...`);

  const csv = buildCsv(rows);
  const today = new Date().toISOString().slice(0, 10);
  const filename = `unverified_users_${today}.csv`;

  // Build transporter (same config as emailService.js)
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
    subject: `Unverified Users Report – ${today} (${rows.length} users – last 24h)`,
    text: `Hello,\n\nAttached is the list of ${rows.length} user(s) who registered in the last 24 hours but have not yet verified their email (as of ${today}).\n\nBest,\nVala Botërori System`,
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
