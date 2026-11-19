#!/usr/bin/env node

/**
 * VALA Gift Email Cron
 *
 * Standalone script — runs twice a day via system cron (8:00 and 18:00).
 * Collects all paid VALA numbers from the last 12 hours and sends
 * an XML email attachment to customer care.
 *
 * Usage:
 *   node backend/scripts/valaGiftEmailCron.js
 *
 * Crontab:
 *   0 3,15 * * * node /path/to/backend/scripts/valaGiftEmailCron.js >> /var/log/vala-gifts/cron.log 2>&1
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { exportValaGiftsByEmail } = require('../src/services/valaGiftEmailService');

exportValaGiftsByEmail()
  .then((result) => {
    console.log(`[${new Date().toISOString()}] Cron finished:`, result);
    process.exit(0);
  })
  .catch((err) => {
    console.error(`[${new Date().toISOString()}] Cron error:`, err.message);
    process.exit(1);
  });
