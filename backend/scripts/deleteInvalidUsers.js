#!/usr/bin/env node
/**
 * Delete Invalid / Malicious Users Script
 *
 * Finds and deletes users whose first_name or last_name contain
 * injection characters: < > { } $ @ # % (HTML, XSS, SSTI payloads).
 *
 * Usage:
 *   node backend/scripts/deleteInvalidUsers.js          — preview only (dry run)
 *   node backend/scripts/deleteInvalidUsers.js --delete — actually delete
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Pool } = require('pg');

const DRY_RUN = !process.argv.includes('--delete');

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Characters that have no place in a legitimate person's name
const INVALID_NAME_REGEX = /[<>{}\$#%\|\\\/\*\^=\[\]]/;

async function main() {
  console.log('\n══════════════════════════════════════════');
  console.log('  Delete Invalid Users Script');
  console.log(`  Mode: ${DRY_RUN ? '🔍 DRY RUN (preview only)' : '🗑️  DELETE'}`);
  console.log('══════════════════════════════════════════\n');

  // Fetch all users
  const { rows: users } = await pool.query(
    `SELECT id, first_name, last_name, email, email_verified, created_at FROM users ORDER BY created_at DESC`
  );

  const invalid = users.filter(u =>
    INVALID_NAME_REGEX.test(u.first_name) || INVALID_NAME_REGEX.test(u.last_name)
  );

  if (invalid.length === 0) {
    console.log('✅ No invalid users found. Database is clean.\n');
    await pool.end();
    return;
  }

  console.log(`Found ${invalid.length} invalid user(s):\n`);
  console.log(
    'ID'.padEnd(6),
    'First Name'.padEnd(30),
    'Last Name'.padEnd(30),
    'Email'.padEnd(35),
    'Verified'
  );
  console.log('─'.repeat(110));

  for (const u of invalid) {
    console.log(
      String(u.id).padEnd(6),
      u.first_name.padEnd(30),
      u.last_name.padEnd(30),
      u.email.padEnd(35),
      u.email_verified ? 'YES' : 'NO'
    );
  }

  console.log('');

  if (DRY_RUN) {
    console.log('ℹ️  This is a dry run. No users were deleted.');
    console.log('   Run with --delete to permanently remove them:\n');
    console.log('   node backend/scripts/deleteInvalidUsers.js --delete\n');
  } else {
    const ids = invalid.map(u => u.id);
    await pool.query(`DELETE FROM users WHERE id = ANY($1::int[])`, [ids]);
    console.log(`🗑️  Deleted ${ids.length} user(s) successfully.\n`);
  }

  await pool.end();
}

main().catch(err => {
  console.error('Error:', err.message);
  pool.end();
  process.exit(1);
});
