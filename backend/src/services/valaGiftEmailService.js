/**
 * VALA Gift Email Service
 * Sends paid VALA numbers as XML email attachment to customer care.
 * Completely independent from OSC/Recharge SOAP gifting (see oscService.js).
 */

const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const { isValaNumber } = require('./valaGiftService');
const { sendEmailWithAttachment, sendHeartbeatEmail } = require('./emailService');

const VALA_GIFT_EMAIL = process.env.VALA_GIFT_EMAIL;
const VALA_GIFT_HEARTBEAT_EMAIL = process.env.VALA_GIFT_HEARTBEAT_EMAIL;
const VALA_GIFT_LOG_PATH = process.env.VALA_GIFT_LOG_PATH || '/var/log/vala-gifts';
const VALA_GIFT_ENABLED = process.env.VALA_GIFT_ENABLED === 'true';

// ── Logging helpers ─────────────────────────────────────────────────────────

// Returns ISO week string, e.g. "2026-W17"
function weekStr(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

// Email cron log  →  /var/log/vala-gifts/email_gifts_YYYY-Www.log
function writeLog(message) {
  try {
    const now = new Date();
    const logFile = path.join(VALA_GIFT_LOG_PATH, `email_gifts_${weekStr(now)}.log`);
    const line = `[${now.toISOString()}] ${message}\n`;
    fs.mkdirSync(VALA_GIFT_LOG_PATH, { recursive: true });
    fs.appendFileSync(logFile, line);
    console.log(line.trim());
  } catch (err) {
    console.error('Failed to write email log:', err.message);
  }
}

// OSC/Recharge log  →  /var/log/vala-gifts/osc_gifts_YYYY-Www.log
function writeOscLog(message) {
  try {
    const now = new Date();
    const logFile = path.join(VALA_GIFT_LOG_PATH, `osc_gifts_${weekStr(now)}.log`);
    const line = `[${now.toISOString()}] ${message}\n`;
    fs.mkdirSync(VALA_GIFT_LOG_PATH, { recursive: true });
    fs.appendFileSync(logFile, line);
    console.log(line.trim());
  } catch (err) {
    console.error('Failed to write OSC log:', err.message);
  }
}

// ── CSV builder ─────────────────────────────────────────────────────────────

function escapeCsv(str) {
  if (!str) return '';
  const s = String(str);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function normalizeCsvPhone(phone) {
  if (!phone) return '';
  const p = phone.replace(/[\s\-\(\)]/g, '');
  if (p.startsWith('+383')) return '0' + p.slice(4);
  return p;
}

function buildCsv(entries) {
  const header = 'Phone,Name,Email,PackageName,PaymentDate';
  const rows = entries.map(e =>
    [normalizeCsvPhone(e.phone), e.name, e.email, e.packageName, e.paymentDate].map(escapeCsv).join(',')
  );
  return [header, ...rows].join('\n') + '\n';
}

// ── Query helpers ───────────────────────────────────────────────────────────

async function getUnsentPersonal(timeFilter = true, includeFailed = false) {
  const timeClause = timeFilter ? `AND payment_date >= NOW() - INTERVAL '12 hours'` : '';
  const failedClause = includeFailed ? '' : 'AND vala_email_failed = false';
  const result = await db.query(`
    SELECT id, phone, email, first_name, last_name, payment_date
    FROM users
    WHERE payment_status = 'paid'
      AND vala_email_sent = false
      AND (valaboterori_gift = false OR valaboterori_gift IS NULL)
      ${failedClause}
      ${timeClause}
  `);
  return result.rows.filter(u => isValaNumber(u.phone));
}

async function getUnsentBusiness(timeFilter = true, includeFailed = false) {
  const timeClause = timeFilter ? `AND biz_payment_date >= NOW() - INTERVAL '12 hours'` : '';
  const failedClause = includeFailed ? '' : 'AND vala_biz_email_failed = false';
  const result = await db.query(`
    SELECT id, phone, email, first_name, last_name, biz_payment_date AS payment_date
    FROM users
    WHERE biz_payment_status = 'paid'
      AND vala_biz_email_sent = false
      AND (valaboterori_biz_gift = false OR valaboterori_biz_gift IS NULL)
      ${failedClause}
      ${timeClause}
  `);
  return result.rows.filter(u => isValaNumber(u.phone));
}

// ── Mark helpers ────────────────────────────────────────────────────────────

async function markPersonalSent(ids) {
  if (ids.length === 0) return;
  await db.query(
    `UPDATE users SET vala_email_sent = true, vala_email_sent_at = NOW(), vala_email_failed = false, vala_email_failed_at = NULL WHERE id = ANY($1)`,
    [ids]
  );
}

async function markBusinessSent(ids) {
  if (ids.length === 0) return;
  await db.query(
    `UPDATE users SET vala_biz_email_sent = true, vala_biz_email_sent_at = NOW(), vala_biz_email_failed = false, vala_biz_email_failed_at = NULL WHERE id = ANY($1)`,
    [ids]
  );
}

async function markPersonalFailed(ids) {
  if (ids.length === 0) return;
  await db.query(
    `UPDATE users SET vala_email_failed = true, vala_email_failed_at = NOW() WHERE id = ANY($1)`,
    [ids]
  );
}

async function markBusinessFailed(ids) {
  if (ids.length === 0) return;
  await db.query(
    `UPDATE users SET vala_biz_email_failed = true, vala_biz_email_failed_at = NOW() WHERE id = ANY($1)`,
    [ids]
  );
}

// ── Core send logic (shared by cron + bulk resend) ──────────────────────────

async function sendValaGiftEmail(personalRows, bizRows, logPrefix) {
  const entries = [];

  for (const row of personalRows) {
    entries.push({
      phone: row.phone,
      name: `${row.first_name} ${row.last_name}`,
      email: row.email,
      packageName: 'Personal',
      paymentDate: row.payment_date ? new Date(row.payment_date).toISOString() : '',
    });
  }

  for (const row of bizRows) {
    entries.push({
      phone: row.phone,
      name: `${row.first_name} ${row.last_name}`,
      email: row.email,
      packageName: 'Business',
      paymentDate: row.payment_date ? new Date(row.payment_date).toISOString() : '',
    });
  }

  const csv = buildCsv(entries);
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toISOString().slice(11, 16).replace(':', '');
  const filename = `vala_gifts_${dateStr}_${timeStr}.csv`;

  const personalIds = personalRows.map(r => r.id);
  const bizIds = bizRows.map(r => r.id);

  try {
    await sendEmailWithAttachment(
      VALA_GIFT_EMAIL,
      `VALA Gift Numbers - ${dateStr} ${now.toISOString().slice(11, 16)}`,
      `Attached: ${entries.length} VALA numbers for gifting.`,
      { filename, content: csv, contentType: 'text/csv' }
    );

    await markPersonalSent(personalIds);
    await markBusinessSent(bizIds);

    writeLog(`${logPrefix} | Sent ${entries.length} entries | to: ${VALA_GIFT_EMAIL} | personal: ${personalRows.length}, business: ${bizRows.length}`);
    return { success: true, count: entries.length };
  } catch (error) {
    await markPersonalFailed(personalIds);
    await markBusinessFailed(bizIds);

    writeLog(`${logPrefix}_FAILED | ${entries.length} entries failed | error: ${error.message}`);
    return { success: false, count: entries.length, error: error.message };
  }
}

// ── Public functions ────────────────────────────────────────────────────────

/**
 * Cron: export new VALA numbers (last 12 hours) as XML email
 */
async function exportValaGiftsByEmail() {
  if (!VALA_GIFT_ENABLED) {
    console.log('📧 VALA gift email disabled (dev mode)');
    return { success: true, count: 0 };
  }

  if (!VALA_GIFT_EMAIL) {
    console.error('❌ VALA_GIFT_EMAIL not configured');
    return { success: false, error: 'VALA_GIFT_EMAIL not configured' };
  }

  const personalRows = await getUnsentPersonal(true);
  const bizRows = await getUnsentBusiness(true);

  if (personalRows.length === 0 && bizRows.length === 0) {
    writeLog('EMAIL_CRON | No new numbers to email — sending heartbeat');
    try {
      await sendHeartbeatEmail(
        VALA_GIFT_HEARTBEAT_EMAIL || VALA_GIFT_EMAIL,
        'Vala Boterori Cron Job — Heartbeat',
        `Hi from Vala Boterori Cron Job!\n\nJust letting you know the cron is working.\nNo new VALA numbers to send this run.\n\nTimestamp: ${new Date().toISOString()}`
      );
    } catch (err) {
      writeLog(`EMAIL_CRON_HEARTBEAT_FAILED | error: ${err.message}`);
    }
    return { success: true, count: 0 };
  }

  return sendValaGiftEmail(personalRows, bizRows, 'EMAIL_CRON');
}

/**
 * Admin: bulk resend ALL failed/unsent numbers (no time filter)
 */
async function resendAllFailedValaEmails(adminEmail) {
  if (!VALA_GIFT_ENABLED) {
    return { success: false, count: 0, error: 'VALA gift email disabled' };
  }

  if (!VALA_GIFT_EMAIL) {
    return { success: false, count: 0, error: 'VALA_GIFT_EMAIL not configured' };
  }

  // No time filter + include failed — picks up ALL unsent numbers
  const personalRows = await getUnsentPersonal(false, true);
  const bizRows = await getUnsentBusiness(false, true);

  if (personalRows.length === 0 && bizRows.length === 0) {
    writeLog(`EMAIL_MANUAL_BULK | by: ${adminEmail} | No failed numbers to resend`);
    return { success: true, count: 0, message: 'No failed numbers to resend' };
  }

  const result = await sendValaGiftEmail(personalRows, bizRows, `EMAIL_MANUAL_BULK | by: ${adminEmail}`);
  return result;
}

module.exports = {
  exportValaGiftsByEmail,
  resendAllFailedValaEmails,
  writeOscLog,
};
